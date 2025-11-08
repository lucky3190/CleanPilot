import dynamic from 'next/dynamic';
import { useStore } from '@/state/store';
import { ColumnType } from '@/lib/types';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export const ColumnCard: React.FC<{ columnName: string }> = ({ columnName }) => {
  const { dataset, setSelectedColumn } = useStore();
  const profile = dataset?.profiles[columnName];

  if (!profile) return null;

  const getChartData = () => {
    switch (profile.type) {
      case 'numeric':
        return {
          data: [{
            type: 'box',
            y: dataset?.data.map(row => row[columnName]),
            name: columnName,
          }],
          layout: {
            title: columnName,
            height: 200,
            margin: { t: 30, r: 10, l: 40, b: 30 },
          }
        };
      
      case 'categorical':
        const counts: Record<string, number> = {};
        dataset?.data.forEach(row => {
          const val = row[columnName];
          counts[val] = (counts[val] || 0) + 1;
        });
        
        return {
          data: [{
            type: 'bar',
            x: Object.keys(counts),
            y: Object.values(counts),
            name: columnName,
          }],
          layout: {
            title: columnName,
            height: 200,
            margin: { t: 30, r: 10, l: 40, b: 70 },
            xaxis: {
              tickangle: 45
            }
          }
        };
      
      default:
        return null;
    }
  };

  const chartData = getChartData();

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedColumn(columnName)}
    >
      {chartData && (
        <Plot
          data={chartData.data}
          layout={chartData.layout}
          config={{ displayModeBar: false }}
        />
      )}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{columnName}</h3>
          <span className="text-xs text-gray-500">{profile.type}</span>
        </div>
        <div className="text-xs text-gray-500 space-x-2">
          <span>{profile.stats.count} rows</span>
          <span>•</span>
          <span>{profile.stats.nullCount} null</span>
          <span>•</span>
          <span>{profile.stats.uniqueCount} unique</span>
        </div>
      </div>
    </div>
  );
};

export const ColumnGrid: React.FC = () => {
  const { dataset } = useStore();

  if (!dataset) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dataset.columns.map(columnName => (
        <ColumnCard key={columnName} columnName={columnName} />
      ))}
    </div>
  );
};