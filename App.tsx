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

  // 1. GÜVENLİ GİRİŞ (Whop SDK)
  useEffect(() => {
    const initWhop = async () => {
      try {
        // Check if Whop SDK is loaded
        if (!window.Whop) {
          console.warn("Whop SDK not loaded");
          setError("Lütfen uygulamayı Whop panelinden açın (SDK not loaded).");
          setLoadingProducts(false);
          return;
        }
        
        // Kimliği (Token) al
        const token = await window.Whop.getAccessToken();
        
        if (!token) {
          console.warn("SDK Token vermedi.");
          // Local test için hata basma, ama Production için uyar
          setError("Lütfen uygulamayı Whop panelinden açın (Authentication Required).");
          setLoadingProducts(false);
          return;
        }
        
        console.log("✅ SDK Token alındı.");
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

  // 2. ÜRÜNLERİ ÇEKME FONKSİYONU
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
        if (response.status === 401) throw new Error('Oturum izni yok (401).');
        throw new Error('Ürünler yüklenemedi.');
      }

      const data = await response.json();
      const productList = Array.isArray(data) ? data : (data.data || []);
      
      setProducts(productList);
      // Hata varsa temizle
      setError(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ürün listesi alınamadı.');
    } finally {
      setLoadingProducts(false);
    }
  };

  // --- DİĞER İŞLEMLER ---

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setIsDropdownOpen(false);
    setError(null);
    const product = products.find(p => p.id === productId);
    if (product) setCourseText(product.description || `Kurs: ${product.name}`);
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
      setError('Analiz hatası: ' + err.message);
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
      alert('✅ Kopyalandı!');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Content Marketing Assistant</h1>
        
        <div className="space-y-6 mt-8">
            {/* KURS SEÇİMİ */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 relative z-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">Kurs Seçin</label>
              
              {loadingProducts ? (
                <div className="text-gray-400">Bağlanıyor...</div>
              ) : (
                <div className="relative custom-dropdown">
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-xl flex justify-between items-center">
                    <span>{products.find(p => p.id === selectedProduct)?.name || '-- Seçiniz --'}</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-60 overflow-y-auto shadow-xl">
                      {products.map((p) => (
                        <div key={p.id} onClick={() => handleProductSelect(p.id)} className="p-3 hover:bg-indigo-600/20 cursor-pointer border-b border-gray-800 last:border-0">
                          {p.name}
                        </div>
                      ))}
                      {products.length === 0 && <div className="p-3 text-gray-500">Kurs bulunamadı.</div>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* İÇERİK GİRİŞİ */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <textarea
                className="w-full h-40 p-3 bg-gray-900 border border-gray-600 rounded-md text-white"
                placeholder="İçerik..." value={courseText} onChange={(e) => setCourseText(e.target.value)} />
              <button onClick={handleAnalyzeClick} disabled={isLoading || !courseText.trim()} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md">
                {isLoading ? 'Üretiliyor...' : 'Üret'}
              </button>
            </div>

            {error && <div className="text-red-400 bg-red-900/20 p-4 rounded">{error}</div>}

            {result && (
              <>
                <ResultCard result={result} />
                <button onClick={handleUpdateProduct} className="w-full bg-green-600 py-3 rounded-md font-bold text-white">Kopyala</button>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;
