"""
Gerador de Diagramas Unifilares NBR 5410/17019 para draw.io (diagrams.net / mxGraph).
Converte payloads estruturados de cargas e proteções em esquemáticos XML nativos.
"""

import html
import json
import os
import sys
from typing import Any, Dict, List, Optional
import xml.etree.ElementTree as ET


class DrawIOUnifilarBuilder:
    def __init__(self, title: str = "Diagrama Unifilar Eletrotécnico"):
        self.title = title
        self.cell_id = 2  # 0 e 1 são reservados pelo mxGraph
        
        # Elemento raiz
        self.mxfile = ET.Element("mxfile", {
            "host": "Electron",
            "modified": "2026-10-12T11:00:00.000Z",
            "agent": "Antigravity Unifilar CAD Engine",
            "version": "21.6.8",
            "type": "device"
        })
        diagram = ET.SubElement(self.mxfile, "diagram", {
            "id": "unifilar-cemig-drawio",
            "name": self.title
        })
        self.model = ET.SubElement(diagram, "mxGraphModel", {
            "dx": "1400",
            "dy": "900",
            "grid": "1",
            "gridSize": "10",
            "guides": "1",
            "tooltips": "1",
            "connect": "1",
            "arrows": "1",
            "fold": "1",
            "page": "1",
            "pageScale": "1",
            "pageWidth": "1654",  # A3 paisagem
            "pageHeight": "1169",
            "background": "#0A192F",  # Studio Dark Cordeiro
            "math": "0",
            "shadow": "0"
        })
        self.root = ET.SubElement(self.model, "root")
        
        # Células fundamentais obrigatórias
        ET.SubElement(self.root, "mxCell", {"id": "0"})
        ET.SubElement(self.root, "mxCell", {"id": "1", "parent": "0"})

    def _next_id(self) -> str:
        cid = str(self.cell_id)
        self.cell_id += 1
        return cid

    def add_vertex(self, value: str, style: str, x: float, y: float, w: float, h: float) -> str:
        cid = self._next_id()
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cid,
            "value": value,
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(round(x, 1)),
            "y": str(round(y, 1)),
            "width": str(round(w, 1)),
            "height": str(round(h, 1)),
            "as": "geometry"
        })
        return cid

    def add_edge(self, style: str, source_id: Optional[str] = None, target_id: Optional[str] = None, points: Optional[List[tuple]] = None) -> str:
        cid = self._next_id()
        attribs = {
            "id": cid,
            "style": style,
            "edge": "1",
            "parent": "1"
        }
        if source_id:
            attribs["source"] = source_id
        if target_id:
            attribs["target"] = target_id

        cell = ET.SubElement(self.root, "mxCell", attribs)
        geom = ET.SubElement(cell, "mxGeometry", {
            "relative": "1",
            "as": "geometry"
        })
        if points:
            arr = ET.SubElement(geom, "Array", {"as": "points"})
            for px, py in points:
                ET.SubElement(arr, "mxPoint", {"x": str(round(px, 1)), "y": str(round(py, 1))})
        return cid

    def build_from_payload(self, data: Dict[str, Any]) -> str:
        padrao = data.get("padrao", {})
        fases = padrao.get("tipo_ligacao", "TRIFASICO").upper()
        num_fases = 3 if "TRI" in fases else (2 if "BI" in fases else 1)
        tensao = padrao.get("tensao", "127/220V")
        concessionaria = data.get("concessionaria", "Cemig Distribuição").upper()
        disj_padrao_a = padrao.get("disjuntor_padrao_a", 100)
        tipo_disj_padrao = padrao.get("tipo_disjuntor_padrao", "CAIXA_MOLDADA").upper()

        # Estilos base Studio Dark / WCAG AAA
        COR_FONTE = "#F8FAFC"
        COR_LINHA = "#94A3B8"
        COR_LARANJA = "#E45318"
        COR_VERDE = "#00B356"
        COR_AMBAR = "#F59E0B"
        COR_AZUL_MEDIDOR = "#38BDF8"

        # ─── CABEÇALHO DO PROJETO ──────────────────────────────────────────
        self.add_vertex(
            f"<b>{concessionaria} • DIAGRAMA UNIFILAR GERAL NBR 5410 / NBR 17019</b><br/>"
            f"<span style='font-size:11px;color:#94A3B8'>Sistema {fases.capitalize()} ({tensao}) | Padrão Entrada: {disj_padrao_a}A | DPS Classe II</span>",
            f"text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontColor={COR_FONTE};fontSize=14;fontFamily=Montserrat,Helvetica;",
            x=60, y=40, w=700, h=40
        )

        # ─── 1. REDE EXTERNA CEMIG (À ESQUERDA) ──────────────────────────────
        x_rede, y_rede = 70, 160
        id_rede = self.add_vertex(
            f"<b>REDE CONCESSIONÁRIA</b><br/>{concessionaria}<br/>{tensao}",
            f"rounded=1;whiteSpace=wrap;html=1;fillColor=#1E293B;strokeColor=#475569;strokeWidth=2;fontColor={COR_FONTE};fontSize=11;fontFamily=Helvetica;",
            x=x_rede, y=y_rede, w=130, h=60
        )

        # Linha para o Medidor
        x_medidor = x_rede + 180
        self.add_edge(
            f"endArrow=none;html=1;strokeColor={COR_LINHA};strokeWidth=2;",
            points=[(x_rede + 130, y_rede + 30), (x_medidor, y_rede + 30)]
        )

        # ─── 2. MEDIDOR DE ENERGIA (KWH) EM SÉRIE ────────────────────────────
        id_medidor = self.add_vertex(
            "<b>kWh</b><br/><span style='font-size:9px'>MEDIDOR</span>",
            f"ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0F172A;strokeColor={COR_AZUL_MEDIDOR};strokeWidth=2.5;fontColor={COR_FONTE};fontSize=11;",
            x=x_medidor, y=y_rede, w=60, h=60
        )

        # Linha Medidor -> Disjuntor Geral
        x_geral = x_medidor + 110
        self.add_edge(
            f"endArrow=none;html=1;strokeColor={COR_LINHA};strokeWidth=2;",
            points=[(x_medidor + 60, y_rede + 30), (x_geral, y_rede + 30)]
        )

        # ─── 3. DISJUNTOR GERAL DO PADRÃO (DIN OU CAIXA MOLDADA) ────────────
        is_cm_geral = "CAIXA" in tipo_disj_padrao or disj_padrao_a > 63
        style_geral = (
            f"rounded=0;whiteSpace=wrap;html=1;fillColor=#1E1B4B;strokeColor={COR_LARANJA};strokeWidth=3;fontColor={COR_FONTE};fontFamily=Helvetica;"
            if is_cm_geral else
            f"rounded=0;whiteSpace=wrap;html=1;fillColor=#0F172A;strokeColor=#E2E8F0;strokeWidth=2;fontColor={COR_FONTE};fontFamily=Helvetica;"
        )
        tipo_lbl = "Caixa Moldada" if is_cm_geral else "DIN"
        id_geral = self.add_vertex(
            f"<b>{disj_padrao_a}A</b><br/><span style='font-size:9px'>{num_fases}P ({tipo_lbl})</span>",
            style_geral,
            x=x_geral, y=y_rede + 5, w=80, h=50
        )

        # Linha Geral -> Ponto de Derivação DPS
        x_dps_tap = x_geral + 120
        self.add_edge(
            f"endArrow=none;html=1;strokeColor={COR_LINHA};strokeWidth=2;",
            points=[(x_geral + 80, y_rede + 30), (x_dps_tap, y_rede + 30)]
        )

        # ─── 4. MÓDULOS DE PROTEÇÃO CONTRA SURTOS (DPS CLASSE II) EM PARALELO ─
        dps_info = data.get("dps", {})
        dps_ka = dps_info.get("corrente_ka", 20)
        dps_uc = dps_info.get("uc_max_v", 275)

        # Ponto de derivação vertical para DPS
        y_dps = y_rede + 110
        self.add_edge(
            f"endArrow=none;html=1;strokeColor={COR_VERDE};strokeWidth=2;",
            points=[(x_dps_tap, y_rede + 30), (x_dps_tap, y_dps)]
        )

        for f_idx in range(num_fases):
            x_box = (x_dps_tap - 35) + (f_idx * 40) - ((num_fases - 1) * 20)
            self.add_vertex(
                f"<span style='font-size:9px'>DPS Cl.II</span><br/><b>{dps_ka}kA</b><br/><span style='font-size:8px'>{dps_uc}V</span>",
                f"shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;fillColor=#064E3B;strokeColor={COR_VERDE};strokeWidth=2;fontColor={COR_FONTE};fontSize=9;",
                x=x_box, y=y_dps, w=35, h=50
            )

        # Barra de terra PE do DPS
        self.add_vertex(
            "<b>PE (Barra Terra)</b>",
            f"text;html=1;align=center;verticalAlign=top;fontColor=#4ADE80;fontSize=9;",
            x=x_dps_tap - 60, y=y_dps + 55, w=120, h=20
        )

        # Linha pós-DPS -> Entrada do Barramento Geral Vertical
        x_barramento = x_dps_tap + 110
        self.add_edge(
            f"endArrow=none;html=1;strokeColor={COR_LINHA};strokeWidth=2.5;",
            points=[(x_dps_tap, y_rede + 30), (x_barramento, y_rede + 30)]
        )

        # ─── 5. BARRAMENTO GERAL VERTICAL (ESPINHA DORSAL CONTÍNUA) ─────────
        circuitos = data.get("circuitos", [])
        total_circ = max(len(circuitos), 1)
        passo_y = 75
        y_bar_top = y_rede + 30
        y_bar_bottom = y_bar_top + (total_circ * passo_y)

        # Desenhar barramento vertical espesso
        self.add_edge(
            f"endArrow=none;html=1;strokeColor={COR_LARANJA};strokeWidth=4.5;",
            points=[(x_barramento, y_bar_top), (x_barramento, y_bar_bottom)]
        )
        self.add_vertex(
            f"<b>BARRAMENTO GERAL R, S, T ({disj_padrao_a}A Cu)</b>",
            f"text;html=1;align=left;verticalAlign=bottom;fontColor={COR_LARANJA};fontSize=11;fontFamily=Montserrat;fontStyle=1;",
            x=x_barramento + 8, y=y_bar_top - 25, w=250, h=20
        )

        # ─── 6. CIRCUITOS DE SAÍDA (DERIVAÇÕES HORIZONTAIS ALINHADAS) ────────
        for idx, circ in enumerate(circuitos):
            y_circ = y_bar_top + ((idx + 1) * passo_y) - 20
            
            # Ramal horizontal saindo do barramento
            x_deriv_end = x_barramento + 70
            self.add_edge(
                f"endArrow=none;html=1;strokeColor={COR_LINHA};strokeWidth=2;",
                points=[(x_barramento, y_circ + 20), (x_deriv_end, y_circ + 20)]
            )

            # Informações do circuito
            c_num = circ.get("numero", idx + 1)
            c_nome = circ.get("nome", f"Circuito {c_num}")
            c_amp = circ.get("corrente_a", 20)
            c_tipo = circ.get("disjuntor_tipo", "DIN").upper()
            c_curva = circ.get("curva", "C")
            c_polos = circ.get("polos", "3P" if num_fases == 3 else "1P")
            c_cabo = circ.get("cabo", "Cabo 4.0 mm²")
            c_pot = circ.get("potencia_w", 0)
            c_dr = circ.get("dr", False)

            is_cm = "CAIXA" in c_tipo or c_amp > 63
            
            # Valor da corrente centralizado acima do símbolo
            self.add_vertex(
                f"<b>{c_amp}A</b> (Curva {c_curva})",
                f"text;html=1;align=center;verticalAlign=bottom;fontColor={COR_AMBAR};fontSize=10;fontFamily=JetBrains Mono,monospace;fontStyle=1;",
                x=x_deriv_end - 5, y=y_circ - 3, w=70, h=18
            )

            # Símbolo do Disjuntor (DIN vs Caixa Moldada)
            style_disj = (
                f"rounded=0;whiteSpace=wrap;html=1;fillColor=#1E1B4B;strokeColor={COR_LARANJA};strokeWidth=3;fontColor={COR_FONTE};fontSize=10;fontStyle=1;"
                if is_cm else
                f"rounded=0;whiteSpace=wrap;html=1;fillColor=#0F172A;strokeColor=#E2E8F0;strokeWidth=2;fontColor={COR_FONTE};fontSize=10;"
            )
            lbl_disj = f"{c_polos}"
            id_disj = self.add_vertex(
                lbl_disj,
                style_disj,
                x=x_deriv_end, y=y_circ + 10, w=60, h=25
            )

            # Linha para a carga
            x_carga_start = x_deriv_end + 60
            x_carga_end = x_carga_start + 45
            self.add_edge(
                f"endArrow=classic;html=1;strokeColor={COR_LINHA};strokeWidth=2;",
                points=[(x_carga_start, y_circ + 20), (x_carga_end, y_circ + 20)]
            )

            # Descrição textual do circuito à direita
            pot_txt = f"{round(c_pot/1000, 2)} kW" if c_pot >= 1000 else f"{c_pot} W"
            dr_txt = " • DR 30mA" if c_dr else ""
            desc_html = (
                f"<b>Circ. {c_num}: {html.escape(c_nome)}</b><br/>"
                f"<span style='color:#94A3B8;font-size:10px;'>{pot_txt} • {c_cabo}{dr_txt}</span>"
            )
            self.add_vertex(
                desc_html,
                f"text;html=1;align=left;verticalAlign=middle;fontColor={COR_FONTE};fontSize=11;fontFamily=Helvetica;",
                x=x_carga_end + 12, y=y_circ + 2, w=420, h=36
            )

        return ET.tostring(self.mxfile, encoding="utf-8", xml_declaration=True).decode("utf-8")


def generate_drawio_xml(payload: Dict[str, Any]) -> str:
    """Função pública de interface para APIs FastAPI/Next.js/Antigravity."""
    builder = DrawIOUnifilarBuilder(title=payload.get("titulo", "Diagrama Unifilar de Entrada e Distribuição"))
    return builder.build_from_payload(payload)


if __name__ == "__main__":
    # Teste de execução autônomo com payload padrão industrial
    exemplo_payload = {
        "titulo": "Diagrama Unifilar EV Hub Cordeiro Energia",
        "concessionaria": "Cemig Distribuição",
        "padrao": {
            "tipo_ligacao": "TRIFASICO",
            "tensao": "220/380V",
            "disjuntor_padrao_a": 225,
            "tipo_disjuntor_padrao": "CAIXA_MOLDADA"
        },
        "dps": {
            "classe": "II",
            "corrente_ka": 45,
            "uc_max_v": 275
        },
        "circuitos": [
            {
                "numero": 1,
                "nome": "Estação Rápida DC 60 kW (Alimentador Dedicado)",
                "corrente_a": 125,
                "potencia_w": 60000,
                "disjuntor_tipo": "CAIXA_MOLDADA",
                "curva": "C",
                "polos": "3P",
                "cabo": "3x 50mm² (EPR 90°C)",
                "dr": True
            },
            {
                "numero": 2,
                "nome": "Carregador AC 22 kW Wallbox",
                "corrente_a": 40,
                "potencia_w": 22000,
                "disjuntor_tipo": "DIN",
                "curva": "C",
                "polos": "3P",
                "cabo": "3x 10mm² + N",
                "dr": True
            },
            {
                "numero": 3,
                "nome": "Iluminação LED Patio de Recarga",
                "corrente_a": 16,
                "potencia_w": 1800,
                "disjuntor_tipo": "DIN",
                "curva": "B",
                "polos": "1P",
                "cabo": "2x 2.5mm²",
                "dr": False
            },
            {
                "numero": 4,
                "nome": "Tomada de Serviço e Manutenção",
                "corrente_a": 20,
                "potencia_w": 2200,
                "disjuntor_tipo": "DIN",
                "curva": "C",
                "polos": "1P",
                "cabo": "3x 2.5mm² (F+N+T)",
                "dr": True
            }
        ]
    }

    out_file = os.path.join(os.path.dirname(__file__), "unifilar_output.drawio")
    xml_content = generate_drawio_xml(exemplo_payload)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"Sucesso: Diagrama exportado para {out_file} ({len(xml_content)} bytes)")
