#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SISTEMA DE AUTOMAÇÃO DE DOCUMENTOS & GERAÇÃO DE RELATÓRIO TÉCNICO MULTI-PARTE
=============================================================================
Desenvolvido para: Cordeiro Energia / Suíte CoenergyGO
Padrão Normativo: ABNT NBR 5410, NBR 17019, CEMIG ND-5.1 e ND-5.3

Este script executa:
  1. Mapeamento estruturado das partes do relatório em ordem cronológica.
  2. Geração de PDFs individuais mantendo estritamente o layout HTML/CSS,
     cores corporativas (#0A192F, #E45318, #00B356) e fontes Montserrat.
  3. Mesclagem (merge) contínua e sequencial dos PDFs utilizando 'pypdf'.
  4. Limpeza segura de arquivos temporários e feedback detalhado em console.
=============================================================================
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any

# Tentativa de importação da biblioteca de manipulação de PDF (pypdf moderna v5/v6 com PdfWriter ou legado PdfMerger)
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

# Tentativa de importação da WeasyPrint (opcional com fallback para Chromium/Edge headless)
WEASYPRINT_AVAILABLE = False
try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except Exception:
    WEASYPRINT_AVAILABLE = False


# =============================================================================
# ESTILOS VISUAIS E IDENTIDADE VISUAL INSTITUCIONAL CORDEIRO ENERGIA
# =============================================================================
COMMON_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

@page {
    size: A4 portrait;
    margin: 12mm 14mm;
}

* {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

body {
    font-family: 'Montserrat', sans-serif;
    color: #1e293b;
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
    padding: 18px 24px;
    border-radius: 12px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #E45318;
}

.report-header .title {
    font-size: 15px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.2px;
}

.report-header .subtitle {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-orange {
    background-color: rgba(228, 83, 24, 0.15);
    color: #E45318;
    border: 1px solid rgba(228, 83, 24, 0.3);
}

.badge-green {
    background-color: rgba(0, 179, 86, 0.15);
    color: #00B356;
    border: 1px solid rgba(0, 179, 86, 0.3);
}

.badge-blue {
    background-color: rgba(10, 25, 47, 0.1);
    color: #0A192F;
    border: 1px solid rgba(10, 25, 47, 0.2);
}

.card {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 18px;
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.card-dark {
    background-color: #0A192F;
    color: #ffffff;
    border: 1px solid #1e293b;
}

.card-title {
    font-size: 12px;
    font-weight: 800;
    color: #0A192F;
    border-bottom: 1.5px solid #f1f5f9;
    padding-bottom: 8px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-dark .card-title {
    color: #ffffff;
    border-bottom: 1.5px solid #1e293b;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 10.5px;
}

th {
    background-color: #0A192F;
    color: #ffffff;
    padding: 7px 10px;
    text-align: left;
    font-weight: 700;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
}

tr:nth-child(even) td {
    background-color: #f8fafc;
}

.highlight-val {
    font-weight: 800;
    color: #E45318;
}

.grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
}

.kpi-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
}

.kpi-num {
    font-size: 16px;
    font-weight: 900;
    color: #0A192F;
    margin-top: 4px;
}

.kpi-lbl {
    font-size: 8.5px;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
}

.signature-box {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 2px solid #e2e8f0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
}

.sig-line {
    border-bottom: 1px solid #94a3b8;
    height: 35px;
    margin-bottom: 6px;
}
"""


# =============================================================================
# PASSO 1: MAPEAMENTO DAS PARTES DO RELATÓRIO TÉCNICO OFICIAL
# =============================================================================
def get_report_parts_mapping() -> List[Dict[str, Any]]:
    """
    Retorna a lista estruturada das partes do relatório da aplicação
    em sua ordem cronológica e lógica de engenharia (Passos 1 a 6).
    """
    return [
        {
            "id": 1,
            "filename": "parte_1_sumario_ativo.pdf",
            "title": "Passo 1A - Sumário Executivo & Identificação do Ativo",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-orange">CoenergyGO Intelligence</span>
                    <div class="title" style="margin-top: 6px;">Cordeiro Energia • Sumário Executivo Oficial</div>
                    <div class="subtitle">Hub de Recarga Rápida DC • Galeria Comercial 24h • Sete Lagoas / MG</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Pilar 4 • Relatório Aprovado</span>
                    <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Data: 04/11/2026</div>
                </div>
            </div>

            <div class="card card-dark">
                <div class="card-title">
                    <span>1. IDENTIFICAÇÃO DO PROJETO & BENEFICIÁRIOS</span>
                    <span class="badge badge-green">Sete Lagoas - MG</span>
                </div>
                <p>
                    O presente relatório técnico e executivo consolida o dimensionamento eletrotécnico, o diagnóstico locacional 
                    e a modelagem de viabilidade financeira para a implantação de um Hub de Carregamento Ultrarrápido para Veículos 
                    Elétricos (VE) nas dependências da Galeria de Lojas Comercial com funcionamento contínuo de 24 horas, em Sete Lagoas / MG.
                </p>
                <div class="grid-3" style="margin-top: 14px;">
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Proprietário do Imóvel</div>
                        <div class="kpi-num" style="color: #ffffff; font-size: 13px;">Sr. Saint Clair</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Público-Alvo</div>
                        <div class="kpi-num" style="color: #00B356; font-size: 11px;">Motoristas App & Viajantes</div>
                    </div>
                    <div class="kpi-box" style="background-color: #112240; border-color: #1e3a5f;">
                        <div class="kpi-lbl" style="color: #94a3b8;">Tecnologia Homologada</div>
                        <div class="kpi-num" style="color: #E45318; font-size: 12px;">BENY DC 60 kW SiC</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. ANÁLISE DE CONVENIÊNCIA & ATRATIVIDADE NO RAIO DE 500 METROS</span>
                    <span class="badge badge-blue">Dwell Time Otimizado</span>
                </div>
                <p>
                    A localização estratégica na galeria 24h oferece sinergia de permanência (<em>dwell time</em>) ideal para 
                    recargas em corrente contínua (DC), onde o tempo médio de permanência dos usuários situa-se entre 25 e 45 minutos. 
                    Neste raio de 500 metros, identificam-se estabelecimentos comerciais que agregam comodidade imediata: farmácia, 
                    cafeteria, loja de conveniência, restaurante expresso e posto de combustíveis, proporcionando conforto e segurança 
                    aos condutores enquanto seus veículos recebem carga plena.
                </p>
            </div>
            """
        },
        {
            "id": 2,
            "filename": "parte_2_diagnostico_ibge_concorrencia.pdf",
            "title": "Passo 1B - Diagnóstico Demográfico IBGE & Varredura de Concorrência DC",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>3. DIAGNÓSTICO DEMOGRÁFICO IBGE & SCORE LOCACIONAL AHP</span>
                    <span class="badge badge-green">Score Calculado: 66,5 / 100 • Muito Bom</span>
                </div>
                <p>
                    A inteligência locacional multicritério (Processo Analítico Hierárquico - AHP) avaliou densidade demográfica, 
                    renda per capita, frota estimada de veículos híbridos/elétricos em Sete Lagoas e fluxo viário regional.
                </p>
                <div class="grid-3" style="margin: 12px 0;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">População IBGE</div>
                        <div class="kpi-num">241.835 hab.</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">PIB per Capita</div>
                        <div class="kpi-num highlight-val">R$ 48.712,00</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Classificação AHP</div>
                        <div class="kpi-num" style="color: #00B356;">Grau A - Muito Bom</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>4. VARREDURA CRITERIOSA DA CONCORRÊNCIA DC NO RAIO DE 5 KM</span>
                    <span class="badge badge-orange">Oportunidade Estratégica</span>
                </div>
                <p>
                    Foi conduzido um levantamento rigoroso de estações de carregamento público existentes num raio de até 5 km. 
                    Embora existam 3 pontos de recarga rápida DC na região, a galeria destaca-se como alternativa de conveniência urbana integrada:
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Estabelecimento / Ponto</th>
                            <th>Distância</th>
                            <th>Potência / Padrão</th>
                            <th>Plugues</th>
                            <th>Observação Estratégica</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Posto Graal Sete Lagoas (Rodovia BR-040)</strong></td>
                            <td>1,8 km</td>
                            <td>60 kW DC</td>
                            <td>2x CCS2</td>
                            <td>Foco em viajantes de longa distância; fila frequente nos fins de semana.</td>
                        </tr>
                        <tr>
                            <td><strong>Supermercado Mart Minas</strong></td>
                            <td>2,4 km</td>
                            <td>60 kW DC</td>
                            <td>2x CCS2</td>
                            <td>Horário de funcionamento restrito ao comercial (encerra às 22h).</td>
                        </tr>
                        <tr>
                            <td><strong>Shopping Sete Lagoas</strong></td>
                            <td>3,8 km</td>
                            <td>40 kW DC</td>
                            <td>1x CCS2</td>
                            <td>Cobrança de estacionamento avulso; velocidade de recarga moderada.</td>
                        </tr>
                    </tbody>
                </table>
                <p style="font-size: 10px; color: #475569; margin-top: 4px;">
                    <strong>Veredito Competitivo:</strong> A proposta do Hub na Galeria 24h captura com exclusividade o tráfego noturno 
                    e os motoristas urbanos que não desejam pagar estacionamento ou desviar para a rodovia interestadual.
                </p>
            </div>
            """
        },
        {
            "id": 3,
            "filename": "parte_3_engenharia_eletrica_cemig.pdf",
            "title": "Passo 2A & 2B - Engenharia Elétrica CEMIG & Normas NBR 17019 / CBMMG",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>5. ENGENHARIA ELÉTRICA, PADRÃO CEMIG ND-5.1 & GESTÃO DE CARGA</span>
                    <span class="badge badge-blue">Conformidade Plena</span>
                </div>
                <p>
                    A infraestrutura do cliente conta com padrão de entrada de energia <strong>Categoria C6 (Trifásico 200A, 75 kW)</strong>, 
                    homologado conforme a especificação técnica CEMIG ND-5.1. A telemetria e o histórico de faturamento demonstram:
                </p>
                <div class="grid-3" style="margin: 12px 0;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Demanda Contratada</div>
                        <div class="kpi-num">75,0 kW (200A)</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Pico Máx. do Cliente</div>
                        <div class="kpi-num" style="color: #64748b;">7,9 kW</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Folga Disponível</div>
                        <div class="kpi-num highlight-val">67,1 kW</div>
                    </div>
                </div>
                <p>
                    A folga estática de 67,1 kW absorve com ampla margem de segurança a potência máxima de 60 kW do carregador DC, 
                    <strong>dispensando aumentos onerosos de carga ou necessidade de subestação particular de média tensão</strong>.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>6. CONFORMIDADE COM ABNT NBR 17019, NBR 5410 & BOMBEIROS CBMMG IT-41</span>
                    <span class="badge badge-green">Segurança Máxima</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Requisito Normativo</th>
                            <th>Solução Técnica Especificada</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Aterramento (NBR 17019)</strong></td>
                            <td>Esquema TN-S com condutor de proteção exclusivo (PE) interligado ao BEP e impedância &lt; 10 Ω.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Proteção Diferencial Residual</strong></td>
                            <td>IDR Classe B Tetrapolar (detecção de correntes de fuga CC &gt; 6 mA e CA &gt; 30 mA).</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Sobretensões Transitórias</strong></td>
                            <td>DPS Classe II, Imax = 45 kA, Up ≤ 1,5 kV em modo diferencial e comum.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Emergência CBMMG IT-41</strong></td>
                            <td>Botoeira cogumelo com trava para desenergização instantânea via bobina de disparo MX.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            """
        },
        {
            "id": 4,
            "filename": "parte_4_equipamentos_orcamento_bom.pdf",
            "title": "Passo 3 & 4B - Especificação Técnica do Carregador & Orçamento de CAPEX",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>7. ESPECIFICAÇÃO DO CARREGADOR BENY BDC-60 KW DC SIC</span>
                    <span class="badge badge-orange">Dual-Gun CCS2</span>
                </div>
                <p>
                    Foi selecionado o carregador rápido <strong>BENY BDC-60 kW</strong> com semicondutores de Carbeto de Silício (SiC), 
                    que entregam eficiência superior a 95,5% com menor dissipação térmica. Equipado com dois conectores padrão CCS Combo 2 
                    de 5 metros e balanceamento dinâmico de carga entre os veículos (30 kW + 30 kW ou 60 kW individual).
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>8. ORÇAMENTO MODULAR DE CAPEX & BILL OF MATERIALS (BOM)</span>
                    <span class="badge badge-green">Total: R$ 106.498,88</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item / Módulo</th>
                            <th>Descrição Resumida</th>
                            <th>Garantia</th>
                            <th>Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Módulo 1: Equipamento Principal</strong></td>
                            <td>Estação BENY DC 60 kW SiC Dual-Gun CCS2 com modem 4G/OCPP 1.6J.</td>
                            <td>24 Meses</td>
                            <td class="highlight-val">R$ 68.900,00</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 2: Painel de Proteção NBR 17019</strong></td>
                            <td>Quadro metálico IP65 com Disjuntor Caixa Moldada, IDR Tipo B e DPS.</td>
                            <td>12 Meses</td>
                            <td>R$ 11.848,88</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 3: Cabeamento & Infraestrutura</strong></td>
                            <td>Cabos de cobre 70 mm² isolação HEPR 0,6/1 kV e eletrodutos galvanizados.</td>
                            <td>60 Meses</td>
                            <td>R$ 9.450,00</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 4: Obras Civis & Pintura</strong></td>
                            <td>Base de concreto, balizadores de proteção e demarcação de vagas com logo.</td>
                            <td>12 Meses</td>
                            <td>R$ 6.800,00</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 5: Engenharia & Comissionamento</strong></td>
                            <td>Projeto executivo, parametrização OCPP, testes e emissão de ART/CREA-MG.</td>
                            <td>Integral</td>
                            <td>R$ 9.500,00</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #0A192F; color: #ffffff; font-weight: 800;">
                            <td colspan="3" style="text-align: right; text-transform: uppercase;">Investimento Total de Implantação (CAPEX):</td>
                            <td style="color: #00B356; font-size: 13px;">R$ 106.498,88</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            """
        },
        {
            "id": 5,
            "filename": "parte_5_financeiro_cronograma_encerramento.pdf",
            "title": "Passo 5 & 6 - Modelagem Financeira CoenergyGO & Termo de Encerramento",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>9. MODELAGEM FINANCEIRA COENERGYGO (3 CENÁRIOS OPERACIONAIS)</span>
                    <span class="badge badge-green">Payback Médio: 14 a 22 Meses</span>
                </div>
                <p>
                    Projeção econômica considerando tarifa média de recarga de <strong>R$ 2,10/kWh</strong>, custo de energia de 
                    <strong>R$ 0,82/kWh</strong> e despesas operacionais (OPEX mensal de R$ 980,00 cobrindo conectividade 4G, plataforma OCPP e manutenção preventiva).
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Métrica Financeira</th>
                            <th>Cenário Conservador (4h/dia)</th>
                            <th>Cenário Moderado (6h/dia)</th>
                            <th>Cenário Agressivo (9h/dia)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Volume de Energia Vendida</strong></td>
                            <td>7.200 kWh/mês</td>
                            <td>10.800 kWh/mês</td>
                            <td>16.200 kWh/mês</td>
                        </tr>
                        <tr>
                            <td><strong>Faturamento Bruto Mensal</strong></td>
                            <td>R$ 15.120,00</td>
                            <td>R$ 22.680,00</td>
                            <td>R$ 34.020,00</td>
                        </tr>
                        <tr>
                            <td><strong>Lucro Líquido Operacional Mensal</strong></td>
                            <td><strong>R$ 4.796,00</strong></td>
                            <td><strong>R$ 7.734,00</strong></td>
                            <td><strong>R$ 12.141,00</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Retorno do Investimento (Payback)</strong></td>
                            <td class="highlight-val">22,2 Meses</td>
                            <td class="highlight-val">13,8 Meses</td>
                            <td class="highlight-val">8,8 Meses</td>
                        </tr>
                        <tr>
                            <td><strong>Descarbonização Evitada (ESG)</strong></td>
                            <td>8,2 ton CO₂/ano</td>
                            <td>12,4 ton CO₂/ano</td>
                            <td>18,5 ton CO₂/ano</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>10. CRONOGRAMA DE IMPLANTAÇÃO FÍSICA (12 SEMANAS) & ENCERRAMENTO</span>
                    <span class="badge badge-blue">Roadmap Executivo</span>
                </div>
                <p>
                    A execução dos serviços ocorrerá em 12 semanas divididas em: Semanas 1 a 3 (Projetos & Pedidos de Fornecimento), 
                    Semanas 4 a 7 (Infraestrutura Civil e Tubulações), Semanas 8 a 9 (Passagem de Cabos e Montagem do Painel), 
                    Semanas 10 a 11 (Instalação e Conexão do Carregador BENY) e Semana 12 (Comissionamento, Homologação e Inauguração).
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
# PASSO 2: GERAÇÃO DOS PDFS INDIVIDUAIS
# =============================================================================
def render_html_to_pdf(html_content: str, output_pdf_path: Path) -> bool:
    """
    Renderiza um fragmento HTML com CSS estrito para um arquivo PDF individual.
    Prioriza WeasyPrint; na ausência dos binários C do GTK (comum no Windows),
    utiliza o motor de renderização Chromium/Edge headless de alta fidelidade.
    """
    full_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Relatório Cordeiro Energia</title>
    <style>
        {COMMON_CSS}
    </style>
</head>
<body>
    {html_content}
</body>
</html>"""

    # 1. Tenta utilizar o WeasyPrint se as bibliotecas nativas estiverem disponíveis
    if WEASYPRINT_AVAILABLE:
        try:
            weasyprint.HTML(string=full_html).write_pdf(str(output_pdf_path))
            return True
        except Exception as e:
            # Fallback transparente para Chromium headless
            pass

    # 2. Motor de Alta Fidelidade Chromium/Edge Headless (Nativo no Windows)
    temp_html_path = output_pdf_path.with_suffix(".temp.html")
    try:
        temp_html_path.write_text(full_html, encoding="utf-8")
        
        # Localização de executáveis Chrome / Edge no Windows
        possible_browsers = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        ]
        
        browser_exe = None
        for b in possible_browsers:
            if os.path.exists(b):
                browser_exe = b
                break
                
        if not browser_exe:
            raise FileNotFoundError("Nenhum navegador Chromium (Chrome ou Edge) encontrado para renderização.")

        cmd = [
            browser_exe,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={output_pdf_path.resolve()}",
            str(temp_html_path.resolve())
        ]
        
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        if result.returncode == 0 and output_pdf_path.exists() and output_pdf_path.stat().st_size > 0:
            return True
        else:
            raise RuntimeError(f"Falha na execução do navegador: {result.stderr.decode('utf-8', errors='ignore')}")

    except Exception as err:
        print(f"    [ERRO] Falha ao renderizar {output_pdf_path.name}: {err}")
        return False
    finally:
        if temp_html_path.exists():
            try:
                temp_html_path.unlink()
            except Exception:
                pass


def generate_individual_pdfs(parts: List[Dict[str, Any]], temp_dir: Path) -> List[Path]:
    """
    Gera cada PDF individual mantendo estritamente o layout e isolando falhas.
    """
    generated_files: List[Path] = []
    
    print("\n" + "="*70)
    print("ETAPA 1: GERAÇÃO DOS ARQUIVOS PDF INDIVIDUAIS (POR SEÇÃO)")
    print("="*70)

    for part in parts:
        part_id = part["id"]
        filename = part["filename"]
        title = part["title"]
        target_path = temp_dir / filename
        
        print(f"  • Processando Parte {part_id}: '{title}'...")
        try:
            success = render_html_to_pdf(part["html"], target_path)
            if success and target_path.exists():
                file_size_kb = target_path.stat().st_size / 1024
                print(f"    [SUCESSO] Gerado '{filename}' ({file_size_kb:.1f} KB)")
                generated_files.append(target_path)
            else:
                print(f"    [AVISO] A Parte {part_id} não pôde ser gerada.")
        except Exception as ex:
            print(f"    [ERRO INESPERADO] Exceção na Parte {part_id}: {ex}")

    return generated_files


# =============================================================================
# PASSO 3: MESCLAGEM (MERGE) DOS ARQUIVOS PDF
# =============================================================================
def merge_pdf_files(pdf_paths: List[Path], final_output_path: Path) -> bool:
    """
    Lê os PDFs temporários na ordem exata e une-os em um único relatório consolidado.
    """
    print("\n" + "="*70)
    print("ETAPA 2: MESCLAGEM (MERGE) SEQUENCIAL DOS DOCUMENTOS")
    print("="*70)

    if not pdf_paths:
        print("  [ERRO] Nenhum PDF disponível para mesclagem.")
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
                print(f"  [{idx}/{len(pdf_paths)}] Adicionado '{pdf_path.name}' — {num_pages} página(s)")
            except Exception as read_err:
                print(f"  [AVISO] Erro ao ler '{pdf_path.name}': {read_err}. Prosseguindo com as demais partes.")

        # Grava o arquivo unificado final
        with open(final_output_path, "wb") as output_file:
            merger.write(output_file)

        merger.close()

        final_size_kb = final_output_path.stat().st_size / 1024
        print(f"\n  [SUCESSO] Relatório Final Gerado com Êxito!")
        print(f"  Arquivo: {final_output_path.resolve()}")
        print(f"  Tamanho Total: {final_size_kb:.1f} KB | Total de Páginas: {total_pages}")
        return True

    except Exception as merge_err:
        print(f"  [ERRO CRÍTICO] Falha durante a mesclagem dos PDFs: {merge_err}")
        return False


# =============================================================================
# PASSO 4: LIMPEZA E FEEDBACK
# =============================================================================
def cleanup_temp_files(temp_dir: Path):
    """
    Remove os arquivos temporários criados durante a geração individual.
    """
    print("\n" + "="*70)
    print("ETAPA 3: LIMPEZA DE ARQUIVOS TEMPORÁRIOS")
    print("="*70)

    if temp_dir.exists():
        try:
            shutil.rmtree(temp_dir)
            print(f"  [LIMPEZA] Diretório temporário '{temp_dir}' removido com sucesso.")
        except Exception as err:
            print(f"  [AVISO] Não foi possível remover o diretório temporário '{temp_dir}': {err}")


# =============================================================================
# EXECUÇÃO PRINCIPAL DO PIPELINE
# =============================================================================
def main():
    print("""
    =================================================================
       CORDEIRO ENERGIA • AUTOMAÇÃO DE RELATÓRIOS TÉCNICOS EM PDF
       Suíte CoenergyGO — Processamento & Mesclagem Multi-Partes
    =================================================================
    """)

    # Definição de diretórios de trabalho
    base_dir = Path(__file__).resolve().parent.parent
    temp_dir = base_dir / "output" / "temp_parts"
    output_dir = base_dir / "output"
    final_pdf_path = output_dir / "Cordeiro_Energia_Sumario_Executivo_Carregador_Sete_Lagoas_Coenergy.pdf"

    # Criação dos diretórios necessários
    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Mapeamento das seções
    parts = get_report_parts_mapping()
    print(f"  • Mapeadas {len(parts)} seções do relatório oficial.")

    # 2. Geração individual dos PDFs
    individual_pdfs = generate_individual_pdfs(parts, temp_dir)

    if not individual_pdfs:
        print("\n[FALHA] Nenhum arquivo intermediário foi gerado. Abortando processo.")
        sys.exit(1)

    # 3. Mesclagem em PDF único
    merge_success = merge_pdf_files(individual_pdfs, final_pdf_path)

    # 4. Limpeza dos temporários se a mesclagem foi bem-sucedida
    if merge_success:
        cleanup_temp_files(temp_dir)
        print("\n" + "#"*70)
        print("PIPELINE CONCLUÍDO COM SUCESSO ABSOLUTO!")
        print(f"Relatório Oficial Disponível em:\n{final_pdf_path.resolve()}")
        print("#"*70 + "\n")
    else:
        print("\n[FALHA] A mesclagem não pôde ser completada.")
        sys.exit(1)


if __name__ == "__main__":
    main()
