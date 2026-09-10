'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import FinalizeAlertModal from '@/components/FinalizeAlertModal';
import WhoisModal from '@/components/WhoisModal';
import { ShieldAlert, ShieldCheck, Activity, Globe, Info, AlertTriangle, CheckCircle, Target, Zap, Shield, ArrowUpRight } from 'lucide-react';

interface SecurityUIProps {
  user: any;
  isDark: boolean;
  networks: any[];
  selectedClientId: number | null;
  selectedSubnet: string | null;
  recommendationsData: any;
  threatData: any;
  egressData: any;
}

export default function SecurityUI({
  user,
  isDark: initialIsDark,
  networks,
  selectedClientId,
  selectedSubnet,
  recommendationsData,
  threatData,
  egressData
}: SecurityUIProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(initialIsDark);
  const [finalizeIp, setFinalizeIp] = useState<string | null>(null);
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

  const clients = Array.from(new Set(networks.map(n => JSON.stringify({ id: n.client_id, name: n.cliente }))))
    .map(str => JSON.parse(str));

  const availableSubnets = networks
    .filter(n => n.client_id === selectedClientId)
    .map(n => n.cidr);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hostsAlerta = recommendationsData?.hosts || [];
  const threats = threatData?.threats || [];
  const anomalias = egressData?.anomalias || [];

  const totalIncidentes = hostsAlerta.length;
  const totalThreats = threats.length;
  const totalAnomalias = anomalias.length;
  
  const scoreSeguranca = Math.max(0, 100 - (totalIncidentes * 15 + totalThreats * 10 + totalAnomalias * 20));

  const qString = `?client=${selectedClientId}${selectedSubnet ? `&subnet=${encodeURIComponent(selectedSubnet)}` : ''}`;

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
        <div className={`px-8 py-6 ${isDark ? "bg-[#0A0F1C]/90" : "bg-white/90"} border-b ${isDark ? "border-slate-800/50" : "border-slate-200"} sticky top-0 z-10 backdrop-blur-xl flex justify-between items-center`}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Postura de Segurança</h1>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Central de monitoramento de ameaças (NDR) e anomalias da rede.</p>
          </div>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Score de Segurança</h3>
                  <div className={`text-3xl font-bold ${scoreSeguranca >= 90 ? 'text-emerald-500' : scoreSeguranca >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                    {scoreSeguranca}/100
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${scoreSeguranca >= 90 ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600") : scoreSeguranca >= 70 ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-600") : (isDark ? "bg-red-500/10 text-red-400" : "bg-red-100 text-red-600")}`}>
                  <Shield className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Incidentes Ativos</h3>
                  <div className="text-3xl font-bold">{totalIncidentes}</div>
                </div>
                <div className={`p-3 rounded-xl ${totalIncidentes > 0 ? (isDark ? "bg-red-500/10 text-red-400" : "bg-red-100 text-red-600") : (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600")}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Anomalias de Saída</h3>
                  <div className="text-3xl font-bold">{totalAnomalias}</div>
                </div>
                <div className={`p-3 rounded-xl ${totalAnomalias > 0 ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-600") : (isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-600")}`}>
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Ameaças Externas</h3>
                  <div className="text-3xl font-bold">{totalThreats}</div>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                  <Globe className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* 1. Incidentes Ativos */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-l-4 border-red-500 pl-3">Incidentes Ativos (Hosts em Alerta)</h2>
            </div>
            
            {hostsAlerta.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center ${isDark ? "bg-[#131b2f] border-[#1e293b]" : "bg-white border-slate-200"}`}>
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mb-1">Nenhum incidente ativo</h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Todos os hosts estão com perfil de comportamento normal e baseline estabilizado.</p>
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#131b2f] border-[#1e293b]" : "bg-white border-slate-200 shadow-sm"}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${isDark ? "border-slate-800 text-slate-500 bg-slate-900/50" : "border-slate-200 text-slate-500 bg-slate-50"}`}>
                      <th className="px-6 py-4">Host / Papel</th>
                      <th className="px-6 py-4">Nível de Alerta</th>
                      <th className="px-6 py-4">Sinais / Tags</th>
                      <th className="px-6 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {hostsAlerta.map((host: any, i: number) => {
                      const tags = typeof host.tags === 'string' ? JSON.parse(host.tags) : (host.tags || []);
                      return (
                        <tr key={i} className={`group transition-colors hover:bg-black/5 ${isDark ? "hover:bg-slate-800/30" : ""}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <Link href={`/dashboard/hosts/${host.ip}${qString}`} className="font-mono font-bold text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1">
                                  {host.ip} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                                <div className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{host.role || 'Host Cliente'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              host.nivel_alerta === 'critico' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
                              host.nivel_alerta === 'alerta' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 
                              'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            }`}>
                              <AlertTriangle className="w-3 h-3" />
                              {host.nivel_alerta}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {tags.map((tag: string, tIdx: number) => {
                                let label = tag;
                                let colorClass = isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700";
                                
                                if (tag === 'conexao_anormal') { label = 'Anomalia TCP'; colorClass = 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'; }
                                else if (tag === 'muitas_portas') { label = 'Reconhecimento (Port Scan)'; colorClass = 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'; }
                                else if (tag === 'muitas_portas_critico') { label = 'Scanner Agressivo'; colorClass = 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'; }
                                else if (tag.startsWith('Porta_')) { 
                                  const parts = tag.split('_');
                                  label = `Serviço de Risco: ${parts[2] || parts[1]}`;
                                  colorClass = 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400';
                                } else {
                                  label = tag.replace(/_/g, ' ');
                                }

                                return (
                                  <span key={tIdx} className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${colorClass}`}>
                                    {label}
                                  </span>
                                );
                              })}
                              {tags.length === 0 && <span className="text-slate-500 text-xs italic">Apenas desvio de baseline</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setFinalizeIp(host.ip)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded shadow-sm transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Resolver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 2. Anomalias de Saída (Egress Detection) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-l-4 border-amber-500 pl-3">Anomalias de Saída (Egress)</h2>
               <span className={`text-xs px-2 py-1 rounded font-medium ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>Real-time (5 ~ 30 min)</span>
            </div>

            {anomalias.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center ${isDark ? "bg-[#131b2f] border-[#1e293b]" : "bg-white border-slate-200"}`}>
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mb-1">Nenhuma anomalia de saída detectada</h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>O tráfego de saída da rede local para a internet ou outras sub-redes está dentro dos baselines estabelecidos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {anomalias.map((anomalia: any, i: number) => (
                  <div key={i} className={`rounded-xl p-5 border relative flex flex-col justify-between ${isDark ? "bg-[#131b2f] border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${anomalia.severidade === 'CRÍTICO' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                    
                    <div className="pl-3">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${anomalia.tipo === 'volume' ? 'bg-blue-500/20 text-blue-500' : anomalia.tipo === 'dispersao' ? 'bg-purple-500/20 text-purple-500' : 'bg-orange-500/20 text-orange-500'}`}>
                            {anomalia.tipo === 'volume' ? <Activity className="w-4 h-4" /> : anomalia.tipo === 'dispersao' ? <Target className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          <Link href={`/dashboard/hosts/${anomalia.host_src}${qString}`} className="font-mono font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
                            {anomalia.host_src}
                          </Link>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${anomalia.severidade === 'CRÍTICO' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                          {anomalia.severidade}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-sm mb-1">{anomalia.tipo === 'volume' ? 'Spike de Volume' : anomalia.tipo === 'dispersao' ? 'Dispersão Anômala (Scan)' : 'Comportamento TCP Anômalo'}</h4>
                      <p className={`text-sm mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{anomalia.descricao}</p>
                      
                      <div className="flex justify-between items-end mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                        <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>Detectado: {new Date(anomalia.detectado_em).toLocaleTimeString()}</span>
                        <span className={`text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ${isDark ? "text-slate-400" : "text-slate-500"}`}>{anomalia.periodo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Comunicações de Risco (Threat Intel) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-l-4 border-purple-500 pl-3">Comunicações de Risco (Threat Intelligence)</h2>
            </div>

            {threatData?.base_vazia ? (
              <div className={`p-6 rounded-2xl border flex items-center gap-4 ${isDark ? "bg-[#131b2f] border-[#1e293b]" : "bg-white border-slate-200"}`}>
                <Info className="w-8 h-8 text-blue-500 flex-shrink-0" />
                <div>
                  <h3 className="font-bold">Base de Threat Intel não detectada</h3>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>A tabela `threat_intel` não existe no banco de dados. Configure as integrações com AbuseIPDB ou listas de reputação para ativar este módulo.</p>
                </div>
              </div>
            ) : threats.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center ${isDark ? "bg-[#131b2f] border-[#1e293b]" : "bg-white border-slate-200"}`}>
                <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mb-1">Nenhuma ameaça externa ativa</h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Não detectamos comunicações recentes da sua rede com IPs listados em bases de Threat Intelligence.</p>
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#131b2f] border-[#1e293b]" : "bg-white border-slate-200 shadow-sm"}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${isDark ? "border-slate-800 text-slate-500 bg-slate-900/50" : "border-slate-200 text-slate-500 bg-slate-50"}`}>
                      <th className="px-6 py-4">IP Externo Ameaçador</th>
                      <th className="px-6 py-4">Abuse Score</th>
                      <th className="px-6 py-4">Hosts Internos Afetados</th>
                      <th className="px-6 py-4 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {threats.map((threat: any, i: number) => (
                      <tr key={i} className={`group transition-colors hover:bg-black/5 ${isDark ? "hover:bg-slate-800/30" : ""}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => setWhoisIp(threat.ip_externo)} className="font-mono font-bold text-red-500 hover:text-red-400 hover:underline transition-colors text-left text-sm flex items-center gap-1">
                              {threat.ip_externo} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 rounded">{threat.pais || 'N/A'}</span>
                          </div>
                          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {typeof threat.categorias === 'string' ? threat.categorias : (threat.categorias?.join(', ') || 'Sem categoria específica')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-red-500" style={{ width: `${threat.score_abuso}%` }}></div>
                            </div>
                            <span className="font-bold text-sm">{threat.score_abuso}%</span>
                          </div>
                          {threat.fontes && <div className="text-[10px] text-slate-400 mt-1">Fonte: {threat.fontes}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {threat.hosts_internos_src?.concat(threat.hosts_internos_dst || [])
                              .filter((v: any, i: number, a: any[]) => v !== null && a.indexOf(v) === i)
                              .slice(0, 3)
                              .map((ip: string) => (
                                <Link key={ip} href={`/dashboard/hosts/${ip}${qString}`} className={`text-sm font-mono hover:text-indigo-500 transition-colors ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  {ip}
                                </Link>
                              ))}
                            {(threat.hosts_internos_src?.length || 0) + (threat.hosts_internos_dst?.length || 0) > 3 && (
                              <span className="text-xs text-slate-500">...e mais {(threat.hosts_internos_src?.length || 0) + (threat.hosts_internos_dst?.length || 0) - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-bold">{formatBytes(parseInt(threat.volume_bytes || 0))}</div>
                          <div className="text-[10px] text-slate-400">{threat.total_flows} flows</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>

      <FinalizeAlertModal 
        isOpen={!!finalizeIp} 
        onClose={() => setFinalizeIp(null)} 
        ip={finalizeIp!} 
        isDark={isDark} 
        onSuccess={() => {
          // Force a hard reload to ensure all data and egress queries are immediately updated
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
