# Estudo de proteção secundária — metodologia CEMIG (ND-5.3 Anexo A) passo a passo

> Simples e auditável: cada número sai de uma fórmula da norma e tem a fonte citada.
> Correntes **referidas ao primário (MT)** em todo o estudo (9.1.10.5).

## Dados de entrada (pedir antes de começar)
| Dado | Origem |
|---|---|
| Tensão de fornecimento V (13,8 / 22 / 34,5 kV) | Cemig |
| **Demanda contratada W (kW)**, igual à demanda do projeto | Projeto (2.12.3) |
| Transformadores: kVA, Z%, tipo (óleo/seco), ligação | Projeto / placa |
| **Icc trifásico e fase-terra (máx. e mín.) na derivação** + proteção da derivação (elo/religador) | **Cemig fornece** após o pedido (9.1.4.1, 9.1.6.5) |
| Motores > 50 cv / cargas > 25 kW com partida | Projeto (9.1.6.17) |
| Geração própria (kW, tipo, com ou sem injeção) | Projeto → ND-5.31 |
| Relé escolhido (modelo, In 1/5 A, faixas, passos) | Catálogo |

## Passo 1: corrente nominal e de partida (9.1.1)
- In = W / (√3 · V · 0,92). A norma usa 1,73 no lugar de √3; use 1,73 para bater com a Cemig.
- **Ip fase (51) = 1,05 · In**, porque se admite ultrapassagem de 5%.
- **Ip neutro (51N) = Ip / 3, limitado a 40 A.** O exemplo da norma usa 33%.

## Passo 2: corrente de magnetização (inrush) (9.1.2)
- In_trafo = kVA / (√3 · V).
- **Im = 8 · In_trafo, com duração de 0,1 s** (óleo ou seco ≤ 2000 kVA). Acima de 2000 kVA, usar dado do fabricante. Para trafo seco, o dado do fabricante é opcional.
- **Vários trafos:** Im = 8 · In(maior) + Σ In(demais).
- A proteção **não pode atuar** na energização.

## Passo 3: ponto ANSI (9.1.3)
- I_ANSI = (100 / Z%) · In_trafo. I_ANSI neutro = 0,58 · I_ANSI (trafo Δ-Y aterrado).
- Tempo máximo pela Tabela 9.1.3.4:

| Z% | I_ANSI | t máx. |
|---|---|---|
| ≤ 4 | 25 × In | 2 s |
| ≤ 5 | 20 × In | 3 s |
| ≤ 6 | 16,6 × In | 4 s |
| ≤ 7 | 14,3 × In | 5 s |

- A curva do relé (fase **e** neutro) deve ficar **abaixo do ANSI do MENOR trafo**. Trafo pequeno demais para o relé proteger → proteção individual dedicada (chave fusível, Tabelas 16–18).

## Passo 4: TC de proteção (9.1.4.2 + 4.4.11)
Escolha a menor RTC padronizada (5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400… /5 A) que satisfaça **todas** as condições:
1. **I_prim ≥ Icc_máx / 50** (no máximo 50 × I_prim).
2. **I_prim ≥ I50 / 20** (instantâneo ≤ 20 × I_prim).
3. **Ip > 0,10 · I_prim** (pickup acima de 10% do primário, por exatidão).
4. Pickups (fase e neutro) dentro da faixa mínima do relé.

- Classe mínima **10P20, 12,5 VA** (NBR 6856).
- **Verificação de saturação com a carga real:** `ALF_ef = ALF · (S_n + S_int) / (S_real + S_int)`, com
  - S_real = (R_cabo ida e volta + R_relé) · Isn², e
  - S_int ≈ R_ct · Isn².
- Exija **ALF_ef ≥ Icc_máx / I_prim**. Se não fechar, suba a classe (10P30/10P50) ou a relação. Na falta de dados, declare S_real ≤ 2,5 VA e cite que ALF_ef ≥ 50.
- Demanda escalonada: TC de relação múltipla ou programação de troca (2.6.5.2.6).

## Passo 5: ajustes (9.1.6)
| Função | Critério ND-5.3 | Item |
|---|---|---|
| **51 fase** | Pickup = Ip (1,05·In); curva **IEC Extremamente Inversa**; **dial mínimo** que (a) não atue em Im/0,1 s, (b) passe abaixo do ANSI do menor trafo e (c) coordene com a derivação da Cemig | 9.1.6.2, 9.1.6.8–9 |
| **50 fase** | **Menor valor que não atue no inrush: entre Im e 1,05·Im.** O exemplo da norma usa 1,01·Im. Também precisa ficar abaixo do **menor Icc** e do **ANSI do menor trafo** | 9.1.6.10 |
| **51N** | **Tempo definido de 1 a 3 s**, pickup Ip/3 (≤ 40 A) | 9.1.6.11 |
| **50N** | 1/3 do ajuste do 50 de fase | 9.1.6.12 |
| **32** (com geração) | ≤ 5% da potência de geração, por até 15 s (ver ND-5.31 para GD) | 9.1.6.13 |

**Escolha do dial (IEC EI: `t = TMS · 80 / (M² − 1)`, com M = I/Ip):**
- Mínimo: `TMS_min = 0,1 s · (M_Im² − 1) / 80`, com M_Im = Im/Ip. Some uma margem; use t(Im) ≥ 0,15 s se o 50 estiver colado em Im.
- Máximo: `TMS_max = t_ANSI · (M_ANSI² − 1) / 80`, com M_ANSI = I_ANSI_menor / Ip.
- Adote **o menor passo do relé ≥ TMS_min com folga** e confira se ele é ≤ TMS_max. A Cemig pode pedir outro para coordenar com o religador/elo da derivação (9.1.6.19).
- **Proibido** aumentar ajustes para coordenar com proteções internas (9.1.6.3).

## Passo 6: coordenograma (9.1.10)
Gráfico **log-log tempo × corrente** (0,01–1000 s × 1–10 000 A), com legenda. Deve conter:
1. Icc trifásico e fase-terra na derivação (linhas verticais).
2. In (vertical).
3. Ip fase e Ip neutro.
4. Curva 51 com os ajustes (fase) + 51N em tempo definido (horizontal até o 50N).
5. Instantâneos 50 e 50N (verticais).
6. **Ponto ANSI** fase e neutro de cada trafo (pontos com o tempo da tabela).
7. **Ponto de inrush Im @ 0,1 s** (deve ficar **abaixo/à esquerda** da curva do relé).
8. Partidas de motores e cargas > 25 kW (corrente × tempo de aceleração).
9. Proteções individuais dos trafos (fusíveis, Tabelas 16–18), se houver (4.4.12).

Demanda escalonada → um coordenograma por etapa (9.1.6.4.1).

## Passo 7: verificações finais (checklist numérico)
- [ ] Ip ≥ 1,05·In e Ip > 10% de I_prim do TC.
- [ ] Ip neutro ≤ Ip/3 e ≤ 40 A; 51N em tempo definido de 1 a 3 s.
- [ ] Im < I50 ≤ 1,05·Im.
- [ ] I50 < Icc mín. e I50 < I_ANSI do menor trafo.
- [ ] t51(Im) > 0,1 s.
- [ ] t51(I_ANSI) < t_ANSI e t51N < t_ANSI neutro (fase e neutro).
- [ ] Icc_máx ≤ 50 × I_prim; I50 ≤ 20 × I_prim; ALF_ef suficiente.
- [ ] Pickups e dial dentro das faixas e dos passos do relé (pickup efetivo recalculado).
- [ ] Tabela com **todos** os parâmetros programáveis do relé (inclusive os desabilitados).

## Exemplo 1: o próprio da ND-5.3 (9.1.11), conferido numericamente
13,8 kV, demanda 1200 kW, trafos a óleo de 750 + 500 + 500 kVA (Z 5%), Icc 2000 A.

| Grandeza | Cálculo | Valor |
|---|---|---|
| In | 1200 / (1,73 · 13,8 · 0,92) | **54,64 A** |
| Ip fase | 1,05 · 54,64 | **57,37 A** |
| Ip neutro | 33% · 57,37 | **18,93 A** (DT 2 s) |
| In trafos | 750 → 31,42 A; 500 → 20,94 A | |
| Im | 8 · 31,42 + 20,94 + 20,94 | **293,24 A @ 0,1 s** |
| I50 fase | 1,01 · Im | **296,17 A** |
| I50 neutro | 33% · I50 | **97,74 A** |
| ANSI 500 kVA (menor) | 20 · 20,94 | **418,8 A @ 3 s**; neutro 242,9 A |
| TC | Icc/50 = 40 A; I50/20 = 14,8 A; Ip/0,1 = 573 A | **100/5** |
| Faixa de dial EI | TMS_min 0,031 · TMS_max 1,96 | Adotar ≈ 0,05–0,10 |

## Exemplo 2: parcela "consumo" do estudo aprovado NS 1154922565 (UFV Manga Grande)
13,8 kV; carga de consumo considerada 220 kW; trafo de acoplamento de 1000 kVA, Z 6%; Icc < 5000 A; **TC 100/5**; relé 7SR1004.
- In = 220 / (1,73 · 13,8 · 0,92) = 10,0 A → Ip = 10,5 A (0,10 × In do TC = exatamente o limite de 10%).
- In trafo = 41,8 A → Im = 334,7 A → I50 = 1,05 · Im = **351,4 A** (3,51 × In).
- ANSI = 16,6 · 41,8 ≈ 694 A, a **4 s** pela tabela (o estudo usou 100/6 = 697 A em 3 s, que é conservador).
- 51 (67-2): IEC **Muito Inversa** (VI), TMS 0,3 → t(Im) = 0,13 s (> 0,1 s ✓); t(ANSI) = 0,06 s (< 4 s ✓).
  - ⚠️ O estudo grafou "IEC-MI", que não existe no 7SR10 (as opções são IEC-NI/VI/EI/LTI e ANSI-MI/VI/EI).
  - Nos seus estudos, escreva sempre "IEC-VI (k = 13,5; α = 1)" para não confundir com ANSI-MI.
- 51N (67N-2): tempo definido de 1 s.
- A parcela de injeção (67-1 EI dial 0,2; 67N-1 em tempo definido de 5 s; 32-1 em 1050 kW) segue a ND-5.31; ver `03-nd531-geracao.md`.

## Circuito de trip e instalação física (9.1.7–9.1.9)
- **Alimentação:** TP de proteção → comutador (contator) → relé + trip. Na falta de tensão, entra o nobreak. Somam-se a isso a fonte capacitiva (trip capacitivo) dedicada à bobina, com teste individual, e o contato NA do disjuntor em série com a bobina.
- **Relé:** na tampa basculante de caixa metálica lacrável, na parede oposta à célula do disjuntor. O cliente acessa só o reset.
- **Eletroduto de aço aparente de 50 mm.** Na SE blindada pode ser embutido.
- **Caixa:** 2 furos de 2" (visor do LED do nobreak + ventilação com tela). O nobreak fica na mesma caixa.
- **TP:** do lado da Cemig, antes do disjuntor e após a chave. **TC:** antes ou depois do disjuntor, a critério do projetista.
