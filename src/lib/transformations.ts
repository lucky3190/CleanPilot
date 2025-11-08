import { Dataset, PipelineStep } from '@/lib/types';

// Minimal helpers for generating step ids
const makeId = (prefix = 'step') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Impute missing values: numeric -> mean, categorical -> mode
export function imputeMissing(
  dataset: Dataset,
  column: string,
  strategy: 'mean' | 'median' | 'mode' | 'value' | 'auto' = 'auto',
  customValue?: any,
) {
  const data = dataset.data.map(r => ({ ...r }));
  const values = data.map(r => r[column]);
  const nonNull = values.filter(v => v !== undefined && v !== null && v !== '');

  const isNumeric = nonNull.every(v => !isNaN(Number(v)));
  let fillValue: any = null;

  if (strategy === 'value') {
    fillValue = customValue;
  } else if (strategy === 'mean' || (strategy === 'auto' && isNumeric)) {
    const nums = nonNull.map(Number);
    fillValue = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
  } else if (strategy === 'median') {
    const nums = nonNull.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    fillValue = nums.length ? (nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2) : null;
  } else {
    // mode or categorical fallback
    const counts = nonNull.reduce((acc: Record<string, number>, v: any) => {
      const k = String(v);
      acc[k] = (acc[k] || 0) + 1; return acc;
    }, {} as Record<string, number>);
    fillValue = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] ?? null;
  }

  data.forEach(row => {
    if (row[column] === undefined || row[column] === null || row[column] === '') {
      row[column] = fillValue;
    }
  });

  const step: PipelineStep = {
    id: makeId('impute'),
    type: 'impute',
    column,
    params: { strategy, value: fillValue },
    timestamp: Date.now(),
  };

  const newDataset: Dataset = {
    ...dataset,
    data,
  };

  return { dataset: newDataset, step };
}

// Normalize numeric column (min-max)
export function normalizeColumn(dataset: Dataset, column: string, method: 'min-max' | 'zscore' = 'min-max') {
  const data = dataset.data.map(r => ({ ...r }));
  const nums = data.map(r => Number(r[column])).filter(v => !isNaN(v));

  if (method === 'min-max') {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    data.forEach(row => {
      const v = Number(row[column]);
      if (!isNaN(v)) row[column] = (v - min) / range;
    });
    const step: PipelineStep = {
      id: makeId('normalize'),
      type: 'normalize',
      column,
      params: { method: 'min-max', min: Math.min(...nums), max: Math.max(...nums) },
      timestamp: Date.now(),
    };
    return { dataset: { ...dataset, data }, step };
  }

  // z-score
  const mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
  const std = Math.sqrt(nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length || 1)) || 1;
  data.forEach(row => {
    const v = Number(row[column]);
    if (!isNaN(v)) row[column] = (v - mean) / std;
  });

  const step: PipelineStep = {
    id: makeId('normalize'),
    type: 'normalize',
    column,
    params: { method: 'zscore', mean, std },
    timestamp: Date.now(),
  };

  return { dataset: { ...dataset, data }, step };
}

// Remove duplicate rows based on a column (keeps first occurrence)
export function dedupeByColumn(dataset: Dataset, column: string) {
  const seen = new Set<string>();
  const data: typeof dataset.data = [];

  dataset.data.forEach(row => {
    const key = String(row[column]);
    if (!seen.has(key)) {
      seen.add(key);
      data.push({ ...row });
    }
  });

  const step: PipelineStep = {
    id: makeId('dedupe'),
    type: 'deduplicate',
    column,
    params: { kept: data.length },
    timestamp: Date.now(),
  };

  return { dataset: { ...dataset, data }, step };
}
