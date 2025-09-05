import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TaxCalculationService } from '@/lib/services/taxCalculationService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const taxSession = await TaxCalculationService.createSession(session.user.id);
    
    return NextResponse.json({
      sessionId: taxSession.id,
      status: taxSession.status,
      progress: taxSession.completionProgress
    });
  } catch (error) {
    console.error('Error creating tax calculation session:', error);
    return NextResponse.json(
      { error: 'Failed to create calculation session' },
      { status: 500 }
    );
  }
}
