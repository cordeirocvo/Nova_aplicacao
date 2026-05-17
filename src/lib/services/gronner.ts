export async function sendLeadToGronner(lead: any) {
  const webhookUrl = process.env.GRONNER_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn("GRONNER_WEBHOOK_URL não configurado. Pulando integração.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      console.error(`Erro ao enviar para Gronner: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Erro na integração com Gronner:", error);
  }
}
