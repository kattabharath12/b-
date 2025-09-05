import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface TaxSummaryCardProps {
  title: string;
  amount: number | string;
  icon: React.ReactNode;
  trend: 'calculated' | 'pending';
  isRefund?: boolean;
}

export function TaxSummaryCard({ title, amount, icon, trend, isRefund = false }: TaxSummaryCardProps) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const getAmountColor = () => {
    if (trend === 'pending') return 'text-gray-400';
    if (isRefund) {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return num >= 0 ? 'text-green-600' : 'text-red-600';
    }
    return 'text-gray-900';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium text-gray-600">{title}</span>
          </div>
          <Badge variant={trend === 'calculated' ? 'default' : 'secondary'}>
            {trend === 'calculated' ? 'Ready' : 'Calculating'}
          </Badge>
        </div>
        <div className="mt-4">
          <div className={`text-2xl font-bold ${getAmountColor()}`}>
            {trend === 'pending' ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>--</span>
              </div>
            ) : (
              formatCurrency(amount)
            )}
          </div>
          {isRefund && trend === 'calculated' && (
            <p className="text-xs text-gray-500 mt-1">
              {parseFloat(amount.toString()) >= 0 ? 'You will receive a refund' : 'You owe additional tax'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
