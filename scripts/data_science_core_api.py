"""
Antigravity Secure Data Science & Geo Engine API
Cordeiro Energia / CoenergyGO

Recursos Integrados:
1. Autenticação Segura JWT (Bearer Token)
2. Ingestão de Dados Brutos com Limpeza Paralela via Polars
3. Mapeamento Geoespacial com Cálculo Trigonométrico Haversine no DuckDB
4. Exportação de Relatórios Gerenciais em PDF via ReportLab
5. Validação Estrutural e Resiliência de Arquivos Parquet
"""

import os
import io
import duckdb
import polars as pl
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

# ReportLab para geração de relatórios em PDF
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

app = FastAPI(
    title="Antigravity Secure Data Science & Geo Engine",
    description="Engine OLAP protegida por JWT com ingestão Parquet, cálculo geodésico Haversine e relatórios PDF.",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CONFIGURAÇÃO DE SEGURANÇA (JWT) ─────────────────────────────────────────
SECRET_KEY = os.getenv("ANTIGRAVITY_JWT_SECRET", "cordeiro_energia_secret_key_super_segura_2026_antigravity")
ALGORITHM = "HS256"
API_CLIENT_ID = "antigravity_frontend"

security = HTTPBearer(auto_error=False)


def verificar_token_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Valida o token Bearer JWT enviado pelo frontend ou permite bypass em dev se configurado."""
    if not credentials:
        # Permitir requisições locais de desenvolvimento se variável permitir
        if os.getenv("ANTIGRAVITY_DEV_MODE", "false").lower() == "true":
            return API_CLIENT_ID
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado. Forneça o Header 'Authorization: Bearer <TOKEN>'."
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        client_id: str = payload.get("sub")
        if client_id != API_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: Cliente não autorizado."
            )
        return client_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido, expirado ou malformado."
        )


# ─── CAMINHOS DOS ARQUIVOS PARQUET ───────────────────────────────────────────
DIR_DADOS = os.path.join(os.path.dirname(__file__), "..", "dados_locais")
CAMINHO_METRICAS = os.path.join(DIR_DADOS, "historico_metricas.parquet")
CAMINHO_CADASTRO = os.path.join(DIR_DADOS, "cadastro_ativos.parquet")
CAMINHO_ESTACOES = os.path.join(DIR_DADOS, "infraestrutura_estacoes.parquet")


def validar_integridade_parquet(caminho_arquivo: str) -> None:
    """Camada de Segurança: Verifica existência física, tamanho e metadados."""
    if not os.path.exists(caminho_arquivo):
        raise FileNotFoundError(f"Arquivo ausente: '{os.path.basename(caminho_arquivo)}'")
    if os.path.getsize(caminho_arquivo) == 0:
        raise ValueError(f"Arquivo corrompido ou vazio (0 bytes): '{os.path.basename(caminho_arquivo)}'")
    try:
        pl.scan_parquet(caminho_arquivo).collect_schema()
    except Exception as e:
        raise TypeError(f"Arquivo Parquet inválido: '{os.path.basename(caminho_arquivo)}'. Erro: {str(e)}")


def inicializar_dados_se_necessario() -> None:
    """Inicializa arquivos base caso ainda não existam."""
    os.makedirs(DIR_DADOS, exist_ok=True)
    
    if not os.path.exists(CAMINHO_CADASTRO):
        df_cadastro = pl.DataFrame({
            "codigo_ref": ["ELETRO_BH_01", "ELETRO_SP_02"],
            "nome_local": ["Hub Av. Amazonas (Drogaria Araujo)", "Hub Marginal Pinheiros (Posto 24h)"],
            "capacidade_max": [500, 1200]
        })
        df_cadastro.write_parquet(CAMINHO_CADASTRO)

    if not os.path.exists(CAMINHO_METRICAS):
        df_metricas = pl.DataFrame({
            "id_registro": [1, 2, 3, 4, 5],
            "codigo_ref": ["ELETRO_BH_01", "ELETRO_SP_02", "ELETRO_BH_01", "ELETRO_SP_02", "ELETRO_BH_01"],
            "data_registro": ["2026-10-15", "2026-10-15", "2026-10-16", "2026-10-16", "2026-10-17"],
            "valor_realizado": [120.5, 85.0, 140.2, 90.5, 155.0],
            "valor_projetado": [115.0, 90.0, 135.0, 90.0, 150.0]
        })
        df_metricas.write_parquet(CAMINHO_METRICAS)

    if not os.path.exists(CAMINHO_ESTACOES):
        df_geo = pl.DataFrame([
            {"id_estacao": "SL_001", "nome": "Hub Urbano Olavo Bilac Canaã (Cordeiro Energia)", "lat": -19.471676, "lon": -44.258735, "potencia_kw": 60.0, "status": "Disponível"},
            {"id_estacao": "SL_002", "nome": "Shopping Sete Lagoas (Estacionamento Lazer)", "lat": -19.473734, "lon": -44.271598, "potencia_kw": 22.0, "status": "Disponível"},
            {"id_estacao": "SL_003", "nome": "Posto Shell Rápido Centro (Av. Antônio Olinto)", "lat": -19.454817, "lon": -44.244584, "potencia_kw": 50.0, "status": "Ocupado"},
            {"id_estacao": "SL_004", "nome": "Posto Ipiranga Rota Gruta Rei do Mato (BR-040 Sul)", "lat": -19.495040, "lon": -44.283044, "potencia_kw": 120.0, "status": "Disponível"},
            {"id_estacao": "SL_005", "nome": "Posto Três Marias / Graal Sete Lagoas (BR-040 Norte)", "lat": -19.4350, "lon": -44.2210, "potencia_kw": 60.0, "status": "Disponível"},
            {"id_estacao": "MG_001", "nome": "Posto Décio Curvelo (Trevo BR-040)", "lat": -18.7500, "lon": -44.4300, "potencia_kw": 180.0, "status": "Disponível"},
            {"id_estacao": "MG_002", "nome": "Hub Pedro Leopoldo / Confins", "lat": -19.6200, "lon": -44.0500, "potencia_kw": 150.0, "status": "Disponível"},
            {"id_estacao": "E001", "nome": "Eletroposto Av. Amazonas 2000", "lat": -19.9275, "lon": -43.9558, "potencia_kw": 120.0, "status": "Disponível"},
            {"id_estacao": "E002", "nome": "Rodovia BR-040 Km 450", "lat": -19.9500, "lon": -44.0200, "potencia_kw": 150.0, "status": "Ocupado"},
            {"id_estacao": "E003", "nome": "Posto Urbano Savassi Sul", "lat": -19.9380, "lon": -43.9350, "potencia_kw": 60.0, "status": "Disponível"},
            {"id_estacao": "E004", "nome": "Shopping Cidade BH", "lat": -19.9190, "lon": -43.9410, "potencia_kw": 22.0, "status": "Manutenção"},
            {"id_estacao": "E005", "nome": "Eletroposto Pampulha Hub", "lat": -19.8520, "lon": -43.9710, "potencia_kw": 50.0, "status": "Disponível"}
        ])
        df_geo.write_parquet(CAMINHO_ESTACOES)


@app.on_event("startup")
async def startup_event():
    inicializar_dados_se_necessario()


# ─── ROTAS DE AUTENTICAÇÃO ───────────────────────────────────────────────────
@app.post("/api/v1/auth/token", tags=["Autenticação"], summary="Gera Token JWT de teste")
async def gerar_token_teste():
    tempo_expiracao = datetime.now(timezone.utc) + timedelta(hours=4)
    payload = {"sub": API_CLIENT_ID, "exp": tempo_expiracao}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "expires_in_hours": 4}


# ─── INGESTÃO DE DADOS COM LIMPEZA POLARS ────────────────────────────────────
@app.post("/api/v1/ingestao/atualizar", tags=["Ingestão de Dados"], summary="ETL de dados brutos com limpeza Polars")
async def executar_ingestao_automatica(client_id: str = Depends(verificar_token_jwt)):
    """Recebe ou simula dados brutos, aplica limpeza vetorial no Polars e salva em Parquet."""
    inicializar_dados_se_necessario()
    dados_brutos = [
        {"id": "1", "codigo": " eletro_bh_01 ", "data": "2026-10-15", "realizado": "120.5", "projetado": 115.0},
        {"id": "2", "codigo": "ELETRO_SP_02", "data": "2026-10-15", "realizado": None, "projetado": 90.0},
        {"id": "3", "codigo": "ELETRO_BH_01", "data": "2026-10-16", "realizado": "140.2", "projetado": 135.0},
        {"id": "4", "codigo": "ELETRO_SP_02 ", "data": "2026-10-16", "realizado": "90.5", "projetado": 90.0},
        {"id": "5", "codigo": "ELETRO_BH_01", "data": "2026-10-17", "realizado": "158.0", "projetado": 150.0}
    ]

    try:
        df_limpo = (
            pl.DataFrame(dados_brutos)
            .with_columns([
                pl.col("codigo").str.strip_chars().str.to_uppercase(),
                pl.col("realizado").cast(pl.Float64).fill_null(0.0),
                pl.col("projetado").cast(pl.Float64),
                pl.col("data").cast(pl.String)
            ])
            .rename({
                "id": "id_registro",
                "codigo": "codigo_ref",
                "data": "data_registro",
                "realizado": "valor_realizado",
                "projetado": "valor_projetado"
            })
        )

        df_limpo.write_parquet(CAMINHO_METRICAS)
        return {
            "status": "sucesso",
            "registros_processados": len(df_limpo),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha na ingestão: {str(e)}")


# ─── ENDPOINT OLAP PROTEGIDO POR TOKEN ───────────────────────────────────────
@app.get("/api/v1/dashboard/analitico", tags=["Analytics Dashboard"], summary="Métricas consolidadas (JSON Schema)")
async def obter_dados_dashboard(client_id: str = Depends(verificar_token_jwt)):
    inicializar_dados_se_necessario()
    validar_integridade_parquet(CAMINHO_METRICAS)
    validar_integridade_parquet(CAMINHO_CADASTRO)

    con = None
    try:
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
        df_resultado = con.execute(query_olap).pl()

        media_desvio = float(df_resultado["desvio_percentual"].mean())
        status_kpi = "sucesso" if media_desvio >= 0 else "alerta" if media_desvio >= -10 else "perigo"

        payload = {
            "status": "sucesso",
            "timestamp_atualizacao": datetime.now(timezone.utc).isoformat(),
            "kpis_gerenciais": [
                {
                    "id": "kpi_realizado",
                    "titulo": "Energia Entregue Realizada",
                    "valor": round(float(df_resultado["total_realizado"].sum()), 2),
                    "tipo_sufixo": "kWh",
                    "variacao_percentual": round(media_desvio, 2),
                    "status_alerta": status_kpi
                },
                {
                    "id": "kpi_capacidade",
                    "titulo": "Capacidade Ativa Total",
                    "valor": int(df_resultado["capacidade"].unique().sum()),
                    "tipo_sufixo": "kWp",
                    "variacao_percentual": 0.0,
                    "status_alerta": "neutro"
                }
            ],
            "series_temporais": df_resultado.to_dicts()
        }
        return JSONResponse(content=payload, status_code=200)
    finally:
        if con is not None:
            con.close()


# ─── MAPEAMENTO GEOESPACIAL COM HAVERSINE NO DUCKDB ──────────────────────────
@app.get("/api/v1/geo/mapear-raio", tags=["Geo Mapeamento"], summary="Busca estações via Haversine no DuckDB")
async def mapear_estacoes_proximas(
    latitude_ponto: float = -19.9275, 
    longitude_ponto: float = -43.9558, 
    raio_km: float = 15.0,
    client_id: str = Depends(verificar_token_jwt)
):
    """Calcula distâncias físicas instantâneas a partir de coordenadas usando trigonometria no DuckDB."""
    inicializar_dados_se_necessario()
    validar_integridade_parquet(CAMINHO_ESTACOES)

    con = None
    try:
        con = duckdb.connect(database=':memory:')
        path_g = CAMINHO_ESTACOES.replace("\\", "/")

        query_haversine = f"""
            SELECT 
                nome,
                potencia_kw,
                status,
                lat as latitude,
                lon as longitude,
                ROUND(6371 * acos(
                    cos(radians({latitude_ponto})) * cos(radians(lat)) * 
                    cos(radians(lon) - radians({longitude_ponto})) + 
                    sin(radians({latitude_ponto})) * sin(radians(lat))
                ), 2) AS distancia_km
            FROM '{path_g}'
            WHERE distancia_km <= {raio_km}
            ORDER BY distancia_km ASC
        """
        df_proximas = con.execute(query_haversine).pl()

        payload_geo = {
            "status": "sucesso",
            "ponto_referencia": {"lat": latitude_ponto, "lon": longitude_ponto},
            "raio_busca_km": raio_km,
            "total_encontrado": len(df_proximas),
            "estacoes": df_proximas.to_dicts()
        }
        return JSONResponse(content=payload_geo, status_code=200)
    finally:
        if con is not None:
            con.close()


# ─── EXPORTAÇÃO DE RELATÓRIO EXECUTIVO EM PDF VIA REPORTLAB ─────────────────
@app.get("/api/v1/dashboard/exportar-pdf", tags=["Analytics Dashboard"], summary="Gera PDF executivo com métricas")
async def exportar_dashboard_pdf(client_id: str = Depends(verificar_token_jwt)):
    """Gera um PDF formatado com base nas consultas OLAP do DuckDB diretamente em stream de memória."""
    inicializar_dados_se_necessario()
    validar_integridade_parquet(CAMINHO_METRICAS)
    validar_integridade_parquet(CAMINHO_CADASTRO)

    con = None
    try:
        con = duckdb.connect(database=':memory:')
        path_m = CAMINHO_METRICAS.replace("\\", "/")
        path_c = CAMINHO_CADASTRO.replace("\\", "/")

        query_olap = f"""
            SELECT 
                m.data_registro as data, c.nome_local as local,
                SUM(m.valor_realizado) as realizado, SUM(m.valor_projetado) as projetado
            FROM '{path_m}' m
            JOIN '{path_c}' c ON m.codigo_ref = c.codigo_ref
            GROUP BY m.data_registro, c.nome_local
            ORDER BY m.data_registro ASC
        """
        df_resultado = con.execute(query_olap).pl()
    finally:
        if con is not None:
            con.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40,
        title="Relatorio_Gerencial_Cordeiro_Energia"
    )

    styles = getSampleStyleSheet()
    elementos = []

    estilo_titulo = ParagraphStyle(
        'TituloCordeiro', parent=styles['Heading1'], fontSize=20,
        textColor=colors.HexColor("#0A192F"), spaceAfter=10, fontName='Helvetica-Bold'
    )
    estilo_subtitulo = ParagraphStyle(
        'SubtituloCordeiro', parent=styles['Normal'], fontSize=10,
        textColor=colors.HexColor("#E45318"), spaceAfter=15, fontName='Helvetica-Bold'
    )
    estilo_texto = ParagraphStyle(
        'TextoCordeiro', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#475569")
    )

    elementos.append(Paragraph("Cordeiro Energia — CoenergyGO Analytics", estilo_titulo))
    elementos.append(Paragraph("Dossiê Analítico de Desempenho Operacional & Scoring", estilo_subtitulo))
    elementos.append(Paragraph(f"Data de Emissão: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S UTC')}", estilo_texto))
    elementos.append(Spacer(1, 15))

    dados_tabela = [["Data", "Localidade / Hub", "Realizado (kWh)", "Projetado (kWh)"]]
    for r in df_resultado.to_dicts():
        dados_tabela.append([
            r["data"],
            r["local"],
            f"{r['realizado']:.1f}",
            f"{r['projetado']:.1f}"
        ])

    tabela = Table(dados_tabela, colWidths=[90, 210, 110, 110])
    tabela.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0A192F")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))

    elementos.append(tabela)
    doc.build(elementos)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio_gerencial_cordeiro.pdf"}
    )


if __name__ == "__main__":
    import uvicorn
    print("Iniciando Antigravity Secure Data Science & Geo Engine na porta 8000...")
    uvicorn.run("data_science_core_api:app", host="0.0.0.0", port=8000, reload=True)
