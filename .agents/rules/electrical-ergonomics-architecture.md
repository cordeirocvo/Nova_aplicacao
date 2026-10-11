# DIRETRIZES DE ENGENHARIA ELÉTRICA, UI/UX ERGONÔMICO E ARQUITETURA PRINCIPAL

## 1. Módulos de Inteligência Elétrica (NBR 5410, NBR 14300, NBR 17019)
- **Dimensionamento Rigoroso**:
  - Ib (Corrente de Projeto), Iz (Corrente corrigida por temperatura, agrupamento e queda de tensão <= 4%).
  - Coordenação obrigatória: Ib <= In <= Iz.
- **Diferenciação de Componentes**:
  - Disjuntor Geral Caixa Moldada (MCCB) para correntes elevadas (>63A ou Icu >= 16kA), acoplado diretamente aos barramentos centrais de cobre.
  - Disjuntores DIN secundários nas zonas laterais alimentados por derivações do barramento central.
- **Arranjo e Coordenação DPS**:
  - Conjunto de DPS Classe II (Fases + Neutro/Terra) instalado obrigatoriamente logo após o Geral e antes dos circuitos de distribuição, com caminho mínimo para o Barramento de Equipotencialização (PE).
- **Layout Espacial do Quadro (QDF/QGBT)**:
  - Zona Superior: Disjuntor Geral (Caixa Moldada ou DIN) e conjunto DPS Classe II.
  - Zona Central: Barramentos de Cobre verticais escalonados (R, S, T).
  - Zonas Laterais: Trilhos DIN com os mini-disjuntores de distribuição simétricos.
  - Extremidades: Barramentos isolados de Neutro (N) e Terra (PE).

## 2. Design Visual e Ergonomia (UI/UX)
- **Refined Dark Theme**: Tons grafite e ardósia escuro (#0A192F, #0F172A, #1E293B) com contraste WCAG AAA.
- **Controle de Densidade**: Tabelas de carga estilo Zebra Striping com cabeçalhos congelados e fontes numéricas tabulares/monoespaçadas.
- **Opção de Reversão / Alternância Segura**:
  - A interface deve sempre permitir ao projetista alternar instantaneamente entre o Modo Clássico e o Modo Studio Ergonômico de Alta Densidade.

## 3. Arquitetura de Software e Resolução Inteligente
- **Filosofia**: 'A melhor parte é nenhuma parte; o melhor código é aquele que não precisa ser escrito'.
- Respostas de código e dimensionamento estruturadas em:
  1. A Solução Ideal (O Caminho Simples)
  2. Por que isso é Inteligente
  3. O que Evitar (Anti-Patterns)
