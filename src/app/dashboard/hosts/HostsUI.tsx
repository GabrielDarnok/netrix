'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import { Search, Server, Activity, ShieldAlert, ShieldCheck, Filter, ArrowUpRight, Globe, Key, BookOpen, Folder, Mail, Database, Users, File, MonitorPlay, Clock, Plug, FileText, Inbox, Phone, Lock, Zap, Shield, Network, Radio, LineChart, Box, AlertTriangle, MessageSquare, Skull, Settings, Laptop } from 'lucide-react';

const IconMap: Record<string, React.ElementType> = {
  Globe, Key, BookOpen, Folder, Mail, Database, Users, File, MonitorPlay, Clock, Plug, Activity, FileText, Inbox, Phone, Lock, Zap, Shield, Network, Radio, LineChart, Box, AlertTriangle, MessageSquare, Skull, Settings, Laptop
};

interface HostsUIProps {
  user: any;
  isDark: boolean;
  networks: any[];
  selectedClientId: number | null;
  selectedSubnet: string | null;
  hostsData: any[];
  errorMsg: string | null;
}

export default function HostsUI({
  user,
  isDark: initialIsDark,
  networks,
  selectedClientId,
  selectedSubnet,
  hostsData,
  errorMsg
}: HostsUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDark, setIsDark] = useState(initialIsDark);

  // Initialize from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved !== null) {
      setIsDark(saved === 'dark');
    }
  }, []);

  // Apply dark class to body and save to local storage
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

  const filteredHosts = useMemo(() => {
    return hostsData.filter((h: any) => {
      const matchIp = h.ip.includes(searchTerm);
      const matchRole = h.papel_interno[0]?.role.toLowerCase().includes(searchTerm.toLowerCase());
      return matchIp || matchRole;
    });
  }, [hostsData, searchTerm]);

  // Encontra o max volume para a barra de progresso visual
  const maxVolume = useMemo(() => {
    if (!hostsData || hostsData.length === 0) return 1;
    return Math.max(...hostsData.map((h: any) => h.volume_bytes || 0));
  }, [hostsData]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clients = Array.from(new Set(networks.map(n => JSON.stringify({ id: n.client_id, name: n.cliente }))))
    .map(str => JSON.parse(str));
  const activeClient = clients.find(c => c.id === selectedClientId);

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

      <main className="flex-1 flex flex-col h-screen overflow-hidden ml-72">
        {/* Header Section */}
        <header className={`flex-none px-8 py-6 border-b ${isDark ? "border-slate-800/50 bg-[#0A0F1C]/80" : "border-slate-200 bg-white/80"} backdrop-blur-xl flex items-center justify-between z-10`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${isDark ? "from-indigo-500/20 to-purple-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]" : "from-indigo-500/10 to-purple-500/10"}`}>
              <Server className={`w-6 h-6 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inventário de Hosts</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {activeClient ? activeClient.name : "Nenhum Cliente Selecionado"}
                </span>
                {selectedSubnet && (
                  <>
                    <span className={`w-1 h-1 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`}></span>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${isDark ? "bg-slate-800/80 text-slate-300" : "bg-slate-200 text-slate-600"}`}>
                      {selectedSubnet}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none`}>
                  <Search className={`h-4 w-4 ${isDark ? "text-slate-500 group-focus-within:text-indigo-400" : "text-slate-400 group-focus-within:text-indigo-500"} transition-colors`} />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar IP ou Função..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-64 pl-10 pr-4 py-2 rounded-xl text-sm transition-all duration-300 focus:w-80 outline-none ring-1 ${
                    isDark 
                      ? "bg-slate-900/50 border-transparent ring-slate-800 focus:ring-indigo-500/50 text-white placeholder-slate-500" 
                      : "bg-white border-transparent ring-slate-200 focus:ring-indigo-500/30 text-slate-900 placeholder-slate-400 shadow-sm"
                  }`}
                />
             </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {errorMsg && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
              <ShieldAlert className="w-5 h-5" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          {!selectedClientId ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? "bg-slate-800/50" : "bg-slate-200"}`}>
                <Server className={`w-10 h-10 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Selecione um Cliente</h3>
              <p className={`max-w-md ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Utilize o painel principal do Dashboard para selecionar um cliente e carregar o inventário comportamental.
              </p>
            </div>
          ) : hostsData.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? "bg-slate-800/50" : "bg-slate-200"}`}>
                <Activity className={`w-10 h-10 ${isDark ? "text-slate-600" : "text-slate-400"}`} />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>Nenhum Host Encontrado</h3>
              <p className={`max-w-md ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Não identificamos nenhum equipamento ativo nessa rede no momento.
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900/40 border-slate-800/60 backdrop-blur-sm" : "bg-white border-slate-200 shadow-sm"}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-500 border-b border-slate-200"}`}>
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4">Papel Interno</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 w-1/4">Volume Trafegado</th>
                    <th className="px-6 py-4">Serviços Expostos</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800/50" : "divide-slate-100"}`}>
                  {filteredHosts.map((host: any, idx: number) => {
                    const role = host.papel_interno[0];
                    const risk = host.nivel_alerta || 'normal';
                    const volumePct = Math.max(2, (host.volume_bytes / maxVolume) * 100);

                    // Constroi a string query para repassar parametros
                    const qString = `?client=${selectedClientId}${selectedSubnet ? `&subnet=${encodeURIComponent(selectedSubnet)}` : ''}`;

                    const IconComponent = IconMap[role?.icon] || Laptop;

                    return (
                      <tr key={host.ip + idx} className={`group transition-colors hover:bg-black/5 ${isDark ? "hover:bg-slate-800/30" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isDark ? "bg-slate-800 text-indigo-400" : "bg-slate-100 text-indigo-600"}`}>
                               <IconComponent className="w-5 h-5" />
                            </div>
                            <div>
                              <div className={`font-mono font-medium ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>{host.ip}</div>
                              <div className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {host.conexoes_total.toLocaleString()} fluxos
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            {role?.role || 'Host Cliente'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {risk === 'critico' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                              <ShieldAlert className="w-3.5 h-3.5" /> Crítico
                            </span>
                          ) : risk === 'alerta' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <ShieldAlert className="w-3.5 h-3.5" /> Alerta
                            </span>
                          ) : risk === 'atencao' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              <ShieldAlert className="w-3.5 h-3.5" /> Atenção
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <ShieldCheck className="w-3.5 h-3.5" /> Normal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className={`${isDark ? "text-slate-400" : "text-slate-500"} font-medium`}>{formatBytes(host.volume_bytes)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-wrap gap-2">
                             {host.servicos_ativos.slice(0, 3).map((svc: any, i: number) => (
                               <span key={i} className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                                  isDark ? "bg-slate-800/50 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                               }`}>
                                 {svc.nome} ({svc.porta})
                               </span>
                             ))}
                             {host.servicos_ativos.length > 3 && (
                               <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                                  isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                               }`}>
                                 +{host.servicos_ativos.length - 3}
                               </span>
                             )}
                             {host.servicos_ativos.length === 0 && (
                               <span className={`text-[11px] italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>Nenhum</span>
                             )}
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link 
                            href={`/dashboard/hosts/${host.ip}${qString}`}
                            className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${
                              isDark 
                                ? "bg-slate-800 text-indigo-400 hover:bg-indigo-500 hover:text-white" 
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white"
                            }`}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredHosts.length === 0 && (
                 <div className="p-8 text-center text-sm text-slate-500">
                   Nenhum host encontrado com o termo "{searchTerm}".
                 </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
