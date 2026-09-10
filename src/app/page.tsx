import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans bg-[#02040a] text-slate-200 selection:bg-cyan-500/30 overflow-hidden">

      {/* GLOW BACKGROUND EFFECT */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>

      {/* HEADER */}
      <header className="relative z-10 flex items-center justify-between px-8 md:px-16 py-6">
        <div className="flex items-center gap-6">
          <div className="relative w-[180px] h-[60px] flex items-center justify-center">
            <img
              src="/logo.png"
              alt="NETRIX Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-cyan-400 transition-colors">Recursos</a>
          <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">Como Funciona</a>
          <a href="#contact" className="hover:text-cyan-400 transition-colors">Contato</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 bg-transparent border border-cyan-800 text-cyan-400 rounded-lg text-sm font-semibold hover:bg-cyan-950/40 transition-all shadow-sm flex items-center gap-2"
          >
            Acessar Plataforma
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center">

        {/* HERO SECTION */}
        <section className="w-full max-w-6xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-800/50 text-cyan-400 text-xs font-mono font-medium mb-8 shadow-[0_0_15px_rgba(8,145,178,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            NETRIX NDR v2.0 - Early Access
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
            Visibilidade e Mapeamento <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_25px_rgba(6,182,212,0.2)]">
              Para Redes Modernas
            </span>
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            Monitoramento de NetFlow em tempo real impulsionado por Machine Learning.
            Detecte anomalias, desvios de trafego e ameaças em sua rede.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 rounded-xl text-white font-bold text-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] transform hover:-translate-y-1"
            >
              Iniciar Análise Agora
            </Link>
            <button className="px-8 py-4 bg-[#0a1128] border border-cyan-900 rounded-xl text-cyan-100 font-semibold text-lg hover:bg-cyan-950 transition-all">
              Agendar Demonstração
            </button>
          </div>
        </section>

        {/* MOCKUP PREVIEW IMAGE (ILLUSTRATION) */}
        <section className="w-full max-w-6xl mx-auto px-6 pb-32">
          <div className="relative rounded-2xl border border-cyan-900/50 bg-[#050914]/80 p-2 shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#02040a] z-10 pointer-events-none"></div>
            {/* Fake dashboard header for visual effect */}
            <div className="h-10 border-b border-cyan-900/40 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            {/* Some fake code/metrics */}
            <div className="p-8 grid grid-cols-3 gap-6 opacity-60">
              <div className="h-32 rounded-lg bg-cyan-950/20 border border-cyan-900/30"></div>
              <div className="h-32 rounded-lg bg-cyan-950/20 border border-cyan-900/30"></div>
              <div className="h-32 rounded-lg bg-cyan-950/20 border border-cyan-900/30"></div>
              <div className="col-span-2 h-64 rounded-lg bg-cyan-950/20 border border-cyan-900/30"></div>
              <div className="h-64 rounded-lg bg-cyan-950/20 border border-cyan-900/30"></div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="w-full bg-[#050914] border-t border-cyan-900/30 pt-24 pb-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">O Motor do NETRIX</h2>
              <p className="text-slate-400 max-w-xl mx-auto">Nossa arquitetura SaaS B2B permite que múltiplos clientes (tenants) isolem e monitorem seu tráfego de rede com precisão absoluta.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-[#02040a] p-8 rounded-2xl border border-cyan-900/20 hover:border-cyan-700/50 transition-colors group">
                <div className="w-12 h-12 bg-cyan-950/50 rounded-xl flex items-center justify-center mb-6 border border-cyan-800/30 text-cyan-400 group-hover:bg-cyan-900 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-100">Baseline Inteligente</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  O sistema aprende o comportamento normal da sua rede ao longo de dias e semanas. Utilizando o Algoritmo Z-Score, detectamos desvios matematicamente significativos.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#02040a] p-8 rounded-2xl border border-cyan-900/20 hover:border-cyan-700/50 transition-colors group">
                <div className="w-12 h-12 bg-red-950/30 rounded-xl flex items-center justify-center mb-6 border border-red-900/30 text-red-400 group-hover:bg-red-900/50 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-100">Alertas Ativos</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Integração nativa com SOCs via Telegram, E-mail ou Webhooks. Saiba quando um host interno inicia escaneamento de portas ou exfiltração de dados instantaneamente.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#02040a] p-8 rounded-2xl border border-cyan-900/20 hover:border-cyan-700/50 transition-colors group">
                <div className="w-12 h-12 bg-purple-950/30 rounded-xl flex items-center justify-center mb-6 border border-purple-900/30 text-purple-400 group-hover:bg-purple-900/50 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-3 6-3s4 2 6 3a1 1 0 0 1 1 1z" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-100">Multi-Tenancy Nativo</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Design B2B pronto para a nuvem. Encaminhe o tráfego NetFlow dos seus roteadores para a NETRIX, e nós separamos de forma segura os dados por Client ID.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-cyan-900/30 bg-[#02040a] py-12 text-center text-slate-500 text-sm">
        <p>© 2026 NETRIX Security Operations. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
