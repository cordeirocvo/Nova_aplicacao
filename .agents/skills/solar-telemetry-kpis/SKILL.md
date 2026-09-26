---
name: solar-telemetry-kpis
description: Metodologia e cálculo dos 4 KPIs fotovoltaicos fundamentais segundo normas IEC 61724.
---

# Solar Telemetry & KPIs Guide

## 1. Os 4 KPIs Essenciais da Usina
1. **Potência Ativa Instantânea (kW):** Potência atual gerada e % da capacidade instalada.
2. **Geração Acumulada no Dia (kWh):** Energia produzida no dia.
3. **Performance Ratio (PR %):** Indicador de conversão real vs ideal.
4. **Disponibilidade dos Inversores:** Inversores online vs total.

## 2. Semáforo Dinâmico
- Verde: PR >= prLimiteVerde (padrão 78%).
- Amarelo: prLimiteAmarelo <= PR < prLimiteVerde (padrão 60% a 78%).
- Vermelho: PR < prLimiteAmarelo ou inversor com falha/alarme ativo.
