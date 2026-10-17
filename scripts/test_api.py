"""
Testes Automatizados de Segurança e Pipeline OLAP
Pytest + TestClient (FastAPI) + HTTPX
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from jose import jwt

# Importa o app FastAPI e as configurações
from scripts.data_science_core_api import (
    app, SECRET_KEY, ALGORITHM, API_CLIENT_ID, CAMINHO_METRICAS, CAMINHO_CADASTRO, CAMINHO_ESTACOES
)

client = TestClient(app)


@pytest.fixture
def token_valido():
    """Gera um token JWT válido para testes de endpoints protegidos."""
    tempo_expiracao = datetime.now(timezone.utc) + timedelta(hours=2)
    payload = {"sub": API_CLIENT_ID, "exp": tempo_expiracao}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def test_endpoint_sem_token_deve_retornar_401():
    """Garante que requisições sem o header de autorização sejam bloqueadas."""
    resposta = client.get("/api/v1/dashboard/analitico")
    assert resposta.status_code == 401
    assert "Não autenticado" in resposta.json()["detail"]


def test_endpoint_com_token_invalido_deve_retornar_401():
    """Garante que tokens malformados sejam rejeitados."""
    headers = {"Authorization": "Bearer token_falso_invalido_123"}
    resposta = client.get("/api/v1/dashboard/analitico", headers=headers)
    assert resposta.status_code == 401


def test_gerar_token_auth():
    """Testa a geração de token no endpoint de autenticação."""
    resposta = client.post("/api/v1/auth/token")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert "access_token" in dados
    assert dados["token_type"] == "bearer"


def test_pipeline_ingestao_com_sucesso(token_valido):
    """Testa se o fluxo de ETL roda e gera o arquivo Parquet limpo."""
    headers = {"Authorization": f"Bearer {token_valido}"}
    resposta = client.post("/api/v1/ingestao/atualizar", headers=headers)
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "sucesso"
    assert os.path.exists(CAMINHO_METRICAS)


def test_dashboard_analitico_com_sucesso(token_valido):
    """Garante que com token válido a resposta atenda ao JSON Schema oficial."""
    headers = {"Authorization": f"Bearer {token_valido}"}
    resposta = client.get("/api/v1/dashboard/analitico", headers=headers)
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["status"] == "sucesso"
    assert "kpis_gerenciais" in dados
    assert "series_temporais" in dados
    assert len(dados["kpis_gerenciais"]) > 0


def test_mapeamento_geo_haversine(token_valido):
    """Testa o cálculo trigonométrico Haversine para busca de estações."""
    headers = {"Authorization": f"Bearer {token_valido}"}
    resposta = client.get(
        "/api/v1/geo/mapear-raio?latitude_ponto=-19.9275&longitude_ponto=-43.9558&raio_km=20.0",
        headers=headers
    )
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["status"] == "sucesso"
    assert "estacoes" in dados
    assert dados["total_encontrado"] > 0
    # Verifica se a estação mais próxima está dentro do raio
    assert dados["estacoes"][0]["distancia_km"] <= 20.0


def test_exportacao_pdf_retorna_stream(token_valido):
    """Testa a geração em tempo real de PDF estruturado."""
    headers = {"Authorization": f"Bearer {token_valido}"}
    resposta = client.get("/api/v1/dashboard/exportar-pdf", headers=headers)
    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "application/pdf"
    assert len(resposta.content) > 500  # PDF válido gerado
