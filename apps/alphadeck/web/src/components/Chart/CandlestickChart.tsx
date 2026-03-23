import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PriceData, TaResult } from '@/types/analysis';
import styles from './CandlestickChart.module.scss';

interface Props {
  prices: PriceData[];
  taResult?: TaResult;
}

const CandlestickChart = ({ prices, taResult }: Props) => {
  const chartData = prices.map((p) => ({
    date: new Date(p.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
    color: p.close >= p.open ? '#22c55e' : '#ef4444',
    bodyTop: Math.max(p.open, p.close),
    bodyBottom: Math.min(p.open, p.close),
  }));

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#f1f5f9',
            }}
          />
          <Bar dataKey="bodyTop" fill="transparent" stackId="candle" />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
          />
          {taResult?.bbUpper && (
            <>
              <Line type="monotone" dataKey={() => taResult.bbUpper} stroke="#6b7280" dot={false} strokeDasharray="4 4" strokeWidth={1} />
              <Line type="monotone" dataKey={() => taResult.bbLower} stroke="#6b7280" dot={false} strokeDasharray="4 4" strokeWidth={1} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CandlestickChart;
