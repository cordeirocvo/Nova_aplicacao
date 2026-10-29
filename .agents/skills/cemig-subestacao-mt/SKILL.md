---
name: cemig-subestacao-mt
description: Especialista em projeto de subestação de entrada de energia em média tensão CEMIG (ND-5.3 SET/2023 + ND-5.31 JUN/2024) — escolha do tipo de SE (nº 1 a 8, foco na nº 4 blindada), dimensionamento, estudo de proteção secundária (50/51, 50N/51N, 32, 67/67N, 27/59/81), coordenograma, parametrização de relé de qualquer marca e checklist de aprovação.
when_to_use: "Use quando o usuário pedir projeto, memorial, estudo de proteção, coordenograma, ajuste/parametrização de relé, TC/TP de proteção, nobreak, aterramento ou aprovação CEMIG de cabine primária / subestação de entrada em 13,8, 22 ou 34,5 kV, inclusive com geração distribuída (UFV) em MT. NÃO usar para padrão de entrada em baixa tensão (ND-5.1/5.2 — ver electrical-engineer-nbr5410) nem para instalações internas pós-medição."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
effort: medium
version: 1.0.0
---

# CEMIG Subestação MT — o básico bem feito

> Uma fórmula da norma para cada número, a fonte citada em cada linha, nenhum ajuste "no olho".

## Mapa de conhecimento (leia só o necessário)
| Precisa de… | Arquivo |
|---|---|
| Tipo de SE, requisitos da **SE nº 4 blindada**, disjuntor, TC/TP, nobreak, aterramento, cabos, tabelas do cap. 5 | `references/01-nd53-subestacoes.md` |
| **Estudo de proteção passo a passo** (In, Ip, Im, ANSI, TC, 50/51/51N/50N, dial, coordenograma, exemplos verificados) | `references/02-anexo-a-protecao.md` |
| Geração própria / UFV / paralelismo (32, 67/67N, 27/59/81, reator de aterramento) | `references/03-nd531-geracao.md` |
| Converter o ajuste para **qualquer marca de relé** (7SR10, SEL, Pextron, Sepam, ABB, Easergy, 7SJ80, GE) | `references/04-reles-parametros.md` |
| Conferência final antes de protocolar (documentos, notas obrigatórias, proibições, vistoria) | `references/05-checklist-aprovacao.md` |
| Esqueleto do memorial descritivo + memória de cálculo + tabela do relé | `references/06-modelo-memorial.md` |

Fontes primárias (PDF): `~/Downloads/nd5_3_000001p.pdf` (SET/2023) e `~/Downloads/ND_5.31_Conexao-em-MT-.pdf` (rev. g). Referência aprovada: `~/Downloads/ESTUDO DE PROTEÇÃO - NS 1154922565_APROVADO_24102025.pdf` + folhas 01–03 (SE 4 Setta Power Salt 15 kV, 7SR1004, UFV 1000 kW).

## Protocolo
1. **Enquadrar:** tensão, demanda contratada (kW), transformadores (kVA, Z%), geração (sim/não, kW, injeção), local (urbano/rural, interno/externo).
2. **Escolher a SE** (01 §2):
   - 13,8 kV e > 300 kW → **SE nº 4**;
   - ≤ 300 kW → SE 4, SE 5 ou SEBS nº 8;
   - SE 2 só em 22/34,5 kV;
   - SE 1, 3 e 6 nunca para UC nova.
3. **Dimensionar:** ramal (Tab. 12–14), disjuntor (15 kV / 350 A / 12,5 kA), TC 10P20 12,5 VA, TP 0,6P75 400 VA, nobreak ≥ 600 VA / 2 h, malha (4, 9 ou 12 hastes, ≤ 10 Ω).
4. **Pedir à Cemig** o Icc (trifásico e fase-terra) e a proteção da derivação. Sem esses dados o estudo fica "preliminar".
5. **Calcular a proteção** com o roteiro do 02 (Passos 1–7). Com geração, somar o 03.
6. **Traduzir para o relé escolhido** (04): converter, arredondar ao passo e **recalcular o pickup efetivo**.
7. **Coordenograma** log-log com todos os itens de 9.1.10.1.
8. **Montar o memorial** (06) e rodar o **checklist** (05). Qualquer item ❌ bloqueia a entrega.

## Regras de ouro (decoradas)
- In = kW / (1,73·kV·0,92) · **Ip = 1,05·In** · **Ipn = Ip/3 ≤ 40 A** · **Im = 8·In_trafo @ 0,1 s** · **I_ANSI = 100/Z%·In_trafo** (neutro ×0,58).
- **51 fase: IEC EI** (consumidor) · **50 entre Im e 1,05·Im** · **51N em tempo definido de 1 a 3 s** · **50N = 50/3** · **32 ≤ 5% da geração, ≤ 15 s** (sem injeção).
- TC: **Icc ≤ 50·I_prim**, **I50 ≤ 20·I_prim**, **Ip > 10%·I_prim**.
- GD (ND-5.31): 67 injeção = 1,05·P_ger, EI/MI, **sem instantâneo**, 67N em tempo definido de 5 a 9 s · 67 consumo = 1,05·Carga, 67N em tempo definido de 1 a 3 s · 32 = 1,05·P / 15 s · 27: 0,8 pu/3 s e 0,5 pu/1 s · 59: 1,1 pu/3 s e 1,18 pu/0,5 s · 81: 57,4/5,5 s, 56,9/0,2 s, 62,6/10,5 s, 63,1/0,2 s.
- Nunca subir ajuste para coordenar com proteção interna. Nunca usar desenho ou memória do fabricante do relé.

## Verificação
- Refazer o Exemplo 1 do `02` (ND 9.1.11: In 54,64 A, Ip 57,37 A, Im 293,24 A, I50 296,17 A, ANSI 418,8 A @ 3 s) e conferir que bate antes de usar valores novos.
- Toda tabela do memorial, o coordenograma e a parametrização do relé mostram **os mesmos números**.
