# ND-5.31 (Cemig D, rev. g, 24/06/2024): proteção de GD e paralelismo em MT

> Fonte: ND-5.31 rev. g (JUN/2024), texto completo. `[Pn]` é a página do PDF.
> As Figuras 16–19 e os Anexos 1/2 (unifilares com as funções por faixa) são imagens. **Antes de fechar o estudo, confira a figura da sua faixa/subestação no PDF original.**

## 0. Escopo
- Conexão em MT de 13,8 a 34,5 kV. Cobre PIE e autoprodutor com injeção (cap. 2) e micro/minigeração no SCEE (cap. 3) [P6].
- Consumidor MT com geração própria **sem injeção** segue a ND-5.3. A proteção do paralelismo permanente sem injeção, porém, é definida na ND-5.31 [P6, P86, P89].
- Rede Cemig: neutro contínuo, multi e solidamente aterrado. Trafos das SEs em Δ-Yg, rede radial [P34, P75].
- Tensões: 13,8 kV (geral), 22 kV (só Juiz de Fora) e 34,5 kV (Noroeste) [P34].

## 1. Faixas de potência e exigências
**Definições** [P12–P13]
- Microgeração: ≤ 75 kW CA.
- Minigeração: > 75 kW e ≤ 5 MW (despacháveis), ou ≤ 3 MW (demais fontes).
- Enquadramento pela **Potência Ativa Instalada Total de Geração (kW)**.
- Proibido dividir a central para caber nos limites [P65].
- No grupo A, a GD fica limitada à demanda contratada em kW [P80].

**Limites de rede**
- Soma injetada por alimentador: 7 MW (13,8 kV), 10 MW (22 kV), 15 MW (34,5 kV) [P40, P77].
- GD (SCEE) com injeção > 2,5 MW: conexão em AT [P77].
- ΔV na perda súbita da geração ≤ 5% [P79].
- Perdas no alimentador ≤ 10% da injeção [P78].

**GD no SCEE (cap. 3)**
| Faixa | Exigências |
|---|---|
| **Faixa 1**: ≤ 300 kW [P87] | Religador na entrada só se o estudo de coordenação indicar. Trafo de acoplamento = trafo da UC, **Δ (MT) – Yg (BT)**, sem aterramento no lado Cemig [P81]. |
| **Faixa 2**: > 300 a ≤ 5000 kW [P95] | **Sem inversor:** religador obrigatório na rede Cemig. **Com inversor:** religador avaliado caso a caso. Relé na SE de entrada, lacrado, com acesso remoto bloqueado [P95, P101]. Exige referência de terra no lado MT (ver adiante). |

- **Relé secundário multifunção** (além de sobrecorrente) exigido em SE nº 2 ou 4 com micro/mini ou paralelismo sem injeção. Exceção: só inversores com soma < 75 kW [P67].
- **Painel de proteção de interface em BT** [P68, P89, P91]:
  - Obrigatório em GD ≤ 300 kW com SE nº 1, 5 ou 8 (exceto micro só com inversor e sem máquina girante).
  - Obrigatório em **qualquer** paralelismo permanente sem injeção.

**Transformador de acoplamento / aterramento (GD > 300 kW)** [P44–46, P81–83]
- (a) MT em **Yg aterrado por reator**, com pelo menos 1 enrolamento BT em Δ; **ou**
- (b) MT em Δ + trafo de aterramento (zig-zag ou Yg-Δ) ligado nos terminais MT, sem seccionamento, na mesma zona de proteção.
- Dimensionamento (Anexo 4, P121): use o **maior** valor entre trafo de acoplamento e geração. Reator em 13,8 kV:

| Potência | Reator | I regime | I 10 s |
|---|---|---|---|
| ≤ 500 kVA | 50,8 Ω | 6,3 A | 126 A |
| 501–1000 kVA | 25,4 Ω | 12,6 A | 251 A |
| 1001–2000 kVA | 12,7 Ω | 25,1 A | 502 A |
| 2001–3000 kVA | 8,5 Ω | 37,7 A | 753 A |
| 3001–4000 kVA | 7,1 Ω | 50,2 A | 1004 A |
| 4001–5000 kVA | 5,7 Ω | 62,8 A | 1255 A |

  - Tabelas de 22 e 34,5 kV e de zig-zag em P122–P127.
- Taps fixos no lado Cemig: mínimo ±2×2,5% [P46, P81].

**Geradores**
- Inversores: NBR 16149, Inmetro e anti-ilhamento NBR IEC 62116 (≤ 2 s); ilhamento proibido [P63, P84].
- Síncronos: FP 0,95 indutivo a 0,95 capacitivo e S ≥ 1,05·P [P59–62].
- Assíncronos: até 500 kW [P62].

## 2. Funções de proteção e ajustes recomendados (Tabela 4 [P99] + Anexo 6 [P152–162])
| ANSI | Ajuste | Tempo |
|---|---|---|
| 25 | ≤ 10°, ΔV ≤ 10%, Δf ≤ 0,3 Hz | — |
| 27 (1) | 0,8 pu | 3,0 s |
| 27 (2) | 0,5 pu (por fase) | 1,0 s |
| 59 (1) | 1,10 pu | 3,0 s |
| 59 (2) | 1,18 pu | 0,5 s |
| 81U (1) | 58,5 Hz (**só conexão sem inversor**) | 20,5 s |
| 81U (2) | 57,4 Hz | 5,5 s |
| 81U (3) | 56,9 Hz | 0,2 s |
| 81O (1) | 62,6 Hz | 10,5 s |
| 81O (2) | 63,1 Hz | 0,2 s |
| 32 consumo | 1,05 × Carga Demandada (rede → acessante) | 15 s |
| 32 injeção | 1,05 × Potência Ativa Instalada de Geração (acessante → rede) | 15 s |
| 32 paralelismo **sem** injeção | 0,05 × capacidade total de geração | 5 s |
| 46, 47, 51V, 21 | caso a caso | — |
| 62 (se usado) | ≥ 180 s para reconexão | — |

- **81R (df/dt):** síncrona com ajuste > 1 Hz/s; inversor com ajuste > 2 Hz/s; ambos com temporização > 100 ms [P100–101].
- **Salto de vetor (78):** proibido para conversores [P100].
- **Dispensas:**
  - 47 e 25 são dispensáveis com GD > 75 kW só por inversores, sem máquina girante.
  - 25 é dispensável em paralelismo sem injeção por inversor [P88–97].
- **SE 2/4:** 2 funções 32 (carga e injeção) + 2 funções 67 (sentidos carga e injeção) [P94, P97].

### 67/67N – Anexo 6
**Sentido acessante (faltas na instalação)** [P157–159]
- In = Carga Demandada (kW) / (√3 · V · 0,92); Ip fase = 1,05 · In.
- Curva **IEC EI ou IEC MI**.
- Instantâneo opcional: ≤ 1,05 · Im, ≤ menor Icc e ≤ ANSI do menor trafo.
- 67N: Ip ≤ Ip fase/3, limitado a 40 A, em **tempo definido de 1 a 3 s**.
- Ip > 10% do primário do TC. Com carga muito pequena, use o mínimo permitido pela resolução do relé.

**Sentido Cemig (faltas na rede)** [P159–160]
- In = Potência Instalada dos Geradores (kW) / (√3 · V · 0,92); Ip = 1,05 · In.
- Curva **IEC EI ou MI**, com o dial mínimo que coordene.
- 67N: ≤ Ip/3, ≤ 40 A, em **tempo definido de 5 a 9 s**.
- **Recomenda-se desativar os instantâneos** (fase e neutro).
- Ângulo característico: não especificado na norma. A prática aprovada no 7SR10 é 45° para fase e −45° para neutro.

## 3. Paralelismo permanente sem injeção
- Abrange diesel, gás, FV zero-export etc. Exige painel de interface + painel interno (Anexo 3) [P68, P89].
- Função 32 = 5% da geração em 5 s.

## 4. TC/TP, nobreak, disjuntor
- TC: Icc máx ≤ 50 × Ip primário; instantâneo ≤ 20 × Ip primário; corrente de partida > 10% do primário [P158–162].
- Nobreak exclusivo, alimentando relé e trip, com janela para ver o LED [P49, P101, P164].
- Relé na tampa basculante de caixa lacrada; cliente só acessa o reset [P164].
- Sem fusível/seccionador monopolar entre o disjuntor de entrada e os geradores [P47].
- Todo disjuntor que fecha paralelismo precisa de 25 ou de intertravamento (exceto UC só com inversores) [P47].

## 5. Documentação para aprovação
- **ART:** projeto nível 2016, atividade 80, item 11.9.4 (micro) ou 11.9.5 (mini) [P71–72].
- **Projeto:**
  - unifilar de geração + carga + proteção;
  - planta de situação e arranjo físico;
  - projeto da SE + **coordenograma**;
  - memorial com **todos** os parâmetros programáveis do relé;
  - catálogo do relé;
  - unifilar de ligação do relé [P66–69, P163].
- Arquivos em PDF, submetidos via AGV após orçamento de conexão e CUSD/CCER; análise em até 30 dias [P69–70].
- Novo projeto completo quando houver:
  - UC nova;
  - adequações do Anexo D da ND-5.3;
  - aumento da transformação interna;
  - troca de relé.
- Basta novo coordenograma em mudança de ajustes ou trafo externo [P67–68].

## 6. Lições do estudo aprovado NS 1154922565 (UFV 1000 kW, 13,8 kV, 7SR1004)
- 67(1) injeção: In = 1000/(1,73·13,8·0,92) = 45,5 A → Ip = 47,7 A (0,48× TC 100/5), IEC EI, dial 0,2, sem instantâneo, Forward, 45°.
- 67N(1): 15,9 A em tempo definido de 5 s, −45°.
- 67(2) consumo: 220 kW → 10,5 A (0,10×), IEC MI, dial 0,3, instantâneo = 1,05 × 334,7 = 351,4 A, Reverse.
- 67N(2): 3,5 A em tempo definido de 1 s. O relé aceita no mínimo 0,05 × In = 5 A.
- 32(1): 1050 kW = 0,44 × Sn em 15 s. 32(2): 231 kW = 0,10 × Sn em 15 s, com Sn = √3 · 13,8 · 100 = 2390 kVA.
- Reator de 25,4 Ω / 12,6 A / 251 A no neutro do trafo de acoplamento de 1000 kVA.
- **Corrija nos próximos estudos** (inconsistências detectadas):
  1. Use a Carga Demandada. Se ela ficar abaixo da resolução, justifique pelo mínimo do relé/TC.
  2. "×1,05", não "×5%".
  3. Dial coerente em todas as tabelas.
  4. ANSI com tempo pela tabela (Z = 6% → 16,6 × In em **4 s**).
  5. Pickups ≥ mínimo do relé e ≥ 10% do TC.
  6. Instantâneo de neutro coerente em todo o documento.
  7. TC 10P20 com Icc/Iprim = 50: demonstre a não saturação pelo ALF efetivo com a carga real. A fórmula está no arquivo 02, §3. Se não fechar, aumente a classe (10P30/10P50) ou a relação.
  8. TP de proteção com potência térmica ≥ carga nominal.
