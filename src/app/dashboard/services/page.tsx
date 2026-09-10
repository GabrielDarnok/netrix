import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getClients, getNetworks } from "@/lib/actions/admin";
import { fetchAllServices, fetchDNS, fetchNTP, fetchDHCP, fetchGateway, fetchSSH, fetchNetflowExporters, fetchEmailServers } from "@/lib/actions/services";
import { splitCidrTo24s } from "@/lib/utils/network";
import ServicesUI from "./ServicesUI";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ client?: string, subnet?: string }> | { client?: string, subnet?: string } }) {
  const params = await searchParams;
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const isDark = cookieStore.get('theme')?.value !== 'light';

  const clients = await getClients();
  const clientId = params.client ? parseInt(params.client) : (clients.length > 0 ? clients[0].id : null);
  const allNetworks = await getNetworks();
  
  const clientNetworks = clientId 
    ? allNetworks.filter((n: any) => n.client_id === clientId)
    : allNetworks;
    
  let availableSubnets: string[] = [];
  clientNetworks.forEach((net: any) => {
    const subnets = splitCidrTo24s(net.cidr);
    availableSubnets = [...availableSubnets, ...subnets];
  });
  
  availableSubnets = Array.from(new Set(availableSubnets)).sort();
  
  let selectedSubnet = params.subnet || (availableSubnets.length > 0 ? availableSubnets[0] : null);
  if (selectedSubnet && !availableSubnets.includes(selectedSubnet)) {
    selectedSubnet = availableSubnets.length > 0 ? availableSubnets[0] : null;
  }

  // Parallel fetch to optimize server-side rendering
  const [
    allServices, dns, ntp, dhcp, gateways, ssh, netflow, email
  ] = await Promise.all([
    fetchAllServices(selectedSubnet),
    fetchDNS(selectedSubnet),
    fetchNTP(selectedSubnet),
    fetchDHCP(selectedSubnet),
    fetchGateway(selectedSubnet),
    fetchSSH(selectedSubnet),
    fetchNetflowExporters(selectedSubnet),
    fetchEmailServers(selectedSubnet)
  ]);

  const initialData = {
    allServices,
    dns,
    ntp,
    dhcp,
    gateways,
    ssh,
    netflow,
    email
  };

  return (
    <ServicesUI 
      user={session.user} 
      isDark={isDark}
      clients={clients}
      networks={allNetworks}
      selectedClientId={clientId}
      availableSubnets={availableSubnets}
      selectedSubnet={selectedSubnet}
      initialData={initialData}
    />
  );
}
