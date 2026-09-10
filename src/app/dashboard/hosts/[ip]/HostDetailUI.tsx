'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Server, Activity, Globe, ShieldAlert, ShieldCheck, FileText, ChevronRight, Download, Info, Monitor, Lock, AlertTriangle, LineChart as LineChartIcon, Key, BookOpen, Folder, Mail, Database, Users, File, MonitorPlay, Clock, Plug, Inbox, Phone, Zap, Shield, Network, Radio, Box, MessageSquare, Skull, Settings, Laptop } from 'lucide-react';

const IconMap: Record<string, React.ElementType> = {
  Globe, Key, BookOpen, Folder, Mail, Database, Users, File, MonitorPlay, Clock, Plug, Activity, FileText, Inbox, Phone, Lock, Zap, Shield, Network, Radio, LineChart: LineChartIcon, Box, AlertTriangle, MessageSquare, Skull, Settings, Laptop
};
import WhoisModal from '@/components/WhoisModal';
import HostTimeline from '@/components/HostTimeline';

interface HostDetailUIProps {
  user: any;
  isDark: boolean;
  networks: any[];
  selectedClientId: number | null;
  selectedSubnet: string | null;
  hostDetails: any;
  servicesData?: { hosted: any[]; consumed: any[] };
}

export default function HostDetailUI({
  user,
  isDark: initialIsDark,
  networks,
  selectedClientId,
  selectedSubnet,
  hostDetails,
  servicesData
}: HostDetailUIProps) {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<'perfil' | 'timeline' | 'servicos'>('perfil');
  const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');
  const [isDark, setIsDark] = useState(initialIsDark);
  const [whoisIp, setWhoisIp] = useState<string | null>(null);

  // Initialize from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved !== null) {
      setIsDark(saved === 'dark');
    }
  }, []);

  // Apply dark class to body and save to local storage/cookie
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#050914";
      localStorage.setItem('theme', 'dark');
      document.cookie = "theme=dark; path=/; max-age=31536000";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#f8fafc";
      localStorage.setItem('theme', 'light');
      document.cookie = "theme=light; path=/; max-age=31536000";
    }
  }, [isDark]);

  if (hostDetails.error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#050914] text-slate-200" : "bg-slate-50 text-slate-800"}`}>
         <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro ao carregar detalhes</h2>
            <p className={`mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{hostDetails.error}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-indigo-500 text-white rounded-lg">Voltar</button>
         </div>
      </div>
    );
  }

  const { ip, profile, peers, summary } = hostDetails;

  const externalPeers = peers?.filter((p: any) => p.isExternal) || [];
  const internalPeers = peers?.filter((p: any) => !p.isExternal) || [];

  const qString = `?client=${selectedClientId}${selectedSubnet ? `&subnet=${encodeURIComponent(selectedSubnet)}` : ''}`;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clients = Array.from(new Set(networks.map(n => JSON.stringify({ id: n.client_id, name: n.cliente }))))
    .map(str => JSON.parse(str));

  const availableSubnets = networks
    .filter(n => n.client_id === selectedClientId)
    .map(n => n.cidr);

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${isDark ? "dark bg-[#050914] text-slate-200 selection:bg-cyan-500/30" : "bg-slate-50 text-slate-800 selection:bg-cyan-200"}`}>
      <Sidebar 
        user={user} 
        clients={clients}
        availableSubnets={availableSubnets}
        selectedClientId={selectedClientId} 
        selectedSubnet={selectedSubnet}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto ml-72">
        {/* Header Back & Profile */}
        <div className={`px-8 pt-6 pb-0 ${isDark ? "bg-[#0A0F1C]/90" : "bg-white"} border-b ${isDark ? "border-slate-800/50" : "border-slate-200"} flex flex-col gap-6 sticky top-0 z-10 backdrop-blur-xl`}>
           <Link href={`/dashboard/hosts${qString}`} className={`inline-flex items-center gap-2 text-sm font-medium w-fit transition-colors ${isDark ? "text-slate-400 hover:text-indigo-400" : "text-slate-500 hover:text-indigo-600"}`}>
              <ArrowLeft className="w-4 h-4" /> Voltar para Inventário
           </Link>

           <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${isDark ? "bg-slate-800 text-indigo-400" : "bg-slate-100 text-indigo-600"}`}>
                    {profile?.nivel_alerta === 'critico' ? <Skull className="w-8 h-8 text-red-500" /> : 
                       (profile?.icon && IconMap[profile.icon]) ? 
                          React.createElement(IconMap[profile.icon], { className: "w-8 h-8" }) : 
                          <Laptop className="w-8 h-8" />
                    }
                 </div>
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight text-indigo-500">{ip}</h1>
                    <div className="flex items-center gap-3 mt-2">
                       <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {profile?.role || 'Host Cliente'}
                       </span>
                       <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                       <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Última Atividade: {profile?.ultima_atividade ? new Date(profile.ultima_atividade).toLocaleString() : 'Desconhecida'}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className={`px-4 py-3 rounded-xl border flex flex-col justify-center items-center ${isDark ? "bg-slate-900/50 border-slate-800/80" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Tráfego Total</span>
                    <span className="text-lg font-bold">{formatBytes(profile?.volume_bytes)}</span>
                 </div>
              </div>
           </div>

           {/* Main Tabs */}
           <div className="flex items-center gap-6 mt-4">
             <button 
               onClick={() => setMainTab('perfil')}
               className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${mainTab === 'perfil' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}`}
             >
               <FileText className="w-4 h-4" />
               Perfil
             </button>
             <button 
               onClick={() => setMainTab('timeline')}
               className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${mainTab === 'timeline' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}`}
             >
               <LineChartIcon className="w-4 h-4" />
               Timeline
             </button>
             <button 
               onClick={() => setMainTab('servicos')}
               className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${mainTab === 'servicos' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}`}
             >
               <Server className="w-4 h-4" />
               Serviços Analíticos
             </button>
           </div>
        </div>

        <div className="p-8 flex-1">
          {mainTab === 'timeline' ? (
             <HostTimeline ip={ip} isDark={isDark} />
          ) : mainTab === 'servicos' ? (
             <div className="max-w-7xl mx-auto w-full flex flex-col gap-10">
                <section>
                   <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-l-4 border-indigo-500 pl-3">Serviços Expostos (Servidor)</h2>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                         {servicesData?.hosted?.length || 0} portas ativas
                      </span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {servicesData?.hosted?.map((s: any, i: number) => (
                         <div key={i} className="bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-cyan-400/50 transition-colors flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.isEphemeral ? 'bg-amber-500/50' : 'bg-cyan-500/50'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-2">
                               <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                     <div className="w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-slate-400">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                     </div>
                                     <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1">
                                        {s.servico}
                                        {s.is_custom_named && (
                                          <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1 py-0.5 rounded ml-1" title="Nome personalizado">★</span>
                                        )}
                                     </span>
                                     <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">:{s.porta}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 flex-wrap pl-7">
                                     {s.tcpStatus === 'VALIDATED' && (
                                       <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1" title="Conexão TCP completou o handshake (SYN+ACK)">
                                         <ShieldCheck className="w-3 h-3" /> VALIDADO
                                       </span>
                                     )}
                                     <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">{s.proto}</span>
                                     <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${s.risco === 'ALTO' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50'}`}>{s.risco}</span>
                                  </div>
                               </div>
                            </div>
          
                            <div className="flex justify-between items-end pl-2 mt-4">
                               <div className="font-mono text-[10px] text-slate-500 dark:text-slate-500">
                                  Último tráfego: {new Date(s.last_seen).toLocaleString()}
                               </div>
                               <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                                  {parseInt(s.flows).toLocaleString()} flows <span className="font-medium text-slate-600 dark:text-slate-300">{(s.volume_bytes / 1024 / 1024).toFixed(1)} MB</span>
                               </div>
                            </div>
                         </div>
                      ))}
                      {(!servicesData?.hosted || servicesData.hosted.length === 0) && (
                         <div className="col-span-full py-12 text-center text-slate-500">Nenhum serviço exposto detectado neste host.</div>
                      )}
                   </div>
                </section>

                <section>
                   <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-l-4 border-amber-500 pl-3">Principais Serviços Consumidos (Cliente)</h2>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {servicesData?.consumed?.map((s: any, i: number) => (
                         <div key={i} className="bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-amber-400/50 transition-colors flex flex-col justify-between min-h-[120px] relative">
                            <div className="flex justify-between items-start mb-3">
                               <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                     <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1">
                                        {s.servico}
                                        {s.is_custom_named && (
                                          <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1 py-0.5 rounded ml-1" title="Nome personalizado">★</span>
                                        )}
                                     </span>
                                     <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">:{s.porta}</span>
                                  </div>
                                  <div className="font-mono text-sm text-blue-600 dark:text-blue-400 font-medium">
                                     {s.target_ip}
                                  </div>
                               </div>
                            </div>
          
                            <div className="flex justify-between items-end mt-2">
                               <div className="font-mono text-[10px] text-slate-500 dark:text-slate-500">
                                  Última conexão: {new Date(s.last_seen).toLocaleString()}
                               </div>
                               <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                                  {parseInt(s.flows).toLocaleString()} flows <span className="font-medium text-slate-600 dark:text-slate-300">{(s.volume_bytes / 1024 / 1024).toFixed(1)} MB</span>
                               </div>
                            </div>
                         </div>
                      ))}
                      {(!servicesData?.consumed || servicesData.consumed.length === 0) && (
                         <div className="col-span-full py-12 text-center text-slate-500">Nenhum consumo de serviço registrado.</div>
                      )}
                   </div>
                </section>
             </div>
          ) : (
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">
           
           {/* NDR Summary Banner */}
           <div className={`rounded-2xl p-6 border flex gap-6 items-start ${
              summary.status === 'critico' ? (isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200") :
              summary.status === 'suspeito' ? (isDark ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50 border-orange-200") :
              summary.status === 'atencao' ? (isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200") :
              (isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")
           }`}>
              <div className={`p-3 rounded-xl ${
                 summary.status === 'critico' ? "bg-red-500 text-white" :
                 summary.status === 'suspeito' ? "bg-orange-500 text-white" :
                 summary.status === 'atencao' ? "bg-blue-500 text-white" :
                 "bg-emerald-500 text-white"
              }`}>
                 {summary.status === 'normal' ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
              </div>
              <div className="flex-1">
                 <h2 className={`text-xl font-bold mb-2 ${
                    summary.status === 'critico' ? (isDark ? "text-red-400" : "text-red-700") :
                    summary.status === 'suspeito' ? (isDark ? "text-orange-400" : "text-orange-700") :
                    summary.status === 'atencao' ? (isDark ? "text-blue-400" : "text-blue-700") :
                    (isDark ? "text-emerald-400" : "text-emerald-700")
                 }`}>
                    Veredito: {summary.status.toUpperCase()}
                 </h2>
                 <p className={`font-medium mb-4 ${isDark ? "text-slate-300" : "text-slate-800"}`}>{summary.descricao}</p>
                 <ul className={`space-y-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {summary.motivos.map((m: string, i: number) => (
                       <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-50 shrink-0"></span>
                          {m}
                       </li>
                    ))}
                 </ul>
              </div>
           </div>

           {/* Peers Section */}
           <div>
              <div className="flex items-center gap-6 mb-6 border-b border-slate-200 dark:border-slate-800">
                 <button 
                    onClick={() => setActiveTab('external')}
                    className={`pb-4 font-medium transition-colors border-b-2 px-2 ${activeTab === 'external' ? "border-indigo-500 text-indigo-500" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                 >
                    <Globe className="w-4 h-4 inline-block mr-2 mb-0.5" /> Comunicação Externa (WAN)
                 </button>
                 <button 
                    onClick={() => setActiveTab('internal')}
                    className={`pb-4 font-medium transition-colors border-b-2 px-2 ${activeTab === 'internal' ? "border-indigo-500 text-indigo-500" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                 >
                    <Monitor className="w-4 h-4 inline-block mr-2 mb-0.5" /> Comunicação Interna (LAN)
                 </button>
              </div>

              <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900/40 border-slate-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-500 border-b border-slate-200"}`}>
                          <th className="px-6 py-4">Destino (Peer)</th>
                          <th className="px-6 py-4">Localidade</th>
                          <th className="px-6 py-4">Porta Principal</th>
                          <th className="px-6 py-4">Volume</th>
                          <th className="px-6 py-4">Risco (Score)</th>
                       </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-slate-800/50" : "divide-slate-100"}`}>
                       {(activeTab === 'external' ? externalPeers : internalPeers).length === 0 && (
                          <tr>
                             <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                Nenhum tráfego {activeTab === 'external' ? 'externo' : 'interno'} registrado para este host.
                             </td>
                          </tr>
                       )}
                       {(activeTab === 'external' ? externalPeers : internalPeers).map((peer: any, idx: number) => (
                          <tr key={idx} className={`group hover:bg-black/5 ${isDark ? "hover:bg-slate-800/30" : ""}`}>
                             <td className="py-4 px-6 font-mono text-sm">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setWhoisIp(peer.peer)} 
                                    className={`font-semibold hover:underline text-left flex items-center gap-1.5 ${isDark ? "text-slate-300 hover:text-indigo-400" : "text-slate-700 hover:text-indigo-600"} transition-colors`}
                                  >
                                    {peer.peer}
                                    <Info className="w-3 h-3 opacity-50" />
                                  </button>
                                  {peer.tag && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                      {peer.tag}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{peer.flows.toLocaleString()} fluxos</div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{peer.country}</span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-medium ${
                                   isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                                }`}>
                                   :{peer.top_port}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{formatBytes(peer.bytes)}</span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                   <div className={`flex-1 h-1.5 w-16 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                                      <div 
                                         className={`h-full rounded-full ${
                                            peer.level === 'critico' ? "bg-red-500" :
                                            peer.level === 'suspeito' ? "bg-orange-500" :
                                            peer.level === 'atencao' ? "bg-blue-500" : "bg-emerald-500"
                                         }`}
                                         style={{ width: `${Math.max(5, peer.score)}%` }}
                                      />
                                   </div>
                                   <span className={`text-xs font-bold ${
                                      peer.level === 'critico' ? "text-red-500" :
                                      peer.level === 'suspeito' ? "text-orange-500" :
                                      peer.level === 'atencao' ? "text-blue-500" : "text-emerald-500"
                                   }`}>{peer.score}/100</span>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

            </div>
          )}
        </div>
      </main>

      {/* WHOIS Modal */}
      <WhoisModal 
        isOpen={!!whoisIp} 
        onClose={() => setWhoisIp(null)} 
        ip={whoisIp} 
        isDark={isDark} 
      />
    </div>
  );
}
