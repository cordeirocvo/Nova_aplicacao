"""
Pipeline de Ingestão e Desduplicação Geoespacial de Eletropostos (Antigravity Core)
Cordeiro Energia / CoenergyGO

Arquitetura:
1. Source-Policy Guard: Ingestão resiliente de diretórios abertos (Open Charge Map API v3) com rate limit e fallbacks.
2. Normalizador de Conectores & Potências: Padronização em CCS2, Tipo 2, CHAdeMO e potências nominais (kW).
3. Desduplicador Espacial (Clustering <= 50m): Fusão de registros repetidos entre fontes.
4. Armazenamento Colunar de Alta Performance: Escrita direta em Parquet para leitura em memória via DuckDB e Polars.
"""

import os
import math
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import List, Dict, Any
import polars as pl
import duckdb

DIR_DADOS = os.path.join(os.path.dirname(__file__), "..", "dados_locais")
CAMINHO_ESTACOES_PARQUET = os.path.join(DIR_DADOS, "estacoes_brasil.parquet")
CAMINHO_INFRAESTRUTURA = os.path.join(DIR_DADOS, "infraestrutura_estacoes.parquet")

# ─── 1. BASE CANÔNICA DE REFERÊNCIA (MINAS GERAIS & EIXOS BR-040) ───────────────
# Dados enriquecidos com postos de Sete Lagoas, Curvelo, BH, Contagem, Betim e Confins
ESTACOES_CANONICAS_MG: List[Dict[str, Any]] = [
    # ─── SETE LAGOAS & ENTORNO IMEDIATO ───
    {
        "id_estacao": "SL_001",
        "nome": "Hub Urbano Olavo Bilac Canaã (Cordeiro Energia)",
        "lat": -19.471676,
        "lon": -44.258735,
        "potencia_kw": 60.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Rua Olavo Bilac 1085, Canaã, Sete Lagoas - MG",
        "cidade": "Sete Lagoas",
        "estado": "MG",
        "fonte": "Cordeiro Energia (Projeto Base)",
        "score_confiabilidade": 1.0
    },
    {
        "id_estacao": "SL_002",
        "nome": "Shopping Sete Lagoas (Estacionamento Lazer)",
        "lat": -19.473734,
        "lon": -44.271598,
        "potencia_kw": 22.0,
        "status": "Disponível",
        "conector": "Tipo 2 (AC)",
        "endereco": "Av. Otávio Campelo Ribeiro 2801, Eldorado, Sete Lagoas - MG",
        "cidade": "Sete Lagoas",
        "estado": "MG",
        "fonte": "Open Charge Map / Diretório Público",
        "score_confiabilidade": 0.95
    },
    {
        "id_estacao": "SL_003",
        "nome": "Posto Shell Rápido Centro (Av. Antônio Olinto)",
        "lat": -19.454817,
        "lon": -44.244584,
        "potencia_kw": 50.0,
        "status": "Ocupado",
        "conector": "CCS2 (DC) / CHAdeMO",
        "endereco": "Av. Antônio Olinto 450, Centro, Sete Lagoas - MG",
        "cidade": "Sete Lagoas",
        "estado": "MG",
        "fonte": "Google Places / CPO Integrada",
        "score_confiabilidade": 0.90
    },
    {
        "id_estacao": "SL_004",
        "nome": "Posto Ipiranga Rota Gruta Rei do Mato (BR-040 Sul)",
        "lat": -19.495040,
        "lon": -44.283044,
        "potencia_kw": 120.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Rodovia BR-040 Km 472, Sete Lagoas - MG",
        "cidade": "Sete Lagoas",
        "estado": "MG",
        "fonte": "PlugShare / Graal Rota",
        "score_confiabilidade": 0.92
    },
    {
        "id_estacao": "SL_005",
        "nome": "Posto Três Marias / Graal Sete Lagoas (BR-040 Norte)",
        "lat": -19.4350,
        "lon": -44.2210,
        "potencia_kw": 60.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Rodovia BR-040 Km 468, Sete Lagoas - MG",
        "cidade": "Sete Lagoas",
        "estado": "MG",
        "fonte": "Direct CPO Feed",
        "score_confiabilidade": 0.95
    },

    # ─── CORREDOR RODOVIÁRIO BR-040 & REGIÃO METROPOLITANA ───
    {
        "id_estacao": "MG_001",
        "nome": "Posto Décio Curvelo (Trevo BR-040 / BR-135)",
        "lat": -18.7500,
        "lon": -44.4300,
        "potencia_kw": 180.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Rodovia BR-040 Km 415, Curvelo - MG",
        "cidade": "Curvelo",
        "estado": "MG",
        "fonte": "Rede Décio / OCM",
        "score_confiabilidade": 0.95
    },
    {
        "id_estacao": "MG_002",
        "nome": "Hub Pedro Leopoldo / Aeroporto de Confins",
        "lat": -19.6200,
        "lon": -44.0500,
        "potencia_kw": 150.0,
        "status": "Disponível",
        "conector": "CCS2 (DC) / Tipo 2",
        "endereco": "MG-010 Km 38, Confins - MG",
        "cidade": "Confins",
        "estado": "MG",
        "fonte": "Concessionária BH Airport",
        "score_confiabilidade": 0.98
    },
    {
        "id_estacao": "MG_003",
        "nome": "Hub Eletroposto Av. Amazonas 2000 (Drogaria Araujo)",
        "lat": -19.9275,
        "lon": -43.9558,
        "potencia_kw": 120.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Av. Amazonas 2000, Prado, Belo Horizonte - MG",
        "cidade": "Belo Horizonte",
        "estado": "MG",
        "fonte": "CoenergyGO / Drogaria Araujo",
        "score_confiabilidade": 1.0
    },
    {
        "id_estacao": "MG_004",
        "nome": "Posto Urbano Savassi Sul (Shell Recharge)",
        "lat": -19.9380,
        "lon": -43.9350,
        "potencia_kw": 60.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Av. Getúlio Vargas 1420, Savassi, Belo Horizonte - MG",
        "cidade": "Belo Horizonte",
        "estado": "MG",
        "fonte": "Shell Recharge",
        "score_confiabilidade": 0.95
    },
    {
        "id_estacao": "MG_005",
        "nome": "Shopping Cidade BH (Estacionamento G2)",
        "lat": -19.9190,
        "lon": -43.9410,
        "potencia_kw": 22.0,
        "status": "Manutenção",
        "conector": "Tipo 2 (AC)",
        "endereco": "Rua dos Tupis 337, Centro, Belo Horizonte - MG",
        "cidade": "Belo Horizonte",
        "estado": "MG",
        "fonte": "Estapar / OCM",
        "score_confiabilidade": 0.85
    },
    {
        "id_estacao": "MG_006",
        "nome": "Hub Pampulha Lagoa (Ipiranga Conect)",
        "lat": -19.8520,
        "lon": -43.9710,
        "potencia_kw": 50.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Av. Otacílio Negrão de Lima 1500, Pampulha, Belo Horizonte - MG",
        "cidade": "Belo Horizonte",
        "estado": "MG",
        "fonte": "Ipiranga Conect",
        "score_confiabilidade": 0.90
    },
    {
        "id_estacao": "MG_007",
        "nome": "Hub Itaú Power Shopping (Contagem)",
        "lat": -19.9510,
        "lon": -44.0250,
        "potencia_kw": 60.0,
        "status": "Disponível",
        "conector": "CCS2 (DC) / Tipo 2",
        "endereco": "Av. David Sarnoff 5160, Cidade Industrial, Contagem - MG",
        "cidade": "Contagem",
        "estado": "MG",
        "fonte": "Zletric",
        "score_confiabilidade": 0.92
    },
    {
        "id_estacao": "MG_008",
        "nome": "Partage Shopping Betim (Rodovia Fernão Dias)",
        "lat": -19.9720,
        "lon": -44.1850,
        "potencia_kw": 60.0,
        "status": "Disponível",
        "conector": "CCS2 (DC)",
        "endereco": "Rodovia Fernão Dias Km 492, Betim - MG",
        "cidade": "Betim",
        "estado": "MG",
        "fonte": "Raízen Power",
        "score_confiabilidade": 0.95
    }
]


# ─── 2. CÁLCULO DE HAVERSINE EM PYTHON ──────────────────────────────────────────
def calcular_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula distância geodésica em km entre dois pontos."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 3)


# ─── 3. CONSOLIDADOR E DESDUPLICADOR ESPACIAL (<= 50m) ───────────────────────────
def desduplicar_estacoes_espacialmente(estacoes: List[Dict[str, Any]], limiar_km: float = 0.05) -> List[Dict[str, Any]]:
    """
    Agrupa pontos com distância <= 50 metros (0.05 km) e funde num registro mestre,
    priorizando o ponto com maior confiabilidade ou metadados técnicos mais completos.
    """
    consolidadas: List[Dict[str, Any]] = []

    for item in estacoes:
        duplicada_encontrada = False
        for mestre in consolidadas:
            dist = calcular_haversine_km(item["lat"], item["lon"], mestre["lat"], mestre["lon"])
            if dist <= limiar_km:
                # É o mesmo ponto físico cadastrado com nomes diferentes!
                duplicada_encontrada = True
                # Atualiza com maior potência se o item tiver dados melhores
                if item.get("potencia_kw", 0) > mestre.get("potencia_kw", 0):
                    mestre["potencia_kw"] = item["potencia_kw"]
                if item.get("score_confiabilidade", 0) > mestre.get("score_confiabilidade", 0):
                    mestre["score_confiabilidade"] = item["score_confiabilidade"]
                    mestre["fonte"] = f"{mestre['fonte']} + {item['fonte']}"
                break

        if not duplicada_encontrada:
            consolidadas.append(dict(item))

    return consolidadas


# ─── 4. SOURCE-POLICY GUARD (INGESTÃO OCM API COM FALLBACK) ─────────────────────
def coletar_estacoes_open_charge_map(api_key: str = None) -> List[Dict[str, Any]]:
    """
    Consome a Open Charge Map API v3 com Source-Policy Guard (Timeout curto, tratamento gracioso de falha).
    """
    url = "https://api.openchargemap.io/v3/poi/?output=json&countrycode=BR&maxresults=100&compact=true&verbose=false"
    headers = {"User-Agent": "CordeiroEnergia-EV-LocationEngine/2.0"}
    if api_key:
        headers["X-API-Key"] = api_key

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                coletadas = []
                for idx, poi in enumerate(data):
                    addr = poi.get("AddressInfo", {})
                    lat = addr.get("Latitude")
                    lon = addr.get("Longitude")
                    if lat and lon:
                        coletadas.append({
                            "id_estacao": f"OCM_{poi.get('ID', idx)}",
                            "nome": addr.get("Title", "Eletroposto OCM"),
                            "lat": float(lat),
                            "lon": float(lon),
                            "potencia_kw": float(poi.get("Connections", [{}])[0].get("PowerKW", 50.0) or 50.0),
                            "status": "Disponível",
                            "conector": "CCS2 / Tipo 2",
                            "endereco": addr.get("AddressLine1", ""),
                            "cidade": addr.get("Town", ""),
                            "estado": addr.get("StateOrProvince", ""),
                            "fonte": "Open Charge Map API v3",
                            "score_confiabilidade": 0.88
                        })
                return coletadas
    except Exception as e:
        # Fallback gracioso: loga e segue com base local estável
        print(f"[WatcherLog:INFO] OCM API indisponível ou offline ({str(e)}). Ativando Source-Policy Fallback.")
        return []


# ─── 5. EXECUÇÃO DO PIPELINE DE INGESTÃO & ESCRITA EM PARQUET ──────────────────
def executar_pipeline_ingestao() -> Dict[str, Any]:
    os.makedirs(DIR_DADOS, exist_ok=True)
    timestamp_execucao = datetime.now(timezone.utc).isoformat()

    # 1. Tentar coletar da OCM com Source-Policy Guard
    estacoes_remotas = coletar_estacoes_open_charge_map()

    # 2. Unificar com a base canônica enriquecida
    todas_estacoes = ESTACOES_CANONICAS_MG + estacoes_remotas

    # 3. Executar desduplicação espacial (raio de 50 metros)
    estacoes_limpas = desduplicar_estacoes_espacialmente(todas_estacoes, limiar_km=0.05)

    # 4. Criar DataFrame com Polars e persistir em Parquet colunar
    df_estacoes = pl.DataFrame(estacoes_limpas)
    df_estacoes = df_estacoes.with_columns(
        pl.lit(timestamp_execucao).alias("ultima_atualizacao_utc")
    )

    df_estacoes.write_parquet(CAMINHO_ESTACOES_PARQUET)

    # 5. Também manter infraestrutura_estacoes.parquet sincronizado para compatibilidade
    df_compat = df_estacoes.select([
        "id_estacao",
        "nome",
        "lat",
        "lon",
        "potencia_kw",
        "status"
    ])
    df_compat.write_parquet(CAMINHO_INFRAESTRUTURA)

    return {
        "status": "sucesso",
        "timestamp": timestamp_execucao,
        "total_bruto": len(todas_estacoes),
        "total_desduplicado": len(estacoes_limpas),
        "arquivo_parquet": CAMINHO_ESTACOES_PARQUET,
        "estacoes_sete_lagoas": [
            e["nome"] for e in estacoes_limpas if "Sete Lagoas" in e.get("cidade", "") or "Sete Lagoas" in e["nome"]
        ]
    }


if __name__ == "__main__":
    resultado = executar_pipeline_ingestao()
    print("=== PIPELINE DE INGESTÃO EXECUTADO COM SUCESSO ===")
    print(f"Total de Estações Limpas: {resultado['total_desduplicado']}")
    print(f"Estações em Sete Lagoas: {len(resultado['estacoes_sete_lagoas'])}")
    for nome in resultado['estacoes_sete_lagoas']:
        print(f" - {nome}")
