/**
 * Motor de Dimensionamento de Padrão de Entrada CEMIG
 * Baseado na Norma Técnica CEMIG ND-5.1 (Nov/2024)
 * - Tabela 1: Redes Secundárias 127/220V (Monofásico e Bifásico)
 * - Tabela 2: Redes Secundárias Trifásicas 127/220V (Ligações a 4 fios)
 * - Desenhos 5, 6, 13 e 57 (Postes, Caixas, Aterramento e Ferragens)
 * Cordeiro Energia - Engenharia e Mobilidade Elétrica
 */

export type TipoPadrao = "BIFASICO" | "TRIFASICO";
export type LadoRede = "MESMO_LADO" | "LADO_OPOSTO"; // A Favor ou Contra
export type TipoSaida = "AEREA" | "SUBTERRANEA"; // Saída Aérea ou Subterrânea
export type LocalizacaoPadrao = "URBANO" | "RURAL"; // Localização da Unidade Consumidora
export type TipoEstrutura = "POSTE_CONCRETO" | "POSTE_ACO" | "PONTALETE" | "MURO";
export type FinalidadePadrao = "CARREGADOR_VE" | "PADRAO_GERAL" | "AUMENTO_CARGA";

export interface ParametrosPadraoCemig {
  tipoPadrao: TipoPadrao;
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
  tipoSaida: TipoSaida;
  localizacao: LocalizacaoPadrao;
  ladoRede: LadoRede;
  faixaFornecimento: string; // "B1", "C1", "C2", "C3", "C4", "C5", "C6"
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
  posteHomologado: string;
  caixaMedicao: string;
  caixaDisjuntor: string;
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

  const isBifasico = params.tipoPadrao === "BIFASICO";
  const disj = params.disjuntorAmperes;

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
