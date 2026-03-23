import { Line } from 'recharts';
import type { TaResult } from '@/types/analysis';

interface Props {
  taResult: TaResult;
  dataLength: number;
}

const IndicatorOverlay = ({ taResult, dataLength }: Props) => {
  if (dataLength === 0) return null;

  return (
    <>
      {taResult.sma20 != null && (
        <Line
          type="monotone"
          dataKey={() => taResult.sma20}
          stroke="#f59e0b"
          dot={false}
          strokeWidth={1}
          name="SMA 20"
        />
      )}
      {taResult.sma50 != null && (
        <Line
          type="monotone"
          dataKey={() => taResult.sma50}
          stroke="#8b5cf6"
          dot={false}
          strokeWidth={1}
          name="SMA 50"
        />
      )}
      {taResult.sma200 != null && (
        <Line
          type="monotone"
          dataKey={() => taResult.sma200}
          stroke="#ec4899"
          dot={false}
          strokeWidth={1}
          name="SMA 200"
        />
      )}
      {taResult.bbUpper != null && (
        <Line
          type="monotone"
          dataKey={() => taResult.bbUpper}
          stroke="#6b7280"
          dot={false}
          strokeDasharray="4 4"
          strokeWidth={1}
          name="BB Upper"
        />
      )}
      {taResult.bbLower != null && (
        <Line
          type="monotone"
          dataKey={() => taResult.bbLower}
          stroke="#6b7280"
          dot={false}
          strokeDasharray="4 4"
          strokeWidth={1}
          name="BB Lower"
        />
      )}
    </>
  );
};

export default IndicatorOverlay;
