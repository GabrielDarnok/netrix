import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HostsUI from "./HostsUI";
import { fetchHosts } from "@/lib/actions/hosts";
import { getNetworks } from "@/lib/actions/admin";

export default async function HostsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const isDark = cookieStore.get('theme')?.value !== 'light';
  let selectedClientId = searchParams.client ? Number(searchParams.client) : null;
  let selectedSubnet = typeof searchParams.subnet === 'string' ? searchParams.subnet : null;

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

  if (!selectedClientId && networks.length > 0) {
    selectedClientId = networks[0].client_id;
  }

  // Se nenhum cliente estiver selecionado, não mostramos dados.
  // Se estiver, filtramos os dados.
  let targetSubnets: string[] = [];
  let subnetCidr: string | null = null;

  if (selectedClientId) {
    const clientNetworks = networks.filter((n: any) => n.client_id === selectedClientId);
    
    if (!selectedSubnet && clientNetworks.length > 0) {
      selectedSubnet = clientNetworks[0].cidr;
    }

    if (selectedSubnet) {
      const net = clientNetworks.find((n: any) => n.cidr === selectedSubnet);
      if (net) {
        subnetCidr = net.cidr;
        targetSubnets = [net.cidr];
      }
    } else {
      targetSubnets = clientNetworks.map((n: any) => n.cidr);
    }
  }

  let hostsData: any[] = [];
  let errorMsg = null;

  if (targetSubnets.length > 0) {
     const res = await fetchHosts(targetSubnets, subnetCidr);
     if (res.error) {
         errorMsg = res.error;
     } else {
         hostsData = res.hosts || [];
     }
  }

  return (
    <HostsUI
      user={session.user}
      isDark={isDark}
      networks={networks}
      selectedClientId={selectedClientId}
      selectedSubnet={selectedSubnet}
      hostsData={hostsData}
      errorMsg={errorMsg}
    />
  );
}
