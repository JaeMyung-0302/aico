import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import type { TradeLog } from '@/types/signal';
import styles from './TradeLogPage.module.scss';

const TradeLogPage = () => {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState('');
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [tradedAt, setTradedAt] = useState('');
  const [memo, setMemo] = useState('');

  const { data: trades, isLoading } = useQuery<TradeLog[]>({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data } = await api.get('/trades');
      return data;
    },
  });

  const addTrade = useMutation({
    mutationFn: async () => {
      await api.post('/trades', {
        symbol: symbol.toUpperCase(),
        action,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        tradedAt,
        memo: memo || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setSymbol('');
      setQuantity('');
      setPrice('');
      setTradedAt('');
      setMemo('');
    },
  });

  const deleteTrade = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/trades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1>매매 기록</h1>
        <Link to="/trades/review" className={styles.reviewLink}>
          AI 복기 분석
        </Link>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          addTrade.mutate();
        }}
      >
        <input placeholder="티커 (AAPL)" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
        <select value={action} onChange={(e) => setAction(e.target.value as 'BUY' | 'SELL')}>
          <option value="BUY">매수</option>
          <option value="SELL">매도</option>
        </select>
        <input placeholder="수량" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        <input placeholder="가격 ($)" type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input type="date" value={tradedAt} onChange={(e) => setTradedAt(e.target.value)} required />
        <input placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <button type="submit" disabled={addTrade.isPending}>기록 추가</button>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <div className={styles.list}>
          {trades?.map((trade) => (
            <div key={trade.id} className={styles.tradeCard}>
              <div className={styles.tradeHeader}>
                <span className={styles.symbol}>{trade.symbol}</span>
                <span className={trade.action === 'BUY' ? styles.buy : styles.sell}>
                  {trade.action === 'BUY' ? '매수' : '매도'}
                </span>
                <span>{trade.quantity}주 × ${trade.price}</span>
                <span className={styles.date}>
                  {new Date(trade.tradedAt).toLocaleDateString('ko-KR')}
                </span>
                <button
                  className={styles.deleteButton}
                  onClick={() => deleteTrade.mutate(trade.id)}
                >
                  ×
                </button>
              </div>
              {trade.memo && <p className={styles.memo}>{trade.memo}</p>}
            </div>
          ))}
        </div>
      )}

      <Disclaimer />
    </div>
  );
};

export default TradeLogPage;
