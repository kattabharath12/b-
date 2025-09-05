'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTaxCalculationStream } from '@/hooks/useTaxCalculationStream';
import { TaxSummaryCard } from './TaxSummaryCard';
import { ProgressSteps } from './ProgressSteps';
import { DocumentUploadZone } from './DocumentUploadZone';
import { Loader2, RefreshCw, DollarSign, FileText, Calculator } from 'lucide-react';

interface TaxCalculationDashboardProps {
  initialSessionId?: string;
}

export function TaxCalculationDashboard({ initialSessionId }: TaxCalculationDashboardProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  const { session, isConnected, error, calculationResult, reconnect } = useTaxCalculationStream(sessionId);

  const createNewSession = async () => {
    setIsCreatingSession(true);
    try {
      const response = await fetch('/api/tax-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      
      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (err) {
      console.error('Error creating session:', err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'PROCESSING': return 'bg-blue-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!sessionId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Tax Calculation Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-6">
              Start a new tax calculation session to see real-time updates
            </p>
            <Button 
              onClick={createNewSession} 
              disabled={isCreatingSession}
              size="lg"
            >
              {isCreatingSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                'Start Tax Calculation'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Calculation Dashboard</h1>
          <p className="text-gray-600">Real-time tax calculation for 2024</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {session && (
            <Badge className={getStatusColor(session.status)}>
              {session.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={reconnect}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Overview */}
      {session && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Calculation Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">{session.completionProgress}%</span>
              </div>
              <Progress value={session.completionProgress} className="h-3" />
              <ProgressSteps session={session} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Summary Cards */}
      {(session || calculationResult) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TaxSummaryCard
            title="Total Income"
            amount={calculationResult?.totalIncome || session?.totalIncome || 0}
            icon={<DollarSign className="h-5 w-5" />}
            trend={session?.completionProgress > 25 ? 'calculated' : 'pending'}
          />
          <TaxSummaryCard
            title="Taxable Income"
            amount={calculationResult?.taxableIncome || session?.taxableIncome || 0}
            icon={<Calculator className="h-5 w-5" />}
            trend={session?.completionProgress > 50 ? 'calculated' : 'pending'}
          />
          <TaxSummaryCard
            title="Tax Owed"
            amount={calculationResult?.totalTaxOwed || session?.totalTaxOwed || 0}
            icon={<FileText className="h-5 w-5" />}
            trend={session?.completionProgress > 75 ? 'calculated' : 'pending'}
          />
          <TaxSummaryCard
            title="Refund/Owe"
            amount={calculationResult?.refundAmount || session?.refundAmount || 0}
            icon={<DollarSign className="h-5 w-5" />}
            trend={session?.completionProgress === 100 ? 'calculated' : 'pending'}
            isRefund={true}
          />
        </div>
      )}

      {/* Document Upload */}
      <DocumentUploadZone sessionId={sessionId} />

      {/* Detailed Results */}
      {calculationResult && session?.status === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Tax Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Income & Deductions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Income:</span>
                    <span className="font-medium">{formatCurrency(calculationResult.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deductions:</span>
                    <span className="font-medium">{formatCurrency(calculationResult.totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Taxable Income:</span>
                    <span className="font-medium">{formatCurrency(calculationResult.taxableIncome)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Tax Calculation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Federal Tax:</span>
                    <span className="font-medium">{formatCurrency(calculationResult.federalTaxOwed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State Tax:</span>
                    <span className="font-medium">{formatCurrency(calculationResult.stateTaxOwed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Effective Rate:</span>
                    <span className="font-medium">{calculationResult.effectiveRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">
                      {parseFloat(calculationResult.refundAmount) >= 0 ? 'Refund:' : 'Amount Owed:'}
                    </span>
                    <span className={`font-medium ${parseFloat(calculationResult.refundAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(parseFloat(calculationResult.refundAmount)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
