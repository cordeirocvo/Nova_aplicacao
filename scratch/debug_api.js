async function test() {
  const res = await fetch('http://localhost:3000/api/engenharia/projetos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Teste 500', tipo: 'SOLAR' })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(data, null, 2));
}
test();
