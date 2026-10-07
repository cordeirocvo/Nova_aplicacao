---
name: dynamic-ui-component-builder
description: Instruções e padrões para gerar interfaces ricas baseadas em dados dinâmicos clicáveis, onde renderizações orientadas a arrays ([].map()) controlam em tempo real fotos, cards, nós de processo e gavetas de edição conforme as interações do usuário.
when_to_use: "Use when creating dynamic UI dashboards, interactive process chain diagrams, clickable flow components where clicking an item opens an edit drawer or modal, and arrays of cards (chargers, equipment) whose visual quantity and state strictly mirror the underlying system data."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# Dynamic UI Component Builder — Cordeiro Energia

Especialista em construção de interfaces interativas, responsivas e orientadas a dados (Data-Driven UI).

## 🎨 Princípios de Design e Interatividade

### 1. Correspondência Visual 1:1 com o Estado Físico
- O número de imagens, ícones e cards visíveis na tela reflete rigorosamente o estado atual da lista de equipamentos:
  - Se houver 3 carregadores no array, são renderizados exatamente 3 cards com suas fotos/ícones correspondentes.
  - Se o usuário clicar em "Remover", a animação remove o card e o array passa a ter 2 itens, disparando o recálculo imediato.
  - Se o transformador for dispensado, o bloco do trafo e do painel 380V são suprimidos ou apresentados com animação clara de bypass direto.

### 2. Edição Direta por Clique no Componente (Direct Manipulation)
- Cada bloco da cadeia topológica é um componente interativo clicável:
  - **Clique no Padrão:** Abre gaveta/modal com dados da concessionária (disjuntor, fases, bitola da rede, medição).
  - **Clique no Painel 220V:** Abre configuração dos circuitos auxiliares (toggles de CFTV, tomadas de manutenção, iluminação em Watts).
  - **Clique no Transformador:** Abre especificações técnicas detalhadas ($kVA$, Dyn1, perdas e rendimento).
  - **Clique no Painel 380V:** Abre visualização do barramento (ou aviso de disjuntor único para 1 carregador) e proteções DR Tipo B.
  - **Clique em um Carregador $i$:** Abre configuração individual de potência, distância do trecho até o painel e margem de erro do cabo.

### 3. Padrões de Layout e Estilo Cordeiro Energia
- Paleta Institucional:
  - Laranja Cordeiro: `#E45318`
  - Verde Cordeiro: `#00B356`
  - Dark Navy: `#0A192F`
  - Superfícies: `#F8FAFC` e Dark Cards `#0F172A`
- Feedback Visual Imediato: Badges de status normativo (verde para adequado, amarelo para atenção, vermelho para sobrecarga/intervenção).
- Conectores de Fluxo: Linhas e setas entre os blocos indicando os 4 trechos de cabos com suas bitolas e quedas de tensão calculadas.
