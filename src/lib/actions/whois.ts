'use server';

import { pool } from '../db';

function isPrivate(ip: string) {
  return ip.startsWith('10.') || ip.startsWith('192.168.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
}

function isMulticast(ip: string) {
  return ip.startsWith('224.') || ip.startsWith('239.') || ip.endsWith('.255') || ip === '255.255.255.255';
}

export async function getWhoisInfo(ip: string) {
  if (isPrivate(ip)) {
    return {
      query: ip,
      isp: "Rede Privada (LAN)",
      org: "Organização Local",
      as: "N/A",
      country: "LAN",
      city: "Interno",
      status: "success",
      cached: true
    };
  }

  if (isMulticast(ip)) {
    return {
      query: ip,
      isp: "Multicast / Broadcast",
      org: "Protocolo de Rede",
      as: "N/A",
      country: "Multicast",
      city: "N/A",
      status: "success",
      cached: true
    };
  }

  const client = await pool.connect();
  try {
    // 1. Garante que a tabela existe (Lazy Initialization)
    await client.query(`
      CREATE TABLE IF NOT EXISTS whois_cache (
        ip VARCHAR(45) PRIMARY KEY,
        data_json JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tenta buscar no cache (consideramos válido por 30 dias para simplificar)
    const cacheRes = await client.query('SELECT data_json, updated_at FROM whois_cache WHERE ip = $1', [ip]);
    
    if (cacheRes.rows.length > 0) {
      const row = cacheRes.rows[0];
      const dataStr = typeof row.data_json === 'string' ? row.data_json : JSON.stringify(row.data_json);
      const data = JSON.parse(dataStr);
      return { ...data, cached: true, updated_at: row.updated_at };
    }

    // 3. Se não tiver no cache, busca na API externa
    const url = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;
    const response = await fetch(url, { next: { revalidate: 0 } }); // não usa o cache interno do Next
    const data = await response.json();

    if (data.status === 'success') {
      // 4. Salva no banco
      await client.query(
        `INSERT INTO whois_cache (ip, data_json, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (ip) DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = CURRENT_TIMESTAMP`,
        [ip, JSON.stringify(data)]
      );
      return { ...data, cached: false, updated_at: new Date().toISOString() };
    } else {
      console.error('IP-API Failed:', data.message);
      return { error: 'Falha ao buscar dados', message: data.message, query: ip };
    }

  } catch (err: any) {
    console.error('Whois action error:', err);
    return { error: 'Erro interno', message: err.message, query: ip };
  } finally {
    client.release();
  }
}
