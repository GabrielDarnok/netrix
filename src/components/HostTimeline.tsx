'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getHostTimeline } from '@/lib/actions/timeline';
import { Activity, ShieldAlert, Zap, Globe, Server, Download, ShieldCheck } from 'lucide-react';

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface HostTimelineProps {
  ip: string;
  isDark: boolean;
}

export default function HostTimeline({ ip, isDark }: HostTimelineProps) {
  const [period, setPeriod] = useState('7d');
  const [granularity, setGranularity] = useState<'minute'|'hour'|'day'>('hour');
  const [proto, setProto] = useState('all');
  const [direction, setDirection] = useState('all');
  const [port, setPort] = useState('all');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    getHostTimeline({ ip, period, granularity, proto, direction, port })
      .then(res => {
        // Transform data for charts
        const chartData = res.timeseries.map(d => ({
          ...d,
          timeLabel: new Date(d.timestamp).toLocaleString(undefined, {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          }),
          pctUdp: d.bytes > 0 ? (d.bytes_udp / d.bytes) * 100 : 0
        }));
        
        setData({ ...res, chartData });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [ip, period, granularity, proto, direction, port]);

  // Styling vars
  const bgCard = isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200';
  const textTitle = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex flex-col gap-6 fade-in pb-12">
      {/* Toolbars */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Time filters */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center p-1 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            {['2h', '6h', '24h', '7d', '30d'].map(p => (
              <button 
                key={p} 
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${period === p ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className={`flex items-center p-1 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            {['hour', 'day'].map(g => (
              <button 
                key={g} 
                onClick={() => setGranularity(g as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${granularity === g ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
              >
                {g === 'hour' ? 'Hora' : 'Dia'}
              </button>
            ))}
          </div>
        </div>

        {/* Network filters */}
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <span className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Proto</span>
              <select 
                value={proto} onChange={e => setProto(e.target.value)}
                className={`text-sm rounded-md border px-2 py-1 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
              >
                <option value="all">Todos</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
              </select>
           </div>
           <div className="flex items-center gap-2">
              <span className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Porta</span>
              <select 
                value={port} onChange={e => setPort(e.target.value)}
                className={`text-sm rounded-md border px-2 py-1 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
              >
                <option value="all">Todas</option>
                {data?.activePorts?.map((p: number) => {
                  const portNames: Record<number, string> = { 22: 'SSH', 53: 'DNS', 80: 'HTTP', 443: 'HTTPS', 3389: 'RDP', 3306: 'MySQL', 5432: 'PostgreSQL' };
                  const name = portNames[p] ? `${portNames[p]} (:${p})` : `:${p}`;
                  return <option key={p} value={p.toString()}>{name}</option>;
                })}
              </select>
           </div>
           <div className="flex items-center gap-2">
              <span className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Direção</span>
              <select 
                value={direction} onChange={e => setDirection(e.target.value)}
                className={`text-sm rounded-md border px-2 py-1 outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
              >
                <option value="all">Ambas</option>
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
              </select>
           </div>
        </div>

        {/* Baseline Info */}
        {!loading && data && (
          <div className={`px-4 py-1.5 rounded-full border text-sm font-medium ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
             Baseline: {data.baseline.mean.toFixed(2)} conn/bucket
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data ? (
        <>
          {/* Status Banner */}
          {data.events.length === 0 ? (
             <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium">Comportamento estável — nenhum desvio detectado.</span>
             </div>
          ) : (
             <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <ShieldAlert className="w-5 h-5" />
                <span className="font-medium">Anomalias detectadas: {data.events.length} eventos neste período.</span>
             </div>
          )}

          {/* Chart 1: Conexões / Baseline */}
          <div className={`p-6 rounded-xl border ${bgCard}`}>
             <h3 className={`text-xs font-bold uppercase tracking-wider mb-6 ${textTitle}`}>Conexões — Baseline e Desvios</h3>
             <div className="h-72 w-full min-w-0 min-h-0">
               {data.chartData.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-full text-sm font-medium rounded-lg border border-dashed ${isDark ? 'text-slate-500 bg-slate-800/30 border-slate-700' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                    <span>Nenhum tráfego de conexões neste período</span>
                  </div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <LineChart data={data.chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                     <XAxis 
                       dataKey="timeLabel" 
                       stroke={isDark ? '#64748b' : '#94a3b8'} 
                       fontSize={12} 
                       tickMargin={10} 
                       minTickGap={30}
                     />
                     <YAxis 
                       stroke={isDark ? '#64748b' : '#94a3b8'} 
                       fontSize={12} 
                       tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(1)+'k' : val}
                     />
                     <Tooltip 
                       contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }}
                       itemStyle={{ color: isDark ? '#e2e8f0' : '#1e293b' }}
                       labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' }}
                     />
                     <ReferenceLine y={data.baseline.threshold} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Limiar de Anomalia', fill: '#ef4444', fontSize: 10 }} />
                     <Line 
                       type="monotone" 
                       dataKey="flows" 
                       name="Conexões"
                       stroke="#3b82f6" 
                       strokeWidth={2} 
                       dot={false} 
                       activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} 
                     />
                   </LineChart>
                 </ResponsiveContainer>
               )}
             </div>
          </div>

          {/* Chart 2: Volume por Protocolo */}
          <div className={`p-6 rounded-xl border ${bgCard}`}>
             <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Tráfego por Protocolo</h3>
                <div className="flex items-center gap-4 text-xs font-medium">
                   <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> TCP</div>
                   <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> UDP</div>
                   <div className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded-sm"></span> ICMP</div>
                   <div className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-400 rounded-sm"></span> Outros</div>
                </div>
             </div>
             
             <div className="h-64 w-full min-w-0 min-h-0">
               {data.chartData.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-full text-sm font-medium rounded-lg border border-dashed ${isDark ? 'text-slate-500 bg-slate-800/30 border-slate-700' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                    <span>Nenhum tráfego de volume neste período</span>
                  </div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <AreaChart data={data.chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                     <XAxis dataKey="timeLabel" hide />
                     <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickFormatter={formatBytes} />
                     <Tooltip 
                       contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }}
                       formatter={(value: any, name: any) => [formatBytes(value), name]}
                     />
                     <Area type="monotone" dataKey="bytes_tcp" stackId="1" name="TCP" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                     <Area type="monotone" dataKey="bytes_udp" stackId="1" name="UDP" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                     <Area type="monotone" dataKey="bytes_icmp" stackId="1" name="ICMP" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                     <Area type="monotone" dataKey="bytes_other" stackId="1" name="Outros" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.6} />
                   </AreaChart>
                 </ResponsiveContainer>
               )}
             </div>
          </div>

          {/* Events Table */}
          <div className="flex flex-col gap-3 mt-4">
             <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textTitle}`}>Eventos Detectados</h3>
             {data.events.length === 0 ? (
                <div className={`p-6 text-center text-sm rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                   Sem eventos registrados neste período.
                </div>
             ) : (
                data.events.map((ev: any, idx: number) => (
                   <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className={`mt-1 p-2 rounded-full ${ev.type === 'spike' ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600') : (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')}`}>
                         {ev.type === 'spike' ? <Activity className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div className={`text-xs font-mono mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                               {new Date(ev.timestamp).toLocaleString()}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${ev.level === 'ALTO' ? 'bg-red-500/20 text-red-500' : ev.level === 'MEDIO' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-500/20 text-slate-400'}`}>
                               {ev.level}
                            </span>
                         </div>
                         <h4 className={`font-semibold text-sm mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ev.title}</h4>
                         <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ev.description}</p>
                      </div>
                   </div>
                ))
             )}
          </div>
        </>
      ) : null}
    </div>
  );
}
