<p align="center">
  <img src="public/logo.png" width="80" alt="Netrix Logo" />
</p>

<h1 align="center">Netrix</h1>
<p align="center">
  <strong>Network Detection & Response (NDR)</strong><br/>
  Plataforma de monitoramento de rede, detecção de ameaças e resposta a incidentes em tempo real.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss" alt="Tailwind" />
</p>

---

## 📖 Sobre

O **Netrix** é uma plataforma NDR (Network Detection & Response) que transforma dados brutos de NetFlow/sFlow coletados pelo [pmacct](http://www.pmacct.net/) em inteligência de rede acionável. Ideal para equipes de SOC e administradores de rede que precisam de visibilidade total sobre o tráfego interno e externo da organização.

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | KPIs em tempo real (PPS, volume, saúde da rede), gráficos de série temporal contínua, feed de ameaças ao vivo |
| **Hosts** | Inventário automático de hosts, perfil comportamental com baseline estatístico, detecção de desvios |
| **Serviços** | Descoberta automática de serviços hospedados na rede (SSH, HTTP, DNS, etc.) com análise de risco |
| **Segurança** | Motor NDR com 3 regras de detecção: anomalia de volume, flags TCP anômalas (SYN Flood, XMAS Scan) e dispersão (port scan) |
| **Explorer** | Busca livre no tráfego por IP, protocolo, porta e período com gráficos interativos |
| **Threat Intel** | Cruzamento automático com feeds de Threat Intelligence e AbuseIPDB |
| **Alertas** | Workflow de resolução de incidentes com supressão temporária e integração com Telegram |
| **Multi-tenant** | Suporte a múltiplas organizações com redes (CIDRs) segregadas |

## 🛠 Stack Tecnológica

- **Frontend:** Next.js 16 (App Router) · React 19 · TailwindCSS 4 · Recharts
- **Backend:** Next.js Server Actions · PostgreSQL · NextAuth.js v5
- **Coletor:** pmacct (NetFlow v5/v9, sFlow, IPFIX)
- **Integrações:** Telegram Bot API · AbuseIPDB · WHOIS

## 📋 Pré-requisitos

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14
- **pmacct** configurado para coletar NetFlow/sFlow e gravar na tabela `flows`

## 🚀 Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/netrix.git
cd netrix

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite o .env.local com as credenciais do seu banco

# 4. Execute o setup do banco de dados
npm run setup

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com:
- **Email:** `admin@netrix.com`
- **Senha:** `admin`

> ⚠️ Troque a senha padrão imediatamente após o primeiro login.

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `AUTH_SECRET` | Chave secreta para JWT/sessões (gere com `openssl rand -base64 32`) | ✅ |
| `DB_HOST` | Host do PostgreSQL | ✅ |
| `DB_PORT` | Porta do PostgreSQL (padrão: 5432) | |
| `DB_NAME` | Nome do banco de dados (padrão: flowdb) | ✅ |
| `DB_USER` | Usuário do PostgreSQL | ✅ |
| `DB_PASS` | Senha do PostgreSQL | ✅ |
| `TELEGRAM_BOT_TOKEN` | Token do bot do Telegram para alertas | |

## 📁 Estrutura do Projeto

```
netrix/
├── scripts/                 # Setup e diagnóstico do banco
│   ├── setup-db.js          # Criação de tabelas e usuário admin
│   ├── check-schema.js      # Listagem de tabelas e colunas
│   └── schema.sql           # DDL completo (referência)
├── src/
│   ├── app/
│   │   ├── dashboard/       # Páginas do painel principal
│   │   │   ├── explorer/    # Busca avançada no tráfego
│   │   │   ├── hosts/       # Inventário e perfil de hosts
│   │   │   ├── security/    # Motor NDR e alertas
│   │   │   └── services/    # Serviços hospedados
│   │   ├── admin/           # Administração multi-tenant
│   │   └── login/           # Autenticação
│   ├── components/          # Componentes reutilizáveis (Sidebar, Modais)
│   └── lib/
│       ├── actions/         # Server Actions (queries PostgreSQL)
│       ├── cron/            # Notificador Telegram
│       ├── utils/           # Utilitários (rede, senhas, análise de serviços)
│       └── db.ts            # Pool de conexões PostgreSQL
├── .env.example             # Template de variáveis de ambiente
└── package.json
```

## 🔒 Segurança

- Autenticação via NextAuth.js v5 com JWT
- Senhas hasheadas com `scrypt` (salt de 16 bytes + chave de 64 bytes)
- Queries parametrizadas (sem SQL injection)
- Middleware protege todas as rotas `/dashboard/*` e `/admin/*`

## 📄 Licença

Este projeto não possui licença definida. Todos os direitos reservados.
