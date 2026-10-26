---
name: ev-market-intelligence
description: Methodologies for EV charging station market research, geospatial location scoring (VDM, fleet density, commercial anchor dwell time, electrical feasibility, competitor proximity), and financial/operational forecasting.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# EV Market Intelligence & Location Scoring Skill

> Metodologia e algoritmos para pesquisa de mercado, seleção de pontos e análise de viabilidade locacional para implantação de eletropostos veiculares no Brasil.

---

## 1. O Modelo Multicritério Definitivo (MCDA / AHP - Analytic Hierarchy Process)

A seleção e pontuação (*score*) de um local para eletroposto baseia-se na metodologia científica AHP acoplada a sistemas de informações geográficas (SIG), calibrando dinamicamente os pesos para os **6 Nichos Reais de Eletromobilidade**:

### Matriz Dinâmica de Pesos por Nicho de Mercado:
| Critério de Análise | 1. Rodoviário (Rápido DC) | 2. Hub Urbano / Bairro (DC 60kW) | 3. Varejo / Shopping (AC/DC) | 4. Frotas Last-Mile (Pátio) | 5. Transporte Pesado (MCS) | 6. Residencial Coletivo (AC+DLM) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Grid Readiness (Infra Elétrica)** | **35%** | **25%** | **20%** | **30%** | **45%** | **15%** |
| **Tráfego & Fluxo da Via (VDM)** | **30%** | **30%** | **15%** | **5%** | **10%** | **5%** |
| **Demanda Alvo & Frota VE** | **15%** | **25%** | **20%** | **45%** | **35%** | **45%** |
| **Dwell Time & Âncora Comercial** | **10%** | **10%** | **35%** | **10%** | **5%** | **25%** |
| **Concorrência & Vácuo de Mercado** | **10%** | **10%** | **10%** | **10%** | **5%** | **10%** |
| **SOMA TOTAL** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** |

---

## 2. A Fórmula Matemática Combinada com Filtros Fatais

$$S_x = \left( \sum_{i=1}^n W_i \times C_{ix} \right) \times \prod_{j=1}^m F_j$$

Onde:
- $W_i$: Peso do macro-critério $i$ ($W_{\text{rede}} = 0.35, W_{\text{tráfego}} = 0.30, W_{\text{dwell}} = 0.20, W_{\text{concorrência}} = 0.15$).
- $C_{ix}$: Nota normalizada de 0 a 100 do local $x$ para o critério $i$.
- $\prod F_j$: Multiplicadores binários de restrição fatal ($F_j \in \{0, 1\}$). Se qualquer fator for zero, a nota final **$S_x = 0$**, abortando o projeto antes de gastar recursos com *site survey*:
  - $F_1$ (Conectividade): Presença de sinal 4G/5G ou Wi-Fi estável no ponto (obrigatório para autorização OCPP e cobrança).
  - $F_2$ (Segurança & Área): Fora de área de preservação ambiental (APP) ou risco hidrológico de inundação.
  - $F_3$ (Acesso Físico): Acesso livre de veículos 24h sem restrições de manobra.
  - $F_4$ (Viabilidade Concessionária): Ausência de veto absoluto ou inviabilidade técnica emitida pela concessionária local.

---

## 3. Detalhamento dos Componentes Analíticos

### A. Viabilidade Técnica e Elétrica (Grid Readiness - 35%)
- **Fator de Demanda Simultânea:** Impacto no padrão de entrada considerando a curva de carga simultânea do imóvel.
- **Distância do Ponto de Entrega:** Metragem de condutores de cobre/alumínio entre o QGBT e os totens. Queda de tensão projetada $\Delta V \le 2.0\%$.
- **Pontuação de Prontidão da Rede:**
  - Padrão CEMIG ND-5.1 Grupo F Baixa Tensão até 800A (dispensa subestação MT de R$ 120k): Nota 100.
  - Média Tensão existente com margem no transformador: Nota 90.
  - Baixa Tensão saturada exigindo aumento de padrão: Nota 60.
  - Necessidade de nova cabine MT particular (obra civil pesada): Nota 30 (ou veto econômico se CAPEX > R$ 150k).

### B. Densidade de Frota e Perfil Demográfico (Traffic & Fleet - 30%)
- **Volume Diário Médio (VDM):** Vias arteriais com tráfego > 25.000 veículos/dia pontuam no teto.
- **Frota Regional:** Emplacamentos de BEV/PHEV registrados no Detran/ABVE na microrregião.
- **Fator de Habitação Vertical:** Regiões com grande densidade de prédios sem tomada nas garagens pontuam com bônus de **+20%** para carregadores rápidos DC públicos.

### C. Dwell Time & Correlação com POIs (20%)
- **Carregamento de Oportunidade (15 a 45 min):** Farmácias 24h, postos com conveniência e fast-food. Requer obrigatoriamente **Fast DC (30 kW a 120 kW)**.
- **Carregamento de Destino (2 a 6 horas):** Shoppings, hotéis, cinemas, supermercados de grande porte. Favorece **Wallboxes AC (7.4 kW a 22 kW)** com menor CAPEX unitário.

### D. Concorrência e Área de Captação (Catchment Area - 15%)
- Cálculo de Haversine para rastrear todas as estações existentes:
  $$D = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
- **Fator de Saturação:** Se o raio de 3 km possui menos de 2 carregadores DC operando com alta ocupação, a nota é máxima (demanda reprimida). Se houver hubs ociosos na mesma quadra, a nota cai drasticamente.
