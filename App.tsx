import React, { useState, useEffect } from 'react';
import { analyzeCourseText } from './services/geminiService';
import { AnalysisResult, WhopProduct } from './types';
import Loader from './components/Loader';
import ResultCard from './components/ResultCard';
import JsonDisplay from './components/JsonDisplay';

// 🔐 Whop SDK global type
declare global {
  interface Window {
    Whop?: {
      getAccessToken: () => Promise<string>;
    };
  }
}

/**
 * 🔐 AUTHENTICATION FUNCTION
 * Production: ONLY Whop SDK token allowed
 * Development: Fallback to URL params for testing
 */
const getAuthToken = async (): Promise<string | null> => {
  const isDev = process.env.NODE_ENV === 'development';
  
  // 1. Try Whop SDK first (preferred method)
  if (window.Whop && typeof window.Whop.getAccessToken === 'function') {
    try {
      const token = await window.Whop.getAccessToken();
      if (token) {
        console.log('✅ Token from Whop SDK');
        return token;
      }
    } catch (error) {
      console.error('⚠️ Whop SDK error:', error);
    }
  }
  
  // 2. Development fallback ONLY
  if (isDev) {
    console.log('🚧 DEV MODE: Checking URL params...');
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token') || urlParams.get('access_token');
    if (urlToken) {
      console.log('✅ Token from URL (dev only)');
      return urlToken;
    }
  }
  
  // 3. Production: NO FALLBACK
  console.error('❌ No authentication token available');
  return null;
};

const App: React.FC = () => {
  const [courseText, setCourseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<WhopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // 🔒 Auth gate
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Dropdown kapatma mantığı
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDropdownOpen && !target.closest('.custom-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // 🔐 AUTHENTICATION CHECK
  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken();
      
      if (token) {
        setAuthToken(token);
        setIsAuthenticated(true);
        console.log('✅ Authentication successful');
      } else {
        setIsAuthenticated(false);
        setLoadingProducts(false);
        console.error('❌ Authentication failed - app is locked in production');
      }
    };
    
    checkAuth();
  }, []);

  // Ürünleri Çek - ONLY if authenticated
  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      console.log('⚠️ Skipping product fetch - not authenticated');
      return;
    }

    const fetchProducts = async () => {
      try {
        console.log('✅ Fetching products with auth token...');

        // BACKEND İSTEĞİ (Pass-through)
        const response = await fetch('/api/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // 401 ise auth hatası
          if (response.status === 401) {
            setIsAuthenticated(false);
            throw new Error('AUTH_REQUIRED');
          }
          
          throw new Error(`Failed to fetch: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const productList = Array.isArray(data) ? data : (data.data || []);
        
        setProducts(productList);
        console.log(`📦 ${productList.length} products loaded.`);

      } catch (err: any) {
        console.error('💥 Error:', err);
        
        // Don't show generic errors when auth is missing
        if (err.message !== 'AUTH_REQUIRED') {
          setError(err.message || 'Failed to load courses.');
        }
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [isAuthenticated, authToken]);

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setIsDropdownOpen(false);
    setError(null);
    
    const product = products.find(p => p.id === productId);
    if (product) {
      if (product.description && product.description.trim()) {
        setCourseText(product.description);
      } else {
        setCourseText(`Course: ${product.name || 'Untitled'}\n\nPlease analyze this course...`);
      }
    }
  };

  const handleAnalyzeClick = async () => {
    // 🔒 Auth gate
    if (!isAuthenticated || !authToken) {
      setError('Authentication required. Please open this app inside Whop.');
      return;
    }
    
    if (!courseText.trim()) {
      setError('Please enter some course content.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const analysisResult = await analyzeCourseText(courseText, authToken || undefined);
      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!result) return;
    const textToCopy = `🎯 MARKETING CONTENT

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
      alert('✅ Copied to clipboard!');
    } catch (err) {
      console.error('Clipboard failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">
          Content Marketing Assistant
        </h1>
        <p className="text-gray-400 mb-8">
          Generate Twitter threads, Emails, and TikTok scripts instantly.
        </p>

        {/* 🔒 AUTH BANNER - Show if not authenticated */}
        {!isAuthenticated && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
            <p className="text-yellow-300 font-semibold">🔒 Authentication Required</p>
            <p className="text-yellow-200 text-sm mt-2">
              Please open this app inside Whop to access all features.
            </p>
          </div>
        )}

        <div className="space-y-6">
            {/* Dropdown */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 relative z-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select a Course</label>
              
              {loadingProducts ? (
                <div className="text-gray-400">Loading your courses...</div>
              ) : (
                <div className="relative custom-dropdown">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={!isAuthenticated} // 🔒 Disable if not authenticated
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded-xl flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{products.find(p => p.id === selectedProduct)?.name || '-- Select --'}</span>
                    <span className="text-gray-400">▼</span>
                  </button>

                  {isDropdownOpen && isAuthenticated && (
                    <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-60 overflow-y-auto shadow-xl">
                      {products.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleProductSelect(p.id)}
                          className="p-3 hover:bg-indigo-600/20 cursor-pointer border-b border-gray-800 last:border-0"
                        >
                          {p.name}
                        </div>
                      ))}
                      {products.length === 0 && (
                        <div className="p-3 text-gray-500">No courses found.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <textarea
                className="w-full h-40 p-3 bg-gray-900/50 border border-gray-600 rounded-md disabled:opacity-50"
                placeholder="Course description..."
                value={courseText}
                onChange={(e) => setCourseText(e.target.value)}
                disabled={!isAuthenticated} // 🔒 Disable if not authenticated
              />
              <button
                onClick={handleAnalyzeClick}
                disabled={!isAuthenticated || isLoading || !courseText.trim()} // 🔒 Disable if not authenticated
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Generate Content'}
              </button>
            </div>

            {error && <div className="text-red-400 bg-red-900/20 p-4 rounded">{error}</div>}

            {result && (
              <>
                <ResultCard result={result} />
                <button onClick={handleUpdateProduct} className="w-full bg-green-600 py-3 rounded-md font-bold">
                  Copy All Content
                </button>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;