# Relés secundários: requisitos CEMIG e conversão de parâmetros por marca

> **Princípio:** o estudo é feito **uma vez**, em grandezas neutras (A primário, curva normalizada, TMS IEC, segundos). Depois ele é **traduzido** para o relé escolhido.
> Legenda: ✅ confirmado no manual/tabela do fabricante · ⚠️ veio de resumo de fonte secundária: **confira no manual do firmware antes de emitir o memorial.**

## 1. O que a CEMIG exige do relé (ND-5.3 Anexo A + item 3.3)
| Requisito | Fonte |
|---|---|
| Trifásico, eletrônico, microprocessado, instalado dentro da SE | 9.1.5.3–4 |
| Funções mínimas **50/51 e 50N/51N**; **32** se houver geração | 9.1.5.1 |
| **Resolução máxima de ajuste de fase: 0,1%** | 9.1.5.17 |
| Indicação do evento por fase, com a magnitude da corrente interrompida | 9.1.5.10 |
| Sinalização e memória de eventos garantidas por **fonte reserva de 2 h** | 9.1.5.11 |
| Fonte interna (ou **trip capacitivo** externo) para alimentar o relé e a bobina de abertura até o disjuntor abrir | 9.1.5.7, 9.1.5.16 |
| Bloqueio de alteração de ajuste (lacre, chave interna ou senha) | 9.1.5.12 |
| **Portas de comunicação inativas, sem fios** nos bornes; **sem fios nos bornes de bloqueio** de 50/51 | 3.3.1 b/c |
| Contato auxiliar NA do disjuntor em série com a bobina de trip (antibombeamento) | 9.1.7.2 |
| Memorial com **todos os parâmetros programáveis** e seus valores, catálogo do relé e unifilar de ligação do relé | 9.1.6.15–16, 2.6.5.2.8 |
| Desenhos e memória **não podem** ser os elaborados pelo fabricante do relé | 2.6.5.2.7 |

> [!WARNING]
> **Relés autoalimentados** pelos TCs (ex.: Woodward WIP-1, Fanox SIA-C, Siemens 7SR45) não operam abaixo da corrente mínima de autoalimentação. Confira se eles atendem 9.1.5.10–11 (registro e sinalização por 2 h) e o pickup de neutro. Na dúvida, prefira relé com fonte auxiliar + nobreak + trip capacitivo, que é o padrão aprovado (ex.: o estudo NS 1154922565 com 7SR1004).

**Lista de relés aprovados:** a CEMIG **não publica lista fechada** de relés para consumidor. Vale o atendimento técnico ao Anexo A, comprovado pelo catálogo anexado ao projeto. Modelos usuais em projetos aprovados:
- Pextron URP 1439TU / 6000 / 6100 / URPE 7104;
- Siemens Reyrolle 7SR10 e SIPROTEC 7SJ80;
- SEL-751A / SEL-751;
- Schneider Sepam S20/S40 e Easergy P3U;
- ABB REF615 / REF620.

## 2. Equações de conversão
| Forma nativa | Fórmula | Relés |
|---|---|---|
| A secundário | `Ip_sec = Ip_prim / RTC` | SEL, Siemens 7SJ80/SIPROTEC 5 |
| × In do relé | `Ip_xIn = Ip_prim / (RTC · In_relé)` | Reyrolle 7SR10, ABB REF61x, Easergy P3/P1, Woodward MRI, Fanox |
| × CT (primário do TC) | `Ip_xCT = Ip_prim / Iprim_TC` | GE Multilin 350/750 |
| A primário | `Ip_prim` direto (com a RTC programada) | Sepam (Is), Pextron (exibe o primário depois de programada a RTC ⚠️) |

**Passos:**
1. Converta o pickup.
2. **Arredonde ao passo** do relé.
3. **Recalcule o pickup primário efetivo** e use esse valor no coordenograma.
4. Se ficar fora da faixa → **troque a RTC**. Nunca "force" o ajuste.

## 3. Curvas normalizadas
### IEC 60255-151: `t = TMS · k / ((I/Is)^α − 1)`
| Curva | k | α | SEL | Sepam | Pextron | Woodward | ABB REF615 (código) |
|---|---|---|---|---|---|---|---|
| Normal Inversa (NI/SI) | 0,14 | 0,02 | C1 | SIT | NI | NINV | 9 |
| Muito Inversa (VI) | 13,5 | 1 | C2 | VIT | **"MI"** | VINV | 10 |
| **Extremamente Inversa (EI)** | 80 | 2 | **C3** | **EIT** | **EI** | EINV | 12 |
| Longa (LTI) | 120 | 1 | C4 | LTI | LONG | LINV | 14 |

> [!CAUTION]
> **Armadilha de nomenclatura:** "MI" no **Pextron** (e em muitos estudos brasileiros, inclusive a ND-5.31) significa **Muito Inversa = IEC VI (k = 13,5; α = 1)**. Não é a ANSI *Moderately Inverse*. Sempre escreva no memorial a família e as constantes: "IEC Muito Inversa (VI), k = 13,5, α = 1".

**ND-5.3 (consumidor):** a função 51 de fase é **IEC Extremamente Inversa** (9.1.6.8). Em todas as marcas acima o TMS IEC é o **mesmo número**, exceto Sepam.

### Sepam: o ajuste é `T` (tempo a 10 × Is)
`T = TMS · f(10)`, com f(10) = 2,97 (SIT), 1,50 (VIT), **0,808 (EIT)**, 13,33 (LTI).
Exemplo: EI com TMS 0,10 → T = 0,081 s.

### IEEE C37.112: `t = TD · [A / (M^p − 1) + B]`
| Curva | A | B | p |
|---|---|---|---|
| Moderately Inverse | 0,0515 | 0,1140 | 0,02 |
| Very Inverse | 19,61 | 0,491 | 2 |
| Extremely Inverse | 28,2 | 0,1217 | 2 |

- A escala US/eletromecânica (SEL U1–U5, Siemens 7SJ "ANSI", TD de 0,5 a 15) tem coeficientes ≈ 1/5 dos acima: **TD_US ≈ 5 × TD_IEEE**.
- Converta **pelo tempo no múltiplo crítico M**: `TD_destino = t_estudo(M) / f_destino(M)`.
- GE "ANSI" é polinomial: use casamento de tempo.

## 4. Tabela de parâmetros nativos por relé (51/50/51N/50N)
| Relé | In sec | Pickup 51 | 50 | 51N/50N | Curvas | TMS | Nomes dos parâmetros |
|---|---|---|---|---|---|---|---|
| **Siemens Reyrolle 7SR1003/7SR1004** | 1/5 A | ×In, 0,05–2,5 (4,0) ⚠️ | 0,05–50 ×In, delay 0–14 400 s ⚠️ | ×In, mesmas faixas ⚠️ | DTL, IEC-NI/VI/EI/LTI, ANSI-MI/VI/EI | 0,01–1,6 (até 100) ⚠️ | `51-1 Setting`, `51-1 Char`, `51-1 Time Mult`, `51-1 Delay (DTL)`, `50-1 Setting`, `50-1 Delay`, `51N-1…`, `50N-1…`; direcional: `Gn 67 Char Angle`, `Dir. Control` |
| **SEL-751A / 751** | 1/5 A | A sec, 0,50–16,00 A (5 A), passo 0,01 ✅ | `50P1P` 0,50–100 A ⚠️ | `51G1P`, `50G1P` ⚠️ | U1–U5, C1–C5 | `51P1TD` 0,05–1,00 (C) / 0,50–15 (U) ✅ | `51P1P`, `51P1C`=C3, `51P1TD`, `51P1RS`, `50P1P`, `50P1D`, `51G1P`, `51G1C`, `51G1TD`, `50G1P`, `50G1D`, `27P1P`, `59P1P`, `32…` |
| **Pextron URP 1439TU** | 5 A | A sec × RTC, 0,047–16 ⚠️ | I>>> 1–100 ×RTC ⚠️ | 51N 0,047–6,5; 50N 0,15–100 ⚠️ | NI, MI(=VI), EI, LONG, IT, I²T, DT | dt 0,10–2,00 ⚠️ | `I>` (ip), `Curva`, `dt`, `I>>`, `t>>`, `I>>>` (F e N) |
| **Pextron URP 6000/6100** | 5 A | ×RTC, 0,04–6,5 ⚠️ | verificar | verificar | NI, MI, EI, LI, IT, I²T, FLAT | dt 0,01–3,00 ⚠️ | `I>F ip`, `I>F curva`, `I>F dt`, `V<F`, `V>F` (27/59/86, 4 grupos) |
| **Pextron URPE 7104** | 5 A | primário após RTC ⚠️ | verificar | 50/51N, 51GS | NI, MI, EI, LONG, DT | 0,1–2,0 ⚠️ | igual URP |
| **Schneider Sepam S20/S40** | 1/5 A | **A primário** (×In do TC) ⚠️ | DT 0,1–24 In, T 0,05–300 s ⚠️ | Is0 conforme entrada | DT, SIT, VIT, EIT, LTI, UIT, RI, IEEE | **T a 10×Is** ⚠️ | `Is`, `Curva`, `T`, `Tempo de reset` (SFT2841) |
| **Easergy P3U** | 1/5 A | ×In, 0,05–5 ⚠️ | I>>/I>>> DT ⚠️ | I0> verificar | IEC, IEEE, RI | k 0,025–20 ⚠️ | `I>`, `Delay curve family`, `Delay type`, `k`, `t>` |
| **Siemens 7SJ80** | 1/5 A | A sec, 0,5–20 A (5 A) ⚠️ | 0,5–175 A ⚠️ | análogos | IEC / ANSI | T51 0,05–3,2 (IEC) ⚠️ | `51 PICKUP`, `51 TIME DIAL`, `IEC CURVE`, `50-1 PICKUP`, `50-1 DELAY` |
| **ABB REF615/620** | 1/5 A | ×In, 0,05–5,00 (passo 0,01) ✅ | PHHPTOC 0,10–40 ×In ⚠️ | EFLPTOC/EFHPTOC | código 12 = IEC EI | 0,025–15 ⚠️ | `Start value`, `Time multiplier`, `Operating curve type`, `Operate delay time` |
| **GE Multilin 350** | 1/5 A | ×CT, 0,05–20 ⚠️ | ×CT | idem | IEEE, IEC, IAC, Flex | verificar | `PH TOC PKP`, `CURVE`, `TDM`, `PH IOC1 PKP` |

> Arteche, ZIV, Ingeteam e WEG: sem dados confiáveis. Use o manual do fabricante e preencha a mesma tabela.

## 5. Exemplo de tradução: um único ajuste, cinco relés
Estudo: Ip = 57,4 A primário, IEC EI, TMS 0,10, I50 = 296 A, 51N 19,1 A em tempo definido de 2 s, 50N 98,7 A, **TC 100/5 (RTC 20)**, relé de 5 A.

| Relé | 51 | 50 | 51N | 50N |
|---|---|---|---|---|
| 7SR10 | `51-1 Setting` 0,57 ×In; `Char` IEC-EI; `Time Mult` 0,10 | `50-1 Setting` 2,96 ×In; delay 0 | `51N` 0,19 ×In; DTL 2 s | `50N` 0,99 ×In |
| SEL-751A | `51P1P` 2,87 A; `51P1C` C3; `51P1TD` 0,10 | `50P1P` 14,80 A | `51G1P` 0,96 A ⚠️ (mín. 0,50 ok); DT via `50G2P`/`50G2D` 2 s | `50G1P` 4,94 A |
| Pextron 1439TU | `I>` 2,87 (exibe 57,4 A); `Curva` EI; `dt` 0,10 | `I>>>` 14,8 | `I>N` 0,96, DT 2 s | `I>>>N` 4,94 |
| Sepam | `Is` 57,4 A; `Curva` EIT; **`T` = 0,10 × 0,808 = 0,081 s** | `Is` 296 A, T ≈ 0,05 s (mín.) | `Is0` 19,1 A, DT 2 s | `Is0` 98,7 A |
| REF615 | `Start value` 0,57; curva 12; `Time multiplier` 0,10 | PHHPTOC 2,96 ×In | EFLPTOC 0,19 ×In, DT 2000 ms | EFHPTOC 0,99 ×In |

Depois de arredondar, refaça os pontos do coordenograma com o pickup efetivo, por exemplo 0,57 × 100 = 57 A, e confirme a resolução de 0,1% (9.1.5.17).
