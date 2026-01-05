
import React, { useState, useEffect, useCallback } from 'react';
import { WhopProduct, AnalysisResult } from './types';
import ResultCard from './components/ResultCard';
import Loader from './components/Loader';

interface AppState {
  isLoading: boolean;
  isInWhop: boolean;
  products: WhopProduct[];
  productsError: string | null;
  selectedProduct: WhopProduct | null;
  courseDescription: string;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isInWhop: false,
    products: [],
    productsError: null,
    selectedProduct: null,
    courseDescription: '',
    analysisResult: null,
    isAnalyzing: false,
    analysisError: null,
  });

  // Build default description template
  const buildDescriptionTemplate = (productName: string) => {
    return `Course: ${productName}

Please add a detailed description of this course, including:
- What students will learn
- Course features
- Target audience`;
  };

  // Check if we're in Whop iframe and fetch products
  useEffect(() => {
    const init = async () => {
      const isInIframe = window !== window.parent;

      if (!isInIframe) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInWhop: false,
          productsError: 'This app must be opened from within Whop.',
        }));
        return;
      }

      setState(prev => ({ ...prev, isInWhop: true }));

      try {
        console.log('📦 Fetching products...');

        const response = await fetch('/api/products', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `Error ${response.status}`);
        }

        const data = await response.json();
        const products: WhopProduct[] = data.data || [];
        const initialSelected = products.length > 0 ? products[0] : null;
        const initialDescription = initialSelected
          ? buildDescriptionTemplate(initialSelected.name || initialSelected.title || 'Unknown')
          : '';

        setState(prev => ({
          ...prev,
          isLoading: false,
          products,
          selectedProduct: initialSelected,
          courseDescription: initialDescription,
          productsError: null,
        }));

      } catch (error) {
        console.error('❌ Failed to fetch products:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          products: [],
          productsError: error instanceof Error ? error.message : 'Failed to load products',
        }));
      }
    };

    init();
  }, []);

  // Handle product selection
  const handleSelectProduct = useCallback((productId: string) => {
    const product = state.products.find(p => p.id === productId) || null;
    const description = product
      ? buildDescriptionTemplate(product.name || product.title || 'Unknown')
      : '';
    setState(prev => ({
      ...prev,
      selectedProduct: product,
      courseDescription: description,
      analysisResult: null,
      analysisError: null,
    }));
  }, [state.products]);

  // Handle description change
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, courseDescription: e.target.value }));
  }, []);

  // Handle analysis
  const handleAnalyze = useCallback(async () => {
    if (!state.selectedProduct || !state.courseDescription.trim()) return;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null }));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: state.courseDescription })
      });

      if (!response.ok) {
        throw new Error(`Analysis Failed (${response.status})`);
      }

      const result = await response.json();

      const finalResult: AnalysisResult = {
        twitterThread: result.twitterThread || result.twitter || "No content generated.",
        salesEmail: result.salesEmail || result.email || "No content generated.",
        instagramPost: result.instagramPost || result.instagram || "No content generated.",
        tiktokScript: result.tiktokScript || result.tiktok || "No content generated."
      };

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisResult: finalResult,
      }));

    } catch (error) {
      console.error('❌ Analysis Error:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisError: error instanceof Error ? error.message : 'Analysis failed',
      }));
    }
  }, [state.selectedProduct, state.courseDescription]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-gray-100 p-6 relative overflow-hidden">
      {/* Stars Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-20 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-32 right-40 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-64 left-1/3 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute bottom-40 right-20 w-1 h-1 bg-white rounded-full"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold italic bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-3">
            Content Marketing Assistant
          </h1>
          <p className="text-gray-400 text-sm">
            Select a course and get AI-powered marketing content for Twitter, Email, and Instagram.
          </p>
        </div>

        {/* Error Display */}
        {state.productsError && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6">
            <p className="text-red-300">{state.productsError}</p>
          </div>
        )}

        {/* Main Content */}
        {state.products.length > 0 && (
          <>
            {/* Select Course Card */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-6">
              <label className="block text-center text-gray-300 font-medium mb-4">
                Select a Course
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400">
                  {/* Book Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <select
                  className="w-full bg-gray-900/80 border border-gray-600 text-white rounded-xl py-4 pl-12 pr-10 appearance-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                  value={state.selectedProduct?.id || ''}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                >
                  {state.products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name || product.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Course Description Card */}
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-6">
              <label className="block text-center text-gray-300 font-medium mb-4">
                Course Description (Auto-filled from selected course)
              </label>
              <textarea
                className="w-full bg-gray-900/80 border border-gray-600 text-gray-200 rounded-xl p-4 min-h-[150px] resize-y focus:ring-2 focus:ring-purple-500 focus:border-transparent leading-relaxed"
                value={state.courseDescription}
                onChange={handleDescriptionChange}
                placeholder="Enter course description..."
              />

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={state.isAnalyzing || !state.courseDescription.trim()}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg"
              >
                {state.isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
              </button>
            </div>
          </>
        )}

        {/* Analysis Loading */}
        {state.isAnalyzing && (
          <div className="flex justify-center mb-8">
            <Loader />
          </div>
        )}

        {/* Analysis Error */}
        {state.analysisError && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6">
            <p className="text-red-300 font-medium">Error: {state.analysisError}</p>
          </div>
        )}

        {/* Analysis Results */}
        {state.analysisResult && (
          <ResultCard result={state.analysisResult} />
        )}
      </div>
    </div>
  );
};

export default App;
