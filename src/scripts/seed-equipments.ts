import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding equipments...');

  // 1. Modulos Fotovoltaicos
  const modulos = [
    {
      fabricante: 'Risen',
      modelo: 'RSM110-8-550M',
      potenciaPicoWp: 550,
      Vmp: 31.97,
      Imp: 17.21,
      Voc: 38.42,
      Isc: 18.23,
      eficiencia: 21.3,
      dimensoes: '2384x1096x35',
      pesoKg: 29,
    },
    {
      fabricante: 'Canadian Solar',
      modelo: 'CS6W-660MS',
      potenciaPicoWp: 660,
      Vmp: 38.1,
      Imp: 17.33,
      Voc: 45.6,
      Isc: 18.42,
      eficiencia: 21.2,
      dimensoes: '2384x1303x35',
      pesoKg: 34.4,
    },
    {
      fabricante: 'JinkoSolar',
      modelo: 'Tiger Pro 72HC 550W',
      potenciaPicoWp: 550,
      Vmp: 40.9,
      Imp: 13.45,
      Voc: 49.62,
      Isc: 14.03,
      eficiencia: 21.33,
      dimensoes: '2274x1134x35',
      pesoKg: 28.9,
    },
  ];

  for (const m of modulos) {
    await prisma.moduloFotovoltaico.upsert({
      where: { id: `seed-${m.modelo.replace(/\s+/g, '-')}` },
      update: m,
      create: { id: `seed-${m.modelo.replace(/\s+/g, '-')}`, ...m },
    });
  }

  // 2. Inversores Solar
  const inversores = [
    {
      fabricante: 'Huawei',
      modelo: 'SUN2000-5KTL-L1',
      potenciaNominalKW: 5,
      tipoConexao: 'HYBRID',
      tensaoEntradaMinV: 100,
      tensaoEntradaMaxV: 600,
      correnteMaxCC: 12.5,
      numeroStringsMPPT: 2,
    },
    {
      fabricante: 'Huawei',
      modelo: 'SUN2000-10KTL-M1',
      potenciaNominalKW: 10,
      tipoConexao: 'HYBRID',
      tensaoEntradaMinV: 160,
      tensaoEntradaMaxV: 1100,
      correnteMaxCC: 11,
      numeroStringsMPPT: 2,
    },
    {
      fabricante: 'Huawei',
      modelo: 'SUN2000-50KTL-M3',
      potenciaNominalKW: 50,
      tipoConexao: 'ON_GRID',
      tensaoEntradaMinV: 200,
      tensaoEntradaMaxV: 1100,
      correnteMaxCC: 30,
      numeroStringsMPPT: 4,
    },
    {
      fabricante: 'GoodWe',
      modelo: 'GW5048-EM',
      potenciaNominalKW: 5,
      tipoConexao: 'HYBRID',
      tensaoEntradaMinV: 100,
      tensaoEntradaMaxV: 550,
      correnteMaxCC: 11,
      numeroStringsMPPT: 1,
    },
    {
      fabricante: 'Solis',
      modelo: 'S6-GR1P5K',
      potenciaNominalKW: 5,
      tipoConexao: 'ON_GRID',
      tensaoEntradaMinV: 60,
      tensaoEntradaMaxV: 600,
      correnteMaxCC: 14,
      numeroStringsMPPT: 2,
    },
  ];

  for (const i of inversores) {
    await prisma.inversorSolar.upsert({
      where: { id: `seed-${i.modelo.replace(/\s+/g, '-')}` },
      update: i,
      create: { id: `seed-${i.modelo.replace(/\s+/g, '-')}`, ...i },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
