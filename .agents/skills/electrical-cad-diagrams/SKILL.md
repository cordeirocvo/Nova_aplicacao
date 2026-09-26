---
name: electrical-cad-diagrams
description: Engenharia eletrotécnica visual, diagramas unifilares NBR 5410, layout físico de quadros de distribuição DIN realistas, exportação nativa para AutoCAD (DXF) e geração de lista de materiais elétricos (BOM).
when_to_use: "Use when creating single-line diagrams (diagramas unifilares), realistic electrical panel layouts (quadros de distribuição com disjuntores DIN, DPS, DR, barramentos e fiação colorida), exporting electrical projects to AutoCAD (.dxf), generating electrical bills of materials (BOM), or sizing electrical protections for EV chargers, solar string boxes, and distribution boards according to NBR 5410."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# Electrical CAD & Panel Diagrams Expert (NBR 5410 / IEC / AutoCAD)

> **Cordeiro Energia Eletrotécnica Especializada**
> Dimensionamento elétrico, representação unifilar, montagem física de quadros DIN e interoperabilidade nativa com AutoCAD (.DXF).

---

## 🎯 Capacidades Principais

1. **Layout Físico Realista de Quadros de Distribuição (QDC / QGBT / Painéis EV):**
   - Estruturação física em trilhos DIN (padrão TH35 / 35mm).
   - Módulos DIN padronizados de 18mm por polo:
     - Disjuntores termomagnéticos (1P = 18mm, 2P = 36mm, 3P = 54mm, 4P = 72mm).
     - Dispositivos DR (Diferencial Residual) de 30mA (2P = 36mm, 4P = 72mm) - Tipos AC, A e B.
     - DPS Classe II (275V/175V, 20kA a 60kA) com bandeirola de status (verde/vermelho).
     - Barramentos tipo pente (fase) com isolação termo retrátil.
     - Barramentos de latão com parafusos para Neutro (azul) e Terra (verde).
     - Fiação com cores normatizadas NBR 5410:
       - **Neutro:** Azul Claro (estritamente obrigatório)
       - **Terra:** Verde ou Verde-Amarelo
       - **Fases:** Preto, Vermelho, Branco ou Cinza (distintos de azul e verde)
     - Etiquetas de identificação amarelas (`GERAL`, `DPS`, `DR`, `C1`, `C2`...).

2. **Diagrama Unifilar Automatizado (ABNT / IEC):**
   - Simbologia padrão para entrada de energia, medidor da concessionária (Cemig ND), disjuntor geral, seccionamento, DPS, barramentos de distribuição e circuitos terminais.
   - Indicação em cada circuito: número do circuito, potência (W ou VA), corrente de projeto $I_b$, corrente nominal do disjuntor $I_n$, bitola dos condutores ($mm^2$) e tipo de eletroduto.

3. **Exportação AutoCAD (.DXF Nativo):**
   - Arquivo ASCII DXF R12 / AutoCAD 2000 compatível com todas as versões de CAD e BIM.
   - Camadas organizadas:
     - `ELET_QUADRO_CAIXA` (cor 7 / branco)
     - `ELET_DISJUNTORES` (cor 4 / ciano)
     - `ELET_DPS_DR` (cor 1 / vermelho)
     - `ELET_CABO_FASE` (cor 7 / preto/branco)
     - `ELET_CABO_NEUTRO` (cor 5 / azul)
     - `ELET_CABO_TERRA` (cor 3 / verde)
     - `ELET_ETIQUETAS_TEXTO` (cor 2 / amarelo)
     - `ELET_TABELA_CARGAS` (cor 7 / branco)

4. **Lista de Materiais Automatizada (BOM):**
   - Quantitativo comercial exato: modelo de quadro Steck/Schneider, disjuntores por amperagem, DRs, DPS, barramentos pente, metros lineares de cabos flexíveis 750V por cor/bitola e terminais tubulares/ilhós.

5. **Aplicações Especiais Cordeiro Energia:**
   - **Quadros para Carregadores de Carros Elétricos (EV):** Proteção dedicada NBR IEC 61851 (DR Tipo A/B contra corrente residual DC > 6mA, DPS dedicado e cabo dimensionado para queda < 2%).
   - **String Boxes e AC Boxes Solares:** Seccionadores DC, fusíveis solares gPV 1000V/1500V, DPS fotovoltaico e disjuntor de injeção AC.

---

## 📐 Diretrizes de Dimensionamento (NBR 5410)

### Critério da Capacidade de Condução de Corrente:
$$I_b \le I_n \le I_z$$
Onde:
- $I_b$ = Corrente de projeto do circuito.
- $I_n$ = Corrente nominal do dispositivo de proteção (disjuntor).
- $I_z$ = Capacidade de condução de corrente dos condutores (tabelas NBR 5410, método de instalação B1/B2, temperatura 30°C e fator de agrupamento).

### Bitolas Mínimas por Tipo de Circuito:
- **Iluminação:** $1,5\text{ mm}^2$ (cobre)
- **Tomadas de Uso Geral (TUG) e Específico (TUE):** $2,5\text{ mm}^2$ (cobre)
- **Carregadores de Carros Elétricos (Wallbox 7.4 kW / 32A mono):** $6,0\text{ mm}^2$ ou $10\text{ mm}^2$ (dependendo da distância)
- **Carregadores de Carros Elétricos (Wallbox 22 kW / 32A trifásico):** $6,0\text{ mm}^2$ ou $10\text{ mm}^2$
