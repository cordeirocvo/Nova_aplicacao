/**
 * Identificação de Grupo Tarifário, Subgrupo, Modalidade e Classe de Consumo
 * Base: ANEEL REN 1000/2021 | Lei 14300/2022 | Lei 14620/2023
 */

export interface ClassificacaoTarifaria {
  grupoTarifario: 'A' | 'B' | null;
  subgrupo: string | null;          // A1,A2,A3,A3a,A4,AS,B1,B2,B3,B4
  modalidade: string | null;        // CONVENCIONAL | AZUL | VERDE | BRANCA | HORARIA_VERDE | HORARIA_AZUL
  classeConsumo: string | null;     // Residencial | Comercial | Industrial | Rural | IP | Serv. Público
  tensaoNominal: string | null;     // 69kV, 34,5kV, 13,8kV, 220V, etc.
  descricao: string;
  regras: string[];
  eligibilidadeNET: boolean;        // Elegível para compensação de energia (Lei 14300/2022)
}

/**
 * Classifica a UC com base nos dados da fatura
 */
export function classificarTarifaria(dados: {
  tensaoFornecimento?: string | number; // kV ou "baixa tensão"
  demandaContratadaKW?: number;
  consumoMensalKWh?: number;
  subgrupoTexto?: string;            // texto livre da fatura
  modalidadeTexto?: string;
  classeTexto?: string;
}): ClassificacaoTarifaria {
  const resultado: ClassificacaoTarifaria = {
    grupoTarifario: null,
    subgrupo: null,
    modalidade: null,
    classeConsumo: null,
    tensaoNominal: null,
    descricao: '',
    regras: [],
    eligibilidadeNET: false,
  };

  // ── Tentar identificar por texto livre primeiro ──────────────────────────
  const subT = (dados.subgrupoTexto || '').toUpperCase();
  const modT = (dados.modalidadeTexto || '').toUpperCase();
  const classT = (dados.classeTexto || '').toUpperCase();

  // Subgrupo explícito na fatura
  const subgruposA = ['A1','A2','A3','A3A','A3a','A4','AS'];
  const subgruposB = ['B1','B2','B3','B4'];
  
  for (const sg of subgruposA) {
    if (subT.includes(sg.toUpperCase())) {
      resultado.grupoTarifario = 'A';
      resultado.subgrupo = sg === 'A3A' ? 'A3a' : sg;
      break;
    }
  }
  for (const sg of subgruposB) {
    if (subT.includes(sg)) {
      resultado.grupoTarifario = 'B';
      resultado.subgrupo = sg;
      break;
    }
  }

  // ── Inferir por tensão se não encontrou ──────────────────────────────────
  if (!resultado.subgrupo) {
    const tensao = parseFloat(String(dados.tensaoFornecimento || 0));
    
    if (tensao >= 230) {         resultado.grupoTarifario = 'A'; resultado.subgrupo = 'A1'; resultado.tensaoNominal = '≥ 230 kV'; }
    else if (tensao >= 88)  {   resultado.grupoTarifario = 'A'; resultado.subgrupo = 'A2'; resultado.tensaoNominal = '88–230 kV'; }
    else if (tensao >= 69)  {   resultado.grupoTarifario = 'A'; resultado.subgrupo = 'A3'; resultado.tensaoNominal = '69 kV'; }
    else if (tensao >= 30)  {   resultado.grupoTarifario = 'A'; resultado.subgrupo = 'A3a'; resultado.tensaoNominal = '30–44 kV'; }
    else if (tensao >= 2.3) {   resultado.grupoTarifario = 'A'; resultado.subgrupo = 'A4'; resultado.tensaoNominal = '2,3–25 kV'; }
    else if (tensao > 0 && tensao < 2.3) { resultado.grupoTarifario = 'A'; resultado.subgrupo = 'AS'; resultado.tensaoNominal = '< 2,3 kV (subterrâneo)'; }
    else {
      // BT — Grupo B
      resultado.grupoTarifario = 'B';
      resultado.tensaoNominal = '127/220V ou 220/380V';
    }
  }

  // ── Inferir subgrupo B por consumo/classe ────────────────────────────────
  if (resultado.grupoTarifario === 'B' && !resultado.subgrupo) {
    if (classT.includes('RESID') || classT.includes('RESIDENCIAL'))  resultado.subgrupo = 'B1';
    else if (classT.includes('RURAL') || classT.includes('AGRIC'))   resultado.subgrupo = 'B2';
    else if (classT.includes('COMERCI') || classT.includes('INDUST') || classT.includes('SERVIC')) resultado.subgrupo = 'B3';
    else if (classT.includes('ILUMINA') || classT.includes('PUBLICA')) resultado.subgrupo = 'B4';
    else resultado.subgrupo = 'B3'; // padrão Comercial/Serviços
  }

  // ── Modalidade tarifária ──────────────────────────────────────────────────
  if (modT.includes('AZUL') || modT.includes('HORÁRIA AZUL')) {
    resultado.modalidade = 'HORARIA_AZUL';
  } else if (modT.includes('VERDE') || modT.includes('HORÁRIA VERDE')) {
    resultado.modalidade = 'HORARIA_VERDE';
  } else if (modT.includes('BRANCA')) {
    resultado.modalidade = 'BRANCA';
  } else if (modT.includes('CONVENCIONAL') || modT.includes('MONÔMIA') || modT.includes('MONOMIA')) {
    resultado.modalidade = 'CONVENCIONAL';
  } else {
    // Inferir por grupo/subgrupo
    if (resultado.grupoTarifario === 'B') {
      resultado.modalidade = resultado.subgrupo === 'B1' ? 'CONVENCIONAL' : 'CONVENCIONAL';
    } else {
      // Grupo A — pode ser Azul ou Verde
      resultado.modalidade = resultado.subgrupo === 'A4' ? 'HORARIA_VERDE' : 'HORARIA_AZUL';
    }
  }

  // ── Classe de consumo ─────────────────────────────────────────────────────
  if (classT.includes('RESID'))     resultado.classeConsumo = 'Residencial';
  else if (classT.includes('RURAL')) resultado.classeConsumo = 'Rural';
  else if (classT.includes('INDUST')) resultado.classeConsumo = 'Industrial';
  else if (classT.includes('COMERCI')) resultado.classeConsumo = 'Comercial';
  else if (classT.includes('ILUMINA') || classT.includes('PUBLICA')) resultado.classeConsumo = 'Iluminação Pública';
  else if (classT.includes('IRRIGAN')) resultado.classeConsumo = 'Rural/Irrigante';
  else if (resultado.subgrupo === 'B1') resultado.classeConsumo = 'Residencial';
  else if (resultado.subgrupo === 'B2') resultado.classeConsumo = 'Rural';
  else if (resultado.subgrupo === 'B4') resultado.classeConsumo = 'Iluminação Pública';
  else resultado.classeConsumo = 'Comercial/Serviços';

  // ── Elegibilidade NET metering (Lei 14300/2022) ──────────────────────────
  resultado.eligibilidadeNET =
    resultado.grupoTarifario === 'B' ||
    (resultado.grupoTarifario === 'A' && ['A3a','A4','AS'].includes(resultado.subgrupo || ''));

  // ── Descrição legível ─────────────────────────────────────────────────────
  resultado.descricao = [
    `Grupo ${resultado.grupoTarifario}`,
    resultado.subgrupo ? `/ Subgrupo ${resultado.subgrupo}` : '',
    `— ${resultado.classeConsumo}`,
    `| Modalidade: ${modalidadeLabel(resultado.modalidade)}`,
  ].filter(Boolean).join(' ');

  // ── Regras e alertas ──────────────────────────────────────────────────────
  resultado.regras = gerarRegras(resultado);

  return resultado;
}

function modalidadeLabel(m: string | null): string {
  const map: Record<string, string> = {
    CONVENCIONAL: 'Convencional (Monômia)',
    HORARIA_AZUL: 'Horária Azul (Azul) — Demanda HP/HFP + Consumo HP/HFP',
    HORARIA_VERDE: 'Horária Verde — Demanda única + Consumo HP/HFP',
    BRANCA: 'Branca — 3 postos tarifários (HP/Intermediário/HFP)',
  };
  return map[m || ''] || m || 'Não identificada';
}

function gerarRegras(c: ClassificacaoTarifaria): string[] {
  const r: string[] = [];
  if (c.grupoTarifario === 'A') {
    r.push('Grupo A: medição em média ou alta tensão. Possui demanda contratada.');
    if (c.modalidade === 'HORARIA_AZUL') {
      r.push('Modalidade Azul: tarifa de demanda diferenciada para HP e HFP. Ideal para corte de demanda na ponta com BESS.');
    }
    if (c.modalidade === 'HORARIA_VERDE') {
      r.push('Modalidade Verde: demanda única (apenas uma tarifa). Foco em redução de consumo no HP com BESS/solar.');
    }
    r.push('BESS pode reduzir demanda de ponta (Peak Shaving), gerando economia na parcela de demanda.');
    r.push('Lei 14300/2022: Micro/mini geração distribução elegível para compensação de energia.');
  } else {
    r.push('Grupo B: medição em baixa tensão. Sem demanda contratada — economia em kWh.');
    r.push('BESS com Time Shifting pode arbitrar entre tarifas (Branca/horária) se aplicável.');
    if (c.modalidade === 'BRANCA') {
      r.push('Tarifa Branca ativa: 3 postos tarifários. BESS de Time Shifting tem alto potencial de economia.');
    }
    r.push('Solar FV pode reduzir consumo da rede com compensação via SIGEN/SCDE.');
  }
  if (c.eligibilidadeNET) {
    r.push('✅ Elegível para Sistema de Compensação de Energia Elétrica (Lei 14300/2022 + REN 687/2015 atualizada).');
  }
  return r;
}

/** Identifica bandeira tarifária a partir de texto */
export function identificarBandeira(texto: string): string | null {
  const t = texto.toUpperCase();
  if (t.includes('VERMELHA 2') || t.includes('VERMELHO PATAMAR 2')) return 'Vermelha 2';
  if (t.includes('VERMELHA 1') || t.includes('VERMELHO PATAMAR 1')) return 'Vermelha 1';
  if (t.includes('AMARELA') || t.includes('AMARELO'))  return 'Amarela';
  if (t.includes('VERDE'))   return 'Verde';
  return null;
}
