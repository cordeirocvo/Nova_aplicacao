# Modelo de memorial: entrada de energia em MT, SE nº 4 (blindada) — CEMIG

> Preencha os campos `{…}`. Os valores de cálculo saem do roteiro do `02-anexo-a-protecao.md`.
> Estrutura: **(I) Memorial descritivo**, **(II) Memória de cálculo da proteção**, **(III) Tabela de parametrização do relé**, **(IV) Coordenograma**.

---

## I. MEMORIAL DESCRITIVO

### 1. Identificação
- Proprietário: {nome} · CPF/CNPJ {…} · Tel. {…}
- Empreendimento / finalidade: {…} · Endereço: {…} · Coordenadas: {…}
- RT: {Eng. Eletricista} · CREA {…} · ART nº {…} de {data}
- Carga instalada: {kW} · **Demanda da instalação: {kVA}** · **Demanda contratada: {kW}**

### 2. Normas
- CEMIG ND-5.3 (SET/2023) — Fornecimento em MT, rede aérea ou subterrânea.
- CEMIG ND-5.31 (JUN/2024) — se houver geração própria com injeção ou paralelismo.
- ABNT NBR 14039, NBR 5410, NBR 5419, NBR 15751, NBR IEC 62271-200, NBR 6855, NBR 6856.
- REN ANEEL 1000/2021.

### 3. Características do fornecimento
- Tensão nominal {13,8} kV, trifásico, 60 Hz; fornecimento pela rede {aérea/subterrânea}.
- Ponto de conexão: {derivação da rede Cemig / 1ª estrutura na propriedade / caixa de inspeção} (ND-5.3 item 2.2).
- Ramal de entrada: cabo de cobre unipolar {3×1×__ mm²} XLPE/EPR 90 °C, 8,7/15 kV (Tabela 12b: {__} kVA ≥ demanda ✓), com blindagem aterrada nas duas extremidades e neutro de cobre nu 70 mm², em eletroduto de 100 mm (aço no poste, {PVC/aço} no trecho enterrado).

### 4. Subestação: tipo nº 4 (blindada metálica)
- Fabricante/modelo: {…}, **listado no PEC-11** para aplicação {individual, uso externo/interno}.
- Ensaios de tipo NBR IEC 62271-200; arco interno **IAC {AFL} {16} kA / 1 s** (≥ 12,5 kA e ≥ Icc do ponto).
- Dados nominais: Ur {17,5/24} kV, Ir {400} A, Ik {16} kA/1 s, NBI {95} kV.
- Composição, na sequência do DESENHO 10:
  1. **Compartimento de medição (exclusivo Cemig):** 3 TP + 3 TC de medição (fornecidos pela Cemig), medidor em compartimento tipo CM-4 {ou CM-4 a ≤ 2 m}, com ≥ 2 pontos de lacre.
  2. **Compartimento de proteção:**
     - chave seccionadora tripolar com abertura sob carga {ou intertravada};
     - 3 TP de proteção {13800/√3 – 115/√3 V}, 0,6P75, 400 VA térmica;
     - 3 TC de proteção {100-5 A}, 10P20, 12,5 VA;
     - disjuntor a {vácuo}, 17,5 kV, {630} A, {16} kA, bobina de abertura {115} V, contato NA em série.
  3. Painel do relé e nobreak: caixa metálica lacrável, relé na tampa basculante, visor do LED do nobreak e ventilação.
- Instalação {externa}: base de concreto, barreira física de 2,0 m a ≥ 700 mm (e ≥ 700 mm além das portas a 90°), nada acima do cubículo (exaustão do arco), porta metálica de 1,20 × 2,10 m abrindo para fora com placa "PERIGO DE MORTE – MÉDIA TENSÃO", extintor pó ABC 6 kg.
- Instalação {interna}: sala de alvenaria com pé-direito ≥ 3 m, distâncias do ensaio IAC, 700 mm livres além das portas, canaleta com tampa lacrável, iluminação de emergência de 2 h, luvas isolantes e tapete.
- Não há no cubículo nenhum equipamento estranho à medição e à proteção geral (para-raios ficam no poste da derivação).

### 5. Transformação (após a SE de entrada)
| Trafo | kVA | Tensões | Ligação | Z% | Isolação | Proteção individual |
|---|---|---|---|---|---|---|
| TR-1 | {…} | 13,8 kV / {380/220} V | Dyn1 | {…} | {óleo/seco} | {chave tripolar sob carga + fusível {__} A (Tab. 16)} |

### 6. Aterramento
- Malha com {12} hastes (≥ 500 kVA: 12; 150–500 kVA: 9; ≤ 150 kVA: 4), espaçamento ≥ comprimento da haste, cobre nu {50} mm², solda exotérmica, cavas de inspeção.
- **Resistência prevista: ≤ {10} Ω.**
- Interligados à malha: neutro da rede, neutro do trafo, partes metálicas do cubículo, barreira e ferragens.

### 7. Alimentação auxiliar da proteção
- Nobreak senoidal de {1000} VA (≥ 600 VA), autonomia ≥ 2 h com 30 VA, saída 115 V, com comutação automática TP ↔ nobreak (contator) {ou by-pass automático}.
- Trip capacitivo dedicado à bobina de abertura, com teste individual.
- Proteção do secundário do TP por disjuntor termomagnético (sem fusível).

### 8. Notas obrigatórias
Inserir as 4 notas do `05-checklist-aprovacao.md` §D.

---

## II. MEMÓRIA DE CÁLCULO DA PROTEÇÃO (ND-5.3 Anexo A)

| # | Grandeza | Fórmula | Valor |
|---|---|---|---|
| 1 | Corrente nominal | In = {W} / (1,73 · {V} · 0,92) | {__} A |
| 2 | Partida de fase (51) | Ip = 1,05 · In | {__} A |
| 3 | Partida de neutro (51N) | Ipn = Ip/3 (≤ 40 A) | {__} A |
| 4 | In de cada trafo | kVA / (1,73 · V) | {__} A |
| 5 | Inrush | Im = 8·In(maior) + Σ In(demais), 0,1 s | {__} A |
| 6 | Instantâneo de fase (50) | Im < I50 ≤ 1,05·Im | {__} A |
| 7 | Instantâneo de neutro (50N) | I50/3 | {__} A |
| 8 | ANSI do menor trafo | (100/Z%)·In_trafo @ t (Tab. 9.1.3.4) | {__} A @ {__} s |
| 9 | ANSI de neutro | 0,58 · I_ANSI | {__} A @ {__} s |
| 10 | Icc na derivação (Cemig) | trifásico / fase-terra | {__} A / {__} A |
| 11 | TC de proteção | ≥ Icc/50; ≥ I50/20; Ip > 10%·Iprim | **{__}-5 A**, 10P20 12,5 VA |
| 12 | Curva 51 | IEC Extremamente Inversa, t = TMS·80/(M²−1) | TMS = {__} |
| 13 | Verificação t51(Im) | > 0,1 s | {__} s ✓ |
| 14 | Verificação t51(I_ANSI) | < t_ANSI | {__} s ✓ |
| 15 | 51N | tempo definido (1–3 s) | {2} s |
| 16 | Verificações de I50 | < Icc mín. e < I_ANSI | ✓ |

Justificativa das premissas (9.1.6.1): {cargas, partidas de motores, regime}.

---

## III. TABELA DE PARAMETRIZAÇÃO DO RELÉ ({fabricante/modelo}, In {5} A, RTC {20})
> Liste **todos** os parâmetros programáveis, inclusive os desabilitados (9.1.6.15). Use os nomes nativos de `04-reles-parametros.md`.

| Parâmetro nativo | Função | Ajuste | Equivalente primário | Faixa do relé |
|---|---|---|---|---|
| {51-1 Setting} | 51 fase, pickup | {0,57 ×In} | {57 A} | {0,05–2,5 ×In} |
| {51-1 Char} | curva | {IEC-EI} | — | — |
| {51-1 Time Mult} | dial | {0,10} | — | {0,01–1,6} |
| {50-1 Setting} / {Delay} | 50 fase | {2,96 ×In} / {0 s} | {296 A} | … |
| {51N-1 Setting} / {DTL} | 51N | {0,19 ×In} / {2 s} | {19 A} | … |
| {50N-1 Setting} | 50N | {0,99 ×In} | {99 A} | … |
| {Comunicação} | portas remotas | **Desabilitadas** | — | — |
| {Senha} | bloqueio de alteração | **Habilitado** | — | — |

---

## IV. COORDENOGRAMA
Gráfico log-log (tempo 0,01–1000 s × corrente 1–10 000 A, referida a {13,8} kV) com legenda, contendo:
- In, Ip e Ipn;
- curva 51 e 51N em tempo definido;
- 50 e 50N;
- Icc trifásico e fase-terra;
- ANSI de fase e de neutro de cada trafo;
- Im @ 0,1 s;
- partidas de motores relevantes;
- fusíveis individuais dos trafos.

Anexar também o **unifilar de ligação do relé**: TC, TP, disjuntor do TP, comutador, nobreak, trip capacitivo, bobina e contato NA.
