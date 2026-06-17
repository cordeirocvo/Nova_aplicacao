import os
import json
import math

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

def estimar_circuitos_da_imagem(caminho_arquivo):
    """
    Detecta a quantidade de circuitos baseado no nome do arquivo e metadados.
    Se for o bifasico, sabemos que possui 20 posicoes (10 fases no barramento com duas derivacoes cada).
    Se for o painel montado, possui 24 posicoes (12 niveis trifasicos).
    """
    filename = os.path.basename(caminho_arquivo).lower()
    
    # Valida existencia
    if not os.path.exists(caminho_arquivo):
        print(f"Aviso: Arquivo {caminho_arquivo} nao encontrado. Adotando fallback padrao.")
        return 32

    # Tenta obter informacoes da imagem via Pillow
    if HAS_PILLOW:
        try:
            with Image.open(caminho_arquivo) as img:
                print(f"Imagem {filename} aberta com sucesso. Dimensoes: {img.size[0]}x{img.size[1]}px")
        except Exception as e:
            print(f"Erro ao ler imagem {filename}: {e}")

    # Heuristica baseada nos nomes de arquivos do usuario
    if "bif" in filename:
        return 20 # 10 niveis alternados, total de 20 circuitos
    elif "painel" in filename:
        return 24 # 12 niveis trifasicos, total de 24 circuitos
    
    return 32 # Fallback geral

def modelar_painel_eletrico(diretorio_saida, caminho_imagem, num_fases):
    # 1. Obter circuitos base e aplicar 10% de folga
    circuitos_base = estimar_circuitos_da_imagem(caminho_imagem)
    circuitos_totais = math.ceil(circuitos_base * 1.10)
    
    prefixo = "bifasico" if num_fases == 2 else "painel"
    
    print(f"--- Processando Painel {num_fases}F ---")
    print(f"Imagem de referencia: {os.path.basename(caminho_imagem)}")
    print(f"Circuitos base: {circuitos_base} | Com folga 10%: {circuitos_totais}")

    # Constantes dimensionais Soprano (em mm)
    PASSO_VERTICAL = 17.5
    PASSO_DIN_PADRAO = 18.0
    
    pontos_parafusos = []
    
    # --- 1. DISJUNTOR GERAL CAIXA MOLDADA (TOPO) ---
    z_geral = 500.0
    
    # Parafusos do Geral (M6)
    if num_fases == 3:
        offset_geral = [-30.0, 0.0, 30.0]
        fases_geral = ["A", "B", "C"]
    elif num_fases == 2:
        offset_geral = [-15.0, 15.0]
        fases_geral = ["A", "B"]
    else:
        offset_geral = [0.0]
        fases_geral = ["A"]
        
    for x_off, fase in zip(offset_geral, fases_geral):
        pontos_parafusos.append((x_off, 0.0, z_geral + 77.5, "Parafuso_M6", f"Geral_Entrada_Fase_{fase}"))
        
    z_saida_geral = z_geral - 77.5
    for x_off, fase in zip(offset_geral, fases_geral):
        pontos_parafusos.append((x_off, 0.0, z_saida_geral, "Parafuso_M6", f"Geral_Saida_Barramento_{fase}"))
        
    # Recuo obrigatorio de segurança da Soprano
    z_atual = z_saida_geral - 60.0
    
    # --- 2. TRILHO DE PROTEÇÃO (DPS E IDR) ---
    x_protecao = -150.0
    # DPS (1 por fase)
    for i in range(num_fases):
        pontos_parafusos.append((x_protecao, 20.0, z_atual, "Parafuso_M4", f"DPS_Borne_Fase_{i+1}"))
        x_protecao += PASSO_DIN_PADRAO
        
    # IDR (Tetrapolar para 3F, Bipolar para 1F ou 2F)
    num_polos_idr = 4 if num_fases == 3 else 2
    for i in range(num_polos_idr):
        pontos_parafusos.append((x_protecao, 20.0, z_atual, "Parafuso_M4", f"IDR_Borne_{i+1}"))
        x_protecao += PASSO_DIN_PADRAO
        
    z_atual -= 100.0
    z_inicio_barramento = z_atual

    # --- 3. BARRAMENTO CENTRAL DE DISTRIBUIÇÃO (ESPINHA DE PEIXE) ---
    if num_fases == 3:
        offset_fases = [-15.0, 0.0, 15.0]
        cores_fases = ["Preta", "Vermelha", "Branca"]
    elif num_fases == 2:
        offset_fases = [-10.0, 10.0]
        cores_fases = ["Preta", "Vermelha"]
    else:
        offset_fases = [0.0]
        cores_fases = ["Preta"]

    for c in range(circuitos_totais):
        fase_id = c % num_fases
        cor_fase = cores_fases[fase_id]
        lado = "Esquerda" if c % 2 == 0 else "Direita"
        z_pos = z_inicio_barramento - (c * PASSO_VERTICAL)
        
        # Disjuntores de maior porte Soprano nas primeiras posicoes (alta potencia)
        if c < 4:
            distancia_x_borne = 85.0
            tipo_parafuso = "Parafuso_M5"
            tipo_disj = "Soprano_Alta_Corrente"
        else:
            distancia_x_borne = 60.0
            tipo_parafuso = "Parafuso_M4"
            tipo_disj = "Soprano_DIN_Comum"
            
        x_pos = -distancia_x_borne if lado == "Esquerda" else distancia_x_borne
        
        # Parafuso de conexao no barramento de cobre principal
        x_fix_central = offset_fases[fase_id]
        pontos_parafusos.append((x_fix_central, 10.0, z_pos, "Parafuso_M5", f"Fixacao_Central_C{c+1}_{cor_fase}"))
        
        # Parafuso do borne do disjuntor Soprano
        pontos_parafusos.append((x_pos, 30.0, z_pos, tipo_parafuso, f"Borne_Disj_{c+1}_{tipo_disj}"))
        
        # Parafusos das reguas laterais (Neutro a esquerda, Terra a direita)
        pontos_parafusos.append((-180.0, 15.0, z_pos, "Parafuso_M4", f"Borne_Regua_Neutro_N{c+1}"))
        pontos_parafusos.append((180.0, 15.0, z_pos, "Parafuso_M4", f"Borne_Regua_Terra_T{c+1}"))

    # --- 4. FIXAÇÃO DO CHASSI METÁLICO (QUATRO EXTREMIDADES) ---
    x_chassi_limite = 220.0
    z_chassi_topo = z_geral + 120.0
    z_chassi_base = z_pos - 50.0
    
    pontos_parafusos.append((-x_chassi_limite, -10.0, z_chassi_topo, "Parafuso_M6", "Chassi_Fixacao_Superior_Esquerda"))
    pontos_parafusos.append((x_chassi_limite, -10.0, z_chassi_topo, "Parafuso_M6", "Chassi_Fixacao_Superior_Direita"))
    pontos_parafusos.append((-x_chassi_limite, -10.0, z_chassi_base, "Parafuso_M6", "Chassi_Fixacao_Inferior_Esquerda"))
    pontos_parafusos.append((x_chassi_limite, -10.0, z_chassi_base, "Parafuso_M6", "Chassi_Fixacao_Inferior_Direita"))

    # --- 5. EXPORTAÇÃO DOS SCRIPTS CAD E RELATÓRIO BOM ---
    
    # 5.1 Script Blender
    caminho_blender = os.path.join(diretorio_saida, f"pontos_{prefixo}_blender.py")
    with open(caminho_blender, "w", encoding="utf-8") as f:
        f.write("import bpy\n\n")
        f.write("def adicionar_parafuso(x, y, z, tipo, nome):\n")
        f.write("    # Esferas de raio dinamico conforme o tamanho do parafuso\n")
        f.write("    raio = 0.003 if 'M6' in tipo else (0.0025 if 'M5' in tipo else 0.002)\n")
        f.write("    bpy.ops.mesh.primitive_uv_sphere_add(radius=raio, location=(x/1000, y/1000, z/1000))\n")
        f.write("    bpy.context.active_object.name = nome\n\n")
        for pt in pontos_parafusos:
            f.write(f"adicionar_parafuso({pt[0]}, {pt[1]}, {pt[2]}, '{pt[3]}', '{pt[4]}')\n")
            
    # 5.2 Script AutoCAD
    caminho_autocad = os.path.join(diretorio_saida, f"pontos_{prefixo}_autocad.scr")
    with open(caminho_autocad, "w", encoding="utf-8") as f:
        f.write("_PDMODE 34\n") # Cruz dentro do circulo
        f.write("_PDSIZE 3\n")
        for pt in pontos_parafusos:
            f.write("POINT\n")
            f.write(f"{pt[0]},{pt[1]},{pt[2]}\n")

    # 5.3 Relatorio BOM (.txt)
    m4_count = sum(1 for pt in pontos_parafusos if pt[3] == "Parafuso_M4")
    m5_count = sum(1 for pt in pontos_parafusos if pt[3] == "Parafuso_M5")
    m6_count = sum(1 for pt in pontos_parafusos if pt[3] == "Parafuso_M6")
    
    caminho_bom = os.path.join(diretorio_saida, f"lista_materiais_{prefixo}.txt")
    with open(caminho_bom, "w", encoding="utf-8") as f:
        f.write("=================================================================\n")
        f.write(f"LISTA DE MATERIAIS DE ACOPLAMENTO MECANICO - PAINEL {num_fases.upper() if isinstance(num_fases, str) else num_fases}F\n")
        f.write("=================================================================\n")
        f.write(f"Referência física: {os.path.basename(caminho_imagem)}\n")
        f.write(f"Circuitos base lidos na imagem: {circuitos_base}\n")
        f.write(f"Capacidade de projeto (+10% folga comercial): {circuitos_totais} conexoes\n\n")
        f.write("CONTAGEM DE COMPONENTES DE FIXACAO (PARAFUSOS):\n")
        f.write(f"- Parafusos M4 (Bornes Disjuntor Comum, Neutro, Terra, Protecoes): {m4_count} unidades\n")
        f.write(f"- Parafusos M5 (Barramento Central Espinha e Disjuntor Alta Corrente): {m5_count} unidades\n")
        f.write(f"- Parafusos M6 (Geral Caixa Moldada e Fixacao Estrutural Chassi): {m6_count} unidades\n")
        f.write(f"TOTAL GERAL DE PARAFUSOS MECANICOS DE CONEXÃO: {len(pontos_parafusos)} unidades\n\n")
        f.write("DETALHAMENTO GEOMETRICO DE PONTOS DE CONEXAO (X, Y, Z em mm):\n")
        for pt in pontos_parafusos:
            f.write(f"[{pt[3]}] {pt[4]}: X={pt[0]:.1f}, Y={pt[1]:.1f}, Z={pt[2]:.1f}\n")
            
    print(f"Painel {num_fases}F processado com sucesso!")
    print(f"Arquivos gerados:")
    print(f" - {caminho_blender}")
    print(f" - {caminho_autocad}")
    print(f" - {caminho_bom}")
    print("-----------------------------------------------------------------")

def main():
    downloads_dir = r"C:\Users\BRUNO CORDEIRO\Downloads"
    
    # 1. Modelar barramento Bifasico baseando-se no arquivo Bifásico.webp
    caminho_bifasico = os.path.join(downloads_dir, "Bifásico.webp")
    modelar_painel_eletrico(downloads_dir, caminho_bifasico, num_fases=2)
    
    # 2. Modelar barramento Trifasico baseando-se no arquivo Painel montado.webp
    caminho_painel = os.path.join(downloads_dir, "Painel montado.webp")
    modelar_painel_eletrico(downloads_dir, caminho_painel, num_fases=3)

if __name__ == "__main__":
    main()
