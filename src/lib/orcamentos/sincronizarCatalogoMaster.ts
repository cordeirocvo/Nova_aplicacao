/**
 * Sincronizador Automático de Catálogo Master (SSOT)
 * Cordeiro Energia — Gestão de Orçamentos & CAPEX
 * 
 * Cadastra e atualiza automaticamente em OrcamentoItemPadrao:
 * 1. Todos os materiais do Padrão CEMIG (CemigMaterialPreco / ND-5.1)
 * 2. Todos os equipamentos e materiais do CoenergyGO (Carregadores VE, Transformadores Dyn1, Quadros 220V/380V, Cabos 0,6/1kV, Proteções e Segurança NBR 17019)
 */

import { prisma } from "@/lib/prisma";

export interface ItemSincronizacao {
  codigo: string;
  descricao: string;
  tipo: "MATERIAL" | "EQUIPAMENTO" | "MAO_DE_OBRA";
  unidade: string;
  precoUnitario: number;
  observacao?: string;
  origem: "PADRAO_CEMIG" | "COENERGYGO";
}

/**
 * Catálogo Consolidado de Insumos Nativos do CoenergyGO
 */
export const COENERGY_MATERIAIS_CATALOGO: ItemSincronizacao[] = [
  // ─── QUADROS E ENCLOSURES ───
  {
    codigo: "QUADRO-220V-IP54",
    descricao: "Quadro Geral de Distribuição Metálico Sobrepor com Placa Laranja IP54/IP65 (Hub 220V)",
    tipo: "MATERIAL",
    unidade: "pç",
    precoUnitario: 680.00,
    observacao: "Quadro metálico com pintura eletrostática a pó e placa de montagem laranja para disjuntor geral e circuitos auxiliares.",
    origem: "COENERGYGO"
  },
  {
    codigo: "QUADRO-QGBT-380V-IP54",
    descricao: "Quadro Geral de Distribuição Metálico Sobrepor com Placa Laranja IP54/IP65 (QGBT 380V)",
    tipo: "MATERIAL",
    unidade: "pç",
    precoUnitario: 680.00,
    observacao: "Quadro secundário de montagem para distribuição de 380V Yn aos carregadores VE.",
    origem: "COENERGYGO"
  },

  // ─── DISJUNTORES CAIXA MOLDADA (MCCB) WEG / SOPRANO ───
  { codigo: "DISJ-MCCB-50A", descricao: "Disjuntor Caixa Moldada Tripolar 50A Curva C (Icu ≥ 25kA em 220V / 10kA em 380V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 520.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-63A", descricao: "Disjuntor Caixa Moldada Tripolar 63A Curva C (Icu ≥ 25kA em 220V / 10kA em 380V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 560.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-80A", descricao: "Disjuntor Caixa Moldada Tripolar 80A Curva C (Icu ≥ 25kA em 220V / 10kA em 380V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 640.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-100A", descricao: "Disjuntor Caixa Moldada Tripolar 100A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 740.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-125A", descricao: "Disjuntor Caixa Moldada Tripolar 125A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 860.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-150A", descricao: "Disjuntor Caixa Moldada Tripolar 150A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 980.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-160A", descricao: "Disjuntor Caixa Moldada Tripolar 160A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1020.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-175A", descricao: "Disjuntor Caixa Moldada Tripolar 175A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1100.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-200A", descricao: "Disjuntor Caixa Moldada Tripolar 200A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1220.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-225A", descricao: "Disjuntor Caixa Moldada Tripolar 225A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1340.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-250A", descricao: "Disjuntor Caixa Moldada Tripolar 250A Curva D (Proteção Primária Trafo Elevador)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1460.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-300A", descricao: "Disjuntor Caixa Moldada Tripolar 300A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1700.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-350A", descricao: "Disjuntor Caixa Moldada Tripolar 350A Curva C/D (Icu ≥ 25kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1940.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-400A", descricao: "Disjuntor Caixa Moldada Tripolar 400A Curva C/D (Icu ≥ 35kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 2180.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-500A", descricao: "Disjuntor Caixa Moldada Tripolar 500A Curva C/D (Icu ≥ 35kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 2660.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-630A", descricao: "Disjuntor Caixa Moldada Tripolar 630A Curva C/D (Icu ≥ 35kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 3280.00, origem: "COENERGYGO" },
  { codigo: "DISJ-MCCB-800A", descricao: "Disjuntor Caixa Moldada Tripolar 800A Curva C/D (Icu ≥ 50kA em 220V)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 4100.00, origem: "COENERGYGO" },

  // ─── DISJUNTORES DIN AUXILIARES E DERIVAÇÕES VE ───
  { codigo: "DISJ-DIN-1P-10A", descricao: "Disjuntor Monofásico DIN 10A Curva C para Iluminação", tipo: "MATERIAL", unidade: "pç", precoUnitario: 32.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-1P-16A", descricao: "Disjuntor Monofásico DIN 16A Curva C para CFTV / Telecomunicações", tipo: "MATERIAL", unidade: "pç", precoUnitario: 34.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-1P-25A", descricao: "Disjuntor Monofásico DIN 25A Curva C para Tomada de Serviço TUG/TUE", tipo: "MATERIAL", unidade: "pç", precoUnitario: 35.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-2P-2A", descricao: "Minidisjuntor Bipolar DIN 2A Curva C para Comando da Bobina MX", tipo: "MATERIAL", unidade: "pç", precoUnitario: 38.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-3P-32A", descricao: "Disjuntor Tripolar DIN 32A Curva C para Ponto de Recarga VE", tipo: "MATERIAL", unidade: "pç", precoUnitario: 85.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-3P-40A", descricao: "Disjuntor Tripolar DIN 40A Curva C para Ponto de Recarga VE", tipo: "MATERIAL", unidade: "pç", precoUnitario: 85.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-3P-50A", descricao: "Disjuntor Tripolar DIN 50A Curva C para Ponto de Recarga VE", tipo: "MATERIAL", unidade: "pç", precoUnitario: 95.00, origem: "COENERGYGO" },
  { codigo: "DISJ-DIN-3P-63A", descricao: "Disjuntor Tripolar DIN 63A Curva C para Ponto de Recarga VE", tipo: "MATERIAL", unidade: "pç", precoUnitario: 115.00, origem: "COENERGYGO" },
  { codigo: "DISJ-QGBT-150A", descricao: "Disjuntor Geral de Proteção do QGBT 380V: 150A Curva C", tipo: "MATERIAL", unidade: "pç", precoUnitario: 290.00, origem: "COENERGYGO" },

  // ─── DISPOSITIVOS DR (DIFERENCIAL RESIDUAL NBR 5410 / NBR 17019) ───
  { codigo: "DR-BIPOLAR-25A-30MA", descricao: "Dispositivo Diferencial Residual (DR) Bipolar 25A / 30mA Tipo AC", tipo: "MATERIAL", unidade: "pç", precoUnitario: 125.00, origem: "COENERGYGO" },
  { codigo: "DR-TIPO-B-4P-40A", descricao: "Dispositivo Diferencial Residual (DR) Tetrapolar Tipo B 40A / 30mA (Imunidade CC > 6mA)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 790.00, origem: "COENERGYGO" },
  { codigo: "DR-TIPO-B-4P-63A", descricao: "Dispositivo Diferencial Residual (DR) Tetrapolar Tipo B 63A / 30mA (Imunidade CC > 6mA)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 940.00, origem: "COENERGYGO" },
  { codigo: "DR-TIPO-B-4P-80A", descricao: "Dispositivo Diferencial Residual (DR) Tetrapolar Tipo B 80A / 30mA (Imunidade CC > 6mA)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1250.00, origem: "COENERGYGO" },
  { codigo: "DR-TIPO-B-4P-100A", descricao: "Dispositivo Diferencial Residual (DR) Tetrapolar Tipo B 100A / 30mA (Imunidade CC > 6mA)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 1580.00, origem: "COENERGYGO" },

  // ─── PROTEÇÃO CONTRA SURTOS (DPS) ───
  { codigo: "DPS-CL1-CL2-45KA", descricao: "DPS Combinado Classe I+II (10/350µs 12,5kA, 8/20µs 45kA, Uc 275V) Plugável", tipo: "MATERIAL", unidade: "pç", precoUnitario: 98.00, origem: "COENERGYGO" },
  { codigo: "DPS-CL2-40KA-385V", descricao: "DPS Secundário Classe II 40kA / 385V Plugável para QGBT 380V (Fase/Neutro)", tipo: "MATERIAL", unidade: "pç", precoUnitario: 115.00, origem: "COENERGYGO" },

  // ─── BARRAMENTOS DE COBRE ───
  {
    codigo: "BARRAMENTO-TRIFASICO-250A-12DERIV",
    descricao: "Conjunto de Barramento Trifásico em Cobre Eletrolítico 250A com Isoladores Bujão e Termoencolhível de Cores com 12 derivações",
    tipo: "MATERIAL",
    unidade: "cj",
    precoUnitario: 420.00,
    observacao: "Barramento completo R, S, T, Neutro e Terra com termoencolhível por fase e 12 derivações M8.",
    origem: "COENERGYGO"
  },
  {
    codigo: "BARRAMENTO-TRIFASICO-400A-12DERIV",
    descricao: "Conjunto de Barramento Trifásico em Cobre Eletrolítico 400A com Isoladores Bujão e Termoencolhível de Cores com 12 derivações",
    tipo: "MATERIAL",
    unidade: "cj",
    precoUnitario: 680.00,
    observacao: "Barramento reforçado de alta capacidade para distribuição geral 220V/380V.",
    origem: "COENERGYGO"
  },

  // ─── TRANSFORMADORES ELEVADORES A SECO Dyn1 220V/380V Yn (BLINDAGEM ATERRADA) ───
  { codigo: "TRAFO-30KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 30 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 9500.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-45KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 45 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 11200.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-75KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 75 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 14800.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-80KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 80 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 15600.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-100KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 100 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 18200.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-112.5KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 112.5 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 19800.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-120KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 120 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 21000.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-150KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 150 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 24500.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-200KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 200 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 31000.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-250KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 250 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 38000.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-300KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 300 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 45000.00, origem: "COENERGYGO" },
  { codigo: "TRAFO-500KVA-220-380", descricao: "Transformador Elevador Trifásico a Seco 500 kVA Dyn1 (Primário 220V Δ / Secundário 380/220V Yn)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 72000.00, origem: "COENERGYGO" },

  // ─── ESTAÇÕES DE RECARGA VE (AC WALLBOX E DC FAST CHARGER) ───
  { codigo: "CHARGER-7.4KW", descricao: "Wallbox de Recarga AC 7.4 kW Monofásico Tipo 2 com Cabo 5m", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 3800.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-11KW", descricao: "Wallbox de Recarga AC 11 kW Trifásico Tipo 2 com Cabo 5m", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 5200.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-22KW", descricao: "Wallbox de Recarga AC 22 kW Trifásico Tipo 2 com Cabo 5m", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 6800.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-40KW", descricao: "Estação de Recarga DC Fast Charger 40 kW CCS2 / GB/T", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 34000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-60KW", descricao: "Estação de Recarga DC Fast Charger 60 kW CCS2 Dual Gun", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 48000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-80KW", descricao: "Estação de Recarga DC Fast Charger 80 kW CCS2 Dual Gun (Cabo Refrigerado Opcional)", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 68000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-120KW", descricao: "Estação de Recarga DC Fast Charger 120 kW CCS2 Dual Gun", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 96000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-150KW", descricao: "Estação de Recarga DC Fast Charger 150 kW CCS2 Dual Gun", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 120000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-160KW", descricao: "Estação de Recarga DC Fast Charger 160 kW CCS2 Dual Gun", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 128000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-180KW", descricao: "Estação de Recarga DC Fast Charger 180 kW CCS2 Dual Gun", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 144000.00, origem: "COENERGYGO" },
  { codigo: "CHARGER-240KW", descricao: "Estação de Recarga DC Ultra-Fast Charger 240 kW CCS2 Dual Gun", tipo: "EQUIPAMENTO", unidade: "pç", precoUnitario: 192000.00, origem: "COENERGYGO" },

  // ─── SEGURANÇA, COMBATE A INCÊNDIO & EMERGÊNCIA (NBR 17019 / CBMMG IT-41) ───
  {
    codigo: "BOTAO-EMERG-COGUMELO",
    descricao: "Botão de Emergência Cogumelo com Trava/Giro IP65 (Distância ≥ 5m do Carregador)",
    tipo: "MATERIAL",
    unidade: "cj",
    precoUnitario: 145.00,
    observacao: "Desligamento instantâneo compulsório segundo ABNT NBR 17019.",
    origem: "COENERGYGO"
  },
  {
    codigo: "BOBINA-DISPARO-MX-220V",
    descricao: "Bobina de Disparo MX (Shunt Trip) 220V CA acoplada ao Disjuntor Geral dos Carregadores",
    tipo: "MATERIAL",
    unidade: "pç",
    precoUnitario: 285.00,
    observacao: "Acionamento elétrico comandado pelo botão de emergência.",
    origem: "COENERGYGO"
  },
  {
    codigo: "EXTINTORES-CO2-ABC",
    descricao: "Conjunto de Extintores de Incêndio: 1x CO2 6kg + 1x Pó ABC 6kg com Suporte e Demarcação",
    tipo: "MATERIAL",
    unidade: "cj",
    precoUnitario: 490.00,
    observacao: "Atendimento às instruções técnicas do Corpo de Bombeiros Militar para eletropostos.",
    origem: "COENERGYGO"
  },
  {
    codigo: "SINAL-FOTOLUMINESCENTE",
    descricao: "Kit de Placas Fotoluminescentes: Risco Elétrico, Botão de Emergência e Rota de Fuga",
    tipo: "MATERIAL",
    unidade: "kit",
    precoUnitario: 180.00,
    observacao: "Conforme normas NBR 13434 e IT-41 CBMMG.",
    origem: "COENERGYGO"
  },
  {
    codigo: "BOLLARD-ACO-4POL",
    descricao: "Bate-rodas (Bollards) Tubulares em Aço Galvanizado 4\" com Pintura Zebrada Amarela/Preta",
    tipo: "MATERIAL",
    unidade: "pç",
    precoUnitario: 280.00,
    observacao: "Proteção física compulsória contra impacto mecânico acidental de veículos (NBR 17019 item 722.512.2).",
    origem: "COENERGYGO"
  },

  // ─── INFRAESTRUTURA CIVIL, TOTENS E TELEMETRIA ───
  {
    codigo: "TOTEM-ESTRUTURAL-1",
    descricao: "Totem Metálico Estrutural Galvanizado com Pintura Eletrostática a Pó e Suporte de Cabo",
    tipo: "MATERIAL",
    unidade: "pç",
    precoUnitario: 1450.00,
    origem: "COENERGYGO"
  },
  {
    codigo: "PINTURA-SOLO-VAGA-VE",
    descricao: "Demarcação de Vagas VE: Pintura Epóxi de Vaga com Resina Antiderrapante Verde + Pictograma Internacional VE",
    tipo: "MATERIAL",
    unidade: "cj",
    precoUnitario: 380.00,
    origem: "COENERGYGO"
  },
  {
    codigo: "BASE-CIVIL-CONCRETO-VE",
    descricao: "Base de Ancoragem Civil em Concreto Armado com Chumbadores Parabolt para Totem/Carregador",
    tipo: "MATERIAL",
    unidade: "cj",
    precoUnitario: 650.00,
    origem: "COENERGYGO"
  },
  {
    codigo: "MEDIDOR-MODBUS-RS485",
    descricao: "Medidor Multifunção Trifásico Digital com Comunicação RS-485 Modbus RTU para Telemetria Dedicada do Hub",
    tipo: "EQUIPAMENTO",
    unidade: "pç",
    precoUnitario: 680.00,
    origem: "COENERGYGO"
  },
  {
    codigo: "CABO-DADOS-CAT6-STP",
    descricao: "Cabo de Rede Par Trançado Blindado Cat6 STP (Comunicação DLM / OCPP / Modbus entre Carregadores)",
    tipo: "MATERIAL",
    unidade: "m",
    precoUnitario: 6.50,
    origem: "COENERGYGO"
  },
  {
    codigo: "FITA-ADVERT-ALTA-TENSAO",
    descricao: "Fita Plástica de Advertência de Perigo Alta Tensão Subterrânea 20cm",
    tipo: "MATERIAL",
    unidade: "m",
    precoUnitario: 4.50,
    origem: "COENERGYGO"
  },

  // ─── CABOS DE POTÊNCIA 0,6/1kV EPR/XLPE 90°C (COBRE - METRO) ───
  { codigo: "CABO-CU-1.5MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 1.5 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 2.80, origem: "COENERGYGO" },
  { codigo: "CABO-CU-2.5MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 2.5 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 4.50, origem: "COENERGYGO" },
  { codigo: "CABO-CU-4MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 4.0 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 6.90, origem: "COENERGYGO" },
  { codigo: "CABO-CU-6MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 6.0 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 10.20, origem: "COENERGYGO" },
  { codigo: "CABO-CU-10MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 10 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 17.50, origem: "COENERGYGO" },
  { codigo: "CABO-CU-16MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 16 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 27.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-25MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 25 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 42.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-35MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 35 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 58.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-50MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 50 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 82.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-70MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 70 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 115.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-95MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 95 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 158.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-120MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 120 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 198.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-150MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 150 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 245.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-185MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 185 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 310.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-240MM-PT", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 240 mm² - Condutor de Fase (Preto)", tipo: "MATERIAL", unidade: "m", precoUnitario: 410.00, origem: "COENERGYGO" },

  // Condutores de Neutro (Azul Claro)
  { codigo: "CABO-CU-16MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 16 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 27.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-25MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 25 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 42.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-35MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 35 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 58.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-50MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 50 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 82.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-70MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 70 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 115.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-95MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 95 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 158.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-120MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 120 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 198.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-150MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 150 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 245.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-185MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 185 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 310.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-240MM-AZ", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 240 mm² - Condutor de Neutro (Azul Claro)", tipo: "MATERIAL", unidade: "m", precoUnitario: 410.00, origem: "COENERGYGO" },

  // Condutores de Proteção / Terra (Verde)
  { codigo: "CABO-CU-16MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 16 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 27.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-25MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 25 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 42.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-35MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 35 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 58.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-50MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 50 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 82.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-70MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 70 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 115.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-95MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 95 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 158.00, origem: "COENERGYGO" },
  { codigo: "CABO-CU-120MM-VD", descricao: "Cabo de Cobre Flexível 0,6/1kV EPR/XLPE 90°C 120 mm² - Condutor de Proteção / Terra (Verde)", tipo: "MATERIAL", unidade: "m", precoUnitario: 198.00, origem: "COENERGYGO" },

  // ─── DUTOS PEAD CORRUGADOS POR METRO ───
  { codigo: "DUTO-1POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 1\" com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 8.50, origem: "COENERGYGO" },
  { codigo: "DUTO-1-1-4POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 1.1/4\" com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 12.00, origem: "COENERGYGO" },
  { codigo: "DUTO-1-1-2POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 1.1/2\" com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 15.50, origem: "COENERGYGO" },
  { codigo: "DUTO-2POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 2\" com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 22.00, origem: "COENERGYGO" },
  { codigo: "DUTO-2-1-2POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 2.1/2\" com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 29.00, origem: "COENERGYGO" },
  { codigo: "DUTO-3POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 3\" (Ø 85mm ext) com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 38.00, origem: "COENERGYGO" },
  { codigo: "DUTO-4POL", descricao: "Eletroduto / Duto PEAD Corrugado Reforçado Ø 4\" (Ø 110mm ext) com Arame Guia", tipo: "MATERIAL", unidade: "m", precoUnitario: 52.00, origem: "COENERGYGO" },

  // ─── TERMINAIS TUBULARES EM COBRE ESTANHADO ───
  { codigo: "TERM-TUBULAR-10", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 10 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 1.80, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-16", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 16 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 2.40, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-25", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 25 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 3.80, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-35", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 35 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 5.20, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-50", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 50 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 7.50, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-70", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 70 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 11.00, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-95", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 95 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 15.00, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-120", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 120 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 18.50, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-150", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 150 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 22.00, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-185", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 185 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 28.00, origem: "COENERGYGO" },
  { codigo: "TERM-TUBULAR-240", descricao: "Terminal Tubular em Cobre Eletrolítico Estanhado 240 mm²", tipo: "MATERIAL", unidade: "un", precoUnitario: 36.00, origem: "COENERGYGO" }
];

/**
 * Executa a sincronização e cadastro automático de todos os insumos de Padrão CEMIG e CoenergyGO
 * na tabela OrcamentoItemPadrao (Fonte Única da Verdade / Gestão de Orçamentos & CAPEX)
 */
export async function sincronizarCatalogoMaster() {
  const relatorio = {
    totalCemigProcessados: 0,
    totalCemigInseridos: 0,
    totalCemigAtualizados: 0,
    totalCoenergyProcessados: 0,
    totalCoenergyInseridos: 0,
    totalCoenergyAtualizados: 0,
    totalMasterFinal: 0
  };

  // 1. Carregar todos os itens existentes do Catálogo Master em memória (0 latência de busca)
  const masterExistentes = await prisma.orcamentoItemPadrao.findMany();
  const mapPorCodigo = new Map<string, any>();
  const mapPorDesc = new Map<string, any>();

  for (const item of masterExistentes) {
    if (item.codigo) mapPorCodigo.set(item.codigo.trim().toUpperCase(), item);
    if (item.descricao) mapPorDesc.set(item.descricao.trim().toLowerCase(), item);
  }

  // 2. Carregar materiais do Padrão CEMIG já homologados
  const materiaisCemigDb = await prisma.cemigMaterialPreco.findMany({
    where: { ativo: true }
  });

  const novosCemigParaInserir: any[] = [];
  const atualizacoesCemig: { id: string; data: any }[] = [];

  for (const m of materiaisCemigDb) {
    relatorio.totalCemigProcessados++;
    const codClean = m.codigo?.trim().toUpperCase();
    const descClean = m.descricao?.trim().toLowerCase();

    const itemExistente = (codClean ? mapPorCodigo.get(codClean) : null) || (descClean ? mapPorDesc.get(descClean) : null);

    const tipoItem = m.categoria === "MAO_DE_OBRA" 
      ? "MAO_DE_OBRA" 
      : m.categoria === "EQUIPAMENTO" 
      ? "EQUIPAMENTO" 
      : "MATERIAL";

    if (itemExistente) {
      const precisaPreco = !itemExistente.precoBaseUnitario || itemExistente.precoBaseUnitario === 0;
      if (precisaPreco || !itemExistente.codigo) {
        atualizacoesCemig.push({
          id: itemExistente.id,
          data: {
            codigo: itemExistente.codigo || m.codigo,
            precoBaseUnitario: precisaPreco ? m.precoUnitario : itemExistente.precoBaseUnitario,
            menorPreco: itemExistente.menorPreco || m.menorPreco || m.precoUnitario
          }
        });
        relatorio.totalCemigAtualizados++;
      }
    } else {
      const novoRegistro = {
        codigo: m.codigo,
        descricao: m.descricao,
        tipo: tipoItem,
        unidade: (m.unidade || "UN").toUpperCase(),
        precoBaseUnitario: m.precoUnitario,
        menorPreco: m.menorPreco || m.precoUnitario,
        fornecedorMenorPreco: m.fornecedorMenorPreco || "Tabela CEMIG ND-5.1",
        numeroOrcamentoMenorPreco: m.numeroOrcamentoMenorPreco || null,
        dataUltimaCotacao: m.dataUltimaCotacao || new Date()
      };
      novosCemigParaInserir.push(novoRegistro);
      if (codClean) mapPorCodigo.set(codClean, novoRegistro);
      if (descClean) mapPorDesc.set(descClean, novoRegistro);
      relatorio.totalCemigInseridos++;
    }
  }

  // Inserção em batch dos novos materiais CEMIG
  if (novosCemigParaInserir.length > 0) {
    await prisma.orcamentoItemPadrao.createMany({
      data: novosCemigParaInserir
    });
  }

  // Executar atualizações CEMIG necessárias
  for (const up of atualizacoesCemig) {
    await prisma.orcamentoItemPadrao.update({
      where: { id: up.id },
      data: up.data
    });
  }

  // 3. Processar itens nativos do CoenergyGO
  const novosCoenergyParaInserir: any[] = [];
  const atualizacoesCoenergy: { id: string; data: any }[] = [];

  for (const cItem of COENERGY_MATERIAIS_CATALOGO) {
    relatorio.totalCoenergyProcessados++;
    const codClean = cItem.codigo?.trim().toUpperCase();
    const descClean = cItem.descricao?.trim().toLowerCase();

    const itemExistente = (codClean ? mapPorCodigo.get(codClean) : null) || (descClean ? mapPorDesc.get(descClean) : null);

    if (itemExistente) {
      const precisaPreco = !itemExistente.precoBaseUnitario || itemExistente.precoBaseUnitario === 0;
      if (precisaPreco || !itemExistente.codigo) {
        atualizacoesCoenergy.push({
          id: itemExistente.id,
          data: {
            codigo: itemExistente.codigo || cItem.codigo,
            precoBaseUnitario: precisaPreco ? cItem.precoUnitario : itemExistente.precoBaseUnitario,
            menorPreco: itemExistente.menorPreco || cItem.precoUnitario
          }
        });
        relatorio.totalCoenergyAtualizados++;
      }
    } else {
      const novoRegistro = {
        codigo: cItem.codigo,
        descricao: cItem.descricao,
        tipo: cItem.tipo,
        unidade: cItem.unidade.toUpperCase(),
        precoBaseUnitario: cItem.precoUnitario,
        menorPreco: cItem.precoUnitario,
        fornecedorMenorPreco: "CoenergyGO Catálogo Referência",
        dataUltimaCotacao: new Date()
      };
      novosCoenergyParaInserir.push(novoRegistro);
      if (codClean) mapPorCodigo.set(codClean, novoRegistro);
      if (descClean) mapPorDesc.set(descClean, novoRegistro);
      relatorio.totalCoenergyInseridos++;
    }
  }

  // Inserção em batch dos novos materiais CoenergyGO
  if (novosCoenergyParaInserir.length > 0) {
    await prisma.orcamentoItemPadrao.createMany({
      data: novosCoenergyParaInserir
    });
  }

  for (const up of atualizacoesCoenergy) {
    await prisma.orcamentoItemPadrao.update({
      where: { id: up.id },
      data: up.data
    });
  }

  relatorio.totalMasterFinal = await prisma.orcamentoItemPadrao.count();
  return relatorio;
}
