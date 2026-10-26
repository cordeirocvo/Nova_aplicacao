---
name: ev-charger-mapping
description: Desenha e injeta um mapa interativo contendo eletropostos existentes de uma cidade e destaca o ponto alvo de uma nova instalação utilizando dados reais via Leaflet, OpenChargeMap e Overpass API.
---

# Skill: EV Charging Station Mapping & Site Selection

## Contexto de Negócio & Arquitetura
O usuário opera no ecossistema Cordeiro Energia e deseja automatizar estudos de viabilidade e análises de locais para novas estações de recarga de veículos elétricos (VE). O objetivo principal desta Skill é gerar e manter uma interface de mapa robusta, agnóstica a frameworks (otimizada para Next.js / React 19 com Tailwind CSS), que renderize dados cartográficos e faça a marcação espacial precisa de dois conjuntos de dados:

1. **Pontos Existentes (Concorrentes & Rede Pública)**: Consumidos via OpenChargeMap API v3 ou OpenStreetMap (Overpass API `amenity=charging_station`) com cache colunar Parquet/DuckDB.
2. **Ponto Proposto (Nova Instalação Cordeiro Energia)**: Coordenada exata ou endereço da nova instalação para análise de proximidade e concorrência (ex: Rua Olavo Bilac 1085 Sete Lagoas, Avenida Bias Fortes 1928 Curvelo, ou Rodovia BR-251 Montes Claros).

---

## Instruções de Implementação para o Agente

### 1. Estrutura de Ingestão e Geocodificação
- **Geocoding Automático**: Converter qualquer endereço de entrada (vindo de fatura de concessionária ou digitação) em Latitude e Longitude válidas via rota `/api/ev/geocode`.
- **Reverse Geocoding**: Quando o usuário arrastar o pino do carregador pelo mapa, converter as novas coordenadas de volta para endereço legível e atualizar o projeto.
- **Formato RFC 7946 GeoJSON**: Unificar os dados em uma FeatureCollection GeoJSON contendo propriedades (`properties`) bem definidas (`nome`, `operador`, `potencia_kw`, `conectores`, `status`, `distancia_km`).

### 2. Stack de Front-end & Renderização
- **Leaflet.js**: Renderização client-side leve, responsiva e de custo zero via `next/dynamic` com `{ ssr: false }`.
- **Tiles Base**:
  - Padrão Ergonômico: CartoDB Dark Matter / Dark Navy (`#0A192F`), alinhado à identidade Cordeiro.
  - Alternativa: OpenStreetMap Standard Tiles.

### 3. Diferenciação Visual Obrigatória no Mapa
- **Eletropostos Existentes**:
  - Marcadores com semáforo de 3 cores:
    - Verde (`#00B356`): Disponível / Operacional.
    - Âmbar (`#F59E0B`): Ocupado.
    - Vermelho (`#EF4444`): Em Manutenção / Offline.
  - Ao clicar, abrir Popup com: Nome do operador, potência em kW, conectores (CCS2 / Tipo 2 / CHAdeMO) e distância calculada por Haversine.
- **Eletroposto Alvo (Nova Instalação Cordeiro Energia)**:
  - Marcador de destaque principal em Laranja Cordeiro (`#E45318`) com radar de pulsação CSS.
  - **Interativo e Arrastável (Draggable)**: O usuário pode arrastar o pino para refinar o local de instalação.
  - **Círculos de Buffer de Concorrência**: Anéis concêntricos translúcidos ao redor do ponto proposto (1 km, 3 km e 5 km) delimitando o raio de influência primário e secundário.
- **Tratamento de Região Vazia**: Se não houver eletropostos mapeados no raio selecionado, exibir badge informativo *"Vácuo de Mercado: Nenhum eletroposto mapeado nesta região ainda — Alta oportunidade comercial!"*.
