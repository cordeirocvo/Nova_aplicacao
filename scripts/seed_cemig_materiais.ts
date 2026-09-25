import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const CEMIG_MATERIAIS_ATUALIZADOS = [
  // ─── POSTES E PONTALETES ───
  {
    codigo: "POSTE-PC1",
    descricao: "Poste Concreto Duplo T PC1 (90 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 980.00,
    observacao: "Indicado para Bifásico B1 e Trifásico C1..C4 a favor da rede (mesmo lado)."
  },
  {
    codigo: "POSTE-PC2",
    descricao: "Poste Concreto Duplo T PC2 (150 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 1350.00,
    observacao: "Indicado para Bifásico B1 e Trifásico C1..C2 contra a rede (lado oposto)."
  },
  {
    codigo: "POSTE-PC3",
    descricao: "Poste Concreto Duplo T PC3 (200 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 1780.00,
    observacao: "Indicado para Trifásico C3..C6 contra a rede ou C5..C6 a favor da rede."
  },
  {
    codigo: "POSTE-PA1",
    descricao: "Poste Aço Galvanizado PA1 (90 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 890.00,
    observacao: "Indicado para B1 e C1..C2 a favor da rede."
  },
  {
    codigo: "POSTE-PA2",
    descricao: "Poste Aço Galvanizado PA2 (150 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 1250.00,
    observacao: "Indicado para C3..C4 a favor da rede."
  },
  {
    codigo: "POSTE-PA3",
    descricao: "Poste Aço Galvanizado PA3 (200 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 1620.00,
    observacao: "Indicado para C5..C6 a favor da rede."
  },
  {
    codigo: "POSTE-PA4",
    descricao: "Poste Aço Galvanizado PA4 (150 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 1380.00,
    observacao: "Indicado para B1 e C1..C2 lado oposto da rede (contra)."
  },
  {
    codigo: "POSTE-PA5",
    descricao: "Poste Aço Galvanizado PA5 (200 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 1750.00,
    observacao: "Indicado para C3..C4 lado oposto da rede (contra)."
  },
  {
    codigo: "POSTE-PA6",
    descricao: "Poste Aço Galvanizado PA6 (300 daN / 7,00m) Homologado CEMIG",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 2150.00,
    observacao: "Indicado para C5..C6 lado oposto da rede (contra)."
  },
  {
    codigo: "PONTALETE-PT1",
    descricao: "Pontalete Aço Galvanizado PT1 (3,00m x 2\") c/ curva e base",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 380.00,
    observacao: "Instalação em platibanda/muro para B1 e C1..C4."
  },
  {
    codigo: "PONTALETE-PT2",
    descricao: "Pontalete Aço Galvanizado Reforçado PT2 (3,00m x 2.1/2\")",
    categoria: "POSTE",
    unidade: "un",
    precoUnitario: 560.00,
    observacao: "Instalação em platibanda/muro para C5..C6."
  },

  // Tampões específicos por poste de aço
  {
    codigo: "TAMPAO-POSTE-PA1",
    descricao: "Tampão de Vedação Superior para Poste de Aço PA1",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 35.00,
    observacao: "Específico para poste PA1."
  },
  {
    codigo: "TAMPAO-POSTE-PA2",
    descricao: "Tampão de Vedação Superior para Poste de Aço PA2",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 38.00,
    observacao: "Específico para poste PA2."
  },
  {
    codigo: "TAMPAO-POSTE-PA3",
    descricao: "Tampão de Vedação Superior para Poste de Aço PA3",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 42.00,
    observacao: "Específico para poste PA3."
  },
  {
    codigo: "TAMPAO-POSTE-PA4",
    descricao: "Tampão de Vedação Superior para Poste de Aço PA4",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 38.00,
    observacao: "Específico para poste PA4."
  },
  {
    codigo: "TAMPAO-POSTE-PA5",
    descricao: "Tampão de Vedação Superior para Poste de Aço PA5",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 42.00,
    observacao: "Específico para poste PA5."
  },
  {
    codigo: "TAMPAO-POSTE-PA6",
    descricao: "Tampão de Vedação Superior para Poste de Aço PA6",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 48.00,
    observacao: "Específico para poste PA6."
  },

  // ─── CAIXAS METÁLICAS DE MEDIÇÃO E PROTEÇÃO (ND 5.1 INDIVIDUAL) ───
  // Nota técnica: Para padrões individuais a CEMIG utiliza caixas metálicas em chapa de aço (CM1..CM18).
  // Caixas em policarbonato são utilizadas para medição agrupada/coletiva (ND 5.2).
  {
    codigo: "CX-CM14",
    descricao: "Caixa Metálica Polifásica Tipo CM-14 em Chapa de Aço c/ visor e alojamento para disjuntor (até 125A)",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 480.00,
    observacao: "Padrão individual CEMIG ND 5.1 em chapa de aço para padrões até 125A (C1 a C4 e B1)."
  },
  {
    codigo: "CX-CM3",
    descricao: "Caixa Metálica de Medição Indireta com TC Tipo CM-3 em Chapa de Aço (Padrão 200A CEMIG)",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 1150.00,
    observacao: "Padrão individual CEMIG ND 5.1 em chapa de aço para ligação de 200A (C6)."
  },
  {
    codigo: "CX-CM1",
    descricao: "Caixa Metálica Monofásica Tipo CM-1 em Chapa de Aço c/ visor",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 260.00,
    observacao: "Padrão individual CEMIG ND 5.1 para ramais monofásicos."
  },
  {
    codigo: "CX-CM2",
    descricao: "Caixa Metálica Polifásica Tipo CM-2 em Chapa de Aço c/ visor",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 420.00,
    observacao: "Padrão individual CEMIG ND 5.1 para leitura pela via pública em chapa de aço."
  },
  {
    codigo: "CX-CM4",
    descricao: "Caixa Metálica de Medição Tipo CM-4 em Chapa de Aço",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 580.00,
    observacao: "Padrão individual CEMIG ND 5.1 em chapa de aço."
  },
  {
    codigo: "CX-CM9",
    descricao: "Caixa Metálica de Proteção para Disjuntor Geral Tipo CM-9 em Chapa de Aço c/ lacre",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 180.00,
    observacao: "Utilizada quando o disjuntor geral fica em compartimento metálico separado."
  },
  {
    codigo: "CX-CM13",
    descricao: "Caixa Metálica Tipo CM-13 em Chapa de Aço",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 390.00,
    observacao: "Padrão individual CEMIG ND 5.1 em chapa de aço."
  },
  {
    codigo: "CX-CM18",
    descricao: "Caixa Metálica de Proteção para Disjuntor Tipo CM-18 em Chapa de Aço",
    categoria: "CAIXA",
    unidade: "un",
    precoUnitario: 210.00,
    observacao: "Padrão individual CEMIG ND 5.1 para proteção geral acoplada."
  },

  // ─── DISJUNTORES IEC CURVA C ───
  {
    codigo: "DISJ-IEC-2P-63A",
    descricao: "Disjuntor Bipolar IEC 63A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 115.00,
    observacao: "Padrão Bifásico B1 (até 16 kW)."
  },
  {
    codigo: "DISJ-IEC-2P-40A",
    descricao: "Disjuntor Bipolar IEC 40A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 95.00,
    observacao: "Para ramais bifásicos de menor porte."
  },
  {
    codigo: "DISJ-IEC-2P-50A",
    descricao: "Disjuntor Bipolar IEC 50A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 105.00,
    observacao: "Disjuntor bifásico 50A."
  },
  {
    codigo: "DISJ-IEC-3P-63A",
    descricao: "Disjuntor Tripolar IEC 63A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 185.00,
    observacao: "Padrão Trifásico C1 (até 24,0 kVA)."
  },
  {
    codigo: "DISJ-IEC-3P-80A",
    descricao: "Disjuntor Tripolar IEC 80A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 290.00,
    observacao: "Padrão Trifásico C2 (24,1 a 30,5 kVA)."
  },
  {
    codigo: "DISJ-IEC-3P-100A",
    descricao: "Disjuntor Tripolar IEC 100A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 360.00,
    observacao: "Padrão Trifásico C3 (30,6 a 38,1 kVA)."
  },
  {
    codigo: "DISJ-IEC-3P-125A",
    descricao: "Disjuntor Tripolar IEC 125A Curva C Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 490.00,
    observacao: "Padrão Trifásico C4 (38,2 a 47,6 kVA)."
  },
  {
    codigo: "DISJ-IEC-3P-150A",
    descricao: "Disjuntor Tripolar Caixa Moldada IEC 150A Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 850.00,
    observacao: "Padrão Trifásico C5 (47,7 a 57,1 kVA)."
  },
  {
    codigo: "DISJ-IEC-3P-200A",
    descricao: "Disjuntor Tripolar Caixa Moldada IEC 200A Homologado CEMIG",
    categoria: "DISJUNTOR",
    unidade: "un",
    precoUnitario: 1150.00,
    observacao: "Padrão Trifásico C6 (57,2 a 75,0 kVA)."
  },

  // ─── CONDUTORES SEPARADOS POR COR (PRETO, AZUL, VERDE) ───
  // Preto (Fases)
  { codigo: "CABO-PRETO-16", descricao: "Cabo Cobre Isolado Preto (Fase) PVC 70°C 16 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 18.50 },
  { codigo: "CABO-PRETO-25", descricao: "Cabo Cobre Isolado Preto (Fase) PVC 70°C 25 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 28.00 },
  { codigo: "CABO-PRETO-35", descricao: "Cabo Cobre Isolado Preto (Fase) PVC 70°C 35 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 38.50 },
  { codigo: "CABO-PRETO-50", descricao: "Cabo Cobre Isolado Preto (Fase) PVC 70°C 50 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 54.00 },
  { codigo: "CABO-PRETO-70", descricao: "Cabo Cobre Isolado Preto (Fase) PVC 70°C 70 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 76.00 },
  { codigo: "CABO-PRETO-95", descricao: "Cabo Cobre Isolado Preto (Fase) PVC 70°C 95 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 105.00 },

  // Azul Claro (Neutro)
  { codigo: "CABO-AZUL-16", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C 16 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 18.50 },
  { codigo: "CABO-AZUL-25", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C 25 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 28.00 },
  { codigo: "CABO-AZUL-35", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C 35 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 38.50 },
  { codigo: "CABO-AZUL-50", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C 50 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 54.00 },
  { codigo: "CABO-AZUL-70", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C 70 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 76.00 },
  { codigo: "CABO-AZUL-95", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C 95 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 105.00 },

  // Verde (Proteção Terra PE)
  { codigo: "CABO-VERDE-16", descricao: "Cabo Cobre Isolado Verde (Terra/PE) PVC 70°C 16 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 18.50 },
  { codigo: "CABO-VERDE-25", descricao: "Cabo Cobre Isolado Verde (Terra/PE) PVC 70°C 25 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 28.00 },
  { codigo: "CABO-VERDE-35", descricao: "Cabo Cobre Isolado Verde (Terra/PE) PVC 70°C 35 mm² 750V/1kV", categoria: "CONDUTOR", unidade: "m", precoUnitario: 38.50 },

  // Cobre Nu 10mm²
  { codigo: "CABO-COBRE-NU-10", descricao: "Cabo Cobre Nu 10 mm² para Aterramento / Malha", categoria: "ATERRAMENTO", unidade: "m", precoUnitario: 12.00 },

  // ─── ELETRODUTOS, LUVAS E CURVAS S ───
  // Eletroduto PVC
  { codigo: "ELET-PVC-32", descricao: "Eletroduto PVC Rígido Roscável Ø 32 mm (1\") - Barra 3m", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 32.00 },
  { codigo: "ELET-PVC-40", descricao: "Eletroduto PVC Rígido Roscável Ø 40 mm (1.1/4\") - Barra 3m", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 45.00 },
  { codigo: "ELET-PVC-50", descricao: "Eletroduto PVC Rígido Roscável Ø 50 mm (1.1/2\") - Barra 3m", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 62.00 },
  { codigo: "ELET-PVC-60", descricao: "Eletroduto PVC Rígido Roscável Ø 60 mm (2\") - Barra 3m", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 85.00 },
  { codigo: "ELET-PVC-75", descricao: "Eletroduto PVC Rígido Roscável Ø 75 mm (2.1/2\") - Barra 3m", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 120.00 },

  // Luvas PVC
  { codigo: "LUVA-PVC-32", descricao: "Luva PVC Rígido Roscável Ø 32 mm (1\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 8.50 },
  { codigo: "LUVA-PVC-40", descricao: "Luva PVC Rígido Roscável Ø 40 mm (1.1/4\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 11.00 },
  { codigo: "LUVA-PVC-50", descricao: "Luva PVC Rígido Roscável Ø 50 mm (1.1/2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 14.50 },
  { codigo: "LUVA-PVC-60", descricao: "Luva PVC Rígido Roscável Ø 60 mm (2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 19.00 },
  { codigo: "LUVA-PVC-75", descricao: "Luva PVC Rígido Roscável Ø 75 mm (2.1/2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 26.00 },

  // Curvas S (Substituindo curva 90°)
  { codigo: "CURVA-S-32", descricao: "Curva S PVC Rígido Roscável Ø 32 mm (1\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 22.00 },
  { codigo: "CURVA-S-40", descricao: "Curva S PVC Rígido Roscável Ø 40 mm (1.1/4\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 28.00 },
  { codigo: "CURVA-S-50", descricao: "Curva S PVC Rígido Roscável Ø 50 mm (1.1/2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 39.00 },
  { codigo: "CURVA-S-60", descricao: "Curva S PVC Rígido Roscável Ø 60 mm (2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 52.00 },
  { codigo: "CURVA-S-75", descricao: "Curva S PVC Rígido Roscável Ø 75 mm (2.1/2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 75.00 },

  // Buchas e Arruelas de PVC para eletroduto principal
  { codigo: "BUCHA-ARRUELA-PVC-32", descricao: "Bucha e Arruela de PVC Roscável Ø 32 mm (1\") p/ Fixação nas Caixas", categoria: "ELETRODUTO", unidade: "cj", precoUnitario: 14.00 },
  { codigo: "BUCHA-ARRUELA-PVC-40", descricao: "Bucha e Arruela de PVC Roscável Ø 40 mm (1.1/4\") p/ Fixação nas Caixas", categoria: "ELETRODUTO", unidade: "cj", precoUnitario: 18.00 },
  { codigo: "BUCHA-ARRUELA-PVC-50", descricao: "Bucha e Arruela de PVC Roscável Ø 50 mm (1.1/2\") p/ Fixação nas Caixas", categoria: "ELETRODUTO", unidade: "cj", precoUnitario: 24.00 },
  { codigo: "BUCHA-ARRUELA-PVC-60", descricao: "Bucha e Arruela de PVC Roscável Ø 60 mm (2\") p/ Fixação nas Caixas", categoria: "ELETRODUTO", unidade: "cj", precoUnitario: 32.00 },
  { codigo: "BUCHA-ARRUELA-PVC-75", descricao: "Bucha e Arruela de PVC Roscável Ø 75 mm (2.1/2\") p/ Fixação nas Caixas", categoria: "ELETRODUTO", unidade: "cj", precoUnitario: 44.00 },

  // Cabeçotes Pingadouro Alumínio
  { codigo: "CABECOTE-32", descricao: "Cabeçote Pingadouro Alumínio Ø 32 mm (1\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 28.00 },
  { codigo: "CABECOTE-40", descricao: "Cabeçote Pingadouro Alumínio Ø 40 mm (1.1/4\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 35.00 },
  { codigo: "CABECOTE-50", descricao: "Cabeçote Pingadouro Alumínio Ø 50 mm (1.1/2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 48.00 },
  { codigo: "CABECOTE-60", descricao: "Cabeçote Pingadouro Alumínio Ø 60 mm (2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 65.00 },
  { codigo: "CABECOTE-75", descricao: "Cabeçote Pingadouro Alumínio Ø 75 mm (2.1/2\")", categoria: "ELETRODUTO", unidade: "un", precoUnitario: 88.00 },

  // Aterramento 3/4" e Haste Galvanizada
  {
    codigo: "HASTE-ATERRAMENTO-GALV-58",
    descricao: "Haste de Aterramento Aço Galvanizado 5/8\" x 2,40m (Homologada CEMIG)",
    categoria: "ATERRAMENTO",
    unidade: "un",
    precoUnitario: 82.00,
    observacao: "Haste galvanizada padrão obrigatório CEMIG."
  },
  {
    codigo: "ELET-PVC-34-TERRA",
    descricao: "Eletroduto PVC Rígido Ø 3/4\" (Barra 3m) p/ Aterramento",
    categoria: "ELETRODUTO",
    unidade: "un",
    precoUnitario: 22.00,
    observacao: "Sempre 1 un para proteção do aterramento."
  },
  {
    codigo: "BUCHA-ARRUELA-PVC-34",
    descricao: "Bucha e Arruela de PVC Ø 3/4\" p/ Aterramento",
    categoria: "ELETRODUTO",
    unidade: "cj",
    precoUnitario: 8.00,
    observacao: "Sempre 1 cj para proteção do aterramento."
  },
  {
    codigo: "CURVA-S-34",
    descricao: "Curva S de PVC Ø 3/4\" p/ Aterramento",
    categoria: "ELETRODUTO",
    unidade: "un",
    precoUnitario: 14.00,
    observacao: "Sempre 1 un para proteção do aterramento."
  },
  {
    codigo: "CX-INSPECAO-ATERRAMENTO",
    descricao: "Caixa de Inspeção de Aterramento Cilíndrica PVC c/ Tampa",
    categoria: "ATERRAMENTO",
    unidade: "un",
    precoUnitario: 38.00,
    observacao: "1 un por haste de aterramento."
  },
  {
    codigo: "CONECTOR-HASTE-58",
    descricao: "Grampo Conector Cabo-Haste em Bronze 5/8\" (GTDU) - Opcional",
    categoria: "ATERRAMENTO",
    unidade: "un",
    precoUnitario: 19.00,
    observacao: "Item opcional (não padrão na conexão direta CEMIG)."
  },

  // ─── TERMINAIS ESPECÍFICOS (TUBULARES E PINO MACIÇO) ───
  { codigo: "TERM-TUBULAR-16", descricao: "Terminal Tubular Ilhós 16 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 2.80 },
  { codigo: "TERM-TUBULAR-25", descricao: "Terminal Tubular Ilhós 25 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 3.50 },
  { codigo: "TERM-TUBULAR-35", descricao: "Terminal Tubular Ilhós 35 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 4.20 },
  { codigo: "TERM-PINO-MACICO-50", descricao: "Terminal Pino Maciço 50 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 9.80 },
  { codigo: "TERM-PINO-MACICO-70", descricao: "Terminal Pino Maciço 70 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 14.50 },
  { codigo: "TERM-TUBULAR-95", descricao: "Terminal Tubular Ilhós 95 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 12.00 },

  // ─── CONECTORES BIMETÁLICOS ───
  { codigo: "CONECTOR-BIMETALICO-16", descricao: "Conector Bimetálico Perfurante/Compressão para Cabo 16 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 24.00 },
  { codigo: "CONECTOR-BIMETALICO-25", descricao: "Conector Bimetálico Perfurante/Compressão para Cabo 25 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 29.00 },
  { codigo: "CONECTOR-BIMETALICO-35", descricao: "Conector Bimetálico Perfurante/Compressão para Cabo 35 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 36.00 },
  { codigo: "CONECTOR-BIMETALICO-50", descricao: "Conector Bimetálico Perfurante/Compressão para Cabo 50 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 48.00 },
  { codigo: "CONECTOR-BIMETALICO-70", descricao: "Conector Bimetálico Perfurante/Compressão para Cabo 70 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 58.00 },
  { codigo: "CONECTOR-BIMETALICO-95", descricao: "Conector Bimetálico Perfurante/Compressão para Cabo 95 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 72.00 },

  // ─── CINTAS E PARAFUSOS UNITÁRIOS ───
  { codigo: "CINTA-POSTE-PC1", descricao: "Cinta de Aço para Poste Circular / Duplo T PC1", categoria: "FERRAGEM", unidade: "un", precoUnitario: 34.00 },
  { codigo: "CINTA-POSTE-PC2", descricao: "Cinta de Aço para Poste Circular / Duplo T PC2", categoria: "FERRAGEM", unidade: "un", precoUnitario: 38.00 },
  { codigo: "CINTA-POSTE-PC3", descricao: "Cinta de Aço para Poste Circular / Duplo T PC3", categoria: "FERRAGEM", unidade: "un", precoUnitario: 42.00 },
  { codigo: "CINTA-POSTE-PA1", descricao: "Cinta de Aço para Poste Circular PA1", categoria: "FERRAGEM", unidade: "un", precoUnitario: 34.00 },
  { codigo: "CINTA-POSTE-PA2", descricao: "Cinta de Aço para Poste Circular PA2", categoria: "FERRAGEM", unidade: "un", precoUnitario: 36.00 },
  { codigo: "CINTA-POSTE-PA3", descricao: "Cinta de Aço para Poste Circular PA3", categoria: "FERRAGEM", unidade: "un", precoUnitario: 38.00 },
  { codigo: "CINTA-POSTE-PA4", descricao: "Cinta de Aço para Poste Circular PA4", categoria: "FERRAGEM", unidade: "un", precoUnitario: 38.00 },
  { codigo: "CINTA-POSTE-PA5", descricao: "Cinta de Aço para Poste Circular PA5", categoria: "FERRAGEM", unidade: "un", precoUnitario: 40.00 },
  { codigo: "CINTA-POSTE-PA6", descricao: "Cinta de Aço para Poste Circular PA6", categoria: "FERRAGEM", unidade: "un", precoUnitario: 44.00 },
  {
    codigo: "PARAFUSO-PORCA-ARRUELA-CINTA",
    descricao: "Parafuso Galvanizado com Porca e Arruela para Cinta de Poste",
    categoria: "FERRAGEM",
    unidade: "un",
    precoUnitario: 9.50,
    observacao: "Peça unitária para travamento de cada cinta no poste."
  },

  // ─── DEMAIS FERRAGENS ───
  { codigo: "ARMACAO-SECUNDARIA-1E", descricao: "Armação Secundária de 1 Estribo Reforçada Galvanizada a Fogo", categoria: "FERRAGEM", unidade: "un", precoUnitario: 36.00 },
  { codigo: "ISOLADOR-ROLDANA-72", descricao: "Isolador Roldana de Porcelana Vitrificada 72x72 mm", categoria: "FERRAGEM", unidade: "un", precoUnitario: 18.00 },
  { codigo: "HASTE-OLHAL-16X150", descricao: "Haste / Parafuso com Olhal Ø 16 x 150 mm p/ Armação Secundária", categoria: "FERRAGEM", unidade: "un", precoUnitario: 24.00 },
  { codigo: "ARAME-GALV-12", descricao: "Arame de Aço Galvanizado nº 12 BWG (500g) p/ Amarração", categoria: "FERRAGEM", unidade: "un", precoUnitario: 22.00 },

  // Mão de Obra e Engenharia
  { codigo: "SRV-MONTAGEM-PADRAO", descricao: "Mão de Obra de Montagem Completa do Padrão CEMIG", categoria: "MAO_DE_OBRA", unidade: "sv", precoUnitario: 1400.00 },
  { codigo: "SRV-ENG-ART", descricao: "Elaboração de Projeto Elétrico de Entrada e Emissão de ART (CREA-MG)", categoria: "MAO_DE_OBRA", unidade: "sv", precoUnitario: 350.00 },
  { codigo: "SRV-VISTORIA-CEMIG", descricao: "Acompanhamento Técnico de Vistoria e Ligação Nova na CEMIG", categoria: "MAO_DE_OBRA", unidade: "sv", precoUnitario: 450.00 },
  { codigo: "SRV-BASE-CONCRETO", descricao: "Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)", categoria: "ACESSORIO", unidade: "cj", precoUnitario: 220.00 }
];

async function seed() {
  console.log("Atualizando materiais padrão CEMIG...");
  let count = 0;
  for (const m of CEMIG_MATERIAIS_ATUALIZADOS) {
    await prisma.cemigMaterialPreco.upsert({
      where: { codigo: m.codigo },
      update: {
        descricao: m.descricao,
        categoria: m.categoria,
        unidade: m.unidade,
        precoUnitario: m.precoUnitario,
        observacao: m.observacao || null,
        ativo: true
      },
      create: {
        codigo: m.codigo,
        descricao: m.descricao,
        categoria: m.categoria,
        unidade: m.unidade,
        precoUnitario: m.precoUnitario,
        observacao: m.observacao || null,
        ativo: true
      }
    });
    count++;
  }
  console.log(`Sucesso: ${count} materiais CEMIG sincronizados!`);
}

seed()
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
