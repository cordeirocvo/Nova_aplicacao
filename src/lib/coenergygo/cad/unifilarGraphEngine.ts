import { ELECTRICAL_SYMBOLS_NBR5444 } from './electricalSymbolsSvg';

export interface UnifilarCircuitItem {
  id: string;
  circuitNumber: number;
  name: string;
  breakerAmps: number;
  phases: 1 | 2 | 3;
  voltageV: number;
  powerKW: number;
  cableGaugeMM2: number;
  allocatedAmps?: number;
  status?: 'safe' | 'limited' | 'overload';
}

export interface UnifilarDiagramConfig {
  utilityName: string;
  supplyVoltageV: number;
  supplyPhases: 1 | 2 | 3;
  entranceBreakerAmps: number;
  panelName: string;
  panelMainBreakerAmps: number;
  circuits: UnifilarCircuitItem[];
  theme: 'CAD_WHITE' | 'STUDIO_DARK';
  showTrafoSubstation?: boolean;
  trafoKVA?: number;
}

/**
 * Renderizador de Diagrama Unifilar Autêntico NBR 5444 / NBR 5410
 * Reproduz o padrão visual exato de projetos elétricos (Fotos 1 e 2)
 */
export function renderAuthenticNBR5444SVG(config: UnifilarDiagramConfig): string {
  const {
    utilityName = 'Rede Pública de Concessionária',
    supplyVoltageV = 220,
    supplyPhases = 3,
    entranceBreakerAmps = 70,
    panelName = 'Quadro de Distribuição (QGBT)',
    panelMainBreakerAmps = 70,
    circuits,
    theme = 'CAD_WHITE',
    showTrafoSubstation = false,
    trafoKVA = 45
  } = config;

  // Paleta de cores conforme o tema
  const isWhite = theme === 'CAD_WHITE';
  const cLine = isWhite ? '#111827' : '#F8FAFC';
  const cText = isWhite ? '#1F2937' : '#E2E8F0';
  const cTextMuted = isWhite ? '#4B5563' : '#94A3B8';
  const cCondFase = isWhite ? '#0284C7' : '#38BDF8';
  const cCondTerra = isWhite ? '#16A34A' : '#4ADE80';
  const cRede = isWhite ? '#DC2626' : '#F87171';
  const cPanelDash = isWhite ? '#111827' : '#94A3B8';
  const cBus = isWhite ? '#0F172A' : '#E45318'; // Linha forte do barramento
  const cBg = isWhite ? '#FFFFFF' : '#0A192F';

  // Dimensões dinâmicas baseadas na quantidade de circuitos
  const circuitSpacingY = 54;
  const startY = 120;
  const panelHeight = Math.max(340, circuits.length * circuitSpacingY + 80);
  const totalWidth = 920;
  const totalHeight = panelHeight + 160;

  // Coordenadas dos blocos principais (Eixo Horizontal)
  const xRede = 60;
  const xPadraoStart = 60;
  const xBreakerPadrao = 140;
  const xMedidor = 210;
  const xPanelEntrance = 340;
  const xPanelBreaker = 360;
  const xBusbar = 460; // Linha vertical do Barramento Principal (Espinha de peixe)
  const xBranchStart = 460;
  const xBranchBreaker = 510;
  const xBranchConductors = 580;
  const xBranchEnd = 670;
  const xBranchText = 680;

  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="background-color: ${cBg}; font-family: 'Montserrat', Arial, sans-serif;">
      <!-- Estilos e Fontes -->
      <style>
        .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
        .tech-text { font-family: 'Montserrat', Arial, sans-serif; }
      </style>
  `;

  // 1. Linha Vertical da Rede Pública Concessionária (à esquerda)
  svg += `
    <!-- REDE PÚBLICA DE CONCESSIONÁRIA -->
    <line x1="${xRede}" y1="40" x2="${xRede}" y2="${totalHeight - 40}" stroke="${cLine}" stroke-width="2.5" />
    <circle cx="${xRede}" cy="${startY}" r="4" fill="${cRede}" stroke="${cLine}" stroke-width="1.5" />
    
    <!-- Rótulo da Rede Concessionária -->
    <text x="${xRede + 8}" y="${totalHeight - 80}" font-size="11" font-weight="bold" fill="${cText}" class="tech-text">
      Rede Pública
    </text>
    <text x="${xRede + 8}" y="${totalHeight - 65}" font-size="9.5" fill="${cTextMuted}" class="tech-text">
      ${utilityName} (${supplyVoltageV}V)
    </text>
  `;

  // 2. Trecho do Padrão de Entrada (Horizontal da Rede até o Medidor)
  svg += `
    <!-- TRONCO DE ENTRADA -->
    <line x1="${xRede}" y1="${startY}" x2="${xBreakerPadrao}" y2="${startY}" stroke="${cLine}" stroke-width="2" />
    
    <!-- Condutores do Ramal de Entrada (3 Fases + Neutro + Terra NBR 5444) -->
    <g transform="translate(${xPadraoStart + 35}, ${startY - 20})">
      ${ELECTRICAL_SYMBOLS_NBR5444.CONDUTORES_NBR5444({ phases: supplyPhases, hasNeutral: true, hasPE: true }, cCondFase, 1.8)}
    </g>

    <text x="${xBreakerPadrao + 25}" y="${startY - 45}" text-anchor="middle" font-size="12" font-weight="bold" fill="${cText}">
      Padrão de Entrada
    </text>

    <!-- Disjuntor do Padrão de Entrada -->
    <g transform="translate(${xBreakerPadrao}, ${startY - 20})">
      ${ELECTRICAL_SYMBOLS_NBR5444.DISJUNTOR_ARCO(cLine, 2, `${entranceBreakerAmps}A`)}
    </g>

    <!-- Ligação entre Disjuntor e Medidor -->
    <line x1="${xBreakerPadrao + 50}" y1="${startY}" x2="${xMedidor}" y2="${startY}" stroke="${cLine}" stroke-width="2" />

    <!-- Medidor kWh -->
    <g transform="translate(${xMedidor}, ${startY - 20})">
      ${ELECTRICAL_SYMBOLS_NBR5444.MEDIDOR_KWH(cLine, 2)}
    </g>

    <!-- Ligação Medidor até o Quadro -->
    <line x1="${xMedidor + 60}" y1="${startY}" x2="${xPanelEntrance}" y2="${startY}" stroke="${cLine}" stroke-width="2" />

    <!-- Condutores do Alimentador Geral (Entrando no Quadro) -->
    <g transform="translate(${xMedidor + 75}, ${startY - 20})">
      ${ELECTRICAL_SYMBOLS_NBR5444.CONDUTORES_NBR5444({ phases: supplyPhases, hasNeutral: true, hasPE: true }, cCondFase, 1.8)}
    </g>
  `;

  // 3. Envoltória do Quadro de Distribuição (Retângulo Tracejado NBR 5444)
  const panelTop = 60;
  const panelLeft = 320;
  const panelWidth = totalWidth - panelLeft - 30;

  svg += `
    <!-- ENVOLTÓRIA DO QUADRO DE DISTRIBUIÇÃO (TRACEJADO) -->
    <rect 
      x="${panelLeft}" 
      y="${panelTop}" 
      width="${panelWidth}" 
      height="${panelHeight}" 
      fill="none" 
      stroke="${cPanelDash}" 
      stroke-width="2" 
      stroke-dasharray="8 6" 
      rx="16" 
    />
    <text x="${panelLeft + 20}" y="${panelTop + 24}" font-size="12.5" font-weight="bold" fill="${cText}" class="tech-text">
      ${panelName}
    </text>
  `;

  // 4. Disjuntor Geral do Quadro
  svg += `
    <!-- Disjuntor Geral do QGBT -->
    <g transform="translate(${xPanelBreaker}, ${startY - 20})">
      ${ELECTRICAL_SYMBOLS_NBR5444.DISJUNTOR_ARCO(cLine, 2, `${panelMainBreakerAmps}A`)}
    </g>
    <!-- Ligação do Geral até o Barramento Central -->
    <line x1="${xPanelBreaker + 50}" y1="${startY}" x2="${xBusbar}" y2="${startY}" stroke="${cLine}" stroke-width="2" />
  `;

  // 5. Barramento Central Vertical ("Espinha de Peixe" Foto 1)
  const busTop = startY - 15;
  const busBottom = startY + (circuits.length - 1) * circuitSpacingY + 15;

  svg += `
    <!-- BARRAMENTO CENTRAL VERTICAL (BARRAMENTO PENTE / COBRE) -->
    <line x1="${xBusbar}" y1="${busTop}" x2="${xBusbar}" y2="${busBottom}" stroke="${cBus}" stroke-width="4.5" stroke-linecap="round" />
  `;

  // 6. Circuitos Derivados Paralelos (Horizontais)
  circuits.forEach((circ, index) => {
    const curY = startY + (index * circuitSpacingY);

    // Cor semafórica do circuito
    const circuitColor = circ.status === 'overload' 
      ? '#EF4444' 
      : circ.status === 'limited' 
      ? '#E45318' 
      : cLine;

    svg += `
      <!-- CIRCUITO ${circ.circuitNumber} -->
      <!-- Ponto de derivação no barramento -->
      <circle cx="${xBusbar}" cy="${curY}" r="3.5" fill="${cBus}" />

      <!-- Linha horizontal do barramento até o disjuntor do circuito -->
      <line x1="${xBusbar}" y1="${curY}" x2="${xBranchBreaker}" y2="${curY}" stroke="${circuitColor}" stroke-width="2" />

      <!-- Disjuntor Termomagnético do Circuito -->
      <g transform="translate(${xBranchBreaker}, ${curY - 20})">
        ${ELECTRICAL_SYMBOLS_NBR5444.DISJUNTOR_ARCO(circuitColor, 2, `${circ.breakerAmps}A`)}
      </g>

      <!-- Linha do disjuntor até a carga -->
      <line x1="${xBranchBreaker + 50}" y1="${curY}" x2="${xBranchEnd}" y2="${curY}" stroke="${circuitColor}" stroke-width="2" />

      <!-- Seta indicativa de carga na ponta -->
      <polygon points="${xBranchEnd},${curY - 4} ${xBranchEnd + 10},${curY} ${xBranchEnd},${curY + 4}" fill="${circuitColor}" />

      <!-- Indicação de Condutores Fase/Neutro/Terra NBR 5444 -->
      <g transform="translate(${xBranchConductors}, ${curY - 20})">
        ${ELECTRICAL_SYMBOLS_NBR5444.CONDUTORES_NBR5444({ phases: circ.phases, hasNeutral: true, hasPE: true }, cCondFase, 1.8)}
      </g>

      <!-- Descrição Técnica do Circuito à Direita -->
      <text x="${xBranchText}" y="${curY - 4}" font-size="11" font-weight="bold" fill="${cText}" class="tech-text">
        Circuito ${String(circ.circuitNumber).padStart(2, '0')} • ${circ.name}
      </text>
      <text x="${xBranchText}" y="${curY + 11}" font-size="9.5" fill="${cTextMuted}" class="mono">
        ${circ.powerKW.toFixed(1)} kW | ${circ.cableGaugeMM2} mm² | ${circ.voltageV}V (${circ.phases}F)
        ${circ.allocatedAmps ? ` | DLM: ${circ.allocatedAmps.toFixed(1)}A` : ''}
      </text>
    `;
  });

  // 7. Legenda Normativa no Rodapé
  const legY = totalHeight - 35;
  svg += `
    <!-- LEGENDA NORMATIVA NBR 5444 / NBR 5410 -->
    <g transform="translate(60, ${legY})" font-size="10" fill="${cTextMuted}">
      <text x="0" y="0" font-weight="bold" fill="${cText}">Legenda Simbologia NBR 5444:</text>
      
      <!-- Fase -->
      <line x1="180" y1="-10" x2="180" y2="4" stroke="${cCondFase}" stroke-width="1.8" />
      <text x="190" y="0">Fase</text>

      <!-- Neutro -->
      <line x1="230" y1="-10" x2="230" y2="4" stroke="${cCondFase}" stroke-width="1.8" />
      <line x1="230" y1="-10" x2="236" y2="-10" stroke="${cCondFase}" stroke-width="1.8" />
      <text x="242" y="0">Neutro</text>

      <!-- Terra -->
      <line x1="290" y1="-10" x2="290" y2="4" stroke="${cCondTerra}" stroke-width="1.8" />
      <line x1="286" y1="-10" x2="294" y2="-10" stroke="${cCondTerra}" stroke-width="1.8" />
      <text x="300" y="0">Proteção (PE)</text>

      <!-- Disjuntor -->
      <path d="M 390 0 A 8 8 0 0 1 406 0" fill="none" stroke="${cLine}" stroke-width="1.5" />
      <line x1="398" y1="-8" x2="398" y2="-3" stroke="${cLine}" stroke-width="1.5" />
      <text x="414" y="0">Disjuntor Termomagnético</text>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}
