import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type Time,
  ColorType,
} from 'lightweight-charts';
import type { PriceData, TaResult } from '@/types/analysis';
import styles from './CandlestickChart.module.scss';

interface Props {
  prices: PriceData[];
  taResult?: TaResult;
}

const CandlestickChart = ({ prices, taResult }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#0f0f1a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      timeScale: {
        borderColor: '#334155',
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const candleData: CandlestickData<Time>[] = prices.map((p) => ({
      time: p.date.split('T')[0] as unknown as Time,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));

    candleSeries.setData(candleData);

    // Volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      prices.map((p) => ({
        time: p.date.split('T')[0] as unknown as Time,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      })),
    );

    // BB overlay lines
    if (taResult?.bbUpper != null && taResult?.bbLower != null) {
      const bbUpper = chart.addSeries(LineSeries, {
        color: 'rgba(107,114,128,0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });
      const bbLower = chart.addSeries(LineSeries, {
        color: 'rgba(107,114,128,0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });

      const lastDate = prices[prices.length - 1]?.date.split('T')[0] as unknown as Time;
      bbUpper.setData([{ time: lastDate, value: taResult.bbUpper }]);
      bbLower.setData([{ time: lastDate, value: taResult.bbLower }]);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [prices, taResult]);

  return <div ref={containerRef} className={styles.chartContainer} />;
};

export default CandlestickChart;
