"use client";

import React, { useState } from "react";
import { createClient, createNetwork, deleteNetwork, deleteClient } from "@/lib/actions/admin";
import { Building2, Network, Plus, Trash2 } from "lucide-react";

export default function AdminForms({ clients, networks }: { clients: any[], networks: any[] }) {
  const [newClientName, setNewClientName] = useState("");
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  const [netClientId, setNetClientId] = useState("");
  const [netCidr, setNetCidr] = useState("");
  const [netDesc, setNetDesc] = useState("");
  const [isSubmittingNet, setIsSubmittingNet] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmittingClient(true);
    const res = await createClient(newClientName);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setNewClientName("");
    }
    setIsSubmittingClient(false);
  };

  const handleCreateNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmittingNet(true);
    const res = await createNetwork(parseInt(netClientId), netCidr, netDesc);
    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setNetCidr("");
      setNetDesc("");
    }
    setIsSubmittingNet(false);
  };

  const handleDeleteClient = async (id: number) => {
    if (confirm("Tem certeza que deseja remover esta Organização? Todas as redes vinculadas serão removidas.")) {
      await deleteClient(id);
    }
  };

  const handleDeleteNetwork = async (id: number) => {
    if (confirm("Tem certeza que deseja remover esta Rede?")) {
      await deleteNetwork(id);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {errorMsg && (
        <div className="lg:col-span-2 p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* COLUNA 1: ORGANIZAÇÕES */}
      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 rounded-xl p-6 shadow-sm relative overflow-hidden group transition-colors duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 dark:from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative z-10 flex items-center gap-3 mb-5">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Adicionar Organização</h2>
          </div>
          
          <form onSubmit={handleCreateClient} className="relative z-10 flex gap-4">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Nome da Empresa (ex: Netrix Corp)"
              required
              className="flex-1 bg-white dark:bg-[#050914] border border-slate-200 dark:border-cyan-900/50 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-all shadow-sm focus:shadow-[0_0_10px_rgba(34,211,238,0.1)]"
            />
            <button 
              type="submit" 
              disabled={isSubmittingClient}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Criar
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 rounded-xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="p-5 border-b border-slate-200 dark:border-cyan-900/40 bg-slate-50 dark:bg-cyan-950/10 flex items-center gap-2">
            <h2 className="font-semibold text-lg text-slate-800 dark:text-cyan-50">Organizações Cadastradas</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-[#070d1e] text-slate-500 dark:text-cyan-600/70 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/30">
              {clients.length === 0 ? (
                <tr><td colSpan={3} className="p-5 text-center text-slate-500 dark:text-cyan-600/70">Nenhuma organização encontrada.</td></tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-cyan-950/30 transition-colors">
                    <td className="px-5 py-4 text-cyan-600 dark:text-cyan-500 font-mono font-medium">{c.id}</td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-200 font-medium">{c.name}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDeleteClient(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors inline-flex" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLUNA 2: REDES */}
      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 rounded-xl p-6 shadow-sm relative overflow-hidden group transition-colors duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative z-10 flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <Network className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Vincular Rede a Organização</h2>
          </div>

          <form onSubmit={handleCreateNetwork} className="relative z-10 flex flex-col gap-4">
            <select
              value={netClientId}
              onChange={(e) => setNetClientId(e.target.value)}
              required
              className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-cyan-900/50 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors appearance-none shadow-sm"
            >
              <option value="" disabled>Selecione a Organização...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <div className="flex gap-4">
              <input
                type="text"
                value={netCidr}
                onChange={(e) => setNetCidr(e.target.value)}
                placeholder="Bloco CIDR (ex: 192.168.1.0/24)"
                required
                className="w-1/2 bg-white dark:bg-[#050914] border border-slate-200 dark:border-cyan-900/50 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors font-mono text-sm shadow-sm"
              />
              <input
                type="text"
                value={netDesc}
                onChange={(e) => setNetDesc(e.target.value)}
                placeholder="Descrição (ex: Matriz SP)"
                className="w-1/2 bg-white dark:bg-[#050914] border border-slate-200 dark:border-cyan-900/50 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors shadow-sm"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmittingNet || !netClientId}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" /> Vincular Rede
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#0a1128]/80 border border-slate-200 dark:border-cyan-900/40 rounded-xl overflow-hidden shadow-sm transition-colors duration-300">
          <div className="p-5 border-b border-slate-200 dark:border-cyan-900/40 bg-slate-50 dark:bg-cyan-950/10 flex items-center gap-2">
            <h2 className="font-semibold text-lg text-slate-800 dark:text-cyan-50">Redes Monitoradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-[#070d1e] text-slate-500 dark:text-cyan-600/70 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Organização</th>
                  <th className="px-5 py-3">Rede (CIDR)</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/30">
                {networks.length === 0 ? (
                  <tr><td colSpan={4} className="p-5 text-center text-slate-500 dark:text-cyan-600/70">Nenhuma rede vinculada.</td></tr>
                ) : (
                  networks.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-cyan-950/30 transition-colors">
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-200 font-medium">{n.client_name}</td>
                      <td className="px-5 py-4 text-blue-600 dark:text-cyan-400 font-mono">{n.cidr}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{n.description || '-'}</td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleDeleteNetwork(n.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors inline-flex" title="Remover Rede">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
