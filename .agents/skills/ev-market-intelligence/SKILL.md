---
name: ev-market-intelligence
description: Methodologies for EV charging station market research, geospatial location scoring (VDM, fleet density, commercial anchor dwell time, electrical feasibility, competitor proximity), and financial/operational forecasting.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# EV Market Intelligence & Location Scoring Skill

> Metodologia e algoritmos para pesquisa de mercado, seleção de pontos e análise de viabilidade locacional para implantação de eletropostos veiculares no Brasil.

---

## 1. Algoritmo Multicritério de Scoring de Ponto (Location Feasibility Index - LFI)

O índice pondera 5 pilares fundamentais para determinar se um local possui viabilidade executiva para receber carregadores de veículos elétricos (0 a 100 pontos):

### Tabela de Pesos do Índice:
| Pilar | Peso | Métrica Principal | Descrição |
| :--- | :---: | :--- | :--- |
| **1. Tráfego & Fluxo Viário (VDM)** | **25%** | Volume Diário Médio (veículos/dia) | Vias com VDM > 25.000 veículos/dia pontuam 100%. Vias secundárias pontuam proporcionalmente. |
| **2. Densidade de Frota VE Local** | **25%** | Emplacamentos ABVE / Denatran | Percentual de veículos BEV/PHEV no município ou raio de 5 km da microrregião. |
| **3. Âncora Comercial & Dwell Time** | **20%** | Tipo de Estabelecimento / Tempo de Permanência | Farmácias 24h, Supermercados, Centros Médicos, Shoppings e Postos com conveniência. |
| **4. Infraestrutura Elétrica Disponível** | **20%** | Padrão CEMIG BT Grupo F vs MT | Padrão BT 127/220V até 800A (dispensa subestação de R$ 120k) pontua 100%. Necessidade de trafo novo penaliza CAPEX. |
| **5. Raio de Concorrência & Exclusividade** | **10%** | Distância para o próximo DC Fast | Raio livre > 3 km sem carregador rápido concorrente pontua 100%. |

---

## 2. Taxa de Conversão de Tráfego em Sessões de Recarga

Para estimar a demanda diária de recarga a partir do VDM e da frota:

$$S_{\text{diárias}} = \text{VDM} \times P_{\text{frota\_ve}} \times T_{\text{captura}} \times F_{\text{âncora}}$$

Onde:
- $\text{VDM}$: Volume Diário Médio da via (ex: 35.000 veículos/dia).
- $P_{\text{frota\_ve}}$: Penetração da frota de veículos elétricos na região (ex: 1.2% a 3.5%).
- $T_{\text{captura}}$: Taxa de atração da via para o estacionamento (tipicamente 1.5% a 3.0%).
- $F_{\text{âncora}}$: Fator de conversão da âncora comercial (ex: 1.4 para farmácia 24h, 1.8 para supermercado, 1.0 para comércio de rua).

---

## 3. Curva de Carga Horária Típica de Recarga (24 Horas)

A distribuição temporal das sessões varia conforme a tipologia do local:
1. **Comercial / Farmácia / Conveniência:** Pico bimodal (11h30 às 14h00 e 17h30 às 20h30).
2. **Residencial / Condomínio:** Pico noturno (19h00 às 06h00).
3. **Frotas Corporativas / Logística:** Recarga noturna em baixa tarifa ou recarga de oportunidade ao meio-dia.
4. **Hub de Rodovia:** Distribuição homogênea das 07h00 às 22h00 com picos nos finais de semana.

---

## 4. Modelagem de 3 Cenários Operacionais

Apresentar sempre 3 cenários para tomada de decisão de investidores:
1. **Conservador:** Baixa taxa de giro (2 a 3 horas de recarga útil por dia por tomada).
2. **Realista (Baseline):** Giro médio de mercado (5 a 6 horas de recarga útil por dia).
3. **Otimista:** Ponto consolidado de alta demanda (8 a 10 horas de recarga útil por dia).
