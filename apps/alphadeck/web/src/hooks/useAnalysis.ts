import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AnalysisResponse, Interval } from '@/types/analysis';

export const useAnalysis = (symbol: string, interval: Interval = '1d') =>
  useQuery<AnalysisResponse>({
    queryKey: ['analysis', symbol, interval],
    queryFn: async () => {
      const { data } = await api.get<AnalysisResponse>(
        `/analysis/${symbol}?interval=${interval}`,
      );
      return data;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
