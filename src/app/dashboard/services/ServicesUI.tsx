"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { AlertTriangle, ShieldCheck, Tag, Server, X } from "lucide-react";
import { renameService, dismissService } from "@/lib/actions/services";
import ClientsModal from "@/components/ClientsModal";

const CarouselSection = ({ title, iconColor, data, renderItem }: any) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const [itemsPerRow, setItemsPerRow] = useState(1);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  
  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        setShowArrows(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
        // Cada card tem 280px + 16px de gap = 296px
        const fits = Math.floor((scrollRef.current.clientWidth + 16) / 296);
        setItemsPerRow(fits > 0 ? fits : 1);
      }
      setIsLargeScreen(window.innerWidth >= 1280); // xl breakpoint
    };
    
    // Check initially and after any layout paint
    setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [data]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  if (!data || data.length === 0) return null;

  // Logica de Divisão das Linhas:
  // Se a tela for menor, ou se tiver poucos itens, usamos 1 linha simples.
  const useSingleRow = !isLargeScreen || data.length <= 3;
  
  // Se formos usar 2 linhas, queremos preencher toda a primeira linha visível ANTES de jogar pra linha de baixo.
  // Mas se houver muitos itens, balanceamos para que o scroll horizontal seja igual nas duas linhas.
  const topRowCount = useSingleRow ? data.length : Math.max(itemsPerRow, Math.ceil(data.length / 2));
  
  const row1Data = data.slice(0, topRowCount);
  const row2Data = data.slice(topRowCount);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-l-2 ${iconColor} pl-3`}>
          {title}
        </h2>
        {showArrows && (
          <div className="flex gap-2">
            <button onClick={() => scroll('left')} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-cyan-500 hover:border-cyan-500 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={() => scroll('right')} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-cyan-500 hover:border-cyan-500 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}
      </div>
      <div 
        ref={scrollRef}
        className="flex flex-col gap-4 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="flex gap-4">
          {row1Data.map((item: any, i: number) => renderItem(item, i))}
        </div>
        {row2Data.length > 0 && (
          <div className="flex gap-4">
            {row2Data.map((item: any, i: number) => renderItem(item, topRowCount + i))}
          </div>
        )}
      </div>
    </section>
  );
};

export default function ServicesUI({ 
  user, 
  isDark: initialIsDark, 
  clients, 
  networks, 
  selectedClientId, 
  availableSubnets, 
  selectedSubnet, 
  initialData 
}: any) {
  const [isDark, setIsDark] = useState(initialIsDark);
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedServiceClients, setSelectedServiceClients] = useState<{name: string, clients: any[]} | null>(null);

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
      document.body.style.backgroundColor = "#050914"; // Deep dark background
      localStorage.setItem('theme', 'dark');
      document.cookie = "theme=dark; path=/; max-age=31536000";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#f8fafc";
      localStorage.setItem('theme', 'light');
      document.cookie = "theme=light; path=/; max-age=31536000";
    }
  }, [isDark]);

  const networkLabel = selectedSubnet ? selectedSubnet : "Global Network";

  const { allServices, dns, ntp, dhcp, gateways, ssh, netflow, email = [] } = initialData;

  // Local State for Customizations
  const [localServices, setLocalServices] = useState(allServices);
  
  useEffect(() => {
    setLocalServices(allServices);
  }, [allServices]);

  const [editingService, setEditingService] = useState<{ip: string, port: number, oldName: string} | null>(null);
  const [newName, setNewName] = useState("");

  const handleDismiss = async (ip: string, port: number) => {
    setLocalServices((prev: any[]) => prev.filter(s => !(s.ip === ip && parseInt(s.porta) === port)));
    try {
      await dismissService(ip, port);
    } catch(e) {
      console.error(e);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    
    setLocalServices((prev: any[]) => prev.map(s => {
      if (s.ip === editingService.ip && parseInt(s.porta) === editingService.port) {
        return { ...s, servico: newName, is_custom_named: true };
      }
      return s;
    }));
    
    const { ip, port } = editingService;
    setEditingService(null);
    try {
      await renameService(ip, port, newName);
    } catch(err) {
      console.error(err);
    }
  };

  // Filter Functions
  const term = globalSearch.toLowerCase();
  
  const filteredAllServices = localServices.filter((s: any) => 
    s.porta?.toString().includes(term) || 
    (s.servico || "").toLowerCase().includes(term) ||
    (s.ip || "").toLowerCase().includes(term)
  );

  const filterIpRole = (list: any[]) => list.filter(item => 
    item.ip?.toLowerCase().includes(term) || 
    item.role?.toLowerCase().includes(term) ||
    item.nome?.toLowerCase().includes(term)
  );

  const filteredDNS = filterIpRole(dns);
  const filteredNTP = filterIpRole(ntp);
  const filteredDHCP = filterIpRole(dhcp);
  const filteredGateways = filterIpRole(gateways);
  const filteredSSH = filterIpRole(ssh);
  const filteredNetflow = filterIpRole(netflow);
  const filteredEmail = filterIpRole(email);

  // Helper functions for badges
  const getRiskColor = (risco: string) => {
    switch (risco) {
      case 'BAIXO': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'MÉDIO': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'ALTO': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const getProtoColor = (proto: string) => {
    switch (proto) {
      case 'TCP': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'UDP': return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      case 'MIX': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${isDark ? "dark bg-[#050914] text-slate-200" : "bg-slate-50 text-slate-800"}`}>
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
        <div className="w-full flex justify-between items-center px-8 pt-6 pb-2">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">Serviços da Rede</h1>
          <div className="px-4 py-2 bg-white dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-800/50 rounded-md text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-2.5 shadow-sm dark:shadow-[0_0_10px_rgba(8,145,178,0.1)]">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4] dark:shadow-[0_0_8px_#22d3ee] flex-shrink-0"></span>
            <span className="truncate">{networkLabel}</span>
          </div>
        </div>

        <main className="p-8 w-full max-w-[1600px] mx-auto space-y-12 flex-1">
          
          {/* GLOBAL SEARCH TOOLBAR */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400 dark:text-cyan-500/50 group-focus-within:text-cyan-500 dark:group-focus-within:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Busca Global de Serviços (IP, Porta, Nome do Serviço)..." 
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 rounded-xl pl-11 pr-4 py-4 text-sm text-slate-800 dark:text-cyan-50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 dark:focus:ring-cyan-400/50 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all placeholder-slate-400 dark:placeholder-cyan-800/70"
            />
          </div>

          {/* DETECTED SERVICES GRID */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-l-2 border-cyan-500 pl-3">Serviços Hospedados na Rede</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAllServices.map((s: any, i: number) => (
                <div key={i} className="bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-cyan-400/50 dark:hover:border-cyan-500/50 transition-colors flex flex-col justify-between min-h-[140px] relative group overflow-hidden">
                  {/* Left Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.is_unmapped ? 'bg-amber-500/50' : 'bg-cyan-500/50'}`}></div>
                  
                  {/* Dismiss Button (Absolute) */}
                  <button 
                    onClick={() => handleDismiss(s.ip, parseInt(s.porta))}
                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg z-10" 
                    title="Ocultar (Dismiss)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex justify-between items-start mb-3 pl-2 pr-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1 cursor-default">
                          {s.servico}
                          {s.is_custom_named && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1 py-0.5 rounded ml-1" title="Nome personalizado">★</span>
                          )}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">:{s.porta}</span>
                        
                        {/* Hover Edit Pencil */}
                        <button 
                          onClick={() => { setEditingService({ ip: s.ip, port: parseInt(s.porta), oldName: s.servico }); setNewName(s.servico); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-cyan-500 transition-all ml-1 p-0.5 rounded"
                          title="Personalizar Nome"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                      </div>
                      
                      {/* Badges Row */}
                      <div className="flex items-center gap-1.5 flex-wrap pl-7">
                        {s.tcpStatus === 'VALIDATED' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1" title="Conexão TCP completou o handshake (SYN+ACK)">
                            <ShieldCheck className="w-3 h-3" /> VALIDADO
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${getProtoColor(s.proto)}`}>{s.proto}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${getRiskColor(s.risco)}`}>{s.risco}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400 pl-2 mt-2">
                    {s.all_clients && s.all_clients.length > 0 ? (
                      <button 
                        onClick={() => setSelectedServiceClients({ name: `${s.servico} em ${s.ip}:${s.porta}`, clients: s.all_clients })}
                        className="text-left hover:text-cyan-500 transition-colors"
                      >
                        <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Hosts:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                      </button>
                    ) : (
                      <div className="line-clamp-1 text-slate-500 italic">Sem comunicação cliente</div>
                    )}
                  </div>

                  <div className="flex justify-between items-end pl-2 mt-2">
                    <div className="font-mono text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {s.ip}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                      {parseInt(s.flows).toLocaleString()} flows <span className="font-medium text-slate-600 dark:text-slate-300">{(s.volume_bytes / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAllServices.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-500">Nenhum serviço hospedado encontrado.</div>
              )}
            </div>
          </section>

          {/* INFRASTRUCTURE SECTIONS */}
          <CarouselSection 
            title="DNS da Rede" 
            iconColor="border-blue-500" 
            data={filteredDNS} 
            renderItem={(s: any, i: number) => (
              <div key={i} className="w-[280px] bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-blue-400/50 transition-colors relative flex flex-col justify-between h-[160px] flex-shrink-0 snap-start">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">{s.ip}</span>
                      {s.pais && <span className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">{s.pais}</span>}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{s.nome || 'Desconhecido'}</span>
                  </div>
                  {s.is_known && (
                    <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded text-[10px] font-bold">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Conhecido
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="14" width="4" height="6"/><rect x="10" y="4" width="4" height="16"/><rect x="18" y="10" width="4" height="10"/></svg>
                  {parseInt(s.queries || s.flows || 0).toLocaleString()} flows
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {s.all_clients && s.all_clients.length > 0 ? (
                    <button 
                      onClick={() => setSelectedServiceClients({ name: s.ip, clients: s.all_clients })}
                      className="text-left hover:text-blue-500 transition-colors"
                    >
                      <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Hosts:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                    </button>
                  ) : (
                    <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Hosts:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                  )}
                  <div>Último uso: {s.ultimo_uso ? new Date(s.ultimo_uso).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          />

          <CarouselSection 
            title="E-mail Externos (SMTP/IMAP/POP3)" 
            iconColor="border-indigo-500" 
            data={filteredEmail} 
            renderItem={(s: any, i: number) => (
              <div key={i} className="w-[280px] bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-indigo-400/50 transition-colors relative flex flex-col justify-between h-[160px] flex-shrink-0 snap-start">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm">{s.ip}</span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">Correio</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {parseInt(s.flows || 0).toLocaleString()} conexões
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {s.all_clients && s.all_clients.length > 0 ? (
                    <button 
                      onClick={() => setSelectedServiceClients({ name: s.ip, clients: s.all_clients })}
                      className="text-left hover:text-indigo-500 transition-colors"
                    >
                      <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Hosts:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                    </button>
                  ) : (
                    <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Hosts:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                  )}
                  <div>Último uso: {s.ultimo_uso ? new Date(s.ultimo_uso).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          />

          <CarouselSection 
            title="DHCP (Alocação de IPs)" 
            iconColor="border-purple-500" 
            data={filteredDHCP} 
            renderItem={(s: any, i: number) => (
              <div key={i} className="w-[280px] bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-purple-400/50 transition-colors relative flex flex-col justify-between h-[160px] flex-shrink-0 snap-start">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold text-sm">{s.ip}</span>
                      <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">DHCP</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  {parseInt(s.flows || 0).toLocaleString()} pacotes
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {s.all_clients && s.all_clients.length > 0 ? (
                    <button 
                      onClick={() => setSelectedServiceClients({ name: s.ip, clients: s.all_clients })}
                      className="text-left hover:text-purple-500 transition-colors"
                    >
                      <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Atendeu:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                    </button>
                  ) : (
                    <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Atendeu:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                  )}
                  <div>Último uso: {s.ultimo_uso ? new Date(s.ultimo_uso).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          />

          <CarouselSection 
            title="NTP (Sincronização de Tempo)" 
            iconColor="border-orange-500" 
            data={filteredNTP} 
            renderItem={(s: any, i: number) => (
              <div key={i} className="w-[280px] bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-orange-400/50 transition-colors relative flex flex-col justify-between h-[160px] flex-shrink-0 snap-start">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-orange-600 dark:text-orange-400 font-bold text-sm">{s.ip}</span>
                      <span className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-1.5 py-0.5 rounded font-bold">NTP</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {((s.volume || 0) / 1024).toFixed(1)} KB
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {s.all_clients && s.all_clients.length > 0 ? (
                    <button 
                      onClick={() => setSelectedServiceClients({ name: s.ip, clients: s.all_clients })}
                      className="text-left hover:text-orange-500 transition-colors"
                    >
                      <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Sincronizou:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                    </button>
                  ) : (
                    <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Sincronizou:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                  )}
                  <div>Último uso: {s.ultimo_uso ? new Date(s.ultimo_uso).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          />

          <CarouselSection 
            title="Gateways / Roteadores" 
            iconColor="border-emerald-500" 
            data={filteredGateways} 
            renderItem={(s: any, i: number) => (
              <div key={i} className="w-[280px] bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-emerald-400/50 transition-colors relative flex flex-col justify-between h-[160px] flex-shrink-0 snap-start">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">{s.ip}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">Gateway</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                  {((s.volume || 0) / 1024 / 1024).toFixed(1)} MB Trafegados
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {s.all_clients && s.all_clients.length > 0 ? (
                    <button 
                      onClick={() => setSelectedServiceClients({ name: s.ip, clients: s.all_clients })}
                      className="text-left hover:text-emerald-500 transition-colors"
                    >
                      <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Origens ({s.origens || 0}):</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                    </button>
                  ) : (
                    <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Origens ({s.origens || 0}):</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                  )}
                  <div>Último fluxo: {s.ultimo_uso ? new Date(s.ultimo_uso).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          />

          <CarouselSection 
            title="Coletores NetFlow" 
            iconColor="border-rose-500" 
            data={filteredNetflow} 
            renderItem={(s: any, i: number) => (
              <div key={i} className="w-[280px] bg-white dark:bg-[#131b2f] border border-slate-200 dark:border-[#1e293b] rounded-xl p-4 shadow-sm hover:border-rose-400/50 transition-colors relative flex flex-col justify-between h-[160px] flex-shrink-0 snap-start">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-bold text-sm">{s.ip}</span>
                      <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.5 rounded font-bold">NetFlow</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {((s.volume || 0) / 1024 / 1024).toFixed(1)} MB Recebidos
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {s.all_clients && s.all_clients.length > 0 ? (
                    <button 
                      onClick={() => setSelectedServiceClients({ name: s.ip, clients: s.all_clients })}
                      className="text-left hover:text-rose-500 transition-colors"
                    >
                      <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Exportadores:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                    </button>
                  ) : (
                    <div className="line-clamp-1" title={(s.top_clients || []).join(", ")}><span className="font-semibold text-slate-700 dark:text-slate-300">Exportadores:</span> {(s.top_clients || []).join(", ")} {s.remaining_clients > 0 && `(+${s.remaining_clients})`}</div>
                  )}
                  <div>Último fluxo: {s.ultimo_uso ? new Date(s.ultimo_uso).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          />

          {/* Modal de Personalização Premium */}
          {editingService && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
              <div 
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-opacity" 
                onClick={() => setEditingService(null)}
              ></div>
              
              <div className="relative bg-white dark:bg-[#0b1221] border border-slate-200 dark:border-cyan-900/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all flex flex-col">
                
                {/* Header Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>

                <div className="p-6 sm:p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Identificar Serviço</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Atribua um nome legível para essa aplicação.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingService(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Target Asset Box */}
                  <div className="mb-6 bg-slate-50 dark:bg-[#131b2f] border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Ativo Alvo</span>
                        <span className="font-mono text-sm font-semibold text-blue-600 dark:text-cyan-400">
                          {editingService.ip}<span className="text-slate-400 dark:text-slate-500">:{editingService.port}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Nome Atual</span>
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{editingService.oldName}</div>
                    </div>
                  </div>

                  <form onSubmit={handleRename}>
                    <div className="mb-8">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Novo Nome do Serviço
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Tag className="w-4 h-4 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                        </div>
                        <input 
                          autoFocus
                          type="text" 
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="w-full bg-white dark:bg-[#0a1128] border border-slate-300 dark:border-cyan-900/40 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm transition-all placeholder-slate-400 dark:placeholder-slate-600"
                          placeholder="Ex: API de Pagamentos, DB de Homologação..."
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setEditingService(null)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] text-center"
                      >
                        Salvar Identificação
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ClientsModal 
        isOpen={!!selectedServiceClients}
        onClose={() => setSelectedServiceClients(null)}
        serviceName={selectedServiceClients?.name || ''}
        clients={selectedServiceClients?.clients || []}
        isDark={isDark}
        selectedClientId={selectedClientId}
        selectedSubnet={selectedSubnet}
      />
    </div>
  );
}
