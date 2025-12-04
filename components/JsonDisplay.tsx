import React from 'react';
import { AnalysisResult } from '../types';

interface JsonDisplayProps {
  result: AnalysisResult;
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({ result }) => {
  const jsonString = JSON.stringify(result, null, 2);

  return (
    <div className="w-full max-w-2xl mt-6">
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Raw JSON Output</h3>
      <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-4">
        <pre className="text-sm text-gray-200 whitespace-pre-wrap break-all">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
};

export default JsonDisplay;
