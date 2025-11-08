"use client";

import { FileDropzone } from '@/components/FileDropzone';
import { ColumnGrid } from '@/components/ColumnGrid';
import { PipelineView } from '@/components/PipelineView';
import ColumnInspector from '@/components/ColumnInspector';
import { useStore } from '@/state/store';

export default function Home() {
  const selectedColumn = useStore((s) => s.selectedColumn);

  // when inspector is open on wide screens, add right padding to avoid overlap
  const containerClasses = `container mx-auto px-4 py-8 ${selectedColumn ? 'md:pr-96' : ''}`;

  return (
    <main className="min-h-screen bg-white">
      <div className={containerClasses}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          CleanPilot: Data Cleaning Playground
        </h1>

        <div className="space-y-8">
          <FileDropzone />
          <ColumnGrid />
          <PipelineView />
          <ColumnInspector />
        </div>
      </div>
    </main>
  );
}