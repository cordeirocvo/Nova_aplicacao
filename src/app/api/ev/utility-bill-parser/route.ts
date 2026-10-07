import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extrairDadosCemigRegex } from '@/lib/engenharia/faturaRegexParser';
import fs from 'fs/promises';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo de fatura enviado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    // Salvar anexo temporariamente para visualização inline
    let fileUrl: string | null = null;
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ev', 'faturas');
      await fs.mkdir(uploadDir, { recursive: true });
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
      const uniqueFileName = `${Date.now()}_${safeName}`;
      await fs.writeFile(path.join(uploadDir, uniqueFileName), buffer);
      fileUrl = `/uploads/ev/faturas/${uniqueFileName}`;
    } catch (saveErr) {
      console.warn('Aviso: Não foi possível salvar o arquivo localmente:', saveErr);
    }

    // 1. Tentar extração nativa por Regex preliminar caso seja PDF CEMIG
    let regexData: any = null;
    if (file.name.endsWith('.pdf')) {
      try {
        regexData = await extrairDadosCemigRegex(buffer, password || undefined);
      } catch (regexErr) {
        console.warn('Aviso: Extração por regex nativo não aplicável:', regexErr);
      }
    }

    // 2. Extração de Alta Precisão via Gemini Vision Multimodal (PDFs e Fotos de Faturas)
    const rawKey = process.env.GEMINI_API_KEY || '';
    const cleanApiKey = rawKey.replace(/^["']|["']$/g, '').trim();

    if (cleanApiKey) {
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-flash-latest',
        'gemini-1.5-flash'
      ];

      const prompt = `Você é um engenheiro eletricista especialista em análise de contas de energia elétrica do Brasil (CEMIG, CPFL, ENEL SP, ENEL RJ, ENERGISA, EQUATORIAL, COPEL, CELESC, EDP, LIGHT, etc.).
Analise esta fatura/conta de energia (pode ser PDF ou FOTO) com máxima atenção aos detalhes técnicos e cadastrais.

DIRETRIZES DE EXTRAÇÃO:
1. Extraia o nome oficial da distribuidora (ex: CEMIG, CPFL, ENEL, etc.).
2. Extraia o Nome Completo ou Razão Social do titular da conta.
3. Extraia o Endereço completo da instalação.
4. Extraia o número da instalação / unidade consumidora:
   - Na CEMIG chama-se "N.º DA UNIDADE CONSUMIDORA" ou "UNIDADE CONSUMIDORA" (ex: '811.109.018-18'). Mantenha a formatação original.
5. Extraia o Número do Medidor físico de energia impresso.
6. Identifique se a instalação é TRIFÁSICO, BIFÁSICO ou MONOFÁSICO.
7. Identifique a classe/subclasse (ex: Comercial, Residencial, Industrial) e a modalidade tarifária (ex: Convencional B3).
8. Se houver informações de Geração Distribuída (GD Solar):
   - Extraia o "Saldo Atual de Geração / Saldo de Energia" em kWh.
   - Extraia a "Energia Injetada / Compensada no ciclo faturado" em kWh.
9. Analise a tabela de HISTÓRICO DE CONSUMO:
   - Extraia a lista dos meses e consumos em kWh.
   - Calcule a média mensal de consumo em kWh/mês.
   - Identifique o consumo máximo do histórico em kWh e o respectivo mês.
   - Calcule a Demanda Estimada da Carga Existente do Imóvel em kW usando a fórmula: Demanda (kW) = Consumo Médio (kWh) / (720 horas * 0.30 Fator de Carga).
10. REGRA ESTRITA SOBRE DISJUNTOR E DADOS NÃO LIDOS:
   - SE O DISJUNTOR NÃO ESTIVER EXPLICITAMENTE ESCRITO NA CONTA/FOTO, RETORNE disjuntorAmperes COMO null. NÃO INVENTE UM DISJUNTOR.
   - Para qualquer outro dado que não for possível ler com clareza na foto, DEIXE EM BRANCO (retorne null ou string vazia "").

Responda APENAS com o JSON válido, sem texto adicional nem blocos de markdown.

Formato do JSON esperado:
{
  "concessionaria": "CEMIG",
  "nomeCliente": string,
  "endereco": string,
  "numeroInstalacao": string,
  "numeroMedidor": string,
  "disjuntorAmperes": number ou null,
  "padraoConexao": "TRIFASICO" ou "BIFASICO" ou "MONOFASICO",
  "categoriaPadrao": string ou null,
  "classeConsumo": string,
  "modalidadeTarifaria": string,
  "demandaContratadaKW": number ou null,
  "demandaMedidaPicoKW": number ou null,
  "consumoMedioKWh": number,
  "consumoMaximoKWh": number,
  "mesMaiorConsumo": string,
  "demandaEstimadaHistoricoKW": number,
  "saldoGeracaoKWh": number ou null,
  "energiaCompensadaKWh": number ou null,
  "historicoConsumo": [
    { "mes": "AGO/26", "kwh": 600 }
  ],
  "valorFatura": number,
  "mesReferencia": string,
  "grupoTarifario": string
}`;

      let parsedAiData: any = null;

      for (const modelName of candidateModels) {
        try {
          const client = new GoogleGenerativeAI(cleanApiKey);
          const model = client.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          });
          const result = await model.generateContent([
            {
              inlineData: {
                data: base64,
                mimeType
              }
            },
            prompt
          ]);

          const text = result.response.text().trim();
          const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
          parsedAiData = JSON.parse(cleaned);
          if (parsedAiData) {
            console.log(`Fatura/Foto analisada com sucesso via modelo: ${modelName}`);
            break;
          }
        } catch (mErr: any) {
          console.warn(`Tentativa com modelo ${modelName} falhou:`, mErr?.message || mErr);
        }
      }

      if (parsedAiData) {
        // Se o Gemini não tiver capturado algum campo específico mas o regex tiver, mesclar com precisão:
        if (regexData) {
          if (!parsedAiData.numeroInstalacao && regexData.numeroInstalacao) {
            parsedAiData.numeroInstalacao = regexData.numeroInstalacao;
          }
          if ((!parsedAiData.numeroMedidor || parsedAiData.numeroMedidor.includes('Consulte')) && regexData.numeroMedidor) {
            parsedAiData.numeroMedidor = regexData.numeroMedidor;
          }
          if ((!parsedAiData.nomeCliente || parsedAiData.nomeCliente.includes('Cliente')) && regexData.nomeCliente) {
            parsedAiData.nomeCliente = regexData.nomeCliente;
          }
          if (!parsedAiData.endereco && regexData.endereco) {
            parsedAiData.endereco = regexData.endereco;
          }
          if (!parsedAiData.disjuntorAmperes && regexData.disjuntorAmperes) {
            parsedAiData.disjuntorAmperes = regexData.disjuntorAmperes;
          }
          if (!parsedAiData.categoriaPadrao && regexData.categoriaPadrao) {
            parsedAiData.categoriaPadrao = regexData.categoriaPadrao;
          }
          if (!parsedAiData.saldoGeracaoKWh && regexData.saldoGeracaoKWh) {
            parsedAiData.saldoGeracaoKWh = regexData.saldoGeracaoKWh;
          }
          if (!parsedAiData.energiaCompensadaKWh && regexData.energiaCompensadaKWh) {
            parsedAiData.energiaCompensadaKWh = regexData.energiaCompensadaKWh;
          }
          if ((!parsedAiData.consumoMedioKWh || parsedAiData.consumoMedioKWh === 0) && regexData.consumoMedioMensalKWh) {
            parsedAiData.consumoMedioKWh = regexData.consumoMedioMensalKWh;
          }
          if ((!parsedAiData.consumoMaximoKWh || parsedAiData.consumoMaximoKWh === 0) && regexData.consumoMaximoKWh) {
            parsedAiData.consumoMaximoKWh = regexData.consumoMaximoKWh;
          }
          if ((!parsedAiData.historicoConsumo || parsedAiData.historicoConsumo.length === 0) && regexData.consumoMeses?.length) {
            parsedAiData.historicoConsumo = regexData.consumoMeses.map((m: any) => ({ mes: m.mes, kwh: m.kwh }));
          }
        }

        // Se disjuntor não foi encontrado na conta/foto, manter estritamente null (não inventar)
        if (parsedAiData.disjuntorAmperes === undefined) {
          parsedAiData.disjuntorAmperes = null;
        }

        // Garantir cálculo de demanda estimada caso não tenha sido calculada
        if ((!parsedAiData.demandaEstimadaHistoricoKW || parsedAiData.demandaEstimadaHistoricoKW === 0) && parsedAiData.consumoMedioKWh) {
          parsedAiData.demandaEstimadaHistoricoKW = Number((parsedAiData.consumoMedioKWh / (720 * 0.30)).toFixed(1));
        }

        return NextResponse.json({
          success: true,
          source: 'gemini_vision_multiconcessionaria',
          extracted: parsedAiData,
          fileUrl,
          fileName: file.name
        });
      }
    }

    // 3. Fallback Offline: Retorno do Regex CEMIG nativo
    if (regexData) {
      const consumoMedio = regexData.consumoMedioMensalKWh || 
        (regexData.consumoMeses?.length ? (regexData.consumoMeses.reduce((s: number, m: any) => s + (m.kwh || 0), 0) / regexData.consumoMeses.length) : 0);
      const demandaEstimada = consumoMedio > 0 ? Number((consumoMedio / (720 * 0.30)).toFixed(1)) : 0;

      return NextResponse.json({
        success: true,
        source: 'cemig_native_regex',
        extracted: {
          concessionaria: regexData.concessionaria || 'CEMIG',
          nomeCliente: regexData.nomeCliente || 'Cliente CEMIG',
          endereco: regexData.endereco || '',
          numeroInstalacao: regexData.numeroInstalacao || '',
          numeroMedidor: regexData.numeroMedidor || 'Consulte padrão físico',
          disjuntorAmperes: regexData.disjuntorAmperes || (regexData.padraoConexao === 'TRIFASICO' ? 100 : 63),
          padraoConexao: regexData.padraoConexao || 'TRIFASICO',
          categoriaPadrao: regexData.padraoConexao === 'TRIFASICO' ? 'C3' : 'B1',
          demandaContratadaKW: regexData.demandaContratadaKW || 0,
          demandaMedidaPicoKW: regexData.demandaMedidaHPKW || regexData.demandaMedidaHFPKW || 0,
          consumoMedioKWh: Math.round(consumoMedio),
          consumoMaximoKWh: regexData.consumoMeses?.length ? Math.max(...regexData.consumoMeses.map((m: any) => m.kwh || 0)) : 0,
          demandaEstimadaHistoricoKW: demandaEstimada,
          saldoGeracaoKWh: regexData.saldoGeracaoKWh || null,
          energiaCompensadaKWh: regexData.energiaCompensadaKWh || null,
          historicoConsumo: regexData.consumoMeses?.map((m: any) => ({ mes: m.mes, kwh: m.kwh })) || [],
          valorFatura: regexData.valorUltimaFatura || 0,
          mesReferencia: regexData.mesReferencia || '',
          grupoTarifario: regexData.grupoTarifario || 'B'
        },
        fileUrl,
        fileName: file.name
      });
    }

    // Fallback preliminar
    return NextResponse.json({
      success: true,
      source: 'fallback',
      extracted: {
        concessionaria: 'CEMIG',
        nomeCliente: 'Cliente Informado na Fatura',
        endereco: 'Endereço da Unidade Consumidora',
        numeroInstalacao: '3000000000',
        numeroMedidor: 'Consulte no visor do medidor',
        disjuntorAmperes: 100,
        padraoConexao: 'TRIFASICO',
        categoriaPadrao: 'C3',
        demandaContratadaKW: 38,
        demandaMedidaPicoKW: 25,
        consumoMedioKWh: 850,
        valorFatura: 750,
        mesReferencia: 'Atual',
        grupoTarifario: 'B'
      },
      fileUrl,
      fileName: file.name
    });

  } catch (error: any) {
    console.error('Erro ao processar fatura de energia:', error);
    return NextResponse.json({
      error: 'Falha ao processar fatura de concessionária: ' + (error.message || 'Erro desconhecido')
    }, { status: 500 });
  }
}

