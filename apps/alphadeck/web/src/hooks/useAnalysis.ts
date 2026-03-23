import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AnalysisResponse } from '@/types/analysis';

export const useAnalysis = (symbol: string) =>
  useQuery<AnalysisResponse>({
    queryKey: ['analysis', symbol],
    queryFn: async () => {
      const { data } = await api.get<AnalysisResponse>(`/analysis/${symbol}`);
      return data;
    },
    enabled: !!symbol,
  });
