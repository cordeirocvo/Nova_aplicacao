/**
 * Core Domain — Entidade e Tipos de Atividade de Instalação
 * Cordeiro Energia
 */

export interface Activity {
  id: string;
  instalacao?: string | null;
  solicitacao?: string | null;
  observacao?: string | null;
  obsInstalacao?: string | null;
  status?: string | null;
  vendedor?: string | null;
  telefoneCliente?: string | null;
  cidade?: string | null;
  dataPrevista?: string | null;
  automaticoPrevInstala?: string | null;
  telefoneVendedor?: string | null;
  anexoFotos: string[];
  anexoArquivos: string[];
  manualInstalacao: boolean;
  historico: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActivityDTO {
  instalacao?: string;
  solicitacao?: string;
  observacao?: string;
  obsInstalacao?: string;
  observacoes?: string;
  status?: string;
  vendedor?: string;
  telefoneCliente?: string;
  cidade?: string;
  dataPrevista?: string;
  telefoneVendedor?: string;
  anexoFotos?: string[];
  anexoArquivos?: string[];
}

export interface UpdateActivityDTO {
  instalacao?: string;
  solicitacao?: string;
  observacao?: string;
  obsInstalacao?: string;
  status?: string;
  vendedor?: string;
  telefoneCliente?: string;
  cidade?: string;
  dataPrevista?: string;
  telefoneVendedor?: string;
  anexoFotos?: string[];
  anexoArquivos?: string[];
}
