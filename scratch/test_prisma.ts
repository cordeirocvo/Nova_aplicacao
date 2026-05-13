import { PrismaClient } from '../prisma/generated-client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const charger = await prisma.carregador.findFirst();
    if (!charger) {
      console.log("No charger found to test with.");
      return;
    }

    console.log("Attempting to create project with charger ID:", charger.id);
    const project = await prisma.projetoDimensionamento.create({
      data: {
        projectName: "Test Project TSX",
        clientName: "TSX Client",
        distance: 10,
        installationMethod: "B1",
        chargerId: charger.id,
        calculatedCurrent: 32,
        calculatedCableGauge: 6,
        calculatedBreaker: 40,
        voltageDrop: 2,
        isServiceEntranceOk: true,
        fireExtinguisherType: "CO2 6kg",
        hasEmergencyButton5m: true,
        requiresWarningSigns: true,
        fireDeptStandards: "IT 41",
        abntStandards: "NBR 17019",
      }
    });
    console.log("SUCCESS: Project created with ID:", project.id);
  } catch (error) {
    console.error("ERROR CREATING PROJECT:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
