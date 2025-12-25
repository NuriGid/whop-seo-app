import React, { useState, useEffect } from 'react';
import { analyzeCourseText } from './services/geminiService';
import { AnalysisResult, WhopProduct } from './types';
import Loader from './components/Loader';
import ResultCard from './components/ResultCard';
import JsonDisplay from './components/JsonDisplay';

const App: React.FC = () => {
  const [courseText, setCourseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<WhopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  // Ürünleri Çek
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. TOKEN YÖNETİMİ
        // Token'ı URL'den yakala
        let accessToken = urlParams.get('access_token') || urlParams.get('token');
        
        // Varsa hafızaya at, yoksa hafızadan oku (Sayfa yenileme koruması)
        if (accessToken) {
            sessionStorage.setItem('whop_access_token', accessToken);
        } else {
            accessToken = sessionStorage.getItem('whop_access_token');
        }

        // Token yoksa işlemi durdur (Güvenlik)
        if (!accessToken) {
            console.warn('⚠️ Token bulunamadı! Whop iframe içinde olduğundan emin ol.');
            setError('Authentication failed. Please open this app inside Whop.');
            setLoadingProducts(false);
            return;
        }

        console.log('✅ Token aktif, Backend sorgulanıyor...');

        // 2. BACKEND İSTEĞİ (Pass-through)
        const response = await fetch('/api/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}` // Anahtarı gönderiyoruz
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // 401 ise token süresi dolmuş olabilir, hafızayı temizle
          if (response.status === 401) {
              sessionStorage.removeItem('whop_access_token');
              throw new Error('Oturum süresi doldu. Lütfen sayfayı yenileyin.');
          }
          
          throw new Error(`Failed to fetch: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const productList = Array.isArray(data) ? data : (data.data || []);
        
        setProducts(productList);
        console.log(`📦 ${productList.length} ürün yüklendi.`);

      } catch (err: any) {
        console.error('💥 Hata:', err);
        setError(err.message || 'Failed to load courses.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

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
    if (!courseText.trim()) {
      setError('Please enter some course content.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const analysisResult = await analyzeCourseText(courseText);
      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!result) return;
    const textToCopy = `🎯 MARKETING CONTENT\n\n📱 TWITTER:\n${result.twitter}\n\n📧 EMAIL:\n${result.email}\n\n📸 INSTAGRAM:\n${result.instagram}\n\n🎬 TIKTOK:\n${result.tiktok}`;

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
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded-xl flex justify-between items-center"
                  >
                    <span>{products.find(p => p.id === selectedProduct)?.name || '-- Select --'}</span>
                    <span className="text-gray-400">▼</span>
                  </button>

                  {isDropdownOpen && (
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
                className="w-full h-40 p-3 bg-gray-900/50 border border-gray-600 rounded-md"
                placeholder="Course description..."
                value={courseText}
                onChange={(e) => setCourseText(e.target.value)}
              />
              <button
                onClick={handleAnalyzeClick}
                disabled={isLoading || !courseText.trim()}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md"
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