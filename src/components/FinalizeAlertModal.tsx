'use client';

import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { finalizeAlert } from '@/lib/actions/security';

interface FinalizeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string;
  isDark: boolean;
  onSuccess?: () => void;
}

export default function FinalizeAlertModal({ isOpen, onClose, ip, isDark, onSuccess }: FinalizeAlertModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [resolucao, setResolucao] = useState('Corrigido / Mitigado');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await finalizeAlert(ip, justificativa + " (" + resolucao + ")");
      if (res.error) {
        setError(res.error);
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-[#0f172a] border border-slate-800' : 'bg-white border border-slate-200'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Finalizar Incidente
          </h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6">
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Você está marcando as anomalias do host <span className="font-mono font-bold text-indigo-500">{ip}</span> como resolvidas. O perfil de alerta do host será resetado para "Normal".
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Resolução</label>
              <select 
                value={resolucao} 
                onChange={(e) => setResolucao(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-sm outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`}
              >
                <option value="Corrigido / Mitigado">Corrigido / Mitigado</option>
                <option value="Falso Positivo">Falso Positivo</option>
                <option value="Comportamento Esperado (Novo Baseline)">Comportamento Esperado (Novo Baseline)</option>
                <option value="Risco Aceito">Risco Aceito</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Justificativa (Opcional)</label>
              <textarea 
                value={justificativa} 
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Detalhes da análise ou chamado..."
                rows={3}
                className={`w-full p-2.5 rounded-lg border text-sm outline-none transition-colors resize-none ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`}
              ></textarea>
            </div>
          </div>
        </div>

        <div className={`p-4 border-t flex items-center justify-end gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <button 
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Cancelar
          </button>
          <button 
            onClick={handleFinalize}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ShieldCheck className="w-4 h-4" />}
            Confirmar Resolução
          </button>
        </div>
      </div>
    </div>
  );
}
