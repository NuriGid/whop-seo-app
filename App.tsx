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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
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

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('🔍 Fetching products from /api/products...');
        const response = await fetch('/api/products');
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response OK:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', errorText);
          throw new Error(`Failed to fetch products: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Products data:', data);
        setProducts(data.data || data);
      } catch (err) {
        console.error('💥 Fetch error:', err);
        if (err instanceof Error) {
          setError(`Error loading courses: ${err.message}`);
        } else {
          setError('Failed to load courses from Whop.');
        }
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setIsDropdownOpen(false); // Close dropdown after selection
    setError(null); // Clear any previous errors
    
    const product = products.find(p => p.id === productId);
    
    if (product) {
      console.log('📦 Selected product:', product);
      
      if (product.description && product.description.trim()) {
        // Description var - kullan
        console.log('✅ Using product description');
        setCourseText(product.description);
      } else if (product.title && product.title.trim()) {
        // Description yok ama title var - title'ı placeholder olarak kullan
        console.log('⚠️ No description, using title as placeholder');
        setCourseText(`Course: ${product.title}

Please add a detailed description of this course, including:
- What students will learn
- Course features
- Target audience
- Key benefits`);
      } else {
        // Hiçbir şey yok - boş bırak ve uyar
        console.log('❌ No description or title available');
        setCourseText('');
        setError('This product has no description in Whop. Please add a description manually below.');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleAnalyzeClick = async () => {
    if (!courseText.trim()) {
      setError('Please enter some course content to analyze.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const analysisResult = await analyzeCourseText(courseText);
      setResult(analysisResult);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) {
      setError('Please select a product!');
      return;
    }

    if (!result) {
      setError('Please analyze content first!');
      return;
    }

    // NEW STRATEGY - Copy text to clipboard
    const textToCopy = `${courseText}

---
✨ AI-Generated SEO Information:

🔑 Keywords:
${result.keywords.map(k => `- ${k}`).join('\n')}

📋 Categories:
${result.categories.map(c => `- ${c}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      alert('✅ Text Copied! You can now paste it into your Whop dashboard.');
      console.log('✅ Text copied to clipboard:', textToCopy);
    } catch (err) {
      console.error('Clipboard error:', err);
      // Fallback - Copy with TextArea
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Text Copied! You can now paste it into your Whop dashboard.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">
          Whop SEO Assistant
        </h1>
        <p className="text-gray-400 mb-8">
          Select a course and get AI-powered keyword and category suggestions.
        </p>

        <div className="animate-fade-in space-y-6">
            {/* Custom Course Dropdown */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 relative z-50">
              <label htmlFor="course-select" className="block text-sm font-medium text-gray-300 mb-2">
                Select a Course
              </label>
              {loadingProducts ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                  <span className="ml-2 text-gray-400">Loading courses...</span>
                </div>
              ) : (
                <div className="relative custom-dropdown">
                  {/* Dropdown Button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={products.length === 0}
                    className="w-full p-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-white flex items-center justify-between hover:bg-gray-900/70 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      {/* Book Icon */}
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="text-left text-white">
                        {selectedProduct 
                          ? products.find(p => p.id === selectedProduct)?.name || '-- Select a course --'
                          : '-- Select a course --'
                        }
                      </span>
                    </div>
                    {/* Chevron Icon */}
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && products.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-fade-in">
                      <ul className="py-2">
                        <li
                          onClick={() => handleProductSelect('')}
                          className="px-4 py-3 hover:bg-indigo-600/20 cursor-pointer transition-colors text-gray-400 hover:text-white flex items-center gap-3"
                        >
                          <span>-- Select a course --</span>
                        </li>
                        {products.map((product) => (
                          <li
                            key={product.id}
                            onClick={() => handleProductSelect(product.id)}
                            className={`px-4 py-3 hover:bg-indigo-600/20 cursor-pointer transition-colors flex items-center gap-3 ${
                              selectedProduct === product.id 
                                ? 'bg-indigo-600/30 text-white font-semibold' 
                                : 'text-gray-300 hover:text-white'
                            }`}
                          >
                            <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                              <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                            </svg>
                            <span>{product.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {products.length === 0 && !loadingProducts && (
                <p className="text-sm text-gray-400 mt-2">No courses found. Make sure your access token is configured.</p>
              )}
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6">
              <label htmlFor="course-text" className="block text-sm font-medium text-gray-300 mb-2">
                Course Description {selectedProduct && '(Auto-filled from selected course)'}
              </label>
              <textarea
                id="course-text"
                className="w-full h-40 p-3 bg-gray-900/50 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
                placeholder="Enter your course description, features, and content here..."
                value={courseText}
                onChange={(e) => setCourseText(e.target.value)}
                disabled={isLoading}
                aria-label="Course text input"
              />
              <button
                onClick={handleAnalyzeClick}
                disabled={isLoading || !courseText.trim()}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 ease-in-out flex items-center justify-center"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Content'}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-lg" role="alert">
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}

            {isLoading && <Loader />}

            {result && !isLoading && (
              <>
                <ResultCard result={result} />
                <JsonDisplay result={result} />
                
                {/* Copy to Clipboard Button */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6">
                  <button
                    onClick={handleUpdateProduct}
                    disabled={!selectedProduct}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 ease-in-out flex items-center justify-center"
                  >
                    📋 Copy to Clipboard
                  </button>
                  {!selectedProduct && (
                    <p className="text-sm text-gray-400 mt-2 text-center">
                      Please select a product above
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    💡 Text will be copied to clipboard, ready to paste into Whop Dashboard
                  </p>
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;
