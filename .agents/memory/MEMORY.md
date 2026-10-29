# Memory Index

## Project
- [project] Always create a new dedicated branch for major code changes → project-conventions.md
- [project] AG Kit only supports Gemini CLI and Google Antigravity (not other AI coding tools) → project-conventions.md
- [project] Component metadata uses SemVer while toolkit releases use CalVer → tech-decisions.md
- [electrical-cad] Arquitetura de Quadros Elétricos segue NBR 5410/17019 com Geral (Caixa Moldada quando >63A ou Icu>=16kA), DPS Classe II e barramentos centrais R, S, T.
- [ergonomics-ui] Suporte a alternância entre Modo Clássico e Modo Studio Ergonômico Dark com contraste WCAG AAA e tabelas numéricas tabulares.
- [ui-ux-ergonomics] Refined Dark Theme (#0A192F, slate-900, slate-950, sem #000 puro), Information Density Control com cards colapsáveis e skeletons estruturados, cores semafóricas funcionais (vermelho suave, âmbar quente, verde pastel, azul técnico), fontes tabulares/mono (Montserrat + JetBrains Mono/mono) e geração de relatórios em < 3 cliques.
- [principal-engineer] Mentalidade de Primeiros Princípios e minimalismo radical ("o melhor código é aquele que não precisa ser escrito"). Respostas de implementação/arquitetura sempre em 3 seções: 1. A Solução Ideal (O Caminho Simples), 2. Por que isso é Inteligente, 3. O que Evitar (Anti-Patterns). Módulos: mcp-code-optimizer, mcp-architecture-blueprint, mcp-logic-validator.
- [data-science-analytics] Agente Especialista em Ciência de Dados & Analytics (@data-scientist): Operações com Polars/DuckDB, Supabase (PostgreSQL), Parquet/CSV, modelagem preditiva/XGBoost, análise primária de integridade de dados (Data Hygiene), processamento em lote (batching) e scoring locacional de eletropostos (VDM, frota VE, âncoras comerciais, potência BT Grupo F/MT).
- [cemig-mt] Projetos de cabine/subestação MT CEMIG → skill `cemig-subestacao-mt` (ND-5.3 SET/2023 + ND-5.31 JUN/2024). Em 13,8 kV a SE nº 2 está vedada (individual desde 03/07/2023, compartilhada desde 01/01/2024); SE 1/3 descontinuadas → padrão é a SE nº 4 blindada (PEC-11). Referência aprovada: NS 1154922565 (UFV Manga Grande, Setta Power Salt, 7SR1004).
