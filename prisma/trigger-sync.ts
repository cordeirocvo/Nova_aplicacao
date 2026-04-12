import { syncGoogleSheets } from '../src/lib/services/googleSync';

async function main() {
  console.log('--- Starting Sync with New GID (2116966617) ---');
  const result = await syncGoogleSheets();
  console.log('Sync Result:', JSON.stringify(result, null, 2));
}

main();
