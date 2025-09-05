import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { TaxCalculationService } from '@/lib/services/taxCalculationService';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { sessionId } = params;

  const taxSession = await prisma.taxCalculationSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id
    }
  });

  if (!taxSession) {
    return new Response('Session not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendUpdate({
        type: 'initial',
        session: taxSession,
        timestamp: new Date().toISOString()
      });

      try {
        const result = await TaxCalculationService.performFullCalculation(sessionId);
        
        sendUpdate({
          type: 'calculation_complete',
          result,
          timestamp: new Date().toISOString()
        });

        sendUpdate({
          type: 'complete',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        sendUpdate({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }

      const progressInterval = setInterval(async () => {
        try {
          const updatedSession = await prisma.taxCalculationSession.findUnique({
            where: { id: sessionId },
            include: {
              calculations: {
                orderBy: { createdAt: 'desc' },
                take: 5
              }
            }
          });

          if (updatedSession) {
            sendUpdate({
              type: 'progress_update',
              session: updatedSession,
              timestamp: new Date().toISOString()
            });

            if (updatedSession.status === 'COMPLETED' || updatedSession.status === 'ERROR') {
              clearInterval(progressInterval);
              controller.close();
            }
          }
        } catch (error) {
          console.error('Error sending progress update:', error);
        }
      }, 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(progressInterval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none'
    }
  });
}
