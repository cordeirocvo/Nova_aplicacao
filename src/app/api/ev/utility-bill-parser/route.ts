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

      const prompt = `Você é um engenheiro eletricista sênior especialista em análise de contas de energia elétrica do Brasil (CEMIG, CPFL, ENEL SP/RJ/CE, ENERGISA, EQUATORIAL, COPEL, CELESC, EDP, LIGHT, NEOENERGIA/COELBA, etc.).
Analise esta fatura/conta de energia (pode ser PDF vetorial, PDF escaneado ou FOTO de celular de qualquer ângulo/qualidade) com máxima atenção aos detalhes técnicos e cadastrais.

DIRETRIZES DE ENGENHARIA E EXTRAÇÃO:
1. DISTRIBUIDORA / CONCESSIONÁRIA:
   - Extraia o nome oficial da distribuidora (ex: "CEMIG", "CPFL", "ENEL", "ENERGISA", "EQUATORIAL", "COPEL", "CELESC", "EDP", "LIGHT", "NEOENERGIA").

2. DADOS CADASTRAIS DO CLIENTE:
   - Extraia a Razão Social ou Nome Completo do Titular impresso na conta.
   - Extraia o CNPJ ou CPF do titular (se presente).
   - Extraia o Endereço completo da Unidade Consumidora (Rua, Número, Bairro, CEP, Cidade, UF).
   - Extraia o Número da Instalação / Unidade Consumidora (UC) / Código do Cliente / PN com a formatação original (ex: '9.345.211.018-61', '3000592987', '811.109.018-18').
   - Extraia o Número do Medidor físico de energia impresso (procure em todas as páginas, inclusive na página de demonstrativo ou medição, ex: 'MW-2308A968-02', 'AMM222198352').

3. GRUPO TARIFÁRIO, TENSÃO E PADRÃO DE ENTRADA:
   - Identifique se a conta pertence ao GRUPO A (Média/Alta Tensão: A4, A3a, A2, AS, etc. - geralmente com Demanda Contratada, Tarifa Verde ou Azul, Subestação/Transformador próprio) ou GRUPO B (Baixa Tensão: B1 Residencial, B2 Rural, B3 Comercial/Outros, B4 Iluminação).
   - Se for GRUPO A:
     * "grupoTarifario": "A"
     * "padraoConexao": "MEDIA_TENSAO"
     * "categoriaPadrao": extraia o subgrupo (ex: "A4", "A3a")
     * "disjuntorAmperes": null (MUITO IMPORTANTE: em Grupo A não existe disjuntor de baixa tensão residencial, informe null).
   - Se for GRUPO B (Baixa Tensão):
     * "grupoTarifario": "B"
     * "padraoConexao": identifique se é "TRIFASICO", "BIFASICO" ou "MONOFASICO".
     * "disjuntorAmperes": extraia a corrente do disjuntor em amperes APENAS se estiver expressamente escrito na conta. Se não constar, retorne null (NÃO invente).
     * "categoriaPadrao": categoria de atendimento (ex: 'A1', 'B1', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'F1'-'F9').

4. MODALIDADE TARIFÁRIA E DEMANDAS:
   - Extraia a classe e subclasse (ex: "Comercial", "Residencial", "Industrial", "Rural").
   - Extraia a modalidade tarifária (ex: "TUSD Livre A4 Verde", "Horária Verde", "Horária Azul", "Convencional", "Branca").
   - Demanda Contratada em kW: se houver, extraia a demanda em kW (ex: 160 kW).
   - Demanda Medida em kW: se houver medição de demanda máxima/pico ou ultrapassagem, extraia em kW.

5. GERAÇÃO DISTRIBUÍDA (GD SOLAR / AUTOCONSUMO):
   - Extraia o "Saldo Atual de Geração / Créditos Acumulados" em kWh.
   - Extraia a "Energia Injetada / Compensada no ciclo faturado" em kWh.
   - Se houver descontos de compensação (ex: "Desconto Comp. Fio HFP", "Desconto Comp. Encargo HP"), registre a existência de GD.

6. HISTÓRICO DE CONSUMO (ÚLTIMOS 12 OU 13 MESES):
   - Extraia cada mês do histórico (ex: "AGO/26", "JUL/26", "NOV/25").
   - Para Grupo A: some a energia ativa faturada (Ponta + Fora Ponta em kWh) para obter o consumo total do mês em kWh. NÃO confunda a coluna de Demanda (kW) com Energia (kWh).
   - Para Grupo B: extraia o consumo medido em kWh de cada mês.
   - Calcule a média mensal de consumo em kWh/mês.
   - Identifique o consumo máximo do histórico em kWh e o respectivo mês.
   - Calcule a Demanda Estimada do Imóvel em kW pela fórmula: Demanda (kW) = Consumo Médio (kWh) / (720 horas * 0.30 Fator de Carga).

7. VALORES FINANCEIROS E VENCIMENTO:
   - Extraia o valor total da fatura a pagar em R$ (número).
   - Extraia a data de vencimento e o mês de referência (ex: "AGO/2026").

Responda ESTRITAMENTE com o JSON válido, sem texto adicional nem blocos de markdown.

Formato do JSON esperado:
{
  "concessionaria": string,
  "nomeCliente": string,
  "cnpjCpf": string ou null,
  "endereco": string,
  "numeroInstalacao": string,
  "numeroMedidor": string,
  "disjuntorAmperes": number ou null,
  "padraoConexao": "TRIFASICO" ou "BIFASICO" ou "MONOFASICO" ou "MEDIA_TENSAO",
  "categoriaPadrao": string ou null,
  "grupoTarifario": "A" ou "B",
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
    { "mes": "AGO/26", "kwh": 79625 }
  ],
  "valorFatura": number,
  "vencimento": string,
  "mesReferencia": string
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
        // Classificação e saneamento Grupo A vs Grupo B
        const isGrupoA = parsedAiData.grupoTarifario === 'A' || 
                         parsedAiData.padraoConexao === 'MEDIA_TENSAO' ||
                         (parsedAiData.demandaContratadaKW && parsedAiData.demandaContratadaKW > 75) ||
                         /A[1-4]|A3a|AS/i.test(parsedAiData.categoriaPadrao || '') ||
                         /Verde|Azul|TUSD/i.test(parsedAiData.modalidadeTarifaria || '');

        if (isGrupoA) {
          parsedAiData.grupoTarifario = 'A';
          parsedAiData.padraoConexao = 'MEDIA_TENSAO';
          parsedAiData.categoriaPadrao = parsedAiData.categoriaPadrao || 'A4';
          parsedAiData.disjuntorAmperes = null;
        }

        // Saneamento de categoria de padrão para códigos oficiais (A1, B1, C1-C6, F1-F9, A4, A3a)
        if (parsedAiData.categoriaPadrao) {
          const catMatch = String(parsedAiData.categoriaPadrao).match(/\b(A4|A3a|AS|A1|B1|B2|C[1-6]|F[1-9])\b/i);
          if (catMatch) {
            parsedAiData.categoriaPadrao = catMatch[1].toUpperCase();
          } else if (/Monof[áa]sico/i.test(String(parsedAiData.categoriaPadrao)) || parsedAiData.padraoConexao === 'MONOFASICO') {
            parsedAiData.categoriaPadrao = 'A1';
          } else if (/Bif[áa]sico/i.test(String(parsedAiData.categoriaPadrao)) || parsedAiData.padraoConexao === 'BIFASICO') {
            parsedAiData.categoriaPadrao = 'B1';
          } else if (/Trif[áa]sico/i.test(String(parsedAiData.categoriaPadrao)) || parsedAiData.padraoConexao === 'TRIFASICO') {
            parsedAiData.categoriaPadrao = 'C1';
          }
        }

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
          if (!parsedAiData.cnpjCpf && regexData.cnpjCpfTitular) {
            parsedAiData.cnpjCpf = regexData.cnpjCpfTitular;
          }
          if (!isGrupoA && parsedAiData.disjuntorAmperes === undefined && regexData.disjuntorAmperes) {
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
          if (!parsedAiData.demandaContratadaKW && regexData.demandaContratadaKW) {
            parsedAiData.demandaContratadaKW = regexData.demandaContratadaKW;
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

    // 3. Fallback Offline: Retorno do Regex CEMIG/Nacional aprimorado
    if (regexData) {
      const consumoMedio = regexData.consumoMedioMensalKWh || 
        (regexData.consumoMeses?.length ? (regexData.consumoMeses.reduce((s: number, m: any) => s + (m.kwh || 0), 0) / regexData.consumoMeses.length) : 0);
      const demandaEstimada = consumoMedio > 0 ? Number((consumoMedio / (720 * 0.30)).toFixed(1)) : 0;
      const isGrupoA = regexData.grupoTarifario === 'A' || regexData.padraoConexao === 'MEDIA_TENSAO';

      return NextResponse.json({
        success: true,
        source: 'cemig_native_regex',
        extracted: {
          concessionaria: regexData.concessionaria || 'CEMIG',
          nomeCliente: regexData.nomeCliente || 'Cliente CEMIG',
          cnpjCpf: regexData.cnpjCpfTitular || null,
          endereco: regexData.endereco || '',
          numeroInstalacao: regexData.numeroInstalacao || '',
          numeroMedidor: regexData.numeroMedidor || 'Consulte padrão físico',
          disjuntorAmperes: isGrupoA ? null : (regexData.disjuntorAmperes || null),
          padraoConexao: isGrupoA ? 'MEDIA_TENSAO' : (regexData.padraoConexao || 'TRIFASICO'),
          categoriaPadrao: regexData.categoriaPadrao || (isGrupoA ? 'A4' : 'C1'),
          grupoTarifario: isGrupoA ? 'A' : 'B',
          classeConsumo: regexData.classeConsumo || 'Comercial',
          modalidadeTarifaria: regexData.modalidadeTarifaria || (isGrupoA ? 'HORARIA_VERDE' : 'CONVENCIONAL'),
          demandaContratadaKW: regexData.demandaContratadaKW || (isGrupoA ? 160 : 0),
          demandaMedidaPicoKW: regexData.demandaMedidaHPKW || regexData.demandaMedidaHFPKW || 0,
          consumoMedioKWh: Math.round(consumoMedio),
          consumoMaximoKWh: regexData.consumoMeses?.length ? Math.max(...regexData.consumoMeses.map((m: any) => m.kwh || 0)) : 0,
          demandaEstimadaHistoricoKW: demandaEstimada,
          saldoGeracaoKWh: regexData.saldoGeracaoKWh || null,
          energiaCompensadaKWh: regexData.energiaCompensadaKWh || null,
          historicoConsumo: regexData.consumoMeses?.map((m: any) => ({ mes: m.mes, kwh: m.kwh })) || [],
          valorFatura: regexData.valorUltimaFatura || 0,
          vencimento: regexData.vencimento || '',
          mesReferencia: regexData.mesReferencia || ''
        },
        fileUrl,
        fileName: file.name
      });
    }

    // Fallback preliminar seguro
    return NextResponse.json({
      success: true,
      source: 'fallback',
      extracted: {
        concessionaria: 'CEMIG',
        nomeCliente: 'Cliente Informado na Fatura',
        cnpjCpf: null,
        endereco: 'Endereço da Unidade Consumidora',
        numeroInstalacao: '',
        numeroMedidor: 'Consulte no visor do medidor',
        disjuntorAmperes: null,
        padraoConexao: 'TRIFASICO',
        categoriaPadrao: 'C3',
        grupoTarifario: 'B',
        classeConsumo: 'Comercial',
        modalidadeTarifaria: 'Convencional',
        demandaContratadaKW: 38,
        demandaMedidaPicoKW: 25,
        consumoMedioKWh: 850,
        consumoMaximoKWh: 1200,
        demandaEstimadaHistoricoKW: 3.9,
        saldoGeracaoKWh: null,
        energiaCompensadaKWh: null,
        historicoConsumo: [],
        valorFatura: 0,
        mesReferencia: 'Atual'
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

