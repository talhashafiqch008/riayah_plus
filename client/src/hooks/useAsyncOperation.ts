
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AsyncOperationState {
  status: 'processing' | 'completed' | 'failed';
  data?: any;
  error?: string;
}

export function useAsyncOperation(
  operationId: string | null,
  pollUrl: string | null,
  interval = 5000,
  maxRetries = 12
) {
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<AsyncOperationState>({
    status: 'processing',
  });

  const { data, error, isLoading } = useQuery({
    queryKey: ['async-op', operationId],
    queryFn: async () => {
      if (!pollUrl) return null;
      const response = await fetch(pollUrl);
      if (!response.ok) throw new Error('Failed to check status');
      return response.json();
    },
    refetchInterval: interval,
    enabled: !!pollUrl && retryCount < maxRetries,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      if (data.status === 'completed' || data.status === 'succeeded') {
        setState({ status: 'completed', data });
      } else if (data.status === 'failed') {
        setState({ status: 'failed', error: data.message || 'Operation failed' });
      } else {
        setRetryCount((prev) => prev + 1);
      }
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      setState({ status: 'failed', error: error.message || 'Failed to check status' });
    }
  }, [error]);

  return {
    ...state,
    isLoading: isLoading || state.status === 'processing',
    retryCount,
  };
}
