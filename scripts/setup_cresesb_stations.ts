import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  console.log('--- SANEAMENTO CADASTRAL E CRIAÇÃO DE ESTAÇÕES CRESESB ---');
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  await client.connect();
  console.log(' Conectado ao PostgreSQL com sucesso.');

  // 1. Criar ou Obter Estação CRESESB - Presidente Juscelino
  let resPJ = await client.query('SELECT id, nome FROM "EstacaoSolarimetrica" WHERE "apiId" = $1', ['CRESESB-PRESIDENTE-JUSCELINO']);
  let estacaoPJId = resPJ.rows[0]?.id;

  if (!estacaoPJId) {
    const id = 'cresesb_pj_' + Math.random().toString(36).substring(2, 10);
    const insertRes = await client.query(
      `INSERT INTO "EstacaoSolarimetrica" (id, nome, "apiFornecedor", "apiId", localizacao, "modoColeta", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
      [
        id,
        'Estação Climatológica CRESESB - Presidente Juscelino (MG)',
        'CRESESB',
        'CRESESB-PRESIDENTE-JUSCELINO',
        'Presidente Juscelino - MG, Brasil',
        'CLIMATOLOGICO_ATLAS',
      ]
    );
    estacaoPJId = insertRes.rows[0].id;
    console.log('✅ Estação CRESESB Presidente Juscelino criada:', estacaoPJId);
  } else {
    console.log('ℹ️ Estação CRESESB Presidente Juscelino já existe:', estacaoPJId);
  }

  // 2. Criar ou Obter Estação CRESESB - Jaíba
  let resJaiba = await client.query('SELECT id, nome FROM "EstacaoSolarimetrica" WHERE "apiId" = $1', ['CRESESB-JAIBA']);
  let estacaoJaibaId = resJaiba.rows[0]?.id;

  if (!estacaoJaibaId) {
    const id = 'cresesb_jaiba_' + Math.random().toString(36).substring(2, 10);
    const insertRes = await client.query(
      `INSERT INTO "EstacaoSolarimetrica" (id, nome, "apiFornecedor", "apiId", localizacao, "modoColeta", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
      [
        id,
        'Estação Climatológica CRESESB - Jaíba (MG)',
        'CRESESB',
        'CRESESB-JAIBA',
        'Jaíba - MG, Brasil',
        'CLIMATOLOGICO_ATLAS',
      ]
    );
    estacaoJaibaId = insertRes.rows[0].id;
    console.log('✅ Estação CRESESB Jaíba criada:', estacaoJaibaId);
  } else {
    console.log('ℹ️ Estação CRESESB Jaíba já existe:', estacaoJaibaId);
  }

  // 3. Atualizar Álvaro Palhares (cmtuluuvg008cl4v5tlqt0wib)
  await client.query(
    `UPDATE "Usina"
     SET latitude = -18.647791, longitude = -44.055744, "modoIrradiancia" = 'SATELITE', "estacaoId" = $1
     WHERE id = 'cmtuluuvg008cl4v5tlqt0wib'`,
    [estacaoPJId]
  );
  console.log('✅ Usina Álvaro Palhares atualizada (Lat: -18.647791, Lon: -44.055744, Estação: CRESESB-PJ)');

  // 4. Atualizar Evandro Diniz 75KW GD2 (cmp9lv1da01lobsv5v2cl3khy)
  await client.query(
    `UPDATE "Usina"
     SET latitude = -15.162704, longitude = -43.664700, "modoIrradiancia" = 'SATELITE', "estacaoId" = $1
     WHERE id = 'cmp9lv1da01lobsv5v2cl3khy'`,
    [estacaoJaibaId]
  );
  console.log('✅ Usina Evandro Diniz 75KW GD2 atualizada (Lat: -15.162704, Lon: -43.664700, Estação: CRESESB-Jaíba)');

  // 5. Atualizar Evandro Diniz Fazenda (cmp9symbl000zpwv5o28i9iud)
  await client.query(
    `UPDATE "Usina"
     SET latitude = -15.162704, longitude = -43.664700, "modoIrradiancia" = 'SATELITE', "estacaoId" = $1
     WHERE id = 'cmp9symbl000zpwv5o28i9iud'`,
    [estacaoJaibaId]
  );
  console.log('✅ Usina Evandro Diniz Fazenda atualizada (Lat: -15.162704, Lon: -43.664700, Estação: CRESESB-Jaíba)');

  await client.end();
  console.log('\n--- SANEAMENTO FINALIZADO COM SUCESSO ---');
}

main().catch(console.error);
