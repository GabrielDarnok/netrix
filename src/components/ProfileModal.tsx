'use client';

import React, { useState } from 'react';
import { updateProfile } from '@/lib/actions/users';
import { X, Save, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isDark: boolean;
}

export default function ProfileModal({ isOpen, onClose, user, isDark }: ProfileModalProps) {
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não conferem.');
      return;
    }

    if (newPassword && !currentPassword) {
      setError('Você deve informar a senha atual para definir uma nova.');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await updateProfile({
        name,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.message || 'Perfil atualizado!');
        // Se mudou a senha, limpa os campos
        if (newPassword) {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
        // Atualiza a sessão silenciosamente ou forçando reload
        router.refresh();
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setError('Erro inesperado ao salvar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md ${isDark ? 'bg-[#0a1128] border-cyan-900/50 text-cyan-50' : 'bg-white border-slate-200 text-slate-800'} border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-cyan-900/50 bg-cyan-950/20' : 'border-slate-100 bg-slate-50'} flex justify-between items-center`}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              Meu Perfil
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-cyan-600/80' : 'text-slate-500'}`}>Gerencie seus dados e credenciais</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-md transition-colors ${isDark ? 'hover:bg-cyan-900/50 text-cyan-500' : 'hover:bg-slate-200 text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md text-sm flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 px-4 py-3 rounded-md text-sm flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-cyan-600/80' : 'text-slate-500'}`}>E-mail</label>
              <input 
                type="email" 
                value={user?.email || ''} 
                disabled 
                className={`w-full px-3 py-2 rounded-md text-sm cursor-not-allowed ${isDark ? 'bg-cyan-950/20 border-cyan-900/50 text-cyan-600/50' : 'bg-slate-100 border-slate-200 text-slate-400'} border`}
              />
              <p className={`text-[10px] mt-1 ${isDark ? 'text-cyan-700/50' : 'text-slate-400'}`}>O e-mail não pode ser alterado.</p>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-cyan-600/80' : 'text-slate-500'}`}>Nome de Exibição</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:border-cyan-500 transition-colors ${isDark ? 'bg-[#050914] border-cyan-800/50 text-cyan-50 placeholder-cyan-800' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`}
              />
            </div>
          </div>

          <hr className={isDark ? 'border-cyan-900/30' : 'border-slate-100'} />

          <div className="space-y-4">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-cyan-300' : 'text-slate-700'}`}>Alterar Senha</h3>
            <p className={`text-xs ${isDark ? 'text-cyan-600/70' : 'text-slate-500'}`}>Deixe em branco se não quiser alterar a senha.</p>
            
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-cyan-600/80' : 'text-slate-500'}`}>Senha Atual</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:border-cyan-500 transition-colors ${isDark ? 'bg-[#050914] border-cyan-800/50 text-cyan-50 placeholder-cyan-900/50' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-300'}`}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-cyan-600/80' : 'text-slate-500'}`}>Nova Senha</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:border-cyan-500 transition-colors ${isDark ? 'bg-[#050914] border-cyan-800/50 text-cyan-50 placeholder-cyan-900/50' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-300'}`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-cyan-600/80' : 'text-slate-500'}`}>Confirmar Nova</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:border-cyan-500 transition-colors ${isDark ? 'bg-[#050914] border-cyan-800/50 text-cyan-50 placeholder-cyan-900/50' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-300'}`}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/50' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-4 py-2 rounded-md text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
