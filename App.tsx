import React, { useState, useEffect } from 'react';
import { analyzeCourseText } from './services/geminiService';
import { AnalysisResult, WhopProduct } from './types';
import ResultCard from './components/ResultCard';

// Declare global Whop SDK type
declare global {
  interface Window {
    Whop?: {
      getAccessToken: () => Promise<string>;
    };
  }
}

const App: React.FC = () => {
  const [courseText, setCourseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<WhopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. SECURE LOGIN (Whop SDK)
  useEffect(() => {
    const initWhop = async () => {
      try {
        let token: string | null = null;
        
        // Check if Whop SDK is loaded (production)
        if (window.Whop) {
          token = await window.Whop.getAccessToken();
          console.log("✅ SDK Token alındı.");
        } else {
          // Local development mode - use mock token
          console.warn("⚠️ Local development mode - SDK not loaded");
          token = "mock_token_for_local_dev";
        }
        
        if (!token) {
          setError("Authentication failed. Please open from Whop dashboard.");
          setLoadingProducts(false);
          return;
        }
        
        // Ürünleri bu token ile çek
        await fetchProducts(token);
        
      } catch (err: any) {
        console.error("SDK Hatası:", err);
        setError('Bağlantı hatası: Uygulama Whop ile konuşamıyor.');
        setLoadingProducts(false);
      }
    };

    initWhop();
  }, []);

  // 2. FETCH PRODUCTS FUNCTION
  const fetchProducts = async (token: string) => {
    try {
      const response = await fetch('/api/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Anahtarı gönder
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Session unauthorized (401).');
        throw new Error('Failed to load products.');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      const productList = Array.isArray(data) ? data : (data.products || data.data || []);
      
      console.log('Product List:', productList); // Debug log
      setProducts(productList);
      // Hata varsa temizle
      setError(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch product list.');
    } finally {
      setLoadingProducts(false);
    }
  };

  // --- OTHER OPERATIONS ---

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setIsDropdownOpen(false);
    setError(null);
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
      setError('Analysis error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!result) return;
    const textToCopy = `🎯 İÇERİK

📱 TWITTER:
${result.twitter}

📧 EMAIL:
${result.email}

📸 INSTAGRAM:
${result.instagram}

🎬 TIKTOK:
${result.tiktok}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert('✅ Copied!');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Content Marketing Assistant</h1>
        
        <div className="space-y-6 mt-8">
            {/* COURSE SELECTION */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 relative z-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Course</label>
              
              {loadingProducts ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <div className="relative custom-dropdown">
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-xl flex justify-between items-center">
                    <span>{products.find(p => p.id === selectedProduct)?.name || '-- Select --'}</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-60 overflow-y-auto shadow-xl">
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

            {/* CONTENT INPUT */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <textarea
                className="w-full h-40 p-3 bg-gray-900 border border-gray-600 rounded-md text-white"
                placeholder="Content..." value={courseText} onChange={(e) => setCourseText(e.target.value)} />
              <button onClick={handleAnalyzeClick} disabled={isLoading || !courseText.trim()} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md">
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {error && <div className="text-red-400 bg-red-900/20 p-4 rounded">{error}</div>}

            {result && (
              <>
                <ResultCard result={result} />
                <button onClick={handleUpdateProduct} className="w-full bg-green-600 py-3 rounded-md font-bold text-white">Copy</button>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;
