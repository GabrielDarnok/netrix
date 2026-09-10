"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import TenantSettingsModal from "./TenantSettingsModal";
import ProfileModal from "./ProfileModal";

interface SidebarProps {
  user: any;
  clients: any[];
  availableSubnets: string[];
  selectedClientId: number | null;
  selectedSubnet: string | null;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

export default function Sidebar({
  user,
  clients,
  availableSubnets,
  selectedClientId,
  selectedSubnet,
  isDark,
  setIsDark
}: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const currentClient = clients.find(c => c.id === selectedClientId);

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subnet");
    params.set("client", val);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSubnetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("subnet", val);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    if (isActive) {
      return "w-full px-4 py-2.5 bg-cyan-900/30 border border-cyan-700/40 rounded-md text-sm text-cyan-50 shadow-[0_0_10px_rgba(34,211,238,0.1)] flex items-center gap-3 transition-colors mt-2";
    }
    return "w-full px-4 py-2.5 bg-transparent rounded-md text-sm hover:bg-cyan-950/30 transition-colors text-cyan-100/70 hover:text-cyan-100 flex items-center gap-3";
  };

  const getIconClasses = (path: string) => {
    return pathname === path ? "text-cyan-400" : "text-cyan-600/70";
  };

  const getNavUrl = (basePath: string) => {
    const params = new URLSearchParams();
    if (selectedClientId) params.set("client", selectedClientId.toString());
    if (selectedSubnet) params.set("subnet", selectedSubnet);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <aside className="w-72 border-r border-cyan-900/60 bg-[#101930] flex flex-col transition-colors duration-300 shadow-xl z-20 fixed h-full left-0 top-0">
      <div className="p-6 border-b border-cyan-900/40 flex justify-center items-center h-24">
        <img src="/logo.png" alt="NETRIX Logo" className="w-32 object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-5 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col">
            <label className="text-[10px] text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">Organização (Tenant)</label>
            <select
              value={selectedClientId || ""}
              onChange={handleClientChange}
              className="w-full bg-cyan-950/40 border border-cyan-800/50 rounded-md px-3 py-2 text-sm text-cyan-50 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {(selectedClientId || availableSubnets.length > 0) && (
            <div className="flex flex-col">
              <label className="text-[10px] text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 ml-1">Subrede (/24)</label>
              <select
                value={selectedSubnet || ""}
                onChange={handleSubnetChange}
                className="w-full bg-cyan-950/40 border border-cyan-800/50 rounded-md px-3 py-2 text-sm font-mono text-cyan-50 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
              >
                {availableSubnets.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <hr className="border-cyan-900/30" />

        <div className="flex flex-col gap-1.5">
          <Link href={getNavUrl("/dashboard")} className={getLinkClasses("/dashboard")}>
            <svg className={getIconClasses("/dashboard")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
            Dashboard
          </Link>

          <Link href={getNavUrl("/dashboard/hosts")} className={getLinkClasses("/dashboard/hosts")}>
            <svg className={getIconClasses("/dashboard/hosts")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" /></svg>
            Hosts
          </Link>

          <Link href={getNavUrl("/dashboard/services")} className={getLinkClasses("/dashboard/services")}>
            <svg className={getIconClasses("/dashboard/services")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            Serviços
          </Link>

          <Link href={getNavUrl("/dashboard/security")} className={getLinkClasses("/dashboard/security")}>
            <svg className={getIconClasses("/dashboard/security")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Segurança
          </Link>

          <Link href={getNavUrl("/dashboard/explorer")} className={getLinkClasses("/dashboard/explorer")}>
            <svg className={getIconClasses("/dashboard/explorer")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            Explorer
          </Link>

          <hr className="border-cyan-900/30 my-3" />

          <Link href="/admin" className="w-full px-4 py-2.5 bg-transparent border border-transparent rounded-md text-sm hover:bg-cyan-950/30 transition-colors text-cyan-100/70 hover:text-cyan-100 flex items-center gap-3 group">
            <svg className="text-cyan-600/70 group-hover:text-cyan-400 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            Administração Global
          </Link>
        </div>
      </div>

      <div className="p-5 border-t border-cyan-900/40 flex flex-col gap-4 bg-[#0a1128] mt-auto">
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-full px-4 py-2.5 rounded-md bg-cyan-950/30 border border-cyan-800/40 text-cyan-500 hover:bg-cyan-900/50 hover:text-cyan-300 transition-all shadow-sm flex items-center justify-center gap-2"
          title="Alternar Tema"
        >
          {isDark ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              <span className="text-xs font-medium">Modo Claro</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              <span className="text-xs font-medium">Modo Escuro</span>
            </>
          )}
        </button>

        <div className="relative">
          {/* Menu Dropdown Flutuante */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-[#0a1128] border border-cyan-900/50 rounded-lg shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
              <button 
                className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 flex items-center gap-3 transition-colors"
                onClick={() => { setIsUserMenuOpen(false); setIsProfileOpen(true); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Meu Perfil
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 flex items-center gap-3 transition-colors"
                onClick={() => { setIsUserMenuOpen(false); alert("Função em breve!"); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Usuários da Org <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded ml-auto">Em breve</span>
              </button>

              {currentClient && (
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-cyan-950/30 flex items-center gap-3 transition-colors"
                  onClick={() => { setIsUserMenuOpen(false); setIsSettingsOpen(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Configurações (Alertas)
                </button>
              )}

              <hr className="border-cyan-900/30 my-1.5" />
              
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })} 
                className="w-full text-left px-4 py-2 text-sm text-red-500/80 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                Sair do Sistema
              </button>
            </div>
          )}

          <div 
            className="flex items-center gap-3 p-2.5 bg-[#0a1128] rounded-lg border border-cyan-900/50 shadow-inner group cursor-pointer hover:border-cyan-700/50 transition-colors"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-800 border border-cyan-400/50 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_10px_rgba(6,182,212,0.2)] flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition-colors" title={user?.name}>{user?.name}</p>
              <p className="text-[10px] text-cyan-500 truncate" title={user?.email}>{user?.email}</p>
            </div>
            <div className="flex flex-col gap-1 pr-1 text-cyan-700 group-hover:text-cyan-500 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>
      </div>
      
      {currentClient && (
        <TenantSettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          client={currentClient}
          isDark={isDark}
        />
      )}

      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        isDark={isDark}
      />
    </aside>
  );
}
