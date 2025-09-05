import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Missing file or session ID' }, { status: 400 });
    }

    const taxSession = await prisma.taxCalculationSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    });

    if (!taxSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const document = await prisma.taxDocument.create({
      data: {
        sessionId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        processingStatus: 'UPLOADED'
      }
    });

    processDocumentAsync(document.id);

    return NextResponse.json({
      documentId: document.id,
      status: 'uploaded'
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

async function processDocumentAsync(documentId: string) {
  setTimeout(async () => {
    try {
      await prisma.taxDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: 'PROCESSING'
        }
      });

      setTimeout(async () => {
        await prisma.taxDocument.update({
          where: { id: documentId },
          data: {
            processingStatus: 'PROCESSED',
            processedAt: new Date(),
            extractedData: {
              income: 75000,
              withheld: 8500,
              deductions: 2500
            },
            taxRelevantData: {
              income: 75000,
              withheld: 8500
            }
          }
        });
      }, 5000);

    } catch (error) {
      console.error('Error processing document:', error);
      await prisma.taxDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: 'ERROR'
        }
      });
    }
  }, 1000);
}
