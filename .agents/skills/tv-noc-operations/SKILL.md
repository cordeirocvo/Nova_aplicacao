---
name: tv-noc-operations
description: Diretrizes de arquitetura e UX para painéis NOC e telas de TV 24/7 na Cordeiro Energia.
---

# TV & NOC Operations Guide

## 1. Princípios de Visualização à Distância
- Tipografia de alto contraste sobre fundo escuro (#0A192F) para salas de controle.
- Limite de informação por tela: foco nos 4 KPIs fundamentais para leitura instantânea a 5 metros.
- Semáforo de 3 estados com valores configuráveis:
  - Verde (#00B356): Ideal
  - Amarelo (#F59E0B): Atenção
  - Vermelho (#EF4444): Intervenção
- Cards em estado crítico recebem ordenação para o topo e borda luminosa pulsante.

## 2. Robustez Técnica 24/7
- Prevenção de vazamento de memória: limpar todos os intervalos e event listeners no desmontar do componente.
- Atualização em tempo real via heartbeat silencioso a cada 5s sem reload de página.
- Suporte a multi-telas independentes e modo híbrido.
