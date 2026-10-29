# Checklist de aprovação CEMIG: projeto de entrada em MT (ND-5.3 §2.6.5)

> Use este checklist como **folha de conferência final** antes de protocolar. Cada item tem a fonte citada.
> Entrega: **PDF ou ZIP**, formato ABNT, **tudo em preto**, com folha de rosto/selo do Anexo C. A Cemig tem 30 dias para analisar. O projeto aprovado vale 12 meses (ou até o fim da obra na rede, se houver).

## A. Documentos
- [ ] **ART** (CREA-MG) de projeto, ou **TRT** (CFT) se a demanda for ≤ 800 kVA, assinada pelo RT e pelo contratante (2.5.2.3, 2.6.5.3).
- [ ] Procuração registrada em cartório, se quem assina for procurador (2.6.5.1.1).
- [ ] **Catálogo do relé**, comprovando os requisitos do Anexo A (2.6.5.2.8).
- [ ] **Catálogo do nobreak**, comprovando o item 4.12.13 (2.6.5.2.9).
- [ ] Catálogo/curvas dos demais dispositivos com ajuste (fusíveis, disjuntor BT) (2.6.5.2.7).
- [ ] SE nº 4 / SEBS: **modelo listado no PEC-11** (citar fabricante, modelo e aplicação: interna/externa, individual/compartilhada).
- [ ] APP: autorização ambiental (2.1.6). Hospital/clínica: RDC-50 (2.6.1.7).
- [ ] Atendimento híbrido: declaração registrada em cartório de não interligação (Anexo B).

## B. Dados do imóvel (2.6.5.1)
- [ ] Nome, telefone e CPF/CNPJ do proprietário.
- [ ] Finalidade (residencial, comercial, industrial, rural…).
- [ ] **Planta de situação** com distâncias até a rede BT/MT da Cemig. Na área rural, amarração topográfica e coordenadas.
- [ ] Corte longitudinal com marquises e avanços até a rede (se do mesmo lado da rede).
- [ ] Número predial; número de UCs.

## C. Características técnicas (2.6.5.2)
- [ ] **Lista de carga instalada:** quantidade, kW, kVA, rendimento (motores), FP e tensão.
- [ ] **Memória de cálculo da demanda** em kVA e kW (FP ≥ 0,92), com o regime mais severo. **Demanda do projeto = demanda contratada.**
- [ ] **Lista de materiais** da SE, com tipo e principais características elétricas.
- [ ] **Planta e cortes da SE:** equipamentos, cabos, aterramento, ventilação, espaço de manobra, iluminação natural, artificial e de emergência.
- [ ] **Diagrama unifilar** completo, do ponto de conexão até a medição (inclusive).
- [ ] Cronograma de demanda, se houver etapas (avaliar troca de TC).
- [ ] **Memória de cálculo do ajuste das proteções + coordenograma** (Anexo A), incluindo a proteção BT quando aplicável.
- [ ] **Unifilar de ligação do relé** (TC, TP, comutador, nobreak, trip capacitivo, bobina, contato NA) (9.1.6.16).
- [ ] **Tabela com todos os parâmetros programáveis do relé** (9.1.6.15).
- [ ] Cargas especiais (motores > 50 cv, partidas simultâneas, fornos): estudo de queda de tensão (2.6.5.2.10). Dados de motor conforme 2.6.5.4.7.
- [ ] Cargas sensíveis a flutuação (2.6.5.4.8).
- [ ] Geração própria: unifilar funcional, intertravamentos, características do gerador, curto-circuito, coordenação (2.6.5.2.11, 2.9).
- [ ] **Planta de aterramento**: hastes (mínimo de 4, 9 ou 12 conforme kVA), condutor, caixas, **resistência prevista** (≤ 10 Ω preferencial) (2.6.5.2.12, 4.7).

## D. Notas obrigatórias no projeto (2.6.5.3.4 e 2.6.5.4.6)
Copie literalmente:
1. "A CEMIG fica autorizada a reproduzir cópias desse projeto para uso interno, se necessário, bem como fazer arquivamento pelo processo que lhe for conveniente."
2. "Este projeto foi desenvolvido de acordo com a norma CEMIG ND-5.3, versão SET/2023." (atualize se houver revisão mais nova)
3. "Eu, [nome do cliente], declaro que estou ciente das responsabilidades legais inerentes à energização acidental de circuitos elétricos da concessionária por equipamentos de geração própria existentes na instalação, ou que vierem a ser instalados dentro de minha propriedade."
4. Termo de direitos autorais: "Eu, responsável técnico por este projeto, declaro conhecer o disposto na Lei Federal 5194/66 de 24-12-1966, na Lei 9610/98 de 19-02-1998 e nas Resoluções, Instruções Normativas e Atos do CONFEA e do CREA-MG (ou CFT), responsabilizando-me, única e exclusivamente, administrativa ou judicialmente, em caso de arguição de violação dos direitos autorais."

## E. O que NÃO pode constar (motivo comum de devolução)
- [ ] ❌ Detalhes das instalações internas após o padrão de entrada (2.6.1.4, 2.6.5.4.1).
- [ ] ❌ Equipamento de proteção da derivação da Cemig: elo, religador, chave (2.6.5.4.9).
- [ ] ❌ Desenhos, memória de ajuste ou unifilar do relé **elaborados pelo fabricante do relé** (2.6.5.2.7).
- [ ] ❌ SE nº 2 **individual ou compartilhada em 13,8 kV**; SE nº 1, nº 3 ou nº 6 para UC nova (4.8).
- [ ] ❌ Para-raios, QGBT, capacitores ou controlador de demanda **dentro** da SE/cubículo (4.8.2.8 d, 4.12.6).
- [ ] ❌ Bobina de mínima tensão instantânea, ou com religamento, no disjuntor geral (4.4.4–5).
- [ ] ❌ Fusível no secundário do TP de proteção (4.12.14.2).
- [ ] ❌ Ajuste de proteção aumentado para "coordenar com as internas" (9.1.6.3).

## F. Erros técnicos que mais reprovam (lições do estudo aprovado e da norma)
- [ ] Mesma demanda em toda parte: selo, memorial, contrato e relé.
- [ ] Nomenclatura de curva sem ambiguidade (IEC EI k = 80 α = 2; IEC VI k = 13,5 α = 1).
- [ ] Mesmo dial e mesmos valores em todas as tabelas, no coordenograma e na parametrização.
- [ ] Ponto ANSI com o tempo da tabela 9.1.3.4.
- [ ] Pickups ≥ mínimo do relé e > 10% do primário do TC.
- [ ] TC: verificação de saturação documentada; TP 0,6P75 com 400 VA térmica.
- [ ] Sequência de equipamentos da SE 4 conforme o DESENHO 10.
- [ ] Nobreak ≥ 600 VA senoidal, 2 h; comutação desenhada.

## G. Recebimento / vistoria (3.3)
A Cemig testará:
- (a) parametrização igual ao projeto aprovado;
- (b) portas de comunicação inativas e sem fios;
- (c) nenhum fio nos bornes de bloqueio de 50/51;
- (d) trip por jumper na bobina;
- (e) nobreak mantendo relé e trip sem alimentação auxiliar;
- (f) operação do conjunto relé-disjuntor;
- eventualmente, a medição da malha de terra, que deve ficar ≤ o valor do projeto.

**O RT da execução deve estar presente.** A Cemig acompanha a parametrização e lacra o relé (2.6.5.2.7, 4.4.7).
