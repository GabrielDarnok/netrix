'use server';

import { pool } from '../db';

export async function fetchDashboardMetrics(subnet?: string | null, range: string = '24 hours') {
  const safeRange = ['24 hours', '7 days', '30 days'].includes(range) ? range : '24 hours';
  const client = await pool.connect();
  try {
    let hpWhere = '';
    let flowWhere = '';
    let params: any[] = [];
    
    if (subnet) {
      hpWhere = 'WHERE (ip << $1)';
      flowWhere = 'WHERE (ip_src << $1 OR ip_dst << $1)';
      params = [subnet];
    }

    const hpQuery = `SELECT COUNT(*) AS total FROM host_profile ${hpWhere};`;
    const hostsRes = await client.query(hpQuery, params);
    const totalHosts = parseInt(hostsRes.rows[0].total, 10) || 0;

    const flowsQuery = `
      SELECT 
        COUNT(*) AS total_flows,
        COALESCE(SUM(bytes), 0) AS total_bytes,
        COALESCE(SUM(packets), 0) AS total_packets,
        pg_size_pretty(COALESCE(SUM(bytes), 0)::bigint) AS volume_pretty
      FROM flows 
      ${flowWhere ? flowWhere + " AND" : "WHERE"} stamp_inserted >= NOW() - INTERVAL '${safeRange}';
    `;
    const flowsRes = await client.query(flowsQuery, params);
    const totalBytes = parseInt(flowsRes.rows[0].total_bytes, 10) || 0;
    const totalPackets = parseInt(flowsRes.rows[0].total_packets, 10) || 0;
    const volumePretty = flowsRes.rows[0].volume_pretty || '0 B';

    // Calculate overall PPS for the time range (e.g. 24 hours = 86400 seconds)
    let pps = 0;
    if (totalPackets > 0) {
      const seconds = safeRange === '30 days' ? 2592000 : (safeRange === '7 days' ? 604800 : 86400);
      pps = Math.round(totalPackets / seconds);
    }

    const riskQuery = `
      SELECT COUNT(*) AS em_risco 
      FROM host_profile 
      ${hpWhere ? hpWhere + " AND" : "WHERE"} nivel_alerta IN ('alerta', 'critico');
    `;
    const riskRes = await client.query(riskQuery, params);
    const hostsEmRisco = parseInt(riskRes.rows[0].em_risco, 10) || 0;

    const alertsQuery = `
      SELECT nivel_alerta, COUNT(*) AS total
      FROM host_profile
      ${hpWhere}
      GROUP BY nivel_alerta;
    `;
    const alertsRes = await client.query(alertsQuery, params);
    const alertas = alertsRes.rows.reduce((acc, row) => {
      acc[row.nivel_alerta] = parseInt(row.total, 10);
      return acc;
    }, {} as Record<string, number>);

    let networkHealth = 100;
    if (totalHosts > 0) {
      networkHealth = Math.max(0, 100 - Math.round((hostsEmRisco / totalHosts) * 100));
    }

    return { networkHealth, hostsEmRisco, volumePretty, totalBytes, totalPackets, pps, alertas, totalHosts };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return { networkHealth: 100, hostsEmRisco: 0, volumePretty: '0 B', totalBytes: 0, totalPackets: 0, pps: 0, alertas: {}, totalHosts: 0 };
  } finally {
    client.release();
  }
}

export async function fetchTopThreats(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let hpWhere = '';
    let params: any[] = [];
    
    if (subnet) {
      hpWhere = 'AND (ip << $1)';
      params = [subnet];
    }

    const res = await client.query(`
      SELECT
        host(ip) AS ip_src,
        'N/A' AS ip_dst,
        role AS classificacao,
        nivel_alerta AS severidade
      FROM host_profile
      WHERE nivel_alerta IN ('alerta', 'critico') ${hpWhere}
      ORDER BY volume_total DESC
      LIMIT 5;
    `, params);
    
    return res.rows;
  } catch (error) {
    console.error("Error fetching top threats:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchVolumePerHour(subnet?: string | null, range: string = '24 hours') {
  const safeRange = ['24 hours', '7 days', '30 days'].includes(range) ? range : '24 hours';
  const client = await pool.connect();
  try {
    let flowWhere = '';
    let params: any[] = [];
    
    if (subnet) {
      flowWhere = 'AND (ip_src << $1 OR ip_dst << $1)';
      params = [subnet];
    }

    const timeTrunc = safeRange === '24 hours' ? 'hour' : 'day';

    const res = await client.query(`
      WITH time_series AS (
        SELECT generate_series(
          date_trunc('${timeTrunc}', NOW() - INTERVAL '${safeRange}'),
          date_trunc('${timeTrunc}', NOW()),
          INTERVAL '1 ${timeTrunc}'
        ) AS time_stamp
      ),
      flow_data AS (
        SELECT 
          date_trunc('${timeTrunc}', stamp_inserted) AS time_stamp,
          SUM(bytes) AS total_bytes,
          SUM(packets) AS total_packets
        FROM flows
        WHERE stamp_inserted >= NOW() - INTERVAL '${safeRange}' ${flowWhere}
        GROUP BY 1
      )
      SELECT 
        ts.time_stamp,
        COALESCE(fd.total_bytes, 0) AS total_bytes,
        COALESCE(fd.total_packets, 0) AS total_packets
      FROM time_series ts
      LEFT JOIN flow_data fd ON ts.time_stamp = fd.time_stamp
      ORDER BY ts.time_stamp ASC;
    `, params);
    
    return res.rows.map(r => ({
      time: timeTrunc === 'hour' 
        ? new Date(r.time_stamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : new Date(r.time_stamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      bytes: parseInt(r.total_bytes, 10),
      packets: parseInt(r.total_packets, 10),
      pps: Math.round(parseInt(r.total_packets, 10) / (timeTrunc === 'hour' ? 3600 : 86400))
    }));
  } catch (error) {
    console.error("Error fetching volume per hour:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchTopHostsByVolume(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let hpWhere = '';
    let params: any[] = [];
    
    if (subnet) {
      hpWhere = 'WHERE (ip << $1)';
      params = [subnet];
    }

    const res = await client.query(`
      SELECT
        host(ip) AS ip,
        volume_total
      FROM host_profile
      ${hpWhere}
      ORDER BY volume_total DESC NULLS LAST
      LIMIT 5;
    `, params);
    
    return res.rows.map(r => ({
      ip: r.ip,
      bytes: parseInt(r.volume_total || "0", 10)
    }));
  } catch (error) {
    console.error("Error fetching top hosts by volume:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function fetchBehaviorTags(subnet?: string | null) {
  const client = await pool.connect();
  try {
    let hpWhere = "role IS NOT NULL AND role != ''";
    let params: any[] = [];
    
    if (subnet) {
      hpWhere += ' AND (ip << $1)';
      params = [subnet];
    }

    const res = await client.query(`
      SELECT 
        role AS tag,
        COUNT(*) as total
      FROM host_profile
      WHERE ${hpWhere}
      GROUP BY role
      ORDER BY total DESC;
    `, params);
    
    return res.rows.map(r => ({
      tag: r.tag,
      total: parseInt(r.total, 10)
    }));
  } catch (error) {
    console.error("Error fetching behavior tags:", error);
    return [];
  } finally {
    client.release();
  }
}
