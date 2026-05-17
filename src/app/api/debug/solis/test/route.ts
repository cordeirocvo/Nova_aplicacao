import { NextResponse } from "next/server";
import { SolisService } from "@/lib/services/solisService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  try {
    const data = await SolisService.getStationData(id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
