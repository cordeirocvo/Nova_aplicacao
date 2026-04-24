import { prisma } from "@/lib/prisma";
import { calcDaysLate } from "@/lib/dateUtils";

const WHATSAPP_ENGENHARIA = "+5538998172069";
const WHATSAPP_ENGENHEIRO = "+5538998657570";

/**
 * Simula o envio de mensagem via WhatsApp.
 * Futuramente, integrar com provedor real (ex: Twilio, Z-API, Evolution API).
 */
async function sendWhatsApp(to: string, message: string) {
  console.log(`[WHATS_LOG] Enviando para ${to}: ${message}`);
  
  // NOTE: Se você tiver uma API de WhatsApp, coloque a chamada fetch aqui.
  // Exemplo hipotético:
  /*
  await fetch('https://api.seuservico.com/send', {
    method: 'POST',
    body: JSON.stringify({ number: to, text: message })
  });
  */
}

export async function checkAndSendAlarm(atividadeId: string) {
  try {
    const atv = await prisma.planilhaInstalacao.findUnique({
      where: { id: atividadeId }
    });

    if (!atv || atv.notificadoWhatsapp) return;

    // Buscar configurações de limites
    const settingsRaw = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    const settings = settingsRaw || { limiteVerde: 40, limiteAmarelo: 20, limiteParecer: 30 };

    // Calcular estados de alarme
    const daysPrev = calcDaysLate(atv.automaticoPrevInstala);
    const daysParecer = calcDaysLate(atv.vencimentoParecer);
    
    const isUrgentParecer = daysParecer !== null && daysParecer < settings.limiteParecer;
    const isLate = daysPrev !== null && daysPrev < settings.limiteAmarelo;
    const isPriority = atv.prioridade;

    // Critério de alarme: Prioridade OU Atraso Vermelho OU Vencimento Parecer Urgente
    if (isPriority || isLate || isUrgentParecer) {
      let motivo = "Alerta de Monitoramento!";
      if (isPriority) motivo = "🚨 ATIVIDADE MARCADA COMO PRIORIDADE";
      else if (isUrgentParecer) motivo = "⚠️ VENCIMENTO DE PARECER URGENTE";
      else if (isLate) motivo = "🔴 ATRASO CRÍTICO NA INSTALAÇÃO";

      const message = `*${motivo}*\n\n` +
                      `*Instalação:* ${atv.instalacao}\n` +
                      `*Status:* ${atv.status}\n` +
                      `*Cidade:* ${atv.cidade || atv.cidadeSheet || "-"}\n` +
                      `*Vendedor:* ${atv.vendedor || atv.vendedorSheet || "-"}\n` +
                      `*Atraso:* ${daysPrev !== null ? daysPrev + " dias" : "N/A"}\n` +
                      `*Parecer:* ${atv.vencimentoParecer || "-"}\n\n` +
                      `_Verifique o painel da Cordeiro Energia para mais detalhes._`;

      const numbers = [WHATSAPP_ENGENHARIA, WHATSAPP_ENGENHEIRO];
      if (atv.telefoneVendedor) numbers.push(atv.telefoneVendedor);

      // Enviar para todos os responsáveis
      await Promise.all(numbers.map(num => sendWhatsApp(num, message)));

      // Marcar como notificado para não repetir para esta atividade (até que o alarme mude)
      await prisma.planilhaInstalacao.update({
        where: { id: atividadeId },
        data: { notificadoWhatsapp: true }
      });
    }
  } catch (error) {
    console.error("Erro no sistema de notificação WhatsApp:", error);
  }
}
