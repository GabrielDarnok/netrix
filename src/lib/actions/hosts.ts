'use server';

import { pool } from '../db';
import { fetchActiveServices } from './services';
import { SERVICE_MAP, analyzeServiceFlow } from '../utils/services-analyzer';

const PORT_TO_ROLE: Record<number, [string, string]> = {};
const _role_groups: Record<string, number[]> = {
  "Servidor Web_Globe":         [80, 443, 8080, 8443, 8888],
  "Servidor SSH_Key":           [22],
  "Servidor DNS_BookOpen":      [53],
  "Servidor FTP_Folder":        [20, 21],
  "Servidor E-mail_Mail":       [25, 110, 143, 465, 587, 993, 995],
  "Servidor de BD_Database":    [3306, 5432, 1433, 1521, 27017],
  "Servidor LDAP_Users":        [389, 636],
  "Servidor SMB/Arquivos_File": [139, 445, 2049],
  "Acesso Remoto_MonitorPlay":  [3389, 5900],
  "Servidor NTP_Clock":         [123],
  "Servidor DHCP_Plug":         [67, 68],
  "Servidor SNMP_Activity":     [161, 162],
  "Servidor Syslog_FileText":   [514],
  "Coletor NetFlow_Inbox":      [2055, 9995, 6343],
  "Servidor VoIP_Phone":        [5060, 5061],
  "Servidor VPN_Lock":          [500, 1194, 1701, 1723, 4500, 51820],
  "Middleware/Cache_Zap":       [2181, 5672, 6379, 9200],
  "Kerberos/Auth_Shield":       [88],
  "Router/BGP_Network":         [179],
  "Discovery/mDNS_Radio":       [1900, 3702, 5353, 5355],
  "Monitoramento_LineChart":    [9090, 9100],
  "Container/K8s_Box":          [2375, 2376, 6443],
  "Servidor Telnet_AlertTriangle":[23],
  "IRC/Chat_MessageSquare":     [6667],
  "Backdoor/C2_Skull":          [4444, 31337],
  "Infra (RPC/NetBIOS)_Settings":[111, 135, 137],
};

for (const [key, ports] of Object.entries(_role_groups)) {
  const [rn, ri] = key.split('_');
  for (const p of ports) {
    PORT_TO_ROLE[p] = [rn, ri];
  }
}

export async function fetchHosts(clientSubnets: string[], subnet: string | null) {
  const client = await pool.connect();
  try {
    let whereParts: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (subnet) {
      whereParts.push(`hp.ip << $${paramIndex}`);
      params.push(subnet);
      paramIndex++;
    } else if (clientSubnets && clientSubnets.length > 0) {
      whereParts.push(`hp.ip << ANY($${paramIndex}::inet[])`);
      params.push(clientSubnets);
      paramIndex++;
    } else {
      whereParts.push(`1=0`);
    }

    const whereSql = whereParts.length > 0 ? "WHERE " + whereParts.join(" AND ") : "";

    const hostsSql = `
      SELECT
          host(hp.ip)                        AS ip,
          hp.role,
          hp.tags,
          hp.nivel_alerta,
          hp.volume_total                    AS volume_bytes,
          hp.conexoes_total,
          ROUND(hp.frequencia::numeric, 1)   AS frequencia,
          hp.direcao_trafego                 AS direcao,
          hp.total_portas_dst                AS portas,
          hp.total_paises                    AS paises,
          COALESCE(hp.sensibilidade, 'media') AS sensibilidade,
          ROUND(COALESCE(hp.pct_udp, 0)::numeric, 1) AS pct_udp
      FROM host_profile hp
      ${whereSql}
      ORDER BY hp.volume_total DESC;
    `;

    const hostsRes = await client.query(hostsSql, params);
    const rows = hostsRes.rows;

    // Servicos Ativos - Usando a mesma função da tela de serviços para garantir alinhamento perfeito
    const activeServices = await fetchActiveServices(clientSubnets, subnet);
    const hostServices: Record<string, any[]> = {};
    
    for (const svc of activeServices) {
      if (!hostServices[svc.ip]) hostServices[svc.ip] = [];
      hostServices[svc.ip].push({ porta: svc.porta, nome: svc.servico, flows: svc.flows });
    }

    const result = rows.map((r: any) => {
      let tags = [];
      try { tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []); } catch(e){}

      const servicos_ativos = hostServices[r.ip] || [];
      const seenRoles: Record<string, any> = {};

      for (const svc of servicos_ativos) {
        const mapping = PORT_TO_ROLE[svc.porta];
        if (mapping) {
          const [rn, icon] = mapping;
          if (!seenRoles[rn]) seenRoles[rn] = { icon, portas: [], flows: 0 };
          seenRoles[rn].portas.push(svc.porta);
          seenRoles[rn].flows += svc.flows;
        }
      }

      let papel_interno = [];
      if (Object.keys(seenRoles).length > 0) {
        papel_interno = Object.entries(seenRoles)
          .map(([rn, info]) => ({ role: rn, icon: info.icon, portas: info.portas.sort(), flows: info.flows }))
          .sort((a, b) => b.flows - a.flows);
      } else {
        papel_interno = [{ role: 'Host Cliente', icon: '💻', portas: [] }];
      }

      return {
        ...r,
        tags,
        volume_bytes: parseInt(r.volume_bytes || "0", 10),
        conexoes_total: parseInt(r.conexoes_total || "0", 10),
        frequencia: parseFloat(r.frequencia || "0"),
        portas: parseInt(r.portas || "0", 10),
        paises: parseInt(r.paises || "0", 10),
        pct_udp: parseFloat(r.pct_udp || "0"),
        servicos_ativos,
        papel_interno
      };
    });

    return { hosts: result };
  } catch (error: any) {
    console.error("Hosts Error:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

// ─── RISK SCORING ENGINE ──────────────────────────────────────────
const KNOWN_DNS = {
  '8.8.8.8': 'Google DNS', '8.8.4.4': 'Google DNS',
  '1.1.1.1': 'Cloudflare', '1.0.0.1': 'Cloudflare',
  '9.9.9.9': 'Quad9', '208.67.222.222': 'OpenDNS',
};
const KNOWN_NTP = {
  '216.239.35.0': 'Google NTP', '162.159.200.123': 'Cloudflare NTP',
  '200.160.7.186': 'NTP.br',
};
const CRITICAL_PORTS = new Set([4444, 1337, 31337, 6667, 6697, 9001, 9030]);
const HIGH_RISK_PORTS = new Set([23, 445, 3389, 5900, 6379, 9200, 27017, 1433, 8333]);
const MEDIUM_RISK_PORTS = new Set([21, 25, 110, 143, 161, 6881, 1194, 1723]);
const NORMAL_PORTS = new Set([80, 443, 53, 123, 8080, 8443, 993, 465, 587]);
const MDNS_SSDP_PORTS = new Set([5353, 5355, 1900]);

function isPrivate(ip: string) {
  return ip.startsWith('10.') || ip.startsWith('192.168.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
}

function isMulticast(ip: string) {
  return ip.startsWith('224.') || ip.startsWith('239.') || ip.endsWith('.255') || ip === '255.255.255.255';
}

function computePeerScore(peer_ip: string, top_port: number, raw_country: string | null, flows: number, vol_bytes: number, total_flows: number, total_bytes: number, all_ext_countries: string[]) {
  let score = 0;
  let reasons: string[] = [];

  if (isMulticast(peer_ip)) return { score: 0, level: 'normal', reasons: ['Endereço multicast/broadcast.'], country: 'Multicast' };
  if (isPrivate(peer_ip)) return { score: 0, level: 'normal', reasons: ['IP Privado (LAN).'], country: 'LAN' };
  
  if (KNOWN_DNS[peer_ip as keyof typeof KNOWN_DNS] && top_port === 53) return { score: 0, level: 'normal', reasons: ['Resolvedor DNS Público Conhecido.'], country: raw_country || 'Desconhecido', tag: KNOWN_DNS[peer_ip as keyof typeof KNOWN_DNS] };
  if (KNOWN_NTP[peer_ip as keyof typeof KNOWN_NTP] && top_port === 123) return { score: 0, level: 'normal', reasons: ['NTP Público Conhecido.'], country: raw_country || 'Desconhecido', tag: KNOWN_NTP[peer_ip as keyof typeof KNOWN_NTP] };
  if (KNOWN_DNS[peer_ip as keyof typeof KNOWN_DNS] && (top_port === 80 || top_port === 443)) {
    score += 5;
    reasons.push('IP de infraestrutura conhecida via HTTP.');
  }

  if (CRITICAL_PORTS.has(top_port)) { score += 55; reasons.push(`Porta crítica: ${top_port} (C2/backdoor).`); }
  else if (HIGH_RISK_PORTS.has(top_port)) { score += 35; reasons.push(`Porta de alto risco: ${top_port}.`); }
  else if (MEDIUM_RISK_PORTS.has(top_port)) { score += 15; reasons.push(`Porta incomum: ${top_port}.`); }
  else if (MDNS_SSDP_PORTS.has(top_port)) { score += 5; reasons.push(`Porta de descoberta local (${top_port}).`); }
  else if (NORMAL_PORTS.has(top_port)) { score += 0; }
  else if (top_port === 0) { score += 5; reasons.push('Porta de destino desconhecida.'); }
  else { score += 10; reasons.push(`Porta não classificada: ${top_port}.`); }

  const country = raw_country || null;
  if (!country) {
    score += 12;
    reasons.push('IP externo sem geolocalização.');
  } else {
    const ext = all_ext_countries.filter(c => c && c !== 'LAN' && c !== 'Multicast');
    const isSole = ext.filter(c => c === country).length === 1 && new Set(ext).size > 1;
    if (isSole) {
      score += 8;
      reasons.push(`País incomum entre peers deste host: ${country}.`);
    }
  }

  if (total_bytes > 0) {
    const pct = vol_bytes / total_bytes;
    if (pct > 0.5) { score += 15; reasons.push(`Concentra ${Math.round(pct*100)}% do volume.`); }
    else if (pct > 0.25) { score += 7; reasons.push(`Alto volume relativo: ${Math.round(pct*100)}%.`); }
  }

  if (total_flows > 0) {
    const pct = flows / total_flows;
    if (pct > 0.6) { score += 10; reasons.push(`Alta frequência: ${Math.round(pct*100)}% dos flows.`); }
  }

  score = Math.min(score, 100);
  let level = 'normal';
  if (score >= 70) level = 'critico';
  else if (score >= 40) level = 'suspeito';
  else if (score >= 15) level = 'atencao';

  if (reasons.length === 0) reasons.push('Nenhum indicador de risco detectado.');

  return { score, level, reasons, country: country || '?' };
}

export async function fetchHostDetails(ip: string, clientSubnets: string[]) {
  const client = await pool.connect();
  try {
    const params = [ip];
    const profSql = `
        SELECT
            host(ip)                        AS ip,
            role, tags, nivel_alerta,
            volume_total                    AS volume_bytes,
            conexoes_total,
            ROUND(frequencia::numeric, 1)   AS frequencia,
            direcao_trafego                 AS direcao,
            total_portas_dst                AS portas,
            total_paises                    AS paises,
            primeira_atividade, ultima_atividade,
            countries_origem, countries_destino,
            pct_udp,
            COALESCE(sensibilidade, 'media') AS sensibilidade
        FROM host_profile
        WHERE host(ip) = $1
    `;
    const profRes = await client.query(profSql, params);
    const profile = profRes.rows[0] || null;

    // Calcular papel interno dinamico (assim como no fetchHosts)
    const svcSql = `
        SELECT port_dst AS porta, COUNT(*) AS flows
        FROM flows
        WHERE host(ip_dst) = $1
          AND port_dst IS NOT NULL
          AND port_dst > 0
          AND port_dst < 49152
        GROUP BY port_dst
        HAVING COUNT(*) >= 3
    `;
    const svcRes = await client.query(svcSql, params);
    
    const seenRoles: Record<string, any> = {};
    for (const r of svcRes.rows) {
      const porta = r.porta;
      if (SERVICE_MAP[porta]) {
        const mapping = PORT_TO_ROLE[porta];
        if (mapping) {
          const [rn, icon] = mapping;
          if (!seenRoles[rn]) seenRoles[rn] = { icon, portas: [], flows: 0 };
          seenRoles[rn].portas.push(porta);
          seenRoles[rn].flows += parseInt(r.flows, 10);
        }
      }
    }

    if (profile) {
       if (Object.keys(seenRoles).length > 0) {
         const papeis = Object.entries(seenRoles)
           .map(([rn, info]) => ({ role: rn, icon: info.icon, portas: info.portas.sort(), flows: info.flows }))
           .sort((a, b) => b.flows - a.flows);
         profile.role = papeis[0].role;
       } else {
         profile.role = 'Host Cliente';
       }
    }

    if (profile && typeof profile.tags === 'string') {
        try { profile.tags = JSON.parse(profile.tags); } catch(e){}
    }

    // Peers Externos (só precisamos desses para a migration simplificada, mas se der buscaremos interno tb)
    // Para simplificar, faremos uma única query de comunicação (top 30 peers do host)
    const peerSql = `
        SELECT 
            CASE WHEN host(f.ip_src) = $1 THEN host(f.ip_dst) ELSE host(f.ip_src) END AS peer, 
            COUNT(*) AS flows, SUM(f.bytes) AS bytes, g.country,
            MODE() WITHIN GROUP (ORDER BY CASE WHEN host(f.ip_src) = $1 THEN f.port_dst ELSE f.port_src END) AS top_port,
            MODE() WITHIN GROUP (ORDER BY f.ip_proto) AS top_proto
        FROM flows f 
        LEFT JOIN geoip_cache g ON g.ip = CASE WHEN host(f.ip_src) = $1 THEN f.ip_dst ELSE f.ip_src END
        WHERE host(f.ip_src) = $1 OR host(f.ip_dst) = $1
        GROUP BY peer, g.country 
        ORDER BY bytes DESC LIMIT 50;
    `;
    const peerRes = await client.query(peerSql, params);
    
    let allPeers = peerRes.rows.map((r: any) => ({
      ...r, 
      flows: parseInt(r.flows, 10), 
      bytes: parseInt(r.bytes, 10)
    }));

    const total_flows = allPeers.reduce((acc, p) => acc + p.flows, 0);
    const total_bytes = allPeers.reduce((acc, p) => acc + p.bytes, 0);
    const all_ext_countries = allPeers.map(p => p.country);

    const enrichedPeers = allPeers.map(p => {
        const isExt = !isPrivate(p.peer) && !isMulticast(p.peer);
        if (isExt) {
           const risk = computePeerScore(p.peer, p.top_port, p.country, p.flows, p.bytes, total_flows, total_bytes, all_ext_countries);
           return { ...p, ...risk, isExternal: true };
        } else {
           return { ...p, score: 0, level: 'normal', reasons: ['LAN'], country: isPrivate(p.peer) ? 'LAN' : 'Multicast', isExternal: false };
        }
    });

    enrichedPeers.sort((a, b) => {
        const lvls: any = {'critico': 0, 'suspeito': 1, 'atencao': 2, 'normal': 3};
        const al = lvls[a.level] ?? 9;
        const bl = lvls[b.level] ?? 9;
        if (al !== bl) return al - bl;
        return b.flows - a.flows;
    });

    // Communication Summary
    const crit = enrichedPeers.filter(p => p.level === 'critico');
    const susp = enrichedPeers.filter(p => p.level === 'suspeito');
    const aten = enrichedPeers.filter(p => p.level === 'atencao');

    let status = 'normal';
    let descricao = 'Comunicação dentro do padrão esperado para este tipo de host.';
    let motivos = ['Nenhum indicador de ameaça detectado neste intervalo.'];

    if (crit.length > 0) {
       status = 'critico';
       descricao = `Peer crítico detectado: ${crit[0].peer}. Ação imediata recomendada.`;
       motivos = crit.slice(0,3).map(c => `${c.peer} (Score ${c.score}): ${c.reasons.join(' ')}`);
    } else if (susp.length > 0) {
       status = 'suspeito';
       descricao = `${susp.length} peer(s) suspeito(s) identificado(s). Investigação recomendada.`;
       motivos = susp.slice(0,3).map(s => `${s.peer} (Score ${s.score}): ${s.reasons.join(' ')}`);
    } else if (aten.length > 0) {
       status = 'atencao';
       descricao = `${aten.length} peer(s) requerem atenção. Validar destinos.`;
       motivos = aten.slice(0,3).map(a => `${a.peer}: ${a.reasons.join(' ')}`);
    }

    if (status === 'normal' && profile?.nivel_alerta === 'critico') {
       status = 'atencao';
       descricao = 'Tráfego principal confiável, mas comportamento global do host apresenta anomalias graves.';
       motivos.unshift('Host classificado como CRÍTICO pelas regras de comportamento em background.');
    }

    return { 
        ip, 
        profile, 
        peers: enrichedPeers,
        summary: { status, descricao, motivos }
    };
  } catch (error: any) {
    console.error("HostDetail Error:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function fetchHostServicesAnalysis(ip: string) {
  const client = await pool.connect();
  try {
    const hostedSql = `
      SELECT
          port_dst AS porta,
          COUNT(*) AS flows,
          SUM(bytes) AS volume_bytes,
          SUM(CASE WHEN ip_proto = 6 THEN 1 ELSE 0 END) AS tcp_count,
          SUM(CASE WHEN ip_proto = 17 THEN 1 ELSE 0 END) AS udp_count,
          BIT_OR(tcp_flags) AS accumulated_flags,
          MAX(stamp_inserted) AS last_seen
      FROM flows
      WHERE host(ip_dst) = $1 AND port_dst > 0
      GROUP BY port_dst
      HAVING COUNT(*) >= 2
      ORDER BY volume_bytes DESC
      LIMIT 100;
    `;
    const hostedRes = await client.query(hostedSql, [ip]);

    const consumedSql = `
      SELECT
          host(ip_dst) AS target_ip,
          port_dst AS porta,
          COUNT(*) AS flows,
          SUM(bytes) AS volume_bytes,
          MAX(stamp_inserted) AS last_seen
      FROM flows
      WHERE host(ip_src) = $1 AND port_dst > 0
      GROUP BY ip_dst, port_dst
      HAVING COUNT(*) >= 2
      ORDER BY volume_bytes DESC
      LIMIT 50;
    `;
    const consumedRes = await client.query(consumedSql, [ip]);

    const customRes = await client.query('SELECT host(ip) as ip, port, custom_name FROM custom_services');
    const customMap = new Map();
    customRes.rows.forEach(r => customMap.set(`${r.ip}:${r.port}`, r.custom_name));

    const dismissedRes = await client.query('SELECT host(ip) as ip, port, dismissed_at FROM dismissed_services');
    const dismissedMap = new Map();
    dismissedRes.rows.forEach(r => dismissedMap.set(`${r.ip}:${r.port}`, new Date(r.dismissed_at).getTime()));

    const hosted = hostedRes.rows.map(r => {
      const p = parseInt(r.porta);
      const analysis = analyzeServiceFlow({
        targetIp: ip,
        port: p,
        tcp_count: parseInt(r.tcp_count),
        udp_count: parseInt(r.udp_count),
        accumulated_flags: parseInt(r.accumulated_flags || "0"),
        last_seen: r.last_seen,
        customMap,
        dismissedMap
      });

      return {
        ...r, ip, porta: p, 
        servico: analysis.name, 
        risco: analysis.risk,
        is_custom_named: analysis.isCustomNamed, 
        is_dismissed: analysis.isDismissed, 
        proto: analysis.proto, 
        tcpStatus: analysis.tcpStatus, 
        isEphemeral: analysis.isEphemeral
      };
    }).filter(s => s.tcpStatus !== 'EPHEMERAL' && s.tcpStatus !== 'SCAN' && !s.is_dismissed && !(s.isEphemeral && !s.is_custom_named));

    const consumed = consumedRes.rows.map(r => {
      const p = parseInt(r.porta);
      const analysis = analyzeServiceFlow({
        targetIp: r.target_ip,
        port: p,
        tcp_count: 0, 
        udp_count: 0, 
        accumulated_flags: 0,
        last_seen: r.last_seen,
        customMap,
        dismissedMap
      });
      return { ...r, porta: p, servico: analysis.name, risco: analysis.risk, is_custom_named: analysis.isCustomNamed };
    });

    return { hosted, consumed };
  } catch (error) {
    console.error("Host Services Analysis Error:", error);
    return { hosted: [], consumed: [] };
  } finally {
    client.release();
  }
}
