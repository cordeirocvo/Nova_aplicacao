/**
 * Motor Gerador de Arquivos AutoCAD DXF (ASCII R12 / AutoCAD 2000)
 * Desenvolvido para Cordeiro Energia
 *
 * Gera arquivos .dxf nativos que abrem perfeitamente em AutoCAD, Revit, LibreCAD, ZWCAD.
 * Suporta camadas (Layers), cores por índice CAD (ACI), linhas, retângulos, círculos e textos.
 */

export interface CadLayer {
  name: string;
  color: number; // AutoCAD Color Index (ACI): 1=Vermelho, 2=Amarelo, 3=Verde, 4=Ciano, 5=Azul, 6=Magenta, 7=Branco/Preto, 8=Cinza
  lineType?: string;
}

export interface CadEntity {
  type: "LINE" | "TEXT" | "CIRCLE" | "RECT" | "POLYLINE";
  layer: string;
  [key: string]: any;
}

export class DxfDocument {
  private layers: CadLayer[] = [];
  private entities: string[] = [];

  constructor() {
    // Camadas padrão de Engenharia Elétrica Cordeiro
    this.addLayer("ELET_QUADRO_CAIXA", 7);     // Branco / Preto
    this.addLayer("ELET_TRILHO_DIN", 8);        // Cinza
    this.addLayer("ELET_DISJUNTORES", 4);       // Ciano
    this.addLayer("ELET_DPS", 1);               // Vermelho
    this.addLayer("ELET_DR", 6);                // Magenta
    this.addLayer("ELET_CABO_FASE", 7);         // Branco / Preto
    this.addLayer("ELET_CABO_NEUTRO", 5);       // Azul Claro
    this.addLayer("ELET_CABO_TERRA", 3);        // Verde
    this.addLayer("ELET_BARRAMENTO", 2);        // Amarelo / Dourado
    this.addLayer("ELET_ETIQUETAS", 2);         // Amarelo
    this.addLayer("ELET_TEXTOS", 7);            // Branco
  }

  addLayer(name: string, color: number, lineType: string = "CONTINUOUS") {
    if (!this.layers.find((l) => l.name === name)) {
      this.layers.push({ name, color, lineType });
    }
  }

  addLine(x1: number, y1: number, x2: number, y2: number, layer: string = "0") {
    this.entities.push(
      `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n30\n0.0\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n31\n0.0`
    );
  }

  addRect(x: number, y: number, width: number, height: number, layer: string = "0") {
    this.addLine(x, y, x + width, y, layer);
    this.addLine(x + width, y, x + width, y + height, layer);
    this.addLine(x + width, y + height, x, y + height, layer);
    this.addLine(x, y + height, x, y, layer);
  }

  addCircle(cx: number, cy: number, radius: number, layer: string = "0") {
    this.entities.push(
      `0\nCIRCLE\n8\n${layer}\n10\n${cx.toFixed(2)}\n20\n${cy.toFixed(2)}\n30\n0.0\n40\n${radius.toFixed(2)}`
    );
  }

  addText(text: string, x: number, y: number, height: number = 3.5, layer: string = "0", rotation: number = 0) {
    this.entities.push(
      `0\nTEXT\n8\n${layer}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n40\n${height.toFixed(2)}\n1\n${text}\n50\n${rotation}`
    );
  }

  toDxfString(): string {
    let out = "";

    // ── SECTION HEADER ───────────────────────────────────────────────────────
    out += "0\nSECTION\n2\nHEADER\n";
    out += "9\n$ACADVER\n1\nAC1009\n"; // DXF R12 / 2000 compatibility
    out += "9\n$INSUNITS\n70\n4\n";     // Millimeters
    out += "0\nENDSEC\n";

    // ── SECTION TABLES (LAYERS) ──────────────────────────────────────────────
    out += "0\nSECTION\n2\nTABLES\n";
    out += "0\nTABLE\n2\nLAYER\n70\n" + this.layers.length + "\n";
    for (const l of this.layers) {
      out += `0\nLAYER\n2\n${l.name}\n70\n0\n62\n${l.color}\n6\n${l.lineType || "CONTINUOUS"}\n`;
    }
    out += "0\nENDTAB\n";
    out += "0\nENDSEC\n";

    // ── SECTION ENTITIES ─────────────────────────────────────────────────────
    out += "0\nSECTION\n2\nENTITIES\n";
    for (const ent of this.entities) {
      out += ent + "\n";
    }
    out += "0\nENDSEC\n";

    // ── END OF FILE ──────────────────────────────────────────────────────────
    out += "0\nEOF\n";

    return out;
  }
}
