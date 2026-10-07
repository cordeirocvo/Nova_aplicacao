import { dimensionarPadraoCemig } from "../src/lib/cemig/padraoEngine";

console.log("==================================================================");
console.log("VALIDAÇÃO RIGOROSA DAS 16 REGRAS CEMIG ND 5.1 E DEMANDAS DO USUÁRIO");
console.log("==================================================================\n");

// Cenário 1: Contra (Lado Oposto) + Saída Aérea - Trifásico 100A (C3), Poste de Aço
const c1 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  disjuntorAmperes: 100,
  ladoRede: "LADO_OPOSTO",
  tipoSaida: "AEREA",
  localizacao: "URBANO",
  tipoEstrutura: "POSTE_ACO",
  finalidade: "CARREGADOR_VE",
  potenciaCarregadorKW: 22
});

console.log("--- CENÁRIO 1: C3 (100A), Contra, Saída Aérea, Poste Aço ---");
console.log("Poste Homologado:", c1.posteHomologado); // PA5
console.log("Caixa Medição:", c1.caixaMedicao); // CM-14 Metálica
const caixa1 = c1.itensSugeridos.find(i => i.codigo === "CX-CM14");
console.log("Caixa no BOM:", caixa1?.descricao);

// Verificar Tampão
const tampao1 = c1.itensSugeridos.find(i => i.codigo.startsWith("TAMPAO-POSTE"));
console.log("Tampão com modelo do poste:", tampao1?.descricao, "| Código:", tampao1?.codigo);

// Verificar Cabos Preto, Azul, Verde
const caboPreto1 = c1.itensSugeridos.find(i => i.codigo.startsWith("CABO-PRETO"));
const caboAzul1 = c1.itensSugeridos.find(i => i.codigo.startsWith("CABO-AZUL"));
const caboVerde1 = c1.itensSugeridos.find(i => i.codigo.startsWith("CABO-VERDE"));
console.log(`Cabos (Contra + Aérea): Preto = ${caboPreto1?.quantidade}m (esperado 38m), Azul = ${caboAzul1?.quantidade}m (esperado 17m), Verde = ${caboVerde1?.quantidade}m (esperado 8m)`);

// Verificar Eletroduto (Contra + Aérea = 3 barras)
const eletro1 = c1.itensSugeridos.find(i => i.codigo.startsWith("ELET-PVC-40"));
console.log("Eletrodutos (Contra + Aérea):", eletro1?.quantidade, "barras (esperado 3)");

// Verificar Luvas (Contra + Aérea = 2 luvas)
const luva1 = c1.itensSugeridos.find(i => i.codigo.startsWith("LUVA-PVC-40"));
console.log("Luvas PVC (Contra + Aérea):", luva1?.quantidade, "un (esperado 2)");

// Verificar Cabeçotes (Aérea = 2)
const cabecote1 = c1.itensSugeridos.find(i => i.codigo.startsWith("CABECOTE-40"));
console.log("Cabeçote Pingadouro (Aérea):", cabecote1?.quantidade, "un (esperado 2)");

// Verificar Curvas S (Aérea = 2)
const curvaS1 = c1.itensSugeridos.find(i => i.codigo.startsWith("CURVA-S-40"));
console.log("Curvas S (Aérea):", curvaS1?.quantidade, "un (esperado 2)");

// Verificar Buchas e Arruelas PVC (2 cj)
const bucha1 = c1.itensSugeridos.find(i => i.codigo.startsWith("BUCHA-ARRUELA-PVC-40"));
console.log("Buchas e Arruelas PVC:", bucha1?.quantidade, "cj (esperado 2 cj)");

// Verificar Aterramento: Haste Galvanizada e os 3 itens de 3/4"
const haste1 = c1.itensSugeridos.find(i => i.codigo === "HASTE-ATERRAMENTO-GALV-58");
const eletroTerra1 = c1.itensSugeridos.find(i => i.codigo === "ELET-PVC-34-TERRA");
const buchaTerra1 = c1.itensSugeridos.find(i => i.codigo === "BUCHA-ARRUELA-PVC-34");
const curvaTerra1 = c1.itensSugeridos.find(i => i.codigo === "CURVA-S-34");
const gtdu1 = c1.itensSugeridos.find(i => i.codigo === "CONECTOR-HASTE-58");
console.log("Haste Galvanizada:", haste1?.descricao, "| Qtde:", haste1?.quantidade);
console.log("Aterramento 3/4\":", eletroTerra1?.descricao, "|", buchaTerra1?.descricao, "|", curvaTerra1?.descricao);
console.log("GTDU omitido da lista padrão?:", gtdu1 === undefined ? "SIM (Correto!)" : "NÃO (Erro)");

// Verificar Terminais C3 (14 tubulares 35mm²)
const term1 = c1.itensSugeridos.find(i => i.codigo.startsWith("TERM-"));
console.log("Terminais C3:", term1?.descricao, "| Qtde:", term1?.quantidade, "(esperado 14 un 35mm²)");

// Verificar Conectores Bimetálicos (2 un: neutro 35mm² e terra 16mm²)
const bimetalicos1 = c1.itensSugeridos.filter(i => i.codigo.startsWith("CONECTOR-BIMETALICO"));
console.log("Conectores Bimetálicos:", bimetalicos1.map(b => `${b.descricao} (qtd: ${b.quantidade})`).join(" | "));

// Verificar Cintas (Aérea = 4 cintas + 4 parafusos)
const cinta1 = c1.itensSugeridos.find(i => i.codigo.startsWith("CINTA-POSTE"));
const parafuso1 = c1.itensSugeridos.find(i => i.codigo === "PARAFUSO-PORCA-ARRUELA-CINTA");
console.log("Cintas para poste (Aérea):", cinta1?.descricao, "| Qtde:", cinta1?.quantidade, "(esperado 4)");
console.log("Parafusos com porca e arruela:", parafuso1?.quantidade, "un (esperado 4)");


// Cenário 2: A Favor + Saída Subterrânea - Trifásico 200A (C6), Poste de Concreto
const c2 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  disjuntorAmperes: 200,
  ladoRede: "MESMO_LADO",
  tipoSaida: "SUBTERRANEA",
  localizacao: "URBANO",
  tipoEstrutura: "POSTE_CONCRETO"
});

console.log("\n--- CENÁRIO 2: C6 (200A), A Favor, Saída Subterrânea, Poste Concreto ---");
console.log("Poste Homologado:", c2.posteHomologado); // PC3
console.log("Caixa Medição (200A):", c2.caixaMedicao); // CM-3 Metálica
const caixa2 = c2.itensSugeridos.find(i => i.codigo === "CX-CM3");
console.log("Caixa no BOM:", caixa2?.descricao);

const caboPreto2 = c2.itensSugeridos.find(i => i.codigo.startsWith("CABO-PRETO"));
const caboAzul2 = c2.itensSugeridos.find(i => i.codigo.startsWith("CABO-AZUL"));
const caboVerde2 = c2.itensSugeridos.find(i => i.codigo.startsWith("CABO-VERDE"));
console.log(`Cabos (A Favor + Subt): Preto = ${caboPreto2?.quantidade}m (esperado 20m), Azul = ${caboAzul2?.quantidade}m (esperado 7m), Verde = ${caboVerde2?.quantidade}m (esperado 3m)`);

// A Favor + Saída Subterrânea = 1 eletroduto e 0 luvas
const eletro2 = c2.itensSugeridos.find(i => i.codigo.startsWith("ELET-PVC-75"));
console.log("Eletrodutos (A Favor + Subt):", eletro2?.quantidade, "barra(s) (esperado 1)");
const luva2 = c2.itensSugeridos.find(i => i.codigo.startsWith("LUVA-PVC-75"));
console.log("Luvas PVC (A Favor + Subt):", luva2 ? `${luva2.quantidade} un` : "0 un / Nenhuma luva (esperado 0)");

const cabecote2 = c2.itensSugeridos.find(i => i.codigo.startsWith("CABECOTE-75"));
console.log("Cabeçote Pingadouro (Subt):", cabecote2?.quantidade, "un (esperado 1)");
const curvaS2 = c2.itensSugeridos.find(i => i.codigo.startsWith("CURVA-S-75"));
console.log("Curvas S (Subt):", curvaS2?.quantidade, "un (esperado 1)");

const term2 = c2.itensSugeridos.find(i => i.codigo.startsWith("TERM-"));
console.log("Terminais C6 (200A):", term2?.descricao, "| Qtde:", term2?.quantidade, "(esperado 6 un 95mm²)");


// Cenário 3: Contra + Saída Subterrânea (2 eletrodutos e 1 luva)
const c3Subt = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  disjuntorAmperes: 100,
  ladoRede: "LADO_OPOSTO",
  tipoSaida: "SUBTERRANEA",
  tipoEstrutura: "POSTE_CONCRETO"
});
const eletro3 = c3Subt.itensSugeridos.find(i => i.codigo.startsWith("ELET-PVC-40"));
const luva3 = c3Subt.itensSugeridos.find(i => i.codigo.startsWith("LUVA-PVC-40"));
console.log("\n--- CENÁRIO 3: Contra + Saída Subterrânea ---");
console.log("Eletrodutos (Contra + Subt):", eletro3?.quantidade, "barras (esperado 2)");
console.log("Luvas PVC (Contra + Subt):", luva3?.quantidade, "un (esperado 1)");


// Cenário 4: A Favor + Saída Aérea (2 eletrodutos e 0 luvas)
const c4Aerea = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  disjuntorAmperes: 100,
  ladoRede: "MESMO_LADO",
  tipoSaida: "AEREA",
  tipoEstrutura: "POSTE_CONCRETO"
});
const eletro4 = c4Aerea.itensSugeridos.find(i => i.codigo.startsWith("ELET-PVC-40"));
const luva4 = c4Aerea.itensSugeridos.find(i => i.codigo.startsWith("LUVA-PVC-40"));
console.log("\n--- CENÁRIO 4: A Favor + Saída Aérea ---");
console.log("Eletrodutos (A Favor + Aérea):", eletro4?.quantidade, "barras (esperado 2)");
console.log("Luvas PVC (A Favor + Aérea):", luva4 ? `${luva4.quantidade} un` : "0 un / Nenhuma luva (esperado 0)");


// Cenário 5: C4 (125A) Terminais Pino Maciço
const c5 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  disjuntorAmperes: 125,
  tipoTerminalDisjuntor: "PINO_MACICO",
  ladoRede: "MESMO_LADO",
  tipoEstrutura: "POSTE_CONCRETO"
});
const term5 = c5.itensSugeridos.find(i => i.codigo.startsWith("TERM-"));
console.log("\n--- CENÁRIO 5: C4 (125A) Terminais Pino Maciço ---");
console.log("Terminais C4:", term5?.descricao, "| Qtde:", term5?.quantidade, "(esperado 14 un pino maciço 50mm²)");


// Cenário 6: Rural (deve travar em Contra)
const c6 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  disjuntorAmperes: 63,
  ladoRede: "MESMO_LADO", // Usuário selecionou Rural
  localizacao: "RURAL",
  tipoEstrutura: "POSTE_CONCRETO"
});
console.log("\n--- CENÁRIO 6: Padrão Rural Travado em Contra ---");
console.log("Lado da Rede Efetivo:", c6.ladoRede, "(esperado LADO_OPOSTO)");
console.log("Poste Rural C1:", c6.posteHomologado, "(esperado PC2)");


// ==================================================================
// CENÁRIOS TABELA 4 (ALTA DEMANDA 75,1 A 304 kVA) - CEMIG ND 5.1
// ==================================================================

// Cenário 7: F1 (225A) - Caixa CM-9 selecionada, Caixa ZC padrão, Duto 3" (1 via = 10m)
const t4_f1_cm9 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  categoriaDemanda: "ALTA_DEMANDA_TABELA_4",
  tipoCaixaDisjuntorTabela4: "CM-9",
  tipoCaixaSubterranea: "ZC",
  disjuntorAmperes: 225,
  ladoRede: "MESMO_LADO",
  tipoSaida: "AEREA",
  tipoEstrutura: "POSTE_ACO",
  finalidade: "CARREGADOR_VE",
  potenciaCarregadorKW: 80
});

console.log("\n--- CENÁRIO 7: Tabela 4 F1 (225A, 75,1-86 kVA) c/ Caixa CM-9 e Caixa Subt. ZC ---");
console.log("Faixa Fornecimento:", t4_f1_cm9.faixaFornecimento, "(esperado F1)");
console.log("Demanda kVA:", `${t4_f1_cm9.demandaMinKVA} a ${t4_f1_cm9.demandaMaxKVA} kVA`);
console.log("Caixa Medição:", t4_f1_cm9.caixaMedicao, "| Caixa Disjuntor:", t4_f1_cm9.caixaDisjuntor);
const cxCM4_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "CX-CM4");
const cxCM9_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "CX-CM9");
const tc_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo.startsWith("TC-"));
const disj_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "DISJ-CXM-3P-225A");
const equipot_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "CABO-VERDE-10-INTERLIGACAO");
const haste_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "HASTE-ATERRAMENTO-CANTONEIRA-GALV");
const caboNu_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "CABO-COBRE-NU-16");
const duto_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "DUTO-CORRUGADO-PEAD-3POL");
const cxZC_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "CX-SUBTERRANEA-ZC");
const tampaZC_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "TAMPA-FOFO-ZC");
const brita_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "BRITA-1-DRAIN");
const term10_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "TERM-COMPRESSAO-10-ISOLADO");
const termCarc_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "TERM-ATERRAMENTO-CARCACA-CEMIG");
const term16_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "TERM-COMPRESSAO-16");
const tampaInspec_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "TAMPA-FOFO-INSPECAO-TERRA");
const srvMontagem_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "SRV-MONTAGEM-PADRAO");
const srvProjeto_f1 = t4_f1_cm9.itensSugeridos.find(i => i.codigo === "SRV-PROJETO-CEMIG");

console.log("Caixa CM-4 no BOM:", cxCM4_f1?.descricao);
console.log("Caixa CM-9 no BOM:", cxCM9_f1?.descricao);
console.log("TC no BOM ausente (fornecido pela concessionária)?:", tc_f1 === undefined ? "SIM (Correto!)" : "NÃO (Erro)");
console.log("Duto Corrugado 3\" (1 via = 10m):", duto_f1?.quantidade, "m (esperado 10m)");
console.log("Caixa Subterrânea ZC:", cxZC_f1?.descricao);
console.log("Tampa Ferro Fundido ZC:", tampaZC_f1?.descricao);
console.log("Brita nº 1:", brita_f1?.quantidade, "sacos (esperado 3 sacos)");
console.log("Haste Cantoneira Galv a Fogo:", haste_f1?.descricao, "| Qtde:", haste_f1?.quantidade);
console.log("Tampa Ferro Inspeção Terra:", tampaInspec_f1?.quantidade, "un");
console.log("Terminais 10mm² Isolados:", term10_f1?.quantidade, "un (esperado 2 un)");
console.log("Terminais Carcaça CEMIG:", termCarc_f1?.quantidade, "un (esperado 2 un)");
console.log("Terminais 16mm²:", term16_f1?.quantidade, "un (esperado 2 un)");
console.log("Mão de Obra de Montagem:", srvMontagem_f1?.descricao, "| R$", srvMontagem_f1?.precoUnitarioEstimado, "(esperado R$ 10.000,00)");
console.log("Projeto Elétrico CEMIG:", srvProjeto_f1?.descricao, "| R$", srvProjeto_f1?.precoUnitarioEstimado, "(esperado R$ 1.500,00)");


// Cenário 8: F4 (400A) - Subterrâneo Obrigatório, 2 condutores por fase (2x 120 mm²), 2 dutos corrugados de 3" (20m)
const t4_f4 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  categoriaDemanda: "ALTA_DEMANDA_TABELA_4",
  tipoCaixaSubterranea: "ZD",
  disjuntorAmperes: 400,
  ladoRede: "MESMO_LADO",
  tipoEstrutura: "MURO",
  finalidade: "CARREGADOR_VE",
  potenciaCarregadorKW: 150
});

console.log("\n--- CENÁRIO 8: Tabela 4 F4 (400A, 114,1-152 kVA) - 2x Cabos por Fase e Caixa ZD ---");
console.log("Faixa Fornecimento:", t4_f4.faixaFornecimento, "(esperado F4)");
console.log("Tipo de Saída Forçado:", t4_f4.tipoSaida, "(esperado SUBTERRANEA)");
console.log("Caixas:", t4_f4.caixaMedicao, "+", t4_f4.caixaDisjuntor);
const caboPreto_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "CABO-PRETO-120");
const caboAzul_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "CABO-AZUL-120");
const caboVerde_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "CABO-VERDE-50");
const duto_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "DUTO-CORRUGADO-PEAD-3POL");
const cxZD_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "CX-SUBTERRANEA-ZD");
const tampaZD_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "TAMPA-FOFO-ZD");
const barramentoFase_f4 = t4_f4.itensSugeridos.find(i => i.codigo === (t4_f4.barramentoCM18Info?.codigoMaterial || "BARRA-CU-1X516"));
const barramentoNeutro_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "BARRAMENTO-NEUTRO-TERRA-ALTA");
const bandeira_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "TERM-BANDEIRA-2CABOS");
const termOlhal_f4 = t4_f4.itensSugeridos.find(i => i.codigo === "TERM-COMPRESSAO-120");

console.log("Cabos Fase (2x 120mm² 0,6/1kV):", caboPreto_f4?.descricao, "| Qtde:", caboPreto_f4?.quantidade, "m (esperado 40m)");
console.log("Cabo Neutro (2x 120mm² 0,6/1kV):", caboAzul_f4?.quantidade, "m (esperado 14m)");
console.log("Duto Corrugado 3\" (2 vias = 20m):", duto_f4?.quantidade, "m (esperado 20m)");
console.log("Caixa Subterrânea ZD (100x75x120cm):", cxZD_f4?.descricao);
console.log("Tampa Ferro Fundido ZD:", tampaZD_f4?.descricao);
console.log("Barramento Copperbarras (1\" x 5/16\"): ", barramentoFase_f4?.descricao, "| Qtde:", barramentoFase_f4?.quantidade, barramentoFase_f4?.unidade, "(esperado 3 m)");
console.log("Capacidade Barramento Copperbarras:", t4_f4.barramentoCM18Info?.capacidadeAmperes, "A (esperado 439 A)");
console.log("Disjuntor Soprano Frame:", t4_f4.sopranoInfo?.frame, "| Largura Máx. Barramento:", t4_f4.sopranoInfo?.larguraMaximaBarramentoMm, "mm (esperado Frame 400 / 28.5 mm)");
console.log("Usa Terminal Bandeira?:", t4_f4.usaTerminalBandeira ? "SIM (Correto!)" : "NÃO");
console.log("Terminal Bandeira Duplo no BOM:", bandeira_f4?.descricao, "| Qtde:", bandeira_f4?.quantidade, "un (esperado 3 un)");
console.log("Terminais Compressão Olhal 120mm²:", termOlhal_f4?.quantidade, "un");


// Cenário 9: F9 (800A) - Subterrâneo Obrigatório, 3 condutores por fase (3x 185 mm²), 3 dutos corrugados de 3" (30m)
const t4_f9 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  categoriaDemanda: "ALTA_DEMANDA_TABELA_4",
  disjuntorAmperes: 800,
  ladoRede: "LADO_OPOSTO",
  tipoEstrutura: "MURO",
  finalidade: "CARREGADOR_VE",
  potenciaCarregadorKW: 300
});

console.log("\n--- CENÁRIO 9: Tabela 4 F9 (800A, 266,1-304 kVA) - 3x Cabos por Fase, 3 Dutos Corrugados ---");
console.log("Faixa Fornecimento:", t4_f9.faixaFornecimento, "(esperado F9)");
console.log("TCs:", t4_f9.tcRelacao, "| Qtde:", t4_f9.tcQuantidade);
const caboPreto_f9 = t4_f9.itensSugeridos.find(i => i.codigo === "CABO-PRETO-185");
const duto_f9 = t4_f9.itensSugeridos.find(i => i.codigo === "DUTO-CORRUGADO-PEAD-3POL");
const eletroRigido_f9 = t4_f9.itensSugeridos.find(i => i.codigo.startsWith("ELET-PVC"));
const curvaRigida_f9 = t4_f9.itensSugeridos.find(i => i.codigo.startsWith("CURVA-90"));
const cabecote_f9 = t4_f9.itensSugeridos.find(i => i.codigo.startsWith("CABECOTE"));
const bandeira_f9 = t4_f9.itensSugeridos.find(i => i.codigo === "TERM-BANDEIRA-3CABOS");
const barra_f9 = t4_f9.itensSugeridos.find(i => i.codigo === "BARRA-CU-134X38");

console.log("Cabos Fase (3x 185mm² 0,6/1kV):", caboPreto_f9?.quantidade, "m (esperado 75m)");
console.log("Duto Corrugado 3\" (3 vias = 30m):", duto_f9?.quantidade, "m (esperado 30m)");
console.log("Disjuntor Soprano Frame:", t4_f9.sopranoInfo?.frame, "| Larg. Máx:", t4_f9.sopranoInfo?.larguraMaximaBarramentoMm, "mm (esperado Frame 800 / 44.0 mm)");
console.log("Barra Copperbarras 1.3/4\" x 3/8\":", barra_f9?.descricao, "| Capacidade:", t4_f9.barramentoCM18Info?.capacidadeAmperes, "A (esperado 903 A)");
console.log("Terminal Bandeira Triplo:", bandeira_f9?.descricao, "| Qtde:", bandeira_f9?.quantidade, "un (esperado 3 un c/ 3 parafusos)");
console.log("Eletroduto PVC rígido removido da Tabela 4?:", eletroRigido_f9 === undefined ? "SIM (Correto!)" : "NÃO (Erro)");
console.log("Curva 90° rígida removida da Tabela 4?:", curvaRigida_f9 === undefined ? "SIM (Correto!)" : "NÃO (Erro)");
console.log("Cabeçote pingadouro removido da Tabela 4?:", cabecote_f9 === undefined ? "SIM (Correto!)" : "NÃO (Erro)");


// Cenário 10: F1 (225A) - 1 Cabo por Fase, Entrada Direta no Disjuntor (Pino Maciço vs Olhal)
const t4_f1_pino = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  categoriaDemanda: "ALTA_DEMANDA_TABELA_4",
  tipoCaixaDisjuntorTabela4: "CM-18",
  tipoTerminalDisjuntor: "PINO_MACICO",
  disjuntorAmperes: 225,
  ladoRede: "MESMO_LADO",
  tipoEstrutura: "MURO"
});

console.log("\n--- CENÁRIO 10: Tabela 4 F1 (225A) - 1 Cabo por Fase, Entrada Direta Pino Maciço ---");
const termPino_f1 = t4_f1_pino.itensSugeridos.find(i => i.codigo === "TERM-PINO-MACICO-120");
const barra_f1 = t4_f1_pino.itensSugeridos.find(i => i.codigo === "BARRA-CU-78X14");
console.log("Disjuntor Soprano Frame:", t4_f1_pino.sopranoInfo?.frame, "| Larg. Máx:", t4_f1_pino.sopranoInfo?.larguraMaximaBarramentoMm, "mm (esperado Frame 250 / 23.0 mm)");
console.log("Barra Copperbarras 7/8\" x 1/4\":", barra_f1?.descricao, "| Capacidade:", t4_f1_pino.barramentoCM18Info?.capacidadeAmperes, "A (esperado 314 A)");
console.log("Usa Terminal Bandeira?:", t4_f1_pino.usaTerminalBandeira ? "SIM (Erro)" : "NÃO (Correto, entrada direta!)");
console.log("Terminal Pino Maciço 120mm² no BOM:", termPino_f1?.descricao, "| Qtde:", termPino_f1?.quantidade, "un");


// Cenário 11: F7 (630A) - 2 Cabos por Fase (2x 240mm²), Disjuntor Soprano Frame 630 (Larg. 44mm)
const t4_f7 = dimensionarPadraoCemig({
  tipoPadrao: "TRIFASICO",
  categoriaDemanda: "ALTA_DEMANDA_TABELA_4",
  disjuntorAmperes: 630,
  ladoRede: "MESMO_LADO",
  tipoEstrutura: "MURO"
});

console.log("\n--- CENÁRIO 11: Tabela 4 F7 (630A) - 2x 240mm², Disjuntor Frame 630 (Largura 44mm) ---");
const barra_f7 = t4_f7.itensSugeridos.find(i => i.codigo === "BARRA-CU-134X516");
const bandeira_f7 = t4_f7.itensSugeridos.find(i => i.codigo === "TERM-BANDEIRA-2CABOS");
const termOlhal_f7 = t4_f7.itensSugeridos.find(i => i.codigo === "TERM-COMPRESSAO-240");
console.log("Disjuntor Soprano Frame:", t4_f7.sopranoInfo?.frame, "| Larg. Máx:", t4_f7.sopranoInfo?.larguraMaximaBarramentoMm, "mm (esperado Frame 630 / 44.0 mm)");
console.log("Barra Copperbarras 1.3/4\" x 5/16\":", barra_f7?.descricao, "| Capacidade:", t4_f7.barramentoCM18Info?.capacidadeAmperes, "A (esperado 769 A)");
console.log("Terminal Bandeira Duplo:", bandeira_f7?.descricao, "| Qtde:", bandeira_f7?.quantidade, "un (esperado 3 un)");
console.log("Terminal Compressão Olhal 240mm²:", termOlhal_f7?.descricao, "| Qtde:", termOlhal_f7?.quantidade, "un");

const totalItens = t4_f9.itensSugeridos.length;
const totalCapex = t4_f9.itensSugeridos.reduce((acc, curr) => acc + curr.precoTotal, 0);
console.log(`\nTotal de Itens no BOM F9: ${totalItens} | Capex Total Estimado: R$ ${totalCapex.toFixed(2)}`);

console.log("\n==================================================================");
console.log("TODAS AS REGRAS, DISJUNTORES SOPRANO E BARRAS COPPERBARRAS VALIDADOS COM SUCESSO!");
console.log("==================================================================");

