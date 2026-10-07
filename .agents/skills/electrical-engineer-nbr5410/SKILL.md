---
name: electrical-engineer-nbr5410
description: Especialista em dimensionamento elétrico industrial e comercial de baixa e média tensão com foco rigoroso em recarga de veículos elétricos (EVSE) segundo as normas ABNT NBR 5410, ABNT NBR 17019, IEC 61851 e concessionárias brasileiras (CEMIG ND-5.1 / ND-5.3).
when_to_use: "Use when designing, calculating or validating electrical infrastructure for EV charging stations, sizing entrance power standards (padrão de entrada da concessionária), general switchboards (QGBT), segregated 220V and 380V panels, dry-type step-up transformers, busbars, cable ampacity, voltage drops, conduit filling rates, and surge/residual protection (DPS, DR Tipo B)."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# Electrical Engineer NBR 5410 & NBR 17019 — Cordeiro Energia

Especialista em dimensionamento de infraestrutura eletrotécnica para mobilidade elétrica (EVSE).

## ⚡ Princípios Fundamentais de Dimensionamento

### 1. Regime de Operação Contínuo (NBR 17019)
- Fator de Sobrecarga e Simultaneidade: $F_s = 1.0$ obrigatório para carregadores individuais sem DLM. A recarga veicular é caracterizada como carga contínua prolongada (duração $> 3$ horas ininterruptas).
- A ampacidade dos condutores e a capacidade térmica dos disjuntores devem ser dimensionadas para $100\%$ da corrente de placa:
  $$I_b = \frac{P_{kW} \times 1000}{\sqrt{3} \times V_{FF} \times \cos\phi \times \eta} \quad \text{(trifásico)}$$
  $$I_b = \frac{P_{kW} \times 1000}{V_{FN} \times \cos\phi \times \eta} \quad \text{(monofásico/bifásico)}$$

### 2. Dimensionamento da Cadeia Topológica de Distribuição
A infraestrutura para eletromobilidade é composta por até 4 trechos elétricos contínuos:
1. **Trecho 1 (Padrão de Entrada $\to$ Painel 220V):**
   - Corrente de projeto calculada pela soma vetorial de todas as cargas conectadas (trafo, carregadores, CFTV, tomadas, iluminação e cliente).
   - Taxa de ocupação de eletroduto: máximo 40% para 3 ou mais condutores (NBR 5410 Item 6.2.11.1).
2. **Trecho 2 (Painel 220V $\to$ Transformador Elevador):**
   - Alimentação primária a 220V trifásico Delta ($\Delta$).
   - Corrente nominal do primário $I_1$ somada à necessidade de compensação de perdas do trafo (~2.5%).
   - Disjuntor primário termomagnético tripólar **Curva D** mandatória para absorver o transitório de inrush da magnetização a frio do núcleo de ferro-silício ($8\times$ a $10\times I_{1n}$) sem desarmes indevidos.
3. **Trecho 3 (Transformador Elevador $\to$ Painel 380V):**
   - Alimentação secundária a 380V trifásico Estrela com Neutro acessível aterrado no BEP (Sistema TN-S, NBR 17019 Item 5.1).
   - Condutores: 3 Fases + Neutro (mesma bitola da fase) + Condutor de Proteção PE.
4. **Trecho 4 (Painel 380V $\to$ Cada Carregador Individual $i$):**
   - Distância individual $L_i$ com **margem de segurança no comprimento configurável** (padrão $+10\%$ a $+15\%$).
   - Queda de tensão máxima admissível $\Delta V \le 2.0\%$ do secundário ao carregador (ou $\le 4.0\%$ total desde a entrada).
   - Eletrodutos dimensionados pela área total dos cabos (fases, neutro, PE) aplicando o diâmetro externo real da isolação.

### 3. Regras de Barramento e Disjuntores dos Painéis

#### Painel 220V (Entrada & Auxiliares):
- **Disjuntor Geral:** Dimensionado pela corrente agregada do hub.
- **Barramento de Cobre:** Acompanha a corrente nominal do disjuntor geral ($I_{bus} \ge 1.25 \times I_n$).
- **Circuitos Auxiliares:**
  - Tomada de Manutenção: 127V Monofásico (1P+N 20A Curva C + DR 30mA).
  - CFTV / Telecom: 127V Monofásico (1P+N 16A Curva C + DPS Fino Classe III).
  - Iluminação: Carga em Watts inserida pelo projetista (1P+N 10A Curva B).
  - 3 DPS Classe II (Uc = 275V, In = 20kA, Imax = 40kA).
- **Medição Dedicada do Hub:**
  - Multimedidor digital Modbus RS-485 com TCs dedicados para medir exclusivamente a energia consumida pelo hub (trafo, carregadores, CFTV, tomadas e iluminação), **excluindo expressamente a carga do cliente** para faturamento e rateio limpos.

#### Painel 380V (Potência VE):
- **Regra de Barramento:**
  - **1 Único Carregador:** O painel NÃO necessita de barramento. O disjuntor geral já atua como disjuntor terminal exclusivo do carregador.
  - **2 ou Mais Carregadores:** Exige barramento de cobre dimensionado pelo disjuntor geral mais disjuntores terminais individuais (Curva C 4P com DR Tetrapolar Tipo B 30mA para cada ponto).

### 4. Regras de Supressão Automática (Bypass):
- **Rede Local 380V (F-F 380V):** O Transformador e o Painel 380V são dispensados. O Painel Principal assume as proteções dos carregadores.
- **Carregadores 220V (F-F ou F-N):** O Transformador e o Painel 380V são dispensados. A alimentação é direta a 220V.

### 5. Alerta de Padrão da Concessionária (CEMIG ND-5.1):
- Se a carga simultânea total ultrapassar o limite do padrão contratado/instalado (ex: Cat C6 = 75 kW / 200A), o sistema emite alerta visual e técnico imediato recomendando a categoria superior ou migração para Média Tensão (ND-5.3).
