module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/lib/transformations.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dedupeByColumn",
    ()=>dedupeByColumn,
    "dropColumn",
    ()=>dropColumn,
    "imputeMissing",
    ()=>imputeMissing,
    "normalizeColumn",
    ()=>normalizeColumn,
    "replaceValues",
    ()=>replaceValues
]);
// Minimal helpers for generating step ids
const makeId = (prefix = 'step')=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
function imputeMissing(dataset, column, strategy = 'auto', customValue) {
    const data = dataset.data.map((r)=>({
            ...r
        }));
    const values = data.map((r)=>r[column]);
    const nonNull = values.filter((v)=>v !== undefined && v !== null && v !== '');
    const isNumeric = nonNull.every((v)=>!isNaN(Number(v)));
    let fillValue = null;
    if (strategy === 'value') {
        fillValue = customValue;
    } else if (strategy === 'mean' || strategy === 'auto' && isNumeric) {
        const nums = nonNull.map(Number);
        fillValue = nums.reduce((a, b)=>a + b, 0) / (nums.length || 1);
    } else if (strategy === 'median') {
        const nums = nonNull.map(Number).filter((n)=>!isNaN(n)).sort((a, b)=>a - b);
        const mid = Math.floor(nums.length / 2);
        fillValue = nums.length ? nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2 : null;
    } else {
        // mode or categorical fallback
        const counts = nonNull.reduce((acc, v)=>{
            const k = String(v);
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        fillValue = Object.keys(counts).sort((a, b)=>counts[b] - counts[a])[0] ?? null;
    }
    data.forEach((row)=>{
        if (row[column] === undefined || row[column] === null || row[column] === '') {
            row[column] = fillValue;
        }
    });
    const step = {
        id: makeId('impute'),
        type: 'impute',
        column,
        params: {
            strategy,
            value: fillValue
        },
        timestamp: Date.now()
    };
    const newDataset = {
        ...dataset,
        data
    };
    return {
        dataset: newDataset,
        step
    };
}
function normalizeColumn(dataset, column, method = 'min-max') {
    const data = dataset.data.map((r)=>({
            ...r
        }));
    const nums = data.map((r)=>Number(r[column])).filter((v)=>!isNaN(v));
    if (method === 'min-max') {
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const range = max - min || 1;
        data.forEach((row)=>{
            const v = Number(row[column]);
            if (!isNaN(v)) row[column] = (v - min) / range;
        });
        const step = {
            id: makeId('normalize'),
            type: 'normalize',
            column,
            params: {
                method: 'min-max',
                min: Math.min(...nums),
                max: Math.max(...nums)
            },
            timestamp: Date.now()
        };
        return {
            dataset: {
                ...dataset,
                data
            },
            step
        };
    }
    // z-score
    const mean = nums.reduce((a, b)=>a + b, 0) / (nums.length || 1);
    const std = Math.sqrt(nums.reduce((a, b)=>a + Math.pow(b - mean, 2), 0) / (nums.length || 1)) || 1;
    data.forEach((row)=>{
        const v = Number(row[column]);
        if (!isNaN(v)) row[column] = (v - mean) / std;
    });
    const step = {
        id: makeId('normalize'),
        type: 'normalize',
        column,
        params: {
            method: 'zscore',
            mean,
            std
        },
        timestamp: Date.now()
    };
    return {
        dataset: {
            ...dataset,
            data
        },
        step
    };
}
function dedupeByColumn(dataset, column) {
    const seen = new Set();
    const data = [];
    dataset.data.forEach((row)=>{
        const key = String(row[column]);
        if (!seen.has(key)) {
            seen.add(key);
            data.push({
                ...row
            });
        }
    });
    const step = {
        id: makeId('dedupe'),
        type: 'deduplicate',
        column,
        params: {
            kept: data.length
        },
        timestamp: Date.now()
    };
    return {
        dataset: {
            ...dataset,
            data
        },
        step
    };
}
function dropColumn(dataset, column) {
    const data = dataset.data.map((row)=>{
        const copy = {
            ...row
        };
        delete copy[column];
        return copy;
    });
    const columns = dataset.columns.filter((c)=>c !== column);
    const profiles = {
        ...dataset.profiles
    };
    delete profiles[column];
    const step = {
        id: makeId('drop'),
        type: 'drop_column',
        column,
        params: {},
        timestamp: Date.now()
    };
    return {
        dataset: {
            ...dataset,
            data,
            columns,
            profiles
        },
        step
    };
}
function replaceValues(dataset, column, fromValue, toValue, options) {
    const { ignoreCase } = {
        ignoreCase: false,
        ...options || {}
    };
    const data = dataset.data.map((row)=>{
        const copy = {
            ...row
        };
        const val = copy[column];
        if (val !== undefined && val !== null) {
            if (ignoreCase && typeof val === 'string' && typeof fromValue === 'string') {
                if (val.toLowerCase() === fromValue.toLowerCase()) copy[column] = toValue;
            } else {
                if (val === fromValue) copy[column] = toValue;
            }
        }
        return copy;
    });
    // update profile quick stats: cannot compute full stats here; leave to profiler later
    const step = {
        id: makeId('replace'),
        type: 'replace_values',
        column,
        params: {
            fromValue,
            toValue,
            ignoreCase
        },
        timestamp: Date.now()
    };
    return {
        dataset: {
            ...dataset,
            data
        },
        step
    };
}
}),
"[project]/src/state/store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useStore",
    ()=>useStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/transformations.ts [app-ssr] (ecmascript)");
;
;
const initialState = {
    dataset: null,
    pipeline: [],
    selectedColumn: null,
    loading: false,
    error: null
};
const useStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        ...initialState,
        originalDataset: null,
        pastDatasets: [],
        futureDatasets: [],
        futurePipelineSteps: [],
        setDataset: (dataset)=>set(()=>({
                    dataset,
                    originalDataset: dataset,
                    pipeline: [],
                    pastDatasets: [],
                    futureDatasets: [],
                    futurePipelineSteps: []
                })),
        addPipelineStep: (step)=>set((state)=>({
                    pipeline: [
                        ...state.pipeline,
                        step
                    ]
                })),
        removePipelineStep: (stepId)=>set((state)=>{
                const prevDataset = state.dataset;
                const newPipeline = state.pipeline.filter((step)=>step.id !== stepId);
                const orig = state.originalDataset ?? state.dataset;
                if (!orig) {
                    return {
                        pipeline: newPipeline
                    };
                }
                // build replay snapshots: start with original, then after each step
                const snapshots = [
                    orig
                ];
                try {
                    let current = orig;
                    for (const step of newPipeline){
                        switch(step.type){
                            case 'impute':
                                current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["imputeMissing"])(current, step.column, step.params?.strategy ?? 'auto', step.params?.value).dataset;
                                break;
                            case 'normalize':
                                current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeColumn"])(current, step.column, step.params?.method ?? 'min-max').dataset;
                                break;
                            case 'drop_column':
                                current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dropColumn"])(current, step.column).dataset;
                                break;
                            case 'replace_values':
                                current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["replaceValues"])(current, step.column, step.params?.fromValue, step.params?.toValue, {
                                    ignoreCase: step.params?.ignoreCase
                                }).dataset;
                                break;
                            case 'deduplicate':
                                current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dedupeByColumn"])(current, step.column).dataset;
                                break;
                            default:
                                console.warn('Unknown step type during replay', step.type);
                                break;
                        }
                        snapshots.push(current);
                    }
                } catch (e) {
                    console.error('Failed to replay pipeline after removal', e);
                }
                // try to preserve position in history by finding the index of previous dataset
                const prevKey = prevDataset ? JSON.stringify(prevDataset.data) : null;
                let idx = -1;
                if (prevKey) {
                    for(let i = 0; i < snapshots.length; i++){
                        try {
                            if (JSON.stringify(snapshots[i].data) === prevKey) {
                                idx = i;
                                break;
                            }
                        } catch (e) {
                        // ignore serialization errors
                        }
                    }
                }
                // if not found, default to the last snapshot (fully applied)
                if (idx === -1) idx = snapshots.length - 1;
                const newDataset = snapshots[idx];
                const newPast = snapshots.slice(0, idx);
                const newFuture = snapshots.slice(idx + 1);
                const newFutureSteps = newPipeline.slice(idx);
                return {
                    pipeline: newPipeline,
                    dataset: newDataset,
                    pastDatasets: newPast,
                    futureDatasets: newFuture,
                    futurePipelineSteps: newFutureSteps
                };
            }),
        setSelectedColumn: (columnName)=>set({
                selectedColumn: columnName
            }),
        setLoading: (loading)=>set({
                loading
            }),
        setError: (error)=>set({
                error
            }),
        resetState: ()=>set({
                ...initialState,
                originalDataset: null,
                pastDatasets: [],
                futureDatasets: [],
                futurePipelineSteps: []
            }),
        commitTransformation: (newDataset, step)=>set((state)=>({
                    pastDatasets: [
                        ...state.pastDatasets,
                        state.dataset
                    ],
                    futureDatasets: [],
                    futurePipelineSteps: [],
                    dataset: newDataset,
                    pipeline: [
                        ...state.pipeline,
                        step
                    ]
                })),
        applyStep: (step)=>{
            const state = get();
            const ds = state.dataset;
            if (!ds) return;
            let result = null;
            try {
                switch(step.type){
                    case 'impute':
                        result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["imputeMissing"])(ds, step.column, step.params?.strategy ?? 'auto', step.params?.value);
                        break;
                    case 'normalize':
                        result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeColumn"])(ds, step.column, step.params?.method ?? 'min-max');
                        break;
                    case 'deduplicate':
                        result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dedupeByColumn"])(ds, step.column);
                        break;
                    case 'drop_column':
                        result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dropColumn"])(ds, step.column);
                        break;
                    case 'replace_values':
                        result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["replaceValues"])(ds, step.column, step.params?.fromValue, step.params?.toValue, {
                            ignoreCase: step.params?.ignoreCase
                        });
                        break;
                    default:
                        console.warn('Unknown step type', step.type);
                        break;
                }
            } catch (e) {
                console.error('Failed to apply step', e);
            }
            if (result) {
                set((s)=>({
                        pastDatasets: [
                            ...s.pastDatasets,
                            s.dataset
                        ],
                        futureDatasets: [],
                        futurePipelineSteps: [],
                        dataset: result.dataset,
                        pipeline: [
                            ...s.pipeline,
                            step
                        ]
                    }));
            }
        },
        replayPipeline: (pipeline)=>{
            const state = get();
            const orig = state.originalDataset ?? state.dataset;
            const toReplay = pipeline ?? state.pipeline;
            if (!orig) return null;
            let replayed = orig;
            try {
                for (const step of toReplay){
                    switch(step.type){
                        case 'impute':
                            replayed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["imputeMissing"])(replayed, step.column, step.params?.strategy ?? 'auto', step.params?.value).dataset;
                            break;
                        case 'normalize':
                            replayed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeColumn"])(replayed, step.column, step.params?.method ?? 'min-max').dataset;
                            break;
                        case 'drop_column':
                            replayed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dropColumn"])(replayed, step.column).dataset;
                            break;
                        case 'replace_values':
                            replayed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["replaceValues"])(replayed, step.column, step.params?.fromValue, step.params?.toValue, {
                                ignoreCase: step.params?.ignoreCase
                            }).dataset;
                            break;
                        case 'deduplicate':
                            replayed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dedupeByColumn"])(replayed, step.column).dataset;
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
        undo: ()=>set((state)=>{
                if (!state.pastDatasets || state.pastDatasets.length === 0) return state;
                const prev = state.pastDatasets[state.pastDatasets.length - 1];
                const newPast = state.pastDatasets.slice(0, -1);
                const removedStep = state.pipeline[state.pipeline.length - 1];
                const newPipeline = state.pipeline.slice(0, -1);
                return {
                    dataset: prev,
                    pipeline: newPipeline,
                    pastDatasets: newPast,
                    futureDatasets: [
                        state.dataset,
                        ...state.futureDatasets
                    ],
                    futurePipelineSteps: [
                        removedStep,
                        ...state.futurePipelineSteps
                    ]
                };
            }),
        redo: ()=>set((state)=>{
                if (!state.futureDatasets || state.futureDatasets.length === 0) return state;
                const next = state.futureDatasets[0];
                const nextStep = state.futurePipelineSteps[0];
                const newFutureDatasets = state.futureDatasets.slice(1);
                const newFutureSteps = state.futurePipelineSteps.slice(1);
                return {
                    dataset: next,
                    pipeline: nextStep ? [
                        ...state.pipeline,
                        nextStep
                    ] : state.pipeline,
                    pastDatasets: [
                        ...state.pastDatasets,
                        state.dataset
                    ],
                    futureDatasets: newFutureDatasets,
                    futurePipelineSteps: newFutureSteps
                };
            }),
        clearHistory: ()=>set({
                pastDatasets: [],
                futureDatasets: [],
                futurePipelineSteps: [],
                originalDataset: get().originalDataset
            })
    }));
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[project]/src/components/FileDropzone.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FileDropzone",
    ()=>FileDropzone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/state/store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$papaparse$2f$papaparse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/papaparse/papaparse.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx/xlsx.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
const FileDropzone = ()=>{
    const [isDragging, setIsDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const { setDataset, setLoading, setError } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useStore"])();
    const analyzeColumn = (values)=>{
        const nonNullValues = values.filter((v)=>v !== null && v !== undefined && v !== '');
        const count = values.length;
        const nullCount = count - nonNullValues.length;
        const uniqueCount = new Set(values).size;
        if (nonNullValues.every((v)=>!isNaN(Number(v)))) {
            const numbers = nonNullValues.map(Number);
            return {
                count,
                nullCount,
                uniqueCount,
                min: Math.min(...numbers),
                max: Math.max(...numbers),
                mean: numbers.reduce((a, b)=>a + b, 0) / numbers.length,
                median: numbers.sort((a, b)=>a - b)[Math.floor(numbers.length / 2)]
            };
        }
        return {
            count,
            nullCount,
            uniqueCount
        };
    };
    const detectColumnType = (values)=>{
        const sample = values.find((v)=>v !== null && v !== undefined && v !== '');
        if (!sample) return 'text';
        if (!isNaN(Number(sample))) return 'numeric';
        if (!isNaN(Date.parse(sample))) return 'datetime';
        return 'categorical';
    };
    const processData = (data)=>{
        const columns = Object.keys(data[0]);
        const profiles = {};
        columns.forEach((col)=>{
            const values = data.map((row)=>row[col]);
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
    const handleFile = async (file)=>{
        try {
            setLoading(true);
            if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$papaparse$2f$papaparse$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].parse(file, {
                    header: true,
                    complete: (results)=>{
                        const dataset = processData(results.data);
                        setDataset(dataset);
                        setLoading(false);
                    },
                    error: (error)=>{
                        setError(error.message);
                        setLoading(false);
                    }
                });
            } else if (file.name.endsWith('.xlsx')) {
                const buffer = await file.arrayBuffer();
                const workbook = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["read"](buffer);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].sheet_to_json(worksheet);
                const dataset = processData(data);
                setDataset(dataset);
                setLoading(false);
            } else if (file.name.endsWith('.json')) {
                const text = await file.text();
                const data = JSON.parse(text);
                const dataset = processData(Array.isArray(data) ? data : [
                    data
                ]);
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
    const onDrop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((e)=>{
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-primary'}`,
        onDragOver: (e)=>{
            e.preventDefault();
            setIsDragging(true);
        },
        onDragLeave: ()=>setIsDragging(false),
        onDrop: onDrop,
        onClick: ()=>{
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.tsv,.xlsx,.json';
            input.onchange = (e)=>{
                const file = e.target.files?.[0];
                if (file) handleFile(file);
            };
            input.click();
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-4xl text-gray-400",
                    children: "📄"
                }, void 0, false, {
                    fileName: "[project]/src/components/FileDropzone.tsx",
                    lineNumber: 134,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-lg font-medium text-gray-900",
                    children: "Drop your data file here"
                }, void 0, false, {
                    fileName: "[project]/src/components/FileDropzone.tsx",
                    lineNumber: 137,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-gray-500",
                    children: "Support for CSV, TSV, XLSX, and JSON files"
                }, void 0, false, {
                    fileName: "[project]/src/components/FileDropzone.tsx",
                    lineNumber: 140,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/FileDropzone.tsx",
            lineNumber: 133,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/FileDropzone.tsx",
        lineNumber: 113,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/components/ColumnGrid.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ColumnCard",
    ()=>ColumnCard,
    "ColumnGrid",
    ()=>ColumnGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/state/store.ts [app-ssr] (ecmascript)");
;
;
;
;
const Plot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(async ()=>{}, {
    loadableGenerated: {
        modules: [
            "[project]/node_modules/react-plotly.js/react-plotly.js [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
const ColumnCard = ({ columnName })=>{
    const { dataset, setSelectedColumn } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useStore"])();
    const profile = dataset?.profiles[columnName];
    if (!profile) return null;
    const getChartData = ()=>{
        switch(profile.type){
            case 'numeric':
                return {
                    data: [
                        {
                            type: 'box',
                            y: dataset?.data.map((row)=>row[columnName]),
                            name: columnName
                        }
                    ],
                    layout: {
                        title: columnName,
                        height: 200,
                        margin: {
                            t: 30,
                            r: 10,
                            l: 40,
                            b: 30
                        }
                    }
                };
            case 'categorical':
                const counts = {};
                dataset?.data.forEach((row)=>{
                    const val = row[columnName];
                    counts[val] = (counts[val] || 0) + 1;
                });
                return {
                    data: [
                        {
                            type: 'bar',
                            x: Object.keys(counts),
                            y: Object.values(counts),
                            name: columnName
                        }
                    ],
                    layout: {
                        title: columnName,
                        height: 200,
                        margin: {
                            t: 30,
                            r: 10,
                            l: 40,
                            b: 70
                        },
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow",
        onClick: ()=>setSelectedColumn(columnName),
        children: [
            chartData && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Plot, {
                data: chartData.data,
                layout: chartData.layout,
                config: {
                    displayModeBar: false
                }
            }, void 0, false, {
                fileName: "[project]/src/components/ColumnGrid.tsx",
                lineNumber: 66,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-2 space-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "font-medium text-gray-900",
                                children: columnName
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-gray-500",
                                children: profile.type
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ColumnGrid.tsx",
                        lineNumber: 73,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-xs text-gray-500 space-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    profile.stats.count,
                                    " rows"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "•"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    profile.stats.nullCount,
                                    " null"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 80,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "•"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    profile.stats.uniqueCount,
                                    " unique"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnGrid.tsx",
                                lineNumber: 82,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ColumnGrid.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ColumnGrid.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ColumnGrid.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const ColumnGrid = ()=>{
    const { dataset } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useStore"])();
    if (!dataset) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        children: dataset.columns.map((columnName)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ColumnCard, {
                columnName: columnName
            }, columnName, false, {
                fileName: "[project]/src/components/ColumnGrid.tsx",
                lineNumber: 97,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)))
    }, void 0, false, {
        fileName: "[project]/src/components/ColumnGrid.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/src/components/PipelineView.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PipelineView",
    ()=>PipelineView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/state/store.ts [app-ssr] (ecmascript)");
;
;
const PipelineView = ()=>{
    const { pipeline, removePipelineStep, undo, redo, pastDatasets, futureDatasets } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useStore"])();
    const getTransformationLabel = (type)=>{
        switch(type){
            case 'impute':
                return 'Impute Missing Values';
            case 'normalize':
                return 'Normalize';
            case 'deduplicate':
                return 'Remove Duplicates';
            case 'outlier_remove':
                return 'Remove Outliers';
            case 'type_convert':
                return 'Convert Type';
            case 'rename':
                return 'Rename Column';
            default:
                return type;
        }
    };
    if (pipeline.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gray-50 rounded-lg p-8 text-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-500",
                children: "No transformations applied yet"
            }, void 0, false, {
                fileName: "[project]/src/components/PipelineView.tsx",
                lineNumber: 22,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/components/PipelineView.tsx",
            lineNumber: 21,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-medium text-gray-900",
                        children: "Transformation Pipeline"
                    }, void 0, false, {
                        fileName: "[project]/src/components/PipelineView.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: undo,
                                disabled: !pastDatasets || pastDatasets.length === 0,
                                className: "px-3 py-1 bg-gray-100 rounded disabled:opacity-40",
                                children: "Undo"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PipelineView.tsx",
                                lineNumber: 32,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: redo,
                                disabled: !futureDatasets || futureDatasets.length === 0,
                                className: "px-3 py-1 bg-gray-100 rounded disabled:opacity-40",
                                children: "Redo"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PipelineView.tsx",
                                lineNumber: 33,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PipelineView.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/PipelineView.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: pipeline.map((step)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between bg-white rounded-lg p-4 shadow-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center space-x-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-blue-600 text-sm",
                                            children: pipeline.indexOf(step) + 1
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/PipelineView.tsx",
                                            lineNumber: 44,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PipelineView.tsx",
                                        lineNumber: 43,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "font-medium text-gray-900",
                                                children: getTransformationLabel(step.type)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/PipelineView.tsx",
                                                lineNumber: 47,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-500",
                                                children: [
                                                    "Column: ",
                                                    step.column
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/PipelineView.tsx",
                                                lineNumber: 50,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/PipelineView.tsx",
                                        lineNumber: 46,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PipelineView.tsx",
                                lineNumber: 42,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>removePipelineStep(step.id),
                                className: "text-gray-400 hover:text-red-500 transition-colors",
                                children: "✕"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PipelineView.tsx",
                                lineNumber: 55,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, step.id, true, {
                        fileName: "[project]/src/components/PipelineView.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)))
            }, void 0, false, {
                fileName: "[project]/src/components/PipelineView.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/PipelineView.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/src/components/ColumnInspector.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ColumnInspector",
    ()=>ColumnInspector,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/state/store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/transformations.ts [app-ssr] (ecmascript)");
;
"use client";
;
;
;
;
;
const Plot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(async ()=>{}, {
    loadableGenerated: {
        modules: [
            "[project]/node_modules/react-plotly.js/react-plotly.js [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
const ColumnInspector = ()=>{
    const { dataset, selectedColumn, commitTransformation, setSelectedColumn } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useStore"])();
    const profile = selectedColumn ? dataset?.profiles[selectedColumn] : null;
    // Local UI params for transformations
    const [imputeStrategy, setImputeStrategy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('auto');
    const [customImputeValue, setCustomImputeValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [normalizeMethod, setNormalizeMethod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('min-max');
    const [replaceFrom, setReplaceFrom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [replaceTo, setReplaceTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [replaceIgnoreCase, setReplaceIgnoreCase] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const chart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!dataset || !selectedColumn || !profile) return null;
        if (profile.type === 'numeric') {
            return {
                data: [
                    {
                        type: 'histogram',
                        x: dataset.data.map((d)=>Number(d[selectedColumn])),
                        marker: {
                            color: '#2563eb'
                        }
                    }
                ],
                layout: {
                    title: selectedColumn,
                    height: 320,
                    margin: {
                        t: 36
                    }
                }
            };
        }
        const counts = {};
        dataset.data.forEach((row)=>{
            const v = String(row[selectedColumn]);
            counts[v] = (counts[v] || 0) + 1;
        });
        return {
            data: [
                {
                    type: 'bar',
                    x: Object.keys(counts),
                    y: Object.values(counts),
                    marker: {
                        color: '#10b981'
                    }
                }
            ],
            layout: {
                title: selectedColumn,
                height: 320,
                margin: {
                    t: 36,
                    b: 120
                },
                xaxis: {
                    tickangle: -45
                }
            }
        };
    }, [
        dataset,
        selectedColumn,
        profile
    ]);
    if (!dataset || !selectedColumn || !profile) return null;
    const doImpute = ()=>{
        const custom = imputeStrategy === 'value' ? customImputeValue : undefined;
        const { dataset: newDs, step } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["imputeMissing"])(dataset, selectedColumn, imputeStrategy, custom);
        commitTransformation(newDs, step);
    };
    const doNormalize = ()=>{
        const { dataset: newDs, step } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeColumn"])(dataset, selectedColumn, normalizeMethod);
        commitTransformation(newDs, step);
    };
    const doDedupe = ()=>{
        const { dataset: newDs, step } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dedupeByColumn"])(dataset, selectedColumn);
        commitTransformation(newDs, step);
    };
    const doReplace = ()=>{
        if (!replaceFrom) return;
        const { dataset: newDs, step } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["replaceValues"])(dataset, selectedColumn, replaceFrom, replaceTo, {
            ignoreCase: replaceIgnoreCase
        });
        commitTransformation(newDs, step);
    };
    const doDrop = ()=>{
        const ok = window.confirm(`Drop column "${selectedColumn}"? This will remove the column from the dataset.`);
        if (!ok) return;
        const { dataset: newDs, step } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transformations$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dropColumn"])(dataset, selectedColumn);
        commitTransformation(newDs, step);
    };
    return(// Mobile-first: full-screen panel. On small+ screens (sm >= 640px) show as right slide-over (w-96)
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: "fixed inset-0 p-4 bg-white z-50 overflow-y-auto transition-all duration-200 ease-out sm:inset-auto sm:top-24 sm:right-6 sm:w-96 sm:rounded-lg sm:shadow-lg sm:border",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-lg font-semibold text-gray-900",
                                children: selectedColumn
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-500",
                                children: [
                                    "Type: ",
                                    profile.type
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 82,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ColumnInspector.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        "aria-label": "close inspector",
                        onClick: ()=>setSelectedColumn(null),
                        className: "text-gray-500 hover:text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 px-2 py-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Close inspector"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                xmlns: "http://www.w3.org/2000/svg",
                                className: "h-5 w-5",
                                viewBox: "0 0 20 20",
                                fill: "currentColor",
                                "aria-hidden": true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    fillRule: "evenodd",
                                    d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
                                    clipRule: "evenodd"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ColumnInspector.tsx",
                                    lineNumber: 91,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 90,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ColumnInspector.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ColumnInspector.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3",
                children: chart && // @ts-ignore - Plot's types are heavy; runtime import is used.
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Plot, {
                    data: chart.data,
                    layout: {
                        ...chart.layout,
                        autosize: true
                    },
                    useResizeHandler: true,
                    style: {
                        width: '100%',
                        height: '320px'
                    },
                    config: {
                        responsive: true,
                        displayModeBar: false
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/ColumnInspector.tsx",
                    lineNumber: 99,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/ColumnInspector.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-sm text-gray-600",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Rows: ",
                                    profile.stats.count
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 111,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Nulls: ",
                                    profile.stats.nullCount
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 112,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    "Uniques: ",
                                    profile.stats.uniqueCount
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 113,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ColumnInspector.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "block text-xs text-gray-500",
                                children: "Imputation strategy"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 117,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: imputeStrategy,
                                        onChange: (e)=>setImputeStrategy(e.target.value),
                                        className: "flex-1 rounded border px-2 py-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "auto",
                                                children: "Auto"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 124,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "mean",
                                                children: "Mean"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 125,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "median",
                                                children: "Median"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 126,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "mode",
                                                children: "Mode"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 127,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "value",
                                                children: "Custom value"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 128,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 119,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    imputeStrategy === 'value' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        value: customImputeValue,
                                        onChange: (e)=>setCustomImputeValue(e.target.value),
                                        placeholder: "value",
                                        className: "w-28 rounded border px-2 py-1"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 131,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: doImpute,
                                        className: "px-3 py-1 bg-blue-600 text-white rounded",
                                        children: "Apply"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 138,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 118,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            profile.type === 'numeric' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-xs text-gray-500",
                                        children: "Normalize"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 143,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2 mt-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: normalizeMethod,
                                                onChange: (e)=>setNormalizeMethod(e.target.value),
                                                className: "flex-1 rounded border px-2 py-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "min-max",
                                                        children: "Min-Max"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                                        lineNumber: 146,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "zscore",
                                                        children: "Z-score"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                                        lineNumber: 147,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 145,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: doNormalize,
                                                className: "px-3 py-1 bg-indigo-600 text-white rounded",
                                                children: "Apply"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 149,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 144,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 142,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-1 gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs text-gray-500",
                                                children: "Find & replace (categorical)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 156,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        value: replaceFrom,
                                                        onChange: (e)=>setReplaceFrom(e.target.value),
                                                        placeholder: "from",
                                                        className: "flex-1 rounded border px-2 py-1"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                                        lineNumber: 158,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        value: replaceTo,
                                                        onChange: (e)=>setReplaceTo(e.target.value),
                                                        placeholder: "to",
                                                        className: "flex-1 rounded border px-2 py-1"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                                        lineNumber: 159,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 157,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "text-sm",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "checkbox",
                                                                checked: replaceIgnoreCase,
                                                                onChange: (e)=>setReplaceIgnoreCase(e.target.checked),
                                                                className: "mr-2"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                                lineNumber: 162,
                                                                columnNumber: 44
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            " Ignore case"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                                        lineNumber: 162,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: doReplace,
                                                        className: "ml-auto px-3 py-1 bg-yellow-500 text-white rounded",
                                                        children: "Replace"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                                        lineNumber: 163,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 161,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 155,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: doDedupe,
                                                className: "w-full mb-2 px-3 py-2 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition",
                                                children: "Remove duplicates"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 168,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: doDrop,
                                                className: "w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition",
                                                children: "Drop column"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                                lineNumber: 169,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/ColumnInspector.tsx",
                                        lineNumber: 167,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ColumnInspector.tsx",
                                lineNumber: 154,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ColumnInspector.tsx",
                        lineNumber: 116,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ColumnInspector.tsx",
                lineNumber: 109,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ColumnInspector.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
};
const __TURBOPACK__default__export__ = ColumnInspector;
}),
"[project]/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$FileDropzone$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/FileDropzone.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ColumnGrid$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ColumnGrid.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PipelineView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/PipelineView.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ColumnInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ColumnInspector.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/state/store.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
function Home() {
    const selectedColumn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$state$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useStore"])((s)=>s.selectedColumn);
    // when inspector is open on wide screens, add right padding to avoid overlap
    const containerClasses = `container mx-auto px-4 py-8 ${selectedColumn ? 'sm:pr-96 lg:pr-0' : ''}`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen bg-white",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: containerClasses,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-4xl font-bold text-gray-900 mb-8",
                    children: "CleanPilot: Data Cleaning Playground"
                }, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$FileDropzone$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FileDropzone"], {}, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 23,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ColumnGrid$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ColumnGrid"], {}, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 24,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PipelineView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PipelineView"], {}, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 25,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ColumnInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 22,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a5b21a81._.js.map