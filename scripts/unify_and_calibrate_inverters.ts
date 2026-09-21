import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔄 Iniciando unificação e calibração dos inversores no banco de dados...');

  // =========================================================================
  // 1. MANGA GRANDE 01 (ID: cmp8hqv4400h9wgv5c9f2tdbh)
  // Capacidade física: 1.400 kWp CC / 1.000 kW CA (4x SUN2000 de 250 kW)
  // =========================================================================
  const mg1Id = 'cmp8hqv4400h9wgv5c9f2tdbh';
  const mg1 = await prisma.usina.findUnique({ where: { id: mg1Id }, include: { inversores: true } });

  if (mg1) {
    console.log(`\n📍 Calibrando Manga Grande 01: ${mg1.nome}...`);

    // Manter apenas os 4 seriais oficiais da Huawei
    const seriaisOficiaisMG1 = ['ES2380071220', 'ES2380071249', 'ES2450052227', 'ES2450054367'];

    // Deletar duplicatas e apelidos
    const duplicatas = mg1.inversores.filter(i => !seriaisOficiaisMG1.includes(i.numeroSerie));
    for (const d of duplicatas) {
      console.log(` - Removendo inversor duplicado/apelido: ${d.numeroSerie} (${d.potenciaNominalKW} kW)`);
      await prisma.inversor.delete({ where: { id: d.id } });
    }

    // Atualizar/Assegurar os 4 inversores oficiais com 250 kW cada
    for (const sn of seriaisOficiaisMG1) {
      const invExistente = mg1.inversores.find(i => i.numeroSerie === sn);
      if (invExistente) {
        await prisma.inversor.update({
          where: { id: invExistente.id },
          data: {
            modelo: 'SUN2000-250KTL',
            potenciaNominalKW: 250.0,
            status: 'ONLINE',
          },
        });
        console.log(` ✓ Atualizado inversor ${sn} para 250 kW (SUN2000-250KTL)`);
      } else {
        await prisma.inversor.create({
          data: {
            usinaId: mg1Id,
            numeroSerie: sn,
            modelo: 'SUN2000-250KTL',
            potenciaNominalKW: 250.0,
            status: 'ONLINE',
          },
        });
        console.log(` + Criado inversor oficial ${sn} com 250 kW`);
      }
    }
  }

  // =========================================================================
  // 2. MANGA GRANDE 02 (ID: cmp8qki8u00050wv5m092pu9g)
  // Capacidade física: 1.400 kWp CC / 1.000 kW CA (4x SUN2000 de 250 kW)
  // =========================================================================
  const mg2Id = 'cmp8qki8u00050wv5m092pu9g';
  const mg2 = await prisma.usina.findUnique({ where: { id: mg2Id }, include: { inversores: true } });

  if (mg2) {
    console.log(`\n📍 Calibrando Manga Grande 02: ${mg2.nome}...`);
    const seriaisOficiaisMG2 = ['ES2390024603', 'ES2390025439', 'ES2390025524', 'ES2390024605'];

    // Deletar qualquer outro inversor não oficial
    const duplicatas = mg2.inversores.filter(i => !seriaisOficiaisMG2.includes(i.numeroSerie));
    for (const d of duplicatas) {
      console.log(` - Removendo duplicata de MG2: ${d.numeroSerie}`);
      await prisma.inversor.delete({ where: { id: d.id } });
    }

    // Atualizar os 4 inversores para 250 kW cada
    for (const sn of seriaisOficiaisMG2) {
      const invExistente = mg2.inversores.find(i => i.numeroSerie === sn);
      if (invExistente) {
        await prisma.inversor.update({
          where: { id: invExistente.id },
          data: {
            modelo: 'SUN2000-250KTL',
            potenciaNominalKW: 250.0,
            status: 'ONLINE',
          },
        });
        console.log(` ✓ Atualizado inversor ${sn} para 250 kW (SUN2000-250KTL)`);
      } else {
        await prisma.inversor.create({
          data: {
            usinaId: mg2Id,
            numeroSerie: sn,
            modelo: 'SUN2000-250KTL',
            potenciaNominalKW: 250.0,
            status: 'ONLINE',
          },
        });
        console.log(` + Criado inversor oficial ${sn} com 250 kW`);
      }
    }
  }

  // =========================================================================
  // 3. MANGA GRANDE 03 (ID: cmtur27em00nel4v55jwzfpah)
  // Capacidade física: 1.400 kWp CC / 1.000 kW CA (4x SUN2000 de 250 kW)
  // =========================================================================
  const mg3Id = 'cmtur27em00nel4v55jwzfpah';
  const mg3 = await prisma.usina.findUnique({ where: { id: mg3Id }, include: { inversores: true } });

  if (mg3) {
    console.log(`\n📍 Calibrando Manga Grande 03: ${mg3.nome}...`);
    for (const inv of mg3.inversores) {
      await prisma.inversor.update({
        where: { id: inv.id },
        data: {
          modelo: 'SUN2000-250KTL',
          potenciaNominalKW: 250.0,
        },
      });
      console.log(` ✓ Inversor ${inv.numeroSerie} calibrado para 250 kW`);
    }
  }

  // =========================================================================
  // 4. USINA ALIPIO LOPES 24KW (ID: cmp8naeym000hssv5ycm2ziza)
  // Capacidade física: 24 kWp CC / 24 kW CA (3x inversores de 8 kW cada)
  // =========================================================================
  const alipioId = 'cmp8naeym000hssv5ycm2ziza';
  const alipio = await prisma.usina.findUnique({ where: { id: alipioId }, include: { inversores: true } });

  if (alipio) {
    console.log(`\n📍 Calibrando Usina Alipio Lopes 24KW...`);
    for (const inv of alipio.inversores) {
      await prisma.inversor.update({
        where: { id: inv.id },
        data: {
          modelo: 'Inversor 8kW',
          potenciaNominalKW: 8.0, // 3 * 8 = 24 kW
        },
      });
      console.log(` ✓ Inversor ${inv.numeroSerie} ajustado para 8 kW (total = 24 kW CA)`);
    }
  }

  // =========================================================================
  // 5. USINA WELLCAS 50KW (ID: cmp9lt0wn01ldbsv5ljep5b0f)
  // Capacidade física: 50 kWp CC / 45 kW CA (1 inversor de 45 kW)
  // =========================================================================
  const wellcasId = 'cmp9lt0wn01ldbsv5ljep5b0f';
  const wellcas = await prisma.usina.findUnique({ where: { id: wellcasId }, include: { inversores: true } });

  if (wellcas && wellcas.inversores.length > 0) {
    console.log(`\n📍 Calibrando Usina Wellcas 50KW...`);
    await prisma.inversor.update({
      where: { id: wellcas.inversores[0].id },
      data: {
        modelo: 'Inversor 50kW',
        potenciaNominalKW: 50.0,
      },
    });
    console.log(` ✓ Inversor ${wellcas.inversores[0].numeroSerie} ajustado para 50 kW CA`);
  }

  // =========================================================================
  // 6. USINA EVANDRO DINIZ FAZENDA (ID: cmp9symbl000zpwv5o28i9iud)
  // Capacidade física: 96.815 kWp CC / 72.61 kW CA (3x Solis de 24.2 kW)
  // =========================================================================
  const evandroId = 'cmp9symbl000zpwv5o28i9iud';
  const evandro = await prisma.usina.findUnique({ where: { id: evandroId }, include: { inversores: true } });

  if (evandro) {
    console.log(`\n📍 Calibrando Usina Evandro Diniz Fazenda...`);
    // Remover o inversor fantasma de 100 kW
    const ghost = evandro.inversores.find(i => i.numeroSerie === '1180E0229180198');
    if (ghost) {
      console.log(` - Removendo inversor duplicado fantasma: ${ghost.numeroSerie} (${ghost.potenciaNominalKW} kW)`);
      await prisma.inversor.delete({ where: { id: ghost.id } });
    }
  }

  console.log('\n✅ Calibração de todos os inversores concluída com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
