import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HostDetailUI from "./HostDetailUI";
import { fetchHostDetails, fetchHostServicesAnalysis } from "@/lib/actions/hosts";
import { getNetworks } from "@/lib/actions/admin";

export default async function HostDetailPage(props: {
  params: Promise<{ ip: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const ip = params.ip; // O Next.js já faz o decodificar (ex: 192.168.1.10)
  const cookieStore = await cookies();
  const isDark = cookieStore.get('theme')?.value !== 'light';
  let selectedClientId = searchParams.client ? Number(searchParams.client) : null;
  const selectedSubnet = typeof searchParams.subnet === 'string' ? searchParams.subnet : null;

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

  let targetSubnets: string[] = [];
  if (selectedClientId) {
    const clientNetworks = networks.filter((n: any) => n.client_id === selectedClientId);
    if (selectedSubnet) {
      const net = clientNetworks.find((n: any) => n.cidr === selectedSubnet);
      if (net) targetSubnets = [net.cidr];
    } else {
      targetSubnets = clientNetworks.map((n: any) => n.cidr);
    }
  }

  const res = await fetchHostDetails(ip, targetSubnets);
  const servicesData = await fetchHostServicesAnalysis(ip);

  return (
    <HostDetailUI
      user={session.user}
      isDark={isDark}
      networks={networks}
      selectedClientId={selectedClientId}
      selectedSubnet={selectedSubnet}
      hostDetails={res}
      servicesData={servicesData}
    />
  );
}
