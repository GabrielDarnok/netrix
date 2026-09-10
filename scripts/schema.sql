-- =============================================
-- Netrix — Database Schema
-- =============================================
-- This file documents the full PostgreSQL schema
-- required by the Netrix platform.
--
-- The `flows` table is automatically managed by
-- pmacct (the NetFlow/sFlow collector).
-- =============================================

-- ─── Flows (managed by pmacct) ──────────────
-- This table is created/populated by pmacct.
-- Shown here for reference only.
/*
CREATE TABLE IF NOT EXISTS flows (
    stamp_inserted  TIMESTAMPTZ NOT NULL,
    stamp_updated   TIMESTAMPTZ,
    ip_src          INET,
    ip_dst          INET,
    port_src        INTEGER,
    port_dst        INTEGER,
    ip_proto        SMALLINT,
    tcp_flags       INTEGER,
    packets         BIGINT,
    bytes           BIGINT
);
*/

-- ─── Users ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'admin',
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Clients (Tenants / Organizations) ──────
CREATE TABLE IF NOT EXISTS clients (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    telegram_chat_id VARCHAR
);

-- ─── Networks (CIDRs per client) ────────────
CREATE TABLE IF NOT EXISTS networks (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    cidr            CIDR NOT NULL,
    label           VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Host Profile (behavioral baselines) ────
CREATE TABLE IF NOT EXISTS host_profile (
    ip              INET PRIMARY KEY,
    role            VARCHAR(100),
    tags            JSONB DEFAULT '[]'::jsonb,
    nivel_alerta    VARCHAR(50) DEFAULT 'normal',
    total_portas_dst INTEGER DEFAULT 0,
    total_paises    INTEGER DEFAULT 0,
    pct_udp         REAL DEFAULT 0,
    frequencia      REAL DEFAULT 0,
    volume_total    BIGINT DEFAULT 0,
    baseline_freq_media   REAL,
    baseline_freq_stddev  REAL,
    baseline_confianca    VARCHAR(20),
    sensibilidade   VARCHAR(20) DEFAULT 'media',
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Alert Cases (incident resolution log) ──
CREATE TABLE IF NOT EXISTS alert_cases (
    id              SERIAL PRIMARY KEY,
    alert_hash      VARCHAR(64),
    host_ip         VARCHAR(50),
    titulo          VARCHAR(255),
    categoria       VARCHAR(100),
    justificativa   TEXT,
    baseline_flag   BOOLEAN DEFAULT FALSE,
    operador        VARCHAR(100) DEFAULT 'dashboard',
    finalizado_em   TIMESTAMPTZ,
    expira_em       TIMESTAMPTZ,
    fonte           VARCHAR(100),
    prioridade      VARCHAR(50)
);

-- ─── Threat Intel (external threat feeds) ───
CREATE TABLE IF NOT EXISTS threat_intel (
    ip              INET PRIMARY KEY,
    fontes          VARCHAR(255),
    categorias      TEXT,
    score           INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Threat Cache (AbuseIPDB enrichment) ────
CREATE TABLE IF NOT EXISTS threat_cache (
    ip              INET PRIMARY KEY,
    score           INTEGER,
    total_reportes  INTEGER,
    ultimo_reporte  TIMESTAMPTZ,
    categorias      TEXT,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── GeoIP Cache ────────────────────────────
CREATE TABLE IF NOT EXISTS geoip_cache (
    ip              INET PRIMARY KEY,
    country         VARCHAR(10),
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── WHOIS Cache ────────────────────────────
CREATE TABLE IF NOT EXISTS whois_cache (
    ip              INET PRIMARY KEY,
    data_json       JSONB,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
