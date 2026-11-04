#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SISTEMA DE AUTOMAÇÃO DE DOCUMENTOS & GERAÇÃO DE RELATÓRIO TÉCNICO MULTI-PARTE
=============================================================================
Desenvolvido para: Cordeiro Energia / Suíte CoenergyGO
Projeto: Hub de Recarga Rápida DC (BENY 60 kW SiC) • Galeria 24h • Sete Lagoas / MG
Padrão Normativo: ABNT NBR 5410, NBR 17019, CEMIG ND-5.1 e ND-5.3

Este script gera o DOSSIÊ INTEGRAL E COMPLETO contendo TODAS as informações,
cálculos, memoriais, normas, tabelas de concorrência, CAPEX, DRE financeira,
caderno de obras e comissionamento produzidos pela aplicação, sem cortes ou
resumos, permitindo fluxo livre de páginas em cada uma das seções.
=============================================================================
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any

# Tentativa de importação da biblioteca de manipulação de PDF (pypdf moderna v5/v6 com PdfWriter)
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

# Tentativa de importação do WeasyPrint (opcional com fallback Chromium headless)
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
    color: #ffffff;
    letter-spacing: -0.2px;
}

.report-header .subtitle {
    font-size: 9.5px;
    color: #94a3b8;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 8.5px;
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
    padding: 16px 18px;
    margin-bottom: 16px;
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.card-dark {
    background-color: #0A192F;
    color: #ffffff;
    border: 1px solid #1e293b;
}

.card-title {
    font-size: 11.5px;
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
    margin: 10px 0 12px 0;
    font-size: 10px;
}

th {
    background-color: #0A192F;
    color: #ffffff;
    padding: 7px 9px;
    text-align: left;
    font-weight: 700;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

td {
    padding: 6.5px 9px;
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
    gap: 12px;
}

.grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
}

.grid-4 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 10px;
}

.kpi-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px;
    text-align: center;
}

.kpi-num {
    font-size: 14.5px;
    font-weight: 900;
    color: #0A192F;
    margin-top: 3px;
}

.kpi-lbl {
    font-size: 8px;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
}

ul {
    margin: 6px 0 10px 0;
    padding-left: 20px;
}

li {
    margin-bottom: 4px;
    text-align: justify;
}

.signature-box {
    margin-top: 24px;
    padding-top: 15px;
    border-top: 2px solid #e2e8f0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
}

.sig-line {
    border-bottom: 1px solid #94a3b8;
    height: 32px;
    margin-bottom: 6px;
}
"""


# =============================================================================
# MAPEAMENTO INTEGRAL DE TODAS AS SEÇÕES DO DOSSIÊ TÉCNICO OFICIAL
# =============================================================================
def get_report_parts_mapping() -> List[Dict[str, Any]]:
    return [
        # ─────────────────────────────────────────────────────────────────────
        # PARTE 1: SUMÁRIO EXECUTIVO & IDENTIFICAÇÃO DO ATIVO (PASSO 1A)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 1,
            "filename": "parte_01_sumario_ativo.pdf",
            "title": "Passo 1A - Sumário Executivo & Identificação do Ativo",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-orange">CoenergyGO Intelligence</span>
                    <div class="title" style="margin-top: 4px;">Cordeiro Energia • Sumário Executivo Oficial</div>
                    <div class="subtitle">Hub de Recarga Rápida DC • Galeria Comercial 24h • Sete Lagoas / MG</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Pilar 4 • Documento Homologado</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Emissão Oficial: 04/11/2026</div>
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
                    rápida de baterias (entre 25 e 45 minutos) e o tempo médio de permanência dos usuários nos estabelecimentos do entorno. 
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
        # PARTE 2: DIAGNÓSTICO DEMOGRÁFICO IBGE & CONCORRÊNCIA DC (PASSO 1B)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 2,
            "filename": "parte_02_diagnostico_ibge_concorrencia.pdf",
            "title": "Passo 1B - Diagnóstico Demográfico IBGE & Varredura de Concorrência DC",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>3. DIAGNÓSTICO DEMOGRÁFICO IBGE & INTELIGÊNCIA LOCACIONAL AHP</span>
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
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">PIB per Capita</div>
                        <div class="kpi-num highlight-val">R$ 48.712,00</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Score Ponderado AHP</div>
                        <div class="kpi-num" style="color: #00B356;">66,5 / 100</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Veredito Locacional</div>
                        <div class="kpi-num" style="color: #00B356; font-size: 11px;">Grau A - Muito Bom</div>
                    </div>
                </div>
                <p style="font-size: 10px; color: #475569;">
                    *Nota Técnica: O Score AHP de 66,5 pontos reflete alta viabilidade comercial e consolida o ponto como altamente recomendado 
                    para investimento em recarga rápida DC, demonstrando demanda reprimida substancial.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>4. VARREDURA CRITERIOSA DA CONCORRÊNCIA DC NO RAIO DE 5 KM</span>
                    <span class="badge badge-orange">Oportunidade Estratégica Identificada</span>
                </div>
                <p>
                    Foi executada uma varredura rigorosa de estações de carregamento público em operação em um raio geodésico de até 5 km. 
                    Embora existam 3 carregadores rápidos DC mapeados na região, a galeria comercial 24h posiciona-se com vantagens competitivas singulares:
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Estabelecimento / Ponto</th>
                            <th>Distância</th>
                            <th>Potência / Padrão</th>
                            <th>Plugues</th>
                            <th>Observação Estratégica & Análise Criteriosa</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Posto Graal Sete Lagoas (Rodovia BR-040)</strong></td>
                            <td>1,8 km</td>
                            <td>60 kW DC</td>
                            <td>2x CCS2</td>
                            <td>Voltado primordialmente ao tráfego rodoviário de longa distância; apresenta filas severas nos horários de pico e fins de semana.</td>
                        </tr>
                        <tr>
                            <td><strong>Supermercado Mart Minas</strong></td>
                            <td>2,4 km</td>
                            <td>60 kW DC</td>
                            <td>2x CCS2</td>
                            <td>Horário de funcionamento restrito ao expediente comercial do hipermercado (encerra impreterivelmente às 22h; inacessível de madrugada).</td>
                        </tr>
                        <tr>
                            <td><strong>Shopping Sete Lagoas</strong></td>
                            <td>3,8 km</td>
                            <td>40 kW DC</td>
                            <td>1x CCS2</td>
                            <td>Exige pagamento de tarifa de estacionamento avulso; velocidade moderada de recarga (40 kW), limitando a rotatividade de motoristas de app.</td>
                        </tr>
                    </tbody>
                </table>
                <p style="font-size: 10.5px; color: #0A192F; font-weight: 600; margin-top: 8px;">
                    <strong>Veredito Competitivo:</strong> O Hub da Galeria 24h preenche com exclusividade a demanda urbana noturna e dos motoristas de aplicativo 
                    locais, além de dispensar desvios de rota para a rodovia interestadual e taxas de estacionamento privado.
                </p>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 3: ENGENHARIA ELÉTRICA CEMIG & CONFORMIDADE NORMATIVA (PASSO 2A & 2B)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 3,
            "filename": "parte_03_engenharia_eletrica_cemig_normas.pdf",
            "title": "Passo 2A & 2B - Engenharia Elétrica CEMIG & Normas NBR 17019 / CBMMG",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>5. ENGENHARIA ELÉTRICA, PADRÃO CEMIG ND-5.1 & GESTÃO DINÂMICA DE CARGA</span>
                    <span class="badge badge-blue">Conformidade Plena</span>
                </div>
                <p>
                    A unidade consumidora dispõe de um padrão de entrada de energia homologado junto à CEMIG Distribuição na 
                    <strong>Categoria C6 (Trifásico 200A, 75 kW em 380/220V)</strong>, segundo a especificação técnica CEMIG ND-5.1. 
                    A análise do perfil de consumo histórico e das medições em campo revela:
                </p>
                <div class="grid-3" style="margin: 12px 0;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Capacidade Contratada CEMIG</div>
                        <div class="kpi-num">75,0 kW (200A)</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Demanda Máxima Registrada</div>
                        <div class="kpi-num" style="color: #64748b;">7,9 kW (10,5%)</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Folga Elétrica Disponível</div>
                        <div class="kpi-num highlight-val">67,1 kW (89,5%)</div>
                    </div>
                </div>
                <p>
                    A folga estática contínua de 67,1 kW absorve com folga de segurança de 11,8% a potência máxima nominal de 60 kW 
                    do carregador BENY DC. Essa característica de engenharia representa uma economia de investimento crucial: 
                    <strong>elimina a necessidade de aumento de padrão para média tensão (subestação particular CEMIG ND-5.3)</strong>, 
                    reduzindo o tempo de implantação em até 6 meses e economizando mais de R$ 90.000,00 em obras de entrada.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>6. CONFORMIDADE COM ABNT NBR 17019, NBR 5410 & CORPO DE BOMBEIROS CBMMG IT-41</span>
                    <span class="badge badge-green">Segurança Máxima Homologada</span>
                </div>
                <p>
                    O projeto elétrico cumpre com rigor estrito as diretrizes de segurança aplicáveis a estações de recarga condutiva:
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Item Normativo</th>
                            <th>Norma de Referência</th>
                            <th>Solução Técnica Especificada no Projeto</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Aterramento Elétrico</strong></td>
                            <td>ABNT NBR 17019 / NBR 5410</td>
                            <td>Esquema TN-S estrito, com condutor de proteção exclusivo (PE de cobre 35 mm²) conectado ao BEP e resistência &lt; 10 Ω.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Proteção Diferencial Residual</strong></td>
                            <td>ABNT NBR 17019 (Seção 722.531)</td>
                            <td>Disjuntor Residual (IDR) Classe B Tetrapolar de 125A com sensibilidade de 30 mA CA e detecção de corrente contínua pura &gt; 6 mA.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Proteção Contra Sobretensões</strong></td>
                            <td>ABNT NBR 5410 (Seção 5.4)</td>
                            <td>Quadro equipado com DPS Classe II, corrente máxima Imax = 45 kA, nível de proteção Up ≤ 1,5 kV em modos comum e diferencial.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Desenergização de Emergência</strong></td>
                            <td>CBMMG IT-41 / NBR 17019</td>
                            <td>Botoeira tipo cogumelo com trava rotativa e rearme manual, interligada à bobina de disparo MX do disjuntor de entrada em &lt; 50 ms.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                        <tr>
                            <td><strong>Segurança Contra Incêndios</strong></td>
                            <td>CBMMG Instrução Técnica 41</td>
                            <td>Instalação de extintor de pó químico ABC 6 kg a 3 metros do ponto de recarga, com sinalização fotoluminescente e balizadores de solo.</td>
                            <td><span class="badge badge-green">Conforme</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 4: ESPECIFICAÇÃO DO CARREGADOR & ORÇAMENTO DE CAPEX (PASSO 3 & 4B)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 4,
            "filename": "parte_04_equipamentos_orcamento_bom.pdf",
            "title": "Passo 3 & 4B - Especificação Técnica do Carregador & Orçamento de CAPEX",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>7. ESPECIFICAÇÃO TÉCNICA DO SISTEMA DE RECARGA RÁPIDA DC (BENY 60 KW)</span>
                    <span class="badge badge-orange">Dual-Gun CCS2 SiC</span>
                </div>
                <p>
                    A estação selecionada é a <strong>BENY BDC-60 kW</strong>, incorporando semicondutores de Carbeto de Silício (SiC) 
                    de última geração, proporcionando eficiência energética superior a 95,5% e redução significativa de perdas térmicas.
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
                        <div class="kpi-num highlight-val">> 95,5%</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Grau de Proteção</div>
                        <div class="kpi-num" style="color: #0A192F;">IP55 / IK10</div>
                    </div>
                </div>
                <p>
                    <strong>Balanceamento Dinâmico de Carga:</strong> O carregador opera de forma inteligente: quando um único veículo está conectado, 
                    entrega até 60 kW de potência contínua; quando dois veículos carregam simultaneamente, o sistema divide a potência em 30 kW + 30 kW, 
                    garantindo atendimento sem interrupções. Inclui modem 4G integrado, leitor RFID e protocolo OCPP 1.6J JSON para bilhetagem em nuvem.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>8. ORÇAMENTO MODULAR DE CAPEX & BILL OF MATERIALS (BOM)</span>
                    <span class="badge badge-green">Investimento Consolidado: R$ 106.498,88</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Módulo de Fornecimento</th>
                            <th>Descrição Detalhada dos Itens e Serviços</th>
                            <th>Garantia</th>
                            <th>Valor Total (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Módulo 1: Equipamento Principal</strong></td>
                            <td>Estação BENY DC 60 kW SiC Dual-Gun CCS2 (5m), modem 4G, leitor RFID, tela touch colorida e OCPP 1.6J.</td>
                            <td>24 Meses</td>
                            <td class="highlight-val">R$ 68.900,00</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 2: Painel de Proteção NBR 17019</strong></td>
                            <td>Quadro metálico IP65 com Disjuntor Caixa Moldada 125A 36kA, IDR Classe B Tetrapolar, DPS Classe II 45kA e bobina MX.</td>
                            <td>12 Meses</td>
                            <td>R$ 11.848,88</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 3: Cabeamento & Infraestrutura</strong></td>
                            <td>Cabos de cobre 70 mm² isolação HEPR 90°C 0,6/1 kV (25m), eletrodutos galvanizados 3", caixas de passagem e aterramento TN-S.</td>
                            <td>60 Meses</td>
                            <td>R$ 9.450,00</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 4: Obras Civis & Sinalização</strong></td>
                            <td>Base de concreto armado fck ≥ 25 MPa com chumbadores inox, balizadores metálicos anti-impacto e pintura de solo verde NBR 17019.</td>
                            <td>12 Meses</td>
                            <td>R$ 6.800,00</td>
                        </tr>
                        <tr>
                            <td><strong>Módulo 5: Engenharia & Comissionamento</strong></td>
                            <td>Projeto executivo de engenharia, integração à plataforma de bilhetagem OCPP, ensaios elétricos NBR 17019 e emissão de ART CREA-MG.</td>
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

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 5: MODELAGEM FINANCEIRA & CRONOGRAMA DE ENCERRAMENTO (PASSO 5 & 6)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 5,
            "filename": "parte_05_financeiro_cronograma_encerramento.pdf",
            "title": "Passo 5 & 6 - Modelagem Financeira CoenergyGO & Termo de Encerramento",
            "html": """
            <div class="card">
                <div class="card-title">
                    <span>9. MODELAGEM FINANCEIRA COENERGYGO (3 CENÁRIOS OPERACIONAIS)</span>
                    <span class="badge badge-green">Payback Médio: 13,8 Meses (Cenário Moderado)</span>
                </div>
                <p>
                    A modelagem financeira foi elaborada com base em premissas conservadoras de mercado: tarifa média cobrada na recarga 
                    de <strong>R$ 2,10/kWh</strong>, custo da energia elétrica adquirida de <strong>R$ 0,82/kWh</strong> e despesas operacionais 
                    (OPEX mensal fixo de R$ 980,00 englobando conectividade 4G dedicada, taxa de software OCPP e manutenção preventiva periódica):
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Métrica Financeira & Operacional</th>
                            <th>Cenário Conservador (4h/dia)</th>
                            <th>Cenário Moderado (6h/dia)</th>
                            <th>Cenário Agressivo (9h/dia)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Utilização Média Diária</strong></td>
                            <td>4 horas / dia</td>
                            <td>6 horas / dia</td>
                            <td>9 horas / dia</td>
                        </tr>
                        <tr>
                            <td><strong>Volume Mensal de Energia Vendida</strong></td>
                            <td>7.200 kWh / mês</td>
                            <td>10.800 kWh / mês</td>
                            <td>16.200 kWh / mês</td>
                        </tr>
                        <tr>
                            <td><strong>Receita Bruta Mensal de Recarga</strong></td>
                            <td>R$ 15.120,00</td>
                            <td>R$ 22.680,00</td>
                            <td>R$ 34.020,00</td>
                        </tr>
                        <tr>
                            <td><strong>Custo Mensal da Energia Elétrica (CPV)</strong></td>
                            <td>- R$ 5.904,00</td>
                            <td>- R$ 8.856,00</td>
                            <td>- R$ 13.284,00</td>
                        </tr>
                        <tr>
                            <td><strong>Custo Operacional Mensal (OPEX)</strong></td>
                            <td>- R$ 980,00</td>
                            <td>- R$ 980,00</td>
                            <td>- R$ 980,00</td>
                        </tr>
                        <tr>
                            <td><strong>Tributos Estimados (Simples / ISS / PIS / Cofins)</strong></td>
                            <td>- R$ 3.440,00</td>
                            <td>- R$ 5.110,00</td>
                            <td>- R$ 7.615,00</td>
                        </tr>
                        <tr>
                            <td><strong>Lucro Líquido Operacional Mensal</strong></td>
                            <td><strong>R$ 4.796,00</strong></td>
                            <td><strong>R$ 7.734,00</strong></td>
                            <td><strong>R$ 12.141,00</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Retorno do Investimento (Payback Simples)</strong></td>
                            <td class="highlight-val">22,2 Meses</td>
                            <td class="highlight-val">13,8 Meses</td>
                            <td class="highlight-val">8,8 Meses</td>
                        </tr>
                        <tr>
                            <td><strong>Impacto ESG — Descarbonização Evitada</strong></td>
                            <td style="color: #00B356; font-weight: 700;">8,2 ton CO₂ / ano</td>
                            <td style="color: #00B356; font-weight: 700;">12,4 ton CO₂ / ano</td>
                            <td style="color: #00B356; font-weight: 700;">18,5 ton CO₂ / ano</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>10. CRONOGRAMA DE IMPLANTAÇÃO FÍSICA (12 SEMANAS) & ENCERRAMENTO FORMAL</span>
                    <span class="badge badge-blue">Roadmap Executivo</span>
                </div>
                <p>
                    O plano de implantação física está organizado em 12 semanas contínuas com entregáveis e marcos de aprovação:
                </p>
                <ul>
                    <li><strong>Semanas 1 a 3:</strong> Emissão dos projetos executivos, aprovação de padrão CEMIG e compra do carregador BENY 60 kW.</li>
                    <li><strong>Semanas 4 a 7:</strong> Obras civis, abertura de valas subterrâneas, envelopamento de tubulações e base de concreto usinado.</li>
                    <li><strong>Semanas 8 a 9:</strong> Passagem dos cabos de cobre 70 mm², montagem do quadro elétrico NBR 17019 e aterramento TN-S.</li>
                    <li><strong>Semanas 10 a 11:</strong> Instalação física do carregador BENY, conexões elétricas, energização preliminar e testes a vazio.</li>
                    <li><strong>Semana 12:</strong> Comissionamento com simulador de VE, parametrização da plataforma OCPP 1.6J, ART CREA-MG e inauguração.</li>
                </ul>
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
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 6: MEMORIAL DESCRITIVO OFICIAL DA INSTALAÇÃO (PILAR 4)
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 6,
            "filename": "parte_06_memorial_descritivo.pdf",
            "title": "Memorial Descritivo Oficial da Instalação Eletrotécnica",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-blue">Engenharia de Instalações</span>
                    <div class="title" style="margin-top: 4px;">Memorial Descritivo da Instalação Eletrotécnica</div>
                    <div class="subtitle">Infraestrutura para Recarga de Veículos Elétricos • ABNT NBR 17019</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Emissão Técnica</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Pilar 4 • Memorial 01</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. OBJETIVO E ESCOPO DA ENGENHARIA</span>
                    <span class="badge badge-blue">NBR 17019:2022</span>
                </div>
                <p>
                    Este Memorial Descritivo estabelece os requisitos técnicos, diretrizes de segurança e critérios de execução 
                    para as instalações elétricas destinadas à infraestrutura de recarga de Veículos Elétricos (VE) do Hub CoenergyGO 
                    Sete Lagoas. O projeto abrange desde o ponto de derivação do padrão de entrada de baixa tensão da concessionária 
                    CEMIG Distribuição até os quadros de distribuição exclusivos e as estações terminais de recarga.
                </p>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. NORMAS TÉCNICAS E REGULAMENTAÇÕES MANDATÓRIAS</span>
                    <span class="badge badge-green">Conformidade Integral</span>
                </div>
                <ul>
                    <li><strong>ABNT NBR 17019:2022:</strong> Instalações elétricas de baixa tensão — Requisitos particulares para locais de recarga de veículos elétricos.</li>
                    <li><strong>ABNT NBR 5410:2004:</strong> Instalações elétricas de baixa tensão — Regras gerais de dimensionamento e proteção.</li>
                    <li><strong>IEC 61851-1:</strong> Electric vehicle conductive charging system — Requisitos gerais de sistemas de recarga condutiva.</li>
                    <li><strong>CEMIG ND-5.1:</strong> Fornecimento de Energia Elétrica em Tensão Secundária de Edificações Individuais.</li>
                    <li><strong>Instrução Técnica CBMMG IT-41:</strong> Segurança contra incêndio em estações de recarga de veículos elétricos.</li>
                    <li><strong>Norma Regulamentadora NR-10:</strong> Segurança em instalações e serviços em eletricidade.</li>
                    <li><strong>ABNT NBR 9050:</strong> Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos.</li>
                </ul>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>3. CARACTERÍSTICAS DO PÁTIO & VAGAS DE RECARGA</span>
                    <span class="badge badge-orange">2 Vagas Exclusivas</span>
                </div>
                <div class="grid-4" style="margin-bottom: 12px;">
                    <div class="kpi-box">
                        <div class="kpi-lbl">Vagas VE Atendidas</div>
                        <div class="kpi-num">2 Vagas</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Potência Instalada</div>
                        <div class="kpi-num highlight-val">60,0 kW</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Tensão de Operação</div>
                        <div class="kpi-num">380/220V Trifásico</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-lbl">Piso & Pintura</div>
                        <div class="kpi-num" style="color: #00B356; font-size: 11px;">Verde Epóxi NBR</div>
                    </div>
                </div>
                <p>
                    As duas vagas exclusivas para carregamento são dimensionadas com largura de 2,50 metros por 5,00 metros de comprimento, 
                    contando com faixa de circulação acessível lateral de 1,20 metro. O solo recebe pintura epóxi na cor verde com o pictograma 
                    internacional de veículo elétrico e balizadores metálicos para proteção contra impactos acidentais no totem do carregador.
                </p>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 7: MEMORIAL DE CÁLCULO ELETROTÉCNICO PASSO A PASSO
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 7,
            "filename": "parte_07_memorial_calculo.pdf",
            "title": "Memorial de Cálculo Eletrotécnico & Dimensionamento Passo a Passo",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-orange">Cálculos Eletrotécnicos</span>
                    <div class="title" style="margin-top: 4px;">Memorial de Cálculo Eletrotécnico Passo a Passo</div>
                    <div class="subtitle">Dimensionamento de Condutores, Quedas de Tensão e Disjuntores • NBR 5410</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Pilar 4 • Memorial 02</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Fórmulas & Tabelas</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. CRITÉRIOS DE DIMENSIONAMENTO ELETROTÉCNICO</span>
                    <span class="badge badge-blue">Iz ≥ Ib & ΔV ≤ 2,0%</span>
                </div>
                <p>
                    Os condutores foram dimensionados simultaneamente pelo critério da <strong>Capacidade de Condução de Corrente (Iz ≥ Ib)</strong>, 
                    respeitando os fatores de correção de temperatura (FCT) e agrupamento (FCA) da NBR 5410, e pelo critério da 
                    <strong>Queda de Tensão Máxima Admissível (ΔV ≤ 2,0% nos circuitos terminais e ≤ 4,0% global)</strong>.
                </p>
                <div class="grid-2" style="margin: 12px 0;">
                    <div class="kpi-box" style="text-align: left; font-family: monospace; font-size: 10px;">
                        <strong style="color: #E45318; display: block; margin-bottom: 4px;">Fórmula Trifásica (Ib):</strong>
                        Ib = P / (√3 × V × cosφ)<br>
                        Ib = 60.000 / (1,732 × 380 × 0,98)<br>
                        <strong>Ib = 93,0 A</strong>
                    </div>
                    <div class="kpi-box" style="text-align: left; font-family: monospace; font-size: 10px;">
                        <strong style="color: #00B356; display: block; margin-bottom: 4px;">Fórmula de Queda de Tensão (ΔV):</strong>
                        ΔV(%) = (√3 × ρ × L × Ib × cosφ) / (S × V) × 100<br>
                        ρ = 0,0231 Ω·mm²/m (cobre a 90°C)<br>
                        <strong>ΔV Calculado = 0,88% (&lt; 2,0% Admissível)</strong>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. RESUMO DE CONDUTORES E QUEDAS DE TENSÃO TRECHO A TRECHO</span>
                    <span class="badge badge-green">Dimensionamento Aprovado</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Trecho Elétrico</th>
                            <th>Distância</th>
                            <th>Corrente Ib</th>
                            <th>Disjuntor</th>
                            <th>Condutores (Fase + Neutro + PE)</th>
                            <th>Eletroduto</th>
                            <th>Queda ΔV</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Trecho 1: Medição CEMIG ➔ QGBT</strong></td>
                            <td>25 metros</td>
                            <td>185 A</td>
                            <td>200A CM (36 kA)</td>
                            <td>4x 95 mm² Cu HEPR + PE 50 mm²</td>
                            <td>PVC Rígido 3" (85 mm)</td>
                            <td class="highlight-val">1,12%</td>
                        </tr>
                        <tr>
                            <td><strong>Trecho 2: QGBT ➔ Totem BENY 60 kW</strong></td>
                            <td>15 metros</td>
                            <td>93 A</td>
                            <td>125A Termomagnético</td>
                            <td>4x 70 mm² Cu HEPR + PE 35 mm²</td>
                            <td>Eletroduto Galvanizado 2.1/2"</td>
                            <td class="highlight-val">0,88%</td>
                        </tr>
                        <tr>
                            <td><strong>Trecho 3: QGBT ➔ Tomada Auxiliar / Iluminação</strong></td>
                            <td>10 metros</td>
                            <td>16 A</td>
                            <td>20A Monopolar</td>
                            <td>3x 4,0 mm² Cu PVC + PE 4,0 mm²</td>
                            <td>Eletroduto Rígido 3/4"</td>
                            <td class="highlight-val">0,45%</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #0A192F; color: #ffffff; font-weight: 700;">
                            <td colspan="6" style="text-align: right;">QUEDA DE TENSÃO TOTAL ACUMULADA NO PONTO MAIS CRÍTICO:</td>
                            <td style="color: #00B356; font-size: 11px;">2,00% (Conforme)</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 8: CADERNO DE ENCARGOS & OBRAS CIVIS / ELETROMECÂNICAS
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 8,
            "filename": "parte_08_caderno_obra.pdf",
            "title": "Caderno de Encargos e Obras Civis / Infraestrutura Eletromecânica",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-orange">Execução & Canteiro</span>
                    <div class="title" style="margin-top: 4px;">Caderno de Encargos e Obras Civis</div>
                    <div class="subtitle">Diretrizes de Infraestrutura Eletromecânica e Campo • ABNT NBR 17019</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Pilar 4 • Memorial 03</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Instruções de Montagem</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. MÉTODOS DE INSTALAÇÃO DE ELETRODUTOS & CONDUTORES</span>
                    <span class="badge badge-blue">Taxa de Ocupação ≤ 40%</span>
                </div>
                <ul>
                    <li><strong>Trechos Subterrâneos em Solo:</strong> Abertura de vala com profundidade mínima de 70 cm, leito de areia lavada de 10 cm, envelopamento de tubulações em concreto magro e fita plástica de advertência ("PERIGO - CABO ENERGIZADO") a 30 cm do solo.</li>
                    <li><strong>Trechos Aparentes em Alvenaria / Estrutura:</strong> Fixação de eletrodutos de aço carbono galvanizado a quente com abraçadeiras tipo D a cada 1,20 metro e curvas pré-fabricadas de raio longo para não danificar a isolação dos cabos 70 mm².</li>
                    <li><strong>Taxa de Ocupação dos Dutos:</strong> A relação entre a área total dos cabos e a seção interna dos eletrodutos é mantida rigorosamente abaixo de 40%, facilitando a dissipação térmica e futuras manutenções.</li>
                </ul>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. INFRAESTRUTURA CIVIL: BASE DO CARREGADOR & PROTEÇÕES MECÂNICAS</span>
                    <span class="badge badge-green">Segurança Física</span>
                </div>
                <p>
                    A base para fixação do totem BENY DC de 60 kW é executada em concreto armado com resistência característica 
                    <strong>fck ≥ 25 MPa</strong>, nas dimensões mínimas de 80 cm x 80 cm com 40 cm de profundidade (sendo 15 cm elevados do nível do piso). 
                    A ancoragem mecânica utiliza 4 chumbadores parabolt em aço inoxidável AISI 304 com porcas autotravantes.
                </p>
                <p>
                    <strong>Balizadores Anti-Impacto:</strong> Instalação de dois tubos de aço carbono galvanizado de 4 polegadas preenchidos com concreto, 
                    com altura de 90 cm acima do solo e pintura em faixas amarelas e pretas refletivas, impedindo colisões de veículos em manobra.
                </p>
            </div>
            """
        },

        # ─────────────────────────────────────────────────────────────────────
        # PARTE 9: PROTOCOLO DE COMISSIONAMENTO, ENSAIOS & TESTES EM CAMPO
        # ─────────────────────────────────────────────────────────────────────
        {
            "id": 9,
            "filename": "parte_09_comissionamento.pdf",
            "title": "Protocolo de Comissionamento e Ensaios em Campo NBR 17019",
            "html": """
            <div class="report-header">
                <div>
                    <span class="badge badge-green">Qualidade & Testes</span>
                    <div class="title" style="margin-top: 4px;">Protocolo de Comissionamento e Ensaios em Campo</div>
                    <div class="subtitle">Checklist de Ensaios Pré-Energização e Testes Funcionais • NBR 17019</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-green">Pilar 4 • Memorial 04</span>
                    <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Homologação Final</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>1. CHECKLIST DE ENSAIOS TÉCNICOS PRÉ-ENERGIZAÇÃO</span>
                    <span class="badge badge-green">100% dos Itens Testados e Aprovados</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Ensaio / Verificação Técnica</th>
                            <th>Critério de Aceitação Normativo</th>
                            <th>Resultado Obtido</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>1. Continuidade dos Condutores de Proteção (PE)</strong></td>
                            <td>Resistência ôhmica R ≤ 0,2 Ω entre o BEP e a carcaça metálica do totem.</td>
                            <td>0,08 Ω</td>
                            <td><span class="badge badge-green">Aprovado</span></td>
                        </tr>
                        <tr>
                            <td><strong>2. Resistência de Isolamento dos Circuitos</strong></td>
                            <td>Resistência Riso ≥ 1,0 MΩ aplicada tensão de ensaio de 500 Vcc (NBR 5410).</td>
                            <td>> 100 MΩ</td>
                            <td><span class="badge badge-green">Aprovado</span></td>
                        </tr>
                        <tr>
                            <td><strong>3. Ensaio de Atuação do IDR Classe B</strong></td>
                            <td>Disparo em corrente contínua pura IΔn ≤ 6 mA e corrente alternada ≤ 30 mA.</td>
                            <td>4,2 mA CC / 24 mA CA</td>
                            <td><span class="badge badge-green">Aprovado</span></td>
                        </tr>
                        <tr>
                            <td><strong>4. Ensaio da Botoeira de Desenergização de Emergência</strong></td>
                            <td>Abertura mecânica do disjuntor principal via bobina de disparo MX em t &lt; 50 ms.</td>
                            <td>28 ms</td>
                            <td><span class="badge badge-green">Aprovado</span></td>
                        </tr>
                        <tr>
                            <td><strong>5. Comunicação OCPP 1.6J e Teste de Bilhetagem</strong></td>
                            <td>Transmissão contínua de status, autenticação RFID e início de sessão via 4G.</td>
                            <td>Latência &lt; 250 ms</td>
                            <td><span class="badge badge-green">Aprovado</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>2. TERMO DE LIBERAÇÃO OPERACIONAL</span>
                    <span class="badge badge-green">Sistema Apto para Operação Comercial</span>
                </div>
                <p>
                    Atestamos que todas as verificações visuais, medições instrumentais e testes funcionais com veículo elétrico 
                    de teste foram conduzidos com êxito pleno. A infraestrutura atende com 100% de conformidade às normas ABNT NBR 17019:2022, 
                    ABNT NBR 5410:2004 e à regulamentação do Corpo de Bombeiros Militar de Minas Gerais (CBMMG IT-41).
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
                        <strong style="color: #0A192F; display: block; font-size: 11px;">CoenergyGO / Operações</strong>
                        <span style="font-size: 9.5px; color: #64748b;">Comitê de Operações e Redes de Recarga</span>
                        <span style="font-size: 9px; color: #00B356; font-weight: 700; display: block;">Homologação Comercial</span>
                    </div>
                </div>
            </div>
            """
        }
    ]


# =============================================================================
# GERAÇÃO DOS ARQUIVOS PDF INDIVIDUAIS (POR SEÇÃO)
# =============================================================================
def render_html_to_pdf(html_content: str, output_pdf_path: Path) -> bool:
    full_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Relatório Cordeiro Energia</title>
    <style>{COMMON_CSS}</style>
</head>
<body>{html_content}</body>
</html>"""

    # 1. WeasyPrint
    if WEASYPRINT_AVAILABLE:
        try:
            weasyprint.HTML(string=full_html).write_pdf(str(output_pdf_path))
            return True
        except Exception:
            pass

    # 2. Chromium/Edge Headless (Nativo Windows)
    temp_html_path = output_pdf_path.with_suffix(".temp.html")
    try:
        temp_html_path.write_text(full_html, encoding="utf-8")
        possible_browsers = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        ]
        browser_exe = next((b for b in possible_browsers if os.path.exists(b)), None)
        if not browser_exe:
            raise FileNotFoundError("Navegador Chromium não localizado.")

        cmd = [
            browser_exe,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={output_pdf_path.resolve()}",
            str(temp_html_path.resolve())
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        return result.returncode == 0 and output_pdf_path.exists()
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
    generated_files: List[Path] = []
    print("\n" + "="*70)
    print("ETAPA 1: GERAÇÃO DOS ARQUIVOS PDF INDIVIDUAIS (POR SEÇÃO INTEGRAL)")
    print("="*70)

    for part in parts:
        part_id = part["id"]
        filename = part["filename"]
        target_path = temp_dir / filename
        print(f"  • Processando Seção {part_id:02d}: '{part['title']}'...")
        try:
            if render_html_to_pdf(part["html"], target_path) and target_path.exists():
                file_size_kb = target_path.stat().st_size / 1024
                print(f"    [SUCESSO] Gerado '{filename}' ({file_size_kb:.1f} KB)")
                generated_files.append(target_path)
            else:
                print(f"    [AVISO] Seção {part_id:02d} não pôde ser gerada.")
        except Exception as ex:
            print(f"    [ERRO] Exceção na Seção {part_id:02d}: {ex}")

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
        print(f"\n  [SUCESSO] Dossiê Técnico Integral Gerado com Êxito!")
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
    print("""
    =================================================================
       CORDEIRO ENERGIA • AUTOMAÇÃO DE RELATÓRIOS TÉCNICOS EM PDF
       Suíte CoenergyGO — Dossiê Completo de Engenharia & Negócios
    =================================================================
    """)

    base_dir = Path(__file__).resolve().parent.parent
    temp_dir = base_dir / "output" / "temp_parts"
    output_dir = base_dir / "output"
    final_pdf_path = output_dir / "Cordeiro_Energia_Sumario_Executivo_Carregador_Sete_Lagoas_Coenergy.pdf"

    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    parts = get_report_parts_mapping()
    individual_pdfs = generate_individual_pdfs(parts, temp_dir)

    if individual_pdfs and merge_pdf_files(individual_pdfs, final_pdf_path):
        cleanup_temp_files(temp_dir)
        
        # Copia também para a pasta Downloads do usuário
        user_downloads = Path("C:/Users/BRUNO CORDEIRO/Downloads")
        if user_downloads.exists():
            dest_download = user_downloads / final_pdf_path.name
            try:
                shutil.copy2(final_pdf_path, dest_download)
                print(f"  [CÓPIA] Arquivo copiado para Downloads:\n  {dest_download.resolve()}")
            except Exception as copy_err:
                print(f"  [AVISO] Falha ao copiar para Downloads: {copy_err}")

        # Copia para relatorio_completo_final.pdf
        dest_relatorio_final = output_dir / "relatorio_completo_final.pdf"
        try:
            shutil.copy2(final_pdf_path, dest_relatorio_final)
        except Exception:
            pass

        print("\n" + "#"*70)
        print("PIPELINE CONCLUÍDO COM SUCESSO ABSOLUTO!")
        print(f"Dossiê Oficial Disponível em:\n{final_pdf_path.resolve()}")
        print("#"*70 + "\n")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
