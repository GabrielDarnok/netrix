"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Sidebar from "@/components/Sidebar";
import { PROTOCOL_MAP } from '@/lib/utils/network';

const parseTcpFlags = (flags: number) => {
  if (!flags) return "-";
  const parsed = [];
  if (flags & 1) parsed.push("FIN");
  if (flags & 2) parsed.push("SYN");
  if (flags & 4) parsed.push("RST");
  if (flags & 8) parsed.push("PSH");
  if (flags & 16) parsed.push("ACK");
  if (flags & 32) parsed.push("URG");
  return parsed.length > 0 ? parsed.join(" | ") : "-";
};

export default function ExplorerUI({
  user, isDark: initialIsDark, clients, networks, selectedClientId, availableSubnets, selectedSubnet, initialFilters, initialData
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDark, setIsDark] = useState(initialIsDark);

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

  // Filter State
  const [ip, setIp] = useState(initialFilters.ip || "");
  const [port, setPort] = useState(initialFilters.port || "");
  const [proto, setProto] = useState(initialFilters.proto || "all");
  const [direction, setDirection] = useState(initialFilters.direction || "all");
  const [range, setRange] = useState(initialFilters.range || "24h");
  const [asn, setAsn] = useState(initialFilters.asn || "");
  const [tcpFlags, setTcpFlags] = useState<string[]>(initialFilters.tcpFlags || []);

  const [activeTab, setActiveTab] = useState("timeseries");

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  // Auto-Apply Filters
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      let changed = false;

      const checkAndSet = (key: string, val: string, defVal: string = "") => {
        const current = params.get(key) || defVal;
        if (val && val !== "all") {
          if (current !== val) { params.set(key, val); changed = true; }
        } else {
          if (params.has(key)) { params.delete(key); changed = true; }
        }
      };

      checkAndSet("ip", ip);
      checkAndSet("port", port);
      checkAndSet("proto", proto, "all");
      checkAndSet("direction", direction, "all");
      checkAndSet("range", range, "24h");
      checkAndSet("asn", asn);
      checkAndSet("tcpFlags", tcpFlags.join(","));

      if (changed) {
        params.set("page", "1");
        router.push(`/dashboard/explorer?${params.toString()}`);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [ip, port, proto, direction, range, asn, tcpFlags, searchParams, router]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subnet");
    params.set("client", val);
    router.push(`/dashboard/explorer?${params.toString()}`);
  };

  const handleSubnetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") params.delete("subnet");
    else params.set("subnet", val);
    router.push(`/dashboard/explorer?${params.toString()}`);
  };

  const toggleFlag = (flag: string) => {
    if (tcpFlags.includes(flag)) {
      setTcpFlags(tcpFlags.filter(f => f !== flag));
    } else {
      setTcpFlags([...tcpFlags, flag]);
    }
  };

  const handleApply = () => {
    // Left empty since useEffect auto-applies now. 
    // This just forces a refresh if needed.
  };

  const handleClear = () => {
    setIp(""); setPort(""); setProto("all"); setDirection("all"); setRange("24h"); setAsn(""); setTcpFlags([]);
    const params = new URLSearchParams();
    if (selectedClientId) params.set("client", selectedClientId.toString());
    if (selectedSubnet) params.set("subnet", selectedSubnet);
    router.push(`/dashboard/explorer?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/explorer?${params.toString()}`);
  };

  let networkLabel = selectedSubnet ? `Monitorando ${selectedSubnet}` : "Visão Geral";
  if (selectedClientId && availableSubnets.length === 0) networkLabel = "Sem Redes Atribuídas";

  const { timeseries = [], top_talkers = { src: [], dst: [] }, rows = [], metrics = {}, total_rows = 0, page = 1, per_page = 50, error } = initialData || {};

  const totalPages = Math.ceil(total_rows / per_page);

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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        <div className="w-full flex justify-between items-center px-8 pt-6">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">Traffic Explorer</h1>
          <div className="px-4 py-2 bg-white dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-2.5 shadow-sm dark:shadow-[0_0_10px_rgba(8,145,178,0.1)]">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4] dark:shadow-[0_0_8px_#22d3ee] flex-shrink-0"></span>
            <span className="truncate">{networkLabel}</span>
          </div>
        </div>

        <main className="p-8 w-full max-w-7xl mx-auto space-y-6 flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erro! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* QUERY BUILDER */}
          <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 p-6 rounded-xl shadow-sm dark:shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"></div>
            <h2 className="text-xs text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-4">Filtros de Consulta</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-5 relative z-10">
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">IP / CIDR</label>
                <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="ex: 192.168.1.100" className="w-full bg-slate-50 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400 placeholder-slate-400 dark:placeholder-cyan-800" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">Porta</label>
                <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="ex: 443" className="w-full bg-slate-50 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400 placeholder-slate-400 dark:placeholder-cyan-800" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">ASN / Provider</label>
                <input type="text" value={asn} onChange={e => setAsn(e.target.value)} placeholder="ex: Cloudflare" className="w-full bg-slate-50 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400 placeholder-slate-400 dark:placeholder-cyan-800" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">Protocolo</label>
                <select value={proto} onChange={e => setProto(e.target.value)} className="w-full bg-slate-50 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400">
                  <option value="all">Todos</option>
                  {Object.entries(PROTOCOL_MAP).map(([num, name]) => (
                    <option key={num} value={num}>{name} ({num})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">Direção</label>
                <select value={direction} onChange={e => setDirection(e.target.value)} className="w-full bg-slate-50 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400">
                  <option value="all">Todas</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">Período</label>
                <select value={range} onChange={e => setRange(e.target.value)} className="w-full bg-slate-50 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400">
                  <option value="1h">Última Hora</option>
                  <option value="6h">Últimas 6 Horas</option>
                  <option value="24h">Últimas 24 Horas</option>
                  <option value="7d">Últimos 7 Dias</option>
                  <option value="30d">Últimos 30 Dias</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-slate-500 dark:text-cyan-600/80 uppercase font-bold tracking-wider">Flags TCP:</span>
                <div className="flex gap-2">
                  {["SYN", "ACK", "FIN", "RST", "PSH"].map(f => (
                    <button
                      key={f}
                      onClick={() => toggleFlag(f)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${tcpFlags.includes(f) ? "bg-cyan-600 dark:bg-cyan-500 text-white dark:text-[#050914] font-bold shadow-sm dark:shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "bg-slate-100 dark:bg-cyan-950/50 border border-slate-200 dark:border-cyan-900/50 text-slate-600 dark:text-cyan-500 hover:border-slate-300 dark:hover:border-cyan-400/50"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleClear} className="px-5 py-2 rounded-md border border-slate-300 dark:border-cyan-800/50 text-slate-600 dark:text-cyan-500 text-sm hover:bg-slate-100 dark:hover:bg-cyan-950/50 transition-colors">
                  Limpar Todos
                </button>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 border-b border-slate-200 dark:border-cyan-900/40">
            {[
              { id: "timeseries", label: "Time Series", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
              { id: "toptalkers", label: "Top Talkers", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
              { id: "table", label: "Tabela", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
              { id: "metrics", label: "Métricas", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? "border-cyan-500 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-200 hover:border-slate-300 dark:hover:border-cyan-800"}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="bg-white dark:bg-[#0a1128]/60 border border-slate-200 dark:border-cyan-900/30 p-6 rounded-xl shadow-sm dark:shadow-none min-h-[400px]">
            {activeTab === "timeseries" && (
              <div className="h-[400px] w-full flex-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-cyan-100 mb-4">Volume ao Longo do Tempo</h3>
                {timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={timeseries}>
                      <defs>
                        <linearGradient id="colorBytes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="timestamp" stroke="#475569" fontSize={12} tickFormatter={v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                      <YAxis stroke="#475569" fontSize={12} tickFormatter={v => (v / 1024 / 1024).toFixed(1) + 'MB'} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                        labelFormatter={v => new Date(v).toLocaleString()}
                        formatter={(val: any) => [(Number(val) / 1024 / 1024).toFixed(2) + ' MB', 'Volume']}
                      />
                      <Area type="monotone" dataKey="bytes" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorBytes)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">Nenhum dado encontrado para os filtros selecionados.</div>
                )}
              </div>
            )}

            {activeTab === "toptalkers" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-cyan-100 mb-4">Maiores Emissores (Source)</h3>
                  <div className="space-y-2">
                    {top_talkers.src.map((t: any, i: number) => (
                      <div key={i} className="bg-slate-50 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-900/30 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-mono text-cyan-600 dark:text-cyan-300 text-sm">{t.ip}</span>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Portas: {t.port_names.join(", ")}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-700 dark:text-cyan-100 font-bold">{(t.bytes / 1024 / 1024).toFixed(2)} MB</div>
                          <div className="text-[10px] text-slate-500">{t.flows} fluxos</div>
                        </div>
                      </div>
                    ))}
                    {top_talkers.src.length === 0 && <p className="text-slate-500 text-sm">Sem dados</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-cyan-100 mb-4">Maiores Receptores (Destination)</h3>
                  <div className="space-y-2">
                    {top_talkers.dst.map((t: any, i: number) => (
                      <div key={i} className="bg-slate-50 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-900/30 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-mono text-cyan-600 dark:text-cyan-300 text-sm">{t.ip}</span>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Portas: {t.port_names.join(", ")}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-700 dark:text-cyan-100 font-bold">{(t.bytes / 1024 / 1024).toFixed(2)} MB</div>
                          <div className="text-[10px] text-slate-500">{t.flows} fluxos</div>
                        </div>
                      </div>
                    ))}
                    {top_talkers.dst.length === 0 && <p className="text-slate-500 text-sm">Sem dados</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-cyan-900/50 text-xs text-cyan-700 dark:text-cyan-600 uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Timestamp</th>
                      <th className="py-3 px-4 font-semibold">Origem</th>
                      <th className="py-3 px-4 font-semibold">Destino</th>
                      <th className="py-3 px-4 font-semibold">Proto</th>
                      <th className="py-3 px-4 font-semibold text-right">Bytes</th>
                      <th className="py-3 px-4 font-semibold text-center">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-700 dark:text-slate-300">
                    {rows.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-cyan-900/20 hover:bg-slate-50 dark:hover:bg-cyan-950/30 transition-colors">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(r.stamp_inserted).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono text-cyan-700 dark:text-cyan-200">{r.ip_src}:{r.port_src}</td>
                        <td className="py-3 px-4 font-mono text-cyan-700 dark:text-cyan-200">{r.ip_dst}:{r.port_dst}</td>
                        <td className="py-3 px-4">{PROTOCOL_MAP[r.ip_proto] || r.ip_proto}</td>
                        <td className="py-3 px-4 text-right">{(r.bytes / 1024).toFixed(1)} KB</td>
                        <td className="py-3 px-4 text-center font-mono text-[10px] text-amber-600 dark:text-yellow-500">{parseTcpFlags(r.tcp_flags)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="text-center py-8 text-slate-500">Nenhum fluxo encontrado</p>}

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 text-sm text-slate-500 dark:text-slate-400">
                    <div>Página {page} de {totalPages}</div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 bg-slate-100 dark:bg-cyan-950/50 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-cyan-900/80 disabled:opacity-50">Anterior</button>
                      <button onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1 bg-slate-100 dark:bg-cyan-950/50 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-cyan-900/80 disabled:opacity-50">Próxima</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "metrics" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-900/30 p-5 rounded-lg text-center">
                  <div className="text-xs text-cyan-700 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-2">Total de Bytes</div>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{(metrics.bytes / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div className="bg-slate-50 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-900/30 p-5 rounded-lg text-center">
                  <div className="text-xs text-cyan-700 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-2">Total de Fluxos</div>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{metrics.flows.toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-900/30 p-5 rounded-lg text-center">
                  <div className="text-xs text-cyan-700 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-2">Origens Únicas</div>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{metrics.unique_src.toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-900/30 p-5 rounded-lg text-center">
                  <div className="text-xs text-cyan-700 dark:text-cyan-600/80 uppercase font-bold tracking-wider mb-2">Portas Destino Únicas</div>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{metrics.unique_dst_ports.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
