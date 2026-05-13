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
    // Ensure inputs are valid numbers to avoid NaN
    const safePower = Number(charger.power) || 0;
    const safeVoltage = Number(hasTransformer ? transformerSecondaryVoltage : charger.voltage) || 220;
    const safeDistance = Number(hasTransformer ? (chargerDistance || distance) : distance) || 1;

    console.log("Starting sizing calculation with:", { safePower, safeVoltage, safeDistance });
    const result = calculateSizing({
      powerkW: safePower,
      voltage: safeVoltage,
      phases: (charger.phases as 1 | 3) || 1,
      distance: safeDistance,
      method: (installationMethod as 'B1' | 'C') || 'B1',
      hasTransformer,
      primaryVoltage: Number(transformerPrimaryVoltage) || 220,
      primaryDistance: Number(transformerDistance) || 10,
      groundingType
    });

    console.log("Sizing result:", result);

    // Salvar Projeto
    console.log("Creating project in database with data:", {
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
        fireExtinguisherType: data.fireExtinguisherType || result.fireExtinguisher,
        hasEmergencyButton5m: data.hasEmergencyButton5m !== undefined ? data.hasEmergencyButton5m : true,
        requiresWarningSigns: data.requiresWarningSigns !== undefined ? data.requiresWarningSigns : true,
        fireDeptStandards: "IT 41/2023 - CBMG",
        abntStandards: result.applicableStandards.join(", "),
        specificSafetyNotes: "Instalação exige sinalização visual e botão de emergência externo a 5 metros conforme norma de Bombeiros."
    });

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
        
        // Novos campos de segurança
        fireExtinguisherType: data.fireExtinguisherType || result.fireExtinguisher,
        hasEmergencyButton5m: data.hasEmergencyButton5m !== undefined ? data.hasEmergencyButton5m : true,
        requiresWarningSigns: data.requiresWarningSigns !== undefined ? data.requiresWarningSigns : true,
        fireDeptStandards: "IT 41/2023 - CBMG",
        abntStandards: result.applicableStandards.join(", "),
        specificSafetyNotes: "Instalação exige sinalização visual e botão de emergência externo a 5 metros conforme norma de Bombeiros."
      }
    });

    console.log("Project created successfully:", project.id);
    return NextResponse.json({ success: true, project, result });
  } catch (error: any) {
    console.error("CRITICAL ERROR in /api/ev/sizing:", error);
    return NextResponse.json({ 
      error: "Erro ao processar dimensionamento", 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function GET() {
  const projects = await prisma.projetoDimensionamento.findMany({
    include: { charger: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}
