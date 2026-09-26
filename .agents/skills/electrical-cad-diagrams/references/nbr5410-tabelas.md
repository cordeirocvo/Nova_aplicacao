# Tabelas de Referência NBR 5410 — Capacidade de Condução e Queda de Tensão

## 1. Capacidade de Condução de Corrente ($I_z$) para Condutores de Cobre com Isolação PVC 70°C (Método B1 em Eletroduto Embutido / Aparente)

| Bitola Nominal ($mm^2$) | 2 Condutores Carregados (Monofásico/Bifásico) ($A$) | 3 Condutores Carregados (Trifásico) ($A$) | Disjuntor Recomendado Típico ($I_n$) |
|---|---|---|---|
| **1.5** | 17.5 | 15.5 | 10A ou 16A |
| **2.5** | 24.0 | 21.0 | 16A ou 20A |
| **4.0** | 32.0 | 28.0 | 25A ou 32A |
| **6.0** | 41.0 | 36.0 | 32A ou 40A |
| **10.0** | 57.0 | 50.0 | 50A |
| **16.0** | 76.0 | 68.0 | 63A ou 70A |
| **25.0** | 101.0 | 89.0 | 80A ou 90A |
| **35.0** | 125.0 | 110.0 | 100A |
| **50.0** | 151.0 | 134.0 | 125A |

---

## 2. Padrão de Cores para Cabos Elétricos (NBR 5410 item 6.1.5.3)

| Função do Condutor | Cor Obrigatória / Recomendada | Hexadecimal Visual | Layer AutoCAD sugerida |
|---|---|---|---|
| **Neutro (N)** | Azul Claro (exclusivo para neutro) | `#0284c7` | `ELET_CABO_NEUTRO` (Cor 5 - Azul) |
| **Proteção / Terra (PE)** | Verde ou Verde com faixa Amarela | `#16a34a` | `ELET_CABO_TERRA` (Cor 3 - Verde) |
| **Fase 1 (R / L1)** | Preto | `#0f172a` | `ELET_CABO_FASE_R` (Cor 7 - Branco/Preto) |
| **Fase 2 (S / L2)** | Vermelho | `#dc2626` | `ELET_CABO_FASE_S` (Cor 1 - Vermelho) |
| **Fase 3 (T / L3)** | Branco ou Cinza | `#64748b` | `ELET_CABO_FASE_T` (Cor 8 - Cinza) |
| **Retorno de Iluminação** | Amarelo | `#eab308` | `ELET_CABO_RETORNO` (Cor 2 - Amarelo) |

---

## 3. Dispositivos de Proteção para Estações de Recarga Veicular (EV / Wallbox)

Conforme norma internacional IEC 61851-1 e NBR 5410:
- **Proteção contra sobrecorrente:** Disjuntor termomagnético curva C exclusivo para a estação.
- **Proteção diferencial residual:** 
  - DR Tipo B (sensível a correntes residuais senoidais, pulsantes e contínuas puras DC); OU
  - DR Tipo A combinado com dispositivo detector de corrente contínua residual RDC-DD 6mA (presente na maioria dos carregadores modernos).
- **Proteção contra surtos:** DPS Classe II com nível de proteção $U_p \le 2.5\text{ kV}$ instalado a montante do carregador.
- **Limite de queda de tensão:** Máximo de $2\%$ entre o ponto de entrega e a estação de recarga em regime de potência nominal contínua.
