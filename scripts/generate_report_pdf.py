#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SISTEMA DE AUTOMAÇÃO DE DOCUMENTOS & GERAÇÃO DE RELATÓRIO TÉCNICO MULTI-PARTE
=============================================================================
Desenvolvido para: Cordeiro Energia / Suíte CoenergyGO
Projeto: Hub de Recarga Rápida DC (BENY 60 kW SiC) • Galeria 24h • Sete Lagoas / MG
Padrão Normativo: ABNT NBR 5410, NBR 17019, CEMIG ND-5.1 e ND-5.3

Este script gera o DOSSIÊ INTEGRAL E COMPLETO contendo TODAS as 6 partes oficiais
do relatório executivo dimensionado e levantado no projeto de Sete Lagoas:
  • Parte 1: Sumário Executivo & Identificação do Ativo (Passo 1A)
  • Parte 2: Macro-Diagnóstico Demográfico IBGE & Varredura de Concorrência DC (Passo 1B)
  • Parte 3: Engenharia Elétrica CEMIG & Normas Técnicas NBR 17019 / CBMMG (Passo 2A/2B)
  • Parte 4: Especificação Técnica BENY 60 kW SiC & CAPEX Modular BOM R$ 133.844 (Passo 3/4B)
  • Parte 5: Modelagem Financeira CoenergyGO & Análise de Viabilidade (Passo 5)
  • Parte 6: Cronograma de Implantação Física (12 Semanas) & Termo de Encerramento (Passo 6)

Permite gerar o documento inteiro (todas as 6 partes) ou qualquer subconjunto
selecionado via argumento de linha de comando (--parts 1,2,5 ou --all).
=============================================================================
"""

import os
import sys
import shutil
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
    margin: 10mm 12mm;
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
    font-size: 11px;
    line-height: 1.55;
}

h1, h2, h3, h4 {
    margin: 0;
    font-weight: 700;
}

p {
    text-align: justify;
    text-justify: inter-word;
    margin: 0 0 10px 0;
}

.report-header {
    background-color: #0A192F;
    color: #ffffff;
    padding: 16px 20px;
    border-radius: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #E45318;
}

.report-header .title {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
}

.report-header .subtitle {
    font-size: 9.5px;
    color: #94a3b8;
    margin-top: 3px;
}

.card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 14px;
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
    padding-bottom: 8px;
    margin-bottom: 12px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #0f172a;
}

.card-dark .card-title {
    border-bottom-color: #1e3a5f;
    color: #ffffff;
}

.badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 9999px;
    font-size: 8.5px;
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
    gap: 10px;
}

.grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}

.kpi-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
}

.kpi-lbl {
    font-size: 8.5px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 3px;
}

.kpi-num {
    font-size: 13px;
    font-weight: 900;
    color: #0f172a;
}

.kpi-sub {
    font-size: 8px;
    color: #94a3b8;
    margin-top: 3px;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 10px;
}

th {
    background-color: #0A192F;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

td {
    padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9;
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
    margin-top: 24px;
    padding-top: 16px;
    border-top: 2px solid #e2e8f0;
    page-break-inside: avoid;
    break-inside: avoid;
}

.sig-line {
    border-bottom: 1px solid #94a3b8;
    height: 36px;
    margin-bottom: 6px;
}

ul {
    margin: 4px 0 10px 0;
    padding-left: 18px;
}

li {
    margin-bottom: 4px;
}
"""


# =============================================================================
# DEFINIÇÃO DAS 6 PARTES OFICIAIS DO RELATÓRIO EXECUTIVO (SETE LAGOAS)
# =============================================================================
def get_report_parts_mapping() -> List[Dict[str, Any]]:
    return [
        # ─────────────────────────────────────────────────────────────────────
        # PARTE 1: SUMÁRIO EXECUTIVO & IDENTIFICAÇÃO DO ATIVO (PASSO 1A)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 1,
            "filename": "parte_01_sumario_executivo_ativo.pdf",
            "title": "Parte 1: Sumário Executivo & Identificação do Ativo (Passo 1A)",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Parte 1 • Passo 1A • Sumário Executivo</span>
                    <div class="title" style="margin-top: 4px;">Hub Comercial de Recarga Rápida DC — Sete Lagoas / MG</div>
                    <div class="subtitle">Metodologia CoenergyGO Intelligence • Padrão de Engenharia Cordeiro Energia</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-orange">Ativo Homologado</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">BENY DC 60 kW SiC Dual-Gun</div>
                </div>
            </div>

            <div class="card card-dark">
                <div class="card-title">
                    <span>1. IDENTIFICAÇÃO DO ATIVO & PARTES ENVOLVIDAS</span>
                    <span class="badge badge-green">Sete Lagoas - MG</span>
                </div>
                <p>
                    O presente relatório técnico e executivo consolida o dimensionamento eletrotécnico de engenharia, 
                    o diagnóstico locacional multicritério e a modelagem econômico-financeira para a implantação de um Hub 
                    de Carregamento Ultrarrápido em Corrente Contínua (DC) para Veículos Elétricos (VE). O projeto está situado 
                    nas dependências da Galeria Comercial de Lojas com operação contínua 24 horas, no município de Sete Lagoas / MG.
                </p>
                <div class="grid-4" style="margin-top: 12px;">
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Proprietário do Imóvel</div>
                        <div class="kpi-num" style="color: #ffffff; font-size: 12px;">Sr. Saint Clair</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Operadora / Investidora</div>
                        <div class="kpi-num" style="color: #00B356; font-size: 12px;">CoenergyGO</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Público-Alvo</div>
                        <div class="kpi-num" style="color: #ffffff; font-size: 11px;">Motoristas App & Viajantes</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Tecnologia Homologada</div>
                        <div class="kpi-num" style="color: #E45318; font-size: 11px;">BENY DC 60 kW SiC</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. ANÁLISE DE CONVENIÊNCIA & ATRATIVIDADE NO RAIO DE 500 METROS</span>
                    <span class="badge badge-blue">Dwell Time Otimizado</span>
                </div>
                <p>
                    A localização estratégica do Hub na galeria comercial oferece a sinergia perfeita entre o tempo de recarga 
                    rápida de baterias (entre 35 e 45 minutos) e o tempo médio de permanência dos usuários nos estabelecimentos do entorno. 
                    No raio de 500 metros, mapeou-se um ecossistema completo de conveniência que agrega atratividade direta:
                </p>
                <ul>
                    <li><strong>Alimentação & Conveniência:</strong> Cafeteria com Wi-Fi, restaurante expresso e loja de conveniência 24 horas.</li>
                    <li><strong>Serviços Essenciais:</strong> Farmácia, caixas eletrônicos 24h e sanitários climatizados com controle de acesso.</li>
                    <li><strong>Apoio Automotivo:</strong> Posto de combustíveis adjacente com serviços de calibragem de pneus e lavagem rápida.</li>
                    <li><strong>Segurança 24 Horas:</strong> Estacionamento pavimentado, iluminação em LED de alta potência e monitoramento por CFTV.</li>
                </ul>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 2: MACRO-DIAGNÓSTICO DEMOGRÁFICO IBGE & CONCORRÊNCIA DC (PASSO 1B)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 2,
            "filename": "parte_02_diagnostico_ibge_concorrencia.pdf",
            "title": "Parte 2: Demografia IBGE & Concorrência DC (Passo 1B)",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Parte 2 • Passo 1B • Demografia & Concorrência</span>
                    <div class="title" style="margin-top: 4px;">Diagnóstico Demográfico IBGE & Varredura de Concorrência DC</div>
                    <div class="subtitle">Sete Lagoas / MG • Score AHP 66,5 / 100 • Varredura no Raio de 5 km</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-blue">Score AHP: 66,5 / 100</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Grau A — Muito Bom</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. DIAGNÓSTICO DEMOGRÁFICO IBGE & INTELIGÊNCIA LOCACIONAL AHP</span>
                    <span class="badge badge-green">Score Calculado: 66,5 / 100 • Muito Bom</span>
                </div>
                <p>
                    A inteligência locacional multicritério CoenergyGO utiliza a metodologia AHP (Processo Analítico Hierárquico) 
                    ponderando quatro dimensões centrais: densidade demográfica IBGE, renda per capita média, frota estimada de veículos 
                    híbridos/elétricos em Sete Lagoas e intensidade do fluxo viário regional da malha rodoviária circundante.
                </p>
                <div class="grid-4" style="margin: 12px 0;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">População IBGE</div>
                        <div class="kpi-num">241.835 hab.</div>
                        <div class="kpi-sub">Censo IBGE</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Frota VE Projetada 2026</div>
                        <div class="kpi-num highlight-val">780 VEs</div>
                        <div class="kpi-sub">BEV + PHEV</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Score Ponderado AHP</div>
                        <div class="kpi-num green-val">66,5 / 100</div>
                        <div class="kpi-sub">Grau A - Muito Bom</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Comércios em 500m</div>
                        <div class="kpi-num green-val">4 Pontos</div>
                        <div class="kpi-sub">Sinergia Comercial</div>
                    </div>
                </div>
                <p style="font-size: 10px; color: #475569;">
                    *Nota Técnica: O Score AHP de 66,5 pontos reflete alta viabilidade comercial e consolida o ponto como altamente recomendado 
                    para investimento em recarga rápida DC, demonstrando demanda reprimida substancial.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. VARREDURA CRITERIOSA DA CONCORRÊNCIA DC NO RAIO DE 5 KM</span>
                    <span class="badge badge-orange">Ambiente Competitivo DC Mapeado</span>
                </div>
                <p>
                    A varredura de concorrência mapeou as estações de recarga rápida DC no raio de 3 a 5 km: Posto Graal (60 kW DC a 1,8 km), 
                    Mart Minas (60 kW DC a 2,4 km) e Shopping Sete Lagoas (40 kW DC a 3,8 km). Diante desse cenário competitivo, a implantação 
                    do Hub CoenergyGO se consolida estrategicamente com dispensador BENY DC de 60 kW com dois conectores CCS2 simultâneos, 
                    diferenciando-se pela ancoragem comercial contínua de 24 horas, recarga em 35 a 45 minutos e alta segurança patrimonial.
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Estabelecimento / Nome</th>
                            <th style="text-align: center;">Distância</th>
                            <th style="text-align: center;">Potência / Tipo</th>
                            <th>Conectores</th>
                            <th>Observações de Campo / Acesso</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Posto Graal Sete Lagoas</strong></td>
                            <td style="text-align: center; font-family: monospace;">1,8 km</td>
                            <td style="text-align: center;"><span class="badge badge-orange">60 kW DC</span></td>
                            <td>2x CCS2</td>
                            <td>Fila nos horários de pico; voltado prioritariamente para tráfego rodoviário.</td>
                        </tr>
                        <tr>
                            <td><strong>Mart Minas Atacado</strong></td>
                            <td style="text-align: center; font-family: monospace;">2,4 km</td>
                            <td style="text-align: center;"><span class="badge badge-orange">60 kW DC</span></td>
                            <td>2x CCS2</td>
                            <td>Acesso restrito ao horário de funcionamento da loja (fecha às 22h).</td>
                        </tr>
                        <tr>
                            <td><strong>Shopping Sete Lagoas</strong></td>
                            <td style="text-align: center; font-family: monospace;">3,8 km</td>
                            <td style="text-align: center;"><span class="badge badge-orange">40 kW DC</span></td>
                            <td>1x CCS2</td>
                            <td>Cobrança de estacionamento avulso; potência reduzida de 40 kW.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 3: ENGENHARIA ELÉTRICA CEMIG & NORMAS TÉCNICAS (PASSO 2A & 2B)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 3,
            "filename": "parte_03_engenharia_eletrica_cemig_normas.pdf",
            "title": "Parte 3: Engenharia Elétrica CEMIG & Normas Técnicas (Passo 2A/2B)",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Parte 3 • Passo 2A & 2B • Engenharia Eletrotécnica</span>
                    <div class="title" style="margin-top: 4px;">Demanda CEMIG, Balanço de Cargas & Conformidade Normativa</div>
                    <div class="subtitle">ABNT NBR 5410, ABNT NBR 17019 & CEMIG ND-5.1 • CBMMG IT-41</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Padrão C6 200A</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Folga de 67,1 kW</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. ANÁLISE DE CAPACIDADE DE ENTRADA CEMIG & FOLGA DISPONÍVEL</span>
                    <span class="badge badge-green">Sem Custo de Aumento de Demanda</span>
                </div>
                <p>
                    A vistoria técnica e a análise das faturas de energia do imóvel constataram que o padrão de entrada existente 
                    é classificado como <strong>C6 Trifásico (Disjuntor Geral de 200A)</strong> em 380/220V, com limite de fornecimento 
                    de <strong>75,0 kW</strong> conforme a norma CEMIG ND-5.1.
                </p>
                <div class="grid-4" style="margin: 12px 0;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Padrão de Entrada</div>
                        <div class="kpi-num">C6 (200A)</div>
                        <div class="kpi-sub">380/220V Trifásico</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Capacidade Contratada</div>
                        <div class="kpi-num">75,0 kW</div>
                        <div class="kpi-sub">Limite CEMIG ND-5.1</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Carga Atual Medida</div>
                        <div class="kpi-num highlight-val">7,9 kW</div>
                        <div class="kpi-sub">Pico Registrado NBR 5410</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Folga Eletrotécnica</div>
                        <div class="kpi-num green-val">67,1 kW</div>
                        <div class="kpi-sub">Headroom para Recarga</div>
                    </div>
                </div>
                <p>
                    <strong>Regime de Carga Plena:</strong> Como a folga disponível é de <strong>67,1 kW</strong> e a estação rápida BENY 
                    demanda <strong>60,0 kW</strong> a plena carga, a instalação opera em regime de alimentação direta em carga plena sem risco 
                    de desarme do disjuntor geral de 200A e sem necessidade de solicitação onerosa de aumento de carga à concessionária.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. REQUISITOS MANDATÓRIOS DE SEGURANÇA (ABNT NBR 17019 & CBMMG IT-41)</span>
                    <span class="badge badge-blue">100% Homologado</span>
                </div>
                <div class="grid-2">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <strong style="color: #E45318; font-size: 11px;">1. Aterramento TN-S Mandatório:</strong>
                        <p style="margin-top: 4px; font-size: 10px;">
                            Condutor de proteção (PE) exclusivo interligado diretamente ao Barramento de Equipotencialização Principal (BEP), 
                            com malha de aterramento de resistividade inferior a 10 ohms, impedindo tensões perigosas de toque.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <strong style="color: #00B356; font-size: 11px;">2. Dispositivo IDR Tipo B (30 mA):</strong>
                        <p style="margin-top: 4px; font-size: 10px;">
                            Proteção diferencial-residual Tipo B específica para VE, sensível a correntes de fuga contínuas (DC) 
                            geradas por retificadores veiculares e transitórios de chaveamento.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <strong style="color: #1d4ed8; font-size: 11px;">3. Proteção contra Surtos (DPS Classe I+II):</strong>
                        <p style="margin-top: 4px; font-size: 10px;">
                            DPS coordenado nos modos fase-terra e neutro-terra (Up &lt; 1,5 kV), protegendo os semicondutores de Carbeto de Silício (SiC) 
                            do carregador e o inversor de bordo dos veículos.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <strong style="color: #b91c1c; font-size: 11px;">4. Botoeira de Emergência & Combate a Incêndio:</strong>
                        <p style="margin-top: 4px; font-size: 10px;">
                            Comando de parada de emergência tipo cogumelo atuando na bobina de abertura (MX) em tempo inferior a 50 ms, 
                            extintor de pó químico ABC adjacente e sinalização viária conforme NBR 9050.
                        </p>
                    </div>
                </div>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 4: ESPECIFICAÇÃO BENY 60 kW SiC & CAPEX MODULAR BOM (PASSO 3/4B)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 4,
            "filename": "parte_04_especificacao_beny_capex_bom.pdf",
            "title": "Parte 4: Carregador BENY 60 kW SiC & Orçamento CAPEX R$ 133.844 (Passo 3/4B)",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Parte 4 • Passo 3 & 4B • Equipamentos & Orçamento</span>
                    <div class="title" style="margin-top: 4px;">Especificação Técnica BENY 60 kW & Composição de CAPEX</div>
                    <div class="subtitle">Tecnologia SiC Dual-Gun CCS2 • Orçamento Consolidado R$ 133.844,00</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-orange">CAPEX Total</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">R$ 133.844,00</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. ESPECIFICAÇÃO DO CARREGADOR BENY DC 60 KW SiC (DUAL-GUN CCS2)</span>
                    <span class="badge badge-green">Alta Eficiência Energética</span>
                </div>
                <p>
                    A estação selecionada é a <strong>BENY BDC-60 kW</strong>, incorporando semicondutores de Carbeto de Silício (SiC) 
                    de última geração, proporcionando eficiência energética superior a 96% e redução significativa de perdas térmicas.
                </p>
                <div class="grid-4" style="margin: 12px 0;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Potência Máxima</div>
                        <div class="kpi-num">60,0 kW DC</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Conectores</div>
                        <div class="kpi-num">2x CCS Combo 2</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Eficiência SiC</div>
                        <div class="kpi-num green-val">> 96,0%</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Grau de Proteção</div>
                        <div class="kpi-num" style="color: #0A192F;">IP55 / IK10</div>
                    </div>
                </div>
                <p>
                    <strong>Balanceamento Dinâmico de Carga:</strong> O carregador opera de forma inteligente: quando um único veículo está conectado, 
                    entrega até 60 kW de potência contínua; quando dois veículos carregam simultaneamente, o sistema divide a potência em 30 kW + 30 kW, 
                    garantindo atendimento sem interrupções. Inclui modem 4G integrado, leitor RFID e protocolo OCPP 1.6J/2.0.1 JSON para bilhetagem em nuvem.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. ORÇAMENTO MODULAR DE CAPEX & BILL OF MATERIALS (BOM)</span>
                    <span class="badge badge-green">Investimento Consolidado: R$ 133.844,00</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Descrição Detalhada dos Equipamentos, Materiais & Serviços</th>
                            <th style="text-align: center;">Qtd</th>
                            <th style="text-align: right;">Valor Total (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: 700;">01</td>
                            <td><strong>Estação de Recarga BENY DC 60 kW Dual Gun CCS2</strong> (Módulos SiC, OCPP 1.6J/2.0.1, RFID, Tela 7", Gestão Dinâmica)</td>
                            <td style="text-align: center; font-family: monospace;">1 un</td>
                            <td style="text-align: right;" class="highlight-val">R$ 85.000,00</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">02</td>
                            <td><strong>Quadro Geral QDC-VE 380V & Proteções NBR 17019</strong> (Disjuntor Caixa Moldada 125A 36kA, IDR Tipo B 30mA, DPS Classe I+II e Bobina MX)</td>
                            <td style="text-align: center; font-family: monospace;">1 cj</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 15.000,00</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">03</td>
                            <td><strong>Infraestrutura Eletrotécnica & Cabeamento Sintenax 35mm² Cu</strong> (Cabos 0,6/1kV HEPR, Eletrodutos Galvanizados e Aterramento TN-S)</td>
                            <td style="text-align: center; font-family: monospace;">1 cj</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 10.000,00</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">04</td>
                            <td><strong>Obras Civis, Base Estrutural, 4 Balizadores e Pintura Epóxi</strong> (Base de Concreto Armado fck 25 MPa, Vagas NBR 9050 e Sinalização)</td>
                            <td style="text-align: center; font-family: monospace;">1 gl</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 10.000,00</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">05</td>
                            <td><strong>Engenharia, Comissionamento NBR 17019 & ART CREA-MG</strong> (Projeto Executivo e Ensaios Eletrotécnicos Eng. Bruno Cordeiro)</td>
                            <td style="text-align: center; font-family: monospace;">1 gl</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 5.000,00</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 700;">06</td>
                            <td><strong>Marketing, Comunicação Visual, Totem Indicativo & Reserva Técnica</strong> (Sinalização Noturna e Contingência)</td>
                            <td style="text-align: center; font-family: monospace;">1 gl</td>
                            <td style="text-align: right; font-family: monospace; font-weight: 700;">R$ 8.844,00</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #0A192F; color: #ffffff; font-weight: 800;">
                            <td colspan="3" style="text-align: right; text-transform: uppercase;">Investimento Total de Implantação (CAPEX Total):</td>
                            <td style="text-align: right; color: #00B356; font-size: 13px; font-family: monospace;">R$ 133.844,00</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="grid-2" style="margin-top: 8px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 9.5px;">
                        ✓ <strong>Equipamentos Principais:</strong> R$ 85.000,00 (Estação BENY 60 kW com 24 meses de garantia de fábrica).
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 9.5px;">
                        ✓ <strong>Infra Civil & Elétrica:</strong> R$ 48.844,00 (Quadro QDC-VE, cabos 35mm², base civil, marketing e engenharia).
                    </div>
                </div>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 5: MODELAGEM FINANCEIRA COENERGYGO & INDICADORES (PASSO 5)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 5,
            "filename": "parte_05_modelagem_financeira_coenergygo.pdf",
            "title": "Parte 5: Modelagem Financeira CoenergyGO & Retorno (Passo 5)",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Parte 5 • Passo 5 • Viabilidade Econômica</span>
                    <div class="title" style="margin-top: 4px;">Modelagem Financeira CoenergyGO & Análise de Retorno</div>
                    <div class="subtitle">Hub Comercial Sete Lagoas • Venda: R$ 2,00/kWh • Custo Solar: R$ 0,76/kWh</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Payback: 20.9 Meses</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">TIR Solar: 50.5% a.a.</div>
                </div>
            </div>

            <!-- OS 4 CARDS FUNDAMENTAIS DE VIABILIDADE FINANCEIRA DO PROJETO DE SETE LAGOAS -->
            <div class="grid-4" style="margin-bottom: 14px;">
                <div class="kpi-box" style="border-left: 4px solid #0A192F; text-align: left;">
                    <div class="kpi-lbl">CAPEX TOTAL ESTIMADO</div>
                    <div class="kpi-num" style="font-size: 15px;">R$ 133.844,00</div>
                    <div class="kpi-sub">Equipamentos: R$ 85k + Infra Civil/Elétrica: R$ 48.8k</div>
                </div>
                <div class="kpi-box" style="border-left: 4px solid #00B356; background-color: #f0fdf4; text-align: left;">
                    <div class="kpi-lbl" style="color: #166534;">PAYBACK DESCONTADO</div>
                    <div class="kpi-num green-val" style="font-size: 15px;">20.9 meses</div>
                    <div class="kpi-sub" style="color: #15803d;">Com Usina Solar (vs 47.3m na Rede CEMIG) • 2.3x mais rápido</div>
                </div>
                <div class="kpi-box" style="border-left: 4px solid #1d4ed8; background-color: #eff6ff; text-align: left;">
                    <div class="kpi-lbl" style="color: #1e40af;">TAXA INTERNA RETORNO (TIR)</div>
                    <div class="kpi-num" style="color: #1d4ed8; font-size: 15px;">50.5% a.a.</div>
                    <div class="kpi-sub" style="color: #1e40af;">Fase Solar (vs 21.6% Rede CEMIG) • Spread +38.5% acima CDI</div>
                </div>
                <div class="kpi-box" style="border-left: 4px solid #E45318; background-color: #fff7ed; text-align: left;">
                    <div class="kpi-lbl" style="color: #9a3412;">MARGEM LÍQUIDA</div>
                    <div class="kpi-num highlight-val" style="font-size: 15px;">62.1%</div>
                    <div class="kpi-sub" style="color: #9a3412;">Cenário Base 4h/dia (R$ 6.395,78/mês) • Venda: R$ 2,00/kWh</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. DEMONSTRATIVO DE RESULTADOS (DRE) NOS 3 CENÁRIOS OPERACIONAIS</span>
                    <span class="badge badge-green">Motor Financeiro CoenergyGO</span>
                </div>
                <p>
                    A modelagem financeira foi elaborada com premissas de mercado auditadas: tarifa de venda na recarga 
                    de <strong>R$ 2,00/kWh</strong>, custo de energia na Usina Solar de <strong>R$ 0,76/kWh</strong> (com compensação de créditos) 
                    e na Rede CEMIG de <strong>R$ 0,85/kWh</strong>, com despesas de manutenção e bilhetagem OCPP:
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Métrica Financeira & Operacional</th>
                            <th style="text-align: center;">Conservador (Base 4h/dia)</th>
                            <th style="text-align: center;">Moderado (6h/dia)</th>
                            <th style="text-align: center;">Otimista (8h/dia)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Utilização Média Diária</strong></td>
                            <td style="text-align: center; font-family: monospace;">4 horas / dia</td>
                            <td style="text-align: center; font-family: monospace;">6 horas / dia</td>
                            <td style="text-align: center; font-family: monospace;">8 horas / dia</td>
                        </tr>
                        <tr>
                            <td><strong>Volume Mensal de Energia Vendida</strong></td>
                            <td style="text-align: center; font-family: monospace;">6.480 kWh / mês</td>
                            <td style="text-align: center; font-family: monospace;">9.720 kWh / mês</td>
                            <td style="text-align: center; font-family: monospace;">12.960 kWh / mês</td>
                        </tr>
                        <tr>
                            <td><strong>Receita Bruta Mensal de Recarga</strong></td>
                            <td style="text-align: center; font-family: monospace; font-weight: 700;">R$ 12.960,00</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 700;">R$ 19.440,00</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 700;">R$ 25.920,00</td>
                        </tr>
                        <tr>
                            <td><strong>Custos Operacionais & O&M Mensal</strong></td>
                            <td style="text-align: center; font-family: monospace; color: #64748b;">- R$ 6.564,22</td>
                            <td style="text-align: center; font-family: monospace; color: #64748b;">- R$ 9.648,33</td>
                            <td style="text-align: center; font-family: monospace; color: #64748b;">- R$ 12.732,44</td>
                        </tr>
                        <tr style="background-color: #f0fdf4;">
                            <td><strong>Lucro Líquido Mensal (Usina Solar)</strong></td>
                            <td style="text-align: center; font-family: monospace;" class="green-val">R$ 6.395,78</td>
                            <td style="text-align: center; font-family: monospace;" class="green-val">R$ 9.791,67</td>
                            <td style="text-align: center; font-family: monospace;" class="green-val">R$ 13.187,56</td>
                        </tr>
                        <tr>
                            <td><strong>Lucro Líquido Mensal (Rede CEMIG)</strong></td>
                            <td style="text-align: center; font-family: monospace; color: #475569;">R$ 2.827,80</td>
                            <td style="text-align: center; font-family: monospace; color: #475569;">R$ 4.439,70</td>
                            <td style="text-align: center; font-family: monospace; color: #475569;">R$ 6.051,60</td>
                        </tr>
                        <tr style="background-color: #ecfdf5;">
                            <td><strong>Payback Descontado (Usina Solar)</strong></td>
                            <td style="text-align: center; font-family: monospace; font-weight: 900; color: #00B356;">20,9 Meses</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 900; color: #00B356;">13,7 Meses</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 900; color: #00B356;">10,1 Meses</td>
                        </tr>
                        <tr>
                            <td><strong>Payback Descontado (Rede CEMIG)</strong></td>
                            <td style="text-align: center; font-family: monospace; color: #64748b;">47,3 Meses</td>
                            <td style="text-align: center; font-family: monospace; color: #64748b;">30,1 Meses</td>
                            <td style="text-align: center; font-family: monospace; color: #64748b;">22,1 Meses</td>
                        </tr>
                        <tr>
                            <td><strong>Taxa Interna de Retorno (TIR Solar)</strong></td>
                            <td style="text-align: center; font-family: monospace; font-weight: 800; color: #1d4ed8;">50,5% a.a.</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 800; color: #1d4ed8;">81,2% a.a.</td>
                            <td style="text-align: center; font-family: monospace; font-weight: 800; color: #1d4ed8;">112,4% a.a.</td>
                        </tr>
                        <tr>
                            <td><strong>Mitigação de CO₂ Evitada (ESG)</strong></td>
                            <td style="text-align: center; font-family: monospace; color: #00B356; font-weight: 700;">~32,6 ton CO₂/ano</td>
                            <td style="text-align: center; font-family: monospace; color: #00B356; font-weight: 700;">~48,9 ton CO₂/ano</td>
                            <td style="text-align: center; font-family: monospace; color: #00B356; font-weight: 700;">~65,2 ton CO₂/ano</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 6: CRONOGRAMA DE IMPLANTAÇÃO FÍSICA & ENCERRAMENTO (PASSO 6)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 6,
            "filename": "parte_06_cronograma_encerramento_formal.pdf",
            "title": "Parte 6: Cronograma de 12 Semanas & Termo de Encerramento (Passo 6)",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Parte 6 • Passo 6 • Execução & Encerramento</span>
                    <div class="title" style="margin-top: 4px;">Cronograma de Implantação Física & Termo de Encerramento</div>
                    <div class="subtitle">Prazo de 12 Semanas (90 Dias Corridos) • Responsabilidade Técnica CREA-MG</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-blue">90 Dias Corridos</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">3 Fases Construtivas</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. CRONOGRAMA FÍSICO-FINANCEIRO DE EXECUÇÃO (12 SEMANAS / 90 DIAS)</span>
                    <span class="badge badge-blue">Roadmap Executivo</span>
                </div>
                <p>
                    O plano de implantação física está organizado em 3 fases construtivas sequenciais com marcos formais de aprovação:
                </p>
                <div class="grid-3" style="margin-top: 10px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #0A192F; border-radius: 8px; padding: 10px;">
                        <span style="font-size: 8px; font-weight: 800; color: #0A192F; text-transform: uppercase;">Fase 1 • Semanas 1 a 4</span>
                        <strong style="display: block; font-size: 11px; margin: 2px 0 4px 0;">Suprimentos & Mobilização</strong>
                        <p style="font-size: 9.5px; color: #475569; margin: 0;">
                            Aquisição da estação BENY DC 60 kW SiC, fabricação do painel QDC-VE e entrega técnica de documentação à CEMIG.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #E45318; border-radius: 8px; padding: 10px;">
                        <span style="font-size: 8px; font-weight: 800; color: #E45318; text-transform: uppercase;">Fase 2 • Semanas 5 a 9</span>
                        <strong style="display: block; font-size: 11px; margin: 2px 0 4px 0;">Obras Civis & Elétricas</strong>
                        <p style="font-size: 9.5px; color: #475569; margin: 0;">
                            Concretagem da base estrutural do totem, passagem de cabos Sintenax 35 mm², balizadores e pintura epóxi NBR 9050.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #00B356; border-radius: 8px; padding: 10px;">
                        <span style="font-size: 8px; font-weight: 800; color: #00B356; text-transform: uppercase;">Fase 3 • Semanas 10 a 12</span>
                        <strong style="display: block; font-size: 11px; margin: 2px 0 4px 0;">Comissionamento & Go-Live</strong>
                        <p style="font-size: 9.5px; color: #475569; margin: 0;">
                            Ensaios NBR 17019, testes de disparo de emergência em &lt; 50 ms, integração OCPP e inauguração comercial.
                        </p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. TERMO DE ENCERRAMENTO & ASSINATURAS FORMAIS</span>
                    <span class="badge badge-green">Validação Técnica e Comercial</span>
                </div>
                <p>
                    O presente relatório executivo consolida todas as premissas técnicas, elétricas, demográficas e financeiras 
                    para a implantação do Hub de Recarga Rápida CoenergyGO em Sete Lagoas / MG, atestando a viabilidade integral 
                    do empreendimento sob responsabilidade técnica da Cordeiro Energia O&M.
                </p>
                <div class="signature-box">
                    <div>
                        <div class="sig-line"></div>
                        <strong style="color: #0A192F; display: block; font-size: 11px;">Eng. Bruno Cordeiro</strong>
                        <span style="font-size: 9.5px; color: #64748b;">Responsável Técnico • CREA-MG 148293/D</span>
                        <span style="font-size: 9px; color: #E45318; font-weight: 700; display: block;">Cordeiro Energia O&M</span>
                    </div>
                    <div>
                        <div class="sig-line"></div>
                        <strong style="color: #0A192F; display: block; font-size: 11px;">Sr. Saint Clair / CoenergyGO</strong>
                        <span style="font-size: 9.5px; color: #64748b;">Proprietário do Imóvel & Investidor</span>
                        <span style="font-size: 9px; color: #00B356; font-weight: 700; display: block;">Aceite Formal do Projeto Comercial</span>
                    </div>
                </div>
            </div>
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
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={output_pdf_path.resolve()}",
        "--no-pdf-header-footer",
        str(temp_html_path.resolve()),
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        if temp_html_path.exists():
            temp_html_path.unlink()
        return res.returncode == 0 and output_pdf_path.exists()
    except Exception as cmd_err:
        print(f"    [ERRO] Falha ao executar Chromium headless: {cmd_err}")
        return False


# =============================================================================
# GERAÇÃO INDIVIDUAL DAS PARTES SELECIONADAS
# =============================================================================
def generate_individual_pdfs(parts: List[Dict[str, Any]], temp_dir: Path) -> List[Path]:
    generated_files = []
    print("\n" + "="*70)
    print("ETAPA 1: GERAÇÃO INDIVIDUAL DAS PARTES DO RELATÓRIO")
    print("="*70)

    for part in parts:
        part_id = part["id"]
        filename = part["filename"]
        target_path = temp_dir / filename
        print(f"  • Processando Parte {part_id:02d}: '{part['title']}'...")
        try:
            if render_html_to_pdf(part["html"], target_path) and target_path.exists():
                file_size_kb = target_path.stat().st_size / 1024
                print(f"    [SUCESSO] Gerado '{filename}' ({file_size_kb:.1f} KB)")
                generated_files.append(target_path)
            else:
                print(f"    [AVISO] Parte {part_id:02d} não pôde ser gerada.")
        except Exception as ex:
            print(f"    [ERRO] Exceção na Parte {part_id:02d}: {ex}")

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
        print(f"\n  [SUCESSO] Relatório Técnico Oficial Gerado com Êxito!")
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
    parser = argparse.ArgumentParser(description="Gerador de PDF de Relatórios Técnicos CoenergyGO")
    parser.add_argument(
        "--parts",
        type=str,
        default="all",
        help="Partes do relatório a gerar: 'all' ou lista separada por vírgulas (ex: '1,2,5' ou '1-6')"
    )
    args = parser.parse_args()

    print("""
    =================================================================
       CORDEIRO ENERGIA • AUTOMAÇÃO DE RELATÓRIOS TÉCNICOS EM PDF
       Suíte CoenergyGO — Dossiê Completo de Engenharia & Negócios
    =================================================================
    """)

    base_dir = Path(__file__).resolve().parent.parent
    temp_dir = base_dir / "output" / "temp_parts"
    output_dir = base_dir / "output"

    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    all_parts = get_report_parts_mapping()

    # Filtro de partes selecionadas
    if args.parts.lower() in ("all", "todas", "6", "1-6", "1,2,3,4,5,6"):
        selected_ids = [1, 2, 3, 4, 5, 6]
        output_filename = "Cordeiro_Energia_Sumario_Executivo_Carregador_Sete_Lagoas_Coenergy.pdf"
    else:
        try:
            selected_ids = [int(p.strip()) for p in args.parts.split(",") if p.strip()]
            parts_str = "_".join(map(str, sorted(selected_ids)))
            output_filename = f"Cordeiro_Energia_Sumario_Executivo_Partes_{parts_str}_Sete_Lagoas_Coenergy.pdf"
        except Exception:
            selected_ids = [1, 2, 3, 4, 5, 6]
            output_filename = "Cordeiro_Energia_Sumario_Executivo_Carregador_Sete_Lagoas_Coenergy.pdf"

    selected_parts = [p for p in all_parts if p["id"] in selected_ids]
    if not selected_parts:
        print(f"[ERRO] Nenhuma parte válida selecionada a partir de '{args.parts}'.")
        sys.exit(1)

    print(f"• Partes Selecionadas para Geração: {[p['id'] for p in selected_parts]} de 6")
    print(f"• Nome do Arquivo de Saída: {output_filename}")

    final_pdf_path = output_dir / output_filename
    individual_pdfs = generate_individual_pdfs(selected_parts, temp_dir)

    if individual_pdfs and merge_pdf_files(individual_pdfs, final_pdf_path):
        cleanup_temp_files(temp_dir)

        # Copia para Downloads com tratamento de arquivo em uso
        user_downloads = Path("C:/Users/BRUNO CORDEIRO/Downloads")
        if user_downloads.exists():
            dest_download = user_downloads / output_filename
            try:
                shutil.copy2(final_pdf_path, dest_download)
                print(f"  [CÓPIA] Arquivo copiado para Downloads:\n  {dest_download.resolve()}")
            except Exception as copy_err:
                alt_download = user_downloads / f"Cordeiro_Energia_Sumario_Executivo_Sete_Lagoas_Novo_{os.getpid()}.pdf"
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
