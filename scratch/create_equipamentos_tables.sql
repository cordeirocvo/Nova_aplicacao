-- Executar no Supabase SQL Editor para criar as tabelas do módulo de Equipamentos (Fase 2)
-- https://supabase.com/dashboard/project/eaidkelcmpcbgszakuww/sql

CREATE TABLE IF NOT EXISTS "InversorSolar" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fabricante" TEXT NOT NULL,
  "modelo" TEXT NOT NULL,
  "potenciaNominalKW" DOUBLE PRECISION NOT NULL,
  "tipoConexao" TEXT NOT NULL,
  "tensaoEntradaMinV" DOUBLE PRECISION,
  "tensaoEntradaMaxV" DOUBLE PRECISION,
  "correnteMaxCC" DOUBLE PRECISION,
  "numeroStringsMPPT" INTEGER,
  "potenciaMPPTKW" DOUBLE PRECISION,
  "tensaoSaidaVAC" DOUBLE PRECISION,
  "fatorPotencia" DOUBLE PRECISION,
  "eficiencia" DOUBLE PRECISION,
  "comunicacao" TEXT,
  "ipBD" TEXT,
  "datasheetUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ModuloFotovoltaico" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fabricante" TEXT NOT NULL,
  "modelo" TEXT NOT NULL,
  "potenciaPicoWp" DOUBLE PRECISION NOT NULL,
  "Vmp" DOUBLE PRECISION,
  "Imp" DOUBLE PRECISION,
  "Voc" DOUBLE PRECISION,
  "Isc" DOUBLE PRECISION,
  "eficiencia" DOUBLE PRECISION,
  "dimensoes" TEXT,
  "pesoKg" DOUBLE PRECISION,
  "coefTempVoc" DOUBLE PRECISION,
  "coefTempIsc" DOUBLE PRECISION,
  "garantiaAnos" INTEGER,
  "datasheetUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BateriaSistema" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fabricante" TEXT NOT NULL,
  "modelo" TEXT NOT NULL,
  "tecnologia" TEXT NOT NULL,
  "capacidadeNomKWh" DOUBLE PRECISION NOT NULL,
  "tensaoNominalV" DOUBLE PRECISION,
  "profundidadeDescarga" DOUBLE PRECISION,
  "ciclosVida" INTEGER,
  "correnteMaxCarga" DOUBLE PRECISION,
  "correnteMaxDescarga" DOUBLE PRECISION,
  "tempOperacaoMin" DOUBLE PRECISION,
  "tempOperacaoMax" DOUBLE PRECISION,
  "datasheetUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EstruturaFotovoltaica" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fabricante" TEXT NOT NULL,
  "modelo" TEXT NOT NULL,
  "tipoTelhado" TEXT NOT NULL,
  "materialEstrutura" TEXT,
  "cargaMaxVentoKNm2" DOUBLE PRECISION,
  "modulosMaxFileira" INTEGER,
  "anguloMin" DOUBLE PRECISION,
  "anguloMax" DOUBLE PRECISION,
  "datasheetUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  CREATE TRIGGER update_inversor_solar_updated_at BEFORE UPDATE ON "InversorSolar" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_modulo_fv_updated_at BEFORE UPDATE ON "ModuloFotovoltaico" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_bateria_sistema_updated_at BEFORE UPDATE ON "BateriaSistema" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_estrutura_fv_updated_at BEFORE UPDATE ON "EstruturaFotovoltaica" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
