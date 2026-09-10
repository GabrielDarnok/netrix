"use client";

import React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen font-sans bg-[#02040a] text-slate-200 flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30">

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-cyan-900/20 blur-[100px] rounded-full pointer-events-none opacity-40"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="relative w-[200px] h-[80px] flex items-center justify-center">
              <img
                src="/logo.png"
                alt="NETRIX Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-[#050914]/80 backdrop-blur-md border border-cyan-900/40 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Acesso ao SOC</h1>
            <p className="text-sm text-slate-400">Insira suas credenciais para visualizar sua rede.</p>
          </div>

          <form className="space-y-5" onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/dashboard"
            });
          }}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-cyan-500/70 uppercase tracking-wider">E-mail corporativo</label>
              <input
                name="email"
                type="email"
                defaultValue="admin@netrix.com"
                className="w-full bg-[#0a1128] border border-cyan-900/50 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-cyan-500/70 uppercase tracking-wider">Senha</label>
                <a href="#" className="text-xs text-cyan-600 hover:text-cyan-400 transition-colors">Esqueceu?</a>
              </div>
              <input
                name="password"
                type="password"
                defaultValue="admin"
                className="w-full bg-[#0a1128] border border-cyan-900/50 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(8,145,178,0.2)] hover:shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all"
            >
              Entrar na Plataforma
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-cyan-900/30 text-center">
            <p className="text-sm text-slate-500">
              Nova empresa? <a href="#" className="text-cyan-400 hover:text-cyan-300 font-medium">Solicite acesso</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
