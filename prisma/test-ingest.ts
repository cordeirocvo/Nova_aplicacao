import { ingestAneelTariffs } from '../src/lib/services/ingestTariffs';

async function main() {
  console.log('--- Starting Ingestion Test ---');
  const result = await ingestAneelTariffs();
  console.log('Result:', JSON.stringify(result, null, 2));
}

main();
