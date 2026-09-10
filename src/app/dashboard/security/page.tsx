import React from 'react';
import SecurityUI from './SecurityUI';
import { getNetworks } from '@/lib/actions/admin';
import { getRecommendations, getThreatIntel, getEgressAnomalies } from '@/lib/actions/security';
import { cookies } from 'next/headers';

export default async function SecurityPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value || 'light';
  const isDark = theme === 'dark';

  const user = { name: "Administrador", email: "admin@netrix.com", role: "admin" };

  let networks: any[] = [];
  try {
    const networksData = await getNetworks();
    networks = networksData.map((n: any) => ({
      id: n.id,
      client_id: n.client_id,
      cliente: n.client_name,
      cidr: n.cidr
    }));
  } catch (e) {
    console.error("Error fetching networks:", e);
  }
  
  const clientParam = searchParams.client;
  const subnetParam = searchParams.subnet;
  
  const selectedClientId = clientParam ? parseInt(clientParam as string, 10) : (networks.length > 0 ? networks[0].client_id : null);
  const selectedSubnet = subnetParam ? (subnetParam as string) : null;
  
  const clientSubnets = networks
    .filter((n: any) => n.client_id === selectedClientId)
    .map((n: any) => n.cidr);

  // Fetch all security data
  const recommendationsData = await getRecommendations(clientSubnets, selectedSubnet);
  const threatData = await getThreatIntel(clientSubnets, selectedSubnet);
  const egressData = await getEgressAnomalies(clientSubnets, selectedSubnet);

  return (
    <SecurityUI 
      user={user} 
      isDark={isDark} 
      networks={networks}
      selectedClientId={selectedClientId}
      selectedSubnet={selectedSubnet}
      recommendationsData={recommendationsData}
      threatData={threatData}
      egressData={egressData}
    />
  );
}
