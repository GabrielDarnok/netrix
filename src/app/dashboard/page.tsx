import React from "react";
import { auth } from "@/auth";
import DashboardUI from "./DashboardUI";
import { redirect } from "next/navigation";
import { fetchDashboardMetrics, fetchTopThreats, fetchVolumePerHour, fetchTopHostsByVolume } from "@/lib/actions/dashboard";
import { getClients, getNetworks } from "@/lib/actions/admin";
import { getThreatIntel, getEgressAnomalies } from "@/lib/actions/security";
import { fetchActiveServices } from "@/lib/actions/services";
import { splitCidrTo24s } from "@/lib/utils/network";

export default async function DashboardPage(props: { searchParams: Promise<{ client?: string, subnet?: string, range?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const clients = await getClients();
  const clientId = searchParams.client ? parseInt(searchParams.client) : (clients.length > 0 ? clients[0].id : null);
  const allNetworks = await getNetworks();
  
  // Get networks for selected client
  const clientNetworks = clientId 
    ? allNetworks.filter((n: any) => n.client_id === clientId)
    : allNetworks;
    
  // Explode CIDRs to /24s
  let availableSubnets: string[] = [];
  clientNetworks.forEach((net: any) => {
    const subnets = splitCidrTo24s(net.cidr);
    availableSubnets = [...availableSubnets, ...subnets];
  });
  
  // Remove duplicates just in case
  availableSubnets = Array.from(new Set(availableSubnets)).sort();
  
  // Select active subnet
  let selectedSubnet = searchParams.subnet || (availableSubnets.length > 0 ? availableSubnets[0] : null);
  if (selectedSubnet && !availableSubnets.includes(selectedSubnet)) {
    // If invalid subnet for client, reset it
    selectedSubnet = availableSubnets.length > 0 ? availableSubnets[0] : null;
  }
  
  const selectedRange = searchParams.range || '24 hours';
  
  // Fetch data based on selected /24
  const metrics = await fetchDashboardMetrics(selectedSubnet, selectedRange);
  const volumePerHour = await fetchVolumePerHour(selectedSubnet, selectedRange);
  const topHosts = await fetchTopHostsByVolume(selectedSubnet);

  const clientSubnets = clientNetworks.map((n: any) => n.cidr);

  // Real-time security data
  const threatData = await getThreatIntel(clientSubnets, selectedSubnet);
  const egressData = await getEgressAnomalies(clientSubnets, selectedSubnet);
  
  // Hosted services data
  const activeServices = await fetchActiveServices(clientSubnets, selectedSubnet);

  return (
    <DashboardUI 
      user={session.user} 
      metrics={metrics} 
      threatData={threatData}
      egressData={egressData}
      volumeData={volumePerHour}
      topHosts={topHosts}
      activeServices={activeServices}
      clients={clients}
      networks={allNetworks}
      selectedClientId={clientId}
      availableSubnets={availableSubnets}
      selectedSubnet={selectedSubnet}
      selectedRange={selectedRange}
    />
  );
}
