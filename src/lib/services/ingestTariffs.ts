import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';

export async function ingestAneelTariffs() {
  const csvPath = path.join(process.cwd(), 'src/data/aneel-tariffs.csv');
  console.log('Reading ANEEL CSV from:', csvPath);

  if (!fs.existsSync(csvPath)) {
    console.error('File not found:', csvPath);
    return { success: false, error: 'File not found at ' + csvPath };
  }

  try {
    const content = fs.readFileSync(csvPath, 'utf8');
    console.log('File read successfully. Length:', content.length);
    const lines = content.split('\n');
    const header = lines[0].split(';');

    // Header Mapping (Indices)
    // 2: SigAgente, 4: DatInicioVigencia, 7: DscSubGrupo, 8: DscModalidadeTarifaria, 12: NomPostoTarifario, 15: VlrTUSD, 16: VlrTE
    
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || !line.includes('CEMIG')) continue;
      
      const cols = line.split(';').map(c => c.replace(/"/g, '').trim());
      
      const sigAgente = cols[2];
      // Apenas CEMIG-D para este MVP/Seed inicial (ou remover filtro para geral)
      if (sigAgente !== 'CEMIG-D' && sigAgente !== 'CEMIG DISTRIBUIO S.A') continue;

      const subGrupo = cols[7];
      const modalidade = cols[8];
      const posto = cols[12];
      const tusdRaw = cols[15].replace(',', '.');
      const teRaw = cols[16].replace(',', '.');
      const startVigencia = new Date(cols[4]);
      
      // Sanitizar valores numéricos
      const tusd = parseFloat(tusdRaw) || 0;
      const te = parseFloat(teRaw) || 0;

      if (modalidade === 'Azul' || modalidade === 'Verde' || modalidade === 'Convencional') {
        await prisma.tarifas.upsert({
          where: {
            distribuidora_subGrupo_modalidade_postoTarifario: {
              distribuidora: 'CEMIG-D',
              subGrupo: subGrupo,
              modalidade: modalidade,
              postoTarifario: posto,
            }
          },
          update: {
            valorTUSD: tusd,
            valorTE: te,
            dataInicio: startVigencia,
            resolution: cols[1],
          },
          create: {
            distribuidora: 'CEMIG-D',
            subGrupo: subGrupo,
            modalidade: modalidade,
            postoTarifario: posto,
            valorTUSD: tusd,
            valorTE: te,
            dataInicio: startVigencia,
            resolution: cols[1],
          }
        });
        count++;
      }
    }

    return { success: true, ingested: count };
  } catch (error) {
    console.error('Ingestion Error:', error);
    return { success: false, error: (error as Error).message };
  }
}
