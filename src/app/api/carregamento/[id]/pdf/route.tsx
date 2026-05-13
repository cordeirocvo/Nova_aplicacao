import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { EVReportPDF } from '@/components/ev/EVReportPDF';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // Fetch project
    const project = await prisma.eVProject.findUnique({
      where: { id },
      include: {
        charger: true,
      }
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // Gerar o PDF como um stream
    const origin = new URL(request.url).origin;
    const logoUrl = `${origin}/logo.png`;

    const stream = await renderToStream(<EVReportPDF project={project} logoUrl={logoUrl} />);

    // Converter NodeJS stream para Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          controller.error(err);
        });
      }
    });

    // Retornar o PDF
    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Laudo_EV_${(project.projectName || "Projeto").replace(/[^a-z0-9]/gi, '_').toUpperCase()}.pdf"`,
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return new NextResponse("Error generating PDF", { status: 500 });
  }
}
