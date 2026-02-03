import React, { useState, useEffect, useCallback } from 'react';

interface Lesson {
    id: string;
    title: string;
    content: string;
    order: number;
    lessonType: string;
    visibility: string;
}

interface LessonsPanelProps {
    courseId: string;
    courseName: string;
    userNote?: string;
}

const LessonsPanel: React.FC<LessonsPanelProps> = ({ courseId, courseName, userNote }) => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Fetch lessons when courseId changes
    useEffect(() => {
        const fetchLessons = async () => {
            if (!courseId) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/lessons?courseId=${courseId}`);
                if (!response.ok) throw new Error(`Failed to fetch lessons: ${response.status}`);

                const data = await response.json();
                setLessons(data.lessons || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load lessons');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLessons();
    }, [courseId]);

    // Generate description for a single lesson
    const generateForLesson = useCallback(async (lesson: Lesson) => {
        setIsGenerating(true);
        setGeneratedContent('');

        try {
            const response = await fetch('/api/generate-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonTitle: lesson.title,
                    courseName,
                    userNote
                })
            });

            if (!response.ok) throw new Error('Generation failed');

            const data = await response.json();
            setGeneratedContent(data.description || '');
            setSelectedLesson(lesson);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    }, [courseName, userNote]);

    // Update lesson content on Whop
    const updateLessonOnWhop = useCallback(async (lessonId: string, content: string) => {
        try {
            const response = await fetch('/api/update-lesson', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, content })
            });

            if (!response.ok) throw new Error('Update failed');

            setSuccessMsg(`✅ Lesson updated on Whop!`);
            setTimeout(() => setSuccessMsg(null), 3000);

            // Update local state
            setLessons(prev => prev.map(l =>
                l.id === lessonId ? { ...l, content } : l
            ));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    }, []);

    // Bulk generate for all lessons
    const bulkGenerateAll = useCallback(async () => {
        if (lessons.length === 0) return;

        setIsBulkGenerating(true);
        setBulkProgress({ current: 0, total: lessons.length });

        try {
            for (let i = 0; i < lessons.length; i++) {
                const lesson = lessons[i];
                setBulkProgress({ current: i + 1, total: lessons.length });

                // Generate
                const genResponse = await fetch('/api/generate-lesson', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lessonTitle: lesson.title,
                        courseName,
                        userNote
                    })
                });

                if (!genResponse.ok) continue;

                const genData = await genResponse.json();
                const content = genData.description || '';

                if (!content) continue;

                // Update on Whop
                await fetch('/api/update-lesson', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lessonId: lesson.id, content })
                });

                // Update local state
                setLessons(prev => prev.map(l =>
                    l.id === lesson.id ? { ...l, content } : l
                ));
            }

            setSuccessMsg(`✅ All ${lessons.length} lessons updated!`);
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bulk generation failed');
        } finally {
            setIsBulkGenerating(false);
            setBulkProgress({ current: 0, total: 0 });
        }
    }, [lessons, courseName, userNote]);

    if (isLoading) {
        return (
            <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 text-center">
                <div className="animate-pulse text-gray-400">Loading lessons...</div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    📚 Course Lessons
                    <span className="text-sm text-gray-400">({lessons.length})</span>
                </h3>

                {lessons.length > 0 && (
                    <button
                        onClick={bulkGenerateAll}
                        disabled={isBulkGenerating}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded-lg transition-all"
                    >
                        {isBulkGenerating ? (
                            <span>Filling... {bulkProgress.current}/{bulkProgress.total}</span>
                        ) : (
                            <span>⚡ Fill All Lessons</span>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="bg-green-900/50 border border-green-700 rounded-lg p-3 mb-4 text-green-300 text-sm">
                    {successMsg}
                </div>
            )}

            {lessons.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No lessons found for this course.</p>
            ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                    {lessons.map((lesson, idx) => (
                        <div
                            key={lesson.id}
                            className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-sm font-mono">{idx + 1}.</span>
                                    <div>
                                        <h4 className="text-white font-medium">{lesson.title}</h4>
                                        <p className="text-gray-500 text-xs">
                                            {lesson.content ? `${lesson.content.substring(0, 50)}...` : 'No description'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => generateForLesson(lesson)}
                                    disabled={isGenerating}
                                    className="bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs py-1.5 px-3 rounded-lg transition-colors"
                                >
                                    {isGenerating && selectedLesson?.id === lesson.id ? '...' : '✨ Generate'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Generated Content Preview */}
            {generatedContent && selectedLesson && (
                <div className="mt-4 bg-gray-900/80 border border-purple-500/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-purple-300 font-medium text-sm">
                            Generated for: {selectedLesson.title}
                        </h4>
                        <button
                            onClick={() => updateLessonOnWhop(selectedLesson.id, generatedContent)}
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-all"
                        >
                            ⚡ Update on Whop
                        </button>
                    </div>
                    <div className="text-gray-300 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {generatedContent}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonsPanel;
