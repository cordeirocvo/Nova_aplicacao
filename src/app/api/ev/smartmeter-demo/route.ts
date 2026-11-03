import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseUniversalLoadFile } from '@/lib/coenergygo';

export async function GET() {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'SmartMeter.xlsx'),
      path.join(process.cwd(), 'public', 'demo', 'SmartMeter.xlsx'),
      path.join(process.cwd(), 'src', 'data', 'SmartMeter.xlsx'),
    ];

    let filePath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'Arquivo SmartMeter.xlsx não encontrado no diretório do projeto.' },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filePath);
    const { summary, parsedResult } = parseUniversalLoadFile(buffer, 'SmartMeter.xlsx');

    return NextResponse.json({
      success: true,
      summary,
      parsedResult
    });
  } catch (err: any) {
    console.error('Erro na API SmartMeter Demo:', err);
    return NextResponse.json(
      { error: err.message || 'Falha ao processar arquivo SmartMeter.xlsx' },
      { status: 500 }
    );
  }
}
