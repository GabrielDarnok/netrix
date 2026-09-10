'use client';

import React, { useEffect, useState } from 'react';
import { X, Globe, Building2, ServerCrash, Database, MapPin, Search } from 'lucide-react';
import { getWhoisInfo } from '@/lib/actions/whois';

interface WhoisModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string | null;
  isDark: boolean;
}

export default function WhoisModal({ isOpen, onClose, ip, isDark }: WhoisModalProps) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen && ip) {
      setLoading(true);
      setInfo(null);
      getWhoisInfo(ip).then(data => {
        setInfo(data);
        setLoading(false);
      });
    }
  }, [isOpen, ip]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A0F1C] border border-slate-800' : 'bg-white border border-slate-200'}`}>
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-[#101930]/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Informações do Endereço</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ip}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full hover:bg-black/5 transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className={`text-sm animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Buscando registro WHOIS...</p>
            </div>
          ) : info?.error ? (
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <p className="font-semibold text-sm mb-1">Erro ao buscar informações</p>
              <p className="text-sm opacity-80">{info.message}</p>
            </div>
          ) : info ? (
            <div className="space-y-6">
              
              {/* ISP & Org */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ServerCrash className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Provedor (ISP)</span>
                  </div>
                  <p className={`font-medium text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={info.isp || '-'}>{info.isp || '-'}</p>
                </div>
                
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Organização</span>
                  </div>
                  <p className={`font-medium text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={info.org || '-'}>{info.org || '-'}</p>
                </div>
              </div>

              {/* Geo */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Geolocalização</span>
                </div>
                <div className="grid grid-cols-2 gap-y-3">
                   <div>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>País</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {info.country} {info.countryCode && `(${info.countryCode})`}
                      </p>
                   </div>
                   <div>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Região/Estado</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {info.regionName || '-'}
                      </p>
                   </div>
                   <div>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Cidade</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {info.city || '-'}
                      </p>
                   </div>
                   <div>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Fuso Horário</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {info.timezone || '-'}
                      </p>
                   </div>
                </div>
              </div>

              {/* ASN & DB Status */}
              <div className={`flex items-center justify-between px-2 pt-2 border-t ${isDark ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{info.as || 'ASN Desconhecido'}</span>
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded-md ${info.cached ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')}`}>
                   {info.cached ? 'Carregado do Cache' : 'Buscado em Tempo Real'}
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
