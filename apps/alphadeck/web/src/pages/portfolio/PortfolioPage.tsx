import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import styles from './PortfolioPage.module.scss';

const PortfolioPage = () => {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data } = await api.get('/portfolios');
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async (portfolioId: number) => {
      await api.post(`/portfolios/${portfolioId}/items`, {
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(quantity),
        avgBuyPrice: parseFloat(avgPrice),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setSymbol('');
      setQuantity('');
      setAvgPrice('');
    },
  });

  if (isLoading) return <div>로딩 중...</div>;

  const portfolio = portfolios?.[0];

  return (
    <div className={styles.page}>
      <h1>포트폴리오</h1>

      {portfolio && (
        <>
          <div className={styles.items}>
            {portfolio.items?.map((item: any) => (
              <div key={item.id} className={styles.item}>
                <span className={styles.symbol}>{item.symbol}</span>
                <span>{item.quantity}주</span>
                <span>${item.avgBuyPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <form
            className={styles.addForm}
            onSubmit={(e) => {
              e.preventDefault();
              addItem.mutate(portfolio.id);
            }}
          >
            <input placeholder="티커 (AAPL)" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
            <input placeholder="수량" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <input placeholder="평균 매수가 ($)" type="number" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} required />
            <button type="submit">추가</button>
          </form>

          {addItem.error && (
            <p className={styles.error}>{(addItem.error as any).response?.data?.message}</p>
          )}
        </>
      )}

      <Disclaimer />
    </div>
  );
};

export default PortfolioPage;
