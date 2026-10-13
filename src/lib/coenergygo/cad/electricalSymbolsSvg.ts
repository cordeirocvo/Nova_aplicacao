/**
 * Dicionário Vetorial de Símbolos Elétricos Autênticos NBR 5444 / NBR 5410 / IEC 60617
 * Desenvolvido para atender aos esquemáticos unifilares clássicos de engenharia elétrica
 */

export interface ConductorSymbolsConfig {
  phases: 1 | 2 | 3;
  hasNeutral?: boolean;
  hasPE?: boolean;
}

export const ELECTRICAL_SYMBOLS_NBR5444 = {
  /**
   * Disjuntor Termomagnético Clássico NBR 5444 (Arco com traço ortogonal central)
   */
  DISJUNTOR_ARCO: (color = 'currentColor', strokeWidth = 2, ampsLabel?: string) => `
    <g class="symbol-disjuntor">
      <!-- Linha antes do arco -->
      <line x1="0" y1="20" x2="10" y2="20" stroke="${color}" stroke-width="${strokeWidth}" />
      <!-- Terminais / Círculos de conexão -->
      <circle cx="10" cy="20" r="2.5" fill="${color}" />
      <circle cx="40" cy="20" r="2.5" fill="${color}" />
      <!-- Arco clássico do disjuntor -->
      <path d="M 10 20 A 15 15 0 0 1 40 20" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      <!-- Traço ortogonal central (disparo térmico/magnético) -->
      <line x1="25" y1="5" x2="25" y2="15" stroke="${color}" stroke-width="${strokeWidth * 0.9}" />
      <!-- Linha após o arco -->
      <line x1="40" y1="20" x2="50" y2="20" stroke="${color}" stroke-width="${strokeWidth}" />
      ${ampsLabel ? `
        <text x="25" y="-2" text-anchor="middle" font-family="'JetBrains Mono', Montserrat, monospace" font-size="11" font-weight="bold" fill="${color}">
          ${ampsLabel}
        </text>
      ` : ''}
    </g>
  `,

  /**
   * Disjuntor Vertical (para barramentos horizontais como na Foto 2)
   */
  DISJUNTOR_ARCO_VERTICAL: (color = 'currentColor', strokeWidth = 2, ampsLabel?: string) => `
    <g class="symbol-disjuntor-vert">
      <line x1="20" y1="0" x2="20" y2="10" stroke="${color}" stroke-width="${strokeWidth}" />
      <circle cx="20" cy="10" r="2.5" fill="${color}" />
      <circle cx="20" cy="40" r="2.5" fill="${color}" />
      <path d="M 20 10 A 15 15 0 0 1 20 40" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      <line x1="35" y1="25" x2="25" y2="25" stroke="${color}" stroke-width="${strokeWidth * 0.9}" />
      <line x1="20" y1="40" x2="20" y2="50" stroke="${color}" stroke-width="${strokeWidth}" />
      ${ampsLabel ? `
        <text x="44" y="28" text-anchor="start" font-family="'JetBrains Mono', Montserrat, monospace" font-size="10" font-weight="bold" fill="${color}">
          ${ampsLabel}
        </text>
      ` : ''}
    </g>
  `,

  /**
   * Medidor de Energia Ativa kWh (Caixa retangular padronizada NBR 5444)
   */
  MEDIDOR_KWH: (color = 'currentColor', strokeWidth = 2) => `
    <g class="symbol-medidor">
      <line x1="0" y1="20" x2="10" y2="20" stroke="${color}" stroke-width="${strokeWidth}" />
      <rect x="10" y="5" width="40" height="30" fill="none" stroke="${color}" stroke-width="${strokeWidth}" rx="2" />
      <text x="30" y="24" text-anchor="middle" font-family="'JetBrains Mono', Montserrat, monospace" font-size="11" font-weight="bold" fill="${color}">
        kWh
      </text>
      <line x1="50" y1="20" x2="60" y2="20" stroke="${color}" stroke-width="${strokeWidth}" />
    </g>
  `,

  /**
   * Simbologia de Condutores Cruzando a Linha (Fase, Neutro, Terra NBR 5444)
   */
  CONDUTORES_NBR5444: (config: ConductorSymbolsConfig, color = '#0284C7', strokeWidth = 1.8) => {
    const { phases, hasNeutral = true, hasPE = true } = config;
    let svg = `<g class="symbol-conductors">`;
    let curX = 0;
    const spacing = 7;

    // 1. Fases: traços verticais retos completos cruzando a linha (+/- 10px)
    for (let i = 0; i < phases; i++) {
      svg += `<line x1="${curX}" y1="8" x2="${curX}" y2="32" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
      curX += spacing;
    }

    // 2. Neutro: traço com dobra em L superior
    if (hasNeutral) {
      svg += `
        <line x1="${curX}" y1="8" x2="${curX}" y2="32" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" />
        <line x1="${curX}" y1="8" x2="${curX + 6}" y2="8" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      `;
      curX += spacing + 2;
    }

    // 3. Terra (PE): traço com "T" superior (ou traço com traço perpendicular em cima)
    if (hasPE) {
      svg += `
        <line x1="${curX}" y1="8" x2="${curX}" y2="32" stroke="#16A34A" stroke-width="${strokeWidth}" stroke-linecap="round" />
        <line x1="${curX - 4}" y1="8" x2="${curX + 4}" y2="8" stroke="#16A34A" stroke-width="${strokeWidth}" stroke-linecap="round" />
      `;
    }

    svg += `</g>`;
    return svg;
  },

  /**
   * Chave Seccionadora Unifilar (ANSI 89)
   */
  CHAVE_SECCIONADORA_89: (color = 'currentColor', strokeWidth = 2, label = '89') => `
    <g class="symbol-chave-89">
      <line x1="20" y1="0" x2="20" y2="12" stroke="${color}" stroke-width="${strokeWidth}" />
      <circle cx="20" cy="12" r="2.5" fill="${color}" />
      <circle cx="20" cy="40" r="2.5" fill="${color}" />
      <!-- Lâmina da seccionadora aberta/fechada -->
      <line x1="20" y1="40" x2="32" y2="14" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <line x1="20" y1="40" x2="20" y2="52" stroke="${color}" stroke-width="${strokeWidth}" />
      <text x="40" y="28" font-family="'JetBrains Mono', Montserrat, monospace" font-size="10" font-weight="bold" fill="${color}">
        ${label}
      </text>
    </g>
  `,

  /**
   * Transformador de Potência com indicação Delta-Estrela aterrado Dyn1 (Foto 2)
   */
  TRAFO_SUBESTACAO: (color = 'currentColor', strokeWidth = 2, specLabel = '1000kVA') => `
    <g class="symbol-trafo-subestacao">
      <!-- Enrolamento Primário (Delta) -->
      <path d="M 10 18 Q 20 6 30 18 Q 40 6 50 18 Q 60 6 70 18" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      <!-- Enrolamento Secundário (Estrela) -->
      <path d="M 10 32 Q 20 44 30 32 Q 40 44 50 32 Q 60 44 70 32" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      
      <!-- Símbolo Delta à esquerda -->
      <text x="-12" y="16" font-family="'JetBrains Mono', Montserrat, monospace" font-size="12" font-weight="bold" fill="${color}">Δ</text>
      
      <!-- Símbolo Estrela Aterrado à esquerda -->
      <text x="-14" y="36" font-family="'JetBrains Mono', Montserrat, monospace" font-size="12" font-weight="bold" fill="${color}">Y</text>
      <line x1="-8" y1="38" x2="-4" y2="38" stroke="${color}" stroke-width="1.5" />
      <line x1="-7" y1="40" x2="-5" y2="40" stroke="${color}" stroke-width="1.2" />
      
      <!-- Linhas de entrada e saída -->
      <line x1="40" y1="0" x2="40" y2="12" stroke="${color}" stroke-width="${strokeWidth}" />
      <line x1="40" y1="38" x2="40" y2="50" stroke="${color}" stroke-width="${strokeWidth}" />

      <!-- Informações nominais -->
      <text x="82" y="20" font-family="'JetBrains Mono', Montserrat, monospace" font-size="9.5" font-weight="bold" fill="${color}">
        ${specLabel}
      </text>
      <text x="82" y="32" font-family="'JetBrains Mono', Montserrat, monospace" font-size="8.5" fill="${color}">
        13.8kV - 220/127V
      </text>
    </g>
  `,

  /**
   * DPS Classe II Unifilar
   */
  DPS_CLASSE2: (color = 'currentColor', strokeWidth = 1.8) => `
    <g class="symbol-dps">
      <rect x="0" y="0" width="22" height="32" fill="none" stroke="${color}" stroke-width="${strokeWidth}" rx="2" />
      <path d="M 0 0 L 22 32" stroke="${color}" stroke-width="${strokeWidth * 0.75}" />
      <line x1="11" y1="-8" x2="11" y2="0" stroke="${color}" stroke-width="${strokeWidth}" />
      <line x1="11" y1="32" x2="11" y2="40" stroke="${color}" stroke-width="${strokeWidth}" />
      <!-- Terra -->
      <line x1="5" y1="40" x2="17" y2="40" stroke="${color}" stroke-width="2" />
      <line x1="7" y1="43" x2="15" y2="43" stroke="${color}" stroke-width="1.5" />
      <line x1="9" y1="46" x2="13" y2="46" stroke="${color}" stroke-width="1" />
    </g>
  `
};
