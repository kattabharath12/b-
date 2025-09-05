import React from 'react';
import { TaxCalculationSession, TaxCalculationStep } from '@prisma/client';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ProgressStepsProps {
  session: TaxCalculationSession & {
    calculations?: TaxCalculationStep[];
  };
}

export function ProgressSteps({ session }: ProgressStepsProps) {
  const steps = [
    { name: 'Document Processing', progress: 25, type: 'DOCUMENT_PROCESSING' },
    { name: 'Income Calculation', progress: 50, type: 'INCOME_CALCULATION' },
    { name: 'Tax Calculation', progress: 75, type: 'TAX_CALCULATION' },
    { name: 'Final Review', progress: 100, type: 'REFUND_CALCULATION' }
  ];

  const getStepStatus = (stepProgress: number) => {
    if (session.completionProgress >= stepProgress) return 'completed';
    if (session.completionProgress >= stepProgress - 25) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const status = getStepStatus(step.progress);
        const relatedCalculation = session.calculations?.find(calc => calc.stepType === step.type);
        
        return (
          <div key={step.name} className="flex items-center gap-3">
            {getStepIcon(status)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  status === 'completed' ? 'text-green-700' : 
                  status === 'current' ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
                {relatedCalculation && (
                  <span className="text-xs text-gray-500">
                    {relatedCalculation.processedAt?.toLocaleTimeString()}
                  </span>
                )}
              </div>
              {relatedCalculation?.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {relatedCalculation.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
