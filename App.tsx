import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WhopProduct, WhopPlan, WhopPayment, AnalysisResult } from './types';
import ResultCard from './components/ResultCard';
import Loader from './components/Loader';
import PlansTable from './components/PlansTable';
import PaymentsTable from './components/PaymentsTable';

interface AppState {
  isLoading: boolean;
  isInWhop: boolean;
  userToken: string | null;
  companyId: string | null;

  // Data
  products: WhopProduct[];
  plans: WhopPlan[];
  payments: WhopPayment[];

  // Tab State
  activeTab: 'content' | 'plans' | 'payments';

  // Loading States
  isLoadingProducts: boolean;
  isLoadingPlans: boolean;
  isLoadingPayments: boolean;

  // Selected Product & Analysis
  productsError: string | null;
  selectedProduct: WhopProduct | null;
  courseDescription: string;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  isDropdownOpen: boolean;
}

// Icons
const DocumentIcon: React.FC<{ className?: string }> = ({ className }) => (
  // ... (SVG content same as before)
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const BookIcon: React.FC<{ className?: string }> = ({ className }) => (
  // ... (SVG content same as before)
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isInWhop: false,
    userToken: null,
    companyId: null,

    products: [],
    plans: [],
    payments: [],

    activeTab: 'content',

    isLoadingProducts: false,
    isLoadingPlans: false,
    isLoadingPayments: false,

    productsError: null,
    selectedProduct: null,
    courseDescription: '',
    analysisResult: null,
    isAnalyzing: false,
    analysisError: null,
    isDropdownOpen: false,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetchedTabs = useRef<Set<string>>(new Set());

  // Build default description template
  const buildDescriptionTemplate = (productName: string) => {
    return `Course: ${productName}\n\nPlease add a detailed description of this course, including:\n- What students will learn\n- Course features\n- Target audience`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, isDropdownOpen: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Logic Helper
  const fetchData = async (endpoint: string, token: string | null, companyId: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (companyId) {
      headers['X-Whop-Company-Id'] = companyId;
    }

    const response = await fetch(endpoint, { method: 'GET', headers });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const json = await response.json();
    return json.data || [];
  };

  // Initialize and Fetch Products (Default)
  useEffect(() => {
    const init = async () => {
      const isInIframe = window !== window.parent;
      if (!isInIframe) {
        setState(prev => ({ ...prev, isLoading: false, isInWhop: false, productsError: 'This app must be opened from within Whop.' }));
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('x-whop-user-token') || urlParams.get('token');

      // Extract company ID from params OR path (for Proxy Apps)
      let companyId = urlParams.get('company_id') || urlParams.get('companyId');
      if (!companyId) {
        const pathMatch = window.location.pathname.match(/biz_[a-zA-Z0-9]+/);
        if (pathMatch) companyId = pathMatch[0];
      }

      // If no token in URL, we assume we are running behind Whop Proxy (apps.whop.com)
      // which acts as an authenticated gateway and injects request headers associated with the user.
      const isProxy = window.location.hostname.includes('apps.whop.com');

      if (!token && !isProxy) {
        console.error("❌ No user token found and not on Whop Proxy.", window.location.href);
        setState(prev => ({
          ...prev,
          isLoading: false,
          productsError: `Could not identify user. URL: ${window.location.href}`
        }));
        return;
      }

      setState(prev => ({ ...prev, isInWhop: true, userToken: token, companyId: companyId || null, isLoadingProducts: true }));

      // Fetch Products Immediately
      try {
        const products = await fetchData('/api/products', token, companyId);
        setState(prev => ({ ...prev, isLoading: false, isLoadingProducts: false, products }));
        fetchedTabs.current.add('content');
      } catch (error: any) {
        console.error('Initial product fetch failed', error);
        setState(prev => ({ ...prev, isLoading: false, isLoadingProducts: false, productsError: error.message || 'Failed to load products.' }));
      }
    };
    init();
  }, []);

  // Fetch data on tab change
  useEffect(() => {
    if (!state.userToken || !state.activeTab) return;
    if (fetchedTabs.current.has(state.activeTab)) return;

    const loadTabData = async () => {
      if (state.activeTab === 'plans') {
        setState(prev => ({ ...prev, isLoadingPlans: true }));
        try {
          const plans = await fetchData('/api/plans', state.userToken!, state.companyId);
          setState(prev => ({ ...prev, plans, isLoadingPlans: false }));
          fetchedTabs.current.add('plans');
        } catch (e) {
          console.error('Failed to fetch plans', e);
          setState(prev => ({ ...prev, isLoadingPlans: false }));
        }
      } else if (state.activeTab === 'payments') {
        setState(prev => ({ ...prev, isLoadingPayments: true }));
        try {
          const payments = await fetchData('/api/payments', state.userToken!, state.companyId);
          setState(prev => ({ ...prev, payments, isLoadingPayments: false }));
          fetchedTabs.current.add('payments');
        } catch (e) {
          console.error('Failed to fetch payments', e);
          setState(prev => ({ ...prev, isLoadingPayments: false }));
        }
      }
    };

    loadTabData();
  }, [state.activeTab, state.userToken, state.companyId]);


  // Handlers
  const handleSelectProduct = useCallback((product: WhopProduct | null) => {
    const description = product ? buildDescriptionTemplate(product.name || product.title || 'Unknown') : '';
    setState(prev => ({ ...prev, selectedProduct: product, courseDescription: description, analysisResult: null, analysisError: null, isDropdownOpen: false }));
  }, []);

  const toggleDropdown = useCallback(() => {
    setState(prev => ({ ...prev, isDropdownOpen: !prev.isDropdownOpen }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, courseDescription: e.target.value }));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!state.selectedProduct || !state.courseDescription.trim()) return;
    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.userToken) {
        headers['Authorization'] = `Bearer ${state.userToken}`;
      }
      if (state.companyId) headers['X-Whop-Company-Id'] = state.companyId;

      const response = await fetch('/api/analyze', { method: 'POST', headers, body: JSON.stringify({ prompt: state.courseDescription }) });
      if (!response.ok) throw new Error(`Analysis Failed (${response.status})`);
      const result = await response.json();

      const finalResult: AnalysisResult = {
        twitterThread: result.twitterThread || result.twitter || "No content generated.",
        salesEmail: result.salesEmail || result.email || "No content generated.",
        instagramPost: result.instagramPost || result.instagram || "No content generated.",
        tiktokScript: result.tiktokScript || result.tiktok || "No content generated."
      };
      setState(prev => ({ ...prev, isAnalyzing: false, analysisResult: finalResult }));
    } catch (error) {
      console.error('❌ Analysis Error:', error);
      setState(prev => ({ ...prev, isAnalyzing: false, analysisError: error instanceof Error ? error.message : 'Analysis failed' }));
    }
  }, [state.selectedProduct, state.courseDescription, state.userToken, state.companyId]);


  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-black">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-gray-100 p-6 relative overflow-hidden">
      {/* Stars Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-20 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-32 right-40 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-64 left-1/3 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute bottom-40 right-20 w-1 h-1 bg-white rounded-full"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold italic bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-3">
            Content Marketing Assistant
          </h1>
          <p className="text-gray-400 text-sm">
            Generate AI-powered marketing content for your Whop courses.
          </p>
        </div>

        {/* Navigation Tabs (Removed for single-purpose Content App) */}
        {/* 
        <div className="flex justify-center mb-8">
           ... (Tabs removed)
        </div> 
        */}

        {/* Error Display */}
        {state.productsError && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-300">{state.productsError}</p>
          </div>
        )}

        {/* --- CONTENT GENERATOR TAB --- */}
        {state.activeTab === 'content' && (
          <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
            {/* Product Selector */}
            <div className="relative z-50 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
              <label className="block text-center text-gray-300 font-medium mb-4">Select a Course</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="w-full bg-gray-900/80 border border-gray-600 text-white rounded-xl py-4 px-4 flex items-center justify-between focus:ring-2 focus:ring-purple-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookIcon className="h-5 w-5 text-purple-400" />
                    <span className={state.selectedProduct ? 'text-white' : 'text-gray-400'}>
                      {state.selectedProduct ? (state.selectedProduct.name || state.selectedProduct.title) : '-- Select a course --'}
                    </span>
                  </div>
                  <svg className={`h-5 w-5 text-gray-400 transition-transform ${state.isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {state.isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-xl overflow-hidden z-[100] shadow-2xl max-h-60 overflow-y-auto">
                    <div className="px-4 py-3 text-gray-400 cursor-pointer hover:bg-gray-700/50" onClick={() => handleSelectProduct(null)}>-- Select a course --</div>
                    {state.products.map(product => (
                      <div key={product.id} onClick={() => handleSelectProduct(product)} className={`px-4 py-3 flex items-center gap-3 cursor-pointer ${state.selectedProduct?.id === product.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                        <DocumentIcon className="h-5 w-5 flex-shrink-0" />
                        <span>{product.name || product.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {state.selectedProduct && (
              <div className="relative z-0 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
                <label className="block text-center text-gray-300 font-medium mb-4">Course Description</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-600 text-gray-200 rounded-xl p-4 min-h-[200px] resize-y focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  value={state.courseDescription}
                  onChange={handleDescriptionChange}
                  placeholder="Enter course description..."
                />
                <button
                  onClick={handleAnalyze}
                  disabled={state.isAnalyzing || !state.courseDescription.trim()}
                  className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg"
                >
                  {state.isAnalyzing ? 'Generating...' : 'Generate Marketing Content'}
                </button>
              </div>
            )}

            {state.isAnalyzing && <div className="flex justify-center my-8"><Loader /></div>}
            {state.analysisError && <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 my-6 text-red-300">Error: {state.analysisError}</div>}
            {state.analysisResult && <div className="mt-8"><ResultCard result={state.analysisResult} /></div>}
          </div>
        )}

        {/* --- PLANS & PAYMENTS REMOVED --- */}

      </div>
    </div>
  );
};

export default App;
