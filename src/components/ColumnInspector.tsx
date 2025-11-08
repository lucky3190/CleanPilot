"use client";

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useStore } from '@/state/store';
import { imputeMissing, normalizeColumn, dedupeByColumn, dropColumn, replaceValues } from '@/lib/transformations';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export const ColumnInspector: React.FC = () => {
  const { dataset, selectedColumn, commitTransformation, setSelectedColumn } = useStore();

  const profile = selectedColumn ? dataset?.profiles[selectedColumn] : null;

  // Local UI params for transformations
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'value' | 'auto'>('auto');
  const [customImputeValue, setCustomImputeValue] = useState<string>('');
  const [normalizeMethod, setNormalizeMethod] = useState<'min-max' | 'zscore'>('min-max');
  const [replaceFrom, setReplaceFrom] = useState<string>('');
  const [replaceTo, setReplaceTo] = useState<string>('');
  const [replaceIgnoreCase, setReplaceIgnoreCase] = useState<boolean>(true);

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

  const doReplace = () => {
    if (!replaceFrom) return;
    const { dataset: newDs, step } = replaceValues(dataset, selectedColumn, replaceFrom, replaceTo, { ignoreCase: replaceIgnoreCase });
    commitTransformation(newDs, step);
  };

  const doDrop = () => {
    const ok = window.confirm(`Drop column "${selectedColumn}"? This will remove the column from the dataset.`);
    if (!ok) return;
    const { dataset: newDs, step } = dropColumn(dataset, selectedColumn);
    commitTransformation(newDs, step);
  };

  return (
    // Mobile-first: full-screen panel. On small+ screens (sm >= 640px) show as right slide-over (w-96)
    <aside className="fixed inset-0 p-4 bg-white z-50 overflow-y-auto transition-all duration-200 ease-out sm:inset-auto sm:top-24 sm:right-6 sm:w-96 sm:rounded-lg sm:shadow-lg sm:border">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{selectedColumn}</h3>
          <p className="text-sm text-gray-500">Type: {profile.type}</p>
        </div>
        <button
          aria-label="close inspector"
          onClick={() => setSelectedColumn(null)}
          className="text-gray-500 hover:text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 px-2 py-1"
        >
          <span className="sr-only">Close inspector</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="mt-3">
        {chart && (
          // @ts-ignore - Plot's types are heavy; runtime import is used.
          <Plot
            data={chart.data}
            layout={{ ...chart.layout, autosize: true }}
            useResizeHandler={true}
            style={{ width: '100%', height: '320px' }}
            config={{ responsive: true, displayModeBar: false }}
          />
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

          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="text-xs text-gray-500">Find & replace (categorical)</div>
              <div className="flex gap-2">
                <input value={replaceFrom} onChange={(e) => setReplaceFrom(e.target.value)} placeholder="from" className="flex-1 rounded border px-2 py-1" />
                <input value={replaceTo} onChange={(e) => setReplaceTo(e.target.value)} placeholder="to" className="flex-1 rounded border px-2 py-1" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm"><input type="checkbox" checked={replaceIgnoreCase} onChange={(e) => setReplaceIgnoreCase(e.target.checked)} className="mr-2" /> Ignore case</label>
                <button onClick={doReplace} className="ml-auto px-3 py-1 bg-yellow-500 text-white rounded">Replace</button>
              </div>
            </div>

            <div>
              <button onClick={doDedupe} className="w-full mb-2 px-3 py-2 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition">Remove duplicates</button>
              <button onClick={doDrop} className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Drop column</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ColumnInspector;
