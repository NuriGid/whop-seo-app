import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WhopProduct, WhopPlan, WhopPayment, AnalysisResult } from './types';
import ResultCard from './components/ResultCard';
import Loader from './components/Loader';
import PlansTable from './components/PlansTable';
import PaymentsTable from './components/PaymentsTable';
import LessonsPanel from './components/LessonsPanel';

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

  // Update on Whop
  isUpdatingWhop: boolean;
  updateMessage: string | null;
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
    isUpdatingWhop: false,
    updateMessage: null,
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
    return json.data || json; // Handle both {data: [...]} and raw [...] formats
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
    // Reset description/notes to empty so user sees placeholder. No more template text.
    setState(prev => ({ ...prev, selectedProduct: product, courseDescription: '', analysisResult: null, analysisError: null, isDropdownOpen: false }));
  }, []);

  const toggleDropdown = useCallback(() => {
    setState(prev => ({ ...prev, isDropdownOpen: !prev.isDropdownOpen }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, courseDescription: e.target.value }));
    console.log('📝 Optional Notes Updated:', e.target.value); // DEBUG
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!state.selectedProduct) return;
    // v4.8: Clear previous results IMMEDIATELY to prevent ghost data
    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: null, analysisResult: null }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.userToken) {
        headers['Authorization'] = `Bearer ${state.userToken}`;
      }
      if (state.companyId) headers['X-Whop-Company-Id'] = state.companyId;

      // Use course name and existing description from the product
      const courseName = state.selectedProduct.name || state.selectedProduct.title || 'Course';
      const courseDesc = state.selectedProduct.description || '';
      const optionalNotes = state.courseDescription?.trim() || '';
      const prompt = `Course: ${courseName}\n\n${courseDesc}${optionalNotes ? `\n\nAdditional notes: ${optionalNotes}` : ''}`;

      console.log('🚀 PROMPT BEING SENT:', prompt); // DEBUG - Remove after testing
      console.log('👉 OPTIONAL NOTES VALUE:', optionalNotes); // DEBUG

      const response = await fetch('/api/analyze', { method: 'POST', headers, body: JSON.stringify({ prompt }) });
      if (!response.ok) throw new Error(`Analysis Failed (${response.status})`);
      const result = await response.json();

      const finalResult: AnalysisResult = {
        twitterThread: result.twitterThread || result.twitter || "No content generated.",
        salesEmail: result.salesEmail || result.email || "No content generated.",
        instagramPost: result.instagramPost || result.instagram || "No content generated.",
        tiktokScript: result.tiktokScript || result.tiktok || "No content generated.",
        // Whop-specific content
        whopSalesDescription: result.whopSalesDescription || result.salesDescription || result.courseDescription || courseDesc,
        whopAnnouncement: {
          title: result.announcementTitle || result.whopAnnouncement?.title || `🚀 ${courseName} is NOW LIVE!`,
          body: result.announcementBody || result.whopAnnouncement?.body || result.salesEmail || "Check out our latest course!"
        },
        // Phase 2B: Upsell/Cross-sell
        upsellText: result.upsellText || result.upsell,
        crossSellText: result.crossSellText || result.crossSell
      };
      setState(prev => ({ ...prev, isAnalyzing: false, analysisResult: finalResult }));
    } catch (error) {
      console.error('❌ Analysis Error:', error);
      setState(prev => ({ ...prev, isAnalyzing: false, analysisError: error instanceof Error ? error.message : 'Analysis failed' }));
    }
  }, [state.selectedProduct, state.userToken, state.companyId, state.courseDescription]);

  const handleUpdateOnWhop = useCallback(async (content: string, contentType: string) => {
    if (!state.selectedProduct) return;

    setState(prev => ({ ...prev, isUpdatingWhop: true, updateMessage: null }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.userToken) {
        headers['Authorization'] = `Bearer ${state.userToken}`;
      }
      if (state.companyId) headers['X-Whop-Company-Id'] = state.companyId;

      const response = await fetch('/api/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: state.selectedProduct.id,
          newDescription: content
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Update failed (${response.status})`);
      }

      setState(prev => ({
        ...prev,
        isUpdatingWhop: false,
        updateMessage: `✅ Product description updated on Whop! (${contentType})`
      }));

      // Clear success message after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, updateMessage: null }));
      }, 5000);

    } catch (error) {
      console.error('❌ Update Error:', error);
      setState(prev => ({
        ...prev,
        isUpdatingWhop: false,
        updateMessage: `❌ Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }, [state.selectedProduct, state.userToken, state.companyId]);


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
          <div className="inline-block mb-2">
            <span className="text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full">
              Topic Lock v5.5
            </span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
            🚀 CourseRocket
          </h1>
          <p className="text-gray-400 text-sm">
            AI-powered marketing content for Whop course creators.
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
              <div className="relative z-0 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 text-center">
                {/* Selected Course Badge */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-2 bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 px-4 py-2 rounded-full text-sm font-medium">
                    <BookIcon className="w-4 h-4" />
                    {state.selectedProduct.name || state.selectedProduct.title}
                  </span>
                </div>

                {/* Optional Notes - Small input for AI context */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={state.courseDescription}
                    onChange={handleDescriptionChange}
                    placeholder="Optional: Add notes for AI (e.g. 'focus on beginners', 'mention discount')"
                    className="w-full bg-gray-900/50 border border-gray-600/50 text-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500"
                  />
                </div>

                {/* Generate Button - Primary CTA */}
                <button
                  onClick={handleAnalyze}
                  disabled={state.isAnalyzing}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {state.isAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Igniting Engine...
                    </span>
                  ) : state.analysisResult ? (
                    <span className="flex items-center justify-center gap-2">
                      Engine Ignited! 🚀 (v5.7)
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      🚀 Generate Marketing Content
                    </span>
                  )}
                </button>

                {/* Lessons Panel - Phase 2A */}
                <LessonsPanel
                  courseId={state.selectedProduct.id}
                  courseName={state.selectedProduct.name || state.selectedProduct.title || 'Course'}
                  userNote={state.courseDescription}
                />
              </div>
            )}

            {state.isAnalyzing && <div className="flex justify-center my-8"><Loader /></div>}
            {state.analysisError && <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 my-6 text-red-300">Error: {state.analysisError}</div>}
            {state.updateMessage && (
              <div className={`${state.updateMessage.startsWith('✅') ? 'bg-green-900/50 border-green-700 text-green-300' : 'bg-red-900/50 border-red-700 text-red-300'} border rounded-xl p-4 my-6`}>
                {state.updateMessage}
              </div>
            )}
            {state.analysisResult && (
              <div className="mt-8">
                <ResultCard
                  result={state.analysisResult}
                  courseId={state.selectedProduct?.id}
                  companyId={state.companyId || undefined}
                  onWhopAction={(type, success, message) => {
                    setState(prev => ({ ...prev, updateMessage: message }));
                    setTimeout(() => setState(prev => ({ ...prev, updateMessage: null })), 5000);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* --- PLANS & PAYMENTS REMOVED --- */}

      </div>
    </div>
  );
};

export default App;
// Trigger build for v5.7 Restoration
