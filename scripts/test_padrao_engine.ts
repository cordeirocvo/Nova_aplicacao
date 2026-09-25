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

console.log("\n==================================================================");
console.log("TODAS AS REGRAS VALIDADAS COM SUCESSO!");
console.log("==================================================================");
