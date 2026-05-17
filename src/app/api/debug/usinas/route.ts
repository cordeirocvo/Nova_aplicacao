import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const usinas = await prisma.usina.findMany();
    return new Response(JSON.stringify(usinas, null, 2), {
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
