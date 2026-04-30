import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSizing } from "@/lib/ev/sizingEngine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      projectName, 
      clientName, 
      utility, 
      entranceCategory, 
      distance, 
      installationMethod, 
      chargerId,
      hasTransformer,
      transformerPrimaryVoltage,
      transformerSecondaryVoltage,
      transformerDistance,
      chargerDistance,
      groundingType,
      analysisNotes
    } = data;

    console.log("POST /api/ev/sizing - Incoming data:", data);

    const charger = await prisma.carregador.findUnique({ where: { id: chargerId } });

    if (!charger) {
      console.error("Charger not found:", chargerId);
      return NextResponse.json({ error: "Carregador não encontrado" }, { status: 404 });
    }

    // Dimensionar
    console.log("Starting sizing calculation...");
    const result = calculateSizing({
      powerkW: charger.power,
      voltage: hasTransformer ? (transformerSecondaryVoltage || 380) : (charger.voltage),
      phases: charger.phases as 1 | 3,
      distance: hasTransformer ? (chargerDistance || distance) : distance,
      method: (installationMethod as 'B1' | 'C') || 'B1',
      hasTransformer,
      primaryVoltage: transformerPrimaryVoltage,
      primaryDistance: transformerDistance,
      groundingType
    });

    console.log("Sizing result:", result);

    // Salvar Projeto
    const project = await prisma.projetoDimensionamento.create({
      data: {
        projectName,
        clientName,
        utility: utility || "CEMIG",
        entranceCategory,
        distance: hasTransformer ? (chargerDistance || distance) : distance,
        installationMethod: installationMethod || "B1",
        chargerId,
        calculatedCurrent: result.current,
        calculatedCableGauge: result.cableGauge,
        calculatedBreaker: result.breaker,
        calculatedDR: result.idrType,
        // @ts-ignore
        calculatedIDR: result.idrType,
        calculatedDPS: result.dpsType,
        calculatedConduit: result.conduitSize,
        voltageDrop: result.voltageDrop,
        groundingAnalysis: result.groundingAnalysis,
        groundingType: groundingType || "TT",
        isServiceEntranceOk: true,
        analysisNotes: analysisNotes || "Dimensionamento realizado conforme NBR 5410/17019.",
        hasTransformer: hasTransformer || false,
        transformerPrimaryVoltage: transformerPrimaryVoltage || 220,
        transformerSecondaryVoltage: transformerSecondaryVoltage || 380,
        transformerDistance: transformerDistance || 10,
        chargerDistance: chargerDistance || 10,
        calculatedPrimaryCable: result.primary?.cableGauge,
        calculatedPrimaryBreaker: result.primary?.breaker,
        existingLoadKW: data.existingLoadKW || 0,
        simultaneityFactor: data.simultaneityFactor || 0.8,
        isCollective: data.isCollective || false,
        location: data.location || "urbano",
      }
    });

    console.log("Project created:", project.id);
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
