'use server';

import { pool } from '../db';


export interface ExplorerFilters {
  subnet?: string | null;
  clientSubnets?: string[];
  ip?: string;
  port?: string;
  proto?: string;
  direction?: string;
  tcpFlags?: string[]; // 'SYN', 'ACK', 'FIN', 'RST', 'PSH'
  range?: string; // '1h', '6h', '24h', '7d', '30d'
  asn?: string;
  page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Mapa de TCP Flags -> Bitmask
const FLAG_MAP: Record<string, number> = {
  "SYN": 2,
  "ACK": 16,
  "FIN": 1,
  "RST": 4,
  "PSH": 8
};

// Mapa Global de Serviços (Simplificado)
const GLOBAL_SERVICE_MAP: Record<number, string> = {
  20: "FTP-Data", 21: "FTP", 22: "SSH", 23: "Telnet",
  25: "SMTP", 53: "DNS", 67: "DHCP", 68: "DHCP",
  80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS",
  445: "SMB", 465: "SMTPS", 500: "IKE/IPSec",
  3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL"
};

export async function fetchExplorerData(filters: ExplorerFilters) {
  const client = await pool.connect();
  try {
    // Timeout safety
    await client.query("SET statement_timeout = '30s';");

    const whereParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Subnet filter (Tenant context)
    if (filters.subnet) {
      whereParts.push(`(ip_src << $${paramIndex} OR ip_dst << $${paramIndex})`);
      params.push(filters.subnet);
      paramIndex++;
    } else if (filters.clientSubnets && filters.clientSubnets.length > 0) {
      // Allow all subnets from the specific client
      whereParts.push(`(ip_src << ANY($${paramIndex}::inet[]) OR ip_dst << ANY($${paramIndex}::inet[]))`);
      params.push(filters.clientSubnets);
      paramIndex++;
    } else {
      // Force return empty if no client subnets are available (prevents seeing global data)
      whereParts.push(`1=0`);
    }

    // IP Filter
    if (filters.ip) {
      if (filters.ip.includes('/')) {
        whereParts.push(`(ip_src << $${paramIndex} OR ip_dst << $${paramIndex})`);
        params.push(filters.ip);
        paramIndex++;
      } else {
        whereParts.push(`(host(ip_src) = $${paramIndex} OR host(ip_dst) = $${paramIndex})`);
        params.push(filters.ip);
        paramIndex++;
      }
    }

    // Port Filter
    if (filters.port) {
      const p = parseInt(filters.port, 10);
      if (!isNaN(p)) {
        whereParts.push(`(port_src = $${paramIndex} OR port_dst = $${paramIndex})`);
        params.push(p);
        paramIndex++;
      }
    }

    // Protocol Filter
    if (filters.proto && filters.proto !== 'all') {
      const p = parseInt(filters.proto, 10);
      if (!isNaN(p)) {
        whereParts.push(`ip_proto = $${paramIndex}`);
        params.push(p);
        paramIndex++;
      }
    }

    // Direction Filter (needs subnet context)
    if (filters.direction && filters.direction !== 'all') {
      if (filters.subnet) {
        if (filters.direction === 'entrada') {
          whereParts.push(`ip_dst << $${paramIndex}`);
          params.push(filters.subnet);
          paramIndex++;
        } else if (filters.direction === 'saida') {
          whereParts.push(`ip_src << $${paramIndex}`);
          params.push(filters.subnet);
          paramIndex++;
        }
      } else if (filters.clientSubnets && filters.clientSubnets.length > 0) {
        if (filters.direction === 'entrada') {
          whereParts.push(`ip_dst << ANY($${paramIndex}::inet[])`);
          params.push(filters.clientSubnets);
          paramIndex++;
        } else if (filters.direction === 'saida') {
          whereParts.push(`ip_src << ANY($${paramIndex}::inet[])`);
          params.push(filters.clientSubnets);
          paramIndex++;
        }
      }
    }

    // ASN Filter (Using subquery against whois_cache)
    if (filters.asn) {
      whereParts.push(`(
        host(ip_src) IN (SELECT ip FROM whois_cache WHERE data_json->>'as' ILIKE $${paramIndex}) OR 
        host(ip_dst) IN (SELECT ip FROM whois_cache WHERE data_json->>'as' ILIKE $${paramIndex})
      )`);
      params.push(`%${filters.asn}%`);
      paramIndex++;
    }

    // TCP Flags Filter
    if (filters.tcpFlags && filters.tcpFlags.length > 0) {
      let flagMask = 0;
      for (const f of filters.tcpFlags) {
        flagMask |= FLAG_MAP[f] || 0;
      }
      if (flagMask > 0) {
        whereParts.push(`(tcp_flags & $${paramIndex}) = $${paramIndex}`);
        params.push(flagMask);
        paramIndex++;
      }
    }

    // Temporal Filter
    const rangeMap: Record<string, string> = {
      '1h': '1 hour',
      '6h': '6 hours',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };
    const intervalStr = rangeMap[filters.range || '24h'] || '24 hours';
    whereParts.push(`stamp_inserted >= NOW() - INTERVAL '${intervalStr}'`);

    const whereSql = whereParts.length > 0 ? "WHERE " + whereParts.join(" AND ") : "";

    // Granularity for time series
    let trunc = "hour";
    if (intervalStr === '1 hour' || intervalStr === '6 hours') trunc = "minute";
    else if (intervalStr === '7 days' || intervalStr === '30 days') trunc = "day";

    // 1. Time Series
    const tsSql = `
      WITH time_series AS (
        SELECT generate_series(
          date_trunc('${trunc}', NOW() - INTERVAL '${intervalStr}'),
          date_trunc('${trunc}', NOW()),
          INTERVAL '1 ${trunc}'
        ) AS ts
      ),
      flow_data AS (
        SELECT date_trunc('${trunc}', stamp_inserted) AS ts,
               SUM(bytes) AS bytes,
               COUNT(*) AS flows
        FROM flows
        ${whereSql}
        GROUP BY 1
      )
      SELECT ts.ts,
             COALESCE(fd.bytes, 0) AS bytes,
             COALESCE(fd.flows, 0) AS flows
      FROM time_series ts
      LEFT JOIN flow_data fd ON ts.ts = fd.ts
      ORDER BY ts.ts ASC;
    `;
    const tsRes = await client.query(tsSql, params);
    const timeseries = tsRes.rows.map(r => ({
      timestamp: new Date(r.ts).toISOString(),
      bytes: parseInt(r.bytes, 10),
      flows: parseInt(r.flows, 10)
    }));

    // 2. Top Talkers (src & dst)
    const topSrcSql = `
      SELECT host(ip_src) AS ip, COUNT(*) AS flows, SUM(bytes) AS bytes,
             array_agg(DISTINCT port_dst) FILTER (WHERE port_dst IS NOT NULL AND port_dst > 0) AS ports
      FROM flows ${whereSql}
      GROUP BY ip_src ORDER BY bytes DESC LIMIT 20;
    `;
    const topDstSql = `
      SELECT host(ip_dst) AS ip, COUNT(*) AS flows, SUM(bytes) AS bytes,
             array_agg(DISTINCT port_dst) FILTER (WHERE port_dst IS NOT NULL AND port_dst > 0) AS ports
      FROM flows ${whereSql}
      GROUP BY ip_dst ORDER BY bytes DESC LIMIT 20;
    `;
    const topSrcRes = await client.query(topSrcSql, params);
    const topDstRes = await client.query(topDstSql, params);
    
    const enrichTalker = (r: any) => ({
      ip: r.ip,
      bytes: parseInt(r.bytes, 10),
      flows: parseInt(r.flows, 10),
      country: "—", // GeoIP postergado para a fase de Segurança
      ports: r.ports ? r.ports.sort((a:number,b:number)=>a-b).slice(0, 10) : [],
      port_names: r.ports ? r.ports.slice(0,10).map((p:number) => GLOBAL_SERVICE_MAP[p] || p.toString()) : []
    });

    // 3. Paginated Rows
    const page = filters.page || 1;
    const rowsLimit = 50;
    const offset = (page - 1) * rowsLimit;
    
    // Sort handling (safe whitelist)
    const safeCols = ["stamp_inserted", "ip_src", "ip_dst", "port_src", "port_dst", "ip_proto", "bytes", "packets", "tcp_flags"];
    const sortCol = safeCols.includes(filters.sort || '') ? filters.sort : "stamp_inserted";
    const sortDir = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rowsSql = `
      SELECT stamp_inserted, host(ip_src) AS ip_src, port_src,
             host(ip_dst) AS ip_dst, port_dst, ip_proto, tcp_flags, bytes, packets
      FROM flows ${whereSql}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ${rowsLimit} OFFSET ${offset};
    `;
    
    const countSql = `SELECT COUNT(*) AS total FROM flows ${whereSql};`;
    const metricsSql = `
      SELECT COALESCE(SUM(bytes), 0) AS total_bytes,
             COUNT(*) AS total_flows,
             COUNT(DISTINCT ip_src) AS unique_src,
             COUNT(DISTINCT port_dst) FILTER (WHERE port_dst IS NOT NULL AND port_dst > 0) AS unique_dst_ports
      FROM flows ${whereSql};
    `;

    const rowsRes = await client.query(rowsSql, params);
    const countRes = await client.query(countSql, params);
    const metricsRes = await client.query(metricsSql, params);

    const m = metricsRes.rows[0] || {};
    
    return {
      timeseries,
      top_talkers: {
        src: topSrcRes.rows.map(enrichTalker),
        dst: topDstRes.rows.map(enrichTalker)
      },
      rows: rowsRes.rows.map(r => ({
        ...r,
        stamp_inserted: new Date(r.stamp_inserted).toISOString(),
        bytes: parseInt(r.bytes, 10),
        packets: parseInt(r.packets, 10)
      })),
      total_rows: parseInt(countRes.rows[0].total, 10),
      page,
      per_page: rowsLimit,
      metrics: {
        bytes: parseInt(m.total_bytes || "0", 10),
        flows: parseInt(m.total_flows || "0", 10),
        unique_src: parseInt(m.unique_src || "0", 10),
        unique_dst_ports: parseInt(m.unique_dst_ports || "0", 10)
      }
    };

  } catch (error: any) {
    console.error("Explorer Error:", error);
    return { error: error.message || "Erro interno ao consultar fluxos" };
  } finally {
    client.release();
  }
}
