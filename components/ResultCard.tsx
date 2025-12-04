
import React from 'react';
import { AnalysisResult } from '../types';

interface ResultCardProps {
  result: AnalysisResult;
}

const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 8V5a2 2 0 012-2z" />
  </svg>
);

const CategoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);


const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  return (
    <div className="w-full max-w-2xl mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-100 flex items-center mb-3">
            <TagIcon className="w-6 h-6 mr-2 text-indigo-400" />
            Top 5 Keywords
        </h3>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((keyword, index) => (
            <span key={index} className="bg-indigo-500/20 text-indigo-300 text-sm font-medium px-3 py-1.5 rounded-full border border-indigo-500/30">
              {keyword}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-100 flex items-center mb-3">
            <CategoryIcon className="w-6 h-6 mr-2 text-green-400" />
            Suggested Whop Categories
        </h3>
        <ul className="space-y-2">
          {result.categories.map((category, index) => (
            <li key={index} className="bg-green-500/10 text-green-300 text-sm font-medium px-4 py-2 rounded-md border border-green-500/20">
              {category}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResultCard;
