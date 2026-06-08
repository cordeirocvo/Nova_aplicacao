import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndSendAlarm } from "@/lib/services/whatsappService";
import { appendHistory } from "@/lib/historyUtils";

// Helper function to recursively find a value by keys
function findValue(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  
  // Try direct keys first
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  
  // Try case-insensitive search
  const lowerKeys = keys.map(k => k.toLowerCase());
  for (const k of Object.keys(obj)) {
    if (lowerKeys.includes(k.toLowerCase())) {
      return obj[k];
    }
  }

  // Recurse into children
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
      const val = findValue(obj[k], keys);
      if (val !== undefined) return val;
    }
  }
  return undefined;
}

// Helper to extract products (inverters and modules)
function extractProducts(payload: any) {
  const products: any[] = findValue(payload, ["produtos", "items", "produtos_venda", "equipamentos"]) || [];
  let inversor = "";
  let modulo = "";
  let numMod = "";

  if (Array.isArray(products)) {
    for (const item of products) {
      const name = (item.nome || item.name || item.descricao || item.description || "").toLowerCase();
      const qty = item.quantidade || item.quantity || item.qtd || "";
      
      // Inverter detection
      if (name.includes("inversor") || name.includes("inverter") || name.includes("microinversor")) {
        inversor = item.nome || item.name || item.descricao || item.description;
      }
      // Panel/Module detection
      else if (name.includes("modulo") || name.includes("módulo") || name.includes("painel") || name.includes("placa") || name.includes("jinko") || name.includes("canadian") || name.includes("longi") || name.includes("trina")) {
        modulo = item.nome || item.name || item.descricao || item.description;
        numMod = qty.toString();
      }
    }
  }

  // Fallbacks if not found in list but present as direct fields
  if (!inversor) {
    inversor = findValue(payload, ["inversor", "inversor_modelo", "modelo_inversor"]) || "";
  }
  if (!modulo) {
    modulo = findValue(payload, ["modulo", "modulo_modelo", "modelo_modulo", "placas", "painel"]) || "";
  }
  if (!numMod) {
    const qtyVal = findValue(payload, ["numMod", "quantidade_modulos", "num_modulos", "qtd_modulos", "quantidade_paineis"]);
    numMod = qtyVal ? qtyVal.toString() : "";
  }

  return { inversor, modulo, numMod };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("GRONNER_WEBHOOK_RECEIVED:", JSON.stringify(body, null, 2));

    if (!prisma) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    // Extract Sale ID/Code
    const rawId = findValue(body, ["id", "codigo", "code", "id_venda", "venda_id"]);
    if (!rawId) {
      return NextResponse.json({ error: "Missing sale identification (id or codigo)" }, { status: 400 });
    }

    const saleId = rawId.toString();
    const idInterno = `GRONNER-${saleId}`;

    // Extract Customer Info
    // Let's first search in a nested "cliente" or "customer" object if it exists to avoid mixing with seller info
    const customerObj = findValue(body, ["cliente", "customer", "client"]);
    let clientName = "";
    let clientPhone = "";
    let city = "";
    let neighborhood = "";
    let street = "";
    let number = "";

    if (customerObj && typeof customerObj === "object") {
      clientName = findValue(customerObj, ["nome", "name", "razao_social"]);
      clientPhone = findValue(customerObj, ["telefone", "phone", "celular", "whatsapp"]);
      
      const addrObj = findValue(customerObj, ["endereco", "address"]);
      if (addrObj && typeof addrObj === "object") {
        city = findValue(addrObj, ["cidade", "city"]);
        neighborhood = findValue(addrObj, ["bairro", "neighborhood"]);
        street = findValue(addrObj, ["rua", "street", "logradouro"]);
        number = findValue(addrObj, ["numero", "number"]);
      } else {
        city = findValue(customerObj, ["cidade", "city", "endereco_cidade"]);
        neighborhood = findValue(customerObj, ["bairro", "neighborhood", "endereco_bairro"]);
        street = findValue(customerObj, ["rua", "street", "logradouro", "endereco_rua"]);
        number = findValue(customerObj, ["numero", "number", "endereco_numero"]);
      }
    } else {
      // Fallback search globally
      clientName = findValue(body, ["cliente_nome", "nome_cliente", "cliente", "name", "nome"]);
      clientPhone = findValue(body, ["cliente_telefone", "telefone", "phone", "celular"]);
      city = findValue(body, ["cidade", "endereco_cidade", "city"]);
      neighborhood = findValue(body, ["bairro", "endereco_bairro", "neighborhood"]);
      street = findValue(body, ["rua", "endereco_rua", "street"]);
      number = findValue(body, ["numero", "endereco_numero", "number"]);
    }

    // Extract Seller Info
    const sellerObj = findValue(body, ["vendedor", "seller"]);
    let sellerName = "";
    let sellerPhone = "";
    if (sellerObj && typeof sellerObj === "object") {
      sellerName = findValue(sellerObj, ["nome", "name"]);
      sellerPhone = findValue(sellerObj, ["telefone", "phone", "celular"]);
    } else {
      sellerName = findValue(body, ["vendedor_nome", "vendedor", "seller"]);
      sellerPhone = findValue(body, ["vendedor_telefone", "telefone_vendedor"]);
    }

    // Extract Products
    const { inversor, modulo, numMod } = extractProducts(body);

    // Other fields
    const dataVenda = findValue(body, ["data_venda", "dataVenda", "data", "sale_date", "created_at"]) || "";
    const obsValue = findValue(body, ["observacoes", "observacao", "obs", "notes", "description"]) || "";
    const status = findValue(body, ["status", "status_venda", "etapa"]) || "Pendente";
    const telhado = findValue(body, ["telhado", "tipo_telhado", "roof"]) || "";

    // Upsert into PlanilhaInstalacao
    // We set manualInstalacao: true so it stays isolated from production lists
    const updated = await prisma.planilhaInstalacao.upsert({
      where: { idInterno: idInterno },
      update: {
        instalacao: clientName || undefined,
        obsInstalacao: obsValue || undefined,
        dataVenda: dataVenda || undefined,
        inversor: inversor || undefined,
        numMod: numMod || undefined,
        modulo: modulo || undefined,
        cidadeSheet: city || undefined,
        bairro: neighborhood || undefined,
        rua: street || undefined,
        numRua: number?.toString() || undefined,
        telhado: telhado || undefined,
        telefoneSheet: clientPhone || undefined,
        vendedorSheet: sellerName || undefined,
        observacao: obsValue || undefined,
        status: status || undefined,
        vendedor: sellerName || undefined,
        telefoneCliente: clientPhone || undefined,
        cidade: city || undefined,
        telefoneVendedor: sellerPhone || undefined,
      },
      create: {
        idInterno: idInterno,
        instalacao: clientName || "Cliente Webhook Teste",
        obsInstalacao: obsValue || "",
        dataVenda: dataVenda || "",
        inversor: inversor || "",
        numMod: numMod || "",
        modulo: modulo || "",
        cidadeSheet: city || "",
        bairro: neighborhood || "",
        rua: street || "",
        numRua: number?.toString() || "",
        telhado: telhado || "",
        telefoneSheet: clientPhone || "",
        vendedorSheet: sellerName || "",
        observacao: obsValue || "",
        status: status || "Pendente",
        vendedor: sellerName || "",
        telefoneCliente: clientPhone || "",
        cidade: city || "",
        telefoneVendedor: sellerPhone || "",
        manualInstalacao: true, // Crucial: hides from the production dashboard
        dataSolicitacao: new Date(),
      },
    });

    // Send Whatsapp alert if needed (non-blocking)
    try {
      await checkAndSendAlarm(updated.id);
    } catch (alarmError) {
      console.error("ALARM_TRIGGER_ERROR:", alarmError);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed and saved as test record successfully",
      record: updated,
    });
  } catch (error: any) {
    console.error("GRONNER_WEBHOOK_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
