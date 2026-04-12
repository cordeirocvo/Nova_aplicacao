import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { atividades } = await req.json();

    if (!atividades || !Array.isArray(atividades)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
       return NextResponse.json({ error: "Gemini API Key missing" }, { status: 500 });
    }

    // Simplifiable data to not exceed token lengths easily:
    const dataToAI = atividades.map(a => ({
      id: a.id,
      cliente: a.instalacao,
      status: a.statusProtocolo || a.status,
      previsto: a.automaticoPrevInstala || a.dataPrevista,
      obs: a.obsInstalacao || a.observacao
    }));

    const prompt = `
    Você é o sistema de IA da Cordeiro Energia para priorização de tarefas/instalações. 
    Abaixo está uma matriz JSON de tarefas.
    Analise as datas previstas (a mais antiga/vencida tem maior prioridade), o status e a observação de cada uma para ordená-las da mais crítica para a menos crítica.
    Retorne apenas um array JSON contendo exclusivamente os "id" ordenados. Não adicione markdown nem explicação de texto fora do JSON.
    
    Tarefas:
    ${JSON.stringify(dataToAI)}
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );

    const textContent = response.data.candidates[0].content.parts[0].text;
    
    // Extract JSON safely
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { throw new Error("Gemini did not return an array."); }
    
    const prioritizedIds = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ prioritizedIds }, { status: 200 });

  } catch (error: any) {
    console.error("AI_PRIORITIZE_ERROR", error?.response?.data || error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
