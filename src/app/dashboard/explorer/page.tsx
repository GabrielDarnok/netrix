import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getClients, getNetworks } from "@/lib/actions/admin";
import { splitCidrTo24s } from "@/lib/utils/network";
import { fetchExplorerData, ExplorerFilters } from "@/lib/actions/explorer";
import ExplorerUI from "./ExplorerUI";

export default async function ExplorerPage(props: { searchParams: Promise<any> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const isDark = cookieStore.get('theme')?.value !== 'light';

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
    selectedSubnet = availableSubnets.length > 0 ? availableSubnets[0] : null;
  }

  // Parse filters
  const filters: ExplorerFilters = {
    subnet: selectedSubnet,
    clientSubnets: availableSubnets,
    ip: searchParams.ip || "",
    port: searchParams.port || "",
    proto: searchParams.proto || "all",
    direction: searchParams.direction || "all",
    tcpFlags: searchParams.tcpFlags ? searchParams.tcpFlags.split(",") : [],
    range: searchParams.range || "24h",
    asn: searchParams.asn || "",
    page: parseInt(searchParams.page || "1", 10),
    sort: searchParams.sort || "stamp_inserted",
    order: (searchParams.order === "asc") ? "asc" : "desc",
  };

  const initialData = await fetchExplorerData(filters);

  return (
    <ExplorerUI 
      user={session.user} 
      isDark={isDark}
      clients={clients}
      networks={allNetworks}
      selectedClientId={clientId}
      availableSubnets={availableSubnets}
      selectedSubnet={selectedSubnet}
      initialFilters={filters}
      initialData={initialData}
    />
  );
}
