import React, { useState, useEffect } from 'react';
// @ts-ignore
import { WhopApp } from '@whop-apps/sdk';
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

  // 1. SDK GİRİŞ
  useEffect(() => {
    const initWhop = async () => {
      try {
        const SDK = WhopApp as any;
        await SDK.connect();
        const token = await SDK.getAccessToken();

        if (!token) {
          setError("Lütfen uygulamayı Whop panelinden açın (Authentication Required).");
          setLoadingProducts(false);
          return;
        }

        await fetchProducts(token);

      } catch (err: any) {
        console.error("SDK Hatası:", err);
        setError('Bağlantı hatası: Uygulama Whop ile konuşamıyor.');
        setLoadingProducts(false);
      }
    };

    initWhop();
  }, []);

  const fetchProducts = async (token: string) => {
    try {
      const response = await fetch('/api/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) throw new Error('Ürünler yüklenemedi.');

      const data = await response.json();
      const productList = Array.isArray(data) ? data : (data.data || []);
      setProducts(productList);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 2. ÜRÜN SEÇİMİ
  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setIsDropdownOpen(false);
    setError(null);
    setResult(null);

    const product = products.find(p => p.id === productId);

    if (product) {
      const initialText = product.description && product.description.trim().length > 0
        ? product.description
        : `Kurs Adı: ${product.name}\n\n(Bu kursun Whop'ta açıklaması yok. Lütfen buraya kurs hakkında kısa bilgi girin...)`;

      setCourseText(initialText);
    }
  };

  // 3. ANALİZ İŞLEMİ
  const handleAnalyzeClick = async () => {
    if (!courseText.trim()) {
      setError("Lütfen kutuya analiz edilecek bir metin girin.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log("🚀 Analiz başlatılıyor...");
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: courseText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Sunucu Hatası: ${response.status}`);
      }

      setResult(data);

    } catch (err: any) {
      setError('Analiz hatası: ' + (err.message || "Bilinmeyen bir hata oluştu."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!result) return;
    const textToCopy = `🎯 İÇERİK\n\n📱 TWITTER:\n${result.twitter}\n\n📧 EMAIL:\n${result.email}\n\n📸 INSTAGRAM:\n${result.instagram}\n\n🎬 TIKTOK:\n${result.tiktok}`;
    try { await navigator.clipboard.writeText(textToCopy); alert('Kopyalandı!'); } catch (e) { }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Content Marketing Assistant</h1>

        <div className="space-y-6 mt-8">
          {/* KURS SEÇİMİ - Z-INDEX DÜZELTİLDİ (z-50 -> z-[100]) */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 relative z-[100]">
            <label className="block text-sm font-medium text-gray-300 mb-2">Kurs Seçin</label>

            {loadingProducts ? (
              <div className="text-gray-400">Yükleniyor...</div>
            ) : (
              <div className="relative custom-dropdown">
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 bg-gray-900 border border-gray-600 rounded-xl flex justify-between items-center">
                  <span>{products.find(p => p.id === selectedProduct)?.name || '-- Seçiniz --'}</span>
                  <span className="text-gray-400">▼</span>
                </button>
                {isDropdownOpen && (
                  <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-60 overflow-y-auto shadow-xl z-[101]">
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

          {/* İÇERİK GİRİŞİ - Z-INDEX DÜŞÜRÜLDÜ (Varsayılan) */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 relative z-0">
            <textarea
              className="w-full h-40 p-3 bg-gray-900 border border-gray-600 rounded-md text-white"
              placeholder="İçerik..." value={courseText} onChange={(e) => setCourseText(e.target.value)} />
            <button onClick={handleAnalyzeClick} disabled={isLoading || !courseText.trim()} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md">
              {isLoading ? 'Üretiliyor...' : 'İçerik Üret'}
            </button>
          </div>

          {error && <div className="text-red-400 bg-red-900/20 p-4 rounded font-bold border border-red-500">{error}</div>}

          {result && (
            <>
              <ResultCard result={result} />
              <button onClick={handleUpdateProduct} className="w-full bg-green-600 py-3 rounded-md font-bold text-white">Tümünü Kopyala</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
