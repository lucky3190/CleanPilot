import { create } from 'zustand';
import { AppState, Dataset, PipelineStep } from '@/lib/types';

interface StoreState extends AppState {
  setDataset: (dataset: Dataset) => void;
  addPipelineStep: (step: PipelineStep) => void;
  removePipelineStep: (stepId: string) => void;
  setSelectedColumn: (columnName: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const initialState: AppState = {
  dataset: null,
  pipeline: [],
  selectedColumn: null,
  loading: false,
  error: null,
};

export const useStore = create<StoreState>((set) => ({
  ...initialState,
  
  setDataset: (dataset: Dataset) => set({ dataset }),
  
  addPipelineStep: (step: PipelineStep) =>
    set((state) => ({
      pipeline: [...state.pipeline, step],
    })),
  
  removePipelineStep: (stepId: string) =>
    set((state) => ({
      pipeline: state.pipeline.filter((step) => step.id !== stepId),
    })),
  
  setSelectedColumn: (columnName: string | null) =>
    set({ selectedColumn: columnName }),
  
  setLoading: (loading: boolean) => set({ loading }),
  
  setError: (error: string | null) => set({ error }),
  
  resetState: () => set(initialState),
}));