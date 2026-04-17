import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { classificarTarifaria, identificarBandeira } from '@/lib/engenharia/tarifaParser';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projetoId = formData.get('projetoId') as string;

    if (!file || !projetoId) {
      return NextResponse.json({ error: 'Arquivo e projetoId são obrigatórios.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // ── Extração via Gemini Vision ─────────────────────────────────────────
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um especialista em análise de faturas de energia elétrica brasileiras.
Analise esta fatura e extraia TODOS os dados possíveis no formato JSON exato abaixo.
Se algum campo não estiver disponível na fatura, retorne null para ele.

{
  "concessionaria": "nome da distribuidora (ex: CEMIG-D, CPFL, CELESC)",
  "nomeCliente": "nome completo do titular da conta",
  "endereco": "endereço completo do imóvel da instalação",
  "numeroInstalacao": "número da instalação/UC",
  "cnpjCpfTitular": "cpf ou cnpj do titular",
  "grupoTarifario": "A ou B",
  "subgrupo": "ex: A4, B3, B1, AS",
  "modalidadeTarifaria": "CONVENCIONAL ou AZUL ou VERDE ou BRANCA",
  "classeConsumo": "Residencial | Comercial | Industrial | Rural | Iluminação Pública",
  "padraoConexao": "MONOFASICO | BIFASICO | TRIFASICO",
  "tensaoFornecimento": "tensão em kV ou 'baixa tensão'",
  "demandaContratadaKW": número,
  "demandaMedidaHPKW": número,
  "demandaMedidaHFPKW": número (procure por 'Demanda Ativa HFP'),
  "energiaAtivaHRKWh": número (procure por 'Energia Ativa HR'),
  "descontoIrrigante": número (procure por 'Desconto Irrigante Noturno'),
  "vencimento": "DD/MM/YYYY",
  "mesReferencia": "MMM/YYYY",
  "consumoMeses": [
    {"mes": "MM/YYYY", "kwh": número, "injetadoKWh": número ou 0, "bandeira": "Verde|Amarela|Vermelha 1|Vermelha 2"}
  ],
  "valorUltimaFatura": número em reais,
  "bandeiraTarifaria": "Verde|Amarela|Vermelha 1|Vermelha 2",
  "tusd": número em R$/kWh,
  "te": número em R$/kWh,
  "tarifaHP": número em R$/kWh,
  "tarifaHFP": número em R$/kWh,
  "tarifaDemandaHP": número em R$/kW,
  "tarifaDemandaHFP": número em R$/kW,
  "temGeracao": true ou false,
  "geracaoTipos": "ex: Solar fotovoltaico",
  "geracaoInjetadaKWh": número ou 0
}

IMPORTANTE PARA CEMIG: O histórico de consumo geralmente fica em uma tabela ou grid com meses abreviados (JAN, FEV, MAR...). Capture os últimos 12 meses.
O endereço e nome do cliente geralmente ficam no topo da primeira página.
Capture as tarifas TUSD e TE discriminadas se disponíveis.

Retorne APENAS o JSON, sem texto adicional.`;

    let extracted: any = {};
    try {
      const result = await model.generateContent([
        { inlineData: { mimeType: file.type as any || 'application/pdf', data: base64 } },
        prompt,
      ]);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Formato de resposta inválido da IA.");
      }
    } catch (e: any) {
      console.error('Gemini extração falhou:', e);
      if (e?.status === 429 || e?.message?.includes('429')) {
        return NextResponse.json({ error: 'Limite de requisições do Google atingido. Por favor, aguarde cerca de 1 a 2 minutos e tente novamente.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'A IA não conseguiu ler esta fatura. Verifique a qualidade do PDF.' }, { status: 500 });
    }

    // ── Classificação tarifária automática ─────────────────────────────────
    const classificacao = classificarTarifaria({
      tensaoFornecimento: extracted.tensaoFornecimento,
      demandaContratadaKW: extracted.demandaContratadaKW,
      consumoMensalKWh: extracted.consumoMeses?.[0]?.kwh,
      subgrupoTexto: extracted.subgrupo,
      modalidadeTexto: extracted.modalidadeTarifaria,
      classeTexto: extracted.classeConsumo,
    });

    // Merge com classificação automática (dados da IA têm prioridade)
    const grupoFinal = extracted.grupoTarifario || classificacao.grupoTarifario;
    const subgrupoFinal = extracted.subgrupo || classificacao.subgrupo;
    const modalidadeFinal = extracted.modalidadeTarifaria || classificacao.modalidade;
    const classeFinal = extracted.classeConsumo || classificacao.classeConsumo;

    // Calcular consumo médio
    const consumoMeses: any[] = extracted.consumoMeses || [];
    const consumoMedioMensalKWh = consumoMeses.length > 0
      ? consumoMeses.reduce((s: number, m: any) => s + (m.kwh || 0), 0) / consumoMeses.length
      : null;
    const consumoTotalAnualKWh = consumoMeses.reduce((s: number, m: any) => s + (m.kwh || 0), 0) || null;

    // Detectar GD
    const temGeracao = extracted.temGeracao === true ||
      consumoMeses.some((m: any) => (m.injetadoKWh || 0) > 0);
    const geracaoInjetadaKWh = consumoMeses.reduce((s: number, m: any) => s + (m.injetadoKWh || 0), 0) || null;

    // Bandeira
    const bandeira = extracted.bandeiraTarifaria ||
      identificarBandeira(String(extracted.bandeiraTarifaria || '')) ||
      (consumoMeses[0]?.bandeira) || null;

    // ── Salvar no banco ─────────────────────────────────────────────────────
    const analise = await (prisma as any).analiseFatura.upsert({
      where: { projetoId },
      create: {
        projetoId,
        nomeCliente: extracted.nomeCliente || null,
        endereco: extracted.endereco || null,
        concessionaria: extracted.concessionaria || null,
        numeroInstalacao: extracted.numeroInstalacao || null,
        cnpjCpfTitular: extracted.cnpjCpfTitular || null,
        vencimento: extracted.vencimento || null,
        mesReferencia: extracted.mesReferencia || null,
        grupoTarifario: grupoFinal,
        subgrupo: subgrupoFinal,
        modalidadeTarifaria: modalidadeFinal,
        classeConsumo: classeFinal,
        consumoMeses: consumoMeses.length > 0 ? consumoMeses : undefined,
        consumoMedioMensalKWh,
        consumoTotalAnualKWh,
        demandaContratadaKW: extracted.demandaContratadaKW || null,
        demandaMedidaHPKW: extracted.demandaMedidaHPKW || null,
        demandaMedidaHFPKW: extracted.demandaMedidaHFPKW || null,
        energiaAtivaHRKWh: extracted.energiaAtivaHRKWh || null,
        descontoIrrigante: extracted.descontoIrrigante || null,
        temGeracao,
        geracaoTipos: extracted.geracaoTipos || null,
        geracaoInjetadaKWh,
        tusd: extracted.tusd || null,
        te: extracted.te || null,
        tarifaHP: extracted.tarifaHP || null,
        tarifaHFP: extracted.tarifaHFP || null,
        tarifaDemandaHP: extracted.tarifaDemandaHP || null,
        tarifaDemandaHFP: extracted.tarifaDemandaHFP || null,
        valorUltimaFatura: extracted.valorUltimaFatura || null,
        bandeiraTarifaria: bandeira,
        extraidoPorIA: true,
      },
      update: {
        nomeCliente: extracted.nomeCliente || undefined,
        endereco: extracted.endereco || undefined,
        concessionaria: extracted.concessionaria || undefined,
        numeroInstalacao: extracted.numeroInstalacao || undefined,
        vencimento: extracted.vencimento || undefined,
        mesReferencia: extracted.mesReferencia || undefined,
        grupoTarifario: grupoFinal,
        subgrupo: subgrupoFinal,
        padraoConexao: extracted.padraoConexao || undefined,
        consumoMeses: consumoMeses.length > 0 ? consumoMeses : undefined,
        consumoMedioMensalKWh: consumoMedioMensalKWh ?? undefined,
        consumoTotalAnualKWh: consumoTotalAnualKWh ?? undefined,
        demandaContratadaKW: extracted.demandaContratadaKW || undefined,
        energiaAtivaHRKWh: extracted.energiaAtivaHRKWh || undefined,
        descontoIrrigante: extracted.descontoIrrigante || undefined,
        temGeracao,
        geracaoInjetadaKWh: geracaoInjetadaKWh ?? undefined,
        tusd: extracted.tusd || undefined,
        te: extracted.te || undefined,
        te: extracted.te || undefined,
        tarifaHP: extracted.tarifaHP || undefined,
        tarifaHFP: extracted.tarifaHFP || undefined,
        valorUltimaFatura: extracted.valorUltimaFatura || undefined,
        bandeiraTarifaria: bandeira || undefined,
        extraidoPorIA: true,
      },
    });

    return NextResponse.json({
      success: true,
      analise,
      classificacao,
      extraido: extracted,
    });
  } catch (error: any) {
    console.error('Erro na análise de fatura:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao processar fatura' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projetoId = searchParams.get('projetoId');
  if (!projetoId) return NextResponse.json({ error: 'projetoId required' }, { status: 400 });

  const analise = await (prisma as any).analiseFatura.findUnique({ where: { projetoId } });
  return NextResponse.json(analise);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { projetoId, ...rawData } = body;
    if (!projetoId) return NextResponse.json({ error: 'projetoId required' }, { status: 400 });

    // Processar cálculos se houver consumoMeses
    let consumoTotalAnualKWh = 0;
    let consumoMedioMensalKWh = 0;
    let temGeracao = false;

    if (rawData.consumoMeses && Array.isArray(rawData.consumoMeses)) {
      consumoTotalAnualKWh = rawData.consumoMeses.reduce((acc: number, m: any) => acc + (Number(m.kwh) || 0), 0);
      consumoMedioMensalKWh = rawData.consumoMeses.length > 0 ? consumoTotalAnualKWh / rawData.consumoMeses.length : 0;
      temGeracao = rawData.consumoMeses.some((m: any) => (Number(m.injetadoKWh) || 0) > 0);
    }

    // Mapeamento explícito para evitar erro de campos desconhecidos se o Prisma Client estiver dessincronizado
    const mappedData: any = {
      concessionaria: rawData.concessionaria,
      grupoTarifario: rawData.grupoTarifario,
      subgrupo: rawData.subgrupo,
      modalidadeTarifaria: rawData.modalidadeTarifaria,
      classeConsumo: rawData.classeConsumo,
      padraoConexao: rawData.padraoConexao,
      consumoMeses: rawData.consumoMeses,
      consumoMedioMensalKWh: consumoMedioMensalKWh,
      consumoTotalAnualKWh: consumoTotalAnualKWh,
      energiaAtivaHRKWh: Number(rawData.energiaAtivaHRKWh) || 0,
      descontoIrrigante: Number(rawData.descontoIrrigante) || 0,
      demandaContratadaKW: Number(rawData.demandaContratadaKW) || 0,
      tusd: Number(rawData.tusd) || 0,
      te: Number(rawData.te) || 0,
      temGeracao: temGeracao,
      // Campos de identificação (opcionais)
      numeroInstalacao: rawData.numeroInstalacao,
      cnpjCpfTitular: rawData.cnpjCpfTitular,
      vencimento: rawData.vencimento,
      mesReferencia: rawData.mesReferencia,
    };

    // Remover campos undefined para não sobrescrever com null se não desejado
    Object.keys(mappedData).forEach(key => mappedData[key] === undefined && delete mappedData[key]);

    console.log('TENTANDO UPSERT COM CAMPOS:', Object.keys(mappedData));

    const analise = await (prisma as any).analiseFatura.upsert({
      where: { projetoId },
      create: { projetoId, ...mappedData },
      update: mappedData,
    });
    
    console.log('SALVAMENTO CONCLUÍDO COM SUCESSO:', analise.id);
    return NextResponse.json(analise);
  } catch (error: any) {
    console.error('ERRO CRÍTICO NO PATCH FATURA:', error);
    return NextResponse.json({ 
      error: error?.message || 'Erro interno ao salvar fatura',
      details: error?.meta // Detalhes do Prisma (ex: campos desconhecidos)
    }, { status: 500 });
  }
}
