import { NextResponse } from "next/server";
import { SolarSyncService } from "@/lib/services/solarSyncService";

export async function GET() {
  try {
    await SolarSyncService.syncAllPlants();
    return NextResponse.json({ success: true, message: "Sincronização disparada" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
