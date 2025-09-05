import { PrismaClient, TaxCalculationSession, TaxStepType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxCalculationResult {
  totalIncome: Decimal;
  totalDeductions: Decimal;
  taxableIncome: Decimal;
  federalTaxOwed: Decimal;
  stateTaxOwed: Decimal;
  totalTaxOwed: Decimal;
  refundAmount: Decimal;
  effectiveRate: number;
}

export class TaxCalculationService {
  private static readonly FEDERAL_TAX_BRACKETS_2024: TaxBracket[] = [
    { min: 0, max: 11000, rate: 0.10 },
    { min: 11000, max: 44725, rate: 0.12 },
    { min: 44725, max: 95375, rate: 0.22 },
    { min: 95375, max: 197050, rate: 0.24 },
    { min: 197050, max: 418850, rate: 0.32 },
    { min: 418850, max: 628300, rate: 0.35 },
    { min: 628300, max: null, rate: 0.37 }
  ];

  private static readonly STANDARD_DEDUCTION_2024 = 14600; // Single filer

  static async createSession(userId: string): Promise<TaxCalculationSession> {
    return await prisma.taxCalculationSession.create({
      data: {
        userId,
        taxYear: 2024,
        status: 'PENDING',
        completionProgress: 0
      }
    });
  }

  static async updateSessionProgress(
    sessionId: string, 
    progress: number, 
    stepType?: TaxStepType,
    stepDescription?: string,
    amount?: Decimal
  ): Promise<void> {
    await prisma.taxCalculationSession.update({
      where: { id: sessionId },
      data: {
        completionProgress: progress,
        updatedAt: new Date()
      }
    });

    if (stepType && stepDescription) {
      await prisma.taxCalculationStep.create({
        data: {
          sessionId,
          stepType,
          description: stepDescription,
          amount,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
    }
  }

  static calculateFederalTax(taxableIncome: number): number {
    let tax = 0;
    let remainingIncome = taxableIncome;

    for (const bracket of this.FEDERAL_TAX_BRACKETS_2024) {
      if (remainingIncome <= 0) break;

      const bracketMax = bracket.max || Infinity;
      const taxableInBracket = Math.min(remainingIncome, bracketMax - bracket.min);
      
      if (taxableInBracket > 0) {
        tax += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
      }
    }

    return Math.round(tax * 100) / 100;
  }

  static async performFullCalculation(sessionId: string): Promise<TaxCalculationResult> {
    const session = await prisma.taxCalculationSession.findUnique({
      where: { id: sessionId },
      include: { documents: true }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Step 1: Calculate total income
    await this.updateSessionProgress(sessionId, 25, 'INCOME_CALCULATION', 'Calculating total income');
    const totalIncome = await this.calculateTotalIncome(sessionId);

    // Step 2: Calculate deductions
    await this.updateSessionProgress(sessionId, 50, 'DEDUCTION_CALCULATION', 'Calculating deductions');
    const totalDeductions = await this.calculateTotalDeductions(sessionId);

    // Step 3: Calculate taxable income
    const taxableIncome = Math.max(0, totalIncome.toNumber() - totalDeductions.toNumber());
    
    // Step 4: Calculate taxes
    await this.updateSessionProgress(sessionId, 75, 'TAX_CALCULATION', 'Calculating tax liability');
    const federalTaxOwed = this.calculateFederalTax(taxableIncome);
    const stateTaxOwed = taxableIncome * 0.05; // Simplified state tax
    const totalTaxOwed = federalTaxOwed + stateTaxOwed;

    // Step 5: Calculate refund/owe amount
    await this.updateSessionProgress(sessionId, 90, 'REFUND_CALCULATION', 'Calculating refund amount');
    const withheldTax = await this.calculateWithheldTax(sessionId);
    const refundAmount = Math.max(0, withheldTax.toNumber() - totalTaxOwed);
    const amountOwed = Math.max(0, totalTaxOwed - withheldTax.toNumber());

    const result: TaxCalculationResult = {
      totalIncome: new Decimal(totalIncome),
      totalDeductions: new Decimal(totalDeductions),
      taxableIncome: new Decimal(taxableIncome),
      federalTaxOwed: new Decimal(federalTaxOwed),
      stateTaxOwed: new Decimal(stateTaxOwed),
      totalTaxOwed: new Decimal(totalTaxOwed),
      refundAmount: new Decimal(refundAmount > 0 ? refundAmount : -amountOwed),
      effectiveRate: taxableIncome > 0 ? (totalTaxOwed / taxableIncome) * 100 : 0
    };

    // Update session with final results
    await prisma.taxCalculationSession.update({
      where: { id: sessionId },
      data: {
        ...result,
        status: 'COMPLETED',
        completionProgress: 100,
        estimatedCompletion: new Date()
      }
    });

    await this.updateSessionProgress(sessionId, 100);

    return result;
  }

  private static async calculateTotalIncome(sessionId: string): Promise<Decimal> {
    // Simulate income calculation from processed documents
    const documents = await prisma.taxDocument.findMany({
      where: { sessionId, processingStatus: 'PROCESSED' }
    });

    let totalIncome = 0;
    for (const doc of documents) {
      if (doc.taxRelevantData) {
        const data = doc.taxRelevantData as any;
        totalIncome += data.income || 0;
      }
    }

    return new Decimal(totalIncome || 75000); // Default for demo
  }

  private static async calculateTotalDeductions(sessionId: string): Promise<Decimal> {
    // Use standard deduction for simplicity
    return new Decimal(this.STANDARD_DEDUCTION_2024);
  }

  private static async calculateWithheldTax(sessionId: string): Promise<Decimal> {
    // Simulate withheld tax calculation
    return new Decimal(8500); // Default for demo
  }
}
