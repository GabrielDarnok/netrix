'use server';

import { pool } from '../db';
import { revalidatePath } from 'next/cache';

// Helper for dynamic subnets WHERE clause
function buildWhereSubnet(col: string, clientSubnets: string[], subnet: string | null, paramIndex: number): { sql: string, params: any[], nextIndex: number } {
  if (subnet) {
    return { sql: `${col} << $${paramIndex}`, params: [subnet], nextIndex: paramIndex + 1 };
  } else if (clientSubnets && clientSubnets.length > 0) {
    return { sql: `${col} << ANY($${paramIndex}::inet[])`, params: [clientSubnets], nextIndex: paramIndex + 1 };
  } else {
    return { sql: `1=0`, params: [], nextIndex: paramIndex };
  }
}

export async function getRecommendations(clientSubnets: string[], subnet: string | null) {
  const client = await pool.connect();
  try {
    let whereSql = "";
    let params: any[] = [];
    
    if (subnet) {
      whereSql = `WHERE ip << $1 AND nivel_alerta IN ('critico', 'alerta', 'atencao')`;
      params.push(subnet);
    } else if (clientSubnets && clientSubnets.length > 0) {
      whereSql = `WHERE ip << ANY($1::inet[]) AND nivel_alerta IN ('critico', 'alerta', 'atencao')`;
      params.push(clientSubnets);
    } else {
      whereSql = `WHERE 1=0`;
    }

    const res = await client.query(`
      SELECT host(ip) AS ip, role, tags, nivel_alerta,
             total_portas_dst, total_paises,
             ROUND(COALESCE(pct_udp,0)::numeric,1) AS pct_udp,
             ROUND(frequencia::numeric,1) AS frequencia
      FROM host_profile
      ${whereSql}
        AND host(ip) NOT IN (
          SELECT host(host_ip::inet) FROM alert_cases 
          WHERE finalizado_em >= NOW() - INTERVAL '30 minutes'
        )
      ORDER BY
          CASE nivel_alerta WHEN 'critico' THEN 0 WHEN 'alerta' THEN 1 ELSE 2 END,
          volume_total DESC;
    `, params);

    const hosts = res.rows;

    const HIGH_RISK: Record<number, any> = {
        23:    { name: "Telnet",         priority: "ALTA",    desc: "Protocolo legado sem criptografia. Credenciais em texto claro.",
               action: "Desativar Telnet imediatamente. Substituir por SSH." },
        445:   { name: "SMB",            priority: "ALTA",    desc: "Compartilhamento de arquivos Windows. Alvo frequente de ransomware.",
               action: "Bloquear na borda se não utilizado internamente. Manter patches atualizados." },
        1433:  { name: "MSSQL",          priority: "ALTA",    desc: "Serviço ativo e respondendo. Risco de exfiltração se exposto.",
               action: "Restringir acesso por firewall. Verificar se exposição é necessária." },
        3389:  { name: "RDP",            priority: "ALTA",    desc: "Serviço ativo e respondendo. Alvo de ataques de força bruta.",
               action: "Mover para VPN. Habilitar autenticação multifator. Monitorar logins falhos." },
        5900:  { name: "VNC",            priority: "ALTA",    desc: "Acesso remoto sem criptografia nativa.",
               action: "Encapsular via SSH ou VPN. Adicionar senha forte." },
        6379:  { name: "Redis",          priority: "ALTA",    desc: "Redis sem autenticação por padrão pode expor dados sensíveis.",
               action: "Adicionar autenticação. Bloquear porta 6379 na borda da rede." },
        6667:  { name: "IRC",            priority: "ALTA",    desc: "IRC é frequentemente usado por botnets para comando e controle (C2).",
               action: "Bloquear porta 6667 na saída do firewall. Investigar hosts originadores." },
        9200:  { name: "Elasticsearch",  priority: "ALTA",    desc: "Elasticsearch exposto sem autenticação por padrão.",
               action: "Habilitar X-Pack security. Bloquear 9200 na borda." },
        27017: { name: "MongoDB",        priority: "ALTA",    desc: "MongoDB exposto sem autenticação por padrão.",
               action: "Habilitar autenticação. Bloquear 27017 na borda da rede." },
        4444:  { name: "Metasploit/Shell",priority:"CRÍTICA", desc: "Serviço malicioso ativo e respondendo. Forte indício de comprometimento.",
               action: "ISOLAR o host IMEDIATAMENTE. Iniciar procedimento de resposta a incidentes." },
        31337: { name: "Back Orifice",   priority: "CRÍTICA", desc: "Serviço RAT ativo e respondendo. Sistema possivelmente comprometido.",
               action: "ISOLAR o host IMEDIATAMENTE. Investigar comprometimento." },
    };

    const portList = Object.keys(HIGH_RISK).map(Number);
    let portParams: any[] = [];
    let portWhere = "";
    if (subnet) {
      portWhere = `ip_src << $1 AND port_src = ANY($2)`;
      portParams = [subnet, portList];
    } else if (clientSubnets && clientSubnets.length > 0) {
      portWhere = `ip_src << ANY($1::inet[]) AND port_src = ANY($2)`;
      portParams = [clientSubnets, portList];
    } else {
      portWhere = `1=0`;
    }

    const portRes = await client.query(`
        SELECT port_src AS port_dst, host(ip_src) AS ip_dst, COUNT(*) AS flows
        FROM flows
        WHERE ${portWhere}
          AND (tcp_flags & 18) = 18
        GROUP BY port_src, ip_src
        ORDER BY port_src, flows DESC;
    `, portParams);

    // Mapear cada IP de risco como um "host em alerta" na lista retornada
    for (const row of portRes.rows) {
      const p = row.port_dst;
      const ip = row.ip_dst;
      const riskInfo = HIGH_RISK[p];
      if (!riskInfo) continue;

      // Verificar se já existe na lista
      const existing = hosts.find((h: any) => h.ip === ip);
      
      // Checar se foi resolvido recentemente (já que portRes não filtra pelo alert_cases)
      const isResolved = await client.query(`
          SELECT 1 FROM alert_cases 
          WHERE host_ip = $1::inet 
            AND finalizado_em >= NOW() - INTERVAL '30 minutes'
      `, [ip]);
      if (isResolved.rows.length > 0) continue;

      if (existing) {
        const existingTags = typeof existing.tags === 'string' ? JSON.parse(existing.tags) : (existing.tags || []);
        if (!existingTags.includes(`Porta_${p}_${riskInfo.name.replace('/', '_')}`)) {
          existingTags.push(`Porta_${p}_${riskInfo.name.replace('/', '_')}`);
          existing.tags = existingTags;
          if (riskInfo.priority === "CRÍTICA") {
            existing.nivel_alerta = "critico";
          }
        }
      } else {
        // Injetar o host na tabela
        hosts.push({
          ip: ip,
          role: "Servidor Exposto",
          tags: [`Porta_${p}_${riskInfo.name.replace('/', '_')}`],
          nivel_alerta: riskInfo.priority === "CRÍTICA" ? "critico" : "alerta",
          total_portas_dst: 1,
          total_paises: 0,
          pct_udp: 0,
          frequencia: parseInt(row.flows)
        });
      }
    }

    // Ordenar de novo para garantir que críticos fiquem no topo
    hosts.sort((a: any, b: any) => {
        const valA = a.nivel_alerta === 'critico' ? 0 : a.nivel_alerta === 'alerta' ? 1 : 2;
        const valB = b.nivel_alerta === 'critico' ? 0 : b.nivel_alerta === 'alerta' ? 1 : 2;
        return valA - valB;
    });

    return { hosts };
  } catch (error: any) {
    console.error("Error fetching recommendations:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function getThreatIntel(clientSubnets: string[], subnet: string | null) {
  const client = await pool.connect();
  try {
    // Check if threat_intel exists
    const checkRes = await client.query(`
      SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'threat_intel'
      ) AS existe;
    `);

    if (!checkRes.rows[0].existe) {
      return { threats: [], base_vazia: true };
    }

    let srcWhere = buildWhereSubnet("f.ip_src", clientSubnets, subnet, 1);
    let dstWhere = buildWhereSubnet("f.ip_dst", clientSubnets, subnet, srcWhere.nextIndex);
    
    const params = [...srcWhere.params, ...dstWhere.params];
    
    // We need 4 references to the cidr filters
    const whereParams = [
        ...srcWhere.params, ...dstWhere.params, 
        ...srcWhere.params, ...dstWhere.params
    ];
    let idx = 1;
    let sqlParams: any[] = [];
    
    let srcFilter = subnet ? `f.ip_src << $${idx++}` : (clientSubnets.length > 0 ? `f.ip_src << ANY($${idx++}::inet[])` : `1=0`);
    let dstFilter = subnet ? `f.ip_dst << $${idx++}` : (clientSubnets.length > 0 ? `f.ip_dst << ANY($${idx++}::inet[])` : `1=0`);
    let srcFilter2 = subnet ? `f.ip_src << $${idx++}` : (clientSubnets.length > 0 ? `f.ip_src << ANY($${idx++}::inet[])` : `1=0`);
    let dstFilter2 = subnet ? `f.ip_dst << $${idx++}` : (clientSubnets.length > 0 ? `f.ip_dst << ANY($${idx++}::inet[])` : `1=0`);

    if(subnet) {
        sqlParams = [subnet, subnet, subnet, subnet];
    } else if(clientSubnets.length > 0) {
        sqlParams = [clientSubnets, clientSubnets, clientSubnets, clientSubnets];
    }

    if (sqlParams.length === 0) {
      return { threats: [] };
    }

    const res = await client.query(`
      SELECT
          host(ti.ip)                    AS ip_externo,
          ti.fontes,
          ti.categorias,
          COALESCE(tc.score, ti.score, 0) AS score_abuso,
          tc.total_reportes,
          tc.ultimo_reporte,
          tc.categorias                  AS cache_categorias,
          gc.country                     AS pais,
          ARRAY_AGG(DISTINCT host(f.ip_src)) FILTER (WHERE ${srcFilter}) AS hosts_internos_src,
          ARRAY_AGG(DISTINCT host(f.ip_dst)) FILTER (WHERE ${dstFilter}) AS hosts_internos_dst,
          COUNT(*)                       AS total_flows,
          SUM(COALESCE(f.bytes, 0))      AS volume_bytes,
          MIN(f.stamp_inserted)          AS primeira_comunicacao,
          MAX(f.stamp_inserted)          AS ultima_comunicacao
      FROM threat_intel ti
      JOIN flows f ON (f.ip_src = ti.ip OR f.ip_dst = ti.ip)
      LEFT JOIN threat_cache tc ON tc.ip = ti.ip
      LEFT JOIN geoip_cache gc ON gc.ip = ti.ip
      WHERE (${srcFilter2} OR ${dstFilter2})
      GROUP BY ti.ip, ti.fontes, ti.categorias, ti.score,
               tc.score, tc.total_reportes, tc.ultimo_reporte, tc.categorias,
               gc.country
      ORDER BY COALESCE(tc.score, ti.score, 0) DESC;
    `, sqlParams);

    return { threats: res.rows };
  } catch (error: any) {
    console.error("Error fetching threat intel:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function getEgressAnomalies(clientSubnets: string[], subnet: string | null) {
  const client = await pool.connect();
  try {
    const anomalias: any[] = [];
    let idx = 1;
    let sqlParams: any[] = [];
    
    let ipFilter = subnet ? `f.ip_src << $${idx++}` : (clientSubnets.length > 0 ? `f.ip_src << ANY($${idx++}::inet[])` : `1=0`);
    if(subnet) { sqlParams = [subnet]; }
    else if(clientSubnets.length > 0) { sqlParams = [clientSubnets]; }
    
    if (sqlParams.length === 0) return { anomalias: [] };

    // Fetch recently resolved IPs
    const resolvedRes = await client.query(`
        SELECT host(host_ip::inet) as ip FROM alert_cases 
        WHERE finalizado_em >= NOW() - INTERVAL '30 minutes'
    `);
    const resolvedIps = new Set(resolvedRes.rows.map(r => r.ip));

    // 1. Anomalia de Volume (30 min)
    const volRes = await client.query(`
        SELECT host(f.ip_src) AS host_src,
               SUM(f.bytes) AS bytes_saida,
               COUNT(*) AS flows_saida,
               hp.baseline_freq_media, hp.baseline_freq_stddev,
               hp.baseline_confianca, hp.sensibilidade
        FROM flows f
        JOIN host_profile hp ON f.ip_src = hp.ip
        WHERE f.stamp_inserted >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '30 minutes'
          AND ${ipFilter}
        GROUP BY f.ip_src, hp.baseline_freq_media, hp.baseline_freq_stddev,
                 hp.baseline_confianca, hp.sensibilidade
    `, sqlParams);

    for (const row of volRes.rows) {
      const bl_freq = row.baseline_freq_media || 0;
      const bl_std = row.baseline_freq_stddev || 0;
      const flows_saida = parseInt(row.flows_saida);
      
      const sens = row.sensibilidade || "media";
      let mult = 3;
      if (sens === "alta") mult = 2;
      else if (sens === "baixa") mult = 4;

      let is_anomalous = false;
      let reason = "";

      if (resolvedIps.has(row.host_src)) continue;

      if (row.baseline_confianca === "media" || row.baseline_confianca === "alta") {
        if (bl_std > 0 && flows_saida > bl_freq + mult * bl_std) {
            is_anomalous = true;
            reason = `Volume de saída anormal: ${flows_saida} flows (baseline: ${bl_freq.toFixed(1)}±${bl_std.toFixed(1)})`;
        }
      } else {
        // Fallback: se não há baseline confiável, usa um limiar estático bem alto (ex: 50.000 flows em 30 min)
        if (flows_saida > 50000) {
            is_anomalous = true;
            reason = `Volume de saída massivo detectado: ${flows_saida} flows (sem baseline preenchido)`;
        }
      }

      if (is_anomalous) {
        anomalias.push({
            host_src: row.host_src,
            tipo: "volume",
            descricao: reason,
            severidade: "ALTO",
            flows_analisados: flows_saida,
            periodo: "últimos 30 minutos",
            destinos: [],
            detectado_em: new Date().toISOString()
        });
      }
    }

    // 2. Anomalia de Flags TCP (5 min)
    const flagsRes = await client.query(`
        SELECT host(ip_src) AS host_src,
               tcp_flags,
               COUNT(*) AS cnt
        FROM flows f
        WHERE stamp_inserted >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '5 minutes'
          AND ${ipFilter}
          AND ip_proto = 6
        GROUP BY ip_src, tcp_flags
    `, sqlParams);

    const hostFlags: Record<string, {total: number, flags: Record<number, number>}> = {};
    for(const row of flagsRes.rows) {
        const h = row.host_src;
        if (!hostFlags[h]) hostFlags[h] = { total: 0, flags: {} };
        const cnt = parseInt(row.cnt);
        hostFlags[h].total += cnt;
        hostFlags[h].flags[row.tcp_flags] = cnt;
    }

    for (const [h, data] of Object.entries(hostFlags)) {
      if (data.total < 10) continue;
      if (resolvedIps.has(h)) continue;
      
      const pct_syn = (data.flags[2] || 0) / data.total;
      const pct_rst = (data.flags[4] || 0) / data.total;
      const has_synfin = 3 in data.flags;
      const has_null = 0 in data.flags;
      const has_xmas = 41 in data.flags || 63 in data.flags;
      
      if (pct_syn > 0.8) {
        anomalias.push({
            host_src: h, tipo: "flag_anomala",
            descricao: `SYN flood detectado — ${(pct_syn*100).toFixed(0)}% dos flows de saída apenas com SYN`,
            severidade: "CRÍTICO", flows_analisados: data.total, periodo: "últimos 5 minutos", destinos: [],
            detectado_em: new Date().toISOString()
        });
      } else if (pct_rst > 0.7) {
        anomalias.push({
            host_src: h, tipo: "flag_anomala",
            descricao: `RST flood detectado — ${(pct_rst*100).toFixed(0)}% dos flows de saída com RST`,
            severidade: "ALTO", flows_analisados: data.total, periodo: "últimos 5 minutos", destinos: [],
            detectado_em: new Date().toISOString()
        });
      } else if (has_synfin || has_null || has_xmas) {
        anomalias.push({
            host_src: h, tipo: "flag_anomala",
            descricao: "Evasão/Fingerprinting: Presença de flags TCP anômalas (SYN+FIN, NULL ou XMAS)",
            severidade: "ALTO", flows_analisados: data.total, periodo: "últimos 5 minutos", destinos: [],
            detectado_em: new Date().toISOString()
        });
      }
    }

    // 3. Dispersão (5 min)
    let dispParams = sqlParams.length === 1 ? [sqlParams[0], sqlParams[0]] : [];
    let notDstFilter = subnet ? `NOT f.ip_dst << $2` : (clientSubnets.length > 0 ? `NOT f.ip_dst << ANY($2::inet[])` : `1=0`);
    
    const dispRes = await client.query(`
        SELECT host(f.ip_src) AS host_src,
               COUNT(DISTINCT f.ip_dst) AS dst_distintos,
               ARRAY_AGG(DISTINCT host(f.ip_dst)) AS destinos,
               MAX(hp.sensibilidade) AS sensibilidade
        FROM flows f
        LEFT JOIN host_profile hp ON f.ip_src = hp.ip
        WHERE f.stamp_inserted >= (SELECT MAX(stamp_inserted) FROM flows) - INTERVAL '5 minutes'
          AND ${ipFilter}
          AND ${notDstFilter}
        GROUP BY f.ip_src
        HAVING COUNT(DISTINCT f.ip_dst) > 10
    `, dispParams);

    for (const row of dispRes.rows) {
        const sens = row.sensibilidade || "media";
        let limiar_disp = 20;
        if (sens === "alta") limiar_disp = 10;
        else if (sens === "baixa") limiar_disp = 40;
        
        const dst_distintos = parseInt(row.dst_distintos);
        if (dst_distintos > limiar_disp && !resolvedIps.has(row.host_src)) {
            anomalias.push({
                host_src: row.host_src, tipo: "dispersao",
                descricao: `Dispersão de saída alta — conectando a ${dst_distintos} IPs externos distintos em curto período`,
                severidade: "CRÍTICO", flows_analisados: 0, periodo: "últimos 5 minutos", destinos: row.destinos.slice(0, 10),
                detectado_em: new Date().toISOString()
            });
        }
    }

    return { anomalias };
  } catch (error: any) {
    console.error("Error fetching Egress Anomalies:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function finalizeAlert(ip: string, justificativa: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Save to alert cases
    await client.query(`
      INSERT INTO alert_cases (alert_hash, host_ip, titulo, categoria, justificativa, finalizado_em)
      VALUES (md5(random()::text), $1::inet, 'Incidente Finalizado Manualmente', 'resolucao_manual', $2, NOW())
    `, [ip, justificativa]);

    // Reset host profile
    await client.query(`
      UPDATE host_profile 
      SET nivel_alerta = 'normal', tags = '[]'::jsonb 
      WHERE host(ip) = $1
    `, [ip]);

    await client.query("COMMIT");
    revalidatePath('/dashboard/security');
    return { success: true };
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error finalizing alert:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}
