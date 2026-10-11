import { DxfDocument } from "./dxfGenerator";

export type TipoDispositivo = "GERAL" | "DPS" | "DR" | "CIRCUITO" | "EV_CHARGER" | "SOLAR_INVERSOR" | "CAIXA_MOLDADA" | "BARRAMENTO_CENTRAL";

export interface CircuitoEletrico {
  id: string;
  tag: string;             // Ex: "GERAL", "DPS", "DR", "C1", "C2", "WALLBOX"
  descricao: string;       // Ex: "Disjuntor Geral", "Carregador Carro Elétrico", "Ar Condicionado"
  tipo: TipoDispositivo;
  aparato?: "DIN" | "CAIXA_MOLDADA";
  polos: 1 | 2 | 3 | 4;   // 1P, 2P, 3P, 4P (cada polo = 18mm no trilho DIN)
  correnteNominalA: number; // Ex: 10, 16, 20, 25, 32, 40, 50, 63, 100, 125, 160, 250
  correnteInterrupcaoKa?: number; // 6kA, 10kA, 16kA, 25kA, 36kA
  curvaDisjuntor?: "B" | "C" | "D";
  drProtecao?: boolean;   // Se este circuito passa por um DR
  sensibilidadeDrMA?: number; // 30mA
  dpsClasse?: "II";
  dpsKa?: number;         // 20kA, 40kA, 45kA
  tensaoV: 127 | 220 | 380;
  potenciaW?: number;
  faseAlocada?: "R" | "S" | "T" | "RS" | "ST" | "RT" | "RST";
  bitolaCaboMm2: number;  // 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0
  quedaTensaoPct?: number;
  corFase?: string;       // Preto, Vermelho, Branco
}

export interface QuadroEletricoModel {
  nome: string;           // Ex: "QDC Principal - Cordeiro Energia"
  localizacao: string;    // Ex: "Garagem / Subestação"
  tipoAlimentacao: "MONOFASICO" | "BIFASICO" | "TRIFASICO";
  tensaoEntradaV: 220 | 380;
  disjuntorGeralA: number;
  trilhos: {
    numero: number;
    dispositivos: CircuitoEletrico[];
  }[];
}

/**
 * Cria um modelo pré-configurado de quadro elétrico residencial/comercial completo
 * com proteção para Carregador de Carro Elétrico (EV) e Usina Solar (igual à foto do usuário)
 */
export function criarQuadroExemplo(): QuadroEletricoModel {
  return {
    nome: "Quadro de Distribuição (QDC) com Carregador EV",
    localizacao: "Canteiro de Obras / Garagem Principal",
    tipoAlimentacao: "TRIFASICO",
    tensaoEntradaV: 380,
    disjuntorGeralA: 63,
    trilhos: [
      {
        numero: 1, // Trilho Superior: DPS + Disjuntor Geral + Circuitos Não-Úmidos
        dispositivos: [
          {
            id: "dps-1",
            tag: "DPS",
            descricao: "DPS Classe II 45kA (3 Fases + N)",
            tipo: "DPS",
            polos: 4,
            correnteNominalA: 45,
            dpsKa: 45,
            dpsClasse: "II",
            tensaoV: 380,
            bitolaCaboMm2: 10,
          },
          {
            id: "geral-1",
            tag: "GERAL",
            descricao: "Disjuntor Geral Tripolar 63A Curva C",
            tipo: "GERAL",
            polos: 3,
            correnteNominalA: 63,
            curvaDisjuntor: "C",
            tensaoV: 380,
            bitolaCaboMm2: 16,
            corFase: "#0f172a",
          },
          {
            id: "c1",
            tag: "C1",
            descricao: "Iluminação Geral",
            tipo: "CIRCUITO",
            polos: 1,
            correnteNominalA: 10,
            curvaDisjuntor: "B",
            tensaoV: 220,
            potenciaW: 1200,
            bitolaCaboMm2: 1.5,
            corFase: "#0f172a",
          },
          {
            id: "c2",
            tag: "C2",
            descricao: "Tomadas Escritório / Sala",
            tipo: "CIRCUITO",
            polos: 1,
            correnteNominalA: 16,
            curvaDisjuntor: "B",
            tensaoV: 220,
            potenciaW: 2500,
            bitolaCaboMm2: 2.5,
            corFase: "#dc2626",
          },
          {
            id: "c3",
            tag: "C3",
            descricao: "Ar Condicionado 01 (18.000 BTU)",
            tipo: "CIRCUITO",
            polos: 2,
            correnteNominalA: 20,
            curvaDisjuntor: "C",
            tensaoV: 220,
            potenciaW: 2200,
            bitolaCaboMm2: 4.0,
            corFase: "#0f172a",
          },
          {
            id: "c4",
            tag: "C4",
            descricao: "Ar Condicionado 02",
            tipo: "CIRCUITO",
            polos: 2,
            correnteNominalA: 20,
            curvaDisjuntor: "C",
            tensaoV: 220,
            potenciaW: 2200,
            bitolaCaboMm2: 4.0,
            corFase: "#dc2626",
          },
        ],
      },
      {
        numero: 2, // Trilho Inferior: DR Tetrapolar + Circuitos Protegidos + Carregador EV (Wallbox)
        dispositivos: [
          {
            id: "dr-1",
            tag: "DR",
            descricao: "Interruptor Diferencial Residual Tetrapolar 63A / 30mA",
            tipo: "DR",
            polos: 4,
            correnteNominalA: 63,
            sensibilidadeDrMA: 30,
            tensaoV: 380,
            bitolaCaboMm2: 16,
          },
          {
            id: "c-ev",
            tag: "WALLBOX EV",
            descricao: "Carregador Veicular Elétrico 7.4 kW / 32A Dedicado",
            tipo: "EV_CHARGER",
            polos: 2,
            correnteNominalA: 32,
            curvaDisjuntor: "C",
            drProtecao: true,
            tensaoV: 220,
            potenciaW: 7400,
            bitolaCaboMm2: 6.0,
            corFase: "#0f172a",
          },
          {
            id: "c5",
            tag: "C5",
            descricao: "Tomadas Cozinha / Canteiro",
            tipo: "CIRCUITO",
            polos: 1,
            correnteNominalA: 20,
            curvaDisjuntor: "B",
            drProtecao: true,
            tensaoV: 220,
            potenciaW: 3000,
            bitolaCaboMm2: 2.5,
            corFase: "#dc2626",
          },
          {
            id: "c6",
            tag: "C6",
            descricao: "Área Externa e Iluminação Perimetral",
            tipo: "CIRCUITO",
            polos: 1,
            correnteNominalA: 16,
            curvaDisjuntor: "B",
            drProtecao: true,
            tensaoV: 220,
            potenciaW: 1800,
            bitolaCaboMm2: 2.5,
            corFase: "#0f172a",
          },
          {
            id: "c7",
            tag: "C7",
            descricao: "Chuveiro Elétrico 6.800W",
            tipo: "CIRCUITO",
            polos: 2,
            correnteNominalA: 32,
            curvaDisjuntor: "B",
            drProtecao: true,
            tensaoV: 220,
            potenciaW: 6800,
            bitolaCaboMm2: 6.0,
            corFase: "#dc2626",
          },
        ],
      },
    ],
  };
}

/**
 * Gera a Lista de Materiais Elétricos (BOM - Bill of Materials)
 */
export function gerarListaDeMateriais(quadro: QuadroEletricoModel) {
  const materiais: { item: string; quantidade: number; unidade: string; especificacao: string }[] = [];

  let totalModulos = 0;
  let disjuntores1P = 0;
  let disjuntores2P = 0;
  let disjuntores3P = 0;
  let drCount = 0;
  let dpsCount = 0;

  for (const trilho of quadro.trilhos) {
    for (const d of trilho.dispositivos) {
      totalModulos += d.polos;
      if (d.tipo === "DPS") dpsCount++;
      else if (d.tipo === "DR") drCount++;
      else {
        if (d.polos === 1) disjuntores1P++;
        else if (d.polos === 2) disjuntores2P++;
        else if (d.polos >= 3) disjuntores3P++;
      }
    }
  }

  // Caixa do quadro (adiciona folga recomendada de 30% pela NBR 5410)
  const capacidadeQuadro = totalModulos <= 12 ? 18 : totalModulos <= 24 ? 36 : 48;
  materiais.push({
    item: `Quadro de Distribuição de Sobrepor/Embutir ${capacidadeQuadro} Módulos DIN`,
    quantidade: 1,
    unidade: "pç",
    especificacao: "Porta fumê ou opaca, trilhos metálicos DIN TH35 inclusos (Marca Steck ou similar)",
  });

  // Disjuntor Geral
  materiais.push({
    item: `Disjuntor Tripolar ${quadro.disjuntorGeralA}A Curva C DIN`,
    quantidade: 1,
    unidade: "pç",
    especificacao: `Proteção geral da entrada ${quadro.tensaoEntradaV}V (Steck/Schneider/Weg)`,
  });

  // DPS
  if (dpsCount > 0) {
    materiais.push({
      item: "Dispositivo de Proteção contra Surtos (DPS) Classe II 45kA 275V",
      quantidade: 4, // 3 fases + neutro
      unidade: "pç",
      especificacao: "Módulo monopolar DIN plugável com sinalizador de status verde/vermelho (Clamper/Steck)",
    });
  }

  // DR
  if (drCount > 0) {
    materiais.push({
      item: "Interruptor Diferencial Residual (IDR) Tetrapolar 63A / 30mA",
      quantidade: 1,
      unidade: "pç",
      especificacao: "Sensibilidade 30mA alta sensibilidade para proteção humana contra choques elétricos",
    });
  }

  // Disjuntores parciais
  if (disjuntores1P > 0) {
    materiais.push({
      item: "Disjuntor Monopolar DIN Curva B/C (Diversas Amperagens)",
      quantidade: disjuntores1P,
      unidade: "pç",
      especificacao: "Circuitos de iluminação e tomadas (10A a 20A)",
    });
  }
  if (disjuntores2P > 0) {
    materiais.push({
      item: "Disjuntor Bipolar DIN Curva C (20A a 32A)",
      quantidade: disjuntores2P,
      unidade: "pç",
      especificacao: "Cargas dedicadas: Ar condicionado, Chuveiro e Estação de Recarga Wallbox EV",
    });
  }

  // Barramentos e cabos
  materiais.push({
    item: "Barramento tipo Pente Trifásico 12 a 18 Pinos 63A/80A",
    quantidade: 2,
    unidade: "barras",
    especificacao: "Cobre estanhado com isolação de proteção para interligação rápida de disjuntores",
  });
  materiais.push({
    item: "Barramento de Latão com Parafusos para Neutro e Terra",
    quantidade: 2,
    unidade: "pç",
    especificacao: "Fixação direta no quadro para barramento equipotencial",
  });
  materiais.push({
    item: "Cabo Flexível 750V 10mm² / 16mm² (Preto/Azul/Verde)",
    quantidade: 10,
    unidade: "metros",
    especificacao: "Fiação interna do quadro entre disjuntor geral, DPS, DR e barramentos",
  });
  materiais.push({
    item: "Kit Terminais Tubulares / Ilhós para Cabos 1.5mm² a 16mm²",
    quantidade: 50,
    unidade: "pç",
    especificacao: "Crimpagem de pontas flexíveis para contato elétrico perfeito sem aquecimento",
  });

  return materiais;
}

/**
 * Gera o arquivo DXF completo para abrir no AutoCAD com o painel desenhado em escala real
 */
export function exportarQuadroParaDxf(quadro: QuadroEletricoModel): string {
  const doc = new DxfDocument();

  // Dimensões do Quadro em milímetros (Escala Real 1:1)
  const quadroWidth = 420;
  const quadroHeight = 580;
  const startX = 50;
  const startY = 50;

  // 1. Moldura Externa do Quadro
  doc.addRect(startX, startY, quadroWidth, quadroHeight, "ELET_QUADRO_CAIXA");
  doc.addRect(startX + 10, startY + 10, quadroWidth - 20, quadroHeight - 20, "ELET_QUADRO_CAIXA");

  // Título e Carimbo
  doc.addText(quadro.nome.toUpperCase(), startX + 20, startY + quadroHeight - 35, 6, "ELET_TEXTOS");
  doc.addText(`CORDEIRO ENERGIA • ${quadro.tipoAlimentacao} ${quadro.tensaoEntradaV}V • GERAL: ${quadro.disjuntorGeralA}A`, startX + 20, startY + quadroHeight - 50, 4, "ELET_TEXTOS");

  // Barramentos laterais de Neutro (esquerda) e Terra (direita)
  const barramentoY = startY + 60;
  const barramentoH = quadroHeight - 140;

  // Barramento Neutro (Azul)
  doc.addRect(startX + 18, barramentoY, 14, barramentoH, "ELET_CABO_NEUTRO");
  doc.addText("BARRAMENTO NEUTRO (N)", startX + 16, barramentoY + barramentoH + 8, 3, "ELET_CABO_NEUTRO");
  for (let y = barramentoY + 10; y < barramentoY + barramentoH; y += 15) {
    doc.addCircle(startX + 25, y, 2.5, "ELET_CABO_NEUTRO");
  }

  // Barramento Terra (Verde)
  doc.addRect(startX + quadroWidth - 32, barramentoY, 14, barramentoH, "ELET_CABO_TERRA");
  doc.addText("BARRAMENTO TERRA (PE)", startX + quadroWidth - 55, barramentoY + barramentoH + 8, 3, "ELET_CABO_TERRA");
  for (let y = barramentoY + 10; y < barramentoY + barramentoH; y += 15) {
    doc.addCircle(startX + quadroWidth - 25, y, 2.5, "ELET_CABO_TERRA");
  }

  // Desenha os Trilhos DIN e Dispositivos
  const trilhoWidth = quadroWidth - 90;
  const trilhoStartX = startX + 45;

  let trilhoY = startY + quadroHeight - 160;

  quadro.trilhos.forEach((trilho) => {
    // Trilho metálico DIN TH35
    doc.addRect(trilhoStartX - 5, trilhoY + 20, trilhoWidth + 10, 35, "ELET_TRILHO_DIN");
    doc.addText(`TRILHO DIN 0${trilho.numero}`, trilhoStartX, trilhoY + 62, 3, "ELET_TEXTOS");

    let dispX = trilhoStartX + 10;

    for (const d of trilho.dispositivos) {
      const dispWidth = d.polos * 18; // 18mm por módulo DIN
      const dispHeight = 75;

      let layerDisp = "ELET_DISJUNTORES";
      if (d.tipo === "DPS") layerDisp = "ELET_DPS";
      else if (d.tipo === "DR") layerDisp = "ELET_DR";

      // Caixa do Dispositivo
      doc.addRect(dispX, trilhoY, dispWidth, dispHeight, layerDisp);

      // Manopla / Alavanca de acionamento
      doc.addRect(dispX + dispWidth * 0.25, trilhoY + 25, dispWidth * 0.5, 18, layerDisp);

      // Etiqueta com a TAG
      doc.addRect(dispX + 2, trilhoY + 50, dispWidth - 4, 14, "ELET_ETIQUETAS");
      doc.addText(d.tag, dispX + 4, trilhoY + 54, 3.5, "ELET_ETIQUETAS");

      // Texto de Amperagem
      const txtAmp = d.tipo === "DPS" ? `${d.dpsKa}kA` : `${d.correnteNominalA}A`;
      doc.addText(txtAmp, dispX + 4, trilhoY + 8, 3, "ELET_TEXTOS");

      dispX += dispWidth + 6;
    }

    trilhoY -= 170; // Desce para o próximo trilho
  });

  return doc.toDxfString();
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * MOTOR MATEMÁTICO & DIMENSIONAMENTO DE DISTRIBUIÇÃO NBR 5410 / NBR 17019
 * ══════════════════════════════════════════════════════════════════════════════
 */
export interface CircuitoCargaInput {
  id: string;
  tag: string;
  descricao: string;
  potenciaW: number;
  fases: "MONO" | "BI" | "TRI";
  tensaoV: 127 | 220 | 380;
  fp?: number;
  comprimentoMetros: number;
  quedaTensaoMaxPct?: number;
  tipoCarga?: "GERAL" | "ILUMINACAO" | "TOMADA" | "AR_CONDICIONADO" | "CHUVEIRO" | "EV_WALLBOX" | "SOLAR_INVERSOR";
  temperaturaAmbienteC?: number;
  numCircuitosAgrupados?: number;
}

export interface QuadroDistribucaoDimensionado {
  nome: string;
  tensaoLinhaV: 220 | 380;
  potenciaTotalInstaladaW: number;
  potenciaTotalDemandadaW: number;
  potenciaPorFaseW: { R: number; S: number; T: number };
  desbalanceamentoFasesPct: number;
  correnteGeralCalculadaA: number;
  disjuntorGeral: {
    correnteNominalA: number;
    tipo: "DIN" | "CAIXA_MOLDADA";
    capacidadeInterrupcaoKa: number;
    polos: 3 | 4;
    curva: "C" | "D";
    bitolaCaboAlimentacaoMm2: number;
  };
  conjuntoDps: {
    classe: "II";
    correnteKa: number;
    tensaoUc: number;
    modulos: number;
    conectadoPE: boolean;
  };
  circuitos: CircuitoEletrico[];
  resumoMateriais: { item: string; quantidade: number; unidade: string; especificacao: string }[];
}

const BITOLAS_PADRAO = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0, 120.0, 150.0, 185.0, 240.0];
const CAPACIDADE_CORRENTE_B1: Record<number, number> = {
  1.5: 15.5,
  2.5: 21.0,
  4.0: 28.0,
  6.0: 36.0,
  10.0: 50.0,
  16.0: 68.0,
  25.0: 89.0,
  35.0: 110.0,
  50.0: 134.0,
  70.0: 171.0,
  95.0: 207.0,
  120.0: 239.0,
  150.0: 272.0,
  185.0: 310.0,
  240.0: 364.0,
};
const DISJUNTORES_COMERCIAIS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300, 400, 500, 630];

export function calcularDimensionamentoQuadro(
  nomeQuadro: string,
  tensaoLinhaV: 220 | 380,
  cargas: CircuitoCargaInput[]
): QuadroDistribucaoDimensionado {
  const tensaoFaseNeutroV = tensaoLinhaV === 380 ? 220 : 127;
  const potFases = { R: 0, S: 0, T: 0 };
  const circuitosDimensionados: CircuitoEletrico[] = [];

  for (const c of cargas) {
    const fp = c.fp ?? (c.tipoCarga === "EV_WALLBOX" ? 0.98 : 0.95);
    const quedaMax = c.quedaTensaoMaxPct ?? 4.0;
    const agrupamentoFator = c.numCircuitosAgrupados && c.numCircuitosAgrupados > 1 ? 0.8 : 1.0;
    const tempFator = 1.0;

    let ib = 0;
    let polos: 1 | 2 | 3 | 4 = 1;
    let faseAlocada: "R" | "S" | "T" | "RS" | "ST" | "RT" | "RST" = "R";

    if (c.fases === "MONO") {
      ib = c.potenciaW / (tensaoFaseNeutroV * fp);
      polos = 1;
      if (potFases.R <= potFases.S && potFases.R <= potFases.T) {
        faseAlocada = "R";
        potFases.R += c.potenciaW;
      } else if (potFases.S <= potFases.T) {
        faseAlocada = "S";
        potFases.S += c.potenciaW;
      } else {
        faseAlocada = "T";
        potFases.T += c.potenciaW;
      }
    } else if (c.fases === "BI") {
      ib = c.potenciaW / (tensaoLinhaV * fp);
      polos = 2;
      const pares: [string, number][] = [
        ["RS", potFases.R + potFases.S],
        ["ST", potFases.S + potFases.T],
        ["RT", potFases.R + potFases.T],
      ];
      pares.sort((a, b) => a[1] - b[1]);
      faseAlocada = pares[0][0] as any;
      const met = c.potenciaW / 2;
      if (faseAlocada === "RS") { potFases.R += met; potFases.S += met; }
      else if (faseAlocada === "ST") { potFases.S += met; potFases.T += met; }
      else { potFases.R += met; potFases.T += met; }
    } else {
      ib = c.potenciaW / (Math.sqrt(3) * tensaoLinhaV * fp);
      polos = 3;
      faseAlocada = "RST";
      const terc = c.potenciaW / 3;
      potFases.R += terc;
      potFases.S += terc;
      potFases.T += terc;
    }

    const disjuntorIn = DISJUNTORES_COMERCIAIS.find((d) => d >= ib) || 63;
    const tipoAparato: "DIN" | "CAIXA_MOLDADA" = disjuntorIn > 63 ? "CAIXA_MOLDADA" : "DIN";

    let curva: "B" | "C" | "D" = "C";
    if (c.tipoCarga === "ILUMINACAO" || c.tipoCarga === "TOMADA") curva = "B";
    if (c.tipoCarga === "EV_WALLBOX") curva = "C";

    const izMin = disjuntorIn / (agrupamentoFator * tempFator);

    let bitolaEscolhida = BITOLAS_PADRAO[0];
    for (const b of BITOLAS_PADRAO) {
      if ((CAPACIDADE_CORRENTE_B1[b] || 0) >= izMin) {
        bitolaEscolhida = b;
        break;
      }
    }

    const rho = 0.0178;
    const kTensao = c.fases === "TRI" ? Math.sqrt(3) : 2.0;
    const vBase = c.fases === "MONO" ? tensaoFaseNeutroV : tensaoLinhaV;
    let quedaTensaoCalc = (kTensao * rho * c.comprimentoMetros * ib * fp) / bitolaEscolhida;
    let quedaPct = (quedaTensaoCalc / vBase) * 100;

    while (quedaPct > quedaMax) {
      const idx = BITOLAS_PADRAO.indexOf(bitolaEscolhida);
      if (idx < BITOLAS_PADRAO.length - 1) {
        bitolaEscolhida = BITOLAS_PADRAO[idx + 1];
        quedaTensaoCalc = (kTensao * rho * c.comprimentoMetros * ib * fp) / bitolaEscolhida;
        quedaPct = (quedaTensaoCalc / vBase) * 100;
      } else {
        break;
      }
    }

    const drDedicado = c.tipoCarga === "EV_WALLBOX" || c.tipoCarga === "CHUVEIRO" || c.tipoCarga === "TOMADA";

    circuitosDimensionados.push({
      id: c.id,
      tag: c.tag,
      descricao: c.descricao,
      tipo: c.tipoCarga === "EV_WALLBOX" ? "EV_CHARGER" : c.tipoCarga === "SOLAR_INVERSOR" ? "SOLAR_INVERSOR" : "CIRCUITO",
      aparato: tipoAparato,
      polos,
      correnteNominalA: disjuntorIn,
      correnteInterrupcaoKa: tipoAparato === "CAIXA_MOLDADA" ? 25 : 10,
      curvaDisjuntor: curva,
      drProtecao: drDedicado,
      sensibilidadeDrMA: drDedicado ? 30 : undefined,
      tensaoV: c.tensaoV,
      potenciaW: c.potenciaW,
      faseAlocada,
      bitolaCaboMm2: bitolaEscolhida,
      quedaTensaoPct: Number(quedaPct.toFixed(2)),
      corFase: faseAlocada.includes("R") ? "#0f172a" : faseAlocada.includes("S") ? "#dc2626" : "#64748b",
    });
  }

  const potenciaInstalada = cargas.reduce((acc, cur) => acc + cur.potenciaW, 0);
  const maxFase = Math.max(potFases.R, potFases.S, potFases.T);
  const minFase = Math.min(potFases.R, potFases.S, potFases.T);
  const mediaFase = (potFases.R + potFases.S + potFases.T) / 3;
  const desbalanceamento = mediaFase > 0 ? Number((((maxFase - minFase) / mediaFase) * 100).toFixed(1)) : 0;

  const correnteGeralA = potenciaInstalada / (Math.sqrt(3) * tensaoLinhaV * 0.95);
  const disjGeralIn = DISJUNTORES_COMERCIAIS.find((d) => d >= correnteGeralA) || 100;
  const tipoGeral: "DIN" | "CAIXA_MOLDADA" = disjGeralIn > 63 ? "CAIXA_MOLDADA" : "DIN";

  let bitolaGeral = 16;
  for (const b of BITOLAS_PADRAO) {
    if ((CAPACIDADE_CORRENTE_B1[b] || 0) >= disjGeralIn) {
      bitolaGeral = b;
      break;
    }
  }

  const materiais: { item: string; quantidade: number; unidade: string; especificacao: string }[] = [];
  materiais.push({
    item: `Quadro QDF/QGBT com Barramento Central Cobre (${tipoGeral === "CAIXA_MOLDADA" ? "Painel Autoportante/Sobrepor" : "Quadro DIN"})`,
    quantidade: 1,
    unidade: "pç",
    especificacao: `Capacidade para Geral ${disjGeralIn}A, 4 Módulos DPS e ${circuitosDimensionados.length} circuitos de saída`,
  });
  materiais.push({
    item: `Disjuntor Geral Tripolar ${disjGeralIn}A ${tipoGeral === "CAIXA_MOLDADA" ? "Caixa Moldada (MCCB 25kA)" : "Curva C DIN 10kA"}`,
    quantidade: 1,
    unidade: "pç",
    especificacao: `Proteção principal de entrada ${tensaoLinhaV}V conforme NBR 5410`,
  });
  materiais.push({
    item: "Dispositivo de Proteção contra Surtos (DPS) Classe II 45kA 275V Plugável",
    quantidade: 4,
    unidade: "pç",
    especificacao: "3 Fases + 1 Neutro coordenados, com sinalizador verde/vermelho e barramento PE curto",
  });
  materiais.push({
    item: "Barramento Central de Cobre Eletrolítico Escalonado (Fases R, S, T)",
    quantidade: 3,
    unidade: "barras",
    especificacao: `Capacidade nominal dimensionada para ${Math.ceil(disjGeralIn * 1.25)}A contínuos`,
  });
  materiais.push({
    item: "Barramento Isolado de Neutro (N) e Barramento de Equipotencialização (PE)",
    quantidade: 2,
    unidade: "barras",
    especificacao: "Bornes para todos os circuitos de distribuição e conexão direta com DPS",
  });

  return {
    nome: nomeQuadro,
    tensaoLinhaV,
    potenciaTotalInstaladaW: potenciaInstalada,
    potenciaTotalDemandadaW: potenciaInstalada,
    potenciaPorFaseW: {
      R: Number(potFases.R.toFixed(0)),
      S: Number(potFases.S.toFixed(0)),
      T: Number(potFases.T.toFixed(0)),
    },
    desbalanceamentoFasesPct: desbalanceamento,
    correnteGeralCalculadaA: Number(correnteGeralA.toFixed(1)),
    disjuntorGeral: {
      correnteNominalA: disjGeralIn,
      tipo: tipoGeral,
      capacidadeInterrupcaoKa: tipoGeral === "CAIXA_MOLDADA" ? 25 : 10,
      polos: 3,
      curva: "C",
      bitolaCaboAlimentacaoMm2: bitolaGeral,
    },
    conjuntoDps: {
      classe: "II",
      correnteKa: 45,
      tensaoUc: 275,
      modulos: 4,
      conectadoPE: true,
    },
    circuitos: circuitosDimensionados,
    resumoMateriais: materiais,
  };
}

/**
 * Cria lista padrão para demonstração inicial de Quadro Geral com Wallbox EV e Cargas NBR 5410
 */
export function criarCargasExemplo(): CircuitoCargaInput[] {
  return [
    {
      id: "ev-01",
      tag: "WALLBOX EV",
      descricao: "Carregador Veicular AC Wallbox 22kW",
      potenciaW: 22000,
      fases: "TRI",
      tensaoV: 380,
      comprimentoMetros: 25,
      tipoCarga: "EV_WALLBOX",
    },
    {
      id: "c-ar1",
      tag: "C1 - AR 01",
      descricao: "Ar Condicionado VRF Sala Principal",
      potenciaW: 4500,
      fases: "BI",
      tensaoV: 380,
      comprimentoMetros: 18,
      tipoCarga: "AR_CONDICIONADO",
    },
    {
      id: "c-ar2",
      tag: "C2 - AR 02",
      descricao: "Ar Condicionado Escritório Engenharia",
      potenciaW: 3500,
      fases: "BI",
      tensaoV: 380,
      comprimentoMetros: 22,
      tipoCarga: "AR_CONDICIONADO",
    },
    {
      id: "c-tom1",
      tag: "C3 - TOMADAS",
      descricao: "Tomadas de Uso Geral (TUG) Oficina",
      potenciaW: 3000,
      fases: "MONO",
      tensaoV: 220,
      comprimentoMetros: 15,
      tipoCarga: "TOMADA",
    },
    {
      id: "c-tom2",
      tag: "C4 - TUG REC",
      descricao: "Tomadas Copa / Recepção",
      potenciaW: 2500,
      fases: "MONO",
      tensaoV: 220,
      comprimentoMetros: 12,
      tipoCarga: "TOMADA",
    },
    {
      id: "c-ilum",
      tag: "C5 - ILUM",
      descricao: "Iluminação LED Geral Galpão e Escritório",
      potenciaW: 1800,
      fases: "MONO",
      tensaoV: 220,
      comprimentoMetros: 30,
      tipoCarga: "ILUMINACAO",
    },
    {
      id: "c-solar",
      tag: "FOTOVOLTAICO",
      descricao: "Inversor Solar On-Grid Trifásico 15kW",
      potenciaW: 15000,
      fases: "TRI",
      tensaoV: 380,
      comprimentoMetros: 10,
      tipoCarga: "SOLAR_INVERSOR",
    },
  ];
}

