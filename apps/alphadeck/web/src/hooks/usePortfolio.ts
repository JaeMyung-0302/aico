import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface PortfolioItem {
  id: number;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
}

interface Portfolio {
  id: number;
  name: string;
  items: PortfolioItem[];
}

export const usePortfolios = () => {
  return useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data } = await api.get('/portfolios');
      return data;
    },
  });
};

export const useAddPortfolioItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      portfolioId,
      symbol,
      quantity,
      avgBuyPrice,
    }: {
      portfolioId: number;
      symbol: string;
      quantity: number;
      avgBuyPrice: number;
    }) => {
      const { data } = await api.post(`/portfolios/${portfolioId}/items`, {
        symbol: symbol.toUpperCase(),
        quantity,
        avgBuyPrice,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};

export const useRemovePortfolioItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      portfolioId,
      itemId,
    }: {
      portfolioId: number;
      itemId: number;
    }) => {
      await api.delete(`/portfolios/${portfolioId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};

export const useCreatePortfolio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/portfolios', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};
