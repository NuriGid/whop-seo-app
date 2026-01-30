import React, { useState } from 'react';
import { AnalysisResult } from '../types';

interface ResultCardProps {
  result: AnalysisResult;
  courseId?: string;
  companyId?: string;
  onWhopAction?: (type: 'update' | 'announce', success: boolean, message: string) => void;
}

// Icons
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const WhopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const MegaphoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ResultCard: React.FC<ResultCardProps> = ({ result, courseId, companyId, onWhopAction }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  const handleUpdateOnWhop = async () => {
    if (!courseId || !result.whopSalesDescription) return;

    setLoadingAction('update');
    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          newDescription: result.whopSalesDescription
        })
      });

      const data = await response.json();

      if (data.success) {
        onWhopAction?.('update', true, '✅ Course description updated on Whop!');
      } else {
        onWhopAction?.('update', false, `❌ Failed: ${data.error}`);
      }
    } catch (error: any) {
      onWhopAction?.('update', false, `❌ Error: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!result.whopAnnouncement) return;

    setLoadingAction('announce');
    try {
      const response = await fetch('/api/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.whopAnnouncement.title,
          body: result.whopAnnouncement.body,
          companyId
        })
      });

      const data = await response.json();

      if (data.success) {
        onWhopAction?.('announce', true, '✅ Announcement published on Whop!');
      } else {
        onWhopAction?.('announce', false, `❌ Failed: ${data.error}`);
      }
    } catch (error: any) {
      onWhopAction?.('announce', false, `❌ Error: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mt-8 space-y-6">

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* === SECTION 1: WHOP NATIVE ACTIONS (PRIORITY - AT THE TOP) === */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
          ⚡ Whop Native Actions
        </h2>

        {/* Whop Course Description Card */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-sm border border-indigo-500/50 rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <WhopIcon className="w-6 h-6 mr-2 text-indigo-400" />
              Course Sales Description
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(result.whopSalesDescription, 'whop-desc')}
                className="flex items-center gap-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 px-3 py-2 rounded-lg transition-all border border-gray-500/30"
              >
                {copiedSection === 'whop-desc' ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleUpdateOnWhop}
                disabled={loadingAction === 'update' || !courseId}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-lg"
              >
                {loadingAction === 'update' ? (
                  <><LoadingSpinner className="w-4 h-4" /> Updating...</>
                ) : (
                  <>⚡ UPDATE ON WHOP</>
                )}
              </button>
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-gray-200 whitespace-pre-wrap text-sm border border-indigo-500/20">
            {result.whopSalesDescription}
          </div>
        </div>

        {/* Whop Announcement Card */}
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 backdrop-blur-sm border border-orange-500/50 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <MegaphoneIcon className="w-6 h-6 mr-2 text-orange-400" />
              Community Announcement
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(`${result.whopAnnouncement.title}\n\n${result.whopAnnouncement.body}`, 'whop-announce')}
                className="flex items-center gap-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 px-3 py-2 rounded-lg transition-all border border-gray-500/30"
              >
                {copiedSection === 'whop-announce' ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              </button>
              <button
                onClick={handlePublishAnnouncement}
                disabled={loadingAction === 'announce'}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-lg"
              >
                {loadingAction === 'announce' ? (
                  <><LoadingSpinner className="w-4 h-4" /> Publishing...</>
                ) : (
                  <>📢 PUBLISH ON WHOP</>
                )}
              </button>
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 text-gray-200 border border-orange-500/20">
            <div className="font-bold text-lg text-orange-300 mb-2">{result.whopAnnouncement.title}</div>
            <div className="whitespace-pre-wrap text-sm">{result.whopAnnouncement.body}</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* === SECTION 2: SOCIAL DISTRIBUTION (Copy Only - At the Bottom) === */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="pt-6 border-t border-gray-700">
        <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          📱 Social Distribution
        </h2>

        {/* Twitter Thread Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-100 flex items-center">
              <TwitterIcon className="w-6 h-6 mr-2 text-blue-400" />
              Twitter Thread
            </h3>
            <button
              onClick={() => handleCopy(result.twitterThread, 'twitter')}
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-all border border-blue-500/30"
            >
              {copiedSection === 'twitter' ? <><CheckIcon className="w-4 h-4" /> Copied!</> : <><CopyIcon className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-gray-300 whitespace-pre-wrap text-sm">
            {result.twitterThread}
          </div>
        </div>

        {/* TikTok Script Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-100 flex items-center">
              <TikTokIcon className="w-6 h-6 mr-2 text-purple-400" />
              TikTok Script
            </h3>
            <button
              onClick={() => handleCopy(result.tiktokScript, 'tiktok')}
              className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-2 rounded-lg transition-all border border-purple-500/30"
            >
              {copiedSection === 'tiktok' ? <><CheckIcon className="w-4 h-4" /> Copied!</> : <><CopyIcon className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-gray-300 whitespace-pre-wrap text-sm">
            {result.tiktokScript}
          </div>
        </div>

        {/* Instagram Post Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-100 flex items-center">
              <InstagramIcon className="w-6 h-6 mr-2 text-pink-400" />
              Instagram Caption
            </h3>
            <button
              onClick={() => handleCopy(result.instagramPost, 'instagram')}
              className="flex items-center gap-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 px-4 py-2 rounded-lg transition-all border border-pink-500/30"
            >
              {copiedSection === 'instagram' ? <><CheckIcon className="w-4 h-4" /> Copied!</> : <><CopyIcon className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-gray-300 whitespace-pre-wrap text-sm">
            {result.instagramPost}
          </div>
        </div>

        {/* Sales Email Card - RESTORED */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-100 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Sales Email
            </h3>
            <button
              onClick={() => handleCopy(result.salesEmail, 'email')}
              className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 rounded-lg transition-all border border-green-500/30"
            >
              {copiedSection === 'email' ? <><CheckIcon className="w-4 h-4" /> Copied!</> : <><CopyIcon className="w-4 h-4" /> Copy</>}
            </button>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 text-gray-300 whitespace-pre-wrap text-sm">
            {result.salesEmail}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResultCard;
