# Gestao de Orcamentos (CAPEX) - Master Data Hub & Leitor IA Multimodal

## Overview
Centralizacao do gerenciamento de materiais, composicoes de custo e fornecedores na Gestao de Orcamentos (CAPEX), tornando-a a Fonte Unica da Verdade (Master Data Hub) para todas as aplicacoes de engenharia da Cordeiro Energia (incluindo Padrao CEMIG e CoenergyGO). Integração do Leitor Inteligente de Cotacoes com IA Multimodal (Gemini 2.5) e conciliacao De-Para tipo Conta Azul diretamente no CAPEX, acompanhado de reestruturacao visual de alta densidade seguindo rigorosamente a identidade institucional de Planejamento de Carregadores Carro Eletrico (CoenergyGO) (#0A192F, #E45318, #00B356, Montserrat).

## Project Type
WEB (Next.js 14 / React 19, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL Supabase)

## Success Criteria
1. O Leitor Inteligente de Cotacoes (PDF/Imagem) e o Modal de Conciliacao De-Para estao nativamente embutidos no CAPEX (/orcamentos e /orcamentos/configuracoes).
2. O cadastro e consulta de fornecedores possui aba e endpoints dedicados (/api/orcamentos/fornecedores) no CAPEX.
3. A lista mestre de materiais (OrcamentoItemPadrao) alimenta o Padrao CEMIG (/api/cemig/materiais), garantindo que apenas dados mestres e menores precos sejam compartilhados entre modulos, mantendo os projetos de engenharia desacoplados.
4. O layout de /orcamentos e /orcamentos/configuracoes espelha o padrao institucional de CoenergyGO com cabecalho Dark Navy #0A192F, glows difusos, logo oficial, links para site e Instagram, e tipografia Montserrat.
5. npx tsc --noEmit passa com zero erros de tipagem.
