import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';

async function main() {
  const usina = await prisma.usina.findUnique({
    where: { id: 'cmp8hqv4400h9wgv5c9f2tdbh' },
    include: { estacao: true, inversores: true },
  });
  console.log('Usina Manga Grande 1:', usina?.nome, 'ID:', usina?.id);

  // 1. Checar telemetrias existentes entre 01/04/2026 e 31/05/2026
  const startApr = new Date('2026-04-01T00:00:00-03:00');
  const endMay = new Date('2026-05-31T23:59:59-03:00');

  const countTele = await prisma.telemetria.count({
    where: {
      usinaId: 'cmp8hqv4400h9wgv5c9f2tdbh',
      timestamp: { gte: startApr, lte: endMay },
    },
  });

  const countMetricas = await prisma.metricaDiariaUsina.count({
    where: {
      usinaId: 'cmp8hqv4400h9wgv5c9f2tdbh',
      data: { gte: startApr, lte: endMay },
    },
  });

  console.log(`No DB: ${countTele} telemetrias e ${countMetricas} métricas diárias em Abr-Mai/2026.`);

  // Se houver telemetria, checar se tem dadosStrings
  if (countTele > 0) {
    const sampleWithStrings = await prisma.telemetria.findFirst({
      where: {
        usinaId: 'cmp8hqv4400h9wgv5c9f2tdbh',
        timestamp: { gte: startApr, lte: endMay },
        dadosStrings: { not: null as any },
      },
    });
    console.log('Existe amostra com dadosStrings no DB?', !!sampleWithStrings);
    if (sampleWithStrings) {
      console.log('Data amostra:', sampleWithStrings.timestamp);
      console.log('Keys dadosStrings:', Object.keys(sampleWithStrings.dadosStrings as object).slice(0, 10));
    }
  }

  // 2. Checar se o arquivo Excel em Downloads existe
  const excelPath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\Manga_Grande_01_Jan-Set2026_Telemetria.xlsx';
  console.log('Arquivo Excel existe?', fs.existsSync(excelPath));
  if (fs.existsSync(excelPath)) {
    const stat = fs.statSync(excelPath);
    console.log('Tamanho do Excel:', stat.size, 'bytes');
  }

  // 3. Listar todas as usinas no banco para sabermos todos os fabricantes
  const todasUsinas = await prisma.usina.findMany({
    select: {
      id: true,
      nome: true,
      apiFornecedor: true,
      capacidadeKWp: true,
      inversores: {
        select: {
          id: true,
          modelo: true,
          potenciaNominalKW: true,
          numeroSerie: true,
        },
      },
    },
    orderBy: { nome: 'asc' },
  });
  console.log('\n=== TODAS AS USINAS NO BANCO ===');
  for (const u of todasUsinas) {
    const potCA = u.inversores.reduce((s, inv) => s + (inv.potenciaNominalKW || 0), 0);
    console.log(`- [${u.apiFornecedor || 'N/A'}] ${u.nome} | ID: ${u.id} | CC: ${u.capacidadeKWp} kWp | Inversores: ${u.inversores.length} (Total CA: ${potCA} kW)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
