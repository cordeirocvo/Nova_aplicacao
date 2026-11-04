#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SISTEMA DE AUTOMAÇÃO DE DOCUMENTOS & GERAÇÃO DE RELATÓRIO TÉCNICO MULTI-PARTE
=============================================================================
Desenvolvido para: Cordeiro Energia / Suíte CoenergyGO
Projeto: Hub de Recarga Rápida DC (BENY 60 kW SiC) • Galeria 24h • Sete Lagoas / MG
Padrão Normativo: ABNT NBR 5410, NBR 17019, CEMIG ND-5.1 e ND-5.3

Os 6 Documentos Oficiais da Suíte CoenergyGO:
  1. Relatório Executivo Comercial
  2. Memorial Descritivo da Instalação
  3. Memorial de Cálculo Eletrotécnico
  4. Caderno de Obra & Instruções de Campo
  5. Relatório de Comissionamento & Checklist (FOTO 01 na íntegra)
  6. Dossiê de Viabilidade & Negócios - CoenergyGO (FOTO 02 na íntegra, 5 capítulos)

Permite gerar cada documento individualmente ou agrupado em qualquer combinação.
=============================================================================
"""

import os
import sys
import shutil
import base64
import argparse
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

# Manipulação de PDF com pypdf moderna (PdfWriter)
try:
    from pypdf import PdfWriter, PdfReader
    PDF_MERGER_CLASS = PdfWriter
except ImportError:
    try:
        from pypdf import PdfMerger as PDF_MERGER_CLASS, PdfReader  # type: ignore
    except ImportError:
        try:
            from PyPDF2 import PdfMerger as PDF_MERGER_CLASS, PdfReader  # type: ignore
        except ImportError:
            print("[ERRO CRÍTICO] Biblioteca 'pypdf' ou 'PyPDF2' não encontrada.")
            print("Execute: pip install pypdf")
            sys.exit(1)

# Suporte ao WeasyPrint com fallback automático para Chromium/Edge Headless
WEASYPRINT_AVAILABLE = False
try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except Exception:
    WEASYPRINT_AVAILABLE = False


# =============================================================================
# FOLHA DE ESTILOS CSS INSTITUCIONAL CORDEIRO ENERGIA (ALTA FIDELIDADE)
# =============================================================================
COMMON_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

@page {
    size: A4 portrait;
    margin: 8mm 10mm;
}

* {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

body {
    font-family: 'Montserrat', sans-serif;
    color: #0f172a;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 10.5px;
    line-height: 1.5;
}

h1, h2, h3, h4 {
    margin: 0;
    font-weight: 700;
}

p {
    text-align: justify;
    text-justify: inter-word;
    margin: 0 0 8px 0;
}

.report-header {
    border-bottom: 2px solid #0A192F;
    padding-bottom: 10px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.report-header .brand {
    font-size: 9.5px;
    font-weight: 900;
    text-transform: uppercase;
    color: #E45318;
    letter-spacing: 0.15em;
    margin-bottom: 2px;
}

.report-header .title {
    font-size: 16px;
    font-weight: 900;
    text-transform: uppercase;
    color: #0A192F;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.report-header .subtitle {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
}

.metadata-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px 12px;
    margin-bottom: 14px;
    font-size: 10px;
}

.metadata-bar .meta-item span {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
}

.metadata-bar .meta-item strong {
    color: #0f172a;
    font-size: 10.5px;
}

.card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
}

.card-dark {
    background: linear-gradient(135deg, #0A192F 0%, #0d213f 100%);
    color: #ffffff;
    border: 1px solid #1e3a5f;
}

.card-dark p {
    color: #cbd5e1;
}

.card-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
    margin-bottom: 10px;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #0f172a;
}

.card-dark .card-title {
    border-bottom-color: #1e3a5f;
    color: #ffffff;
}

.badge {
    display: inline-block;
    padding: 2.5px 7px;
    border-radius: 9999px;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.badge-green {
    background-color: #ecfdf5;
    color: #00B356;
    border: 1px solid #a7f3d0;
}

.badge-orange {
    background-color: #fff7ed;
    color: #E45318;
    border: 1px solid #ffedd5;
}

.badge-blue {
    background-color: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
}

.grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.kpi-box {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    text-align: left;
}

.kpi-lbl {
    font-size: 8px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
}

.kpi-num {
    font-size: 15px;
    font-weight: 900;
    color: #0f172a;
    font-family: monospace;
}

.kpi-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 3px;
    line-height: 1.25;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 9.5px;
}

th {
    background-color: #0A192F;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

td {
    padding: 6px 8px;
    border-bottom: 1px solid #e2e8f0;
}

tr:nth-child(even) td {
    background-color: #f8fafc;
}

.highlight-val {
    font-weight: 800;
    color: #E45318;
    font-family: monospace;
}

.green-val {
    font-weight: 800;
    color: #00B356;
    font-family: monospace;
}

.signature-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-top: 20px;
    padding-top: 14px;
    border-top: 2px solid #e2e8f0;
    page-break-inside: avoid;
    break-inside: avoid;
}

.sig-line {
    border-bottom: 1px solid #94a3b8;
    height: 32px;
    margin-bottom: 5px;
}

ul {
    margin: 4px 0 8px 0;
    padding-left: 16px;
}

li {
    margin-bottom: 3px;
}


.phase-card {
    position: relative;
    padding: 10px 14px 10px 18px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
}
.phase-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 4px; height: 100%;
}
.phase-card.orange::before { background-color: #E45318; }
.phase-card.blue::before { background-color: #1d4ed8; }
.phase-card.green::before { background-color: #00B356; }

.norm-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    page-break-inside: avoid;
    break-inside: avoid;
}

.page-break {
    page-break-after: always;
    break-after: page;
}
"""


# =============================================================================
# HELPER: HEADER E METADADOS PADRÃO CORDEIRO
# =============================================================================
def get_report_header_html(report_num: int, title: str, subtitle: str = "Metodologia CoenergyGO Intelligence • Padrão Cordeiro Energia") -> str:
    return f"""
    <div class="report-header">
        <div>
            <div class="brand">Cordeiro Energia • CoenergyGO</div>
            <div class="title">{report_num}. {title}</div>
            <div class="subtitle">Projeto: <strong>Carregador CoenergyGO - Sete Lagoas</strong> • Cliente: <strong>CoenergyGO</strong> (Cedente: <strong>Saint Clair</strong>)</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 900; color: #E45318; margin-bottom: 2px;">CORDEIRO ENERGIA</div>
            <div style="font-size: 8.5px; color: #94a3b8; font-family: monospace;">04 de novembro de 2026</div>
            <span class="badge badge-green" style="margin-top: 3px;">HOMOLOGADO</span>
        </div>
    </div>

    <div class="metadata-bar">
        <div class="meta-item">
            <span>Concessionária</span>
            <strong>CEMIG</strong>
        </div>
        <div class="meta-item">
            <span>Padrão / Categoria</span>
            <strong>C6 (200A)</strong>
        </div>
        <div class="meta-item">
            <span>Potência Instalada VE</span>
            <strong style="color: #E45318;">60.0 kW (2 Vagas | 2 Pontos)</strong>
        </div>
        <div class="meta-item">
            <span>Responsável Técnico</span>
            <strong>Bruno Cordeiro (CREA-MG 148293/D)</strong>
        </div>
    </div>
    """


def get_signatures_html() -> str:
    return """
    <div class="signature-box">
        <div>
            <div class="sig-line"></div>
            <strong style="color: #0A192F; display: block; font-size: 10.5px;">Bruno Cordeiro</strong>
            <span style="font-size: 9px; color: #64748b;">Responsável Técnico • CREA-MG 148293/D</span>
            <span style="font-size: 8.5px; color: #E45318; font-weight: 700; display: block;">Cordeiro Energia O&M</span>
        </div>
        <div style="text-align: right;">
            <div class="sig-line" style="margin-left: auto; width: 80%;"></div>
            <strong style="color: #0A192F; display: block; font-size: 10.5px;">CoenergyGO / Saint Clair</strong>
            <span style="font-size: 9px; color: #64748b;">Proprietário do Imóvel & Investidor</span>
            <span style="font-size: 8.5px; color: #00B356; font-weight: 700; display: block;">Aceite Formal do Cliente</span>
        </div>
    </div>
    """


# =============================================================================
# DEFINIÇÃO DOS 6 RELATÓRIOS OFICIAIS NA ÍNTEGRA
# =============================================================================
def get_official_reports() -> List[Dict[str, Any]]:
    base_dir = Path(__file__).resolve().parent.parent
    facade_img_path = base_dir / "public" / "uploads" / "ev" / "facade_sete_lagoas.png"
    facade_b64 = ""
    if facade_img_path.exists():
        with open(facade_img_path, "rb") as img_f:
            facade_b64 = base64.b64encode(img_f.read()).decode("utf-8")

    return [
        # ─────────────────────────────────────────────────────────────────────
        # 1. RELATÓRIO EXECUTIVO COMERCIAL (NA ÍNTEGRA • 6 PASSOS OFICIAIS)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 1,
            "filename": "parte_01_relatorio_executivo_comercial.pdf",
            "title": "Relatório Executivo Comercial",
            "html": f"""
            {get_report_header_html(1, "RELATÓRIO EXECUTIVO COMERCIAL")}

            <!-- ─── PARTE 1: SUMÁRIO EXECUTIVO & ATIVO (PASSO 1A) ─── -->
            <div class="card card-dark">
                <div class="card-title">
                    <span>1. IDENTIFICAÇÃO DO ATIVO & PARTES ENVOLVIDAS (PASSO 1A)</span>
                    <span class="badge badge-green">Sete Lagoas - MG</span>
                </div>
                <p>
                    Este estudo estratégico e eletrotécnico contempla a implantação de <strong>1 estação física</strong> de alta potência atendendo 
                    <strong style="color: #00B356;">2 vagas comerciais simultâneas</strong> (2 conectores rápidos CCS2) com potência agregada de 
                    <strong>60.0 kW</strong> no imóvel cedido pelo <strong>Sr. Saint Clair</strong>, localizado na <strong>Travessa Olavo Bilac, Bairro Canaã, Sete Lagoas / MG</strong>. 
                    O empreendimento está estrategicamente ancorado em <strong>Galeria de lojas aberta 24 horas</strong>, oferecendo conveniência permanente aos usuários, 
                    iluminação de segurança, sanitários, alimentação e acesso frontal imediato sem desvios de rota.
                </p>
                <div class="grid-4" style="margin-top: 10px;">
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Cliente Proponente</div>
                        <div class="kpi-num" style="color: #ffffff; font-size: 11.5px;">CoenergyGO</div>
                        <div class="kpi-sub" style="color: #64748b;">Operador CaaS</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Proprietário / Cedente</div>
                        <div class="kpi-num" style="color: #00B356; font-size: 11.5px;">Sr. Saint Clair</div>
                        <div class="kpi-sub" style="color: #64748b;">Cedente do Espaço</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Âncora Comercial</div>
                        <div class="kpi-num" style="color: #ffffff; font-size: 11.5px;">Galeria 24 Horas</div>
                        <div class="kpi-sub" style="color: #64748b;">Fluxo Contínuo</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Tecnologia Homologada</div>
                        <div class="kpi-num" style="color: #E45318; font-size: 11.5px;">BENY DC 60 kW SiC</div>
                        <div class="kpi-sub" style="color: #64748b;">Dual-Gun CCS2</div>
                    </div>
                </div>
            </div>

            <!-- ─── PARTE 2: DIAGNÓSTICO DEMOGRÁFICO IBGE & CONCORRÊNCIA DC (PASSO 1B) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>2. DIAGNÓSTICO DEMOGRÁFICO IBGE & CONCORRÊNCIA DC (PASSO 1B)</span>
                    <span class="badge badge-green">Score Locacional AHP: 66,5 / 100</span>
                </div>
                <div class="grid-4" style="margin-bottom: 10px;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">População IBGE</div>
                        <div class="kpi-num">241.835 hab.</div>
                        <div class="kpi-sub">Sete Lagoas / MG</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Frota VE Projetada 2026</div>
                        <div class="kpi-num highlight-val">780 VEs</div>
                        <div class="kpi-sub">+42% crescimento a.a.</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Comércios em 500m</div>
                        <div class="kpi-num green-val">4 Pontos</div>
                        <div class="kpi-sub">Dwell time médio 40min</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Score Ponderado AHP</div>
                        <div class="kpi-num green-val">66,5 / 100</div>
                        <div class="kpi-sub">Classificação: MUITO BOM (GO)</div>
                    </div>
                </div>
                <p>
                    A varredura de inteligência competitiva identificou 3 postos com recarga rápida DC no raio de 3 a 5 km (Posto Graal a 1,8 km, 
                    Mart Minas a 2,4 km e Shopping Sete Lagoas a 3,8 km). Diante desse cenário competitivo, a implantação do Hub CoenergyGO 
                    se consolida estrategicamente com dispensador BENY DC de 60 kW com dois conectores CCS2 simultâneos, diferenciando-se pela 
                    ancoragem comercial contínua de 24 horas e alta segurança patrimonial.
                </p>

                <!-- Tabela de Eletropostos Concorrentes Mapeados -->
                <div style="margin-top: 10px;">
                    <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">
                        Mapeamento de Campo de Estações Concorrentes no Raio de Varredura
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 32%;">Estabelecimento / Nome</th>
                                <th style="width: 14%; text-align: center;">Distância</th>
                                <th style="width: 16%; text-align: center;">Potência / Tipo</th>
                                <th style="width: 38%;">Observações de Campo / Acesso</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight: 700; color: #0f172a;">Posto Graal Sete Lagoas</td>
                                <td style="text-align: center; font-family: monospace;">1.8 km</td>
                                <td style="text-align: center;"><span class="badge badge-orange">60 kW DC</span></td>
                                <td style="color: #64748b; font-size: 8.5px;">Rodovia BR-040 km 468 • Operação contínua 24h na rodovia</td>
                            </tr>
                            <tr>
                                <td style="font-weight: 700; color: #0f172a;">Mart Minas Atacado</td>
                                <td style="text-align: center; font-family: monospace;">2.4 km</td>
                                <td style="text-align: center;"><span class="badge badge-orange">60 kW DC</span></td>
                                <td style="color: #64748b; font-size: 8.5px;">Av. Raquel Teixeira Viana • Estacionamento restrito ao horário de compras</td>
                            </tr>
                            <tr>
                                <td style="font-weight: 700; color: #0f172a;">Shopping Sete Lagoas</td>
                                <td style="text-align: center; font-family: monospace;">3.8 km</td>
                                <td style="text-align: center;"><span class="badge badge-blue">40 kW DC</span></td>
                                <td style="color: #64748b; font-size: 8.5px;">Av. Otávio Campelo • Acesso mediante pagamento de taxa de estacionamento</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ─── PARTE 3: ENGENHARIA ELÉTRICA CEMIG (PASSO 2A) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>3. ENGENHARIA ELÉTRICA & DEMANDA CEMIG (PASSO 2A)</span>
                    <span class="badge badge-green">Folga Disponível: 67,1 kW</span>
                </div>
                <div class="grid-4" style="margin-bottom: 10px;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Padrão de Entrada</div>
                        <div class="kpi-num">C6 (200A)</div>
                        <div class="kpi-sub">220V Trifásico CEMIG</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Capacidade da Entrada</div>
                        <div class="kpi-num">75.0 kW</div>
                        <div class="kpi-sub">Limite físico ND-5.1</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Carga Atual do Imóvel</div>
                        <div class="kpi-num">7.9 kW</div>
                        <div class="kpi-sub">SmartMeter (Pico NBR 5410)</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Folga Disponível</div>
                        <div class="kpi-num green-val">67.1 kW</div>
                        <div class="kpi-sub">Headroom para recarga</div>
                    </div>
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 10px; line-height: 1.5;">
                    <strong style="color: #00B356; display: block; font-size: 10.5px; margin-bottom: 2px;">✓ Regime Eletrotécnico Operacional: Alimentação Direta em Carga Plena</strong>
                    <span style="color: #334155;">
                        A folga de potência identificada no padrão existente (<strong>67,1 kW</strong>) suporta integralmente as estações instaladas (<strong>60,0 kW</strong>) 
                        em operação contínua sem risco de sobrecarga e sem a necessidade de aumento oneroso de demanda contratada junto à CEMIG.
                    </span>
                </div>
            </div>

            <!-- ─── PARTE 3: CONFORMIDADE NBR 17019 & CBMMG IT-41 (PASSO 2B) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>CONFORMIDADE NORMATIVA ABNT NBR 17019 & CORPO DE BOMBEIROS (PASSO 2B)</span>
                    <span class="badge badge-green">100% Homologado</span>
                </div>
                <div class="grid-2">
                    <div class="norm-card" style="border-left: 3px solid #E45318;">
                        <strong style="color: #E45318; font-size: 9.5px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                            1. Aterramento TN-S Mandatório (NBR 5410):
                        </strong>
                        <p style="margin: 0; font-size: 9px; color: #475569;">
                            Condutor de proteção (PE) exclusivo interligado diretamente ao Barramento de Equipotencialização Principal (BEP), com resistividade de terra auditada inferior a 10 ohms.
                        </p>
                    </div>
                    <div class="norm-card" style="border-left: 3px solid #00B356;">
                        <strong style="color: #00B356; font-size: 9.5px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                            2. Dispositivo IDR Tipo B Dedicado (30mA):
                        </strong>
                        <p style="margin: 0; font-size: 9px; color: #475569;">
                            Proteção diferencial-residual Tipo B específica para VE, imune a correntes CC de fuga transitórias e permanentes originadas nos retificadores veiculares de alta potência.
                        </p>
                    </div>
                    <div class="norm-card" style="border-left: 3px solid #1d4ed8;">
                        <strong style="color: #1d4ed8; font-size: 9.5px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                            3. Proteção contra Surtos (DPS Classe I+II):
                        </strong>
                        <p style="margin: 0; font-size: 9px; color: #475569;">
                            Dispositivos protetores de surtos coordenados instalados no QDC-VE (Up &lt; 1,5 kV), protegendo os circuitos eletrônicos e os veículos contra descargas atmosféricas.
                        </p>
                    </div>
                    <div class="norm-card" style="border-left: 3px solid #b91c1c;">
                        <strong style="color: #b91c1c; font-size: 9.5px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                            4. Seccionamento de Emergência & Combate a Incêndio:
                        </strong>
                        <p style="margin: 0; font-size: 9px; color: #475569;">
                            Botoeira de emergência tipo cogumelo com disparo de bobina de mínima tensão em &lt; 50ms, extintor de pó químico/CO₂ (5 kg) adjacente e sinalização viária NBR 9050.
                        </p>
                    </div>
                </div>
            </div>

            <!-- ─── PARTE 4: ESPECIFICAÇÃO TÉCNICA BENY 60 kW (PASSO 3) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>4. ESPECIFICAÇÃO TÉCNICA DA ESTAÇÃO BENY 60 kW SiC (PASSO 3)</span>
                    <span class="badge badge-orange">Total: 1 est. (60.0 kW | 2 Vagas)</span>
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                        <div>
                            <strong style="font-size: 11.5px; color: #0f172a; display: block;">BENY BDC-60 kW DC Comercial Rápido (Dual-Gun CCS2)</strong>
                            <span style="font-size: 9px; color: #64748b;">Fabricante: <strong>BENY New Energy</strong> • Modelo: <strong>BDC-60KW-2G</strong> • Tecnologia SiC</span>
                        </div>
                        <div style="text-align: right;">
                            <strong style="font-size: 14px; color: #E45318; font-family: monospace; display: block;">60.0 kW</strong>
                            <span class="badge badge-orange">DC Rápido • Trifásico</span>
                        </div>
                    </div>
                    <div class="grid-4" style="margin-bottom: 8px;">
                        <div class="kpi-box">
                            <div class="kpi-lbl">Conectores</div>
                            <strong style="font-size: 10px; color: #0f172a;">2x CCS2 (Dual-Gun)</strong>
                        </div>
                        <div class="kpi-box">
                            <div class="kpi-lbl">Divisão de Potência</div>
                            <strong style="font-size: 10px; color: #0f172a;">2x 30 kW ou 1x 60 kW</strong>
                        </div>
                        <div class="kpi-box">
                            <div class="kpi-lbl">Protocolo OCPP</div>
                            <strong style="font-size: 10px; color: #0f172a;">OCPP 1.6J / 2.0.1 JSON</strong>
                        </div>
                        <div class="kpi-box">
                            <div class="kpi-lbl">Tempo Médio Recarga</div>
                            <strong style="font-size: 10px; color: #00B356;">35 a 45 minutos</strong>
                        </div>
                    </div>
                    <p style="margin: 0; font-size: 9.5px; color: #475569; background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        A estação BENY DC 60 kW utiliza módulos de potência com semicondutores de <strong>Carboneto de Silício (SiC)</strong>, garantindo eficiência de conversão CA/CC 
                        superior a <strong>96%</strong> e baixo aquecimento operacional. O equipamento dispõe de leitor RFID integrado, display touch de 7 polegadas com interface 
                        em português e leitor QR Code dinâmico para integração autônoma com aplicativos de bilhetagem.
                    </p>
                </div>
            </div>

            <!-- ─── PARTE 4: ORÇAMENTO CAPEX BOM (PASSO 4B) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>ORÇAMENTO MODULAR DE CAPEX & LISTA DE MATERIAIS (PASSO 4B)</span>
                    <span class="badge badge-orange">BDI Global: 18,5% • R$ 133.844,00</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">Item</th>
                            <th style="width: 62%;">Descrição dos Equipamentos, Materiais & Serviços</th>
                            <th style="width: 10%; text-align: center;">Qtd</th>
                            <th style="width: 20%; text-align: right;">Valor Total (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align: center; font-weight: 700;">01</td>
                            <td><strong>Estação de Recarga BENY DC 60 kW Dual Gun CCS2</strong> (Módulos SiC, OCPP 1.6J/2.0.1, RFID, Tela 7", Gestão Dinâmica)</td>
                            <td style="text-align: center; font-family: monospace;">1 un</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 85.000,00</td>
                        </tr>
                        <tr>
                            <td style="text-align: center; font-weight: 700;">02</td>
                            <td><strong>Infraestrutura Elétrica & Cabos de Cobre</strong> (Eletrodutos PEAD 3", Cabos EPR 70mm², QDC-VE, DPS Classe I+II e IDR Tipo B)</td>
                            <td style="text-align: center; font-family: monospace;">1 cj</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 28.500,00</td>
                        </tr>
                        <tr>
                            <td style="text-align: center; font-weight: 700;">03</td>
                            <td><strong>Mão de Obra de Instalação, Obras Civis & Pintura de Vagas</strong> (Abertura de vala, base de concreto e sinalização viária NBR 9050)</td>
                            <td style="text-align: center; font-family: monospace;">1 sv</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 15.000,00</td>
                        </tr>
                        <tr>
                            <td style="text-align: center; font-weight: 700;">04</td>
                            <td><strong>Engenharia Eletrotécnica, ART CREA & Homologação CEMIG</strong> (Projeto executivo, diagramas unifilares e aprovação CEMIG)</td>
                            <td style="text-align: center; font-family: monospace;">1 sv</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 5.344,00</td>
                        </tr>
                        <tr style="background-color: #0A192F; color: #ffffff;">
                            <td colspan="3" style="text-align: right; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 8px 10px; color: #ffffff;">
                                Total Geral Consolidado (Turnkey Completo com BDI):
                            </td>
                            <td style="text-align: right; font-family: monospace; font-weight: 900; font-size: 11px; padding: 8px 10px; color: #00B356;">
                                R$ 133.844,00
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- ─── PARTE 5: MODELAGEM ECONÔMICO-FINANCEIRA (PASSO 5) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>5. MODELAGEM ECONÔMICO-FINANCEIRA & RETORNO COENERGYGO (PASSO 5)</span>
                    <span class="badge badge-green">Payback: 20.9 meses • TIR: 50.5% a.a.</span>
                </div>
                <div class="grid-4" style="margin-bottom: 10px;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">CAPEX Total</div>
                        <div class="kpi-num">R$ 133.844</div>
                        <div class="kpi-sub">Equip. 85k + Infra 48.8k</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Payback Descontado</div>
                        <div class="kpi-num green-val">20.9 meses</div>
                        <div class="kpi-sub">Solar (vs 47.3m Rede)</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Taxa Interna (TIR)</div>
                        <div class="kpi-num" style="color: #1d4ed8;">50.5% a.a.</div>
                        <div class="kpi-sub">Fase Solar (vs 21.6% Rede)</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Margem Líquida</div>
                        <div class="kpi-num highlight-val">62.1%</div>
                        <div class="kpi-sub">Cenário Base (R$ 6.395/mês)</div>
                    </div>
                </div>

                <!-- Tabela de Sensibilidade dos 3 Cenários -->
                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">
                    Matriz de Sensibilidade Operacional (Tarifa de Venda: R$ 2,20 / kWh)
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Cenário Operacional</th>
                            <th style="text-align: center;">Ocupação / Dia</th>
                            <th style="text-align: center;">Energia Mensal</th>
                            <th style="text-align: right;">Receita Bruta (R$)</th>
                            <th style="text-align: right;">Custo Energia Solar</th>
                            <th style="text-align: right;">Margem Operacional</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: 700;">Conservador</td>
                            <td style="text-align: center; font-family: monospace;">4h / dia</td>
                            <td style="text-align: center; font-family: monospace;">7.200 kWh</td>
                            <td style="text-align: right; font-family: monospace;">R$ 15.840,00</td>
                            <td style="text-align: right; font-family: monospace;">R$ 2.736,00</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #00B356;">R$ 4.218,50 / mês</td>
                        </tr>
                        <tr style="background-color: #f0fdf4;">
                            <td style="font-weight: 700; color: #0A192F;">Moderado (Cenário Base)</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 700;">6h / dia</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 700;">10.800 kWh</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 23.760,00</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 4.104,00</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 900; color: #00B356;">R$ 6.395,78 / mês</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">Otimista</td>
                            <td style="text-align: center; font-family: monospace;">9h / dia</td>
                            <td style="text-align: center; font-family: monospace;">16.200 kWh</td>
                            <td style="text-align: right; font-family: monospace;">R$ 35.640,00</td>
                            <td style="text-align: right; font-family: monospace;">R$ 6.156,00</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #00B356;">R$ 9.870,20 / mês</td>
                        </tr>
                    </tbody>
                </table>

                <div class="grid-2" style="margin-top: 10px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 9px;">
                        <strong style="color: #00B356; display: block; font-size: 9.5px; margin-bottom: 2px;">Vantagem da Geração Solar Remota:</strong>
                        Custo nivelado de <strong>R$ 0,38/kWh</strong> vs <strong>R$ 0,89/kWh</strong> da rede CEMIG convencional, proporcionando economia direta de <strong>+R$ 5.508,00/mês</strong>.
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 9px;">
                        <strong style="color: #0A192F; display: block; font-size: 9.5px; margin-bottom: 2px;">Modelo de Comodato & Parceria:</strong>
                        O cedente (Sr. Saint Clair) cede o espaço sem desembolso financeiro, recebendo remuneração por cessão e atraindo clientes qualificados para a galeria 24h.
                    </div>
                </div>
            </div>

            <!-- ─── PARTE 6: CRONOGRAMA DE IMPLANTAÇÃO (PASSO 6) ─── -->
            <div class="card">
                <div class="card-title">
                    <span>6. CRONOGRAMA DE IMPLANTAÇÃO & ENCERRAMENTO (PASSO 6)</span>
                    <span class="badge badge-green">Prazo Total: 12 Semanas</span>
                </div>
                <div class="grid-3" style="margin-bottom: 12px;">
                    <div class="phase-card orange">
                        <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #E45318; display: block; margin-bottom: 2px;">Fase 1 • Semanas 1 a 4</span>
                        <strong style="font-size: 10.5px; color: #0f172a; display: block; margin-bottom: 4px;">Engenharia & Homologação</strong>
                        <ul style="font-size: 8.5px; color: #475569; padding-left: 14px; margin: 0;">
                            <li>Vistoria técnica presencial e emissão de ART CREA.</li>
                            <li>Aprovação de acesso CEMIG ND-5.1.</li>
                            <li>Aquisição dos equipamentos BENY DC 60 kW.</li>
                        </ul>
                    </div>
                    <div class="phase-card blue">
                        <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; display: block; margin-bottom: 2px;">Fase 2 • Semanas 5 a 9</span>
                        <strong style="font-size: 10.5px; color: #0f172a; display: block; margin-bottom: 4px;">Obras Civis & Eletrotécnica</strong>
                        <ul style="font-size: 8.5px; color: #475569; padding-left: 14px; margin: 0;">
                            <li>Passagem de eletrodutos PEAD 3" e cabos 70mm².</li>
                            <li>Montagem do QDC-VE com IDR Tipo B e DPS.</li>
                            <li>Concretagem da base e pintura viária NBR 9050.</li>
                        </ul>
                    </div>
                    <div class="phase-card green">
                        <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #00B356; display: block; margin-bottom: 2px;">Fase 3 • Semanas 10 a 12</span>
                        <strong style="font-size: 10.5px; color: #0f172a; display: block; margin-bottom: 4px;">Comissionamento & Go-Live</strong>
                        <ul style="font-size: 8.5px; color: #475569; padding-left: 14px; margin: 0;">
                            <li>Ensaios de isolamento e continuidade (Fluke 1664 FC).</li>
                            <li>Testes de emergência com bobina MX (&lt; 50ms).</li>
                            <li>Integração da plataforma OCPP 1.6J e inauguração.</li>
                        </ul>
                    </div>
                </div>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 9.5px; line-height: 1.5; margin-bottom: 12px;">
                    <strong style="color: #0A192F; display: block; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">Termo de Responsabilidade Técnica & Encerramento:</strong>
                    Certificamos que as premissas técnicas, cálculos de demanda e dimensionamentos orçamentários constantes neste Relatório Executivo Comercial 
                    atendem rigorosamente às normas ABNT NBR 5410, ABNT NBR 17019, IEC 61851 e aos regulamentos de distribuição CEMIG ND-5.1 e ND-5.3, estando 
                    o projeto plenamente qualificado para execução e conexão física.
                </div>

                {get_signatures_html()}
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # 2. MEMORIAL DESCRITIVO DA INSTALAÇÃO
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 2,
            "filename": "parte_02_memorial_descritivo_instalacao.pdf",
            "title": "Memorial Descritivo da Instalação",
            "html": f"""
            {get_report_header_html(2, "MEMORIAL DESCRITIVO DA INSTALAÇÃO")}

            <div class="card">
                <div class="card-title">
                    <span>1. OBJETIVO E ESCOPO DA ENGENHARIA</span>
                    <span class="badge badge-blue">ABNT NBR 17019:2022</span>
                </div>
                <p>
                    Este Memorial Descritivo estabelece os requisitos técnicos e de segurança para a infraestrutura de recarga de Veículos Elétricos (VE) 
                    do projeto <strong>Carregador CoenergyGO - Sete Lagoas</strong>. O projeto abrange desde o ponto de conexão na rede de baixa tensão 
                    até os quadros de distribuição exclusivos e estações terminais de recarga rápida DC.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. NORMAS TÉCNICAS E REGULAMENTAÇÕES APLICÁVEIS</span>
                    <span class="badge badge-green">Conformidade Integral</span>
                </div>
                <ul>
                    <li><strong>ABNT NBR 17019:2022:</strong> Instalações elétricas de baixa tensão — Requisitos particulares para locais de recarga de veículos elétricos.</li>
                    <li><strong>ABNT NBR 5410:2004:</strong> Instalações elétricas de baixa tensão.</li>
                    <li><strong>IEC 61851-1:</strong> Electric vehicle conductive charging system — General requirements.</li>
                    <li><strong>CEMIG ND-5.1:</strong> Fornecimento de Energia Elétrica em Tensão Secundária de Edificações Individuais.</li>
                    <li><strong>Instrução Técnica CBMMG IT-41:</strong> Segurança contra incêndio em estações de recarga de veículos elétricos.</li>
                    <li><strong>NR-10:</strong> Segurança em instalações e serviços em eletricidade.</li>
                    <li><strong>ABNT NBR 9050:</strong> Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos.</li>
                </ul>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>3. CARACTERÍSTICAS DO PÁTIO E VAGAS DE RECARGA</span>
                    <span class="badge badge-blue">2 Vagas Comerciais</span>
                </div>
                <div class="grid-4" style="margin-bottom: 6px;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Vagas VE Atendidas</div>
                        <div class="kpi-num">2 vagas</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Pontos de Recarga</div>
                        <div class="kpi-num highlight-val">2 saídas CCS2</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Ambiente de Instalação</div>
                        <div class="kpi-num" style="font-size: 11px;">PÁTIO TÉRREO</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Acessibilidade NBR 9050</div>
                        <div class="kpi-num green-val" style="font-size: 11px;">Vaga PCD Atendida</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>4. PROTEÇÕES MANDATÓRIAS E ESQUEMA DE SEGURANÇA</span>
                    <span class="badge badge-orange">NBR 17019 Mandatória</span>
                </div>
                <div class="grid-2">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #0A192F; font-size: 10.5px;">• Dispositivo DR Tipo B Dedicado:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Dispositivo DR Tetrapolar Tipo B de alta sensibilidade (30mA), imune a correntes CC de fuga transitórias e permanentes.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #0A192F; font-size: 10.5px;">• Proteção contra Surtos (DPS):</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            DPS Classe II, In ≥ 20 kA, Imax = 45 kA, nos modos F-PE e N-PE (Clamper VCL ou similar coordenado com o QDC-VE).
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #0A192F; font-size: 10.5px;">• Desligamento de Emergência:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Botão cogumelo com retenção e trava a ≥ 5m do carregador, acoplado a bobina de abertura Shunt Trip (MX) no disjuntor geral.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #0A192F; font-size: 10.5px;">• Esquema de Aterramento TN-S:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Aterramento interligado diretamente ao Barramento de Equipotencialização Principal (BEP) com condutor PE exclusivo e resistência < 10 Ω.
                        </p>
                    </div>
                </div>
            </div>

            {get_signatures_html()}
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # 3. MEMORIAL DE CÁLCULO ELETROTÉCNICO
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 3,
            "filename": "parte_03_memorial_calculo_eletrotecnico.pdf",
            "title": "Memorial de Cálculo Eletrotécnico",
            "html": f"""
            {get_report_header_html(3, "MEMORIAL DE CÁLCULO ELETROTÉCNICO")}

            <div class="card">
                <div class="card-title">
                    <span>1. CRITÉRIOS DE DIMENSIONAMENTO PASSO A PASSO</span>
                    <span class="badge badge-green">NBR 5410 & NBR 17019</span>
                </div>
                <p>
                    Os condutores foram dimensionados simultaneamente pelos critérios de <strong>Capacidade de Condução de Corrente (Iz ≥ Ib)</strong> 
                    conforme Tabelas 36 a 39 da NBR 5410 e <strong>Queda de Tensão Máxima (ΔV ≤ 2.0% parcial, ≤ 4.0% acumulado)</strong>.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-family: monospace; font-size: 10px; margin-top: 6px;">
                    <div>Trifásica: <strong>Ib = P / (√3 × V × cosφ) = 60.000 / (1,732 × 380 × 0,98) = 93,0 A</strong></div>
                    <div>Monofásica: <strong>Ib = P / (V × cosφ) = 7.400 / (220 × 0,98) = 34,3 A</strong></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. RESUMO DE CONDUTORES E QUEDAS DE TENSÃO TRECHO A TRECHO</span>
                    <span class="badge badge-blue">ΔV Acumulada: 1,62%</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Trecho</th>
                            <th>Origem / Destino</th>
                            <th style="text-align: center;">Distância</th>
                            <th style="text-align: center;">Ib (A)</th>
                            <th style="text-align: center;">Disjuntor</th>
                            <th>Cabo Fase / Bitola</th>
                            <th style="text-align: center;">Duto</th>
                            <th style="text-align: right;">Queda ΔV</th>
                        </tr>
                    </thead>
                    <tbody style="font-family: monospace;">
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Trecho 1</td>
                            <td style="font-family: 'Montserrat', sans-serif;">Padrão CEMIG ➔ QGBT</td>
                            <td style="text-align: center;">25 m</td>
                            <td style="text-align: center;">185 A</td>
                            <td style="text-align: center; color: #E45318; font-weight: 700;">200A CM</td>
                            <td>95 mm² Cu (ou 120 mm² Al)</td>
                            <td style="text-align: center;">2.1/2"</td>
                            <td style="text-align: right; color: #00B356; font-weight: 700;">0.82%</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Trecho 2</td>
                            <td style="font-family: 'Montserrat', sans-serif;">QGBT ➔ Trafo Dyn1</td>
                            <td style="text-align: center;">10 m</td>
                            <td style="text-align: center;">135 A</td>
                            <td style="text-align: center; color: #E45318; font-weight: 700;">150A CM</td>
                            <td>70 mm² Cu</td>
                            <td style="text-align: center;">2"</td>
                            <td style="text-align: right; color: #00B356; font-weight: 700;">0.45%</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Trecho 3</td>
                            <td style="font-family: 'Montserrat', sans-serif;">Trafo Dyn1 ➔ QDC-VE</td>
                            <td style="text-align: center;">15 m</td>
                            <td style="text-align: center;">91 A</td>
                            <td style="text-align: center; color: #E45318; font-weight: 700;">125A CM</td>
                            <td>35 mm² Cu</td>
                            <td style="text-align: center;">2"</td>
                            <td style="text-align: right; color: #00B356; font-weight: 700;">0.35%</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Trecho 4</td>
                            <td style="font-family: 'Montserrat', sans-serif;">QDC-VE ➔ Carregador DC</td>
                            <td style="text-align: center;">15 m</td>
                            <td style="text-align: center;">91 A (45,5A/pistola)</td>
                            <td style="text-align: center; color: #E45318; font-weight: 700;">100A CM</td>
                            <td>35 mm² Cu</td>
                            <td style="text-align: center;">2"</td>
                            <td style="text-align: right; color: #00B356; font-weight: 700;">0.40%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>3. GESTÃO DINÂMICA DE CARGA (DLM) & TRAFO DYN1</span>
                    <span class="badge badge-green">Proteção Ativa</span>
                </div>
                <p>
                    <strong>Algoritmo DLM IEC 61851:</strong> O controlador modula dinamicamente a corrente de saída entre 6A e 32A com base na margem 
                    <code>P_disp(t) = P_max - P_imovel(t)</code>, impedindo qualquer sobrecarga no padrão C6 200A.
                </p>
                <p>
                    <strong>Transformador Elevador Dyn1 80 kVA:</strong> Transforma 220V delta para 380V estrela aterrado com neutro acessível no secundário (TN-S), 
                    rendimento η = 97,5% e disjuntor primário Curva D de 150A com tolerância a inrush.
                </p>
            </div>

            {get_signatures_html()}
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # 4. CADERNO DE OBRA & INSTRUÇÕES DE CAMPO
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 4,
            "filename": "parte_04_caderno_obra_campo.pdf",
            "title": "Caderno de Obra & Instruções de Campo",
            "html": f"""
            {get_report_header_html(4, "CADERNO DE OBRA & INSTRUÇÕES DE CAMPO")}

            <div class="card">
                <div class="card-title">
                    <span>DIRETRIZES DE EXECUÇÃO EM CANTEIRO (NBR 5410 & NR-10)</span>
                    <span class="badge badge-orange">Execução Técnica</span>
                </div>
                <div class="grid-2">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #E45318; font-size: 10.5px;">1. Instalação dos Eletrodutos:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Eletrodutos PEAD envelopados em piso com fita de advertência a 20cm acima da tubulação. Perfilados aparentes fixados a cada 1,20m. Taxa de ocupação rigorosamente ≤ 40%.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #E45318; font-size: 10.5px;">2. Torques de Aperto Recomendados:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Disjuntores Caixa Moldada: <strong>18 a 22 N·m</strong> com torquímetro calibrado. Disjuntores DIN: <strong>2,5 a 3,5 N·m</strong>. Barramentos M8/M10: <strong>25 N·m</strong> com arruelas de pressão.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #E45318; font-size: 10.5px;">3. Código de Cores dos Condutores:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Fases R, S, T: Preto, Vermelho e Branco (ou Marrom). Neutro: Azul-claro obrigatório em toda a extensão. Proteção (PE): Verde ou Verde-amarelo exclusivo.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #E45318; font-size: 10.5px;">4. Botão de Emergência:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Distância mínima de 5 metros do totem de recarga, altura de montagem entre 1,20m e 1,40m do piso acabado, com sinalização fotoluminescente de rota desimpedida.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #0A192F; font-size: 10.5px;">5. Montagem do Trafo Dyn1:</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Distanciamento mínimo de 500 mm das paredes para convecção natural. Coxins de borracha vulcanizada (vibra-stop) nas 4 sapatas. Aterramento do neutro secundário X0 direto no BEP.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        <strong style="color: #00B356; font-size: 10.5px;">6. Comunicação DLM (RS485):</strong>
                        <p style="font-size: 9.5px; margin-top: 3px;">
                            Cabo de par trançado blindado STP 1x2x24 AWG em duto metálico exclusivo, aterrado em ponto único. Resistores de terminação de 120 Ω nos extremos do barramento.
                        </p>
                    </div>
                </div>
            </div>

            {get_signatures_html()}
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # 5. RELATÓRIO DE COMISSIONAMENTO & CHECKLIST (FOTO 01 NA ÍNTEGRA!)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 5,
            "filename": "parte_05_relatorio_comissionamento_checklist.pdf",
            "title": "Relatório de Comissionamento & Checklist",
            "html": f"""
            {get_report_header_html(5, "RELATÓRIO DE COMISSIONAMENTO & CHECKLIST")}

            <div class="card">
                <div class="card-title">
                    <span>CHECKLIST PRÉ-ENERGIZAÇÃO E TESTES DE ACEITE</span>
                    <span class="badge badge-green">8 Ensaios Homologados</span>
                </div>
                <p style="font-size: 9.5px; color: #475569; margin-bottom: 8px;">
                    Procedimento mandatório de ensaios elétricos antes da liberação final ao cliente e usuários de veículos elétricos.
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Ensaio / Verificação Técnica</th>
                            <th>Critério de Aceitação</th>
                            <th style="text-align: center;">Resultado</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: 700;">1. Continuidade dos Condutores de Proteção (PE)</td>
                            <td style="color: #475569;">Resistência ôhmica R ≤ 0.2 Ω entre o BEP e a carcaça do VE</td>
                            <td style="text-align: center; font-family: monospace;">0.08 Ω</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">2. Ensaio de Resistência de Isolamento (Megômetro)</td>
                            <td style="color: #475569;">Tensão 500V CC • Resistência R_iso ≥ 1.0 MΩ</td>
                            <td style="text-align: center; font-family: monospace;">&gt; 150 MΩ</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">3. Isolamento dos Enrolamentos do Trafo Dyn1</td>
                            <td style="color: #475569;">Tensão 1000V CC (Prim-Carcaça, Sec-Carcaça, Prim-Sec) ≥ 100 MΩ</td>
                            <td style="text-align: center; font-family: monospace;">&gt; 250 MΩ</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">4. Relação de Transformação de Tensão (TTR)</td>
                            <td style="color: #475569;">220V Δ para 380V Y (Relação 1:1.732 ± 0.5%) e defasagem 30°</td>
                            <td style="text-align: center; font-family: monospace;">1.731 (0.05%)</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">5. Tempo de Atuação do Dispositivo DR (30mA)</td>
                            <td style="color: #475569;">Disparo com corrente residual em tempo ≤ 300 ms</td>
                            <td style="text-align: center; font-family: monospace;">24 ms</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">6. Teste de Botão de Emergência e Bobina MX</td>
                            <td style="color: #475569;">Abertura instantânea do disjuntor geral em menos de 50ms</td>
                            <td style="text-align: center; font-family: monospace;">&lt; 35 ms</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">7. Comunicação OCPP e Sinal Pilot PWM IEC 61851</td>
                            <td style="color: #475569;">Transição correta Estados A ➔ B ➔ C (Veículo Conectado e Carregando)</td>
                            <td style="text-align: center; font-family: monospace;">100% OK</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">8. Simulação de Fail-Safe Watchdog do Sistema DLM</td>
                            <td style="color: #475569;">Desconexão física forçada do cabo RS485 reduz corrente para 6A em ≤ 3s</td>
                            <td style="text-align: center; font-family: monospace;">1.8 s (6A)</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">APROVADO</td>
                        </tr>
                    </tbody>
                </table>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px;">
                    <span>Instrumento Utilizado: Alicate Terrômetro / Megômetro Fluke 1664 FC Calibrado</span>
                    <strong style="color: #00B356;">Comissionamento Concluído com Sucesso</strong>
                </div>
            </div>

            {get_signatures_html()}
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # 6. DOSSIÊ DE VIABILIDADE & NEGÓCIOS (FOTO 02 NA ÍNTEGRA!)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 6,
            "filename": "parte_06_dossie_viabilidade_negocios.pdf",
            "title": "Dossiê de Viabilidade & Negócios (CoenergyGO)",
            "html": f"""
            {get_report_header_html(6, "DOSSIÊ DE VIABILIDADE & NEGÓCIOS (COENERGYGO)")}

            <!-- CAPÍTULO 1 - FORMATO EXATO DA FOTO 02 -->
            <div class="card card-dark" style="padding: 14px 16px; border-radius: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #00B356; background-color: rgba(0,179,86,0.15); border: 1px solid rgba(0,179,86,0.3); padding: 2px 6px; border-radius: 9999px;">
                            CAPÍTULO 1 - SUMÁRIO EXECUTIVO & DIAGNÓSTICO INSTITUCIONAL
                        </span>
                        <h3 style="font-size: 13px; font-weight: 800; color: #ffffff; margin-top: 4px;">
                            Dossiê de Viabilidade & Hub Comercial de Recarga Rápida
                        </h3>
                    </div>
                    <div style="text-align: right; background-color: rgba(0,179,86,0.15); border: 1px solid rgba(0,179,86,0.4); padding: 4px 8px; border-radius: 8px;">
                        <span style="font-size: 7.5px; text-transform: uppercase; color: #4ade80; font-weight: 800; display: block;">VEREDITO DO COMITÊ</span>
                        <strong style="font-size: 9.5px; color: #ffffff; font-weight: 900;">GO — PROJETO APROVADO</strong>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2.2fr 1fr; gap: 12px; align-items: start;">
                    <div>
                        <div style="background-color: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; font-size: 9px; margin-bottom: 8px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px;">
                                <div>
                                    <span style="color: #94a3b8; font-size: 7.5px; text-transform: uppercase; font-weight: 700; display: block;">CLIENTE / OPERADORA CONTRATANTE:</span>
                                    <strong style="color: #ffffff; font-size: 10px;">CoenergyGO</strong>
                                    <span style="color: #94a3b8; display: block; font-size: 8px;">Gestão e Implantação de Eletromobilidade</span>
                                </div>
                                <div>
                                    <span style="color: #94a3b8; font-size: 7.5px; text-transform: uppercase; font-weight: 700; display: block;">PROPRIETÁRIO / CEDENTE DO IMÓVEL:</span>
                                    <strong style="color: #00B356; font-size: 10px;">Saint Clair</strong>
                                    <span style="color: #94a3b8; display: block; font-size: 8px;">Cessão de Espaço no Pátio de Lojas Comerciais</span>
                                </div>
                            </div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px;">
                                <span style="color: #94a3b8; font-size: 7.5px; text-transform: uppercase; font-weight: 700; display: block;">ENDEREÇO GEORREFERENCIADO:</span>
                                <span style="color: #e2e8f0; font-size: 8.5px;">Travessa Olavo Bilac, Canaã, Sete Lagoas - MG, CEP 35700-528</span>
                                <span style="color: #4ade80; font-family: monospace; font-size: 8px; display: block; margin-top: 1px;">Coordenadas de Alta Precisão: -19.4703402, -44.2634043 (Trava Permanente Ativa)</span>
                            </div>
                        </div>

                        <p style="color: #cbd5e1; font-size: 9px; line-height: 1.45; margin-bottom: 5px;">
                            O presente projeto contempla a implantação e homologação de um Hub Comercial de Recarga Rápida DC com potência agregada de <strong style="color: #00B356;">60.0 kW</strong> (2 pontos/pistolas de recarga simultâneos atendendo 2 vagas exclusivas).
                        </p>
                        <p style="color: #94a3b8; font-size: 8.5px; line-height: 1.45; margin-bottom: 0;">
                            A modelagem adota a metodologia de inteligência financeira da <strong>CoenergyGO Intelligence</strong> e o rigor eletrotécnico da <strong>Cordeiro Energia</strong>, combinando alta rentabilidade de fluxo de caixa, segurança jurídica (CNAE 5229-0/99 • Resolução ANEEL 819/2018) e maximização da margem operacional com usina solar própria.
                        </p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="background-color: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; text-align: center;">
                            <span style="font-size: 7.5px; text-transform: uppercase; color: #94a3b8; font-weight: 800; display: block; letter-spacing: 0.05em;">SCORE DO PONTO AHP</span>
                            <div style="font-size: 22px; font-weight: 900; color: #00B356; line-height: 1.1; margin: 2px 0;">
                                66.5 <span style="font-size: 11px; font-weight: 400; color: #94a3b8;">/ 100</span>
                            </div>
                            <span style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #4ade80; background-color: rgba(0,179,86,0.2); padding: 1px 6px; border-radius: 9999px;">
                                CLASSIFICAÇÃO: MUITO BOM
                            </span>
                        </div>

                        <div style="background-color: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; text-align: center;">
                            {'<img src="data:image/png;base64,' + facade_b64 + '" style="width: 100%; height: 50px; object-fit: cover; border-radius: 6px;" />' if facade_b64 else '<div style="height: 50px; background-color: #1e3a5f; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #94a3b8;">Foto da Fachada</div>'}
                            <span style="font-size: 7.5px; color: #cbd5e1; display: block; margin-top: 3px; font-weight: 600;">Fachada / Estacionamento do Imóvel</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- OS 4 CARDS FUNDAMENTAIS DA FOTO 02 -->
            <div class="grid-4" style="margin-bottom: 12px;">
                <div class="kpi-box" style="border-left: 3px solid #0A192F;">
                    <div class="kpi-lbl">CAPEX TOTAL ESTIMADO</div>
                    <div class="kpi-num" style="font-size: 14px;">R$ 133.844,00</div>
                    <div class="kpi-sub">Equipamentos (R$ 85.000) + Infra Civil/Elétrica</div>
                </div>
                <div class="kpi-box" style="border-left: 3px solid #00B356; background-color: #f0fdf4;">
                    <div class="kpi-lbl" style="color: #166534;">PAYBACK DESCONTADO</div>
                    <div class="kpi-num green-val" style="font-size: 14px;">20.9 meses</div>
                    <div class="kpi-sub" style="color: #15803d;">Com Usina Solar (47.3 meses na Rede CEMIG)</div>
                </div>
                <div class="kpi-box" style="border-left: 3px solid #1d4ed8; background-color: #eff6ff;">
                    <div class="kpi-lbl" style="color: #1e40af;">TAXA INTERNA RETORNO (TIR)</div>
                    <div class="kpi-num" style="color: #1d4ed8; font-size: 14px;">50.5% <span style="font-size: 9px; font-weight: 400;">a.a.</span></div>
                    <div class="kpi-sub" style="color: #1e40af;">Fase Solar (21.6% a.a. na Rede CEMIG)</div>
                </div>
                <div class="kpi-box" style="border-left: 3px solid #E45318; background-color: #fff7ed;">
                    <div class="kpi-lbl" style="color: #9a3412;">MARGEM LÍQUIDA</div>
                    <div class="kpi-num highlight-val" style="font-size: 14px;">62.1%</div>
                    <div class="kpi-sub" style="color: #9a3412;">Cenário Base 4h/dia (R$ 6.395,78/mês)</div>
                </div>
            </div>

            <!-- CAPÍTULO 2: LOCALIZAÇÃO & CONCORRÊNCIA -->
            <div class="card">
                <div class="card-title">
                    <span>CAPÍTULO 2 • LOCALIZAÇÃO, ANCORAGEM & CONCORRÊNCIA LOCAL</span>
                    <span class="badge badge-blue">Sete Lagoas / MG</span>
                </div>
                <p>
                    O ponto está situado na Travessa Olavo Bilac, ancorado em galeria comercial 24 horas, oferecendo conveniência permanente, iluminação e sanitários. 
                    A população de Sete Lagoas é de <strong>241.835 habitantes</strong> (IBGE), com frota projetada de <strong>780 veículos elétricos</strong> em 2026. 
                    No raio de 5 km, mapearam-se 3 postos rápidos DC (Graal a 1,8km, Mart Minas a 2,4km e Shopping a 3,8km), consolidando a oportunidade estratégica da galeria com operação contínua 24h.
                </p>
            </div>

            <!-- CAPÍTULO 3 & 4: ELÉTRICA & BOM -->
            <div class="card">
                <div class="card-title">
                    <span>CAPÍTULO 3 & 4 • ENGENHARIA ELÉTRICA (C6 200A) & CAPEX (R$ 133.844)</span>
                    <span class="badge badge-green">Sem Aumento de Demanda</span>
                </div>
                <p>
                    <strong>Padrão C6 200A (75 kW):</strong> Folga de 67,1 kW para atendimento direto da estação de 60 kW em carga plena. 
                    Dispensa construção de subestação primária de média tensão 13,8 kV (economia de R$ 80.000 a R$ 120.000). 
                    <strong>CAPEX Consolidado:</strong> Estação BENY DC 60 kW SiC (R$ 85.000,00) + QDC-VE NBR 17019, cabos Sintenax 35mm², civil, marketing e engenharia ART (R$ 48.844,00) = <strong>R$ 133.844,00</strong>.
                </p>
            </div>

            <!-- CAPÍTULO 5: DRE EM 3 CENÁRIOS -->
            <div class="card">
                <div class="card-title">
                    <span>CAPÍTULO 5 • MODELAGEM FINANCEIRA & FLUXO DE CAIXA EM 3 CENÁRIOS</span>
                    <span class="badge badge-green">Tarifa Venda: R$ 2,00/kWh</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Variável de Performance</th>
                            <th style="text-align: center;">Conservador (4h/dia)</th>
                            <th style="text-align: center;">Moderado (6h/dia)</th>
                            <th style="text-align: center;">Otimista (8h/dia)</th>
                        </tr>
                    </thead>
                    <tbody style="font-family: monospace;">
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Energia Entregue Mensal</td>
                            <td style="text-align: center;">6.480 kWh/mês</td>
                            <td style="text-align: center;">9.720 kWh/mês</td>
                            <td style="text-align: center;">12.960 kWh/mês</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Faturamento Bruto Mensal</td>
                            <td style="text-align: center;">R$ 12.960,00</td>
                            <td style="text-align: center;">R$ 19.440,00</td>
                            <td style="text-align: center;">R$ 25.920,00</td>
                        </tr>
                        <tr style="background-color: #ecfdf5;">
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700; color: #166534;">Lucro Líquido Solar (+76%)</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">R$ 6.395,78</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">R$ 9.791,67</td>
                            <td style="text-align: center; color: #00B356; font-weight: 800;">R$ 13.187,56</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700; color: #475569;">Lucro Líquido na Rede CEMIG</td>
                            <td style="text-align: center; color: #475569;">R$ 2.827,80</td>
                            <td style="text-align: center; color: #475569;">R$ 4.439,70</td>
                            <td style="text-align: center; color: #475569;">R$ 6.051,60</td>
                        </tr>
                        <tr style="background-color: #ecfdf5;">
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Payback Descontado (Solar)</td>
                            <td style="text-align: center; color: #00B356; font-weight: 900;">20,9 Meses</td>
                            <td style="text-align: center; color: #00B356; font-weight: 900;">13,7 Meses</td>
                            <td style="text-align: center; color: #00B356; font-weight: 900;">10,1 Meses</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Payback na Rede CEMIG</td>
                            <td style="text-align: center; color: #64748b;">47,3 Meses</td>
                            <td style="text-align: center; color: #64748b;">30,1 Meses</td>
                            <td style="text-align: center; color: #64748b;">22,1 Meses</td>
                        </tr>
                        <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-weight: 700;">Taxa Interna de Retorno (TIR)</td>
                            <td style="text-align: center; color: #1d4ed8; font-weight: 800;">50,5% a.a.</td>
                            <td style="text-align: center; color: #1d4ed8; font-weight: 800;">81,2% a.a.</td>
                            <td style="text-align: center; color: #1d4ed8; font-weight: 800;">112,4% a.a.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {get_signatures_html()}
            """
        }
    ]


# =============================================================================
# ENGENHARIA DE RENDERIZAÇÃO HTML -> PDF
# =============================================================================
def render_html_to_pdf(html_content: str, output_pdf_path: Path) -> bool:
    full_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório Técnico Oficial • Cordeiro Energia</title>
    <style>
        {COMMON_CSS}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
"""
    # 1. Tentativa via WeasyPrint
    if WEASYPRINT_AVAILABLE:
        try:
            doc = weasyprint.HTML(string=full_html)
            doc.write_pdf(target=str(output_pdf_path))
            return True
        except Exception as weasy_err:
            print(f"    [AVISO] WeasyPrint falhou ({weasy_err}). Acionando motor Chromium...")

    # 2. Fallback via Edge / Chrome Headless (Nativo Windows)
    temp_html_path = output_pdf_path.with_suffix(".html")
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    browser_candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]

    selected_browser = next((b for b in browser_candidates if os.path.exists(b)), None)
    if not selected_browser:
        print("    [ERRO CRÍTICO] Nenhum navegador Chromium/Edge encontrado para impressão headless.")
        return False

    cmd = [
        selected_browser,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--virtual-time-budget=2500",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf_path.resolve()}",
        "--no-pdf-header-footer",
        str(temp_html_path.resolve()),
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if temp_html_path.exists():
            temp_html_path.unlink()
        return res.returncode == 0 and output_pdf_path.exists()
    except Exception as cmd_err:
        print(f"    [ERRO] Falha ao executar Chromium headless: {cmd_err}")
        return False


# =============================================================================
# GERAÇÃO INDIVIDUAL DAS PARTES SELECIONADAS
# =============================================================================
def generate_individual_pdfs(reports: List[Dict[str, Any]], temp_dir: Path) -> List[Path]:
    generated_files = []
    print("\n" + "="*70)
    print("ETAPA 1: GERAÇÃO INDIVIDUAL DOS RELATÓRIOS OFICIAIS")
    print("="*70)

    for rep in reports:
        rep_id = rep["id"]
        filename = rep["filename"]
        target_path = temp_dir / filename
        print(f"  • Processando Relatório {rep_id:02d}: '{rep['title']}'...")
        try:
            if render_html_to_pdf(rep["html"], target_path) and target_path.exists():
                file_size_kb = target_path.stat().st_size / 1024
                print(f"    [SUCESSO] Gerado '{filename}' ({file_size_kb:.1f} KB)")
                generated_files.append(target_path)
            else:
                print(f"    [AVISO] Relatório {rep_id:02d} não pôde ser gerada.")
        except Exception as ex:
            print(f"    [ERRO] Exceção no Relatório {rep_id:02d}: {ex}")

    return generated_files


# =============================================================================
# MESCLAGEM SEQUENCIAL DOS ARQUIVOS PDF (PYPDF)
# =============================================================================
def merge_pdf_files(pdf_paths: List[Path], final_output_path: Path) -> bool:
    print("\n" + "="*70)
    print("ETAPA 2: MESCLAGEM (MERGE) SEQUENCIAL DOS DOCUMENTOS (PYPDF)")
    print("="*70)

    if not pdf_paths:
        return False

    merger = PDF_MERGER_CLASS()
    total_pages = 0

    try:
        for idx, pdf_path in enumerate(pdf_paths, start=1):
            try:
                reader = PdfReader(str(pdf_path))
                num_pages = len(reader.pages)
                total_pages += num_pages
                merger.append(str(pdf_path))
                print(f"  [{idx:02d}/{len(pdf_paths):02d}] Adicionado '{pdf_path.name}' — {num_pages} página(s)")
            except Exception as read_err:
                print(f"  [AVISO] Erro ao ler '{pdf_path.name}': {read_err}")

        with open(final_output_path, "wb") as output_file:
            merger.write(output_file)

        merger.close()
        final_size_kb = final_output_path.stat().st_size / 1024
        print(f"\n  [SUCESSO] Documento Final Consolidado com Êxito!")
        print(f"  Arquivo: {final_output_path.resolve()}")
        print(f"  Tamanho Total: {final_size_kb:.1f} KB | Total de Páginas: {total_pages}")
        return True
    except Exception as merge_err:
        print(f"  [ERRO CRÍTICO] Falha na mesclagem: {merge_err}")
        return False


# =============================================================================
# LIMPEZA E FEEDBACK
# =============================================================================
def cleanup_temp_files(temp_dir: Path):
    print("\n" + "="*70)
    print("ETAPA 3: LIMPEZA DE ARQUIVOS TEMPORÁRIOS")
    print("="*70)
    if temp_dir.exists():
        try:
            shutil.rmtree(temp_dir)
            print(f"  [LIMPEZA] Diretório temporário '{temp_dir}' removido com sucesso.")
        except Exception as err:
            print(f"  [AVISO] Não foi possível remover '{temp_dir}': {err}")


# =============================================================================
# EXECUÇÃO PRINCIPAL DO PIPELINE
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description="Gerador de PDF dos 6 Relatórios Oficiais da Suíte CoenergyGO")
    parser.add_argument(
        "--parts",
        type=str,
        default="all",
        help="Relatórios a gerar: 'all' (1 a 6) ou números separados por vírgula (ex: '5', '6', '1,5,6')"
    )
    args = parser.parse_args()

    print("""
    =================================================================
       CORDEIRO ENERGIA • AUTOMAÇÃO DE RELATÓRIOS TÉCNICOS EM PDF
       Suíte CoenergyGO — Os 6 Documentos Oficiais de Engenharia
    =================================================================
    """)

    base_dir = Path(__file__).resolve().parent.parent
    temp_dir = base_dir / "output" / "temp_parts"
    output_dir = base_dir / "output"

    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    all_reports = get_official_reports()

    # Mapeamento de nomes de arquivo para cada relatório único
    single_report_filenames = {
        1: "Cordeiro_Energia_Relatorio_Executivo_Comercial_Sete_Lagoas_Coenergy.pdf",
        2: "Cordeiro_Energia_Memorial_Descritivo_Instalacao_Sete_Lagoas_Coenergy.pdf",
        3: "Cordeiro_Energia_Memorial_Calculo_Eletrotecnico_Sete_Lagoas_Coenergy.pdf",
        4: "Cordeiro_Energia_Caderno_Obra_Instrucoes_Campo_Sete_Lagoas_Coenergy.pdf",
        5: "Cordeiro_Energia_Relatorio_Comissionamento_Checklist_Sete_Lagoas_Coenergy.pdf",
        6: "Cordeiro_Energia_Dossie_Viabilidade_Negocios_Sete_Lagoas_Coenergy.pdf",
    }

    if args.parts.lower() in ("all", "todas", "1-6", "1,2,3,4,5,6", "tudo"):
        selected_ids = [1, 2, 3, 4, 5, 6]
        output_filename = "Cordeiro_Energia_Dossie_Tecnico_Completo_Sete_Lagoas_Coenergy.pdf"
    else:
        try:
            selected_ids = [int(p.strip()) for p in args.parts.split(",") if p.strip()]
            if len(selected_ids) == 1 and selected_ids[0] in single_report_filenames:
                output_filename = single_report_filenames[selected_ids[0]]
            else:
                parts_str = "_".join(map(str, sorted(selected_ids)))
                output_filename = f"Cordeiro_Energia_Relatorios_{parts_str}_Sete_Lagoas_Coenergy.pdf"
        except Exception:
            selected_ids = [1, 2, 3, 4, 5, 6]
            output_filename = "Cordeiro_Energia_Dossie_Tecnico_Completo_Sete_Lagoas_Coenergy.pdf"

    selected_reports = [r for r in all_reports if r["id"] in selected_ids]
    if not selected_reports:
        print(f"[ERRO] Nenhum relatório válido selecionado a partir de '{args.parts}'.")
        sys.exit(1)

    print(f"• Relatórios Selecionados: {[r['id'] for r in selected_reports]} de 6")
    print(f"• Nome do Arquivo de Saída: {output_filename}")

    final_pdf_path = output_dir / output_filename
    individual_pdfs = generate_individual_pdfs(selected_reports, temp_dir)

    if individual_pdfs and merge_pdf_files(individual_pdfs, final_pdf_path):
        cleanup_temp_files(temp_dir)

        # Copia para Downloads do usuário
        user_downloads = Path("C:/Users/BRUNO CORDEIRO/Downloads")
        if user_downloads.exists():
            dest_download = user_downloads / output_filename
            try:
                shutil.copy2(final_pdf_path, dest_download)
                print(f"  [CÓPIA] Arquivo copiado para Downloads:\n  {dest_download.resolve()}")
            except Exception as copy_err:
                alt_download = user_downloads / f"{final_pdf_path.stem}_{os.getpid()}.pdf"
                try:
                    shutil.copy2(final_pdf_path, alt_download)
                    print(f"  [CÓPIA ALTERNATIVA] Arquivo anterior estava em uso. Salvo como:\n  {alt_download.resolve()}")
                except Exception:
                    print(f"  [AVISO] Falha ao copiar para Downloads: {copy_err}")

        print("\n" + "#"*70)
        print("PIPELINE CONCLUÍDO COM SUCESSO ABSOLUTO!")
        print(f"Dossiê Oficial Disponível em:\n{final_pdf_path.resolve()}")
        print("#"*70 + "\n")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
