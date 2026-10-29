# ND-5.3 (SET/2023): subestações de entrada em MT — dimensionamento

> Fonte: CEMIG ND-5.3, revisão SET/2023 (substitui JUL/2022). `[Pn]` é a página do PDF.
> Antes de cada projeto, confirme no site da Cemig se há revisão mais nova. Cite no projeto: "ND-5.3, versão MÊS/ANO".

## 1. Campo de aplicação [P6, P16–18]
- Fornecimento trifásico em MT de 13,8, 22 e 34,5 kV, para carga instalada > 75 kW, até **2500 kW** de demanda contratada (acima disso, avaliação caso a caso; REN 1000 art. 23).
- Sistema em delta, 60 Hz. O neutro da rede é multiaterrado e deve ser interligado à malha e ao neutro do trafo [P17].
- Dimensionamento pela **demanda provável (calculada)** em kVA [P17].
- **Corrente nominal de cálculo** = demanda (kW ou kVA, FP 0,92) **+ 5%** [P18, item 2.4.6].
- **Demanda ≤ 300 kW:** medição a 3 elementos e proteção em MT nas SE nº 2, 4, 5 ou 8 [P17].
- **Demanda > 300 kW:** medição a 3 elementos e **disjuntor em MT**, qualquer que seja a SE [P17].
- Proteção, condutores e barramentos são dimensionados pela potência do(s) transformador(es), conforme as tabelas do cap. 5. A medição é dimensionada pela Cemig [P17].

## 2. Tipos de subestação — status atual
| Nº | Descrição | Status (SET/2023) | Aplicação |
|---|---|---|---|
| **1** | Trafo em poste, medição/proteção BT em mureta | **Descontinuada** (desde SET/2017) | Só existentes: aumento/redução até 304 kVA, troca por SE 6 [P27, P70] |
| **2** | Alvenaria: medição + proteção (disjuntor + relé), com ou sem transformação | **Vedada para uso individual em 13,8 kV** desde 03/07/2023; **vedada para uso compartilhado em 13,8 kV** desde 01/01/2024 | Permitida em **22 kV e 34,5 kV**, até 2500 kW [P65–66] |
| **3** | Cubículo de medição em poste, proteção por chave fusível | **Descontinuada** | Só existentes. **Não aceita conexão de GD** [P103] |
| **4** | **Subestação blindada metálica** (cubículo compartimentado) | **Vigente: a opção principal em 13,8 kV** | Até 2500 kW, uso interno ou externo, individual ou compartilhada [P66–69] |
| 5 | Alvenaria: medição MT + chave fusível tripolar sob carga + trafo 75–300 kVA + disjuntor BT | Vigente | Até 300 kW, não compartilhada [P69–70] |
| 6 | Trafo em poste para migração ACL de SE 1 existente | Vigente só para migração | Proibida para UC nova [P70] |
| 8 | SEBS: blindada simplificada, chave fusível MT + disjuntor BT | Vigente | Até 300 kW, não compartilhada [P71–73] |

> [!IMPORTANT]
> Em **13,8 kV**, as opções novas para **> 300 kW** reduzem-se, na prática, à **SE nº 4 (blindada)**. A SE nº 2 em alvenaria só vale em 22 kV e 34,5 kV. Até 300 kW também servem a SE 5 e a SEBS (nº 8).

## 3. SE nº 4 — Subestação blindada (requisitos completos) [P66–69, P104–111]
1. Cubículo metálico, compartimentado, com alívio de pressão e ventilação natural ou forçada, para uso abrigado ou ao tempo, com proteção em MT. Demanda até 2500 kW.
2. **Modelo previamente aprovado pela Cemig e listado no PEC-11.** A aprovação do modelo exige:
   - ensaios de tipo NBR IEC 62271-200 em laboratório oficial;
   - **arco interno IAC ≥ 12,5 kA / 1 s**, ou maior que o Icc do ponto de conexão;
   - ART de projeto e de montagem;
   - ≥ 2 pontos de lacre em cada compartimento com energia não medida e no compartimento de medição;
   - **nenhum equipamento** além da medição Cemig e da proteção geral (ex.: **sem para-raios no cubículo**).
3. Qualquer intervenção no cubículo só pode ser feita pelo fabricante do modelo aprovado.
4. Cada aplicação exige modelo específico aprovado: (1) individual interno, (2) individual externo, (3) compartilhada interna, (4) compartilhada externa. O mesmo vale para a presença de fonte geradora.
5. **Sequência obrigatória** (DESENHO 10), em qualquer sentido de entrada:
   `Entrada → TP medição → TC medição (módulo EXCLUSIVO Cemig) → Chave seccionadora sob carga → TP proteção → TC proteção → Disjuntor → Saída`
   - A chave sob carga pode ser substituída por seccionadora intertravada com o disjuntor (só abre com o disjuntor aberto).
   - Os TC de proteção podem ficar antes ou depois do disjuntor.
6. Caixa do medidor:
   - (a) compartimento no próprio cubículo com dimensões da CM-4; **ou**
   - (b) CM-4 a ≤ 2 m da baia de TC/TP, ligada por eletroduto de aço aparente Ø ≥ 40 mm (1½"), sem caixas de passagem ou conduletes.
7. ACL ou medidor de qualidade de energia (QEE): CM-4 Especial adicional, ou visor de adaptação (Material Padronizado 17).
8. **Instalação conforme o ensaio de arco interno:**
   - respeitar dutos ou fosso de exaustão e distâncias a paredes e teto;
   - acessos F/L/R iguais à classificação IAC (ex.: IAC AFL → sem acesso traseiro);
   - local não sujeito a inundação.
9. **Uso interno** (DESENHO 11):
   - sala de alvenaria com pé-direito ≥ 3 m (≥ 2,50 m sob viga);
   - ~1000 mm atrás do cubículo, ou o que o ensaio permitir;
   - **700 mm livres** além das portas abertas a 90°;
   - canaleta no piso com tampa lacrável ou eletroduto para o ramal.
10. **Uso externo** (DESENHO 12):
    - base de concreto ≥ área da base do cubículo; nada encosta no solo;
    - **barreira física ≥ 2,0 m** de altura, a ≥ 700 mm do cubículo (e ≥ 700 mm além das portas abertas a 90°). Se for grade: malha ≤ 50 mm, fio ≥ 3 mm galvanizado, aterrada;
    - **nada acima do cubículo** (sem telhado), porque a exaustão do arco costuma ser pelo topo;
    - porta metálica de 1,20 × 2,10 m, abrindo para fora, com placa "PERIGO DE MORTE – MÉDIA TENSÃO".
11. Isolamento em SF6: indicador de pressão/vazamento, ventilação, EPI/EPC específicos.
12. Relé secundário: caixa metálica lacrável. Na blindada, o eletroduto de 50 mm pode ser **embutido** [P181].
13. Admite-se usar o TP de proteção para iluminação (≤ 50 VA) e para a tomada da CM-4, com disjuntor de 2 A (somente SE 2 ou 4) [P78].

### SE nº 4 compartilhada [P73, P109–111]
- Todas as UCs com carga > 75 kW; Σ demandas ≤ 2500 kW.
- Local de acesso comum, fora das edificações; delimitação física (ou ≥ 1 m) e identificação de cada UC.
- Cada UC tem a própria medição (3 TC + 3 TP + medidor + chave de aferição) e a própria proteção [P14]:
  - 3 TC de proteção;
  - TP de proteção: 1 sem GD, 3 com GD;
  - nobreak, relé e disjuntor MT.
- Alternativa 1: chaves seccionadoras lacráveis. Alternativa 2: barramentos BTX-L/BQX-L classe 25 kV, para no máximo 3 UCs.

## 4. Equipamentos e critérios gerais (todas as SEs)
### Transformador [P56–58]
- **Dyn1** (primário Δ, secundário Y aterrado). Gerador ≤ 300 kVA também exige Dyn1. Para GD > 300 kW, ver ND-5.31 (reator ou trafo de aterramento).
- Capacidade mínima de transformação: **75 kVA**.
- SE integrada à edificação (parede-meia ou mesma laje): **somente trafo a seco (epóxi)**.

### Disjuntor MT [P58–60]
- Abertura automática por **bobina de trip comandada por relé secundário microprocessado** (Anexo A).
- SE integrada à edificação: somente disjuntor a **vácuo, SF6** ou líquido não inflamável ≤ 1 L/polo.

| | 13,8 kV | 22 kV | 34,5 kV |
|---|---|---|---|
| Tensão nominal mín. | 15 kV | 25 kV | 35 kV |
| Corrente nominal mín. | 350 A | 350 A | 600 A |
| Interrupção simétrica mín. | 12,5 kA | 12,5 kA | 12,5 kA |

- **Proibida** bobina de mínima tensão instantânea no disjuntor geral. Se houver, deve ser temporizada e coordenada; nunca com religamento [P59].
- Outras proteções ou intertravamentos no disjuntor geral: devem constar do projeto e ser aprovados.

### TC e TP de proteção [P60, P77–78, P175–176]
- **TC: classe mínima 12,5 VA 10P20** (NBR 6856). A carga e a RTC são definidas pelo RT, sem saturação para o maior Icc.
- **TP de proteção:** NBR 6855, **400 VA térmica, classe 0,6P75**.
  - Quantidade: 1 TP sem geração; **3 TP** com geração ou com funções de tensão/potência.
  - Ficam do lado da Cemig: antes do disjuntor e após a chave.
  - Proteção do secundário **por disjuntor termomagnético** (fusível proibido), na mesma caixa do relé, inacessível ao cliente.

### Nobreak [P77, item 4.12.13]
- Tensão de saída: igual à do secundário do TP de proteção (ou à BT do trafo, se não houver TP).
- **≥ 600 VA, onda senoidal, autonomia ≥ 2 h com 20 W / 30 VA**, faixa de 0 a 40 °C.
- Comutação TP ↔ nobreak (contator ou relé) ou nobreak com by-pass automático [9.1.8].
- Apresente o catálogo do nobreak junto com o projeto [P24].

### Para-raios (quando aplicável) [P60–61]
| | 13,8 kV | 22 kV | 34,5 kV |
|---|---|---|---|
| Tensão nominal | 12 kV | 21 kV | 30 kV |
| Corrente nominal | 10 kA | 10 kA | 10 kA |
| Ures (10 kA, 8/20) | 43 kV | 76 kV | 108 kV |

- Construção: polimérico, ZnO sem centelhador, com desligador automático.
- Na SE 4 os para-raios ficam **fora** do cubículo (no poste da derivação).

### Aterramento [P63–65]
- Projeto pela NBR 15751, NBR 14039 e NBR 5419.
- Mínimo de hastes:
  - **≤ 150 kVA → 4;**
  - **150 a 500 kVA → 9;**
  - **≥ 500 kVA → 12.**
- Espaçamento ≥ comprimento da haste.
- Hastes em cava de inspeção (DESENHO COMPLEMENTAR 2), com rabichos de 500 mm.
- **R ≤ 10 Ω (preferencial).** O valor previsto deve constar do projeto; a Cemig pode medir.
- Ligar à malha: neutro da rede, neutro do trafo, neutro da instalação, ferragem civil e todas as partes metálicas.

### Barramentos MT [P74, P82–83]
- Cobre nu. Cores: A vermelho, B branco, C marrom, N azul.
- Seção mínima (Tabela 5): até 21 A → 20 mm²; 21 a 100 A → 50 mm² (vergalhão 3/8"); acima disso, S tal que I/S ≤ 2 A/mm².
- Afastamentos (Tabela 4, 13,8 kV, área abrigada): fase-fase 150 mm (mínimo) / 200 mm (recomendado); fase-neutro 115 / 150 mm. Cubículos blindados podem adotar outros valores.

### Ventilação, segurança e acessórios [P48, P75–78]
- Iluminação de segurança com autonomia ≥ 2 h.
- Ventilação forçada: 2500 m³/h por 500 kVA. Ventilação natural: ≥ 1,0 m² por 300 kVA, com tela de 5 a 13 mm.
- Extintor **pó ABC 6 kg** do lado de fora.
- Luvas isolantes e tapete ou estrado na frente do disjuntor (SE interna).
- Contenção de óleo quando houver > 100 L de líquido isolante.
- Lacres com furo > 2 mm.
- Porta corta-fogo **P-90** (NBR 11742) se a SE for integrada à edificação.
- Distância de 1,70 m (horizontal) e 3,20 m (vertical) a janelas, sacadas e divisas [P48].
- **Proibido dentro da SE:** banco de capacitores, QGBT, controlador de demanda etc. [P76].

## 5. Ramal de conexão e ramal de entrada [P40–56]
- Ramal de conexão: até **30 m**, instalado pela Cemig. Cabo Al isolado multiplexado autossustentado; neutro CA 2 AWG (ramal de 50 mm²) ou 1/0 (ramal de 185 mm²).
- Ramal de entrada subterrâneo (SE 2 com 3 m de pé-direito, SE 4, SE 5 e SE 8, do mesmo lado da rede):
  - cabos unipolares de **cobre**, XLPE/EPR 90 °C, isolação 8,7/15 kV (13,8), 15/25 kV (22) ou 20/35 kV (34,5);
  - blindagem aterrada nas duas pontas;
  - **neutro de cobre nu 70 mm²**;
  - eletroduto de **100 mm**: aço no poste da Cemig, PVC ou aço depois [P55–56];
  - o cliente é responsável pelo ramal até a derivação (o ponto de conexão fica na derivação).
- Área rural: o ponto de conexão é a 1ª estrutura dentro da propriedade, a ≤ 30 m da rede e fora da faixa de servidão (15 m até 22 kV; 20 m em 34,5 kV) [P10, P16].
- Altura mínima do condutor ao solo: 6,0 m (ruas e estradas rurais), 5,5 m (pedestres), 7,0 m (rodovias federais), 9,0 m (ferrovias) [P41–42].

## 6. Tabelas do capítulo 5 (resumo)
### Tabela 12b: cabos de cobre do ramal de entrada, 8,7/15 kV (kVA máx. a 90 °C)
| Seção (mm²) | 25 | 35 | 50 | 70 | 95 | 120 | 150 | 240 |
|---|---|---|---|---|---|---|---|---|
| kVA máx. | 3100 | 3700 | 4300 | 5400 | 6500 | 7300 | 8300 | 10800 |

- 22 kV (15/25 kV, a partir de 50 mm²): 3300, 4100, 4900, 5600, 6300, 7100 (185) e 8200 kVA.
- 34,5 kV (20/35 kV): 6000, 7600, 9100, 10300, 11700, 13100 (185) e 15300 kVA.

### Tabelas 16–18: fusível da chave tripolar sob carga (por trafo)
| kVA | 75 | 112,5 | 150 | 225 | 300 | 500 | 750 | 1000 |
|---|---|---|---|---|---|---|---|---|
| 15 kV (A) | 6 | 8 | 10 | 16 | 25 | 40 | 63 | 80 |
| 25 kV (A) | 4 | 6 | 8 | 10 | 16 | 25 | 32 | 50 |
| 35 kV (A) | 4 | 4 | 6 | 8 | 10 | 16 | 25 | 32 |

> Com **mais de um trafo**, cada um precisa de proteção primária individual + chave fusível tripolar sob carga. Para trafos ≤ 300 kVA admite-se proteção geral em BT por disjuntor em caixa moldada (só a chave em MT). Essas proteções **entram no coordenograma** [P60, item 4.4.12].

### Tabela 6: TC de **medição** em 13,8 kV (definido pela Cemig; apenas referência)
- FT 1,5: 5-5 até 100 kVA · 10-5: 100–300 · 15-5: 150–400 · 20-5: 200–600 · 25-5: 250–750 · 30-5: 300–900 · 40-5: 400–1200 · 50-5: 500–1500 · 75-5: 750–2250 · 100-5: 1000–3000 kVA.
- TP de medição: 70:1 (13,8 kV), 120:1 (22 kV), 175:1 (34,5 kV).

### Tabela 19: proteção BT da SE 5 / SEBS (disjuntor ≥ 30 kA, com bobina de trip)
| kVA | 220/127 V | 380/220 V | 440/254 V |
|---|---|---|---|
| 75 | 200 A / 95 mm² | 120–125 A / 50 mm² | 100 A / 35 mm² |
| 112,5 | 300–320 A / 240 | 175 A / 95 | 150 A / 70 |
| 150 | 400 A / 2×120 | 250 A / 150 | 200 A / 95 |
| 225 | 600–630 A / 2×240 | 350 A / 2×120 | 300–320 A / 240 |
| 300 | 800 A / 3×185 | 500 A / 2×240 | 400 A / 2×120 |

### Tabela 2: limites de motores (partida direta)
- Trifásico até 50 cv com partida direta. Com chave estrela-triângulo, até 125 cv. Acima dos limites da tabela: soft-starter ou inversor.
- Motores > 50 cv ou partidas simultâneas: apresentar estudo de queda de tensão e plotar as partidas no coordenograma [P33, P180].

## 7. Geração própria [P28–32]
- **Com injeção:** segue a ND-5.31 (ver `03-nd531-geracao.md`).
- **Sem injeção, paralelismo momentâneo (≤ 15 s):**
  - disjuntor de interligação próprio (nunca o geral);
  - no disjuntor geral, **apenas** 50/51, 50/51N e **32 (≤ 5% da geração, ≤ 15 s)**; função 25 proibida nele;
  - 3 TP + 3 TC de proteção;
  - placa de advertência (Material Padronizado 12).
- **Paralelismo permanente sem injeção:** critérios da ND-5.31.
- **Sem paralelismo:** chave comutadora ou painel de transferência com contatores, com as conexões lacradas pela Cemig.
