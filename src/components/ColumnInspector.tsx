"use client";

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useStore } from '@/state/store';
import { imputeMissing, normalizeColumn, dedupeByColumn } from '@/lib/transformations';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export const ColumnInspector: React.FC = () => {
  const { dataset, selectedColumn, commitTransformation, setSelectedColumn } = useStore();

  const profile = selectedColumn ? dataset?.profiles[selectedColumn] : null;

  // Local UI params for transformations
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'value' | 'auto'>('auto');
  const [customImputeValue, setCustomImputeValue] = useState<string>('');
  const [normalizeMethod, setNormalizeMethod] = useState<'min-max' | 'zscore'>('min-max');

  const chart = useMemo(() => {
    if (!dataset || !selectedColumn || !profile) return null;

    if (profile.type === 'numeric') {
      return {
        data: [{ type: 'histogram', x: dataset.data.map(d => Number(d[selectedColumn])), marker: { color: '#2563eb' } }],
        layout: { title: selectedColumn, height: 320, margin: { t: 36 } }
      };
    }

    const counts: Record<string, number> = {};
    dataset.data.forEach(row => {
      const v = String(row[selectedColumn]);
      counts[v] = (counts[v] || 0) + 1;
    });

    return {
      data: [{ type: 'bar', x: Object.keys(counts), y: Object.values(counts), marker: { color: '#10b981' } }],
      layout: { title: selectedColumn, height: 320, margin: { t: 36, b: 120 }, xaxis: { tickangle: -45 } }
    };
  }, [dataset, selectedColumn, profile]);

  if (!dataset || !selectedColumn || !profile) return null;

  const doImpute = () => {
    const custom = imputeStrategy === 'value' ? customImputeValue : undefined;
    const { dataset: newDs, step } = imputeMissing(dataset, selectedColumn, imputeStrategy, custom);
    commitTransformation(newDs, step);
  };

  const doNormalize = () => {
    const { dataset: newDs, step } = normalizeColumn(dataset, selectedColumn, normalizeMethod);
    commitTransformation(newDs, step);
  };

  const doDedupe = () => {
    const { dataset: newDs, step } = dedupeByColumn(dataset, selectedColumn);
    commitTransformation(newDs, step);
  };

  return (
    <aside className="fixed right-6 top-24 w-96 bg-white border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{selectedColumn}</h3>
          <p className="text-sm text-gray-500">Type: {profile.type}</p>
        </div>
        <button
          aria-label="close"
          onClick={() => setSelectedColumn(null)}
          className="text-gray-400 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="mt-3">
        {chart && (
          // @ts-ignore - Plot's types are heavy; runtime import is used.
          <Plot data={chart.data} layout={chart.layout} config={{ responsive: true, displayModeBar: false }} />
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-sm text-gray-600">
          <div>Rows: {profile.stats.count}</div>
          <div>Nulls: {profile.stats.nullCount}</div>
          <div>Uniques: {profile.stats.uniqueCount}</div>
        </div>

        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-500">Imputation strategy</label>
          <div className="flex gap-2">
            <select
              value={imputeStrategy}
              onChange={(e) => setImputeStrategy(e.target.value as any)}
              className="flex-1 rounded border px-2 py-1"
            >
              <option value="auto">Auto</option>
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="mode">Mode</option>
              <option value="value">Custom value</option>
            </select>
            {imputeStrategy === 'value' && (
              <input
                value={customImputeValue}
                onChange={(e) => setCustomImputeValue(e.target.value)}
                placeholder="value"
                className="w-28 rounded border px-2 py-1"
              />
            )}
            <button onClick={doImpute} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
          </div>

          {profile.type === 'numeric' && (
            <div className="mt-3">
              <label className="block text-xs text-gray-500">Normalize</label>
              <div className="flex gap-2 mt-1">
                <select value={normalizeMethod} onChange={(e) => setNormalizeMethod(e.target.value as any)} className="flex-1 rounded border px-2 py-1">
                  <option value="min-max">Min-Max</option>
                  <option value="zscore">Z-score</option>
                </select>
                <button onClick={doNormalize} className="px-3 py-1 bg-indigo-600 text-white rounded">Apply</button>
              </div>
            </div>
          )}

          <div className="mt-2">
            <button onClick={doDedupe} className="w-full px-3 py-2 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition">Remove duplicates</button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ColumnInspector;
