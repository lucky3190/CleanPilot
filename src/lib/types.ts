// Types for column data and profiling
export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  stats: {
    count: number;
    nullCount: number;
    uniqueCount: number;
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    mode?: string | number;
    histogram?: Array<{ bin: number | string; count: number }>;
  };
}

// Types for data transformations
export type TransformationType =
  | 'impute'
  | 'normalize'
  | 'deduplicate'
  | 'drop_column'
  | 'replace_values'
  | 'outlier_remove'
  | 'type_convert'
  | 'rename';

export interface PipelineStep {
  id: string;
  type: TransformationType;
  column: string;
  params: Record<string, any>;
  timestamp: number;
}

// Types for dataset
export interface Dataset {
  name: string;
  columns: string[];
  data: Record<string, any>[];
  profiles: Record<string, ColumnProfile>;
}

// Types for application state
export interface AppState {
  dataset: Dataset | null;
  pipeline: PipelineStep[];
  selectedColumn: string | null;
  loading: boolean;
  error: string | null;
}