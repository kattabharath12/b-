import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = params;

  try {
    const taxSession = await prisma.taxCalculationSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        calculations: {
          orderBy: { createdAt: 'desc' }
        },
        documents: true
      }
    });

    if (!taxSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(taxSession);
  } catch (error) {
    console.error('Error fetching tax calculation session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
