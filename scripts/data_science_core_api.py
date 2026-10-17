"""
Antigravity Data Science Core API
Engine OLAP de Alta Performance com FastAPI, DuckDB, Polars e Validação Estrutural de Parquet.
Cordeiro Energia / CoenergyGO
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, List
import duckdb
import polars as pl
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Antigravity Data Science Core API",
    description="Engine OLAP de alta performance com DuckDB, Polars e validação estrutural de dados para a Cordeiro Energia.",
    version="1.0.0"
)

# Habilitar CORS para permitir consumo pelo frontend Next.js local (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diretório e caminhos dos arquivos Parquet alvo
DIR_DADOS = os.path.join(os.path.dirname(__file__), "..", "dados_locais")
CAMINHO_METRICAS = os.path.join(DIR_DADOS, "historico_metricas.parquet")
CAMINHO_CADASTRO = os.path.join(DIR_DADOS, "cadastro_ativos.parquet")


def inicializar_dados_demonstrativos_se_necessario() -> None:
    """Garante que existam arquivos Parquet válidos para testes locais imediatos."""
    os.makedirs(DIR_DADOS, exist_ok=True)
    if not os.path.exists(CAMINHO_METRICAS) or not os.path.exists(CAMINHO_CADASTRO):
        df_metricas = pl.DataFrame({
            "id_registro": [1, 2, 3, 4, 5],
            "codigo_ref": ["ELETRO_BH_01", "ELETRO_SP_02", "ELETRO_BH_01", "ELETRO_SP_02", "ELETRO_BH_01"],
            "data_registro": ["2026-10-15", "2026-10-15", "2026-10-16", "2026-10-16", "2026-10-17"],
            "valor_realizado": [120.5, 85.0, 140.2, 90.5, 155.0],
            "valor_projetado": [115.0, 90.0, 135.0, 90.0, 150.0]
        })

        df_cadastro = pl.DataFrame({
            "codigo_ref": ["ELETRO_BH_01", "ELETRO_SP_02"],
            "nome_local": ["Hub Av. Amazonas (Drogaria Araujo)", "Hub Marginal Pinheiros (Posto 24h)"],
            "capacidade_max": [500, 1200]
        })

        df_metricas.write_parquet(CAMINHO_METRICAS)
        df_cadastro.write_parquet(CAMINHO_CADASTRO)


def validar_integridade_parquet(caminho_arquivo: str) -> None:
    """
    Camada de Segurança & Resiliência:
    Verifica se o arquivo existe, se está vazio ou corrompido,
    impedindo que falhas de I/O travem o motor DuckDB.
    """
    if not os.path.exists(caminho_arquivo):
        raise FileNotFoundError(f"Arquivo ausente: '{os.path.basename(caminho_arquivo)}'")
    
    if os.path.getsize(caminho_arquivo) == 0:
        raise ValueError(f"Arquivo corrompido ou vazio (0 bytes): '{os.path.basename(caminho_arquivo)}'")
    
    try:
        # Validação estrutural de metadados sem carregar dados em memória (Polars 2.0+)
        pl.scan_parquet(caminho_arquivo).collect_schema()
    except Exception as e:
        raise TypeError(f"Arquivo Parquet inválido ou corrompido: '{os.path.basename(caminho_arquivo)}'. Erro: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Inicializa arquivos no boot se não existirem."""
    inicializar_dados_demonstrativos_se_necessario()


@app.get("/health", summary="Healthcheck da API")
async def health():
    return {"status": "online", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get(
    "/api/v1/dashboard/analitico",
    summary="Retorna os dados analíticos consolidados no padrão Antigravity Dashboard Engine",
    response_class=JSONResponse
)
async def obter_dados_dashboard():
    """
    Endpoint assíncrono que valida os arquivos físicos Parquet locais,
    executa a agregação analítica no DuckDB com zero-copy para Polars
    e responde no contrato JSON Schema oficial do Antigravity.
    """
    inicializar_dados_demonstrativos_se_necessario()

    try:
        validar_integridade_parquet(CAMINHO_METRICAS)
        validar_integridade_parquet(CAMINHO_CADASTRO)
    except FileNotFoundError as err_ausente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err_ausente))
    except (ValueError, TypeError) as err_estrutura:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err_estrutura))

    con = None
    try:
        # Conexão isolada em memória por requisição (Thread-safe)
        con = duckdb.connect(database=':memory:')
        
        path_m = CAMINHO_METRICAS.replace("\\", "/")
        path_c = CAMINHO_CADASTRO.replace("\\", "/")

        query_olap = f"""
            SELECT 
                m.data_registro as data,
                c.nome_local as local,
                c.capacidade_max as capacidade,
                SUM(m.valor_realizado) as total_realizado,
                SUM(m.valor_projetado) as total_projetado,
                ROUND(((SUM(m.valor_realizado) - SUM(m.valor_projetado)) / SUM(m.valor_projetado)) * 100, 2) as desvio_percentual
            FROM '{path_m}' m
            JOIN '{path_c}' c ON m.codigo_ref = c.codigo_ref
            GROUP BY m.data_registro, c.nome_local, c.capacidade_max
            ORDER BY m.data_registro ASC
        """
        
        # Converte o resultado para DataFrame Polars sem custo de cópia de memória (Apache Arrow)
        df_resultado = con.execute(query_olap).pl()

        if df_resultado.is_empty():
            raise ValueError("Fontes de dados válidas, mas nenhum registro correspondeu ao cruzamento.")

        media_desvio = float(df_resultado["desvio_percentual"].mean())
        status_kpi = "sucesso" if media_desvio >= 0 else "alerta" if media_desvio >= -10 else "perigo"

        # Constrói o payload dinâmico exatamente casado com o JSON Schema do Frontend
        payload_final: Dict[str, Any] = {
            "status": "sucesso",
            "timestamp_atualizacao": datetime.now(timezone.utc).isoformat(),
            "kpis_gerenciais": [
                {
                    "id": "kpi_realizado",
                    "titulo": "Total Realizado",
                    "valor": round(float(df_resultado["total_realizado"].sum()), 2),
                    "tipo_sufixo": "R$",
                    "variacao_percentual": round(media_desvio, 2),
                    "status_alerta": status_kpi
                },
                {
                    "id": "kpi_capacidade",
                    "titulo": "Capacidade Ativa",
                    "valor": int(df_resultado["capacidade"].unique().sum()),
                    "tipo_sufixo": "kWp",
                    "variacao_percentual": 0.0,
                    "status_alerta": "neutro"
                }
            ],
            "series_temporais": df_resultado.to_dicts()
        }
        
        return JSONResponse(content=payload_final, status_code=status.HTTP_200_OK)

    except ValueError as err_regra:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT, detail=str(err_regra))
    except Exception as err_interno:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno no processamento analítico: {str(err_interno)}"
        )
    finally:
        if con is not None:
            con.close()


if __name__ == "__main__":
    import uvicorn
    print("Iniciando Antigravity Data Science Core API na porta 8000...")
    uvicorn.run("data_science_core_api:app", host="0.0.0.0", port=8000, reload=True)
