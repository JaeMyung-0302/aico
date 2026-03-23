import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import BacktestResult from '@/components/BacktestResult/BacktestResult';
import StrategyCompare from '@/components/StrategyCompare/StrategyCompare';
import AccuracyDashboard from '@/components/AccuracyDashboard/AccuracyDashboard';
import Disclaimer from '@/components/Disclaimer/Disclaimer';
import styles from './BacktestPage.module.scss';

interface BacktestData {
  strategy: string;
  symbol: string;
  period: string;
  totalReturn: number;
  buyAndHoldReturn: number;
  trades: Array<{ date: string; action: string; price: number; reason: string }>;
  tradeCount: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

const BacktestPage = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [strategyId, setStrategyId] = useState('rsi');
  const [periodDays, setPeriodDays] = useState(365);
  const [results, setResults] = useState<BacktestData[]>([]);

  const { data: strategies } = useQuery({
    queryKey: ['backtest-strategies'],
    queryFn: async () => {
      const { data } = await api.get('/backtest/strategies');
      return data as Array<{ id: string; name: string }>;
    },
  });

  const runBacktest = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/backtest', {
        symbol: symbol.toUpperCase(),
        strategy: strategyId,
        periodDays,
      });
      return data as BacktestData;
    },
    onSuccess: (data) => {
      setResults((prev) => {
        const filtered = prev.filter(
          (r) => !(r.symbol === data.symbol && r.strategy === data.strategy),
        );
        return [...filtered, data];
      });
    },
  });

  const runAll = useMutation({
    mutationFn: async () => {
      const allResults: BacktestData[] = [];
      for (const s of strategies ?? []) {
        const { data } = await api.post('/backtest', {
          symbol: symbol.toUpperCase(),
          strategy: s.id,
          periodDays,
        });
        allResults.push(data);
      }
      return allResults;
    },
    onSuccess: (data) => {
      setResults(data);
    },
  });

  return (
    <div className={styles.page}>
      <h1>백테스트 시뮬레이션</h1>

      <div className={styles.controls}>
        <input
          className={styles.input}
          placeholder="티커 (AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <select
          className={styles.select}
          value={strategyId}
          onChange={(e) => setStrategyId(e.target.value)}
        >
          {strategies?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className={styles.select}
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
        >
          <option value={90}>3개월</option>
          <option value={180}>6개월</option>
          <option value={365}>1년</option>
          <option value={730}>2년</option>
        </select>
        <button
          className={styles.runButton}
          onClick={() => runBacktest.mutate()}
          disabled={runBacktest.isPending}
        >
          {runBacktest.isPending ? '실행 중...' : '실행'}
        </button>
        <button
          className={styles.compareButton}
          onClick={() => runAll.mutate()}
          disabled={runAll.isPending}
        >
          {runAll.isPending ? '비교 중...' : '전략 비교'}
        </button>
      </div>

      {runBacktest.error && (
        <p className={styles.error}>
          {(runBacktest.error as any)?.response?.data?.message ?? '백테스트 실행 실패'}
        </p>
      )}

      {results.length === 1 && <BacktestResult result={results[0]!} />}
      {results.length > 1 && <StrategyCompare results={results} />}

      <AccuracyDashboard symbol={symbol} />

      <Disclaimer />
    </div>
  );
};

export default BacktestPage;
