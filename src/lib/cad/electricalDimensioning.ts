import { DxfDocument } from "./dxfGenerator";

export type TipoDispositivo = "GERAL" | "DPS" | "DR" | "CIRCUITO" | "EV_CHARGER" | "SOLAR_INVERSOR";

export interface CircuitoEletrico {
  id: string;
  tag: string;             // Ex: "GERAL", "DPS", "DR", "C1", "C2", "WALLBOX"
  descricao: string;       // Ex: "Disjuntor Geral", "Carregador Carro Elétrico", "Ar Condicionado"
  tipo: TipoDispositivo;
  polos: 1 | 2 | 3 | 4;   // 1P, 2P, 3P, 4P (cada polo = 18mm no trilho DIN)
  correnteNominalA: number; // Ex: 10, 16, 20, 25, 32, 40, 50, 63
  curvaDisjuntor?: "B" | "C" | "D";
  drProtecao?: boolean;   // Se este circuito passa por um DR
  sensibilidadeDrMA?: number; // 30mA
  dpsClasse?: "II";
  dpsKa?: number;         // 20kA, 40kA, 45kA
  tensaoV: 127 | 220 | 380;
  potenciaW?: number;
  bitolaCaboMm2: number;  // 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0
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
