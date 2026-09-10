function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

export function splitCidrTo24s(cidr: string): string[] {
  if (!cidr.includes('/')) return [cidr];
  
  const [ipStr, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  // If the subnet is /24 or smaller (/25, /32), keep it as is.
  if (prefix >= 24) {
    return [cidr];
  }
  
  const ipLong = ipToLong(ipStr);
  const num24s = 1 << (24 - prefix);
  
  // Find the base network address for this prefix
  const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
  const baseIpLong = ipLong & mask;
  
  const results: string[] = [];
  const step = 1 << 8; // 256 addresses per /24
  
  for (let i = 0; i < num24s; i++) {
    results.push(`${longToIp(baseIpLong + (i * step))}/24`);
  }
  
  return results;
}

export const PROTOCOL_MAP: Record<number, string> = {
  1: "ICMP",
  2: "IGMP",
  6: "TCP",
  17: "UDP",
  47: "GRE",
  50: "ESP",
  51: "AH",
  58: "IPv6-ICMP",
  89: "OSPF",
  112: "VRRP",
  132: "SCTP",
};
