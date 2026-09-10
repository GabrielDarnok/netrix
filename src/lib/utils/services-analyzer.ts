export const SERVICE_MAP: Record<number, string> = {
  20: "FTP-Data", 21: "FTP", 22: "SSH", 23: "Telnet",
  25: "SMTP", 53: "DNS", 67: "DHCP", 68: "DHCP",
  80: "HTTP", 88: "Kerberos", 110: "POP3", 111: "RPC",
  123: "NTP", 135: "MS-RPC", 137: "NetBIOS", 139: "NetBIOS",
  143: "IMAP", 161: "SNMP", 389: "LDAP", 443: "HTTPS",
  445: "SMB", 465: "SMTPS", 500: "IKE/IPSec", 514: "Syslog",
  636: "LDAPS", 993: "IMAPS", 995: "POP3S", 1194: "OpenVPN",
  1433: "MSSQL", 1521: "Oracle", 2055: "NetFlow", 3306: "MySQL",
  3389: "RDP", 4444: "Metasploit", 5000: "Aplicação NDR", 5060: "SIP",
  5353: "mDNS", 5432: "PostgreSQL", 6379: "Redis", 7551: "Discovery-Local",
  8080: "HTTP-Alt", 8443: "HTTPS-Alt", 9200: "Elasticsearch",
  27017: "MongoDB", 31337: "Backdoor", 51820: "WireGuard"
};

export function analyzeServiceFlow(params: {
  targetIp: string;
  port: number;
  tcp_count: number;
  udp_count: number;
  accumulated_flags: number;
  last_seen: string | Date;
  customMap: Map<string, string>;
  dismissedMap: Map<string, number>;
}) {
  const { targetIp, port, tcp_count, udp_count, accumulated_flags, last_seen, customMap, dismissedMap } = params;
  
  const key = `${targetIp}:${port}`;
  const isCustomNamed = customMap.has(key);
  const customName = customMap.get(key);
  
  let name = customName || SERVICE_MAP[port] || `:${port}`;
  let risk = "BAIXO";
  const isEphemeral = port > 32768;
  const isUnmapped = !SERVICE_MAP[port];

  if (isUnmapped && !isCustomNamed) {
    name = isEphemeral ? "Efêmera / Tunnel" : "Desconhecida";
    risk = isEphemeral ? "ALTO" : "MÉDIO";
  }

  let isDismissed = false;
  if (dismissedMap.has(key)) {
    const lastSeenTime = new Date(last_seen).getTime();
    const dismissedTime = dismissedMap.get(key) || 0;
    if (lastSeenTime < dismissedTime) isDismissed = true;
  }

  let proto = "TCP";
  if (udp_count > tcp_count * 2) proto = "UDP";
  if (tcp_count > 0 && udp_count > 0 && Math.abs(tcp_count - udp_count) < (tcp_count + udp_count) * 0.2) proto = "MIX";

  let tcpStatus = 'VALIDATED'; // Padrão
  if (proto === 'TCP' || proto === 'MIX') {
    const hasSyn = (accumulated_flags & 2) === 2;
    const hasAck = (accumulated_flags & 16) === 16;
    const hasPsh = (accumulated_flags & 8) === 8;
    
    if (hasSyn && (hasAck || hasPsh)) {
      tcpStatus = 'VALIDATED'; 
    } else if (hasSyn && !hasAck) {
      tcpStatus = 'SCAN';
      risk = 'ALTO'; 
      name = 'Possível Port Scan';
    } else if (!hasSyn && hasAck) {
      tcpStatus = 'EPHEMERAL'; 
    }
  }

  return {
    name,
    risk,
    isEphemeral,
    isUnmapped,
    isCustomNamed,
    isDismissed,
    proto,
    tcpStatus
  };
}
