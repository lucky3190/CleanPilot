import { create } from 'zustand';
import { AppState, Dataset, PipelineStep } from '@/lib/types';
import { imputeMissing, normalizeColumn, dedupeByColumn } from '@/lib/transformations';

interface StoreState extends AppState {
  // history stacks for undo/redo
  pastDatasets: Dataset[];
  futureDatasets: Dataset[];
  futurePipelineSteps: PipelineStep[];
  // the original loaded dataset (used for pipeline replay)
  originalDataset: Dataset | null;

  setDataset: (dataset: Dataset) => void;
  addPipelineStep: (step: PipelineStep) => void;
  removePipelineStep: (stepId: string) => void;
  setSelectedColumn: (columnName: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;

  // new helpers for transformations + history
  commitTransformation: (newDataset: Dataset, step: PipelineStep) => void;
  applyStep: (step: PipelineStep) => void; // apply by interpreting step.params
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  // replay pipeline from original dataset
  replayPipeline: (pipeline?: PipelineStep[]) => Dataset | null;
}

const initialState: AppState = {
  dataset: null,
  pipeline: [],
  selectedColumn: null,
  loading: false,
  error: null,
};

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  originalDataset: null,
  pastDatasets: [],
  futureDatasets: [],
  futurePipelineSteps: [],

  setDataset: (dataset: Dataset) =>
    set(() => ({ dataset, originalDataset: dataset, pipeline: [], pastDatasets: [], futureDatasets: [], futurePipelineSteps: [] })),

  addPipelineStep: (step: PipelineStep) =>
    set((state) => ({ pipeline: [...state.pipeline, step] })),

  removePipelineStep: (stepId: string) =>
    set((state) => {
      const newPipeline = state.pipeline.filter((step) => step.id !== stepId);
      // replay pipeline starting from originalDataset
      const orig = state.originalDataset ?? state.dataset;
      if (!orig) {
        return { pipeline: newPipeline } as any;
      }
      let replayed = orig;
      try {
        for (const step of newPipeline) {
          switch (step.type) {
            case 'impute':
              replayed = imputeMissing(replayed, step.column, (step.params?.strategy as any) ?? 'auto', step.params?.value).dataset;
              break;
            case 'normalize':
              replayed = normalizeColumn(replayed, step.column, (step.params?.method as any) ?? 'min-max').dataset;
              break;
            case 'deduplicate':
              replayed = dedupeByColumn(replayed, step.column).dataset;
              break;
            default:
              console.warn('Unknown step type during replay', step.type);
              break;
          }
        }
      } catch (e) {
        console.error('Failed to replay pipeline after removal', e);
      }

      return {
        pipeline: newPipeline,
        dataset: replayed,
        // reset history because we've changed the pipeline structure
        pastDatasets: [],
        futureDatasets: [],
        futurePipelineSteps: [],
      } as any;
    }),

  setSelectedColumn: (columnName: string | null) => set({ selectedColumn: columnName }),

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) => set({ error }),

  resetState: () => set({ ...initialState, originalDataset: null, pastDatasets: [], futureDatasets: [], futurePipelineSteps: [] }),

  commitTransformation: (newDataset: Dataset, step: PipelineStep) =>
    set((state) => ({
      pastDatasets: [...state.pastDatasets, state.dataset as Dataset],
      futureDatasets: [],
      futurePipelineSteps: [],
      dataset: newDataset,
      pipeline: [...state.pipeline, step],
    })),

  applyStep: (step: PipelineStep) => {
    const state = get();
    const ds = state.dataset;
    if (!ds) return;

    let result: { dataset: Dataset; step: PipelineStep } | null = null;
    try {
      switch (step.type) {
        case 'impute':
          result = imputeMissing(ds, step.column, (step.params?.strategy as any) ?? 'auto', step.params?.value);
          break;
        case 'normalize':
          result = normalizeColumn(ds, step.column, (step.params?.method as any) ?? 'min-max');
          break;
        case 'deduplicate':
          result = dedupeByColumn(ds, step.column);
          break;
        default:
          console.warn('Unknown step type', step.type);
          break;
      }
    } catch (e) {
      console.error('Failed to apply step', e);
    }

    if (result) {
      set((s) => ({
        pastDatasets: [...s.pastDatasets, s.dataset as Dataset],
        futureDatasets: [],
        futurePipelineSteps: [],
        dataset: result!.dataset,
        pipeline: [...s.pipeline, step],
      }));
    }
  },

  replayPipeline: (pipeline?: PipelineStep[]) => {
    const state = get();
    const orig = state.originalDataset ?? state.dataset;
    const toReplay = pipeline ?? state.pipeline;
    if (!orig) return null;
    let replayed = orig;
    try {
      for (const step of toReplay) {
        switch (step.type) {
          case 'impute':
            replayed = imputeMissing(replayed, step.column, (step.params?.strategy as any) ?? 'auto', step.params?.value).dataset;
            break;
          case 'normalize':
            replayed = normalizeColumn(replayed, step.column, (step.params?.method as any) ?? 'min-max').dataset;
            break;
          case 'deduplicate':
            replayed = dedupeByColumn(replayed, step.column).dataset;
            break;
          default:
            console.warn('Unknown step type during replay', step.type);
            break;
        }
      }
    } catch (e) {
      console.error('Failed to replay pipeline', e);
    }
    return replayed;
  },

  undo: () =>
    set((state) => {
      if (!state.pastDatasets || state.pastDatasets.length === 0) return state;
      const prev = state.pastDatasets[state.pastDatasets.length - 1];
      const newPast = state.pastDatasets.slice(0, -1);
      const removedStep = state.pipeline[state.pipeline.length - 1];
      const newPipeline = state.pipeline.slice(0, -1);
      return {
        dataset: prev,
        pipeline: newPipeline,
        pastDatasets: newPast,
        futureDatasets: [state.dataset as Dataset, ...state.futureDatasets],
        futurePipelineSteps: [removedStep, ...state.futurePipelineSteps],
      } as any;
    }),

  redo: () =>
    set((state) => {
      if (!state.futureDatasets || state.futureDatasets.length === 0) return state;
      const next = state.futureDatasets[0];
      const nextStep = state.futurePipelineSteps[0];
      const newFutureDatasets = state.futureDatasets.slice(1);
      const newFutureSteps = state.futurePipelineSteps.slice(1);
      return {
        dataset: next,
        pipeline: nextStep ? [...state.pipeline, nextStep] : state.pipeline,
        pastDatasets: [...state.pastDatasets, state.dataset as Dataset],
        futureDatasets: newFutureDatasets,
        futurePipelineSteps: newFutureSteps,
      } as any;
    }),

  clearHistory: () => set({ pastDatasets: [], futureDatasets: [], futurePipelineSteps: [], originalDataset: get().originalDataset }),
}));