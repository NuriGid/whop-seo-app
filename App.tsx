import React, { useState, useEffect } from 'react';
// @ts-ignore - Bypass TS errors for SDK import issues
import { WhopAPI } from '@whop-apps/sdk';
import ResultCard from './components/ResultCard';
import { analyzeCourseText } from './services/geminiService';
import { AnalysisResult, WhopProduct } from './types';

const App: React.FC = () => {
  const [courseText, setCourseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<WhopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. SDK INIT
  useEffect(() => {
    const initWhop = async () => {
      try {
        console.log("🔄 Initializing Whop SDK...");

        // Force SDK usage via 'any' to bypass 'connect does not exist' TS errors
        const SDK = WhopAPI as any;

        // App ID from Whop Developer Dashboard
        const YOUR_APP_ID = 'app_womUHsVbtRHsMx';

        // Connect & Handshake
        await SDK.connect({ appId: YOUR_APP_ID });
        const token = await SDK.getAccessToken();

        if (!token) {
          throw new Error("No token received from SDK.");
        }

        console.log("✅ Token received.");
        await fetchProducts(token);

      } catch (err: any) {
        console.error("SDK Error:", err);
        // User-friendly error
        setError('Authentication failed. Please open this app inside the Whop Dashboard.');
        setLoadingProducts(false);
      }
    };

    initWhop();
  }, []);

  // 2. FETCH PRODUCTS
  const fetchProducts = async (token: string) => {
    try {
      const response = await fetch('/api/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) throw new Error('Failed to load courses.');

      const data = await response.json();
      const productList = Array.isArray(data) ? data : (data.data || []);
      setProducts(productList);
      setError(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setIsDropdownOpen(false);
    const product = products.find(p => p.id === productId);
    if (product) setCourseText(product.description || `Course: ${product.name}`);
  };

  const handleAnalyzeClick = async () => {
    if (!courseText.trim()) return;
    setIsLoading(true);
    setResult(null);
    setError(null);
    try {
      const analysisResult = await analyzeCourseText(courseText);
      setResult(analysisResult);
    } catch (err: any) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!result) return;
    const textToCopy = `🎯 MARKETING CONTENT\n\n📱 TWITTER:\n${result.twitterThread}\n\n📧 EMAIL:\n${result.salesEmail}\n\n📸 INSTAGRAM:\n${result.instagramPost}\n\n🎬 TIKTOK:\n${result.tiktokScript}`;
    try { await navigator.clipboard.writeText(textToCopy); alert('Copied!'); } catch (e) { }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Content Marketing Assistant</h1>
        <p className="text-gray-400 mb-8">Generate viral content instantly.</p>

        <div className="space-y-6 mt-8">
          {/* DROPDOWN - Fixed Z-Index to 100 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 relative z-[100]">
            <label className="block text-sm font-medium text-gray-300 mb-2">Select a Course</label>

            {loadingProducts ? (
              <div className="text-gray-400">Loading courses...</div>
            ) : (
              <div className="relative custom-dropdown">
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-xl flex justify-between items-center">
                  <span>{products.find(p => p.id === selectedProduct)?.name || '-- Select a Course --'}</span>
                  <span className="text-gray-400">▼</span>
                </button>
                {isDropdownOpen && (
                  <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-60 overflow-y-auto shadow-xl z-[101]">
                    {products.map((p) => (
                      <div key={p.id} onClick={() => handleProductSelect(p.id)} className="p-3 hover:bg-indigo-600/20 cursor-pointer border-b border-gray-800 last:border-0">
                        {p.name}
                      </div>
                    ))}
                    {products.length === 0 && <div className="p-3 text-gray-500">No courses found.</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INPUT - Z-Index 0 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 relative z-0">
            <textarea
              className="w-full h-40 p-3 bg-gray-900 border border-gray-600 rounded-md text-white"
              placeholder="Course description..." value={courseText} onChange={(e) => setCourseText(e.target.value)} />
            <button onClick={handleAnalyzeClick} disabled={isLoading || !courseText.trim()} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md">
              {isLoading ? 'Generating...' : 'Generate Content'}
            </button>
          </div>

          {error && <div className="text-red-400 bg-red-900/20 p-4 rounded font-bold border border-red-500">{error}</div>}

          {result && (
            <>
              <ResultCard result={result} />
              <button onClick={handleUpdateProduct} className="w-full bg-green-600 py-3 rounded-md font-bold text-white">Copy All Content</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
