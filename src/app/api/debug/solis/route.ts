import { NextResponse } from "next/server";
import { SolisService } from "@/lib/services/solisService";

export async function GET() {
  try {
    const stations = await SolisService.listStations();
    return NextResponse.json({ stations });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao listar usinas Solis" }, { status: 500 });
  }
}
