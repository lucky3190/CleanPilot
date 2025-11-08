import { useCallback, useState } from 'react';
import { useStore } from '@/state/store';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, ColumnProfile, ColumnType } from '@/lib/types';

export const FileDropzone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { setDataset, setLoading, setError } = useStore();

  const analyzeColumn = (values: any[]): ColumnProfile['stats'] => {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const count = values.length;
    const nullCount = count - nonNullValues.length;
    const uniqueCount = new Set(values).size;

    if (nonNullValues.every(v => !isNaN(Number(v)))) {
      const numbers = nonNullValues.map(Number);
      return {
        count,
        nullCount,
        uniqueCount,
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        mean: numbers.reduce((a, b) => a + b, 0) / numbers.length,
        median: numbers.sort((a, b) => a - b)[Math.floor(numbers.length / 2)],
      };
    }

    return { count, nullCount, uniqueCount };
  };

  const detectColumnType = (values: any[]): ColumnType => {
    const sample = values.find(v => v !== null && v !== undefined && v !== '');
    if (!sample) return 'text';
    
    if (!isNaN(Number(sample))) return 'numeric';
    if (!isNaN(Date.parse(sample))) return 'datetime';
    return 'categorical';
  };

  const processData = (data: any[]): Dataset => {
    const columns = Object.keys(data[0]);
    const profiles: Record<string, ColumnProfile> = {};

    columns.forEach(col => {
      const values = data.map(row => row[col]);
      const type = detectColumnType(values);
      profiles[col] = {
        name: col,
        type,
        stats: analyzeColumn(values)
      };
    });

    return {
      name: 'dataset',
      columns,
      data,
      profiles
    };
  };

  const handleFile = async (file: File) => {
    try {
      setLoading(true);
      
      if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            const dataset = processData(results.data);
            setDataset(dataset);
            setLoading(false);
          },
          error: (error) => {
            setError(error.message);
            setLoading(false);
          }
        });
      } else if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        const dataset = processData(data);
        setDataset(dataset);
        setLoading(false);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        const dataset = processData(Array.isArray(data) ? data : [data]);
        setDataset(dataset);
        setLoading(false);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process file');
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-primary'}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.tsv,.xlsx,.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      <div className="space-y-4">
        <div className="text-4xl text-gray-400">
          📄
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Drop your data file here
        </h3>
        <p className="text-sm text-gray-500">
          Support for CSV, TSV, XLSX, and JSON files
        </p>
      </div>
    </div>
  );
};