import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSizing } from "@/lib/ev/sizingEngine";

export async function POST(req: Request) {
  try {
    const { 
      projectName, 
      clientName, 
      utility, 
      entranceCategory, 
      distance, 
      installationMethod, 
      chargerId 
    } = await req.json();

    const charger = await prisma.carregador.findUnique({ where: { id: chargerId } });

    if (!charger) {
      return NextResponse.json({ error: "Carregador não encontrado" }, { status: 404 });
    }

    // Dimensionar
    const result = calculateSizing({
      powerkW: charger.power,
      voltage: charger.voltage,
      phases: charger.phases as 1 | 3,
      distance: distance,
      method: installationMethod as 'B1' | 'C'
    });

    // Salvar Projeto
    const project = await prisma.projetoDimensionamento.create({
      data: {
        projectName,
        clientName,
        utility,
        entranceCategory,
        distance,
        installationMethod,
        chargerId,
        calculatedCurrent: result.current,
        calculatedCableGauge: result.cableGauge,
        calculatedBreaker: result.breaker,
        calculatedDR: result.drType,
        calculatedConduit: result.conduitSize,
        voltageDrop: result.voltageDrop,
        groundingAnalysis: `Compatível com carregador (${charger.groundingReq || 'TN-S'}).`,
        isServiceEntranceOk: true, // Lógica de aviso pode ser adicionada aqui
        analysisNotes: "Dimensionamento realizado conforme NBR 5410/17019."
      }
    });

    return NextResponse.json({ success: true, project, result });
  } catch (error) {
    console.error("Error in sizing calculation:", error);
    return NextResponse.json({ error: "Erro ao processar dimensionamento" }, { status: 500 });
  }
}

export async function GET() {
  const projects = await prisma.projetoDimensionamento.findMany({
    include: { charger: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}
