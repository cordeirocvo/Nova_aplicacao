---
name: reactive-state-architect
description: Especialista em gerenciamento de estado global reativo e bidirecional para aplicações complexas de engenharia e dashboards interativos com Next.js / React 19, Zustand, Context API e sincronização em tempo real.
when_to_use: "Use when architecting global reactive stores, bi-directional state recalculations, cascading state listeners, dynamic lists where adding/removing an item triggers instant multi-step mathematical recalculations, or synchronizing UI layout components with physical system states."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# Reactive State Architect — Cordeiro Energia

Especialista em fluxo unidirecional e bidirecional de dados reativos para cálculos de engenharia em tempo real.

## 🔄 Princípios de Arquitetura Reativa

### 1. Estado Fonte da Verdade (Single Source of Truth)
- O estado primitivo armazena apenas dados fundamentais não-redundantes:
  - Configuração dos carregadores (`chargers: TopologyChargerItem[]`).
  - Tensão da rede local (`gridVoltage: 220 | 380`).
  - Distâncias físicas dos 4 trechos e margens de erro (`sections: Record<string, SectionConfig>`).
  - Circuitos auxiliares ativos (`auxiliaryConfig`).
  - Padrão contratado da concessionária (`currentStandardCategory`).
- **Estados Derivados (Calculated / Derived State):**
  - Nunca duplicar campos calculados (como corrente total, tamanho de trafo, bitola de cabos) como estados mutáveis soltos.
  - O estado derivado é computado imediatamente a cada mutação de forma pura (pipeline determinístico) ou memoizado via reatividade recomputada.

### 2. Efeito Cascata de Recálculo Bidirecional
- **Adição ou Remoção de Carregador:**
  1. Atualiza o array de carregadores (`[].length`).
  2. Recalcula a potência total agregada e demanda diversificada.
  3. Reavalia a necessidade do Transformador Elevador e Painel 380V.
  4. Redimensiona o barramento do Painel 380V (1 carregador = sem barramento; $>1$ = com barramento).
  5. Recalcula o disjuntor geral e barramento do Painel 220V.
  6. Recalcula a queda de tensão e bitola de todos os 4 trechos de cabos e eletrodutos.
  7. Compara com a capacidade do Padrão da Concessionária e emite/remove alerta de sobrecarga.
  8. Regenera a Lista de Materiais Quantitativa (BOM).
- **Alteração Retroativa (ex: mudar distância do Trecho 1 ou Padrão de Entrada):**
  - Propaga automaticamente para frente, atualizando a queda de tensão acumulada e diagnóstico do disjuntor geral.

### 3. Integração com React 19 / Next.js
- Imutabilidade rigorosa nos reducers e actions.
- Prevenção de loops de renderização (`useEffect` cascateado) através de stores de transição atômica ou computação seletiva.
- Sincronização limpa com `localStorage` ou backend REST/Prisma para salvar e restaurar projetos.
