/**
 * Motor de Dimensionamento de Padrão de Entrada CEMIG
 * Baseado na Norma Técnica CEMIG ND-5.1 (Nov/2024)
 * - Tabela 1: Redes Secundárias 127/220V (Monofásico e Bifásico)
 * - Tabela 2: Redes Secundárias Trifásicas 127/220V (Ligações a 4 fios)
 * - Desenhos 5, 6, 13 e 57 (Postes, Caixas, Aterramento e Ferragens)
 * Cordeiro Energia - Engenharia e Mobilidade Elétrica
 */

export type TipoPadrao = "BIFASICO" | "TRIFASICO";
export type CategoriaDemandaPadrao = "INDIVIDUAL_TABELA_2" | "ALTA_DEMANDA_TABELA_4";
export type CaixaDisjuntorTabela4 = "CM-9" | "CM-18";
export type TipoCaixaSubterraneaTabela4 = "ZC" | "ZD";
export type LadoRede = "MESMO_LADO" | "LADO_OPOSTO"; // A Favor ou Contra
export type TipoSaida = "AEREA" | "SUBTERRANEA"; // Saída Aérea ou Subterrânea
export type LocalizacaoPadrao = "URBANO" | "RURAL"; // Localização da Unidade Consumidora
export type TipoEstrutura = "POSTE_CONCRETO" | "POSTE_ACO" | "PONTALETE" | "MURO";
export type FinalidadePadrao = "CARREGADOR_VE" | "PADRAO_GERAL" | "AUMENTO_CARGA";

export interface ParametrosPadraoCemig {
  tipoPadrao: TipoPadrao;
  categoriaDemanda?: CategoriaDemandaPadrao; // Tabela 2 (Individual até 75 kVA) ou Tabela 4 (Alta Demanda 75,1 a 304 kVA)
  tipoCaixaDisjuntorTabela4?: CaixaDisjuntorTabela4; // Para F1 e F2: CM-9 ou CM-18
  tipoCaixaSubterranea?: TipoCaixaSubterraneaTabela4; // Caixa de Passagem: ZC (Padrão/Calçada) ou ZD (Pista/Derivação)
  disjuntorAmperes: number;
  ladoRede: LadoRede;
  tipoSaida?: TipoSaida; // default "AEREA"
  localizacao?: LocalizacaoPadrao; // default "URBANO"
  tipoEstrutura: TipoEstrutura;
  finalidade?: FinalidadePadrao;
  potenciaCarregadorKW?: number;
  modeloCarregador?: string;
  incluirMaoDeObra?: boolean;
  incluirART?: boolean;
  incluirVistoria?: boolean;
}

export interface ItemMaterialSugerido {
  codigo: string;
  descricao: string;
  categoria: "POSTE" | "CAIXA" | "DISJUNTOR" | "CONDUTOR" | "ELETRODUTO" | "ATERRAMENTO" | "FERRAGEM" | "ACESSORIO" | "MAO_DE_OBRA";
  unidade: string;
  quantidade: number;
  precoUnitarioEstimado: number;
  precoTotal: number;
  obrigatorioNorma: boolean;
  nota?: string;
}

export interface ResultadoDimensionamentoPadrao {
  tipoPadrao: TipoPadrao;
  categoriaDemanda?: CategoriaDemandaPadrao;
  tipoSaida: TipoSaida;
  localizacao: LocalizacaoPadrao;
  ladoRede: LadoRede;
  faixaFornecimento: string; // "B1", "C1", "C2", "C3", "C4", "C5", "C6" ou "F1".."F9"
  demandaMinKVA: number;
  demandaMaxKVA: number;
  fases: number;
  fios: number;
  disjuntorNominalA: number;
  caboFaseMm2: number;
  caboNeutroMm2: number;
  caboProtecaoMm2: number;
  caboNuMm2: number;
  hastesAterramentoQtde: number;
  eletrodutoPVCmm: number;
  eletrodutoPvcPol: string;
  eletrodutoAcoMm: number;
  tcRelacao?: string;
  tcQuantidade?: number;
  posteHomologado: string;
  caixaMedicao: string;
  caixaDisjuntor: string;
  tipoCaixaSubterranea?: TipoCaixaSubterraneaTabela4;
  descricaoResumo: string;
  notasTecnicas: string[];
  alertasEV: string[];
  itensSugeridos: ItemMaterialSugerido[];
}

export const FAIXAS_TRIFASICO_TABELA_2 = [
  {
    faixa: "C1",
    demandaMin: 0,
    demandaMax: 24.0,
    disjuntor: 63,
    caboFase: 16,
    caboNeutro: 16,
    caboProtecao: 16,
    caboNu: 10,
    hastes: 2,
    eletrodutoPVC: 32,
    eletrodutoPvcPol: "1\"",
    eletrodutoAco: 25,
    posteMesmoLadoAco: "PA1",
    posteMesmoLadoConc: "PC1",
    posteLadoOpostoAco: "PA4",
    posteLadoOpostoConc: "PC2",
    pontalete: "PT1"
  },
  {
    faixa: "C2",
    demandaMin: 24.1,
    demandaMax: 30.5,
    disjuntor: 80,
    caboFase: 25,
    caboNeutro: 25,
    caboProtecao: 16,
    caboNu: 10,
    hastes: 2,
    eletrodutoPVC: 40,
    eletrodutoPvcPol: "1.1/4\"",
    eletrodutoAco: 32,
    posteMesmoLadoAco: "PA1",
    posteMesmoLadoConc: "PC1",
    posteLadoOpostoAco: "PA4",
    posteLadoOpostoConc: "PC2",
    pontalete: "PT1"
  },
  {
    faixa: "C3",
    demandaMin: 30.6,
    demandaMax: 38.1,
    disjuntor: 100,
    caboFase: 35,
    caboNeutro: 35,
    caboProtecao: 16,
    caboNu: 10,
    hastes: 2,
    eletrodutoPVC: 40,
    eletrodutoPvcPol: "1.1/4\"",
    eletrodutoAco: 32,
    posteMesmoLadoAco: "PA2",
    posteMesmoLadoConc: "PC1",
    posteLadoOpostoAco: "PA5",
    posteLadoOpostoConc: "PC3",
    pontalete: "PT1"
  },
  {
    faixa: "C4",
    demandaMin: 38.2,
    demandaMax: 47.6,
    disjuntor: 125,
    caboFase: 50,
    caboNeutro: 50,
    caboProtecao: 25,
    caboNu: 10,
    hastes: 2,
    eletrodutoPVC: 50,
    eletrodutoPvcPol: "1.1/2\"",
    eletrodutoAco: 40,
    posteMesmoLadoAco: "PA2",
    posteMesmoLadoConc: "PC1",
    posteLadoOpostoAco: "PA5",
    posteLadoOpostoConc: "PC3",
    pontalete: "PT1"
  },
  {
    faixa: "C5",
    demandaMin: 47.7,
    demandaMax: 57.1,
    disjuntor: 150,
    caboFase: 70,
    caboNeutro: 70,
    caboProtecao: 35,
    caboNu: 10,
    hastes: 3,
    eletrodutoPVC: 60,
    eletrodutoPvcPol: "2\"",
    eletrodutoAco: 50,
    posteMesmoLadoAco: "PA3",
    posteMesmoLadoConc: "PC3",
    posteLadoOpostoAco: "PA6",
    posteLadoOpostoConc: "PC3",
    pontalete: "PT2"
  },
  {
    faixa: "C6",
    demandaMin: 57.2,
    demandaMax: 75.0,
    disjuntor: 200,
    caboFase: 95,
    caboNeutro: 95,
    caboProtecao: 35,
    caboNu: 10,
    hastes: 3,
    eletrodutoPVC: 75,
    eletrodutoPvcPol: "2.1/2\"",
    eletrodutoAco: 65,
    posteMesmoLadoAco: "PA3",
    posteMesmoLadoConc: "PC3",
    posteLadoOpostoAco: "PA6",
    posteLadoOpostoConc: "PC3",
    pontalete: "PT2"
  }
];

export const FAIXA_BIFASICO_TABELA_1 = {
  faixa: "B1",
  cargaMin: 8.1,
  cargaMax: 16.0,
  disjuntoresPermitidos: [40, 50, 63],
  disjuntorPadrao: 63,
  caboFase: 16,
  caboNeutro: 16,
  caboProtecao: 16,
  caboNu: 10,
  hastes: 1,
  eletrodutoPVC: 32,
  eletrodutoPvcPol: "1\"",
  eletrodutoAco: 25,
  posteMesmoLadoAco: "PA1",
  posteMesmoLadoConc: "PC1",
  posteLadoOpostoAco: "PA4",
  posteLadoOpostoConc: "PC2",
  pontalete: "PT1"
};

export interface FaixaTabela4 {
  faixa: "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9";
  demandaMin: number;
  demandaMax: number;
  disjuntor: number;
  disjuntoresAlternativos?: number[];
  caboFaseAl: number;
  caboFaseAlVias: number;
  caboFaseCu: number;
  caboFaseCuVias: number;
  caboProtecaoCu: number;
  tcRelacao: "200/5" | "400/5" | "600/5";
  tcFatorTermico: number;
  hastes: number;
  caboAterramentoNu: number;
  eletrodutoCuPVC: number;
  eletrodutoCuPvcPol: string;
  eletrodutoCuAco: number;
  eletrodutoCuVias: number;
  posteMesmoLadoAco?: string;
  posteMesmoLadoConc?: string;
  posteLadoOpostoAco?: string;
  posteLadoOpostoConc?: string;
  caixaMedicao: "CM-4";
  caixasDisjuntorPermitidas: ("CM-9" | "CM-18")[];
  subterraneoObrigatorio: boolean;
}

export const FAIXAS_TRIFASICO_TABELA_4: FaixaTabela4[] = [
  {
    faixa: "F1",
    demandaMin: 75.1,
    demandaMax: 86.0,
    disjuntor: 225,
    caboFaseAl: 150,
    caboFaseAlVias: 1,
    caboFaseCu: 120,
    caboFaseCuVias: 1,
    caboProtecaoCu: 70,
    tcRelacao: "200/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 85,
    eletrodutoCuPvcPol: "3\"",
    eletrodutoCuAco: 80,
    eletrodutoCuVias: 1,
    posteMesmoLadoAco: "PA3",
    posteMesmoLadoConc: "PC3",
    posteLadoOpostoAco: "PA6",
    posteLadoOpostoConc: "PC3",
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-9", "CM-18"],
    subterraneoObrigatorio: false
  },
  {
    faixa: "F2",
    demandaMin: 86.1,
    demandaMax: 95.0,
    disjuntor: 250,
    caboFaseAl: 185,
    caboFaseAlVias: 1,
    caboFaseCu: 150,
    caboFaseCuVias: 1,
    caboProtecaoCu: 70,
    tcRelacao: "200/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 110,
    eletrodutoCuPvcPol: "4\"",
    eletrodutoCuAco: 100,
    eletrodutoCuVias: 1,
    posteMesmoLadoAco: "PA3",
    posteMesmoLadoConc: "PC3",
    posteLadoOpostoAco: "PA6",
    posteLadoOpostoConc: "PC3",
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-9", "CM-18"],
    subterraneoObrigatorio: false
  },
  {
    faixa: "F3",
    demandaMin: 95.1,
    demandaMax: 114.0,
    disjuntor: 300,
    disjuntoresAlternativos: [300, 315, 320],
    caboFaseAl: 240,
    caboFaseAlVias: 1,
    caboFaseCu: 240,
    caboFaseCuVias: 1,
    caboProtecaoCu: 120,
    tcRelacao: "200/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 110,
    eletrodutoCuPvcPol: "4\"",
    eletrodutoCuAco: 100,
    eletrodutoCuVias: 1,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  },
  {
    faixa: "F4",
    demandaMin: 114.1,
    demandaMax: 152.0,
    disjuntor: 400,
    caboFaseAl: 240,
    caboFaseAlVias: 2,
    caboFaseCu: 120,
    caboFaseCuVias: 2,
    caboProtecaoCu: 50,
    tcRelacao: "400/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 75,
    eletrodutoCuPvcPol: "2.1/2\"",
    eletrodutoCuAco: 65,
    eletrodutoCuVias: 2,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  },
  {
    faixa: "F5",
    demandaMin: 152.1,
    demandaMax: 171.0,
    disjuntor: 450,
    caboFaseAl: 240,
    caboFaseAlVias: 2,
    caboFaseCu: 150,
    caboFaseCuVias: 2,
    caboProtecaoCu: 70,
    tcRelacao: "400/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 85,
    eletrodutoCuPvcPol: "3\"",
    eletrodutoCuAco: 80,
    eletrodutoCuVias: 2,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  },
  {
    faixa: "F6",
    demandaMin: 171.1,
    demandaMax: 188.0,
    disjuntor: 500,
    caboFaseAl: 240,
    caboFaseAlVias: 2,
    caboFaseCu: 185,
    caboFaseCuVias: 2,
    caboProtecaoCu: 95,
    tcRelacao: "400/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 110,
    eletrodutoCuPvcPol: "4\"",
    eletrodutoCuAco: 100,
    eletrodutoCuVias: 2,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  },
  {
    faixa: "F7",
    demandaMin: 188.1,
    demandaMax: 228.0,
    disjuntor: 630,
    disjuntoresAlternativos: [600, 630],
    caboFaseAl: 240,
    caboFaseAlVias: 3,
    caboFaseCu: 240,
    caboFaseCuVias: 2,
    caboProtecaoCu: 120,
    tcRelacao: "600/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 110,
    eletrodutoCuPvcPol: "4\"",
    eletrodutoCuAco: 100,
    eletrodutoCuVias: 2,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  },
  {
    faixa: "F8",
    demandaMin: 228.1,
    demandaMax: 266.0,
    disjuntor: 700,
    caboFaseAl: 240,
    caboFaseAlVias: 3,
    caboFaseCu: 150,
    caboFaseCuVias: 3,
    caboProtecaoCu: 70,
    tcRelacao: "600/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 85,
    eletrodutoCuPvcPol: "3\"",
    eletrodutoCuAco: 80,
    eletrodutoCuVias: 3,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  },
  {
    faixa: "F9",
    demandaMin: 266.1,
    demandaMax: 304.0,
    disjuntor: 800,
    caboFaseAl: 240,
    caboFaseAlVias: 3,
    caboFaseCu: 185,
    caboFaseCuVias: 3,
    caboProtecaoCu: 95,
    tcRelacao: "600/5",
    tcFatorTermico: 2.0,
    hastes: 3,
    caboAterramentoNu: 16,
    eletrodutoCuPVC: 110,
    eletrodutoCuPvcPol: "4\"",
    eletrodutoCuAco: 100,
    eletrodutoCuVias: 3,
    caixaMedicao: "CM-4",
    caixasDisjuntorPermitidas: ["CM-18"],
    subterraneoObrigatorio: true
  }
];

/**
 * Dimensionamento exclusivo para a Tabela 4 CEMIG ND 5.1 (Alta Demanda 75,1 a 304 kVA)
 */
export function dimensionarPadraoTabela4(
  params: ParametrosPadraoCemig,
  precosMap?: Record<string, number>,
  getPrecoExternal?: (codigo: string, fallback: number) => number
): ResultadoDimensionamentoPadrao {
  const getPreco = getPrecoExternal || ((codigo: string, fallback: number) => {
    if (precosMap && precosMap[codigo] !== undefined) {
      return precosMap[codigo];
    }
    return fallback;
  });

  const disj = params.disjuntorAmperes;
  // Localizar faixa na Tabela 4
  const match = FAIXAS_TRIFASICO_TABELA_4.find(f => f.disjuntor === disj || f.disjuntoresAlternativos?.includes(disj)) || FAIXAS_TRIFASICO_TABELA_4[0];
  const faixaDemanda = match.faixa;
  const demandaMinKVA = match.demandaMin;
  const demandaMaxKVA = match.demandaMax;

  // Localização e Lado da Rede
  const localizacao: LocalizacaoPadrao = params.localizacao || "URBANO";
  const ladoRede: LadoRede = localizacao === "RURAL" ? "LADO_OPOSTO" : (params.ladoRede || "MESMO_LADO");
  const aFavor = ladoRede === "MESMO_LADO";

  // Saída e Ramal: F3 a F9 exigem obrigatoriamente ramal subterrâneo (Nota 4)
  const isSubtObrigatorio = match.subterraneoObrigatorio;
  const tipoSaida: TipoSaida = isSubtObrigatorio ? "SUBTERRANEA" : (params.tipoSaida || "AEREA");
  const isAerea = tipoSaida === "AEREA";

  const itensSugeridos: ItemMaterialSugerido[] = [];

  // 1. Caixas Metálicas (CM-4 obrigatória para TCs + CM-9/CM-18 para proteção)
  // Caixa CM-4 para Medição Indireta (3 TCs + Medidor)
  itensSugeridos.push({
    codigo: "CX-CM4",
    descricao: "Caixa Metálica de Medição Tipo CM-4 em Chapa de Aço (TCs e Medição Indireta CEMIG)",
    categoria: "CAIXA",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("CX-CM4", 580),
    precoTotal: getPreco("CX-CM4", 580),
    obrigatorioNorma: true,
    nota: "Abriga os 3 Transformadores de Corrente (TCs) e o medidor eletrônico de 3 elementos (ND 5.1 Desenho 36 e 46)."
  });

  // Caixa para Disjuntor Geral (CM-9 ou CM-18 para F1/F2; CM-18 obrigatória para F3 a F9)
  const permiteCM9 = match.faixa === "F1" || match.faixa === "F2";
  const usaCM9 = permiteCM9 && params.tipoCaixaDisjuntorTabela4 === "CM-9";
  const cxDisjCodigo = usaCM9 ? "CX-CM9" : "CX-CM18";
  const cxDisjDesc = usaCM9
    ? "Caixa Metálica de Proteção para Disjuntor Geral Tipo CM-9 em Chapa de Aço c/ lacre"
    : "Caixa Metálica de Proteção para Disjuntor Tipo CM-18 em Chapa de Aço";
  const cxDisjPreco = getPreco(cxDisjCodigo, usaCM9 ? 180 : 210);

  itensSugeridos.push({
    codigo: cxDisjCodigo,
    descricao: cxDisjDesc,
    categoria: "CAIXA",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: cxDisjPreco,
    precoTotal: cxDisjPreco,
    obrigatorioNorma: true,
    nota: usaCM9
      ? "Caixa de proteção CM-9 permitida para faixas F1 e F2 (Nota 6 da Tabela 4)."
      : "Caixa de proteção reforçada CM-18 com barramentos para disjuntores caixa moldada (Nota 6)."
  });

  // Interligação de Proteção entre Caixas (Desenho 46 e Nota 3)
  itensSugeridos.push({
    codigo: "CABO-VERDE-10-INTERLIGACAO",
    descricao: "Cabo Cobre Isolado Verde 0,6/1kV 10 mm² p/ Equipotencialização entre Caixas CM-9/18 e CM-4 (Desenho 46)",
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: 2,
    precoUnitarioEstimado: getPreco("CABO-VERDE-10-INTERLIGACAO", 12.50),
    precoTotal: 2 * getPreco("CABO-VERDE-10-INTERLIGACAO", 12.50),
    obrigatorioNorma: true,
    nota: "Condutor de proteção obrigatório interligando a caixa do disjuntor à caixa CM-4 (Nota 3 e Desenho 46)."
  });

  // 2. Transformadores de Corrente (TC) com FT = 2,0
  // NOTA NORMATIVA CEMIG: Os TCs são de fornecimento exclusivo e gratuito pela concessionária CEMIG.
  // Não geram custo de aquisição na lista de materiais do cliente (apenas a Caixa CM-4 para alojá-los).

  // 3. Disjuntor Caixa Moldada Tripolar (PEC-11 CEMIG)
  const disjCodigo = `DISJ-CXM-3P-${disj}A`;
  const disjFallbackPreco = disj <= 250 ? 1550 : disj <= 400 ? 2850 : disj <= 500 ? 3800 : disj <= 630 ? 4900 : disj <= 700 ? 5800 : 6900;
  const disjPreco = getPreco(disjCodigo, disjFallbackPreco);
  itensSugeridos.push({
    codigo: disjCodigo,
    descricao: `Disjuntor Tripolar Caixa Moldada ${disj}A Icu>=25kA/50kA Homologado CEMIG`,
    categoria: "DISJUNTOR",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: disjPreco,
    precoTotal: disjPreco,
    obrigatorioNorma: true,
    nota: `Proteção geral termomagnética homologada CEMIG PEC-11 (${disj}A) com alta capacidade de interrupção.`
  });

  // 4. Barramentos e Conectores Internos de Cobre (Desenho 46) - Unidade em Metros (m)
  itensSugeridos.push({
    codigo: "BARRAMENTO-NEUTRO-TERRA-ALTA",
    descricao: "Barramento de Neutro e Aterramento em Cobre Eletrolítico c/ Parafusos e Suportes (Desenho 46)",
    categoria: "ACESSORIO",
    unidade: "m",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("BARRAMENTO-NEUTRO-TERRA-ALTA", 380),
    precoTotal: getPreco("BARRAMENTO-NEUTRO-TERRA-ALTA", 380),
    obrigatorioNorma: true,
    nota: "Barramento plano de cobre eletrolítico (medido em metros) para neutro e aterramento na caixa CM-9/18."
  });

  itensSugeridos.push({
    codigo: "BARRAMENTO-FASE-ISOLADO-ALTA",
    descricao: "Barramento de Cobre Eletrolítico para Fases c/ Isoladores Epóxi (Desenho 46)",
    categoria: "ACESSORIO",
    unidade: "m",
    quantidade: 3,
    precoUnitarioEstimado: getPreco("BARRAMENTO-FASE-ISOLADO-ALTA", 195),
    precoTotal: 3 * getPreco("BARRAMENTO-FASE-ISOLADO-ALTA", 195),
    obrigatorioNorma: true,
    nota: "3 metros de barramento de cobre eletrolítico para as fases R, S e T com isoladores epóxi bujão (Desenho 46)."
  });

  // 5. Condutores de Entrada em Cobre 0,6/1kV Subterrâneos (Nunca 750V)
  const caboGauge = match.caboFaseCu;
  const caboVias = match.caboFaseCuVias;
  const peGauge = match.caboProtecaoCu;

  // Metragens base por condutor
  let metrosPretoBase = 0;
  let metrosAzulBase = 0;
  let metrosVerde = 0;

  if (!aFavor && isAerea) {
    metrosPretoBase = 38;
    metrosAzulBase = 17;
    metrosVerde = 8;
  } else if (!aFavor && !isAerea) {
    metrosPretoBase = 25;
    metrosAzulBase = 10;
    metrosVerde = 3;
  } else if (aFavor && isAerea) {
    metrosPretoBase = 30;
    metrosAzulBase = 10;
    metrosVerde = 7;
  } else {
    metrosPretoBase = 20;
    metrosAzulBase = 7;
    metrosVerde = 3;
  }

  // Fases (Preto): 3 fases * vias - Isolação 0,6/1kV Subterrânea
  const metrosPretoTotal = caboVias * metrosPretoBase;
  const caboPretoCodigo = `CABO-PRETO-${caboGauge}`;
  const caboPretoPreco = getPreco(caboPretoCodigo, caboGauge === 120 ? 138 : caboGauge === 150 ? 172 : caboGauge === 185 ? 215 : 285);
  itensSugeridos.push({
    codigo: caboPretoCodigo,
    descricao: `Cabo Cobre Isolado Preto (Fase) 0,6/1kV ${caboGauge} mm² - Subterrâneo`,
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: metrosPretoTotal,
    precoUnitarioEstimado: caboPretoPreco,
    precoTotal: metrosPretoTotal * caboPretoPreco,
    obrigatorioNorma: true,
    nota: caboVias > 1
      ? `${caboVias} condutores de ${caboGauge} mm² em paralelo por fase (${caboVias * 3} condutores pretos no total). Isolação 0,6/1kV subterrânea. ND 5.1 Tabela 4.`
      : `3 condutores de fase (${caboGauge} mm²). Isolação 0,6/1kV subterrânea. ND 5.1 Tabela 4.`
  });

  // Neutro (Azul Claro): Seção igual à fase e mesma quantidade de vias (Nota 9 da Tabela 4) - Isolação 0,6/1kV
  const metrosAzulTotal = caboVias * metrosAzulBase;
  const caboAzulCodigo = `CABO-AZUL-${caboGauge}`;
  const caboAzulPreco = getPreco(caboAzulCodigo, caboGauge === 120 ? 138 : caboGauge === 150 ? 172 : caboGauge === 185 ? 215 : 285);
  itensSugeridos.push({
    codigo: caboAzulCodigo,
    descricao: `Cabo Cobre Isolado Azul Claro (Neutro) 0,6/1kV ${caboGauge} mm² - Subterrâneo`,
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: metrosAzulTotal,
    precoUnitarioEstimado: caboAzulPreco,
    precoTotal: metrosAzulTotal * caboAzulPreco,
    obrigatorioNorma: true,
    nota: `Condutor neutro isolação 0,6/1kV subterrânea com seção igual à fase (${caboVias}x ${caboGauge} mm²) conforme Nota 9 da Tabela 4 CEMIG.`
  });

  // Terra / Proteção PE (Verde) - Isolação 0,6/1kV
  const caboVerdeCodigo = `CABO-VERDE-${peGauge}`;
  const caboVerdePreco = getPreco(caboVerdeCodigo, peGauge <= 50 ? 54 : peGauge <= 70 ? 76 : peGauge <= 95 ? 105 : 138);
  itensSugeridos.push({
    codigo: caboVerdeCodigo,
    descricao: `Cabo Cobre Isolado Verde (Terra/PE) 0,6/1kV ${peGauge} mm² - Subterrâneo`,
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: metrosVerde,
    precoUnitarioEstimado: caboVerdePreco,
    precoTotal: metrosVerde * caboVerdePreco,
    obrigatorioNorma: true,
    nota: `Condutor de proteção PE isolação 0,6/1kV subterrânea (${peGauge} mm²) conforme Tabela 4.`
  });

  // Terminais de Compressão Alta Corrente
  const qtdeTerminais = 4 * caboVias * 2; // 3F + 1N nas duas extremidades
  const termCodigo = `TERM-COMPRESSAO-${caboGauge}`;
  const termPreco = getPreco(termCodigo, caboGauge === 120 ? 18.5 : caboGauge === 150 ? 22 : caboGauge === 185 ? 28 : 36);
  itensSugeridos.push({
    codigo: termCodigo,
    descricao: `Terminal de Compressão Tubular/Olhal em Cobre Estanhado ${caboGauge} mm²`,
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: qtdeTerminais,
    precoUnitarioEstimado: termPreco,
    precoTotal: qtdeTerminais * termPreco,
    obrigatorioNorma: true,
    nota: `${qtdeTerminais} terminais de compressão reforçados para conexões do disjuntor e barramentos.`
  });

  // Terminais Especiais de Aterramento (Solicitados pelo Usuário)
  // 1. 02 terminais de compressão 10 mm² com isolação para o cabo de aterramento da caixa CM-04
  itensSugeridos.push({
    codigo: "TERM-COMPRESSAO-10-ISOLADO",
    descricao: "Terminal de Compressão Tubular c/ Isolação para Cabo 10 mm² (Aterramento Caixa CM-4)",
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 2,
    precoUnitarioEstimado: getPreco("TERM-COMPRESSAO-10-ISOLADO", 4.5),
    precoTotal: 2 * getPreco("TERM-COMPRESSAO-10-ISOLADO", 4.5),
    obrigatorioNorma: true,
    nota: "2 terminais com isolação para conexão do condutor de proteção de 10 mm² na carcaça da CM-4."
  });

  // 2. 02 terminais de aterramento caixa padrão cemig
  itensSugeridos.push({
    codigo: "TERM-ATERRAMENTO-CARCACA-CEMIG",
    descricao: "Terminal de Aterramento para Carcaça de Caixa Padrão CEMIG (Conector Terra de Caixa)",
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 2,
    precoUnitarioEstimado: getPreco("TERM-ATERRAMENTO-CARCACA-CEMIG", 15.0),
    precoTotal: 2 * getPreco("TERM-ATERRAMENTO-CARCACA-CEMIG", 15.0),
    obrigatorioNorma: true,
    nota: "2 conectores homologados CEMIG para fixação mecânica e aterramento das carcaças metálicas."
  });

  // 3. 02 terminais compressão cabo 16mm² para o cabo de aterramento que vem das hastes
  itensSugeridos.push({
    codigo: "TERM-COMPRESSAO-16",
    descricao: "Terminal de Compressão para Cabo 16 mm² (Conexão Malha de Aterramento)",
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 2,
    precoUnitarioEstimado: getPreco("TERM-COMPRESSAO-16", 8.0),
    precoTotal: 2 * getPreco("TERM-COMPRESSAO-16", 8.0),
    obrigatorioNorma: true,
    nota: "2 terminais para terminação do condutor de cobre nu 16 mm² proveniente das hastes de aterramento."
  });

  // 6. Duto Corrugado PEAD 3" (5m na entrada + 5m na saída por eletroduto)
  // Substitui eletrodutos rígidos e curvas conforme instrução do usuário
  const eletroVias = match.eletrodutoCuVias;
  const metrosDutoTotal = eletroVias * 10; // 5m para cada entrada e 5m para cada saída por eletroduto
  const dutoCodigo = "DUTO-CORRUGADO-PEAD-3POL";
  const dutoPreco = getPreco(dutoCodigo, 38.0);
  itensSugeridos.push({
    codigo: dutoCodigo,
    descricao: 'Duto Corrugado PEAD Flexível de 3" (Ø 85mm) Subterrâneo (5m Entrada + 5m Saída por Circuito)',
    categoria: "ELETRODUTO",
    unidade: "m",
    quantidade: metrosDutoTotal,
    precoUnitarioEstimado: dutoPreco,
    precoTotal: metrosDutoTotal * dutoPreco,
    obrigatorioNorma: true,
    nota: `${eletroVias} linha(s) de duto corrugado PEAD 3": 5 metros para cada entrada e 5 metros para cada saída subterrânea.`
  });

  // Buchas e Arruelas de vedação para entrada nas caixas
  const qtdeBuchas = eletroVias * 2;
  const buchaCodigo = "BUCHA-ARRUELA-PVC-85";
  const buchaPreco = getPreco(buchaCodigo, 56);
  itensSugeridos.push({
    codigo: buchaCodigo,
    descricao: 'Bucha e Arruela de PVC Roscável Ø 85 mm (3") p/ Fixação nas Caixas',
    categoria: "ELETRODUTO",
    unidade: "cj",
    quantidade: qtdeBuchas,
    precoUnitarioEstimado: buchaPreco,
    precoTotal: qtdeBuchas * buchaPreco,
    obrigatorioNorma: true
  });

  // 7. Aterramento Normativo Tabela 4 (3 hastes cantoneiras galvanizadas a fogo + cabo nu 16 mm²)
  itensSugeridos.push({
    codigo: "HASTE-ATERRAMENTO-CANTONEIRA-GALV",
    descricao: "Haste de Aterramento Cantoneira de Aço Galvanizado a Fogo (Padrão CEMIG - 2,40m)",
    categoria: "ATERRAMENTO",
    unidade: "un",
    quantidade: 3,
    precoUnitarioEstimado: getPreco("HASTE-ATERRAMENTO-CANTONEIRA-GALV", 95.0),
    precoTotal: 3 * getPreco("HASTE-ATERRAMENTO-CANTONEIRA-GALV", 95.0),
    obrigatorioNorma: true,
    nota: "3 hastes tipo cantoneira de aço galvanizado a fogo obrigatórias para todas as faixas da Tabela 4 (F1 a F9)."
  });

  // Caixa de Inspeção de Aterramento Cilíndrica PVC (Corpo) + Tampa de Ferro Fundido Separada
  itensSugeridos.push({
    codigo: "CX-INSPECAO-ATERRAMENTO-CORPO",
    descricao: "Caixa de Inspeção de Aterramento Cilíndrica PVC Ø 150 mm (Corpo de Solo)",
    categoria: "ATERRAMENTO",
    unidade: "un",
    quantidade: 3,
    precoUnitarioEstimado: getPreco("CX-INSPECAO-ATERRAMENTO-CORPO", 28.0),
    precoTotal: 3 * getPreco("CX-INSPECAO-ATERRAMENTO-CORPO", 28.0),
    obrigatorioNorma: true,
    nota: "Corpo cilíndrico de solo para inspeção de aterramento das 3 hastes cantoneiras."
  });

  itensSugeridos.push({
    codigo: "TAMPA-FOFO-INSPECAO-TERRA",
    descricao: "Tampa de Ferro Fundido para Caixa de Inspeção de Aterramento Ø 150 mm (Padrão CEMIG)",
    categoria: "ATERRAMENTO",
    unidade: "un",
    quantidade: 3,
    precoUnitarioEstimado: getPreco("TAMPA-FOFO-INSPECAO-TERRA", 45.0),
    precoTotal: 3 * getPreco("TAMPA-FOFO-INSPECAO-TERRA", 45.0),
    obrigatorioNorma: true,
    nota: "Tampa de ferro fundido para fechamento seguro da caixa de inspeção de terra no solo."
  });

  itensSugeridos.push({
    codigo: "CABO-COBRE-NU-16",
    descricao: "Cabo Cobre Nu 16 mm² para Aterramento / Malha (Tabela 4 CEMIG)",
    categoria: "ATERRAMENTO",
    unidade: "m",
    quantidade: 12,
    precoUnitarioEstimado: getPreco("CABO-COBRE-NU-16", 18.0),
    precoTotal: 12 * getPreco("CABO-COBRE-NU-16", 18.0),
    obrigatorioNorma: true,
    nota: "Condutor de aterramento da malha com seção mínima de 16 mm² conforme Tabela 4."
  });

  // 8. Infraestrutura Subterrânea - Caixa Tipo ZC vs Tipo ZD (ND-2.3 / ND-5.1)
  const usaZD = params.tipoCaixaSubterranea === "ZD";
  const cxSubtCodigo = usaZD ? "CX-SUBTERRANEA-ZD" : "CX-SUBTERRANEA-ZC";
  const cxSubtDesc = usaZD
    ? "Caixa Subterrânea de Passagem Tipo ZD em Alvenaria/Concreto (100 x 75 x 120 cm - Norma CEMIG ND-2.3)"
    : "Caixa Subterrânea de Passagem Tipo ZC em Alvenaria/Concreto (77 x 67 x 90 cm - Norma CEMIG ND-2.3 / ND-5.1)";
  const cxSubtPreco = getPreco(cxSubtCodigo, usaZD ? 1250 : 750);

  itensSugeridos.push({
    codigo: cxSubtCodigo,
    descricao: cxSubtDesc,
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: cxSubtPreco,
    precoTotal: cxSubtPreco,
    obrigatorioNorma: true,
    nota: usaZD
      ? "Caixa tipo ZD com maiores dimensões para pista de rolamento, conexões de derivação com barramentos BTX ou múltiplos circuitos."
      : "Caixa subterrânea padrão tipo ZC para passeio/calçada em ramais de entrada subterrâneos."
  });

  // Tampa de Ferro Fundido da Caixa Subterrânea (Item Separado na Lista)
  const tampaSubtCodigo = usaZD ? "TAMPA-FOFO-ZD" : "TAMPA-FOFO-ZC";
  const tampaSubtDesc = usaZD
    ? "Tampa e Aro de Ferro Fundido Nodular Reforçada Articulada Tipo ZD (Classe 125/250 kN - Padrão CEMIG)"
    : "Tampa e Aro de Ferro Fundido Nodular Articulada Tipo ZC (Padrão CEMIG)";
  const tampaSubtPreco = getPreco(tampaSubtCodigo, usaZD ? 850 : 480);

  itensSugeridos.push({
    codigo: tampaSubtCodigo,
    descricao: tampaSubtDesc,
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: tampaSubtPreco,
    precoTotal: tampaSubtPreco,
    obrigatorioNorma: true,
    nota: "Tampa e aro em ferro fundido nodular com inscrição CEMIG conforme padrão normativo."
  });

  // Brita nº 1: 3 sacos sempre para camada drenante
  itensSugeridos.push({
    codigo: "BRITA-1-DRAIN",
    descricao: "Brita nº 1 para Drenagem de Caixa de Passagem/Inspeção (Saco 20kg)",
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 3,
    precoUnitarioEstimado: getPreco("BRITA-1-DRAIN", 18),
    precoTotal: 3 * getPreco("BRITA-1-DRAIN", 18),
    obrigatorioNorma: true,
    nota: "3 sacos de brita nº 1 para drenagem de fundo da caixa subterrânea conforme Desenho 36."
  });

  // 9. Suporte / Poste se Aéreo (F1/F2)
  let posteCodigo = "ESTRUTURA-MURO";
  let posteHomologado = "Mureta / Divisa em Alvenaria";
  if (isAerea && params.tipoEstrutura !== "MURO") {
    const postNome = aFavor ? (match.posteMesmoLadoAco || "PA3") : (match.posteLadoOpostoAco || "PA6");
    posteHomologado = postNome;
    posteCodigo = `POSTE-${postNome}`;
    const postePreco = getPreco(posteCodigo, postNome === "PA3" ? 1620 : 2150);

    itensSugeridos.push({
      codigo: posteCodigo,
      descricao: `Poste Aço Galvanizado ${postNome} (Homologado CEMIG Alta Demanda)`,
      categoria: "POSTE",
      unidade: "un",
      quantidade: 1,
      precoUnitarioEstimado: postePreco,
      precoTotal: postePreco,
      obrigatorioNorma: true,
      nota: `Poste homologado para ramal aéreo multiplexado Q-120 (Nota 4 e Desenho 66/67).`
    });

    const tampaoCodigo = `TAMPAO-POSTE-${postNome}`;
    itensSugeridos.push({
      codigo: tampaoCodigo,
      descricao: `Tampão de Vedação Superior para Poste de Aço ${postNome}`,
      categoria: "ACESSORIO",
      unidade: "un",
      quantidade: 1,
      precoUnitarioEstimado: getPreco(tampaoCodigo, 48),
      precoTotal: getPreco(tampaoCodigo, 48),
      obrigatorioNorma: true
    });

    // Cintas para poste
    const cintaCodigo = `CINTA-POSTE-${postNome}`;
    itensSugeridos.push({
      codigo: cintaCodigo,
      descricao: `Cinta de Aço para Poste Circular / Duplo T ${postNome}`,
      categoria: "FERRAGEM",
      unidade: "un",
      quantidade: 4,
      precoUnitarioEstimado: getPreco(cintaCodigo, 44),
      precoTotal: 4 * getPreco(cintaCodigo, 44),
      obrigatorioNorma: true
    });

    itensSugeridos.push({
      codigo: "PARAFUSO-PORCA-ARRUELA-CINTA",
      descricao: "Parafuso Galvanizado com Porca e Arruela para Cinta de Poste",
      categoria: "FERRAGEM",
      unidade: "un",
      quantidade: 4,
      precoUnitarioEstimado: getPreco("PARAFUSO-PORCA-ARRUELA-CINTA", 9.5),
      precoTotal: 4 * getPreco("PARAFUSO-PORCA-ARRUELA-CINTA", 9.5),
      obrigatorioNorma: true
    });

    itensSugeridos.push({
      codigo: "ARMACAO-SECUNDARIA-1E",
      descricao: "Armação Secundária de 1 Estribo Reforçada Galvanizada a Fogo",
      categoria: "FERRAGEM",
      unidade: "un",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("ARMACAO-SECUNDARIA-1E", 36),
      precoTotal: getPreco("ARMACAO-SECUNDARIA-1E", 36),
      obrigatorioNorma: true
    });

    itensSugeridos.push({
      codigo: "ISOLADOR-ROLDANA-72",
      descricao: "Isolador Roldana de Porcelana Vitrificada 72x72 mm",
      categoria: "FERRAGEM",
      unidade: "un",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("ISOLADOR-ROLDANA-72", 18),
      precoTotal: getPreco("ISOLADOR-ROLDANA-72", 18),
      obrigatorioNorma: true
    });

    itensSugeridos.push({
      codigo: "SRV-BASE-CONCRETO",
      descricao: "Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)",
      categoria: "ACESSORIO",
      unidade: "cj",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-BASE-CONCRETO", 220),
      precoTotal: getPreco("SRV-BASE-CONCRETO", 220),
      obrigatorioNorma: true,
      nota: "Obrigatório engastamento em base concretada conforme Nota 7 da Tabela 4."
    });
  }

  // 10. Mão de Obra e Engenharia Especializada
  if (params.incluirMaoDeObra !== false) {
    itensSugeridos.push({
      codigo: "SRV-MONTAGEM-PADRAO",
      descricao: "Mão de Obra de Montagem Especializada Padrão Alta Demanda",
      categoria: "MAO_DE_OBRA",
      unidade: "sv",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-MONTAGEM-PADRAO", 10000),
      precoTotal: getPreco("SRV-MONTAGEM-PADRAO", 10000),
      obrigatorioNorma: false,
      nota: "Equipe especializada Cordeiro Energia para montagem completa de infraestrutura, caixas, barramentos e conexões."
    });
  }

  if (params.incluirART !== false) {
    itensSugeridos.push({
      codigo: "SRV-PROJETO-CEMIG",
      descricao: "Projeto Elétrico de Entrada de Serviço e Homologação junto à CEMIG",
      categoria: "MAO_DE_OBRA",
      unidade: "sv",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-PROJETO-CEMIG", 1500),
      precoTotal: getPreco("SRV-PROJETO-CEMIG", 1500),
      obrigatorioNorma: false,
      nota: "Elaboração de projeto elétrico, memorial de cálculo, diagrama unifilar e aprovação técnica formal junto à CEMIG."
    });
  }

  if (params.incluirVistoria !== false) {
    itensSugeridos.push({
      codigo: "SRV-VISTORIA-CEMIG",
      descricao: "Acompanhamento Técnico de Vistoria e Homologação na CEMIG",
      categoria: "MAO_DE_OBRA",
      unidade: "sv",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-VISTORIA-CEMIG", 600),
      precoTotal: getPreco("SRV-VISTORIA-CEMIG", 600),
      obrigatorioNorma: false
    });
  }

  // Notas Técnicas
  const notasTecnicas: string[] = [
    `Dimensionamento normativo CEMIG ND-5.1 - Tabela 4 (Fornecimento Trifásico Tipo F: Faixa ${faixaDemanda} de ${demandaMinKVA} a ${demandaMaxKVA} kVA).`,
    `Tensão nominal de atendimento: 127/220V em Baixa Tensão (3 Fases + Neutro).`,
    `Medição Indireta em Baixa Tensão: 3 Transformadores de Corrente (TCs) relação ${match.tcRelacao}A com FT=2,0 instalados na Caixa CM-4 (Fornecimento gratuito e exclusivo da CEMIG).`,
    `Proteção Geral: Disjuntor termomagnético caixa moldada de ${disj}A alojado na ${usaCM9 ? "Caixa CM-9" : "Caixa CM-18"} (Nota 6).`,
    `Equipotencialização: Condutor de proteção verde 0,6/1kV de 10 mm² interligando a caixa do disjuntor à caixa CM-4 (Desenho 46 e Nota 3).`,
    `Condutores com isolação 0,6/1kV para instalação subterrânea. Neutro de ${caboVias}x ${caboGauge} mm² igual à fase (Nota 9).`,
    isSubtObrigatorio
      ? `Ramal de Entrada Obrigatoriamente Subterrâneo conforme Nota 4 da Tabela 4 (demanda superior a 95 kVA).`
      : `Ramal de Entrada com atendimento ${isAerea ? "Aéreo multiplexado Al/XLPE Q-120" : "Subterrâneo em duto flexível PEAD"}.`,
    `Infraestrutura Subterrânea: ${eletroVias} linha(s) de Duto Corrugado PEAD 3" (5m entrada + 5m saída) e Caixa de Passagem Tipo ${usaZD ? "ZD (100x75x120cm)" : "ZC (77x67x90cm)"} com tampa de ferro fundido.`,
    `Malha de Aterramento: 3 hastes cantoneiras de aço galvanizado a fogo (2,40m), 3 caixas de inspeção com tampa de ferro fundido e cabo de cobre nu 16 mm².`
  ];

  // Alertas EV
  const alertasEV: string[] = [];
  if (params.finalidade === "CARREGADOR_VE" || params.potenciaCarregadorKW) {
    const potEV = params.potenciaCarregadorKW || 60;
    alertasEV.push(`Hub de Recarga de Veículos Elétricos: Demanda simultânea projetada para ${potEV} kW.`);
    if (potEV > demandaMaxKVA) {
      alertasEV.push(`⚠️ ATENÇÃO: A potência da estação (${potEV} kW) excede o limite desta faixa (${demandaMaxKVA} kVA). Recomenda-se selecionar um disjuntor superior.`);
    } else {
      alertasEV.push(`✅ Estação de Recarga EV (${potEV} kW): Atendida com margem de segurança pela faixa ${faixaDemanda} (${disj}A).`);
    }
    alertasEV.push(`Conforme NBR 17019, cada ponto de recarga deve possuir proteção individual com DR Tipo B ou Tipo A (30mA) e DPS coordenado.`);
  }

  const descResumo = `Padrão de Alta Demanda CEMIG ND 5.1 (Tabela 4) | Disjuntor ${disj}A | Faixa ${faixaDemanda} (${demandaMinKVA} a ${demandaMaxKVA} kVA) | Cabos 0,6/1kV ${caboVias}x ${caboGauge}mm² | Caixa Subt. ${usaZD ? "ZD" : "ZC"} | Caixas ${usaCM9 ? "CM-9" : "CM-18"} + CM-4`;

  return {
    tipoPadrao: "TRIFASICO",
    categoriaDemanda: "ALTA_DEMANDA_TABELA_4",
    tipoSaida,
    localizacao,
    ladoRede,
    faixaFornecimento: faixaDemanda,
    demandaMinKVA,
    demandaMaxKVA,
    fases: 3,
    fios: 4,
    disjuntorNominalA: disj,
    caboFaseMm2: caboGauge,
    caboNeutroMm2: caboGauge,
    caboProtecaoMm2: peGauge,
    caboNuMm2: 16,
    hastesAterramentoQtde: 3,
    eletrodutoPVCmm: 85,
    eletrodutoPvcPol: "3\"",
    eletrodutoAcoMm: match.eletrodutoCuAco,
    tcRelacao: `${match.tcRelacao} A (FT=2,0) - Fornecido pela CEMIG`,
    tcQuantidade: 3,
    posteHomologado,
    caixaMedicao: "CM-4 Metálica (Medição Indireta c/ TCs)",
    caixaDisjuntor: usaCM9 ? "CM-9 Metálica (Proteção Geral)" : "CM-18 Metálica (Proteção Geral c/ Barramentos)",
    tipoCaixaSubterranea: usaZD ? "ZD" : "ZC",
    descricaoResumo: descResumo,
    notasTecnicas,
    alertasEV,
    itensSugeridos
  };
}

/**
 * Motor central de dimensionamento normativo CEMIG
 */
export function dimensionarPadraoCemig(
  params: ParametrosPadraoCemig,
  precosMap?: Record<string, number>
): ResultadoDimensionamentoPadrao {
  const getPreco = (codigo: string, fallback: number) => {
    if (precosMap && precosMap[codigo] !== undefined) {
      return precosMap[codigo];
    }
    return fallback;
  };

  const disj = params.disjuntorAmperes;

  // Se for solicitado Padrão de Alta Demanda (Tabela 4) ou disjuntor acima de 200A
  const isTabela4 = params.categoriaDemanda === "ALTA_DEMANDA_TABELA_4" || disj > 200;
  if (isTabela4) {
    return dimensionarPadraoTabela4(params, precosMap, getPreco);
  }

  const isBifasico = params.tipoPadrao === "BIFASICO";

  // Localização e Lado da Rede: se Rural, obrigatoriamente LADO_OPOSTO (Contra a rede - ND 5.1 Nota 9)
  const localizacao: LocalizacaoPadrao = params.localizacao || "URBANO";
  const ladoRede: LadoRede = localizacao === "RURAL" ? "LADO_OPOSTO" : (params.ladoRede || "MESMO_LADO");
  const aFavor = ladoRede === "MESMO_LADO";

  // Tipo de Saída: Aérea ou Subterrânea (default Aérea)
  const tipoSaida: TipoSaida = params.tipoSaida || "AEREA";
  const isAerea = tipoSaida === "AEREA";

  let faixaInfo: any;
  let faixaDemanda = "";
  let fases = 3;
  let fios = 4;
  let demandaMinKVA = 0;
  let demandaMaxKVA = 75.0;

  if (isBifasico) {
    faixaInfo = FAIXA_BIFASICO_TABELA_1;
    faixaDemanda = "B1";
    fases = 2;
    fios = 3;
    demandaMinKVA = 8.1;
    demandaMaxKVA = 16.0;
  } else {
    // Trifásico Tabela 2
    fases = 3;
    fios = 4;
    const match = FAIXAS_TRIFASICO_TABELA_2.find(f => f.disjuntor === disj) || FAIXAS_TRIFASICO_TABELA_2[0];
    faixaInfo = match;
    faixaDemanda = match.faixa;
    demandaMinKVA = match.demandaMin;
    demandaMaxKVA = match.demandaMax;
  }

  // 1. Identificar Poste / Suporte Homologado
  let posteCodigo = "";
  let posteDescricao = "";
  let postePreco = 0;
  let postNome = "";

  if (params.tipoEstrutura === "POSTE_CONCRETO") {
    postNome = aFavor ? faixaInfo.posteMesmoLadoConc : faixaInfo.posteLadoOpostoConc;
    posteCodigo = `POSTE-${postNome}`;
    if (postNome === "PC1") {
      posteDescricao = "Poste Concreto Duplo T PC1 (90 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PC1", 980);
    } else if (postNome === "PC2") {
      posteDescricao = "Poste Concreto Duplo T PC2 (150 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PC2", 1350);
    } else {
      posteDescricao = "Poste Concreto Duplo T PC3 (200 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PC3", 1780);
    }
  } else if (params.tipoEstrutura === "POSTE_ACO") {
    postNome = aFavor ? faixaInfo.posteMesmoLadoAco : faixaInfo.posteLadoOpostoAco;
    posteCodigo = `POSTE-${postNome}`;
    if (postNome === "PA1") {
      posteDescricao = "Poste Aço Galvanizado PA1 (90 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PA1", 890);
    } else if (postNome === "PA2") {
      posteDescricao = "Poste Aço Galvanizado PA2 (150 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PA2", 1250);
    } else if (postNome === "PA3") {
      posteDescricao = "Poste Aço Galvanizado PA3 (200 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PA3", 1620);
    } else if (postNome === "PA4") {
      posteDescricao = "Poste Aço Galvanizado PA4 (150 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PA4", 1380);
    } else if (postNome === "PA5") {
      posteDescricao = "Poste Aço Galvanizado PA5 (200 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PA5", 1750);
    } else {
      posteDescricao = "Poste Aço Galvanizado PA6 (300 daN / 7,00m) Homologado CEMIG";
      postePreco = getPreco("POSTE-PA6", 2150);
    }
  } else if (params.tipoEstrutura === "PONTALETE") {
    const ptNome = faixaInfo.pontalete;
    posteCodigo = `PONTALETE-${ptNome}`;
    if (ptNome === "PT1") {
      posteDescricao = "Pontalete Aço Galvanizado PT1 (3,00m x 2\") c/ curva e base";
      postePreco = getPreco("PONTALETE-PT1", 380);
    } else {
      posteDescricao = "Pontalete Aço Galvanizado Reforçado PT2 (3,00m x 2.1/2\")";
      postePreco = getPreco("PONTALETE-PT2", 560);
    }
  } else {
    // MURO / MURETA
    posteCodigo = "ESTRUTURA-MURO";
    posteDescricao = "Montagem Embutida em Muro / Mureta (Alvenaria divisa da via pública)";
    postePreco = 0;
  }

  // 2. Disjuntor
  const disjCodigo = isBifasico ? `DISJ-IEC-2P-${disj}A` : `DISJ-IEC-3P-${disj}A`;
  const disjDescricao = isBifasico
    ? `Disjuntor Bipolar IEC ${disj}A Curva C Homologado CEMIG`
    : `Disjuntor Tripolar IEC ${disj}A Curva C Homologado CEMIG`;
  const disjPreco = getPreco(disjCodigo, disj <= 63 ? (isBifasico ? 115 : 185) : disj <= 100 ? 360 : disj <= 125 ? 490 : 850);

  // 3. Cabos e Bitolas
  const caboGauge = faixaInfo.caboFase;
  const peGauge = faixaInfo.caboProtecao;

  // Metragens exatas prescritas:
  // Contra + Aérea: preto 38m, azul 17m, verde 8m (bifásico: preto 25m)
  // Contra + Subt: preto 25m, azul 10m, verde 3m (bifásico: preto 17m)
  // A Favor + Aérea: preto 30m, azul 10m, verde 7m (bifásico: preto 20m)
  // A Favor + Subt: preto 20m, azul 7m, verde 3m (bifásico: preto 13m)
  let metrosPreto = 0;
  let metrosAzul = 0;
  let metrosVerde = 0;

  if (!aFavor && isAerea) {
    metrosPreto = isBifasico ? 25 : 38;
    metrosAzul = 17;
    metrosVerde = 8;
  } else if (!aFavor && !isAerea) {
    metrosPreto = isBifasico ? 17 : 25;
    metrosAzul = 10;
    metrosVerde = 3;
  } else if (aFavor && isAerea) {
    metrosPreto = isBifasico ? 20 : 30;
    metrosAzul = 10;
    metrosVerde = 7;
  } else {
    metrosPreto = isBifasico ? 13 : 20;
    metrosAzul = 7;
    metrosVerde = 3;
  }

  // 4. Eletrodutos, Luvas, Curvas S e Acessórios
  const eletroMm = faixaInfo.eletrodutoPVC;
  const eletroPol = faixaInfo.eletrodutoPvcPol;
  const eletroCodigo = `ELET-PVC-${eletroMm}`;
  const eletroPrecoUnit = getPreco(eletroCodigo, eletroMm <= 32 ? 32 : eletroMm <= 40 ? 45 : eletroMm <= 50 ? 62 : eletroMm <= 60 ? 85 : 120);

  // Quantidade de barras de eletroduto e luvas conforme posição e tipo de saída (CEMIG ND 5.1):
  // Contra + Saída Aérea: 3 eletrodutos e 2 luvas
  // Contra + Saída Subterrânea: 2 eletrodutos e 1 luva
  // A Favor + Saída Aérea: 2 eletrodutos e 0 luvas
  // A Favor + Saída Subterrânea: 1 eletroduto e 0 luvas
  let qtdeEletrodutos = 2;
  let qtdeLuvas = 0;

  if (!aFavor && isAerea) {
    qtdeEletrodutos = 3;
    qtdeLuvas = 2;
  } else if (!aFavor && !isAerea) {
    qtdeEletrodutos = 2;
    qtdeLuvas = 1;
  } else if (aFavor && isAerea) {
    qtdeEletrodutos = 2;
    qtdeLuvas = 0;
  } else {
    qtdeEletrodutos = 1;
    qtdeLuvas = 0;
  }

  const luvaCodigo = `LUVA-PVC-${eletroMm}`;
  const luvaPreco = getPreco(luvaCodigo, eletroMm <= 32 ? 8.5 : eletroMm <= 40 ? 11 : eletroMm <= 50 ? 14.5 : eletroMm <= 60 ? 19 : 26);

  // Curvas S: Saída Aérea = 2, Saída Subterrânea = 1
  const qtdeCurvasS = isAerea ? 2 : 1;
  const curvaSCodigo = `CURVA-S-${eletroMm}`;
  const curvaSPreco = getPreco(curvaSCodigo, eletroMm <= 32 ? 22 : eletroMm <= 40 ? 28 : eletroMm <= 50 ? 39 : eletroMm <= 60 ? 52 : 75);

  // Cabeçote Pingadouro Alumínio: Saída Aérea = 2, Saída Subterrânea = 1
  const qtdeCabecotes = isAerea ? 2 : 1;
  const cabecoteCodigo = `CABECOTE-${eletroMm}`;
  const cabecotePreco = getPreco(cabecoteCodigo, eletroMm <= 32 ? 28 : eletroMm <= 40 ? 35 : eletroMm <= 50 ? 48 : eletroMm <= 60 ? 65 : 88);

  // Buchas e Arruelas de PVC (não zamac) para eletroduto principal: 2 cj
  const buchaArruelaCodigo = `BUCHA-ARRUELA-PVC-${eletroMm}`;
  const buchaArruelaPreco = getPreco(buchaArruelaCodigo, eletroMm <= 32 ? 14 : eletroMm <= 40 ? 18 : eletroMm <= 50 ? 24 : eletroMm <= 60 ? 32 : 44);

  // 5. Aterramento
  const hastesQtde = faixaInfo.hastes;
  const hasteGalvPreco = getPreco("HASTE-ATERRAMENTO-GALV-58", 82);
  const cxInspecaoPreco = getPreco("CX-INSPECAO-ATERRAMENTO", 38);
  const caboNuMetros = hastesQtde === 1 ? 3 : hastesQtde === 2 ? 6 : 9;
  const caboNuPrecoUnit = getPreco("CABO-COBRE-NU-10", 12.0);

  // Caixa de medição metálica em chapa de aço (ND 5.1 individual):
  // 200A (C6) usa CM-3 metálica; até 125A usa CM-14 metálica
  // Caixas em policarbonato aplicam-se a padrões agrupados / coletivos (ND 5.2)
  const usaCM3 = disj >= 150;
  const caixaCodigo = usaCM3 ? "CX-CM3" : "CX-CM14";
  const caixaDescricao = usaCM3
    ? "Caixa Metálica de Medição Indireta com TC Tipo CM-3 em Chapa de Aço (Padrão 200A CEMIG)"
    : "Caixa Metálica Polifásica Tipo CM-14 em Chapa de Aço c/ visor e alojamento para disjuntor (até 125A)";
  const caixaPreco = getPreco(caixaCodigo, usaCM3 ? 1150 : 480);

  // Montar lista de materiais sugeridos
  const itensSugeridos: ItemMaterialSugerido[] = [];

  // 1. Suporte (Poste / Pontalete)
  if (params.tipoEstrutura !== "MURO") {
    itensSugeridos.push({
      codigo: posteCodigo,
      descricao: posteDescricao,
      categoria: "POSTE",
      unidade: "un",
      quantidade: 1,
      precoUnitarioEstimado: postePreco,
      precoTotal: postePreco,
      obrigatorioNorma: true,
      nota: `Homologado CEMIG para ${aFavor ? "Mesmo Lado da Rede (A Favor)" : "Lado Oposto da Rede (Contra - Cruzamento de rua)"}`
    });

    // Tampão específico para poste de aço com nome do poste
    if (params.tipoEstrutura === "POSTE_ACO") {
      const tampaoCodigo = `TAMPAO-POSTE-${postNome}`;
      itensSugeridos.push({
        codigo: tampaoCodigo,
        descricao: `Tampão de Vedação Superior para Poste de Aço ${postNome}`,
        categoria: "ACESSORIO",
        unidade: "un",
        quantidade: 1,
        precoUnitarioEstimado: getPreco(tampaoCodigo, 38),
        precoTotal: getPreco(tampaoCodigo, 38),
        obrigatorioNorma: true,
        nota: `Tampa de topo específica para o poste ${postNome}.`
      });
    }
  }

  // 2. Caixa de Medição
  itensSugeridos.push({
    codigo: caixaCodigo,
    descricao: caixaDescricao,
    categoria: "CAIXA",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: caixaPreco,
    precoTotal: caixaPreco,
    obrigatorioNorma: true,
    nota: usaCM3
      ? "Padrão CEMIG para ligação de 150A/200A (C5/C6) com medição indireta."
      : "Padrão atual CEMIG para padrões até 125A com medição direta e proteção acoplada."
  });

  // 3. Disjuntor
  itensSugeridos.push({
    codigo: disjCodigo,
    descricao: disjDescricao,
    categoria: "DISJUNTOR",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: disjPreco,
    precoTotal: disjPreco,
    obrigatorioNorma: true,
    nota: `Proteção geral termo-magnética IEC curva C (${disj}A).`
  });

  // 4. Condutores de Entrada Separados por Cor
  // Cabo Preto (Fase)
  const caboPretoCodigo = `CABO-PRETO-${caboGauge}`;
  const caboPretoPreco = getPreco(caboPretoCodigo, caboGauge <= 16 ? 18.5 : caboGauge <= 25 ? 28 : caboGauge <= 35 ? 38.5 : caboGauge <= 50 ? 54 : caboGauge <= 70 ? 76 : 105);
  itensSugeridos.push({
    codigo: caboPretoCodigo,
    descricao: `Cabo Cobre Isolado Preto (Fase) PVC 70°C ${caboGauge} mm² 750V/1kV`,
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: metrosPreto,
    precoUnitarioEstimado: caboPretoPreco,
    precoTotal: metrosPreto * caboPretoPreco,
    obrigatorioNorma: true,
    nota: `${fases} condutor(es) de fase (${caboGauge} mm²).`
  });

  // Cabo Azul Claro (Neutro)
  const caboAzulCodigo = `CABO-AZUL-${caboGauge}`;
  const caboAzulPreco = getPreco(caboAzulCodigo, caboGauge <= 16 ? 18.5 : caboGauge <= 25 ? 28 : caboGauge <= 35 ? 38.5 : caboGauge <= 50 ? 54 : caboGauge <= 70 ? 76 : 105);
  itensSugeridos.push({
    codigo: caboAzulCodigo,
    descricao: `Cabo Cobre Isolado Azul Claro (Neutro) PVC 70°C ${caboGauge} mm² 750V/1kV`,
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: metrosAzul,
    precoUnitarioEstimado: caboAzulPreco,
    precoTotal: metrosAzul * caboAzulPreco,
    obrigatorioNorma: true,
    nota: `Condutor neutro exclusivo (${caboGauge} mm²).`
  });

  // Cabo Verde (Proteção Terra PE)
  const caboVerdeCodigo = `CABO-VERDE-${peGauge}`;
  const caboVerdePreco = getPreco(caboVerdeCodigo, peGauge <= 16 ? 18.5 : peGauge <= 25 ? 28 : 38.5);
  itensSugeridos.push({
    codigo: caboVerdeCodigo,
    descricao: `Cabo Cobre Isolado Verde (Terra/PE) PVC 70°C ${peGauge} mm² 750V/1kV`,
    categoria: "CONDUTOR",
    unidade: "m",
    quantidade: metrosVerde,
    precoUnitarioEstimado: caboVerdePreco,
    precoTotal: metrosVerde * caboVerdePreco,
    obrigatorioNorma: true,
    nota: `Condutor de proteção PE (${peGauge} mm²).`
  });

  // 5. Eletrodutos, Luvas e Curvas S do Padrão Principal
  itensSugeridos.push({
    codigo: eletroCodigo,
    descricao: `Eletroduto PVC Rígido Roscável Ø ${eletroMm} mm (${eletroPol}) - Barra 3m`,
    categoria: "ELETRODUTO",
    unidade: "un",
    quantidade: qtdeEletrodutos,
    precoUnitarioEstimado: eletroPrecoUnit,
    precoTotal: qtdeEletrodutos * eletroPrecoUnit,
    obrigatorioNorma: true,
    nota: `${qtdeEletrodutos} barra(s) (${qtdeEletrodutos * 3}m) p/ padrão ${aFavor ? "a favor da rede" : "contra a rede"} c/ saída ${isAerea ? "aérea" : "subterrânea"}.`
  });

  if (qtdeLuvas > 0) {
    itensSugeridos.push({
      codigo: luvaCodigo,
      descricao: `Luva PVC Rígido Roscável Ø ${eletroMm} mm (${eletroPol})`,
      categoria: "ELETRODUTO",
      unidade: "un",
      quantidade: qtdeLuvas,
      precoUnitarioEstimado: luvaPreco,
      precoTotal: qtdeLuvas * luvaPreco,
      obrigatorioNorma: true,
      nota: `Emenda das barras de eletroduto (${qtdeLuvas} un).`
    });
  }

  itensSugeridos.push({
    codigo: cabecoteCodigo,
    descricao: `Cabeçote Pingadouro Alumínio Ø ${eletroMm} mm (${eletroPol})`,
    categoria: "ELETRODUTO",
    unidade: "un",
    quantidade: qtdeCabecotes,
    precoUnitarioEstimado: cabecotePreco,
    precoTotal: qtdeCabecotes * cabecotePreco,
    obrigatorioNorma: true,
    nota: isAerea ? "2 cabeçotes (entrada e saída aérea)." : "1 cabeçote (entrada subterrânea)."
  });

  itensSugeridos.push({
    codigo: curvaSCodigo,
    descricao: `Curva S PVC Rígido Roscável Ø ${eletroMm} mm (${eletroPol})`,
    categoria: "ELETRODUTO",
    unidade: "un",
    quantidade: qtdeCurvasS,
    precoUnitarioEstimado: curvaSPreco,
    precoTotal: qtdeCurvasS * curvaSPreco,
    obrigatorioNorma: true,
    nota: isAerea ? "2 curvas S p/ saída aérea." : "1 curva S p/ saída subterrânea."
  });

  itensSugeridos.push({
    codigo: buchaArruelaCodigo,
    descricao: `Bucha e Arruela de PVC Roscável Ø ${eletroMm} mm (${eletroPol}) p/ Fixação nas Caixas`,
    categoria: "ELETRODUTO",
    unidade: "cj",
    quantidade: 2,
    precoUnitarioEstimado: buchaArruelaPreco,
    precoTotal: 2 * buchaArruelaPreco,
    obrigatorioNorma: true,
    nota: "Conexão e vedação do eletroduto na caixa de medição."
  });

  // 6. Aterramento Normativo (Haste Galvanizada + Eletroduto 3/4" + Curva S 3/4" + Bucha/Arruela 3/4")
  itensSugeridos.push({
    codigo: "HASTE-ATERRAMENTO-GALV-58",
    descricao: "Haste de Aterramento Aço Galvanizado 5/8\" x 2,40m (Homologada CEMIG)",
    categoria: "ATERRAMENTO",
    unidade: "un",
    quantidade: hastesQtde,
    precoUnitarioEstimado: hasteGalvPreco,
    precoTotal: hastesQtde * hasteGalvPreco,
    obrigatorioNorma: true,
    nota: `${hastesQtde} haste(s) galvanizada(s) obrigatória(s) conforme norma CEMIG.`
  });

  itensSugeridos.push({
    codigo: "ELET-PVC-34-TERRA",
    descricao: "Eletroduto PVC Rígido Ø 3/4\" (Barra 3m) p/ Aterramento",
    categoria: "ELETRODUTO",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("ELET-PVC-34-TERRA", 22),
    precoTotal: getPreco("ELET-PVC-34-TERRA", 22),
    obrigatorioNorma: true,
    nota: "Proteção mecânica da descida do condutor de aterramento."
  });

  itensSugeridos.push({
    codigo: "BUCHA-ARRUELA-PVC-34",
    descricao: "Bucha e Arruela de PVC Ø 3/4\" p/ Aterramento",
    categoria: "ELETRODUTO",
    unidade: "cj",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("BUCHA-ARRUELA-PVC-34", 8),
    precoTotal: getPreco("BUCHA-ARRUELA-PVC-34", 8),
    obrigatorioNorma: true
  });

  itensSugeridos.push({
    codigo: "CURVA-S-34",
    descricao: "Curva S de PVC Ø 3/4\" p/ Aterramento",
    categoria: "ELETRODUTO",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("CURVA-S-34", 14),
    precoTotal: getPreco("CURVA-S-34", 14),
    obrigatorioNorma: true
  });

  itensSugeridos.push({
    codigo: "CABO-COBRE-NU-10",
    descricao: "Cabo Cobre Nu 10 mm² para Aterramento / Malha",
    categoria: "ATERRAMENTO",
    unidade: "m",
    quantidade: caboNuMetros,
    precoUnitarioEstimado: caboNuPrecoUnit,
    precoTotal: caboNuMetros * caboNuPrecoUnit,
    obrigatorioNorma: true
  });

  itensSugeridos.push({
    codigo: "CX-INSPECAO-ATERRAMENTO",
    descricao: "Caixa de Inspeção de Aterramento Cilíndrica PVC c/ Tampa",
    categoria: "ATERRAMENTO",
    unidade: "un",
    quantidade: hastesQtde,
    precoUnitarioEstimado: cxInspecaoPreco,
    precoTotal: hastesQtde * cxInspecaoPreco,
    obrigatorioNorma: true
  });

  // 7. Terminais Conforme Bitola e Padrão
  // A1: 6 tubulares | B1: 10 tubulares | C1..C3: 14 tubulares | C4..C5: 14 pino maciço | C6: 6 tubulares 95mm²
  let termCodigo = "";
  let termDescricao = "";
  let termQtde = 14;

  if (isBifasico) {
    termCodigo = `TERM-TUBULAR-${caboGauge}`;
    termDescricao = `Terminal Tubular Ilhós ${caboGauge} mm²`;
    termQtde = 10;
  } else if (faixaDemanda === "C1" || faixaDemanda === "C2" || faixaDemanda === "C3") {
    termCodigo = `TERM-TUBULAR-${caboGauge}`;
    termDescricao = `Terminal Tubular Ilhós ${caboGauge} mm²`;
    termQtde = 14;
  } else if (faixaDemanda === "C4" || faixaDemanda === "C5") {
    termCodigo = `TERM-PINO-MACICO-${caboGauge}`;
    termDescricao = `Terminal Pino Maciço ${caboGauge} mm²`;
    termQtde = 14;
  } else {
    // C6 (200A)
    termCodigo = `TERM-TUBULAR-${caboGauge}`;
    termDescricao = `Terminal Tubular Ilhós ${caboGauge} mm²`;
    termQtde = 6;
  }

  const termPreco = getPreco(termCodigo, termCodigo.includes("PINO") ? (caboGauge <= 50 ? 9.8 : 14.5) : (caboGauge <= 16 ? 2.8 : caboGauge <= 25 ? 3.5 : caboGauge <= 35 ? 4.2 : 12.0));
  itensSugeridos.push({
    codigo: termCodigo,
    descricao: termDescricao,
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: termQtde,
    precoUnitarioEstimado: termPreco,
    precoTotal: termQtde * termPreco,
    obrigatorioNorma: true,
    nota: `${termQtde} terminais adequados para conexão no disjuntor e medidor.`
  });

  // 8. Conectores Bimetálicos (2 un: 1 para neutro, 1 para terra)
  const conectorBimNeutroCodigo = `CONECTOR-BIMETALICO-${caboGauge}`;
  const conectorBimNeutroPreco = getPreco(conectorBimNeutroCodigo, caboGauge <= 16 ? 24 : caboGauge <= 25 ? 29 : caboGauge <= 35 ? 36 : caboGauge <= 50 ? 48 : caboGauge <= 70 ? 58 : 72);
  itensSugeridos.push({
    codigo: conectorBimNeutroCodigo,
    descricao: `Conector Bimetálico Perfurante/Compressão para Cabo ${caboGauge} mm² (Neutro)`,
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: conectorBimNeutroPreco,
    precoTotal: conectorBimNeutroPreco,
    obrigatorioNorma: true,
    nota: "Conexão bimetálica do condutor neutro à rede CEMIG."
  });

  const conectorBimTerraCodigo = `CONECTOR-BIMETALICO-${peGauge}`;
  const conectorBimTerraPreco = getPreco(conectorBimTerraCodigo, peGauge <= 16 ? 24 : peGauge <= 25 ? 29 : 36);
  itensSugeridos.push({
    codigo: conectorBimTerraCodigo,
    descricao: `Conector Bimetálico Perfurante/Compressão para Cabo ${peGauge} mm² (Terra/PE)`,
    categoria: "ACESSORIO",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: conectorBimTerraPreco,
    precoTotal: conectorBimTerraPreco,
    obrigatorioNorma: true,
    nota: "Conexão bimetálica do condutor de aterramento/PE."
  });

  // 9. Cintas para Poste Circular e Parafusos Avulsos
  if (params.tipoEstrutura === "POSTE_CONCRETO" || params.tipoEstrutura === "POSTE_ACO") {
    // 2 cintas base + 2 cintas se aérea (total 4) ou + 1 cinta se subterrânea (total 3)
    const qtdeCintas = isAerea ? 4 : 3;
    const cintaCodigo = `CINTA-POSTE-${postNome}`;
    const cintaPreco = getPreco(cintaCodigo, 38);

    itensSugeridos.push({
      codigo: cintaCodigo,
      descricao: `Cinta de Aço para Poste Circular / Duplo T ${postNome}`,
      categoria: "FERRAGEM",
      unidade: "un",
      quantidade: qtdeCintas,
      precoUnitarioEstimado: cintaPreco,
      precoTotal: qtdeCintas * cintaPreco,
      obrigatorioNorma: true,
      nota: isAerea
        ? `4 cintas para poste ${postNome} (2 fixação caixa + 2 travamento eletroduto saída aérea).`
        : `3 cintas para poste ${postNome} (2 fixação caixa + 1 travamento eletroduto saída subterrânea).`
    });

    // Parafuso galvanizado com porca e arruela avulsos para cada cinta
    itensSugeridos.push({
      codigo: "PARAFUSO-PORCA-ARRUELA-CINTA",
      descricao: "Parafuso Galvanizado com Porca e Arruela para Cinta de Poste",
      categoria: "FERRAGEM",
      unidade: "un",
      quantidade: qtdeCintas,
      precoUnitarioEstimado: getPreco("PARAFUSO-PORCA-ARRUELA-CINTA", 9.5),
      precoTotal: qtdeCintas * getPreco("PARAFUSO-PORCA-ARRUELA-CINTA", 9.5),
      obrigatorioNorma: true,
      nota: "Travamento mecânico individual de cada cinta."
    });
  }

  // 10. Ferragens Adicionais
  itensSugeridos.push({
    codigo: "ARMACAO-SECUNDARIA-1E",
    descricao: "Armação Secundária de 1 Estribo Reforçada Galvanizada a Fogo",
    categoria: "FERRAGEM",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("ARMACAO-SECUNDARIA-1E", 36),
    precoTotal: getPreco("ARMACAO-SECUNDARIA-1E", 36),
    obrigatorioNorma: true
  });

  itensSugeridos.push({
    codigo: "ISOLADOR-ROLDANA-72",
    descricao: "Isolador Roldana de Porcelana Vitrificada 72x72 mm",
    categoria: "FERRAGEM",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("ISOLADOR-ROLDANA-72", 18),
    precoTotal: getPreco("ISOLADOR-ROLDANA-72", 18),
    obrigatorioNorma: true
  });

  itensSugeridos.push({
    codigo: "HASTE-OLHAL-16X150",
    descricao: "Haste / Parafuso com Olhal Ø 16 x 150 mm p/ Armação Secundária",
    categoria: "FERRAGEM",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("HASTE-OLHAL-16X150", 24),
    precoTotal: getPreco("HASTE-OLHAL-16X150", 24),
    obrigatorioNorma: true
  });

  itensSugeridos.push({
    codigo: "ARAME-GALV-12",
    descricao: "Arame de Aço Galvanizado nº 12 BWG (500g) p/ Amarração",
    categoria: "FERRAGEM",
    unidade: "un",
    quantidade: 1,
    precoUnitarioEstimado: getPreco("ARAME-GALV-12", 22),
    precoTotal: getPreco("ARAME-GALV-12", 22),
    obrigatorioNorma: true
  });

  // Base Concretada para Poste
  if (params.tipoEstrutura === "POSTE_CONCRETO" || params.tipoEstrutura === "POSTE_ACO") {
    itensSugeridos.push({
      codigo: "SRV-BASE-CONCRETO",
      descricao: "Material Civil para Base Concretada do Poste (Cimento, Areia, Brita)",
      categoria: "ACESSORIO",
      unidade: "cj",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-BASE-CONCRETO", 220),
      precoTotal: getPreco("SRV-BASE-CONCRETO", 220),
      obrigatorioNorma: true,
      nota: "Obrigatório engastamento em base concretada conforme Desenho 57."
    });
  }

  // Serviços e Capex (opcional / incluído por default)
  if (params.incluirMaoDeObra !== false) {
    itensSugeridos.push({
      codigo: "SRV-MONTAGEM-PADRAO",
      descricao: "Mão de Obra Especializada de Montagem Completa do Padrão CEMIG",
      categoria: "MAO_DE_OBRA",
      unidade: "sv",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-MONTAGEM-PADRAO", 1400),
      precoTotal: getPreco("SRV-MONTAGEM-PADRAO", 1400),
      obrigatorioNorma: false,
      nota: "Equipe Cordeiro Energia: escavação, engastamento, montagem e conexões."
    });
  }

  if (params.incluirART !== false) {
    itensSugeridos.push({
      codigo: "SRV-ENG-ART",
      descricao: "Projeto Elétrico de Entrada e Emissão de ART (CREA-MG)",
      categoria: "MAO_DE_OBRA",
      unidade: "sv",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-ENG-ART", 350),
      precoTotal: getPreco("SRV-ENG-ART", 350),
      obrigatorioNorma: false,
      nota: "Responsabilidade técnica de Engenheiro Eletricista."
    });
  }

  if (params.incluirVistoria !== false) {
    itensSugeridos.push({
      codigo: "SRV-VISTORIA-CEMIG",
      descricao: "Acompanhamento Técnico de Vistoria e Homologação na CEMIG",
      categoria: "MAO_DE_OBRA",
      unidade: "sv",
      quantidade: 1,
      precoUnitarioEstimado: getPreco("SRV-VISTORIA-CEMIG", 450),
      precoTotal: getPreco("SRV-VISTORIA-CEMIG", 450),
      obrigatorioNorma: false,
      nota: "Agendamento e acompanhamento até a instalação do medidor."
    });
  }

  // Notas Técnicas
  const notasTecnicas: string[] = [
    `Dimensionamento estabelecido pela norma CEMIG ND-5.1 (${isBifasico ? "Tabela 1 - Categoria B1" : `Tabela 2 - Categoria ${faixaDemanda}`}).`,
    `Tensão nominal de atendimento: 127/220V em Baixa Tensão (${fases} Fases + Neutro).`,
    `Localização: ${localizacao === "RURAL" ? "Área Rural (Obrigatório Lado Oposto / Contra a rede)" : "Área Urbana"}.`,
    `Tipo de Saída da Carga: ${isAerea ? "Saída Aérea (2 cabeçotes, 2 curvas S)" : "Saída Subterrânea (1 cabeçote, 1 curva S)"}.`,
    `O condutor neutro do ramal de entrada possui seção igual à dos condutores fase (${caboGauge} mm²).`,
    `O engastamento do poste no solo deve ser executado obrigatoriamente com base concretada conforme Desenho 57.`,
    aFavor
      ? `Instalação do mesmo lado da rede CEMIG (a favor): poste homologado ${params.tipoEstrutura === "POSTE_CONCRETO" ? faixaInfo.posteMesmoLadoConc : faixaInfo.posteMesmoLadoAco}.`
      : `Instalação do lado oposto da rede CEMIG (contra): exige poste reforçado ${params.tipoEstrutura === "POSTE_CONCRETO" ? faixaInfo.posteLadoOpostoConc : faixaInfo.posteLadoOpostoAco} para suportar o esforço mecânico da travessia aérea da via pública.`,
    `Disjuntor geral termomagnético IEC curva C de ${disj}A homologado pela CEMIG (PEC-11).`,
    `Sistema de aterramento com ${hastesQtde} haste(s) galvanizada(s) 5/8" x 2,40m interligadas com cabo de cobre nu 10 mm² e condutor de proteção de ${peGauge} mm².`,
    `Eletrodutos de descida: ${qtdeEletrodutos} barra(s) de PVC rígido Ø ${eletroPol}${qtdeLuvas > 0 ? ` e ${qtdeLuvas} luva(s)` : " (sem necessidade de luva de emenda)"}.`,
    `Caixa de medição metálica em chapa de aço homologada CEMIG (${usaCM3 ? "Tipo CM-3" : "Tipo CM-14"}) conforme ND 5.1 (caixas em policarbonato são exclusivas para medição agrupada ND 5.2).`
  ];

  // Alertas e Recomendações para Postos de Carregamento VE
  const alertasEV: string[] = [];
  if (params.finalidade === "CARREGADOR_VE" || params.potenciaCarregadorKW) {
    const potEV = params.potenciaCarregadorKW || (isBifasico ? 7.4 : disj <= 63 ? 22 : 44);
    alertasEV.push(`Posto de Carregamento VE: Demanda contínua calculada para ${potEV} kW.`);
    if (potEV > demandaMaxKVA) {
      alertasEV.push(`⚠️ ATENÇÃO: A potência do carregador (${potEV} kW) excede o limite desta categoria CEMIG (${demandaMaxKVA} kVA). Recomenda-se selecionar um disjuntor maior.`);
    }
    if (isBifasico && potEV >= 11) {
      alertasEV.push(`⚠️ Carregadores de 11 kW ou 22 kW requerem padrão Trifásico 220/380V ou Trifásico 127/220V com transformador. O padrão Bifásico atende até 7.4 kW em 220V (32A).`);
    } else if (isBifasico && potEV <= 7.4) {
      alertasEV.push(`✅ Carregador 7.4 kW (32A - 220V): Atendido perfeitamente pelo disjuntor bifásico de 63A.`);
    } else if (!isBifasico && potEV <= 22) {
      alertasEV.push(`✅ Carregador 22 kW / 11 kW: Atendido com folga pelo padrão trifásico (${disj}A).`);
    }
    alertasEV.push(`Conforme NBR 17019, o circuito do carregador deve contar com Dispositivo DR Tipo A ou Tipo B (30mA) dedicado e DPS Classe II.`);
  }

  const descResumo = isBifasico
    ? `Padrão Bifásico CEMIG (127/220V) | Disjuntor ${disj}A | Faixa B1 (até 16 kW) | Cabo ${caboGauge}mm² | Saída ${tipoSaida} | ${localizacao}`
    : `Padrão Trifásico CEMIG (127/220V) | Disjuntor ${disj}A | Faixa ${faixaDemanda} (${demandaMinKVA} a ${demandaMaxKVA} kVA) | Cabo ${caboGauge}mm² | Saída ${tipoSaida} | ${localizacao}`;

  return {
    tipoPadrao: params.tipoPadrao,
    categoriaDemanda: "INDIVIDUAL_TABELA_2",
    tipoSaida,
    localizacao,
    ladoRede,
    faixaFornecimento: faixaDemanda,
    demandaMinKVA,
    demandaMaxKVA,
    fases,
    fios,
    disjuntorNominalA: disj,
    caboFaseMm2: caboGauge,
    caboNeutroMm2: caboGauge,
    caboProtecaoMm2: peGauge,
    caboNuMm2: 10,
    hastesAterramentoQtde: hastesQtde,
    eletrodutoPVCmm: eletroMm,
    eletrodutoPvcPol: eletroPol,
    eletrodutoAcoMm: faixaInfo.eletrodutoAco,
    posteHomologado: params.tipoEstrutura === "POSTE_CONCRETO"
      ? (aFavor ? faixaInfo.posteMesmoLadoConc : faixaInfo.posteLadoOpostoConc)
      : (aFavor ? faixaInfo.posteMesmoLadoAco : faixaInfo.posteLadoOpostoAco),
    caixaMedicao: usaCM3 ? "CM-3 Metálica (Medição Indireta 200A)" : "CM-14 Metálica (Medição Direta até 125A)",
    caixaDisjuntor: usaCM3 ? "Alojamento Metálico CM-3 / Caixa Proteção" : "CM-14 Integrada Metálica",
    descricaoResumo: descResumo,
    notasTecnicas,
    alertasEV,
    itensSugeridos
  };
}
