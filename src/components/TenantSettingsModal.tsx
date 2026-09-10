'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Send, Save, CheckCircle2 } from 'lucide-react';
import { updateClientTelegram } from '@/lib/actions/admin';
import { testTelegramIntegration } from '@/lib/actions/telegram';

interface ClientData {
  id: number;
  name: string;
  telegram_chat_id?: string;
}

interface TenantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientData;
  isDark: boolean;
}

export default function TenantSettingsModal({ 
  isOpen, 
  onClose, 
  client,
  isDark
}: TenantSettingsModalProps) {
  const [chatId, setChatId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setChatId(client.telegram_chat_id || "");
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    const res = await updateClientTelegram(client.id, chatId);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Configurações salvas com sucesso!");
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!chatId) {
      setErrorMsg("Salve um Chat ID antes de testar.");
      return;
    }
    setIsTesting(true);
    setErrorMsg("");
    setSuccessMsg("");
    const res = await testTelegramIntegration(chatId);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Mensagem de teste enviada! Verifique o Telegram.");
    }
    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A0F1C] border border-slate-800' : 'bg-white border border-slate-200'}`}>
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-[#101930]/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Configurações da Organização</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{client.name}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full hover:bg-black/5 transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 flex flex-col gap-6 ${isDark ? 'bg-[#0A0F1C]' : 'bg-white'}`}>
          
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Telegram: Chat ID de Notificações
            </label>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Insira o ID do grupo ou canal onde os alertas críticos do SOC devem ser enviados. O bot mestre do Netrix enviará alertas automaticamente para cá.
            </p>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="ex: -10012345678"
              className={`mt-1 w-full px-4 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                isDark 
                  ? 'bg-[#050914] border-slate-700 text-slate-200 placeholder-slate-600' 
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                isDark ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              } disabled:opacity-50`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </button>
            <button 
              onClick={handleTest}
              disabled={isTesting || !chatId}
              className={`py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors border ${
                isDark 
                  ? 'bg-transparent border-cyan-800 text-cyan-400 hover:bg-cyan-950/50' 
                  : 'bg-white border-cyan-200 text-cyan-600 hover:bg-cyan-50'
              } disabled:opacity-50`}
            >
              <Send className="w-4 h-4" />
              Testar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
