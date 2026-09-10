'use server';

import { pool } from '../db';
// ─── Mapa Global de Serviços ───────────────────────────────────
const SERVICE_MAP: Record<number, string> = {
  20: "FTP-Data", 21: "FTP", 22: "SSH", 23: "Telnet",
  25: "SMTP", 53: "DNS", 67: "DHCP", 68: "DHCP",
  80: "HTTP", 88: "Kerberos", 110: "POP3", 111: "RPC",
  123: "NTP", 135: "MS-RPC", 137: "NetBIOS", 139: "NetBIOS",
  143: "IMAP", 161: "SNMP", 389: "LDAP", 443: "HTTPS",
  445: "SMB", 465: "SMTPS", 500: "IKE/IPSec", 514: "Syslog",
  636: "LDAPS", 993: "IMAPS", 995: "POP3S", 1194: "OpenVPN",
  1433: "MSSQL", 1521: "Oracle", 2055: "NetFlow", 3306: "MySQL", 
  3389: "RDP", 4444: "Metasploit", 5060: "SIP", 5353: "mDNS", 
  5432: "PostgreSQL", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 
  9200: "Elasticsearch", 27017: "MongoDB", 31337: "Backdoor", 51820: "WireGuard"
};

const PORT_TO_ROLE: Record<number, string> = {
  53: "DNS Server",
  123: "NTP Server",
  67: "DHCP Server",
  68: "DHCP Server",
  22: "SSH Server"
};

export async function getHostTimeline(params: {
  ip: string;
  period: string;
  granularity: 'minute' | 'hour' | 'day';
  proto?: string;
  direction?: string;
  port?: string;
}) {
  const { ip, period, granularity, proto, direction, port } = params;
  
  const client = await pool.connect();
  try {
    let interval = '24 hours';
    if (period === '2h') interval = '2 hours';
    else if (period === '6h') interval = '6 hours';
    else if (period === '24h') interval = '24 hours';
    else if (period === '7d') interval = '7 days';
    else if (period === '30d') interval = '30 days';

    // Construção do WHERE com base nos filtros
    const whereParts = [`stamp_inserted >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '${interval}'`];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter Direction
    if (direction === 'in') {
      whereParts.push(`host(ip_dst) = $${paramIndex++}`);
      queryParams.push(ip);
    } else if (direction === 'out') {
      whereParts.push(`host(ip_src) = $${paramIndex++}`);
      queryParams.push(ip);
    } else {
      whereParts.push(`(host(ip_src) = $${paramIndex} OR host(ip_dst) = $${paramIndex})`);
      queryParams.push(ip);
      paramIndex++;
    }

    // Filter Protocol
    if (proto && proto !== 'all') {
      let protoNum = -1;
      if (proto.toLowerCase() === 'tcp') protoNum = 6;
      else if (proto.toLowerCase() === 'udp') protoNum = 17;
      else if (proto.toLowerCase() === 'icmp') protoNum = 1;
      
      if (protoNum !== -1) {
        whereParts.push(`ip_proto = $${paramIndex++}`);
        queryParams.push(protoNum);
      }
    }

    // Filter Port
    if (port && port !== 'all') {
      const portNum = parseInt(port, 10);
      if (!isNaN(portNum)) {
        whereParts.push(`(port_src = $${paramIndex} OR port_dst = $${paramIndex})`);
        queryParams.push(portNum);
        paramIndex++;
      }
    }

    const whereSql = whereParts.join(' AND ');

    // 1. Buscar a série temporal
    const tsSql = `
      WITH time_series AS (
        SELECT generate_series(
          date_trunc('${granularity}', (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '${interval}'),
          date_trunc('${granularity}', (SELECT MAX(stamp_inserted) FROM flows)),
          INTERVAL '1 ${granularity}'
        ) AS ts
      ),
      flow_data AS (
        SELECT 
          date_trunc('${granularity}', stamp_inserted) as ts,
          COUNT(*) as flows,
          COALESCE(SUM(bytes), 0) as bytes,
          COALESCE(SUM(CASE WHEN ip_proto = 6 THEN bytes ELSE 0 END), 0) as bytes_tcp,
          COALESCE(SUM(CASE WHEN ip_proto = 17 THEN bytes ELSE 0 END), 0) as bytes_udp,
          COALESCE(SUM(CASE WHEN ip_proto = 1 THEN bytes ELSE 0 END), 0) as bytes_icmp,
          COALESCE(SUM(CASE WHEN ip_proto NOT IN (1, 6, 17) THEN bytes ELSE 0 END), 0) as bytes_other
        FROM flows
        WHERE ${whereSql}
        GROUP BY 1
      )
      SELECT
        ts.ts,
        COALESCE(fd.flows, 0) as flows,
        COALESCE(fd.bytes, 0) as bytes,
        COALESCE(fd.bytes_tcp, 0) as bytes_tcp,
        COALESCE(fd.bytes_udp, 0) as bytes_udp,
        COALESCE(fd.bytes_icmp, 0) as bytes_icmp,
        COALESCE(fd.bytes_other, 0) as bytes_other
      FROM time_series ts
      LEFT JOIN flow_data fd ON ts.ts = fd.ts
      ORDER BY ts.ts ASC;
    `;
    
    const tsRes = await client.query(tsSql, queryParams);
    
    const timeseries = tsRes.rows.map(r => ({
      timestamp: r.ts.toISOString(),
      flows: parseInt(r.flows, 10),
      bytes: parseInt(r.bytes, 10),
      bytes_tcp: parseInt(r.bytes_tcp, 10),
      bytes_udp: parseInt(r.bytes_udp, 10),
      bytes_icmp: parseInt(r.bytes_icmp, 10),
      bytes_other: parseInt(r.bytes_other, 10)
    }));

    // 2. Calcular Média e Desvio Padrão
    let totalFlows = 0;
    for (const p of timeseries) totalFlows += p.flows;
    const n = timeseries.length;
    const meanFlows = n > 0 ? totalFlows / n : 0;
    
    let varianceSum = 0;
    for (const p of timeseries) varianceSum += Math.pow(p.flows - meanFlows, 2);
    const stdDev = n > 1 ? Math.sqrt(varianceSum / (n - 1)) : 0;

    const threshold = meanFlows + (2 * stdDev); // 2 sigma para anomalia
    
    // 3. Adicionar campo 'deviation' e identificar picos
    const events: any[] = [];
    
    for (const p of timeseries) {
      // Calculate deviation in sigmas (z-score)
      (p as any).deviation = stdDev > 0 ? ((p.flows - meanFlows) / stdDev) : 0;
      
      if (p.flows > threshold && p.flows > 10) { // Spike detectado
        events.push({
          timestamp: p.timestamp,
          type: 'spike',
          level: (p as any).deviation > 3 ? 'ALTO' : 'MEDIO',
          title: 'Pico de consumo de serviço anômalo',
          description: `Volume de ${p.flows} fluxos (${(p as any).deviation.toFixed(2)}σ acima da média)`
        });
      }
    }

    // 4. Identificar Novas Comunicações (primeira vez que vemos um peer nesse intervalo)
    // Para simplificar no mockup, vamos apenas pegar pares IP-Peer e ver se MIN(stamp_inserted) cai hoje.
    const newCommSql = `
      SELECT peer, min_stamp, country
      FROM (
        SELECT CASE WHEN host(ip_src) = $1 THEN host(ip_dst) ELSE host(ip_src) END as peer,
               MIN(stamp_inserted) as min_stamp,
               MAX(host(ip_dst)) as ip_dst_val -- hack to join geoip later if needed
        FROM flows
        WHERE (host(ip_src) = $1 OR host(ip_dst) = $1)
        GROUP BY peer
      ) x
      LEFT JOIN geoip_cache g ON g.ip = x.peer::inet
      WHERE min_stamp >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '${interval}'
      ORDER BY min_stamp DESC
      LIMIT 10;
    `;
    const newCommRes = await client.query(newCommSql, [ip]);
    
    for (const r of newCommRes.rows) {
       events.push({
          timestamp: r.min_stamp.toISOString(),
          type: 'new_peer',
          level: 'BAIXO',
          title: `Nova comunicação detectada com ${r.country || 'Desconhecido'}`,
          description: `IP: ${r.peer}`
       });
    }

    // Sort events by timestamp desc
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 5. Identificar portas ativas no período
    const portsSql = `
      SELECT port, SUM(flows) as total_flows 
      FROM (
        SELECT port_src as port, COUNT(*) as flows 
        FROM flows 
        WHERE host(ip_src) = $1 AND stamp_inserted >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '${interval}'
        GROUP BY port_src
        UNION ALL
        SELECT port_dst as port, COUNT(*) as flows 
        FROM flows 
        WHERE host(ip_dst) = $1 AND stamp_inserted >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '${interval}'
        GROUP BY port_dst
      ) x
      WHERE port IS NOT NULL
      GROUP BY port
      ORDER BY total_flows DESC
      LIMIT 15;
    `;
    const portsRes = await client.query(portsSql, [ip]);
    const activePorts = portsRes.rows.map(r => parseInt(r.port, 10));

    return {
      timeseries,
      baseline: {
        mean: meanFlows,
        stdDev: stdDev,
        threshold: threshold
      },
      events,
      activePorts
    };
  } catch (e) {
    console.error('Timeline error:', e);
    throw e;
  } finally {
    client.release();
  }
}
