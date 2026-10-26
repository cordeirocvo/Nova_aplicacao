"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Zap,
  ShieldCheck,
  Box,
  Flame,
  Plus,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
  Percent,
  CheckCircle2,
  Info,
  Sliders,
  Sparkles,
  TableProperties,
  Shield,
  Wrench,
  HardHat,
  Cpu,
  Truck,
  DollarSign,
  ArrowRight
} from "lucide-react";
import {
  ModularBOMOutput,
  ModularBOMStage,
  ModularBOMItem,
  InstallationStageId,
  LaborCalculationMode,
  STAGE_METADATA
} from "@/lib/coenergygo/engines/modularBomEngine";

export type ActiveBOMTab = "CONSOLIDADA" | InstallationStageId;

export interface CatalogItemRef {
  codigo?: string;
  descricao: string;
  categoria?: string;
  unidade?: string;
  precoUnitario: number;
  fornecedor?: string;
  source?: string;
}

interface EVModularBOMTableProps {
  modularBOM: ModularBOMOutput;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateUnitPrice: (itemId: string, unitPrice: number) => void;
  onDeleteItem: (itemId: string) => void;
  onRestoreOriginal: () => void;
  hasModifications: boolean;
  globalBdiPercent: number;
  onUpdateGlobalBdiPercent: (bdi: number) => void;
  laborPercent: number;
  onUpdateLaborPercent: (labor: number) => void;
  laborMode?: LaborCalculationMode;
  onUpdateLaborMode?: (mode: LaborCalculationMode) => void;
  onUpdateStageLaborMode?: (stageId: InstallationStageId, mode: LaborCalculationMode) => void;
  onUpdateStageLaborAmount?: (stageId: InstallationStageId, amount: number) => void;
  onAddNewCustomItem: (newItem: {
    descricao: string;
    unidade: string;
    tipo: string;
    stageId: InstallationStageId;
    quantidade: number;
    precoManual?: number;
  }) => Promise<void>;
  availableCatalogItems?: CatalogItemRef[];
  isSyncingCapex?: boolean;
  syncedOrcamentoId?: string;
  onExportCSV: () => void;
  onRefreshCapexPrices?: () => void;
  onNavigateToFinancialModeling?: () => void;
}

const STAGE_ORDER_LIST: InstallationStageId[] = [
  "ETAPA_1_PADRAO_CEMIG",
  "ETAPA_2_TRECHO_1_PADRAO_220V",
  "ETAPA_3_PAINEL_220V",
  "ETAPA_4_TRECHO_2_220V_TRAFO",
  "ETAPA_5_SUBESTACAO_TRAFO",
  "ETAPA_6_TRECHO_3_TRAFO_380V",
  "ETAPA_7_PAINEL_380V_QGBT",
  "ETAPA_8_TRECHO_4_RAMAIS_VE",
  "ETAPA_9_PONTO_RECARGA",
  "ETAPA_10_SEGURANCA_EMERGENCIA"
];

const DEFAULT_FALLBACK_CATALOG_ITEMS: CatalogItemRef[] = [
  { codigo: "SRV-MONTAGEM-PADRAO", descricao: "Mão de Obra de Instalação e Montagem Especializada do Padrão de Entrada", categoria: "Mão de Obra", unidade: "sv", precoUnitario: 10000.0, fornecedor: "Cordeiro Engenharia", source: "CAPEX_DB" },
  { codigo: "SRV-PROJETO-CEMIG", descricao: "Projeto Elétrico de Entrada de Serviço e Homologação CEMIG (ART Inclusa)", categoria: "Mão de Obra", unidade: "sv", precoUnitario: 1500.0, fornecedor: "Cordeiro Engenharia", source: "CAPEX_DB" },
  { codigo: "SRV-VISTORIA-CEMIG", descricao: "Acompanhamento Técnico de Vistoria e Homologação na CEMIG", categoria: "Mão de Obra", unidade: "sv", precoUnitario: 450.0, fornecedor: "Cordeiro Engenharia", source: "CAPEX_DB" },
  { codigo: "MAT-BASE-CONCRETO", descricao: "Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)", categoria: "Civil / Padrão", unidade: "cj", precoUnitario: 220.0, fornecedor: "Distribuidor Local Materiais de Construção", source: "CEMIG_DB" },
  { codigo: "KIT-PADRAO-CM09-CM04", descricao: "Conjunto Padrão Caixa CM-09 + Caixa CM-04 com Barramento sem disjuntor", categoria: "Padrão de Entrada", unidade: "cj", precoUnitario: 1250.0, fornecedor: "Strahl / Cemar (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "KIT-PADRAO-CM18-CM04", descricao: "Conjunto Padrão Caixa CM-18 + Caixa CM-04 com Barramento sem disjuntor", categoria: "Padrão de Entrada", unidade: "cj", precoUnitario: 1480.0, fornecedor: "Strahl / Cemar (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "TERM-COMPRESSAO-120", descricao: "Terminal Olhal de Compressão em Cobre Estanhado 120 mm² para Cabos de Fase e Neutro (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 24.0, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "TERM-COMPRESSAO-70", descricao: "Terminal Olhal de Compressão em Cobre Estanhado 70 mm² para Cabo de Proteção / Terra (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 15.5, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "TERM-TUBULAR-120", descricao: "Terminal Tubular em Cobre Estanhado 120 mm² para Cabos de Fase e Neutro (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 21.6, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "TERM-TUBULAR-70", descricao: "Terminal Tubular em Cobre Estanhado 70 mm² para Cabo de Proteção / Terra (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 13.95, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "ELETRODUTO-ACO-GALV-FOGO-80", descricao: "Eletroduto de Aço Carbono Galvanizado a Fogo NBR 5598 Ø 80 mm (3\") - Barra 3m", categoria: "Eletrodutos", unidade: "br", precoUnitario: 220.0, fornecedor: "Apolo Tubos / Tuper (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "ELETRODUTO-ACO-GALV-FOGO-100", descricao: "Eletroduto de Aço Carbono Galvanizado a Fogo NBR 5598 Ø 100 mm (4\") - Barra 3m", categoria: "Eletrodutos", unidade: "br", precoUnitario: 295.0, fornecedor: "Apolo Tubos / Tuper (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "CURVA-90-ACO-GALV-FOGO-80", descricao: "Curva 90º de Aço Galvanizado a Fogo Roscável Ø 80 mm (3\")", categoria: "Eletrodutos", unidade: "un", precoUnitario: 95.0, fornecedor: "Apolo Tubos / Daisa", source: "CEMIG_DB" },
  { codigo: "CURVA-90-ACO-GALV-FOGO-100", descricao: "Curva 90º de Aço Galvanizado a Fogo Roscável Ø 100 mm (4\")", categoria: "Eletrodutos", unidade: "un", precoUnitario: 145.0, fornecedor: "Apolo Tubos / Daisa", source: "CEMIG_DB" },
  { codigo: "MAT-MASSA-CALAFETAR-1KG", descricao: "Massa de Calafetar para Vedação contra Umidade (Embalagem 1 kg) - Norma CEMIG ND-5.1", categoria: "Acessórios", unidade: "kg", precoUnitario: 28.0, fornecedor: "Poliplás / Vedacit", source: "CEMIG_DB" },
  { codigo: "FITA-FUSIMEC-ALTA-ISOLACAO", descricao: "Fita de Autofusão Fusimec para Alta Isolação Dielétrica", categoria: "Acessórios", unidade: "m", precoUnitario: 16.5, fornecedor: "3M / Fusimec", source: "CEMIG_DB" },
  { codigo: "PRESILHA-FITA-FUSIMEC", descricao: "Presilha Metálica para Fixação e Amarração de Fita Fusimec", categoria: "Acessórios", unidade: "un", precoUnitario: 2.5, fornecedor: "Fusimec / Intelli", source: "CEMIG_DB" },
  { codigo: "CX-SUBTERRANEA-ZA", descricao: "Caixa Subterrânea de Passagem Tipo ZA em Alvenaria/Concreto (30 x 30 x 40 cm - Norma CEMIG ND-5.1)", categoria: "Infraestrutura", unidade: "un", precoUnitario: 280.0, fornecedor: "Pré-Moldados / Alvenaria CEMIG", source: "CEMIG_DB" },
  { codigo: "TAMPA-FOFO-ZA", descricao: "Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZA (Padrão CEMIG)", categoria: "Infraestrutura", unidade: "un", precoUnitario: 210.0, fornecedor: "Fundição Homologada CEMIG", source: "CEMIG_DB" },
  { codigo: "CX-SUBTERRANEA-ZB", descricao: "Caixa Subterrânea de Passagem Tipo ZB em Alvenaria/Concreto (50 x 50 x 60 cm - Norma CEMIG ND-5.1)", categoria: "Infraestrutura", unidade: "un", precoUnitario: 420.0, fornecedor: "Pré-Moldados / Alvenaria CEMIG", source: "CEMIG_DB" },
  { codigo: "TAMPA-FOFO-ZB", descricao: "Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZB (Padrão CEMIG)", categoria: "Infraestrutura", unidade: "un", precoUnitario: 320.0, fornecedor: "Fundição Homologada CEMIG", source: "CEMIG_DB" },
  { codigo: "NIPLE-PVC-ROSCAVEL-60", descricao: "Niple Roscável de PVC Rígido Ø 60 mm (2\") para Acoplamento de Caixas", categoria: "Eletrodutos", unidade: "un", precoUnitario: 19.0, fornecedor: "Tigre / Amanco", source: "CEMIG_DB" },
  { codigo: "NIPLE-PVC-ROSCAVEL-80", descricao: "Niple Roscável de PVC Rígido Ø 80 mm (3\") para Acoplamento de Caixas", categoria: "Eletrodutos", unidade: "un", precoUnitario: 24.0, fornecedor: "Tigre / Amanco", source: "CEMIG_DB" },
  { codigo: "NIPLE-PVC-ROSCAVEL-100", descricao: "Niple Roscável de PVC Rígido Ø 100 mm (4\") para Acoplamento de Caixas", categoria: "Eletrodutos", unidade: "un", precoUnitario: 36.0, fornecedor: "Tigre / Amanco", source: "CEMIG_DB" },
  { codigo: "BUCHA-ARRUELA-PVC-80", descricao: "Conjunto Bucha e Arruela de PVC Roscável Ø 80 mm (3\") para Terminação de Eletroduto", categoria: "Eletrodutos", unidade: "cj", precoUnitario: 32.0, fornecedor: "Tigre / Daisa", source: "CEMIG_DB" },
  { codigo: "BUCHA-ARRUELA-PVC-100", descricao: "Conjunto Bucha e Arruela de PVC Roscável Ø 100 mm (4\") para Terminação de Eletroduto", categoria: "Eletrodutos", unidade: "cj", precoUnitario: 45.0, fornecedor: "Tigre / Daisa", source: "CEMIG_DB" },
  { codigo: "TERM-COMPRESSAO-35", descricao: "Terminal Olhal de Compressão em Cobre Estanhado 35 mm² para Cabos de Fase e Neutro (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 8.5, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "TERM-COMPRESSAO-16", descricao: "Terminal Olhal de Compressão em Cobre Estanhado 16 mm² para Cabos de Fase e Neutro (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 4.5, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "TERM-TUBULAR-35", descricao: "Terminal Tubular em Cobre Estanhado 35 mm² para Cabos de Fase e Neutro (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 7.65, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "TERM-TUBULAR-16", descricao: "Terminal Tubular em Cobre Estanhado 16 mm² para Cabos de Fase e Neutro (com Termoencolhível)", categoria: "Acessórios", unidade: "pç", precoUnitario: 4.05, fornecedor: "Intelli / Magnet", source: "CAPEX_DB" },
  { codigo: "CAB-COP-16-PT", descricao: "Cabo de Cobre 16mm² 0,6/1kV Fase (Preto)", categoria: "Condutores", unidade: "m", precoUnitario: 18.5, fornecedor: "Prysmian / Sil (Homologado)", source: "CAPEX_DB" },
  { codigo: "CAB-COP-16-AZ", descricao: "Cabo de Cobre 16mm² 0,6/1kV Neutro (Azul Claro)", categoria: "Condutores", unidade: "m", precoUnitario: 18.5, fornecedor: "Prysmian / Sil (Homologado)", source: "CAPEX_DB" },
  { codigo: "CAB-COP-16-VD", descricao: "Cabo de Cobre 16mm² 0,6/1kV Terra / Proteção (Verde)", categoria: "Condutores", unidade: "m", precoUnitario: 18.5, fornecedor: "Prysmian / Sil (Homologado)", source: "CAPEX_DB" },
  { codigo: "CAB-COP-35-PT", descricao: "Cabo de Cobre 35mm² 0,6/1kV Fase (Preto)", categoria: "Condutores", unidade: "m", precoUnitario: 38.0, fornecedor: "Prysmian / Sil (Homologado)", source: "CAPEX_DB" },
  { codigo: "CAB-COP-35-AZ", descricao: "Cabo de Cobre 35mm² 0,6/1kV Neutro (Azul Claro)", categoria: "Condutores", unidade: "m", precoUnitario: 38.0, fornecedor: "Prysmian / Sil (Homologado)", source: "CAPEX_DB" },
  { codigo: "CAB-COP-35-VD", descricao: "Cabo de Cobre 35mm² 0,6/1kV Terra / Proteção (Verde)", categoria: "Condutores", unidade: "m", precoUnitario: 38.0, fornecedor: "Prysmian / Sil (Homologado)", source: "CAPEX_DB" },
  { codigo: "CAB-COP-70-PT", descricao: "Cabo de Cobre 70mm² 0,6/1kV Fase (Preto)", categoria: "Condutores", unidade: "m", precoUnitario: 72.0, fornecedor: "Prysmian / Cobrecom", source: "CAPEX_DB" },
  { codigo: "CAB-COP-70-AZ", descricao: "Cabo de Cobre 70mm² 0,6/1kV Neutro (Azul Claro)", categoria: "Condutores", unidade: "m", precoUnitario: 72.0, fornecedor: "Prysmian / Cobrecom", source: "CAPEX_DB" },
  { codigo: "CAB-COP-70-VD", descricao: "Cabo de Cobre 70mm² 0,6/1kV Terra / Proteção (Verde)", categoria: "Condutores", unidade: "m", precoUnitario: 72.0, fornecedor: "Prysmian / Cobrecom", source: "CAPEX_DB" },
  { codigo: "CAB-COP-120-PT", descricao: "Cabo de Cobre 120mm² 0,6/1kV Fase (Preto)", categoria: "Condutores", unidade: "m", precoUnitario: 124.0, fornecedor: "Prysmian / Induscabos", source: "CAPEX_DB" },
  { codigo: "CAB-COP-120-AZ", descricao: "Cabo de Cobre 120mm² 0,6/1kV Neutro (Azul Claro)", categoria: "Condutores", unidade: "m", precoUnitario: 124.0, fornecedor: "Prysmian / Induscabos", source: "CAPEX_DB" },
  { codigo: "CAB-COP-120-VD", descricao: "Cabo de Cobre 120mm² 0,6/1kV Terra / Proteção (Verde)", categoria: "Condutores", unidade: "m", precoUnitario: 124.0, fornecedor: "Prysmian / Induscabos", source: "CAPEX_DB" },
  { codigo: "DUTO-PEAD-2POL", descricao: "Eletroduto Corrugado PEAD Reforçado Ø 2\" (60mm)", categoria: "Infraestrutura", unidade: "m", precoUnitario: 18.0, fornecedor: "Tigre / Kanaflex", source: "CAPEX_DB" },
  { codigo: "DUTO-PEAD-3POL", descricao: "Eletroduto Corrugado PEAD Reforçado Ø 3\" (85mm)", categoria: "Infraestrutura", unidade: "m", precoUnitario: 29.5, fornecedor: "Tigre / Kanaflex", source: "CAPEX_DB" },
  { codigo: "DUTO-PEAD-4POL", descricao: "Eletroduto Corrugado PEAD Reforçado Ø 4\" (110mm)", categoria: "Infraestrutura", unidade: "m", precoUnitario: 44.0, fornecedor: "Tigre / Kanaflex", source: "CAPEX_DB" },
  { codigo: "DISJ-MCCB-100A", descricao: "Disjuntor Caixa Moldada 100A Tripolar Curva C/D (Icu 25kA)", categoria: "Proteção", unidade: "un", precoUnitario: 680.0, fornecedor: "WEG DWB (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "DISJ-MCCB-250A", descricao: "Disjuntor Caixa Moldada 250A Tripolar Curva C/D (Icu 25kA)", categoria: "Proteção", unidade: "un", precoUnitario: 1450.0, fornecedor: "WEG DWB (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "DISJ-DIN-3P-40A", descricao: "Disjuntor Termomagnético DIN 3P 40A Curva C (Icu 10kA)", categoria: "Proteção", unidade: "un", precoUnitario: 98.0, fornecedor: "WEG MDW (Homologado CEMIG)", source: "CEMIG_DB" },
  { codigo: "DR-4P-40A-TIPOB", descricao: "Interruptor Diferencial Residual (DR) 4P 40A / 30mA Tipo B (Imunidade DC > 6mA)", categoria: "Proteção", unidade: "un", precoUnitario: 890.0, fornecedor: "Schneider / WEG (NBR 17019)", source: "CAPEX_DB" },
  { codigo: "DPS-CL2-45KA", descricao: "Dispositivo de Proteção contra Surtos (DPS) Classe II 45kA 275V", categoria: "Proteção", unidade: "un", precoUnitario: 105.0, fornecedor: "Clamper VCL (Homologado)", source: "CAPEX_DB" },
  { codigo: "TRAFO-SECO-112", descricao: "Transformador a Seco 112,5 kVA 220V/380V Dyn1 Yn com Blindagem Eletrostática e Sondas PT100", categoria: "Transformador", unidade: "un", precoUnitario: 24500.0, fornecedor: "Trael / WEG / Romagnole", source: "CAPEX_DB" },
  { codigo: "BOTAO-EMERG-COG", descricao: "Botão de Emergência Cogumelo com Trava Giratória + Bobina MX 220V (NBR 17019)", categoria: "Segurança", unidade: "un", precoUnitario: 480.0, fornecedor: "Schneider / WEG", source: "CAPEX_DB" },
  { codigo: "EXTINTOR-CO2-6KG", descricao: "Extintor de Incêndio CO2 6kg com Suporte e Placa Fotoluminescente (IT-41 CBMMG)", categoria: "Segurança", unidade: "un", precoUnitario: 380.0, fornecedor: "Bucka / Kidde", source: "CAPEX_DB" },
  { codigo: "BOLLARD-ACO-TUB", descricao: "Bate-rodas (Bollard) Tubular de Aço Ø 4\" com Pintura Eletrostática Amarela/Preta", categoria: "Segurança", unidade: "un", precoUnitario: 320.0, fornecedor: "Metalúrgica Homologada", source: "CAPEX_DB" }
];

export function EVModularBOMTable({
  modularBOM,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onDeleteItem,
  onRestoreOriginal,
  hasModifications,
  globalBdiPercent,
  onUpdateGlobalBdiPercent,
  laborPercent,
  onUpdateLaborPercent,
  laborMode = "TABELADO",
  onUpdateLaborMode,
  onUpdateStageLaborMode,
  onUpdateStageLaborAmount,
  onAddNewCustomItem,
  availableCatalogItems = [],
  isSyncingCapex = false,
  syncedOrcamentoId,
  onExportCSV,
  onRefreshCapexPrices,
  onNavigateToFinancialModeling
}: EVModularBOMTableProps) {
  // Aba ativa selecionada pelo usuário (Consolidada ou uma das 10 etapas físicas)
  const [activeTab, setActiveTab] = useState<ActiveBOMTab>("CONSOLIDADA");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal para adicionar material (Buscar no Catálogo vs Criar Novo Web)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"buscar_catalogo" | "novo_web">("buscar_catalogo");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>("TODOS");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItemRef | null>(null);
  const [catalogQuantity, setCatalogQuantity] = useState<number>(1);
  const [catalogTargetStage, setCatalogTargetStage] = useState<InstallationStageId>("ETAPA_1_PADRAO_CEMIG");
  const [isSubmittingNewItem, setIsSubmittingNewItem] = useState<boolean>(false);

  const [newItemForm, setNewItemForm] = useState<{
    descricao: string;
    unidade: string;
    tipo: string;
    stageId: InstallationStageId;
    quantidade: number;
    precoManual: string;
  }>({
    descricao: "",
    unidade: "un",
    tipo: "Material",
    stageId: "ETAPA_1_PADRAO_CEMIG",
    quantidade: 1,
    precoManual: ""
  });

  // Abre modal já selecionando a etapa atual se for uma etapa específica
  const handleOpenAddModal = (presetStage?: InstallationStageId) => {
    const targetStage = presetStage || (activeTab === "CONSOLIDADA" ? "ETAPA_1_PADRAO_CEMIG" : activeTab);
    setNewItemForm((prev) => ({
      ...prev,
      stageId: targetStage
    }));
    setCatalogTargetStage(targetStage);
    setSelectedCatalogItem(null);
    setCatalogQuantity(1);
    setCatalogSearchQuery("");
    setSelectedCatalogCategory("TODOS");
    setModalMode("buscar_catalogo");
    setShowAddModal(true);
  };

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.descricao.trim()) return;

    setIsSubmittingNewItem(true);
    try {
      await onAddNewCustomItem({
        descricao: newItemForm.descricao.trim(),
        unidade: newItemForm.unidade.trim() || "un",
        tipo: newItemForm.tipo,
        stageId: newItemForm.stageId,
        quantidade: Number(newItemForm.quantidade) || 1,
        precoManual: newItemForm.precoManual ? Number(newItemForm.precoManual) : undefined
      });

      setShowAddModal(false);
      setNewItemForm({
        descricao: "",
        unidade: "un",
        tipo: "Material",
        stageId: activeTab === "CONSOLIDADA" ? "ETAPA_1_PADRAO_CEMIG" : activeTab,
        quantidade: 1,
        precoManual: ""
      });
    } catch (err) {
      console.error("Erro ao adicionar item customizado:", err);
    } finally {
      setIsSubmittingNewItem(false);
    }
  };

  const handleAddCatalogItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem) return;

    setIsSubmittingNewItem(true);
    try {
      await onAddNewCustomItem({
        descricao: `${selectedCatalogItem.descricao}${selectedCatalogItem.codigo ? ` (${selectedCatalogItem.codigo})` : ""}`,
        unidade: selectedCatalogItem.unidade || "un",
        tipo: selectedCatalogItem.categoria || "Material",
        stageId: catalogTargetStage,
        quantidade: catalogQuantity,
        precoManual: selectedCatalogItem.precoUnitario
      });

      setShowAddModal(false);
      setSelectedCatalogItem(null);
    } catch (err) {
      console.error("Erro ao adicionar item do catálogo:", err);
    } finally {
      setIsSubmittingNewItem(false);
    }
  };

  // Mapa rápido de estágios indexados por stageId com suporte a alias
  const stagesById = useMemo(() => {
    const map = new Map<InstallationStageId, ModularBOMStage>();
    modularBOM.stages.forEach((st) => {
      map.set(st.stageId, st);
      if (st.stageId === "ETAPA_9_PONTO_RECARGA") {
        map.set("ETAPA_9_PONTO_RECARGA_SEGURANCA", st);
      }
    });
    return map;
  }, [modularBOM.stages]);

  // Catálogo combinado (CAPEX / CEMIG do backend + itens de referência padrão)
  const combinedCatalog = useMemo(() => {
    const list: CatalogItemRef[] = [...(availableCatalogItems || [])];
    const existingCodes = new Set(list.map((it) => (it.codigo || "").toUpperCase()));

    DEFAULT_FALLBACK_CATALOG_ITEMS.forEach((def) => {
      if (def.codigo && !existingCodes.has(def.codigo.toUpperCase())) {
        list.push(def);
      }
    });

    return list;
  }, [availableCatalogItems]);

  // Itens filtrados no modal de busca de catálogo
  const filteredCatalogItems = useMemo(() => {
    let result = combinedCatalog;
    if (selectedCatalogCategory !== "TODOS") {
      result = result.filter(
        (it) => it.categoria && it.categoria.toLowerCase().includes(selectedCatalogCategory.toLowerCase())
      );
    }
    if (catalogSearchQuery.trim()) {
      const q = catalogSearchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.descricao.toLowerCase().includes(q) ||
          (it.codigo && it.codigo.toLowerCase().includes(q)) ||
          (it.fornecedor && it.fornecedor.toLowerCase().includes(q)) ||
          (it.categoria && it.categoria.toLowerCase().includes(q))
      );
    }
    return result;
  }, [combinedCatalog, selectedCatalogCategory, catalogSearchQuery]);

  // Lista plana de todos os itens consolidados com nome da etapa
  const allConsolidatedItems = useMemo(() => {
    const list: Array<ModularBOMItem & { stageTitle: string; stageOrder: number }> = [];
    modularBOM.stages.forEach((st) => {
      st.items.forEach((it) => {
        list.push({
          ...it,
          stageTitle: st.shortTitle,
          stageOrder: st.order
        });
      });
    });
    return list;
  }, [modularBOM.stages]);

  // Itens filtrados para a visão Consolidada
  const filteredConsolidatedItems = useMemo(() => {
    if (!searchTerm.trim()) return allConsolidatedItems;
    const term = searchTerm.toLowerCase();
    return allConsolidatedItems.filter(
      (it) =>
        it.description.toLowerCase().includes(term) ||
        (it.codigo && it.codigo.toLowerCase().includes(term)) ||
        (it.manufacturer && it.manufacturer.toLowerCase().includes(term)) ||
        it.stageTitle.toLowerCase().includes(term)
    );
  }, [allConsolidatedItems, searchTerm]);

  // Etapa ativa atual (quando activeTab !== 'CONSOLIDADA')
  const currentActiveStage = useMemo(() => {
    if (activeTab === "CONSOLIDADA") return null;
    return stagesById.get(activeTab) || null;
  }, [activeTab, stagesById]);

  // Itens filtrados para a etapa atual
  const filteredCurrentStageItems = useMemo(() => {
    if (!currentActiveStage) return [];
    if (!searchTerm.trim()) return currentActiveStage.items;
    const term = searchTerm.toLowerCase();
    return currentActiveStage.items.filter(
      (it) =>
        it.description.toLowerCase().includes(term) ||
        (it.codigo && it.codigo.toLowerCase().includes(term)) ||
        (it.manufacturer && it.manufacturer.toLowerCase().includes(term))
    );
  }, [currentActiveStage, searchTerm]);

  // Navegação sequencial entre etapas
  const currentStageIndex = useMemo(() => {
    if (activeTab === "CONSOLIDADA") return -1;
    return STAGE_ORDER_LIST.indexOf(activeTab);
  }, [activeTab]);

  const handlePrevStage = () => {
    if (activeTab === "CONSOLIDADA") {
      setActiveTab(STAGE_ORDER_LIST[STAGE_ORDER_LIST.length - 1]);
    } else if (currentStageIndex > 0) {
      setActiveTab(STAGE_ORDER_LIST[currentStageIndex - 1]);
    } else {
      setActiveTab("CONSOLIDADA");
    }
  };

  const handleNextStage = () => {
    if (activeTab === "CONSOLIDADA") {
      setActiveTab(STAGE_ORDER_LIST[0]);
    } else if (currentStageIndex < STAGE_ORDER_LIST.length - 1) {
      setActiveTab(STAGE_ORDER_LIST[currentStageIndex + 1]);
    } else {
      setActiveTab("CONSOLIDADA");
    }
  };

  // Subtotais por categoria na visão consolidada
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { count: number; totalBRL: number }> = {
      condutores: { count: 0, totalBRL: 0 },
      protecao: { count: 0, totalBRL: 0 },
      quadro: { count: 0, totalBRL: 0 },
      transformador: { count: 0, totalBRL: 0 },
      infraestrutura: { count: 0, totalBRL: 0 },
      seguranca: { count: 0, totalBRL: 0 },
      equipamentos: { count: 0, totalBRL: 0 },
      servicos: { count: 0, totalBRL: 0 },
      outros: { count: 0, totalBRL: 0 }
    };

    allConsolidatedItems.forEach((it) => {
      const isServ = it.category === 'MAO_DE_OBRA' || it.unit === 'sv' || (it.codigo && it.codigo.startsWith('SRV-'));
      if (isServ) {
        cats.servicos.count += 1;
        cats.servicos.totalBRL += it.totalPriceBRL || 0;
        return;
      }
      const cat = (it.category || "outros").toLowerCase();
      const targetCat = cats[cat] ? cat : "outros";
      cats[targetCat].count += 1;
      cats[targetCat].totalBRL += it.totalPriceBRL || 0;
    });

    return cats;
  }, [allConsolidatedItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-['Montserrat',sans-serif]">
      {/* ─── BANNER DE STATUS DA GESTÃO DE ORÇAMENTOS (CAPEX) EM SEGUNDO PLANO ─── */}
      <div className="bg-gradient-to-r from-[#0A192F] via-slate-900 to-[#0A192F] border border-slate-700/80 rounded-2xl p-4 md:p-5 shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00B356]/15 border border-[#00B356]/40 flex items-center justify-center shrink-0">
            {isSyncingCapex ? (
              <RefreshCw className="w-5 h-5 text-[#00B356] animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#00B356]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Gestão de Orçamentos (CAPEX)
              </span>
              {isSyncingCapex ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 animate-pulse">
                  Sincronizando em Segundo Plano...
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Conectado em Tempo Real
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {syncedOrcamentoId ? (
                <span>
                  Vinculado ao Projeto CAPEX:{" "}
                  <strong className="text-white font-mono">{syncedOrcamentoId}</strong> • Preços
                  homologados e menor histórico de cotações ativos
                </span>
              ) : (
                "Estrutura EAP de 10 etapas alimentada diretamente das tabelas CemigMaterialPreco e OrcamentoItemPadrao"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefreshCapexPrices && (
            <button
              type="button"
              onClick={onRefreshCapexPrices}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Recarregar preços atualizados da base de orçamentos"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar Preços
            </button>
          )}

          {syncedOrcamentoId && (
            <a
              href={`/orcamentos/${syncedOrcamentoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Abrir o memorial no módulo de Gestão de Orçamentos"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00B356]" /> Abrir no CAPEX
            </a>
          )}
        </div>
      </div>

      {/* ─── CARDS DE RESUMO FINANCEIRO GLOBAL (BDI & TOTAIS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Materiais */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Total Materiais (Líquido)</span>
            <Box className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-white font-mono">
            R$ {modularBOM.totalMaterialsNetBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            {modularBOM.totalItemsCount} insumos em 10 etapas
          </p>
        </div>

        {/* Mão de Obra e Instalação */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Mão de Obra & Serviços</span>
              {onUpdateLaborMode && (
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdateLaborMode("TABELADO")}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      laborMode === "TABELADO"
                        ? "bg-[#00B356] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Custo tabelado de serviços (Padrão: R$ 10k montagem + R$ 1,5k projeto + R$ 450 vistoria)"
                  >
                    Tabelado
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateLaborMode("PERCENTUAL")}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      laborMode === "PERCENTUAL"
                        ? "bg-[#E45318] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Calcular mão de obra como % sobre os materiais"
                  >
                    % Materiais
                  </button>
                </div>
              )}
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
              R$ {modularBOM.totalLaborNetBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400">
            {laborMode === "TABELADO" ? (
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Base tabelada Cordeiro/CEMIG (Instalação, Projeto e Vistoria)</span>
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <span>Alíquota:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={laborPercent}
                  onChange={(e) => onUpdateLaborPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-12 bg-slate-950 border border-slate-700 rounded px-1 text-center font-bold text-emerald-300 outline-none"
                />
                <span>% sobre insumos físicos</span>
              </div>
            )}
          </div>
        </div>

        {/* BDI Global */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>BDI Global do Projeto</span>
            <div className="flex items-center gap-1 bg-[#E45318]/20 px-2 py-0.5 rounded-md border border-[#E45318]/40">
              <Percent className="w-3 h-3 text-[#E45318]" />
              <span className="text-[10px] text-amber-300 font-bold">{globalBdiPercent}%</span>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-400 font-mono">
            R$ {modularBOM.globalBdiAmountBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
            <span>Margem:</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={globalBdiPercent}
              onChange={(e) => onUpdateGlobalBdiPercent(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-12 bg-slate-950 border border-slate-700 rounded px-1 text-center font-bold text-amber-300 outline-none"
            />
            <span>% sobre insumos</span>
          </div>
        </div>

        {/* Investimento Total da Obra */}
        <div className="bg-gradient-to-br from-[#E45318]/20 via-slate-900 to-slate-900 border border-[#E45318]/60 rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-300 text-xs font-bold mb-1">
            <span>Investimento Total (CAPEX)</span>
            <Zap className="w-4 h-4 text-[#E45318]" />
          </div>
          <div className="text-xl md:text-2xl font-black text-white font-mono">
            R$ {modularBOM.totalProjectInvestmentBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">
            Materiais + Mão de Obra + BDI ({globalBdiPercent}%)
          </p>
        </div>
      </div>

      {/* ─── NAVEGAÇÃO DE ABAS: CONSOLIDADA + 9 ETAPAS FÍSICAS DA INSTALAÇÃO ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Fluxo Físico de Instalação & Orçamentos:
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Selecione uma etapa para auditar insumos ou veja a lista consolidada completa
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevStage}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Ir para etapa anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              type="button"
              onClick={handleNextStage}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Ir para próxima etapa"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra horizontal de abas com scroll suave */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Aba 0: Consolidada */}
          <button
            type="button"
            onClick={() => setActiveTab("CONSOLIDADA")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
              activeTab === "CONSOLIDADA"
                ? "bg-[#00B356] border-[#00B356] text-white shadow-lg shadow-[#00B356]/25"
                : "bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span>📋 Toda Lista Consolidada</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === "CONSOLIDADA"
                  ? "bg-white/20 text-white"
                  : "bg-slate-800 text-emerald-400"
              }`}
            >
              {allConsolidatedItems.length}
            </span>
          </button>

          {/* Abas 1 a 9: Cada etapa do fluxo */}
          {STAGE_ORDER_LIST.map((stageId) => {
            const stage = stagesById.get(stageId);
            const isSelected = activeTab === stageId;
            const itemsCount = stage ? stage.items.length : 0;
            const order = stage ? stage.order : 0;

            return (
              <button
                key={stageId}
                type="button"
                onClick={() => setActiveTab(stageId)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                  isSelected
                    ? "bg-[#E45318] border-[#E45318] text-white shadow-lg shadow-[#E45318]/25 font-black"
                    : "bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {order}
                </span>
                <span>{stage ? stage.shortTitle : STAGE_METADATA[stageId].shortTitle}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected
                      ? "bg-white/20 text-white font-bold"
                      : itemsCount > 0
                      ? "bg-slate-800 text-slate-300 font-semibold"
                      : "bg-slate-900 text-slate-600"
                  }`}
                >
                  {itemsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── BARRA DE CONTROLE, FILTRO DE BUSCA E AÇÕES GLOBAIS ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Campo de Busca Rápida */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "CONSOLIDADA"
                ? "Filtrar por código, descrição, etapa ou fornecedor..."
                : `Filtrar insumos em ${currentActiveStage?.shortTitle || "esta etapa"}...`
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#00B356]"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasModifications && (
            <button
              type="button"
              onClick={onRestoreOriginal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 text-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Restaurar quantidades e preços originais calculados"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restaurar Originais</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddModal(activeTab === "CONSOLIDADA" ? undefined : activeTab)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00B356] hover:bg-[#009b4a] text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#00B356]/20"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Material
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E45318] hover:bg-[#c24310] text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
            title="Exportar planilha analítica completa formatada por etapa"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Planilha (CSV)
          </button>

          {onNavigateToFinancialModeling && (
            <button
              type="button"
              onClick={onNavigateToFinancialModeling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#00B356] hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-950/40"
              title="Avançar para Modelagem Financeira & 3 Cenários (Padrão BLEV - Fotos 01 & 02)"
            >
              <DollarSign className="w-3.5 h-3.5" /> Modelagem Financeira (Passo 5) →
            </button>
          )}
        </div>
      </div>

      {/* ─── CORPO DA ABA: VISÃO CONSOLIDADA ─────────────────────────────────── */}
      {activeTab === "CONSOLIDADA" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Cards de Resumo por Categoria */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Condutores</span>
              <p className="text-sm font-black text-white font-mono mt-0.5">
                R$ {categoryBreakdown.condutores.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.condutores.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Proteção / Disj</span>
              <p className="text-sm font-black text-amber-300 font-mono mt-0.5">
                R$ {categoryBreakdown.protecao.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.protecao.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Painéis / Quadros</span>
              <p className="text-sm font-black text-sky-300 font-mono mt-0.5">
                R$ {categoryBreakdown.quadro.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.quadro.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Subestação / Trafo</span>
              <p className="text-sm font-black text-emerald-300 font-mono mt-0.5">
                R$ {categoryBreakdown.transformador.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.transformador.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Infra / Dutos</span>
              <p className="text-sm font-black text-purple-300 font-mono mt-0.5">
                R$ {categoryBreakdown.infraestrutura.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.infraestrutura.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Segurança / IT-41</span>
              <p className="text-sm font-black text-rose-300 font-mono mt-0.5">
                R$ {categoryBreakdown.seguranca.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.seguranca.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Estações VE</span>
              <p className="text-sm font-black text-blue-300 font-mono mt-0.5">
                R$ {categoryBreakdown.equipamentos.totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">{categoryBreakdown.equipamentos.count} itens</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Mão de Obra / Serv</span>
              <p className="text-sm font-black text-emerald-300 font-mono mt-0.5">
                R$ {modularBOM.totalLaborNetBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[9px] text-slate-500">
                {laborMode === 'TABELADO' ? 'Tabelado Cordeiro' : `${laborPercent}% s/ Insumos`}
              </span>
            </div>
          </div>

          {/* Tabela Unificada Completa (Consolidada) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <TableProperties className="w-4 h-4 text-[#00B356]" />
                  Lista Geral Consolidada de Materiais & Custos Unitários
                </h3>
                <p className="text-xs text-slate-400">
                  Total de {filteredConsolidatedItems.length} materiais com especificação física, quantidade de pernas de condutor e cotações ativas
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Geral Consolidado</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  R$ {modularBOM.totalProjectInvestmentBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-36">Etapa Física da Obra</th>
                    <th className="p-3 w-28">Código / Ref</th>
                    <th className="p-3">Descrição Técnica do Material</th>
                    <th className="p-3">Fabricante / Homologação</th>
                    <th className="p-3 text-center w-24">Qtd (Editável)</th>
                    <th className="p-3 text-center w-16">Un</th>
                    <th className="p-3 text-right w-28">Unitário (R$)</th>
                    <th className="p-3 text-right w-28">Subtotal (R$)</th>
                    <th className="p-3 w-32">Origem do Preço</th>
                    <th className="p-3 text-center w-12">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredConsolidatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500 font-medium">
                        Nenhum insumo encontrado para a busca especificada.
                      </td>
                    </tr>
                  ) : (
                    filteredConsolidatedItems.map((item, idx) => {
                      const isWebPrice = item.pricingSource === "ESTIMATIVA_WEB";
                      const isManualPrice = item.pricingSource === "MANUAL";
                      const isCemigNorm = item.pricingSource === "CEMIG_DB";

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                          {/* Índice */}
                          <td className="p-3 text-center font-mono text-[11px] text-slate-500 font-bold">
                            {idx + 1}
                          </td>

                          {/* Etapa */}
                          <td className="p-3 font-semibold text-slate-300">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 block w-max font-bold">
                              {item.stageOrder}. {item.stageTitle}
                            </span>
                          </td>

                          {/* Código */}
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {item.codigo || "NORM-NBR"}
                          </td>

                          {/* Descrição */}
                          <td className="p-3 font-semibold text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(item.category === 'MAO_DE_OBRA' || item.unit === 'sv' || (item.codigo && item.codigo.startsWith('SRV-'))) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700/60 inline-flex items-center gap-1 shrink-0">
                                  <Wrench className="w-2.5 h-2.5 text-purple-400" /> Serviço Tabelado
                                </span>
                              )}
                              <span className="text-xs">{item.description}</span>
                            </div>
                            {item.spec && (
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                {item.spec}
                              </div>
                            )}
                          </td>

                          {/* Fabricante */}
                          <td className="p-3 text-emerald-400 font-mono text-[11px]">
                            {item.manufacturer || "Nacional Homologado"}
                          </td>

                          {/* Quantidade Editável */}
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={0.1}
                              step={item.unit === "m" ? 1 : 1}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                onUpdateQuantity(item.id, val);
                              }}
                              className="w-18 bg-slate-950 border border-slate-700 focus:border-[#E45318] rounded px-1.5 py-1 text-center font-mono font-bold text-amber-400 text-xs transition-colors"
                              title="Clique para editar a quantidade"
                            />
                          </td>

                          {/* Unidade */}
                          <td className="p-3 text-center font-mono text-slate-400">
                            {item.unit}
                          </td>

                          {/* Preço Unitário Editável */}
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-500 font-mono">R$</span>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={item.unitPriceBRL !== undefined ? item.unitPriceBRL : 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  onUpdateUnitPrice(item.id, val);
                                }}
                                className="w-24 bg-slate-950 border border-slate-700 focus:border-[#E45318] rounded px-1.5 py-1 text-right font-mono text-slate-200 text-xs transition-colors"
                                title="Clique para editar o preço unitário"
                              />
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {item.totalPriceBRL
                              ? item.totalPriceBRL.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2
                                })
                              : "-"}
                          </td>

                          {/* Badge da Fonte de Preço */}
                          <td className="p-3">
                            {isWebPrice ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1 w-max">
                                <Globe className="w-3 h-3 text-amber-400" /> Estimativa Web
                              </span>
                            ) : isCemigNorm ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-700/60 flex items-center gap-1 w-max">
                                <Check className="w-3 h-3 text-sky-400" /> Tabela CEMIG
                              </span>
                            ) : isManualPrice ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700/60 flex items-center gap-1 w-max">
                                <Sliders className="w-3 h-3 text-purple-400" /> Manual
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 w-max">
                                <Check className="w-3 h-3 text-emerald-400" /> CAPEX Master
                              </span>
                            )}
                          </td>

                          {/* Exclusão */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Remover material da lista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {onNavigateToFinancialModeling && (
              <div className="p-4 bg-gradient-to-r from-[#0A192F] via-slate-900 to-emerald-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Lista de materiais e orçamentos (CAPEX) consolidados (<strong className="text-white font-mono">R$ {modularBOM.totalProjectInvestmentBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToFinancialModeling}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-[#00B356] hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all whitespace-nowrap"
                >
                  <span>Avançar para Modelagem Financeira & 3 Cenários (Passo 5)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CORPO DA ABA: VISÃO DE ETAPA INDIVIDUAL (ETAPAS 1 A 9) ─────────── */}
      {activeTab !== "CONSOLIDADA" && currentActiveStage && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Detalhado da Etapa Selecionada */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E45318]/20 border border-[#E45318]/50 flex items-center justify-center font-black text-lg text-[#E45318] shrink-0">
                  {currentActiveStage.order}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Etapa Física {currentActiveStage.order} de {STAGE_ORDER_LIST.length}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {currentActiveStage.items.length} {currentActiveStage.items.length === 1 ? "Material Homologado" : "Materiais Homologados"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1">
                    {currentActiveStage.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    {currentActiveStage.description}
                  </p>
                </div>
              </div>

              {/* Subtotais Rápidos da Etapa */}
              <div className="flex items-center gap-3 shrink-0 bg-slate-950 p-3 rounded-xl border border-slate-800 flex-wrap sm:flex-nowrap">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Insumos Líquidos</span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    R$ {currentActiveStage.subtotalMaterialsBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-800 hidden sm:block" />
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 mb-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Mão de Obra</span>
                    {onUpdateStageLaborMode && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStageLaborMode(
                            currentActiveStage.stageId,
                            currentActiveStage.laborMode === "TABELADO" ? "PERCENTUAL" : "TABELADO"
                          )
                        }
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight cursor-pointer transition-all border ${
                          currentActiveStage.laborMode === "TABELADO"
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900"
                            : "bg-amber-950/80 text-amber-300 border-amber-600/50 hover:bg-amber-900"
                        }`}
                        title="Alternar entre Mão de Obra Tabelada e % sobre Materiais"
                      >
                        {currentActiveStage.laborMode === "TABELADO" ? "📋 Tabelado" : `٪ ${laborPercent}%`}
                      </button>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 block">
                    R$ {currentActiveStage.subtotalLaborBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  {currentActiveStage.stageId === "ETAPA_1_PADRAO_CEMIG" && currentActiveStage.laborMode === "TABELADO" && (
                    <span className="text-[8px] text-slate-400 font-normal block font-sans">
                      Instalação R$ 10k + Projeto R$ 1,5k + Vistoria R$ 450
                    </span>
                  )}
                </div>
                <div className="w-px h-8 bg-slate-800 hidden sm:block" />
                <div className="text-right">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Total da Etapa</span>
                  <span className="text-sm font-mono font-black text-white">
                    R$ {currentActiveStage.totalStageBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Ação de Inserção Rápida e Controle de Mão de Obra Específica para esta etapa */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span className="font-semibold text-slate-300">Mão de Obra desta etapa:</span>
                <div className="inline-flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdateStageLaborMode?.(currentActiveStage.stageId, "TABELADO")}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      currentActiveStage.laborMode === "TABELADO"
                        ? "bg-[#00B356] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📋 Custo Tabelado {currentActiveStage.tabeladoLaborBRL > 0 ? `(R$ ${currentActiveStage.tabeladoLaborBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStageLaborMode?.(currentActiveStage.stageId, "PERCENTUAL")}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      currentActiveStage.laborMode === "PERCENTUAL"
                        ? "bg-[#E45318] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ٪ Porcentagem ({laborPercent}% = R$ {currentActiveStage.percentLaborBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddModal(currentActiveStage.stageId)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00B356]" /> Adicionar Material Nesta Etapa
              </button>
            </div>
          </div>

          {/* Tabela de Materiais da Etapa */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-28">Código / Ref</th>
                    <th className="p-3">Descrição Técnica do Material</th>
                    <th className="p-3">Fabricante / Homologação</th>
                    <th className="p-3 text-center w-24">Qtd (Editável)</th>
                    <th className="p-3 text-center w-16">Un</th>
                    <th className="p-3 text-right w-28">Unitário (R$)</th>
                    <th className="p-3 text-right w-28">Subtotal (R$)</th>
                    <th className="p-3 w-32">Origem do Preço</th>
                    <th className="p-3 text-center w-12">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredCurrentStageItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                        {currentActiveStage.items.length === 0 ? (
                          <span>
                            Nenhum item necessário nesta etapa (trecho dispensado ou não aplicável à topologia atual).
                          </span>
                        ) : (
                          <span>Nenhum insumo encontrado para o termo pesquisado.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCurrentStageItems.map((item, idx) => {
                      const isWebPrice = item.pricingSource === "ESTIMATIVA_WEB";
                      const isManualPrice = item.pricingSource === "MANUAL";
                      const isCemigNorm = item.pricingSource === "CEMIG_DB";

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                          {/* Índice */}
                          <td className="p-3 text-center font-mono text-[11px] text-slate-500 font-bold">
                            {idx + 1}
                          </td>

                          {/* Código */}
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {item.codigo || "NORM-NBR"}
                          </td>

                          {/* Descrição */}
                          <td className="p-3 font-semibold text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(item.category === 'MAO_DE_OBRA' || item.unit === 'sv' || (item.codigo && item.codigo.startsWith('SRV-'))) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700/60 inline-flex items-center gap-1 shrink-0">
                                  <Wrench className="w-2.5 h-2.5 text-purple-400" /> Serviço Tabelado
                                </span>
                              )}
                              <span className="text-xs">{item.description}</span>
                            </div>
                            {item.spec && (
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                {item.spec}
                              </div>
                            )}
                          </td>

                          {/* Fabricante */}
                          <td className="p-3 text-emerald-400 font-mono text-[11px]">
                            {item.manufacturer || "Nacional Homologado"}
                          </td>

                          {/* Quantidade Editável */}
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={0.1}
                              step={item.unit === "m" ? 1 : 1}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                onUpdateQuantity(item.id, val);
                              }}
                              className="w-18 bg-slate-950 border border-slate-700 focus:border-[#E45318] rounded px-1.5 py-1 text-center font-mono font-bold text-amber-400 text-xs transition-colors"
                              title="Clique para editar a quantidade"
                            />
                          </td>

                          {/* Unidade */}
                          <td className="p-3 text-center font-mono text-slate-400">
                            {item.unit}
                          </td>

                          {/* Preço Unitário Editável */}
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-500 font-mono">R$</span>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={item.unitPriceBRL !== undefined ? item.unitPriceBRL : 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  onUpdateUnitPrice(item.id, val);
                                }}
                                className="w-24 bg-slate-950 border border-slate-700 focus:border-[#E45318] rounded px-1.5 py-1 text-right font-mono text-slate-200 text-xs transition-colors"
                                title="Clique para editar o preço unitário"
                              />
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {item.totalPriceBRL
                              ? item.totalPriceBRL.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2
                                })
                              : "-"}
                          </td>

                          {/* Badge da Fonte de Preço */}
                          <td className="p-3">
                            {isWebPrice ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1 w-max">
                                <Globe className="w-3 h-3 text-amber-400" /> Estimativa Web
                              </span>
                            ) : isCemigNorm ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-700/60 flex items-center gap-1 w-max">
                                <Check className="w-3 h-3 text-sky-400" /> Tabela CEMIG
                              </span>
                            ) : isManualPrice ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700/60 flex items-center gap-1 w-max">
                                <Sliders className="w-3 h-3 text-purple-400" /> Manual
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 w-max">
                                <Check className="w-3 h-3 text-emerald-400" /> CAPEX Master
                              </span>
                            )}
                          </td>

                          {/* Exclusão */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Remover material da etapa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé da Etapa com Navegação */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevStage}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Etapa Anterior
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CONSOLIDADA")}
                className="text-xs font-bold text-slate-400 hover:text-white underline cursor-pointer"
              >
                Ver Toda a Lista Consolidada
              </button>

              {currentStageIndex === STAGE_ORDER_LIST.length - 1 && onNavigateToFinancialModeling ? (
                <button
                  type="button"
                  onClick={onNavigateToFinancialModeling}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00B356] hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>Passo 5: Modelagem Financeira</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextStage}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E45318] hover:bg-[#c24310] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  Próxima Etapa <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DUAL-MODE: BUSCAR NO CATÁLOGO CAPEX OU CRIAR NOVO MATERIAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0A192F] border border-slate-700 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative text-white space-y-4 max-h-[90vh] flex flex-col">
            {/* Header do Modal com Abas de Modo */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00B356]/20 border border-[#00B356]/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#00B356]" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Adicionar Material à Obra & CAPEX
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione um item homologado do catálogo ou cadastre um novo com cotação web
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Alternador de Modo (Tabs do Modal) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalMode("buscar_catalogo");
                  setSelectedCatalogItem(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  modalMode === "buscar_catalogo"
                    ? "bg-[#00B356] text-white shadow-md shadow-[#00B356]/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>1. Buscar no Catálogo CAPEX</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode("novo_web")}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  modalMode === "novo_web"
                    ? "bg-[#E45318] text-white shadow-md shadow-[#E45318]/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>2. Criar Novo & Cotação Web</span>
              </button>
            </div>

            {/* CONTEÚDO DO MODO 1: BUSCAR NO CATÁLOGO CAPEX */}
            {modalMode === "buscar_catalogo" && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Barra de Busca e Filtro de Categoria */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Pesquisar por descrição, código ou fabricante (ex: cabo 70mm, disjuntor 250A, DPS, eletroduto)..."
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#00B356]"
                    />
                    {catalogSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Chips de Categoria */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {["TODOS", "Condutores", "Proteção", "Infraestrutura", "Segurança", "Transformador", "Equipamentos"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCatalogCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                          selectedCatalogCategory === cat
                            ? "bg-slate-800 text-emerald-400 border border-emerald-500/40"
                            : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Resultados do Catálogo */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60 border border-slate-800/80 rounded-2xl bg-slate-950/60 p-2">
                  {filteredCatalogItems.length === 0 ? (
                    <div className="text-center py-6 px-4 space-y-3">
                      <p className="text-xs text-slate-400">
                        Nenhum insumo encontrado para &ldquo;<strong className="text-white">{catalogSearchQuery}</strong>&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemForm((prev) => ({
                            ...prev,
                            descricao: catalogSearchQuery
                          }));
                          setModalMode("novo_web");
                        }}
                        className="px-3.5 py-1.5 bg-[#E45318] hover:bg-[#c24310] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" /> Cadastrar como Novo Material com Busca Web
                      </button>
                    </div>
                  ) : (
                    filteredCatalogItems.map((catItem, idx) => {
                      const isSelected = selectedCatalogItem?.codigo === catItem.codigo && selectedCatalogItem?.descricao === catItem.descricao;
                      return (
                        <div
                          key={`${catItem.codigo || idx}-${idx}`}
                          onClick={() => setSelectedCatalogItem(catItem)}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-emerald-950/50 border border-emerald-500/60 shadow-md"
                              : "hover:bg-slate-800/50 border border-transparent"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {catItem.codigo && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                                  {catItem.codigo}
                                </span>
                              )}
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {catItem.categoria || "Material"}
                              </span>
                              {catItem.fornecedor && (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  • {catItem.fornecedor}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-white mt-0.5 truncate">
                              {catItem.descricao}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-mono font-black text-amber-300">
                              R$ {catItem.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-slate-400 font-normal"> / {catItem.unidade || "un"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCatalogItem(catItem);
                              }}
                              className={`mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#00B356] text-white"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                              }`}
                            >
                              {isSelected ? "✓ Selecionado" : "Selecionar"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Painel do Item Selecionado e Configuração da Inserção */}
                {selectedCatalogItem && (
                  <form onSubmit={handleAddCatalogItemSubmit} className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400">
                          Confirmar Inserção de Item do Catálogo Homologado
                        </span>
                        <h4 className="text-xs font-black text-white mt-0.5 truncate max-w-md">
                          {selectedCatalogItem.descricao}
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        Unit: R$ {selectedCatalogItem.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                          Etapa de Instalação Alvo *
                        </label>
                        <select
                          value={catalogTargetStage}
                          onChange={(e) => setCatalogTargetStage(e.target.value as InstallationStageId)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-[#00B356] cursor-pointer text-xs"
                        >
                          {STAGE_ORDER_LIST.map((stageId) => {
                            const meta = STAGE_METADATA[stageId];
                            return (
                              <option key={stageId} value={stageId}>
                                {meta ? meta.title : stageId}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            Quantidade ({selectedCatalogItem.unidade || "un"}) *
                          </label>
                          <input
                            type="number"
                            min={0.1}
                            step={selectedCatalogItem.unidade === "m" ? 1 : 1}
                            required
                            value={catalogQuantity}
                            onChange={(e) => setCatalogQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-[#00B356] text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            Subtotal Previsto
                          </label>
                          <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono font-black text-emerald-400 text-right">
                            R$ {(catalogQuantity * selectedCatalogItem.precoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedCatalogItem(null)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Limpar Seleção
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingNewItem}
                        className="px-5 py-2 bg-[#00B356] hover:bg-[#009b4a] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00B356]/20 disabled:opacity-50"
                      >
                        {isSubmittingNewItem ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Inserindo...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Adicionar à Etapa Selecionada
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* CONTEÚDO DO MODO 2: CRIAR NOVO MATERIAL COM COTAÇÃO WEB (FOTO 2) */}
            {modalMode === "novo_web" && (
              <form onSubmit={handleCreateItemSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Descrição Completa do Material *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Disjuntor Caixa Moldada 350A Curva D ou Carregador 22kW..."
                    value={newItemForm.descricao}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, descricao: e.target.value })
                    }
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-[#00B356]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Etapa de Instalação *
                    </label>
                    <select
                      value={newItemForm.stageId}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          stageId: e.target.value as InstallationStageId
                        })
                      }
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-[#00B356] cursor-pointer"
                    >
                      {STAGE_ORDER_LIST.map((stageId) => {
                        const meta = STAGE_METADATA[stageId];
                        return (
                          <option key={stageId} value={stageId}>
                            {meta ? meta.title : stageId}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Categoria do Insumo
                    </label>
                    <select
                      value={newItemForm.tipo}
                      onChange={(e) => setNewItemForm({ ...newItemForm, tipo: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-[#00B356] cursor-pointer"
                    >
                      <option value="Material">Material (Geral)</option>
                      <option value="CONDUTOR">Condutores & Cabos</option>
                      <option value="DISJUNTOR">Disjuntores & Proteção</option>
                      <option value="CAIXA">Caixas & Quadros</option>
                      <option value="POSTE">Postes & Estruturas</option>
                      <option value="ATERRAMENTO">Aterramento</option>
                      <option value="ELETRODUTO">Eletrodutos & Curvas</option>
                      <option value="Equipamentos">Equipamentos & Carregadores</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      step={1}
                      required
                      value={newItemForm.quantidade}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          quantidade: Math.max(0.1, parseFloat(e.target.value) || 1)
                        })
                      }
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-[#00B356]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={newItemForm.unidade}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unidade: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-[#00B356]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Preço Opcional (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Web Auto"
                      value={newItemForm.precoManual}
                      onChange={(e) =>
                        setNewItemForm({ ...newItemForm, precoManual: e.target.value })
                      }
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-[#00B356]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    Se o preço for deixado em branco, o sistema executará uma estimativa automática
                    de mercado na web e atribuirá a etiqueta{" "}
                    <strong className="text-amber-300">&ldquo;Estimativa Web&rdquo;</strong> para deixar o
                    orçamento pré-pronto, gerando alerta para a equipe de compras e CAPEX homologar o valor.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNewItem}
                    className="px-5 py-2 bg-[#00B356] hover:bg-[#009b4a] text-white rounded-xl font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00B356]/20 disabled:opacity-50"
                  >
                    {isSubmittingNewItem ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Cadastrando & Cotando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Salvar Material & Disparar Alerta
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
