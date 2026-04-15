-- Executar no Supabase SQL Editor para criar as tabelas do módulo Engenharia
-- https://supabase.com/dashboard/project/eaidkelcmpcbgszakuww/sql

CREATE TABLE IF NOT EXISTS "ProjetoEngenharia" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "cliente" TEXT,
  "tipo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Rascunho',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AnaliseFatura" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projetoId" TEXT NOT NULL UNIQUE,
  "concessionaria" TEXT,
  "numeroInstalacao" TEXT,
  "cnpjCpfTitular" TEXT,
  "grupoTarifario" TEXT,
  "subgrupo" TEXT,
  "modalidadeTarifaria" TEXT,
  "classeConsumo" TEXT,
  "consumoMeses" JSONB,
  "consumoMedioMensalKWh" DOUBLE PRECISION,
  "consumoTotalAnualKWh" DOUBLE PRECISION,
  "demandaContratadaKW" DOUBLE PRECISION,
  "demandaMedidaHPKW" DOUBLE PRECISION,
  "demandaMedidaHFPKW" DOUBLE PRECISION,
  "temGeracao" BOOLEAN NOT NULL DEFAULT false,
  "geracaoTipos" TEXT,
  "geracaoInjetadaKWh" DOUBLE PRECISION,
  "tusd" DOUBLE PRECISION,
  "te" DOUBLE PRECISION,
  "tarifaHP" DOUBLE PRECISION,
  "tarifaHFP" DOUBLE PRECISION,
  "tarifaDemandaHP" DOUBLE PRECISION,
  "tarifaDemandaHFP" DOUBLE PRECISION,
  "valorUltimaFatura" DOUBLE PRECISION,
  "bandeiraTarifaria" TEXT,
  "rawPdfUrl" TEXT,
  "extraidoPorIA" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnaliseFatura_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "ProjetoEngenharia"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AnaliseMassaDados" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projetoId" TEXT NOT NULL,
  "rawXlsUrls" TEXT[] DEFAULT '{}',
  "nomeArquivos" TEXT[] DEFAULT '{}',
  "postoHP_inicio" TEXT DEFAULT '18:00',
  "postoHP_fim" TEXT DEFAULT '21:00',
  "postoHFP_inicio" TEXT DEFAULT '21:00',
  "postoHFP_fim" TEXT DEFAULT '18:00',
  "postoHR_inicio" TEXT,
  "postoHR_fim" TEXT,
  "diasUteisSemana" INTEGER[] DEFAULT '{1,2,3,4,5}',
  "periodoInicio" TIMESTAMP(3),
  "periodoFim" TIMESTAMP(3),
  "totalRegistros" INTEGER,
  "maxDemandaHP" DOUBLE PRECISION,
  "maxDemandaHFP" DOUBLE PRECISION,
  "maxDemandaHR" DOUBLE PRECISION,
  "maxDemandaTotal" DOUBLE PRECISION,
  "consumoHP_kWh" DOUBLE PRECISION,
  "consumoHFP_kWh" DOUBLE PRECISION,
  "consumoHR_kWh" DOUBLE PRECISION,
  "curvaMediaDiaria" JSONB,
  "curvaHP" JSONB,
  "curvaHFP" JSONB,
  "diaCriticoData" TIMESTAMP(3),
  "diaCriticoDemandaKW" DOUBLE PRECISION,
  "diaCriticoCurva" JSONB,
  "processado" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnaliseMassaDados_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "ProjetoEngenharia"("id") ON DELETE CASCADE
);

-- Trigger para atualizar updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_projeto_engenharia_updated_at BEFORE UPDATE ON "ProjetoEngenharia" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_analise_fatura_updated_at BEFORE UPDATE ON "AnaliseFatura" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_analise_massa_updated_at BEFORE UPDATE ON "AnaliseMassaDados" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
