import axios from 'axios';

async function testPvgisKeys() {
  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=-18.6478&lon=-44.0557&peakpower=1&loss=14&outputformat=json`;
  const res = await axios.get(url);
  console.log('Outputs keys:', Object.keys(res.data.outputs));
  console.log('Monthly sample:', res.data.outputs.monthly?.fixed?.[0]);
  console.log('Totals fixed:', res.data.outputs.totals?.fixed);
}

testPvgisKeys();
