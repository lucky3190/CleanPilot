import { useStore } from '@/state/store';
import { TransformationType } from '@/lib/types';

export const PipelineView: React.FC = () => {
  const { pipeline, removePipelineStep } = useStore();

  const getTransformationLabel = (type: TransformationType): string => {
    switch (type) {
      case 'impute': return 'Impute Missing Values';
      case 'normalize': return 'Normalize';
      case 'deduplicate': return 'Remove Duplicates';
      case 'outlier_remove': return 'Remove Outliers';
      case 'type_convert': return 'Convert Type';
      case 'rename': return 'Rename Column';
      default: return type;
    }
  };

  if (pipeline.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">No transformations applied yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Transformation Pipeline</h2>
      <div className="space-y-2">
        {pipeline.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-sm">{pipeline.indexOf(step) + 1}</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {getTransformationLabel(step.type)}
                </h3>
                <p className="text-sm text-gray-500">
                  Column: {step.column}
                </p>
              </div>
            </div>
            <button
              onClick={() => removePipelineStep(step.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};