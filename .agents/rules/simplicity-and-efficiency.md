---
name: simplicity-and-efficiency
version: 1.0.0
priority: P0
trigger: always_on
---

# Diretrizes de Execução do Agente: Simplicidade, Pragmatismo e Eficiência (KISS)

> Regra global permanente aplicável a qualquer tarefa (código, mapas, diagramas, engenharia e refatoração).
> **Meta fundamental:** Fazer o básico extremamente bem feito, eliminando complexidade desnecessária ("Overengineering") e redundâncias.

---

## 📐 1. Princípios de Decisão (A Navalha da Simplicidade)

1. **Pense Simples (KISS):**
   - Priorize soluções diretas, modulares e fáceis de manter.
   - Não crie classes desnecessárias, camadas excessivas de abstração ou múltiplos arquivos auxiliares quando uma função pura, limpa e bem tipada resolver o problema com excelência.
2. **Decisões Objetivas (Menos Código, Menos Dependências):**
   - Escolha sempre a alternativa que exige menos linhas de código e menos dependências externas.
   - Não introduza novos pacotes ou bibliotecas sem justificativa técnica indispensável.
3. **Básico Bem Feito (Núcleo Funcional Primeiro):**
   - Tratamento de erros essencial, tipagem TypeScript estrita e validação real no terminal/browser antes de qualquer elemento puramente cosmético ou decorativo.
   - Proibido qualquer "perfumaria" ou excesso de UI antes de o núcleo funcional de cálculo ou dados estar 100% validado.

---

## 🛠️ 2. Ecossistema e Ferramental de Alta Performance

1. **Prioridade para Ferramentas Nativas (Zero Latência):**
   - Para leitura, edição e pesquisa de arquivos locais, use **estritamente as ferramentas nativas integradas** (`read_file`, `edit_file`, `write_file`, buscas via terminal com ripgrep/PowerShell).
   - Não instale nem tente inicializar servidores MCP genéricos para tarefas que o ambiente nativo já executa com velocidade transacional superior e sem sobrecarga de tokens.
2. **Reutilização Obrigatória de Skills e Componentes Existentes:**
   - **Código e Refatoração:** Aplicar as diretrizes de `@[skills/clean-code]` e `@[skills/simplify-code]`.
   - **Interface e Estilização:** Utilizar utilitários consolidados do Tailwind CSS (`@[skills/tailwind-patterns]`) e a identidade visual Cordeiro (#E45318, #00B356, #0A192F). É proibido criar CSS cru manual, estilos inline desorganizados ou abstrações visuais desnecessárias.
   - **Versionamento Limpo:** Adotar o padrão de Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).

---

## 🔍 3. Busca de Conhecimento e Fonte Única da Verdade (SSOT)

1. **Pesquisa Local Prévia (Antes de Criar, Investigue):**
   - Antes de implementar qualquer função, investigue se ela já existe na base de código (`src/lib/`, `src/components/`, `src/app/`).
   - Reutilize funções internas consolidadas para evitar código duplicado e desvios de regra de negócio.
2. **Dados Unificados (Single Source of Truth):**
   - É terminantemente proibido digitar parâmetros normativos ou técnicos "hardcoded" em múltiplos arquivos.
   - Todos os dados normativos (ex: tabelas CEMIG ND-5.1, limites de kVA, disjuntores, bitolas de cabos) devem derivar de sua fonte centralizada e única de dados.
3. **Pesquisa Externa Eficiente:**
   - Ao buscar referências de mercado, documentações técnicas ou boilerplates consolidados, faça consultas diretas e focadas, extraindo apenas o código estritamente útil para o contexto do projeto.

---

## ⚡ 4. Rigor Normativo Inegociável

- **Simplicidade NÃO significa negligência técnica ou relaxamento de normas.**
- Simplificar significa remover complexidade acidental de software (código inchado, arquiteturas desnecessárias).
- Os cálculos e dimensionamentos normativos (ABNT NBR 5410, ABNT NBR 17019, CEMIG ND-5.1 e ND-5.3) devem ser seguidos com rigor matemático absoluto.
