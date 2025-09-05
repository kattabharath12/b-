import { useEffect, useState, useCallback } from 'react';
import { TaxCalculationSession } from '@prisma/client';

export interface StreamEvent {
  type: 'initial' | 'progress_update' | 'calculation_complete' | 'complete' | 'error';
  session?: TaxCalculationSession;
  result?: any;
  error?: string;
  timestamp: string;
}

export function useTaxCalculationStream(sessionId: string | null) {
  const [session, setSession] = useState<TaxCalculationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/tax-calculation/stream/${sessionId}`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        
        switch (data.type) {
          case 'initial':
          case 'progress_update':
            if (data.session) {
              setSession(data.session);
            }
            break;
          case 'calculation_complete':
            if (data.result) {
              setCalculationResult(data.result);
            }
            break;
          case 'error':
            setError(data.error || 'Unknown error occurred');
            break;
          case 'complete':
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connection lost. Attempting to reconnect...');
      eventSource.close();
      
      setTimeout(() => {
        if (sessionId) {
          connect();
        }
      }, 3000);
    };

    return eventSource;
  }, [sessionId]);

  useEffect(() => {
    const eventSource = connect();
    
    return () => {
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
      }
    };
  }, [connect]);

  return {
    session,
    isConnected,
    error,
    calculationResult,
    reconnect: connect
  };
}
