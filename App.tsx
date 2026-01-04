
import React, { useState, useEffect, useCallback } from 'react';
import { WhopProduct, AnalysisResult } from './types';
// import { analyzeCourseText } from './services/geminiService'; // REMOVED FOR DEBUGGING
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

        // Auto-select first product if available (User friendly)
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

  // Handle analysis (INLINED DEBUG VERSION)
  const handleAnalyze = useCallback(async () => {
    if (!state.selectedProduct) return;

    // DEBUG STEP 1
    const confirmStart = window.confirm("DEBUG: Analiz Başlatılıyor. Devam?");
    if (!confirmStart) return;

    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null }));

    try {
      const productDescription = `
        Product Name: ${state.selectedProduct.name || state.selectedProduct.title || 'Unknown'}
        Description: ${state.selectedProduct.description || 'No description available'}
      `.trim();

      // DEBUG STEP 2
      console.log("Fetching /api/analyze...");

      const response = await fetch('/api/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: productDescription })
      });

      // DEBUG STEP 3
      console.log(`Response Status: ${response.status}`);
      if (!response.ok) {
        const errText = await response.text();
        alert(`HATA: Backend ${response.status} döndü.\n${errText}`);
        throw new Error(`Backend Error ${response.status}`);
      }

      const result = await response.json();

      // DEBUG STEP 4
      alert(`Backend Yanıtı Geldi!\nKeys: ${Object.keys(result).join(', ')}`);

      if (result.logs) {
        console.log("---- SERVER LOGS ----");
        console.log(result.logs.join('\n'));
      }

      const finalResult: AnalysisResult = {
        twitterThread: result.twitterThread || result.twitter || "Veri Yok",
        salesEmail: result.salesEmail || result.email || "Veri Yok",
        instagramPost: result.instagramPost || result.instagram || "Veri Yok",
        tiktokScript: result.tiktokScript || result.tiktok || "Veri Yok"
      };

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisResult: finalResult,
      }));

      // DEBUG STEP 5
      alert("State Güncellendi! Ekran değişmeli.");

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      alert(`CATCH BLOĞU: ${error}`);
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

        {/* 🕵️‍♂️ DEBUGGER */}
        <div className="bg-black/30 border border-gray-700 p-2 rounded mb-6 text-xs font-mono text-gray-400">
          <p><strong>Debug Info:</strong></p>
          <p>Result: {state.analysisResult ? '📦 Data Var' : '❌ Veri Yok'}</p>
          {state.analysisError && <p className="text-red-400">Error: {state.analysisError}</p>}
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Course
          </label>

          {/* DROPDOWN UI (Restored) */}
          <div className="relative">
            <select
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={state.selectedProduct?.id || ''}
              onChange={(e) => handleSelectProduct(e.target.value)}
            >
              <option value="" disabled>Select a product...</option>
              {state.products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name || product.title}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Selected Product Details & Generate Button */}
        {state.selectedProduct && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">Description:</p>
              <div className="w-full bg-gray-900/50 rounded p-3 text-gray-300 min-h-[80px]">
                {state.selectedProduct.description || 'No description available for this product.'}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={state.isAnalyzing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-900/20"
            >
              {state.isAnalyzing ? 'Generating Content...' : 'Generate'}
            </button>
          </div>
        )}

        {/* Analysis Loading */}
        {state.isAnalyzing && (
          <div className="flex justify-center mb-8">
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
