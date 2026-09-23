import 'dotenv/config';
import { HuaweiIntegration } from '../src/lib/services/huaweiIntegration';

const DEV_IDS = [
  { id: '1000000045877644', label: 'INV01' },
  { id: '1000000045877645', label: 'INV02' },
  { id: '1000000045877642', label: 'INV03' },
  { id: '1000000045877643', label: 'INV04' },
];

async function main() {
  const session = await HuaweiIntegration.login();
  const hw: any = HuaweiIntegration;

  // Dias a cada 5 dias de 01/04 a 31/05
  const sampleDates: string[] = [];
  const start = new Date('2026-04-01T12:00:00-03:00');
  const end = new Date('2026-05-31T12:00:00-03:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 4)) {
    sampleDates.push(d.toISOString().substring(0, 10));
  }

  console.log(`Testando ${sampleDates.length} datas entre Abril e Maio...`);

  // Vamos mapear para cada inversor e para cada string (1 a 14) o histórico de corrente
  // key: inv_string -> array de { date, I, V }
  const history: Record<string, Array<{ date: string; I: number; V: number }>> = {};

  for (const dStr of sampleDates) {
    const startMs = new Date(`${dStr}T11:55:00-03:00`).getTime();
    const endMs = new Date(`${dStr}T12:20:00-03:00`).getTime();

    for (const dev of DEV_IDS) {
      try {
        const res = await hw.hwRequest(
          '/getDevHistoryKpi',
          {
            devIds: dev.id,
            devTypeId: 1,
            startTime: startMs,
            endTime: endMs,
          },
          session.token,
          session.cookie
        );

        const pts = res.data || [];
        if (pts.length > 0) {
          // Pegar o ponto de maior potência ativa no intervalo
          let bestPt = pts[0];
          let maxP = 0;
          for (const p of pts) {
            const pVal = parseFloat(p.dataItemMap?.active_power || '0');
            if (pVal > maxP) {
              maxP = pVal;
              bestPt = p;
            }
          }

          const map = bestPt.dataItemMap || {};
          for (let s = 1; s <= 14; s++) {
            const key = `${dev.label}_S${s}`;
            const i = parseFloat(map[`pv${s}_i`] || '0');
            const v = parseFloat(map[`pv${s}_u`] || '0');
            if (!history[key]) history[key] = [];
            history[key].push({ date: dStr, I: i, V: v });
          }
        }
      } catch (e: any) {
        console.error(`Erro ${dev.label} em ${dStr}:`, e.message);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`Data ${dStr} processada.`);
  }

  console.log('\n=== ANÁLISE DE VARIAÇÃO DE STATUS DE STRINGS ===');
  for (const [key, records] of Object.entries(history)) {
    const currents = records.map((r) => r.I);
    const hasZero = currents.some((i) => i === 0);
    const hasNonZero = currents.some((i) => i >= 2.0);

    // Se a string tem momentos com zero E momentos com corrente normal, é um evento claro de fusível queimado e consertado!
    if (hasZero && hasNonZero) {
      console.log(`\n🎯 STRING IDENTIFICADA COM MUDANÇA DE ESTADO (FUSÍVEL QUEIMADO / CONSERTADO): ${key}`);
      records.forEach((r) => {
        console.log(`   ${r.date}: I = ${r.I} A | V = ${r.V} V`);
      });
    }
  }

  // Também listar strings que ficaram SEMPRE com I=0 mas V>350V
  console.log('\nStrings com I=0 constante (e V >= 350V):');
  for (const [key, records] of Object.entries(history)) {
    const currents = records.map((r) => r.I);
    const allZero = currents.every((i) => i === 0);
    const avgV = records.reduce((s, r) => s + r.V, 0) / (records.length || 1);
    if (allZero && avgV >= 350) {
      console.log(`   ${key}: I=0A constante, Tensão Média = ${avgV.toFixed(1)} V`);
    }
  }
}

main().catch(console.error);
