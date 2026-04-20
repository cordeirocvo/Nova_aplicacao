const testBattery = async () => {
  const batteryData = {
    fabricante: "Solax Test",
    modelo: "T-BAT H 5.8 V2",
    tecnologia: "LFP",
    capacidadeNomKWh: 5.8,
    tensaoNominalV: 115.2,
    profundidadeDescarga: 1
  };

  const res = await fetch("http://localhost:3000/api/engenharia/equipamentos/baterias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batteryData)
  });

  const body = await res.json();
  console.log('Status:', res.status);
  console.log('Body:', body);
};

testBattery();
