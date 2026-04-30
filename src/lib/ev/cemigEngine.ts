/**
 * CEMIG ND-5.1 (NOV/2024) — Engine de Dimensionamento do Padrão de Entrada
 * Normas base: ND-5.1, ND-5.2, ND-5.3, ND-5.30, ED-5.57, ED-5.58, REN 1000/2021 Art.550
 * Cordeiro Energia — Módulo de Carregadores VE
 */

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface ChargerConfig {
  powerKW: number;        // Potência unitária do carregador (kW)
  quantity: number;       // Número de carregadores
  phases: 1 | 3;         // 1 = monofásico, 3 = trifásico
  chargerType: 'AC' | 'DC'; // AC = wallbox, DC = DCFC rápido
}

export interface CemigInput {
  chargers: ChargerConfig[];
  existingLoadKW: number;    // Carga instalada existente (kW) — além dos carregadores
  simultaneityFactor: number; // Fator de simultaneidade (0..1), ex: 0.8
  isCollectiveBuilding: boolean; // Se true, usa ND-5.2
  location: 'urbano' | 'rural';
}

export interface CemigResult {
  // Totais calculados
  totalInstalledLoadKW: number;
  demandaKVA: number;
  totalChargersKW: number;

  // Classificação CEMIG
  tipoUC: 'A' | 'B' | 'C' | 'F' | 'MT';
  tipoUCDesc: string;
  normaAplicavel: string;

  // Padrão de entrada
  padraoEntrada: string;
  padraoDesc: string;

  // Ramal de conexão
  ramalTipo: 'Aéreo' | 'Subterrâneo' | 'MT';
  ramalDesc: string;
  caixaInspecao?: 'ZA' | 'ZB' | 'ZC';

  // Ações obrigatórias
  acoes: AcaoObrigatoria[];

  // Alertas
  alertas: Alerta[];

  // Resultado CEMIG (faixa de demanda)
  demandaFaixa: string;
}

export interface AcaoObrigatoria {
  tipo: 'obrigatoria' | 'recomendada' | 'warning';
  titulo: string;
  descricao: string;
  referencia: string;
}

export interface Alerta {
  nivel: 'critico' | 'atencao' | 'info';
  titulo: string;
  descricao: string;
}

// ─── ENGINE PRINCIPAL ─────────────────────────────────────────────────────────

export function calcularPadraoEntrada(input: CemigInput): CemigResult {
  const { chargers, existingLoadKW, simultaneityFactor, isCollectiveBuilding, location } = input;

  // 1. Calcular carga total dos carregadores
  const totalChargersKW = chargers.reduce(
    (sum, c) => sum + c.powerKW * c.quantity,
    0
  );

  // 2. Carga instalada total (carregadores + demais cargas)
  const totalInstalledLoadKW = totalChargersKW + existingLoadKW;

  // 3. Calcular demanda (kVA)
  // EV chargers: fator de potência ~0.95 (wallbox AC) ou 0.98 (DC)
  const avgPF = chargers.some(c => c.chargerType === 'DC') ? 0.97 : 0.95;
  const demandaKW = totalInstalledLoadKW * simultaneityFactor;
  const demandaKVA = demandaKW / avgPF;

  // 4. Verificar se carregadores DC geram harmônicos (carga perturbadora)
  const hasDCFastCharger = chargers.some(c => c.chargerType === 'DC' && c.powerKW >= 22);
  const hasHighPowerDC = chargers.some(c => c.chargerType === 'DC' && c.powerKW >= 50);

  // 5. Classificar tipo de UC — ND-5.1 §4.5 e §4.16
  let tipoUC: CemigResult['tipoUC'];
  let tipoUCDesc: string;
  let normaAplicavel: string;
  let padraoEntrada: string;
  let padraoDesc: string;
  let ramalTipo: CemigResult['ramalTipo'];
  let ramalDesc: string;
  let caixaInspecao: CemigResult['caixaInspecao'] | undefined;
  let demandaFaixa: string;

  if (isCollectiveBuilding) {
    normaAplicavel = 'ND-5.2 (Edificações Coletivas)';
  } else {
    normaAplicavel = 'ND-5.1 (Edificações Individuais)';
  }

  if (demandaKVA > 304) {
    // Média Tensão obrigatória
    tipoUC = 'MT';
    tipoUCDesc = 'Média Tensão — Subestação obrigatória';
    normaAplicavel = 'ND-5.3 (Média Tensão)';
    padraoEntrada = 'Subestação MT';
    padraoDesc = 'Projeto de subestação conforme ND-5.3. Exige ART de engenheiro habilitado.';
    ramalTipo = 'MT';
    ramalDesc = 'Alimentação em Média Tensão. Necessário projeto elétrico completo de subestação.';
    demandaFaixa = `> 304 kVA (${demandaKVA.toFixed(1)} kVA calculado)`;
  } else if (totalInstalledLoadKW > 75) {
    // Tipo F — BT por opção, carga > 75 kW
    tipoUC = 'F';
    tipoUCDesc = 'Tipo F — Trifásico 4 fios (3F+N) | Carga > 75 kW, BT por opção';

    if (demandaKVA <= 95) {
      padraoEntrada = 'Tipo F — APR Web + Pedido Escrito';
      padraoDesc = 'Preencher Formulário APR Web e enviar pedido por escrito à CEMIG. Caixa CM-3 ou CM-3LVP.';
      ramalTipo = 'Aéreo';
      ramalDesc = 'Ramal de conexão aéreo. Ponto de conexão no pingadouro do padrão de entrada.';
      demandaFaixa = `75,1–95 kVA (${demandaKVA.toFixed(1)} kVA calculado)`;
    } else {
      padraoEntrada = 'Tipo F — Ramal Subterrâneo + APR Web';
      padraoDesc = 'Ramal subterrâneo obrigatório. Caixa de inspeção ZC no passeio público. Preencher APR Web.';
      ramalTipo = 'Subterrâneo';
      ramalDesc = 'Ramal de conexão subterrâneo obrigatório (demanda > 95 kVA). Caixa de inspeção ZC na divisa.';
      caixaInspecao = 'ZC';
      demandaFaixa = `95,1–304 kVA (${demandaKVA.toFixed(1)} kVA calculado)`;
    }
  } else if (totalInstalledLoadKW > 16) {
    // Tipo C — trifásico padrão
    tipoUC = 'C';
    tipoUCDesc = 'Tipo C — Trifásico 4 fios (3F+N) | 16,1–75 kW';
    padraoEntrada = 'Tipo C — Caixa CM-2 ou CM-14';
    padraoDesc = 'Caixa polifásica CM-2 ou CM-14. Ramal aéreo. Disjuntor conforme Tabela 1 da ND-5.1.';
    ramalTipo = 'Aéreo';
    ramalDesc = 'Ramal de conexão aéreo. Ponto de conexão no pingadouro do padrão de entrada.';

    // Verificar limites de caixa de inspeção para ramal subterrâneo (se > 47 kVA)
    if (demandaKVA > 47 && demandaKVA <= 95) {
      caixaInspecao = 'ZB';
    } else if (demandaKVA <= 47) {
      caixaInspecao = 'ZA';
    }
    demandaFaixa = `16,1–75 kW instalado (${demandaKVA.toFixed(1)} kVA calculado)`;
  } else if (totalInstalledLoadKW > 8) {
    // Tipo B — bifásico
    tipoUC = 'B';
    tipoUCDesc = 'Tipo B — Bifásico 3 fios (2F+N) | 8,1–16 kW';
    padraoEntrada = 'Tipo B — Caixa CM-2 ou CM-14';
    padraoDesc = 'Caixa polifásica bifásica. Ramal aéreo. Disjuntor conforme Tabela 2 da ND-5.1.';
    ramalTipo = 'Aéreo';
    ramalDesc = 'Ramal de conexão aéreo. Ponto de conexão no pingadouro do padrão de entrada.';
    demandaFaixa = `8,1–16 kW instalado (${demandaKVA.toFixed(1)} kVA calculado)`;
  } else {
    // Tipo A — monofásico
    tipoUC = 'A';
    tipoUCDesc = 'Tipo A — Monofásico 2 fios (F+N) | até 8 kW';
    padraoEntrada = 'Tipo A — Caixa CM-1 ou CM-13';
    padraoDesc = 'Caixa monofásica CM-1 ou CM-13. Ramal aéreo. Disjuntor conforme Tabela 3 da ND-5.1.';
    ramalTipo = 'Aéreo';
    ramalDesc = 'Ramal de conexão aéreo. Ponto de conexão no pingadouro do padrão de entrada.';
    demandaFaixa = `até 8 kW instalado (${demandaKVA.toFixed(1)} kVA calculado)`;
  }

  // ─── AÇÕES OBRIGATÓRIAS ───────────────────────────────────────────────────

  const acoes: AcaoObrigatoria[] = [];

  // SEMPRE obrigatório: comunicar CEMIG (ND-5.1 §4.14.1 + REN 1000/2021 Art.550)
  acoes.push({
    tipo: 'obrigatoria',
    titulo: 'Comunicar a CEMIG ANTES da instalação',
    descricao:
      'A instalação de estação de recarga de veículos elétricos deve ser comunicada previamente à distribuidora em caso de conexão nova, aumento de carga ou alteração do nível de tensão.',
    referencia: 'ND-5.1 §4.14.1 | REN 1000/2021 Art. 550',
  });

  // V2G é proibido
  acoes.push({
    tipo: 'obrigatoria',
    titulo: 'V2G (Veículo-para-Rede) é VETADO pela CEMIG',
    descricao:
      'É vedada a injeção de energia elétrica na rede de distribuição a partir de veículos elétricos.',
    referencia: 'ND-5.1 §4.14.2',
  });

  // APR Web obrigatório para carga > 75 kW
  if (totalInstalledLoadKW > 75) {
    acoes.push({
      tipo: 'obrigatoria',
      titulo: 'Preencher Formulário APR Web',
      descricao:
        'Para carga instalada superior a 75 kW e demanda até 304 kVA, o consumidor deve apresentar à CEMIG o Formulário APR Web preenchido, juntamente com ART ou TRT de projeto.',
      referencia: 'ND-5.1 §4.7.1.2',
    });
    acoes.push({
      tipo: 'obrigatoria',
      titulo: 'Pedido por escrito para fornecimento em BT',
      descricao:
        'A opção por fornecimento em baixa tensão com carga acima de 75 kW deve ser formalizada por escrito ao engenheiro de rede da CEMIG, com documento "Opção de Atendimento em Baixa Tensão".',
      referencia: 'ND-5.1 §2.1.b | §4.16.1',
    });
  }

  // MT requer projeto completo
  if (tipoUC === 'MT') {
    acoes.push({
      tipo: 'obrigatoria',
      titulo: 'Projeto de Subestação de Média Tensão',
      descricao:
        'Elaborar projeto elétrico e eletromecânico da subestação conforme EA/EA-12254. ART obrigatória.',
      referencia: 'ND-5.3 | EA/EA-12254',
    });
  }

  // Formulário MT se aplicável
  if (hasHighPowerDC) {
    acoes.push({
      tipo: 'recomendada',
      titulo: 'Solicitar estudo de rede em MT',
      descricao:
        'Para carregadores DCFC ≥ 50 kW, recomenda-se solicitar estudo de rede de Média Tensão via formulário específico.',
      referencia: 'Formulário para Solicitar Estudo em Rede MT — cemig.com.br',
    });
  }

  // ─── ALERTAS ─────────────────────────────────────────────────────────────

  const alertas: Alerta[] = [];

  // Carregadores DC rápidos = carga perturbadora
  if (hasDCFastCharger) {
    alertas.push({
      nivel: 'critico',
      titulo: '⚡ Carga Potencialmente Perturbadora — ED-5.58',
      descricao:
        'Carregadores DC rápidos (≥ 22 kW) utilizam retificadores de alta frequência que geram harmônicos de corrente. A CEMIG pode exigir estudo de impacto (espectro harmônico) e instalação de filtros antes de aprovar a ligação. Verificar limites do PRODIST Módulo 8.',
    });
  }

  if (hasHighPowerDC) {
    alertas.push({
      nivel: 'critico',
      titulo: '🔴 Carregador DCFC ≥ 50 kW — Análise obrigatória pela CEMIG',
      descricao:
        'Carregadores de carga rápida acima de 50 kW exigem análise prévia da concessionária sobre impacto na rede. Pode ser necessário apresentar estudo de desequilíbrio de fase e distorção harmônica.',
    });
  }

  if (tipoUC === 'F' || tipoUC === 'MT') {
    alertas.push({
      nivel: 'atencao',
      titulo: 'Aumento de carga — aguardar estudo de rede',
      descricao:
        'Para proteções ≥ 225A (carga > 75 kW), a CEMIG realizará estudo de rede antes da ligação. O padrão só pode ser construído após aprovação. Prazo estimado: 30 a 90 dias.',
    });
  }

  alertas.push({
    nivel: 'info',
    titulo: 'Distribuição equilibrada entre fases',
    descricao:
      'As cargas internas devem ser distribuídas entre as fases de forma que o desequilíbrio de tensão não exceda os valores do PRODIST Módulo 8.',
  });

  if (ramalTipo === 'Subterrâneo') {
    alertas.push({
      nivel: 'atencao',
      titulo: 'Ramal subterrâneo — responsabilidade do consumidor',
      descricao:
        `A construção e manutenção da caixa de inspeção ${caixaInspecao} no passeio público (junto à divisa da propriedade) é de responsabilidade do consumidor.`,
    });
  }

  return {
    totalInstalledLoadKW,
    demandaKVA: parseFloat(demandaKVA.toFixed(1)),
    totalChargersKW,
    tipoUC,
    tipoUCDesc,
    normaAplicavel,
    padraoEntrada,
    padraoDesc,
    ramalTipo,
    ramalDesc,
    caixaInspecao,
    acoes,
    alertas,
    demandaFaixa,
  };
}

// ─── HELPERS E CONSTANTES ────────────────────────────────────────────────────

/** Tabela de tipos de UC para exibição */
export const TIPOS_UC = [
  { id: 'A', label: 'Tipo A', desc: 'Monofásico 2 fios (F+N)', limiteKW: 8, fases: '1F' },
  { id: 'B', label: 'Tipo B', desc: 'Bifásico 3 fios (2F+N)', limiteKW: 16, fases: '2F' },
  { id: 'C', label: 'Tipo C', desc: 'Trifásico 4 fios (3F+N)', limiteKW: 75, fases: '3F' },
  { id: 'F', label: 'Tipo F', desc: 'Trifásico 4 fios — BT por opção (> 75 kW)', limiteKW: 304, fases: '3F' },
  { id: 'MT', label: 'Média Tensão', desc: 'Subestação — ND-5.3', limiteKW: Infinity, fases: 'MT' },
];

/** Potências típicas de carregadores */
export const CHARGER_PRESETS = [
  { label: '3,7 kW — Tomada doméstica (2,4 kW a 3,7 kW)', powerKW: 3.7, phases: 1, type: 'AC' as const },
  { label: '7,4 kW — Wallbox Nível 1 (monofásico)', powerKW: 7.4, phases: 1, type: 'AC' as const },
  { label: '11 kW — Wallbox Nível 2 (trifásico 16A)', powerKW: 11, phases: 3, type: 'AC' as const },
  { label: '22 kW — Wallbox Nível 2 (trifásico 32A)', powerKW: 22, phases: 3, type: 'AC' as const },
  
  // Komeco
  { label: 'Komeco KOEV 7kW (Monofásico)', powerKW: 7, phases: 1, type: 'AC' as const },
  { label: 'Komeco KOEV 22kW (Trifásico)', powerKW: 22, phases: 3, type: 'AC' as const },
  
  // WEG
  { label: 'WEG WEMOB Wall 7,4kW (Monofásico)', powerKW: 7.4, phases: 1, type: 'AC' as const },
  { label: 'WEG WEMOB Parking 22kW (Trifásico)', powerKW: 22, phases: 3, type: 'AC' as const },
  { label: 'WEG WEMOB Station 60kW (DC Rápido)', powerKW: 60, phases: 3, type: 'DC' as const },
  { label: 'WEG WEMOB Station 150kW (DC Ultra-Rápido)', powerKW: 150, phases: 3, type: 'DC' as const },
  
  // BENY
  { label: 'BENY BCP 7,4kW (AC Monofásico)', powerKW: 7.4, phases: 1, type: 'AC' as const },
  { label: 'BENY BCP 22kW (AC Trifásico)', powerKW: 22, phases: 3, type: 'AC' as const },
  { label: 'BENY DC 20kW (Rápido)', powerKW: 20, phases: 3, type: 'DC' as const },
  { label: 'BENY DC 120kW (Ultra-Rápido)', powerKW: 120, phases: 3, type: 'DC' as const },

  { label: '50 kW — DCFC Rápido (DC)', powerKW: 50, phases: 3, type: 'DC' as const },
  { label: '100 kW — DCFC Ultra-rápido (DC)', powerKW: 100, phases: 3, type: 'DC' as const },
  { label: '350 kW — HPC (High Power Charging)', powerKW: 350, phases: 3, type: 'DC' as const },
];

/** Links dos documentos CEMIG */
export const CEMIG_DOCS = {
  nd51: 'https://www.cemig.com.br/wp-content/uploads/2025/10/nd5_1_000001p.docx.pdf',
  nd52: 'https://www.cemig.com.br/wp-content/uploads/2025/10/nd5_2_000001p.docx.pdf',
  nd53: 'https://www.cemig.com.br/wp-content/uploads/2025/10/nd5_3_000001p.pdf',
  nd530: 'https://www.cemig.com.br/wp-content/uploads/2025/10/ND_5.30_Conexao-em-BT.pdf',
  ed558: 'https://www.cemig.com.br/wp-content/uploads/2025/10/ED-5-58_Criterios-Para-Conexao-de-Cargas-Potencialmente-Perturbadoras.pdf',
  pec11: 'https://www.cemig.com.br/wp-content/uploads/2025/11/pec-11-norma-conexao.pdf',
  aprWeb: 'https://www.cemig.com.br/wp-content/uploads/2025/11/formulario-para-orcamento-de-conexao-ou-aprovacao-de-projeto-eletrico-bt-via-apr-web.xlsx',
};
