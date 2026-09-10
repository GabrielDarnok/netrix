"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Sidebar from "@/components/Sidebar";
import FinalizeAlertModal from '@/components/FinalizeAlertModal';
import WhoisModal from '@/components/WhoisModal';
import { Activity, ShieldAlert, Database, Server, ArrowUpRight, Cpu } from 'lucide-react';

interface Metrics {
  networkHealth: number;
  hostsEmRisco: number;
  volumePretty: string;
  totalBytes: number;
  totalPackets: number;
  pps: number;
  alertas: Record<string, number>;
  totalHosts: number;
}

interface VolumeData { time: string; bytes: number; packets: number; pps: number; }
interface TopHostData { ip: string; bytes: number; }

export default function DashboardUI({
  user, metrics, threatData, egressData, activeServices = [], clients, networks, selectedClientId, availableSubnets, selectedSubnet, selectedRange,
  volumeData = [], topHosts = []
}: {
  user: any, metrics: Metrics, threatData: any, egressData: any, activeServices: any[], clients: any[], networks: any[], selectedClientId: number | null, availableSubnets: string[], selectedSubnet: string | null, selectedRange: string,
  volumeData?: VolumeData[], topHosts?: TopHostData[]
}) {
  const [isDark, setIsDark] = useState(true);
  const [finalizeIp, setFinalizeIp] = useState<string | null>(null);
  const [whoisIp, setWhoisIp] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved !== null) {
      setIsDark(saved === 'dark');
    }
  }, []);

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

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", val);
    router.push(`/dashboard?${params.toString()}`);
  };

  let networkLabel = selectedSubnet ? `Monitorando ${selectedSubnet}` : "Visão Geral";
  if (selectedClientId && availableSubnets.length === 0) {
    networkLabel = "Sem Redes Atribuídas";
  }

  const allAnomalies = [
    ...(egressData?.anomalias || []).map((a: any) => ({
      ip_src: a.host_src,
      ip_dst: a.destinos?.[0] || 'Vários',
      classificacao: a.tipo === 'flag_anomala' ? 'Anomalia TCP' : (a.tipo === 'volume' ? 'Volume Anormal' : 'Scanner'),
      severidade: a.severidade.toLowerCase(),
      descricao: a.descricao
    })),
    ...(threatData?.threats || []).map((t: any) => ({
      ip_src: t.ip_src,
      ip_dst: t.ip_dst,
      classificacao: t.intel_nome || 'Malware/C2',
      severidade: t.severidade.toLowerCase(),
      descricao: 'Comunicação maliciosa confirmada'
    }))
  ];

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

      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        <div className="w-full flex justify-end items-center gap-5 px-8 pt-6">
          <div className="px-4 py-2 bg-white dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-2.5 shadow-sm dark:shadow-[0_0_10px_rgba(8,145,178,0.1)]">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4] dark:shadow-[0_0_8px_#22d3ee] flex-shrink-0"></span>
            <span className="truncate">{networkLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider">Período:</span>
            <select
              value={selectedRange}
              onChange={handleRangeChange}
              className="bg-white dark:bg-[#0a1128] border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-cyan-50 focus:outline-none focus:border-cyan-400 transition-colors shadow-sm cursor-pointer"
            >
              <option value="24 hours">Últimas 24 Horas</option>
              <option value="7 days">Últimos 7 Dias</option>
              <option value="30 days">Últimos 30 Dias</option>
            </select>
          </div>
        </div>

        <main className="p-8 pt-4 w-full max-w-7xl mx-auto space-y-6 flex-1">
          {/* KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 p-5 rounded-xl flex flex-col gap-1 relative overflow-hidden group shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-2 z-10 text-slate-500 dark:text-slate-400">
                <Activity className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium">Saúde da Rede</span>
              </div>
              <div className="flex items-end gap-2 z-10">
                <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{metrics.networkHealth}/100</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 p-5 rounded-xl flex flex-col gap-1 relative overflow-hidden group shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-2 z-10 text-slate-500 dark:text-slate-400">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Tráfego (PPS)</span>
              </div>
              <div className="flex items-end gap-2 z-10">
                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400 dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">{metrics.pps}</span>
                <span className="text-xs font-mono text-slate-400 pb-1">/s</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 p-5 rounded-xl flex flex-col gap-1 relative overflow-hidden group shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-2 z-10 text-slate-500 dark:text-slate-400">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Volume Total</span>
              </div>
              <div className="flex items-end gap-2 z-10">
                <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{metrics.volumePretty}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 p-5 rounded-xl flex flex-col gap-1 relative overflow-hidden group shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-2 z-10 text-slate-500 dark:text-slate-400">
                <Server className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">Total de Hosts</span>
              </div>
              <div className="flex items-end gap-2 z-10">
                <span className="text-3xl font-bold text-slate-700 dark:text-slate-300">{metrics.totalHosts}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* CHART AREA (Span 2) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#0a1128]/60 border border-slate-200 dark:border-cyan-900/40 rounded-xl p-5 flex flex-col shadow-sm transition-colors duration-300 min-h-[350px]">
              <div className="mb-4">
                <h2 className="font-semibold text-lg text-slate-800 dark:text-cyan-50">Volume vs Pacotes por Segundo (PPS)</h2>
              </div>
              <div className="flex-1 w-full h-full min-w-0 min-h-0 relative">
                {volumeData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 dark:text-cyan-600/70">Sem dados nas últimas 24h</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBytes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPackets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#164e63" : "#e2e8f0"} opacity={0.4} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? "#4b5563" : "#94a3b8" }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? "#06b6d4" : "#0891b2" }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? "#a855f7" : "#9333ea" }} tickFormatter={(val) => `${val}`} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: isDark ? '#101930' : '#ffffff', borderColor: isDark ? '#164e63' : '#e2e8f0', borderRadius: '8px' }}
                        formatter={(val: any, name: any) => name === 'Volume' ? [`${(val / 1000000).toFixed(2)} MB`, name] : [`${val} pps`, name]}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="bytes" name="Volume" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorBytes)" />
                      <Area yAxisId="right" type="monotone" dataKey="pps" name="PPS" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorPackets)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* REAL-TIME THREATS (Span 1) */}
            <div className="bg-white dark:bg-[#0a1128]/60 border border-slate-200 dark:border-cyan-900/40 rounded-xl overflow-hidden flex flex-col shadow-sm transition-colors duration-300">
              <div className="p-4 border-b border-slate-200 dark:border-cyan-900/40 flex justify-between items-center bg-slate-50 dark:bg-cyan-950/10">
                <h2 className="font-semibold text-[15px] flex items-center gap-2 text-slate-800 dark:text-cyan-50">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.4)] dark:shadow-[0_0_5px_#ef4444]"></span>
                  Ameaças em Tempo Real
                </h2>
              </div>
              <div className="p-0 overflow-y-auto max-h-[350px]">
                {allAnomalies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-500 dark:text-cyan-600/70">
                    <ShieldAlert className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm">Nenhuma ameaça ou anomalia detectada no momento.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-cyan-900/30">
                    {allAnomalies.slice(0, 5).map((a, idx) => (
                      <li key={idx} className="p-4 hover:bg-slate-50/80 dark:hover:bg-cyan-950/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <button onClick={() => setWhoisIp(a.ip_src)} className="font-mono text-sm font-bold text-slate-700 dark:text-cyan-100 hover:text-cyan-600 dark:hover:text-cyan-300 hover:underline flex items-center gap-1">
                            {a.ip_src} <ArrowUpRight className="w-3 h-3 opacity-50" />
                          </button>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border tracking-wide uppercase ${
                            a.severidade === 'crítico' || a.severidade === 'critico'
                              ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                              : 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
                          }`}>
                            {a.severidade}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-1">{a.classificacao}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{a.descricao}</div>
                        <div className="mt-3 flex justify-end">
                          <Link href={`/dashboard/hosts/${a.ip_src}`} className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
                            Investigar &rarr;
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* SERVIÇOS HOSPEDADOS (Span 2) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#0a1128]/60 border border-slate-200 dark:border-cyan-900/40 rounded-xl overflow-hidden flex flex-col shadow-sm transition-colors duration-300">
              <div className="p-5 border-b border-slate-200 dark:border-cyan-900/40 flex justify-between items-center bg-slate-50 dark:bg-cyan-950/10 transition-colors">
                <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-800 dark:text-cyan-50">
                  Principais Serviços Hospedados
                </h2>
                <Link href="/dashboard/services" className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors">Gerenciar Serviços &rarr;</Link>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-[#070d1e] text-slate-500 dark:text-cyan-600/70 uppercase text-[10px] tracking-wider font-semibold transition-colors">
                    <tr>
                      <th className="px-5 py-4">Serviço</th>
                      <th className="px-5 py-4">IP Interno</th>
                      <th className="px-5 py-4">Porta</th>
                      <th className="px-5 py-4 text-right">Volume / Conexões</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/30">
                    {activeServices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-cyan-600/70">
                          Nenhum serviço detectado no momento.
                        </td>
                      </tr>
                    ) : (
                      activeServices.slice(0, 5).map((s, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-cyan-950/30 transition-colors">
                          <td className="px-5 py-4 text-slate-700 dark:text-cyan-100 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              {s.servico}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400">{s.ip}</td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-mono">
                            {s.porta}/{s.proto}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-slate-700 dark:text-cyan-300 font-medium">{s.flows} conexões</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOP 5 HOSTS (Span 1) */}
            <div className="lg:col-span-1 bg-white dark:bg-[#0a1128]/60 border border-slate-200 dark:border-cyan-900/40 rounded-xl p-5 flex flex-col shadow-sm transition-colors duration-300 min-h-[300px]">
              <div className="mb-4">
                <h2 className="font-semibold text-lg text-slate-800 dark:text-cyan-50">Top 5 Hosts por Volume</h2>
              </div>
              <div className="flex-1 w-full h-[220px] min-w-0 min-h-0 relative">
                {topHosts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 dark:text-cyan-600/70">Nenhum host encontrado</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={topHosts} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#164e63" : "#e2e8f0"} opacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="ip" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }} width={80} />
                      <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: isDark ? '#101930' : '#ffffff', borderColor: isDark ? '#164e63' : '#e2e8f0', borderRadius: '8px' }}
                        formatter={(val: any) => [`${(Number(val) / 1000000).toFixed(2)} MB`, 'Tráfego Total']}
                      />
                      <Bar dataKey="bytes" radius={[0, 4, 4, 0]} barSize={16}>
                        {topHosts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7'][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      <FinalizeAlertModal 
        isOpen={!!finalizeIp} 
        onClose={() => setFinalizeIp(null)} 
        ip={finalizeIp!} 
        isDark={isDark} 
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <WhoisModal
        isOpen={!!whoisIp}
        onClose={() => setWhoisIp(null)}
        ip={whoisIp!}
        isDark={isDark}
      />
    </div>
  );
}
