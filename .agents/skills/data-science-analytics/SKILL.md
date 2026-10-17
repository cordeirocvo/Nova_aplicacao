---
name: data-science-analytics
description: High-performance data engineering and analytics using Polars, DuckDB, Supabase (PostgreSQL), Parquet, and predictive modeling (XGBoost/Scikit-learn) with data hygiene checks and memory-efficient batch processing.
tools: Read, Grep, Glob, Bash, Edit, Write
---

# Data Science & High-Performance Analytics Skill

> Metodologia e padrões de engenharia para manipulação de dados em alta velocidade, validação de integridade e modelagem estatística no ecossistema Antigravity.

---

## 1. Princípios de Execução Tecnológica

### 1.1. Polars & DuckDB (Substituindo Pandas)
- **Quando usar Polars:** Para pipelines de transformação em memória, agregações analíticas complexas, transformações de séries temporais e manipulação de DataFrames com baixo footprint e paralelismo multinúcleo nativo (Rust).
  ```python
  import polars as pl

  # Leitura lazy e otimização de plano de execução
  df = (
      pl.scan_parquet("dados_telemetria_ev.parquet")
      .filter(pl.col("potencia_kw") > 0)
      .group_by("ponto_recarga_id")
      .agg([
          pl.col("energia_kwh").sum().alias("total_kwh"),
          pl.col("sessao_id").n_unique().alias("total_sessoes"),
          pl.col("duracao_min").mean().alias("media_min_sessao")
      ])
      .collect()
  )
  ```
- **Quando usar DuckDB:** Para consultas SQL analíticas diretamente sobre arquivos Parquet/CSV, junções de múltiplas tabelas analíticas ou persistência in-process sem necessidade de servidor dedicado.
  ```sql
  -- Consulta analítica DuckDB sobre Parquet com zero cópia de memória
  SELECT 
      DATE_TRUNC('hour', inicio_sessao) AS hora,
      COUNT(DISTINCT sessao_id) AS sessoes_ativas,
      SUM(energia_kwh) AS demanda_total_kwh,
      AVG(potencia_pico_kw) AS potencia_media_kw
  FROM read_parquet('historico_recargas/*.parquet')
  GROUP BY 1
  ORDER BY 1;
  ```

### 1.2. Integração Supabase (PostgreSQL)
- Conexão via clientes otimizados com pooling ou chamadas RPC/REST via Webhooks.
- Extrações analíticas com paginação baseada em cursor para evitar saturação de buffer.
- Inserções analíticas consolidadas em lotes (`batch_size=500` a `1000`).

---

## 2. Checklist Obrigatório de Integridade (Data Hygiene First)

Antes de executar qualquer treinamento ou cálculo de agregação:
1. **Null/Missing Values:**
   - Contabilizar percentual de nulos por coluna.
   - Definir política explícita de imputação (média, mediana, interpolação temporal ou descarte documentado).
2. **Type Enforcement:**
   - Converter colunas numéricas de strings (remover vírgulas, caracteres de moeda `R$` e converter para float/decimal).
   - Padronizar timestamps em UTC e converter para o fuso local da instalação (ex: `America/Sao_Paulo`).
3. **Outlier & Physical Boundary Checks:**
   - Garantir coerência física: `energia_kwh >= 0`, `potencia_kw <= potencia_max_carregador`, `fator_potencia BETWEEN 0.8 AND 1.0`.

---

## 3. Eficiência de Código & Processamento em Lote (Batching)

Para processar simultaneamente dezenas ou centenas de empresas/CNPJs ou pontos de recarga:
- Nunca iterar linha a linha em loops Python puros (`iterrows` do Pandas é expressamente proibido).
- Aplicar transformações vetorizadas (`pl.Expr`) ou SQL de agregação por janela (`OVER (PARTITION BY cnpj)`).
- Limpar variáveis pesadas com `del df` e `gc.collect()` após a escrita do Parquet de saída.
