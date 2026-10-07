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

  // ─── TERMINAIS DE COMPRESSÃO OLHAL / TUBULAR EM COBRE ESTANHADO (PADRÃO CEMIG) ───
  { codigo: "TERM-COMPRESSAO-16", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 16 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 2.80 },
  { codigo: "TERM-COMPRESSAO-25", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 25 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 3.50 },
  { codigo: "TERM-COMPRESSAO-35", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 35 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 4.20 },
  { codigo: "TERM-COMPRESSAO-50", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 50 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 8.50 },
  { codigo: "TERM-COMPRESSAO-70", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 70 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 12.00 },
  { codigo: "TERM-COMPRESSAO-95", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 95 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 15.00 },
  { codigo: "TERM-COMPRESSAO-120", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 120 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 18.50 },
  { codigo: "TERM-COMPRESSAO-150", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 150 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 22.00 },
  { codigo: "TERM-COMPRESSAO-185", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 185 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 28.00 },
  { codigo: "TERM-COMPRESSAO-240", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 240 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 36.00 },

  // ─── TERMINAIS PINO MACIÇO EM COBRE ESTANHADO (CONEXÃO DIRETA DISJUNTOR BORNES TÚNEL) ───
  { codigo: "TERM-PINO-MACICO-16", descricao: "Terminal Pino Maciço em Cobre Estanhado 16 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 4.50 },
  { codigo: "TERM-PINO-MACICO-25", descricao: "Terminal Pino Maciço em Cobre Estanhado 25 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 5.80 },
  { codigo: "TERM-PINO-MACICO-35", descricao: "Terminal Pino Maciço em Cobre Estanhado 35 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 7.20 },
  { codigo: "TERM-PINO-MACICO-50", descricao: "Terminal Pino Maciço em Cobre Estanhado 50 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 9.80 },
  { codigo: "TERM-PINO-MACICO-70", descricao: "Terminal Pino Maciço em Cobre Estanhado 70 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 14.50 },
  { codigo: "TERM-PINO-MACICO-95", descricao: "Terminal Pino Maciço em Cobre Estanhado 95 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 18.00 },
  { codigo: "TERM-PINO-MACICO-120", descricao: "Terminal Pino Maciço em Cobre Estanhado 120 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 24.00 },
  { codigo: "TERM-PINO-MACICO-150", descricao: "Terminal Pino Maciço em Cobre Estanhado 150 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 28.00 },
  { codigo: "TERM-PINO-MACICO-185", descricao: "Terminal Pino Maciço em Cobre Estanhado 185 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 35.00 },
  { codigo: "TERM-PINO-MACICO-240", descricao: "Terminal Pino Maciço em Cobre Estanhado 240 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 42.00 },

  // ─── TERMINAIS BANDEIRA (ADAPTADORES MULTIPLOS CABOS P/ DISJUNTORES CAIXA MOLDADA) ───
  {
    codigo: "TERM-BANDEIRA-2CABOS",
    descricao: "Terminal Bandeira Duplo em Cobre Estanhado c/ 2 Parafusos para Disjuntor Caixa Moldada (Múltiplos Cabos)",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 145.00,
    observacao: "Obrigatório para conexões de 2 cabos em paralelo por polo (Faixas F4, F5, F6 e F7)."
  },
  {
    codigo: "TERM-BANDEIRA-3CABOS",
    descricao: "Terminal Bandeira Triplo em Cobre Estanhado c/ 3 Parafusos para Disjuntor Caixa Moldada (Múltiplos Cabos)",
    categoria: "ACESSORIO",
    unidade: "un",
    precoUnitario: 195.00,
    observacao: "Obrigatório para conexões de 3 cabos em paralelo por polo (Faixas F8 e F9)."
  },

  // ─── BARRAS CHATAS DE COBRE ELETROLÍTICO (COPPERBARRAS - CAIXA CM-18) ───
  {
    codigo: "BARRA-CU-78X14",
    descricao: "Barra Chata Cobre Eletrolítico 7/8\" x 1/4\" (22,22 x 6,35 mm) - 314A (Copperbarras - Caixa CM-18)",
    categoria: "ACESSORIO",
    unidade: "m",
    precoUnitario: 195.00,
    observacao: "Compatível com disjuntores Soprano Frame 250 (Largura máx 23,0 mm - Disjuntores 150A a 250A)."
  },
  {
    codigo: "BARRA-CU-1X516",
    descricao: "Barra Chata Cobre Eletrolítico 1\" x 5/16\" (25,40 x 7,93 mm) - 439A (Copperbarras - Caixa CM-18)",
    categoria: "ACESSORIO",
    unidade: "m",
    precoUnitario: 245.00,
    observacao: "Compatível com disjuntores Soprano Frame 400 (Largura máx 28,5 mm - Disjuntores 275A a 400A)."
  },
  {
    codigo: "BARRA-CU-134X516",
    descricao: "Barra Chata Cobre Eletrolítico 1.3/4\" x 5/16\" (44,45 x 7,93 mm) - 769A (Copperbarras - Caixa CM-18)",
    categoria: "ACESSORIO",
    unidade: "m",
    precoUnitario: 380.00,
    observacao: "Compatível com disjuntores Soprano Frame 630 e Frame 800 (Largura máx 44,0 mm - Disjuntores 450A a 700A)."
  },
  {
    codigo: "BARRA-CU-134X38",
    descricao: "Barra Chata Cobre Eletrolítico 1.3/4\" x 3/8\" (44,45 x 9,52 mm) - 903A (Copperbarras - Caixa CM-18)",
    categoria: "ACESSORIO",
    unidade: "m",
    precoUnitario: 440.00,
    observacao: "Compatível com disjuntores Soprano Frame 800 (Largura máx 44,0 mm - Disjuntores 700A e 800A)."
  },

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
  { codigo: "SRV-BASE-CONCRETO", descricao: "Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)", categoria: "ACESSORIO", unidade: "cj", precoUnitario: 220.00 },

  // ─── TABELA 4 CEMIG (75,1 A 304 kVA) - ALTA DEMANDA / POSTOS VE ───
  // Disjuntores Caixa Moldada Tripolares Homologados CEMIG (PEC-11)
  { codigo: "DISJ-CXM-3P-225A", descricao: "Disjuntor Tripolar Caixa Moldada 225A Icu>=25kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 1450.00, observacao: "Padrão Tabela 4 Faixa F1 (75,1 a 86,0 kVA)" },
  { codigo: "DISJ-CXM-3P-250A", descricao: "Disjuntor Tripolar Caixa Moldada 250A Icu>=25kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 1650.00, observacao: "Padrão Tabela 4 Faixa F2 (86,1 a 95,0 kVA)" },
  { codigo: "DISJ-CXM-3P-300A", descricao: "Disjuntor Tripolar Caixa Moldada 300A/320A Icu>=36kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 2100.00, observacao: "Padrão Tabela 4 Faixa F3 (95,1 a 114,0 kVA)" },
  { codigo: "DISJ-CXM-3P-400A", descricao: "Disjuntor Tripolar Caixa Moldada 400A Icu>=36kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 2850.00, observacao: "Padrão Tabela 4 Faixa F4 (114,1 a 152,0 kVA)" },
  { codigo: "DISJ-CXM-3P-450A", descricao: "Disjuntor Tripolar Caixa Moldada 450A/500A Icu>=36kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 3400.00, observacao: "Padrão Tabela 4 Faixa F5 (152,1 a 171,0 kVA)" },
  { codigo: "DISJ-CXM-3P-500A", descricao: "Disjuntor Tripolar Caixa Moldada 500A Icu>=50kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 3800.00, observacao: "Padrão Tabela 4 Faixa F6 (171,1 a 188,0 kVA)" },
  { codigo: "DISJ-CXM-3P-630A", descricao: "Disjuntor Tripolar Caixa Moldada 600A/630A Icu>=50kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 4900.00, observacao: "Padrão Tabela 4 Faixa F7 (188,1 a 228,0 kVA)" },
  { codigo: "DISJ-CXM-3P-700A", descricao: "Disjuntor Tripolar Caixa Moldada 700A/800A Icu>=50kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 5800.00, observacao: "Padrão Tabela 4 Faixa F8 (228,1 a 266,0 kVA)" },
  { codigo: "DISJ-CXM-3P-800A", descricao: "Disjuntor Tripolar Caixa Moldada 800A Icu>=50kA Homologado CEMIG", categoria: "DISJUNTOR", unidade: "un", precoUnitario: 6900.00, observacao: "Padrão Tabela 4 Faixa F9 (266,1 a 304,0 kVA)" },

  // Transformadores de Corrente (TC) com Fator Térmico FT = 2,0 Homologados CEMIG
  { codigo: "TC-200-5", descricao: "Transformador de Corrente (TC) 200/5 A c/ Fator Térmico FT=2,0 Homologado CEMIG", categoria: "ACESSORIO", unidade: "un", precoUnitario: 380.00, observacao: "Tabela 4 Faixas F1, F2 e F3 (conjunto com 3 TCs instalados na Caixa CM-4)" },
  { codigo: "TC-400-5", descricao: "Transformador de Corrente (TC) 400/5 A c/ Fator Térmico FT=2,0 Homologado CEMIG", categoria: "ACESSORIO", unidade: "un", precoUnitario: 440.00, observacao: "Tabela 4 Faixas F4, F5 e F6 (conjunto com 3 TCs instalados na Caixa CM-4)" },
  { codigo: "TC-600-5", descricao: "Transformador de Corrente (TC) 600/5 A c/ Fator Térmico FT=2,0 Homologado CEMIG", categoria: "ACESSORIO", unidade: "un", precoUnitario: 520.00, observacao: "Tabela 4 Faixas F7, F8 e F9 (conjunto com 3 TCs instalados na Caixa CM-4)" },

  // Condutores Cobre Pesados Preto (Fases) 0,6/1kV Subterrâneos (ND 5.1 Tabela 4)
  { codigo: "CABO-PRETO-120", descricao: "Cabo Cobre Isolado Preto (Fase) 0,6/1kV 120 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 138.00, observacao: "Tabela 4 Faixas F1 e F4" },
  { codigo: "CABO-PRETO-150", descricao: "Cabo Cobre Isolado Preto (Fase) 0,6/1kV 150 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 172.00, observacao: "Tabela 4 Faixas F2, F5 e F8" },
  { codigo: "CABO-PRETO-185", descricao: "Cabo Cobre Isolado Preto (Fase) 0,6/1kV 185 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 215.00, observacao: "Tabela 4 Faixas F6 e F9" },
  { codigo: "CABO-PRETO-240", descricao: "Cabo Cobre Isolado Preto (Fase) 0,6/1kV 240 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 285.00, observacao: "Tabela 4 Faixas F3 e F7" },

  // Condutores Cobre Pesados Azul Claro (Neutro 0,6/1kV - Seção igual à fase conf. Nota 9)
  { codigo: "CABO-AZUL-120", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) 0,6/1kV 120 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 138.00, observacao: "Tabela 4 Faixas F1 e F4" },
  { codigo: "CABO-AZUL-150", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) 0,6/1kV 150 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 172.00, observacao: "Tabela 4 Faixas F2, F5 e F8" },
  { codigo: "CABO-AZUL-185", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) 0,6/1kV 185 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 215.00, observacao: "Tabela 4 Faixas F6 e F9" },
  { codigo: "CABO-AZUL-240", descricao: "Cabo Cobre Isolado Azul Claro (Neutro) 0,6/1kV 240 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 285.00, observacao: "Tabela 4 Faixas F3 e F7" },

  // Condutores Cobre Pesados Verde (Proteção PE 0,6/1kV Subterrâneo)
  { codigo: "CABO-VERDE-50", descricao: "Cabo Cobre Isolado Verde (Terra/PE) 0,6/1kV 50 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 54.00, observacao: "Tabela 4 Faixa F4" },
  { codigo: "CABO-VERDE-70", descricao: "Cabo Cobre Isolado Verde (Terra/PE) 0,6/1kV 70 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 76.00, observacao: "Tabela 4 Faixas F1, F2, F5 e F8" },
  { codigo: "CABO-VERDE-95", descricao: "Cabo Cobre Isolado Verde (Terra/PE) 0,6/1kV 95 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 105.00, observacao: "Tabela 4 Faixas F6 e F9" },
  { codigo: "CABO-VERDE-120", descricao: "Cabo Cobre Isolado Verde (Terra/PE) 0,6/1kV 120 mm² - Subterrâneo", categoria: "CONDUTOR", unidade: "m", precoUnitario: 138.00, observacao: "Tabela 4 Faixas F3 e F7" },
  { codigo: "CABO-VERDE-10-INTERLIGACAO", descricao: "Cabo Cobre Isolado Verde 0,6/1kV 10 mm² p/ Equipotencialização entre Caixas CM-9/18 e CM-4 (Desenho 46)", categoria: "CONDUTOR", unidade: "m", precoUnitario: 12.50, observacao: "Obrigatório interligar carcaça da CM-9/18 à CM-4 (Desenho 46)" },

  // Cobre Nu 16mm² para malha de aterramento Tabela 4
  { codigo: "CABO-COBRE-NU-16", descricao: "Cabo Cobre Nu 16 mm² para Aterramento / Malha (Tabela 4 CEMIG)", categoria: "ATERRAMENTO", unidade: "m", precoUnitario: 18.00, observacao: "Obrigatório para Tabela 4 (todas as faixas F1 a F9)" },

  // Duto Corrugado PEAD 3" e Acessórios
  { codigo: "DUTO-CORRUGADO-PEAD-3POL", descricao: "Duto Corrugado PEAD Flexível de 3\" (Ø 85mm) para Entrada e Saída Subterrânea", categoria: "ELETRODUTO", unidade: "m", precoUnitario: 38.00, observacao: "5m na entrada e 5m na saída por eletroduto" },
  { codigo: "BUCHA-ARRUELA-PVC-85", descricao: "Bucha e Arruela de PVC Roscável Ø 85 mm (3\") p/ Fixação nas Caixas", categoria: "ELETRODUTO", unidade: "cj", precoUnitario: 56.00 },

  // Terminais de Compressão Alta Corrente
  { codigo: "TERM-COMPRESSAO-120", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 120 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 18.50 },
  { codigo: "TERM-COMPRESSAO-150", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 150 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 22.00 },
  { codigo: "TERM-COMPRESSAO-185", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 185 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 28.00 },
  { codigo: "TERM-COMPRESSAO-240", descricao: "Terminal de Compressão Tubular/Olhal em Cobre Estanhado 240 mm²", categoria: "ACESSORIO", unidade: "un", precoUnitario: 36.00 },

  // Terminais Especiais de Aterramento
  { codigo: "TERM-COMPRESSAO-10-ISOLADO", descricao: "Terminal de Compressão Tubular c/ Isolação para Cabo 10 mm² (Aterramento Caixa CM-4)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 4.50 },
  { codigo: "TERM-ATERRAMENTO-CARCACA-CEMIG", descricao: "Terminal de Aterramento para Carcaça de Caixa Padrão CEMIG (Conector Terra de Caixa)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 15.00 },
  { codigo: "TERM-COMPRESSAO-16", descricao: "Terminal de Compressão para Cabo 16 mm² (Conexão Malha de Aterramento)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 8.00 },

  // Aterramento Cantoneira e Caixas de Inspeção c/ Tampa de Ferro
  { codigo: "HASTE-ATERRAMENTO-CANTONEIRA-GALV", descricao: "Haste de Aterramento Cantoneira de Aço Galvanizado a Fogo (Padrão CEMIG - 2,40m)", categoria: "ATERRAMENTO", unidade: "un", precoUnitario: 95.00, observacao: "Padrão Tabela 4 CEMIG" },
  { codigo: "CX-INSPECAO-ATERRAMENTO-CORPO", descricao: "Caixa de Inspeção de Aterramento Cilíndrica PVC Ø 150 mm (Corpo de Solo)", categoria: "ATERRAMENTO", unidade: "un", precoUnitario: 28.00 },
  { codigo: "TAMPA-FOFO-INSPECAO-TERRA", descricao: "Tampa de Ferro Fundido para Caixa de Inspeção de Aterramento Ø 150 mm (Padrão CEMIG)", categoria: "ATERRAMENTO", unidade: "un", precoUnitario: 45.00 },

  // Barramentos em Metros (m) (Desenho 46)
  { codigo: "BARRAMENTO-NEUTRO-TERRA-ALTA", descricao: "Barramento de Neutro e Aterramento em Cobre Eletrolítico c/ Parafusos e Suportes (Desenho 46)", categoria: "ACESSORIO", unidade: "m", precoUnitario: 380.00 },
  { codigo: "BARRAMENTO-FASE-ISOLADO-ALTA", descricao: "Barramento de Cobre Eletrolítico para Fases c/ Isoladores Epóxi (Desenho 46)", categoria: "ACESSORIO", unidade: "m", precoUnitario: 195.00 },

  // Caixas Subterrâneas Tipo ZC e Tipo ZD e Tampas de Ferro Fundido Separadas (ND-2.3)
  { codigo: "CX-SUBTERRANEA-ZC", descricao: "Caixa Subterrânea de Passagem Tipo ZC em Alvenaria/Concreto (77 x 67 x 90 cm - Norma CEMIG ND-2.3 / ND-5.1)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 750.00, observacao: "Caixa padrão para passeio/calçada" },
  { codigo: "TAMPA-FOFO-ZC", descricao: "Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZC (Padrão CEMIG)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 480.00 },
  { codigo: "CX-SUBTERRANEA-ZD", descricao: "Caixa Subterrânea de Passagem Tipo ZD em Alvenaria/Concreto (100 x 75 x 120 cm - Norma CEMIG ND-2.3)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 1250.00, observacao: "Caixa reforçada para pista de rolamento e derivações BTX" },
  { codigo: "TAMPA-FOFO-ZD", descricao: "Tampa e Aro de Ferro Fundido Nodular Reforçada Articulada Tipo ZD (Classe 125/250 kN - Padrão CEMIG)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 850.00 },
  { codigo: "BRITA-1-DRAIN", descricao: "Brita nº 1 para Drenagem de Caixa de Passagem/Inspeção (Saco 20kg)", categoria: "ACESSORIO", unidade: "un", precoUnitario: 18.00 },

  // Mão de Obra e Projeto Atualizados
  { codigo: "SRV-MONTAGEM-PADRAO", descricao: "Mão de Obra de Montagem Especializada Padrão Alta Demanda", categoria: "MAO_DE_OBRA", unidade: "sv", precoUnitario: 10000.00, observacao: "Montagem completa de padrão alta demanda" },
  { codigo: "SRV-PROJETO-CEMIG", descricao: "Projeto Elétrico de Entrada de Serviço e Homologação junto à CEMIG", categoria: "MAO_DE_OBRA", unidade: "sv", precoUnitario: 1500.00, observacao: "Projeto elétrico, memorial e aprovação técnica CEMIG" }
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
