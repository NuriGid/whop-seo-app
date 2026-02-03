import React, { useState, useCallback } from 'react';

interface ABTestPanelProps {
    content: string;
    contentType: string;
    label: string;
}

const TONE_OPTIONS = [
    { value: 'casual', label: '😊 Casual', desc: 'Friendly & approachable' },
    { value: 'professional', label: '👔 Professional', desc: 'Formal & authoritative' },
    { value: 'urgent', label: '🔥 Urgent', desc: 'FOMO & scarcity' },
    { value: 'storytelling', label: '📖 Story', desc: 'Narrative hook' },
    { value: 'enthusiastic', label: '🚀 Excited', desc: 'High energy' },
    { value: 'minimalist', label: '⚡ Minimal', desc: 'Short & punchy' },
];

const ABTestPanel: React.FC<ABTestPanelProps> = ({ content, contentType, label }) => {
    const [variantContent, setVariantContent] = useState<string>('');
    const [selectedTone, setSelectedTone] = useState<string>('casual');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [copiedVariant, setCopiedVariant] = useState(false);
    const [publishedVariant, setPublishedVariant] = useState<'A' | 'B' | null>(null);

    const generateVariant = useCallback(async () => {
        if (!content) return;

        setIsGenerating(true);
        setVariantContent('');

        try {
            const response = await fetch('/api/ab-variant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: content,
                    contentType,
                    tone: selectedTone
                })
            });

            if (!response.ok) throw new Error('Generation failed');

            const data = await response.json();
            setVariantContent(data.variantContent || '');
        } catch (err) {
            console.error('A/B variant error:', err);
        } finally {
            setIsGenerating(false);
        }
    }, [content, contentType, selectedTone]);

    const copyVariant = async () => {
        try {
            await navigator.clipboard.writeText(variantContent);
            setCopiedVariant(true);
            setTimeout(() => setCopiedVariant(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    if (!showPanel) {
        return (
            <button
                onClick={() => setShowPanel(true)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors mt-2"
            >
                📊 Generate A/B Variant
            </button>
        );
    }

    return (
        <div className="mt-4 bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-purple-300">
                    📊 A/B Test: {label}
                </h4>
                <button
                    onClick={() => setShowPanel(false)}
                    className="text-gray-500 hover:text-gray-300 text-sm"
                >
                    ✕
                </button>
            </div>

            {/* Tone Selector */}
            <div className="flex flex-wrap gap-2 mb-3">
                {TONE_OPTIONS.map(tone => (
                    <button
                        key={tone.value}
                        onClick={() => setSelectedTone(tone.value)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-all ${selectedTone === tone.value
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                            }`}
                        title={tone.desc}
                    >
                        {tone.label}
                    </button>
                ))}
            </div>

            {/* Generate Button */}
            <button
                onClick={generateVariant}
                disabled={isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg mb-3 transition-colors"
            >
                {isGenerating ? '⏳ Generating...' : '✨ Generate Variant B'}
            </button>

            {/* Variant Comparison */}
            {variantContent && (
                <div className="grid grid-cols-2 gap-3">
                    {/* Variant A (Original) */}
                    <div className={`bg-gray-900/50 rounded-lg p-3 border ${publishedVariant === 'A' ? 'border-green-500' : 'border-gray-700'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">Variant A (Original)</span>
                            <button
                                onClick={() => setPublishedVariant('A')}
                                className={`text-xs px-2 py-0.5 rounded ${publishedVariant === 'A' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                            >
                                {publishedVariant === 'A' ? '✓ Active' : 'Use'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-4">{content}</p>
                    </div>

                    {/* Variant B (Generated) */}
                    <div className={`bg-gray-900/50 rounded-lg p-3 border ${publishedVariant === 'B' ? 'border-green-500' : 'border-purple-500/50'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-purple-400">Variant B ({selectedTone})</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={copyVariant}
                                    className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 hover:bg-gray-600"
                                >
                                    {copiedVariant ? '✓' : '📋'}
                                </button>
                                <button
                                    onClick={() => setPublishedVariant('B')}
                                    className={`text-xs px-2 py-0.5 rounded ${publishedVariant === 'B' ? 'bg-green-600 text-white' : 'bg-purple-700 text-purple-200'}`}
                                >
                                    {publishedVariant === 'B' ? '✓ Active' : 'Use'}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-4">{variantContent}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ABTestPanel;
