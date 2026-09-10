import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminForms from "./AdminForms";
import { getClients, getNetworks } from "@/lib/actions/admin";

export default async function AdminPage() {
  const session = await auth();
  
  // Protect route
  if (!session) {
    redirect("/login");
  }

  // Fetch initial data
  const clients = await getClients();
  const networks = await getNetworks();

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-[#02040a] text-slate-800 dark:text-slate-200 selection:bg-cyan-500/30 pb-20 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 bg-white dark:bg-[#101930] px-8 py-5 shadow-sm dark:shadow-md transition-colors duration-300">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="relative w-[150px] h-[50px] flex items-center justify-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="NETRIX Logo" className="w-full h-full object-contain" />
          </Link>
          <div className="h-8 w-px bg-slate-200 dark:bg-cyan-900/50"></div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-cyan-50 tracking-wide flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            Painel de Administração
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="px-4 py-2 border border-slate-200 dark:border-cyan-800 text-slate-600 dark:text-cyan-400 hover:bg-slate-50 dark:hover:bg-cyan-950/40 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
          >
            &larr; Voltar ao Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 pt-10">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Gestão de Multi-Tenancy</h1>
          <p className="text-slate-500 dark:text-slate-400">Cadastre organizações e vincule blocos CIDR para segmentação do tráfego NetFlow.</p>
        </div>

        <AdminForms clients={clients} networks={networks} />
      </main>
    </div>
  );
}
