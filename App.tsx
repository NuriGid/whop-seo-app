import React, { useState, useEffect, useCallback } from 'react';
import { WhopProduct, AnalysisResult } from './types';
import { analyzeCourseText } from './services/geminiService';
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

        // Whop automatically injects auth headers in iframe requests
        // We use 'credentials: include' to send cookies
        const response = await fetch('/api/products', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            throw new Error('Authentication failed. Please refresh the page or re-open the app from Whop.');
          }

          throw new Error(errorData.message || errorData.error || `Failed to fetch products: ${response.status}`);
        }

        const data = await response.json();
        const products: WhopProduct[] = data.data || [];

        console.log(`✅ Loaded ${products.length} products`);

        setState(prev => ({
          ...prev,
          isLoading: false,
          products,
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
  const handleSelectProduct = useCallback((product: WhopProduct) => {
    setState(prev => ({
      ...prev,
      selectedProduct: product,
      analysisResult: null,
      analysisError: null,
    }));
  }, []);

  // Handle analysis
  const handleAnalyze = useCallback(async () => {
    if (!state.selectedProduct) return;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null }));

    try {
      const productDescription = `
        Product Name: ${state.selectedProduct.name || state.selectedProduct.title || 'Unknown'}
        Description: ${state.selectedProduct.description || 'No description available'}
      `.trim();

      // analyzeCourseText will make request with credentials
      const result = await analyzeCourseText(productDescription);

      // Validate result has required fields
      if (!result.twitterThread || !result.salesEmail || !result.instagramPost || !result.tiktokScript) {
        throw new Error('Analysis returned incomplete results. Please try again.');
      }

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisResult: result,
      }));

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisError: error instanceof Error ? error.message : 'Analysis failed',
      }));
    }
  }, [state.selectedProduct]);

  // Not in Whop iframe error state
  if (!state.isInWhop && !state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-300 mb-2">Access Denied</h2>
          <p className="text-gray-300">{state.productsError}</p>
          <p className="text-gray-400 text-sm mt-4">
            This app must be opened from within Whop.
          </p>
        </div>
      </div>
    );
  }

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Whop Content Marketing Assistant
        </h1>

        {/* Products Error */}
        {state.productsError && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{state.productsError}</p>
          </div>
        )}

        {/* No Products */}
        {!state.productsError && state.products.length === 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No courses found</h2>
            <p className="text-gray-400">
              You don't have any products in your Whop company yet.
            </p>
          </div>
        )}

        {/* Products List */}
        {state.products.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Select a Product to Analyze</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.products.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={`p-4 rounded-lg border transition-all text-left ${state.selectedProduct?.id === product.id
                      ? 'bg-blue-600/30 border-blue-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                    }`}
                >
                  <h3 className="font-semibold text-gray-100 truncate">
                    {product.name || product.title || 'Unnamed Product'}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Product */}
        {state.selectedProduct && (
          <div className="mb-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">
                Selected: {state.selectedProduct.name || state.selectedProduct.title}
              </h3>
              <p className="text-gray-400 mb-4">
                {state.selectedProduct.description || 'No description available'}
              </p>
              <button
                onClick={handleAnalyze}
                disabled={state.isAnalyzing}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all"
              >
                {state.isAnalyzing ? 'Generating Content...' : 'Generate Marketing Content'}
              </button>
            </div>
          </div>
        )}

        {/* Analysis Loading */}
        {state.isAnalyzing && (
          <div className="flex justify-center">
            <Loader />
          </div>
        )}

        {/* Analysis Error */}
        {state.analysisError && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{state.analysisError}</p>
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
