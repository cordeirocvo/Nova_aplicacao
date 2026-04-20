import { simularDinamicamenteBESS, BESSConfig } from '../src/lib/engenharia/bessEngine';

const mockConsumo = Array.from({ length: 24 }, (_, h) => ({
  hora: h,
  kw: h >= 18 && h <= 21 ? 150 : 50, // Pico no HP (18-21h)
  posto: (h >= 18 && h <= 21) ? 'HP' : 'HFP'
}));

const config: BESSConfig = {
  capacidadeKWh: 100,
  potenciaInversorKW: 50,
  dodMax: 0.9,
  eficienciaRTE: 0.9,
  custoSistema: 250000,
  estratégia: 'HYBRID'
};

const result = simularDinamicamenteBESS(mockConsumo, 20, 5.0, config);

console.log('--- RESULTADOS DA SIMULAÇÃO (HYBRID) ---');
console.log(`Economia Total: ${result.economiaKWh.toFixed(1)} kWh`);
console.log(`Autonomia: ${result.autonomiaHoras} h`);

result.series.forEach(s => {
  console.log(`${String(s.hora).padStart(2,'0')}h | Solar: ${s.geracaoSolar.toFixed(1)} | Cons: ${s.consumoOriginal.toFixed(1)} | BESS: ${s.potenciaBateria.toFixed(1)} | SoC: ${s.soc}% | Net Grid: ${s.consumoComBESS.toFixed(1)}`);
});
