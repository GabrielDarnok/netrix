'use server';

import { pool } from '../db';
import { SERVICE_MAP, analyzeServiceFlow } from '../utils/services-analyzer';
import { getWhoisInfo } from './whois';

let _dbInitialized = false;
async function initDb() {
  if (_dbInitialized) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_services (
        id SERIAL PRIMARY KEY,
        ip INET NOT NULL,
        port INTEGER NOT NULL,
        custom_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ip, port)
      );
      CREATE TABLE IF NOT EXISTS dismissed_services (
        id SERIAL PRIMARY KEY,
        ip INET NOT NULL,
        port INTEGER NOT NULL,
        dismissed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ip, port)
      );
    `);
    _dbInitialized = true;
  } catch(e) {
    console.error("DB Init error:", e);
  } finally {
    client.release();
  }
}

async function enrichWithWhois(rows: any[], role: string, extraFields: any = {}) {
  return await Promise.all(rows.map(async r => {
    const allClients = r.clientes || [];
    const topClients = allClients.slice(0, 3).map((c: any) => c.ip);
    const remaining = allClients.length > 3 ? allClients.length - 3 : 0;
    
    let nome = "Desconhecido";
    let pais = "N/A";
    let is_known = false;

    const whois = await getWhoisInfo(r.ip);
    if (whois && !whois.error) {
      nome = whois.org && whois.org !== "Protocolo de Rede" ? whois.org : (whois.isp || "Desconhecido");
      pais = whois.countryCode || (whois.country === "LAN" ? "LAN" : whois.country) || "N/A";
      is_known = true;
    }

    return {
      ...r,
      role,
      nome,
      pais,
      is_known,
      top_clients: topClients,
      all_clients: allClients,
      remaining_clients: remaining,
      ...extraFields
    };
  }));
}

export async function fetchActiveServices(clientSubnets: string[], subnet?: string | null) {
  await initDb();
  const client = await pool.connect();
  try {
    let whereClause = "WHERE port_dst > 0";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND ip_dst << $1";
      params.push(subnet);
    } else if (clientSubnets && clientSubnets.length > 0) {
      whereClause += " AND ip_dst << ANY($1::inet[])";
      params.push(clientSubnets);
    } else {
      whereClause += " AND (ip_dst << '10.0.0.0/8' OR ip_dst << '172.16.0.0/12' OR ip_dst << '192.168.0.0/16')";
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, port_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, 
                SUM(CASE WHEN ip_proto = 6 THEN 1 ELSE 0 END) AS tcp_count,
                SUM(CASE WHEN ip_proto = 17 THEN 1 ELSE 0 END) AS udp_count,
                BIT_OR(tcp_flags) AS accumulated_flags,
                MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, port_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          port_dst AS porta,
          SUM(c_flows) AS flows,
          SUM(c_bytes) AS volume_bytes,
          SUM(tcp_count) AS tcp_count,
          SUM(udp_count) AS udp_count,
          BIT_OR(accumulated_flags) AS accumulated_flags,
          MAX(ultimo) AS last_seen,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes
      FROM s_flows
      GROUP BY ip_dst, port_dst
      HAVING SUM(c_flows) >= 3 AND SUM(c_bytes) > 500
      ORDER BY volume_bytes DESC
      LIMIT 200;
    `;
    const res = await client.query(sql, params);
    
    // Puxar as customizações e ocultações do banco
    const customRes = await client.query('SELECT host(ip) as ip, port, custom_name FROM custom_services');
    const customMap = new Map();
    customRes.rows.forEach(r => customMap.set(`${r.ip}:${r.port}`, r.custom_name));

    const dismissedRes = await client.query('SELECT host(ip) as ip, port, dismissed_at FROM dismissed_services');
    const dismissedMap = new Map();
    dismissedRes.rows.forEach(r => dismissedMap.set(`${r.ip}:${r.port}`, new Date(r.dismissed_at).getTime()));
    
    const mapped = res.rows.map(r => {
      const p = parseInt(r.porta);
      const analysis = analyzeServiceFlow({
        targetIp: r.ip,
        port: p,
        tcp_count: parseInt(r.tcp_count),
        udp_count: parseInt(r.udp_count),
        accumulated_flags: parseInt(r.accumulated_flags || "0"),
        last_seen: r.last_seen,
        customMap,
        dismissedMap
      });

      const allClients = r.clientes || [];
      const topClients = allClients.slice(0, 3).map((c: any) => c.ip);
      const remaining = allClients.length > 3 ? allClients.length - 3 : 0;

      return {
        ...r,
        servico: analysis.name,
        is_unmapped: analysis.isUnmapped,
        is_ephemeral: analysis.isEphemeral,
        is_custom_named: analysis.isCustomNamed,
        is_dismissed: analysis.isDismissed,
        proto: analysis.proto,
        risco: analysis.risk,
        tcpStatus: analysis.tcpStatus,
        top_clients: topClients,
        all_clients: allClients,
        remaining_clients: remaining
      };
    });
    
    // Filtramos portas que não tiveram SYN inicial (tráfego de cliente), Scans, dismisses, e efêmeras não-nomeadas (que são apenas clientes recebendo retorno)
    return mapped.filter(m => m.tcpStatus !== 'EPHEMERAL' && m.tcpStatus !== 'SCAN' && !m.is_dismissed && !(m.is_ephemeral && !m.is_custom_named)).slice(0, 100);
  } catch (error) {
    console.error("Error fetching active services:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchAllServices(subnet?: string | null) {
  return await fetchActiveServices([], subnet);
}

export async function fetchDNS(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE port_dst = 53";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND (ip_src << $1 OR ip_dst << $1)";
      params.push(subnet);
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS queries,
          MAX(ultimo) AS ultimo_uso,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes
      FROM s_flows
      GROUP BY ip_dst
      ORDER BY queries DESC
      LIMIT 20;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'DNS Server');
  } catch (error) {
    console.error("Error fetching DNS:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchNTP(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE port_dst = 123";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND (ip_src << $1 OR ip_dst << $1)";
      params.push(subnet);
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS flows,
          MAX(ultimo) AS ultimo_uso,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes
      FROM s_flows
      GROUP BY ip_dst
      ORDER BY flows DESC
      LIMIT 20;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'NTP Server');
  } catch (error) {
    console.error("Error fetching NTP:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchDHCP(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE port_dst IN (67, 68)";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND (ip_src << $1 OR ip_dst << $1)";
      params.push(subnet);
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS flows,
          MAX(ultimo) AS ultimo_uso,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes
      FROM s_flows
      GROUP BY ip_dst
      ORDER BY flows DESC
      LIMIT 20;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'DHCP Server');
  } catch (error) {
    console.error("Error fetching DHCP:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchGateway(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE 1=1";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND (ip_src << $1 OR ip_dst << $1)";
      params.push(subnet);
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS flows,
          COUNT(ip_src) AS origens,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes,
          MAX(ultimo) AS ultimo_uso
      FROM s_flows
      GROUP BY ip_dst
      HAVING COUNT(ip_src) > 5
      ORDER BY volume DESC
      LIMIT 10;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'Gateway / Router', { is_gateway: true });
  } catch (error) {
    console.error("Error fetching Gateway:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchSSH(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE port_dst = 22";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND ip_dst << $1";
      params.push(subnet);
    } else {
      whereClause += " AND (ip_dst << '10.0.0.0/8' OR ip_dst << '172.16.0.0/12' OR ip_dst << '192.168.0.0/16')";
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS flows,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes,
          MAX(ultimo) AS ultimo_uso
      FROM s_flows
      GROUP BY ip_dst
      ORDER BY volume DESC
      LIMIT 20;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'SSH Server');
  } catch (error) {
    console.error("Error fetching SSH:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchNetflowExporters(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE port_dst IN (2055, 9995)";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND (ip_src << $1 OR ip_dst << $1)";
      params.push(subnet);
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_src, ip_dst, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_src, ip_dst
      )
      SELECT
          host(ip_src) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS flows,
          json_agg(
            json_build_object('ip', host(ip_dst), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes,
          MAX(ultimo) AS ultimo_uso
      FROM s_flows
      GROUP BY ip_src
      ORDER BY volume DESC
      LIMIT 10;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'NetFlow Exporter');
  } catch (error) {
    console.error("Error fetching Netflow Exporters:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function renameService(ip: string, port: number, customName: string) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO custom_services (ip, port, custom_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (ip, port) DO UPDATE SET custom_name = $3, created_at = NOW();
    `, [ip, port, customName]);
  } catch(e) {
    console.error("Error renaming service:", e);
    throw e;
  } finally {
    client.release();
  }
}

export async function dismissService(ip: string, port: number) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO dismissed_services (ip, port, dismissed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (ip, port) DO UPDATE SET dismissed_at = NOW();
    `, [ip, port]);
  } catch(e) {
    console.error("Error dismissing service:", e);
    throw e;
  } finally {
    client.release();
  }
}

export async function fetchEmailServers(subnet?: string | null) {
  const client = await pool.connect();
  try {
    // 25: SMTP, 110: POP3, 143: IMAP, 465: SMTPS, 587: MSA, 993: IMAPS, 995: POP3S
    let whereClause = "WHERE port_dst IN (25, 110, 143, 465, 587, 993, 995)";
    let params: any[] = [];
    if (subnet) {
      whereClause += " AND (ip_src << $1 OR ip_dst << $1)";
      params.push(subnet);
    }

    const sql = `
      WITH s_flows AS (
         SELECT ip_dst, ip_src, COUNT(*) as c_flows, SUM(bytes) as c_bytes, MAX(stamp_inserted) as ultimo
         FROM flows
         ${whereClause}
         GROUP BY ip_dst, ip_src
      )
      SELECT
          host(ip_dst) AS ip,
          SUM(c_bytes) AS volume,
          SUM(c_flows) AS flows,
          MAX(ultimo) AS ultimo_uso,
          json_agg(
            json_build_object('ip', host(ip_src), 'flows', c_flows, 'volume', c_bytes)
            ORDER BY c_flows DESC
          ) AS clientes
      FROM s_flows
      GROUP BY ip_dst
      ORDER BY flows DESC
      LIMIT 20;
    `;
    const res = await client.query(sql, params);
    return await enrichWithWhois(res.rows, 'Servidor de E-mail');
  } catch (error) {
    console.error("Error fetching Email servers:", error);
    return [];
  } finally {
    client.release();
  }
}
