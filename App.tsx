
import React, { useState, useEffect, useCallback } from 'react';
import { WhopProduct, AnalysisResult } from './types';
// import { analyzeCourseText } from './services/geminiService'; // REMOVED TO AVOID MODULE ISSUES
import ResultCard from './components/ResultCard';
import Loader from './components/Loader';

interface AppState {
  isLoading: boolean;
  isInWhop: boolean;
  products: WhopProduct[];
  productsError: string | null;
  selectedProduct: WhopProduct | null;
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
    analysisResult: null,
    isAnalyzing: false,
    analysisError: null,
  });

  // Check if we're in Whop iframe and fetch products
  useEffect(() => {
    const init = async () => {
      // Check if we're in an iframe (inside Whop)
      const isInIframe = window !== window.parent;

      if (!isInIframe) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInWhop: false,
          productsError: 'This app must be opened from within Whop. Please access it through your Whop dashboard.',
        }));
        return;
      }

      setState(prev => ({ ...prev, isInWhop: true }));

      try {
        console.log('📦 Fetching products from Whop API...');

        const response = await fetch('/api/products', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.message || errorData.error || `Error ${response.status}`;
          throw new Error(msg);
        }

        const data = await response.json();
        const products: WhopProduct[] = data.data || [];

        // Auto-select first product if available
        const initialSelected = products.length > 0 ? products[0] : null;

        console.log(`✅ Loaded ${products.length} products`);

        setState(prev => ({
          ...prev,
          isLoading: false,
          products,
          selectedProduct: initialSelected,
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

  // Handle product selection via Dropdown
  const handleSelectProduct = useCallback((productId: string) => {
    const product = state.products.find(p => p.id === productId) || null;
    setState(prev => ({
      ...prev,
      selectedProduct: product,
      analysisResult: null,
      analysisError: null,
    }));
  }, [state.products]);

  // Handle analysis (CLEAN INLINED VERSION)
  const handleAnalyze = useCallback(async () => {
    if (!state.selectedProduct) return;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null }));

    try {
      const productDescription = `
        Product Name: ${state.selectedProduct.name || state.selectedProduct.title || 'Unknown'}
        Description: ${state.selectedProduct.description || 'No description available'}
      `.trim();

      console.log("🚀 Starting Analysis...");

      const response = await fetch('/api/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: productDescription })
      });

      console.log(`📡 Response Status: ${response.status}`);

      if (!response.ok) {
        const errText = await response.text();
        console.error("Backend Error:", errText);
        throw new Error(`Analysis Failed (${response.status})`);
      }

      const result = await response.json();
      console.log("✅ Data Received:", Object.keys(result));

      if (result.logs) {
        console.log("--- Backend Logs ---", result.logs);
      }

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
  }, [state.selectedProduct]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Whop Content Marketing Assistant
        </h1>

        {/* Not in Whop Error */}
        {!state.isInWhop && !state.isLoading && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{state.productsError}</p>
          </div>
        )}

        {/* Products API Error */}
        {state.isInWhop && state.productsError && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{state.productsError}</p>
          </div>
        )}

        {/* No Courses Found */}
        {!state.productsError && state.products.length === 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No courses found</h2>
            <div className="flex justify-center mt-4">
              <div className="p-2 rounded-full bg-[#2a2a2a] text-gray-400" title="Running in Whop">
                <span className="font-mono text-xs">&lt;/&gt;</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Interface */}
        {state.products.length > 0 && (
          <>
            {/* Select Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Course
              </label>
              <div className="relative">
                <select
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
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
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Selected Product Info & Generate */}
            {state.selectedProduct && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-2 font-medium">Description</p>
                  <div className="w-full bg-gray-900/50 rounded-lg p-4 text-gray-300 min-h-[80px] text-sm leading-relaxed border border-gray-700/50">
                    {state.selectedProduct.description || 'No description available for this product.'}
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={state.isAnalyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg shadow-blue-900/20 text-lg"
                >
                  {state.isAnalyzing ? 'Generating Content...' : 'Generate'}
                </button>
              </div>
            )}
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
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 animate-pulse">
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
