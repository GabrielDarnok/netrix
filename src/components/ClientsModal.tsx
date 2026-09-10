'use client';

import React from 'react';
import { X, Users, Activity } from 'lucide-react';
import Link from 'next/link';

interface ClientData {
  ip: string;
  flows?: number;
  volume?: number;
}

interface ClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  clients: ClientData[];
  isDark: boolean;
  selectedClientId?: number | null;
  selectedSubnet?: string | null;
}

export default function ClientsModal({ 
  isOpen, 
  onClose, 
  serviceName, 
  clients, 
  isDark,
  selectedClientId,
  selectedSubnet
}: ClientsModalProps) {
  if (!isOpen) return null;

  const qString = selectedClientId 
    ? `?client=${selectedClientId}${selectedSubnet ? `&subnet=${encodeURIComponent(selectedSubnet)}` : ''}` 
    : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A0F1C] border border-slate-800' : 'bg-white border border-slate-200'}`}>
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-[#101930]/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Equipamentos Comunicantes</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{serviceName}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full hover:bg-black/5 transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 max-h-[60vh] overflow-y-auto ${isDark ? '[&::-webkit-scrollbar-thumb]:bg-slate-700' : '[&::-webkit-scrollbar-thumb]:bg-slate-300'}`}>
          <div className="flex items-center justify-between mb-4">
             <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
               Total de IPs únicos: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{clients.length}</strong>
             </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {clients.map((client, idx) => (
              <Link 
                key={idx}
                href={`/dashboard/hosts/${client.ip}${qString}`}
                className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md group ${
                  isDark 
                    ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-cyan-500/50' 
                    : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 transition-colors ${isDark ? 'text-slate-500 group-hover:text-cyan-400' : 'text-slate-400 group-hover:text-cyan-500'}`} />
                  <span className={`font-mono text-sm transition-colors ${isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {client.ip}
                  </span>
                </div>
                {client.flows !== undefined && (
                  <div className={`text-[10px] pl-6 ${isDark ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    {client.flows.toLocaleString()} conexões
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
