import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, endpointUrl } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Token não fornecido" }, { status: 400 });
    }

    // Default to a typical Gronner API endpoint if none supplied
    const targetUrl = endpointUrl || "https://api.groner.app/api/v1/sales";
    console.log(`Connecting to Gronner API: ${targetUrl} with token`);

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        // Set a short timeout
        signal: AbortSignal.timeout(6000)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: targetUrl,
        payload: data
      });
    } catch (fetchError: any) {
      console.error("API FETCH ERROR:", fetchError);
      return NextResponse.json({
        success: false,
        error: `Falha na requisição: ${fetchError.message || fetchError}`,
        url: targetUrl
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
