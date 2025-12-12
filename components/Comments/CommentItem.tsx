import React, { useState } from 'react';
import { CommentThread, replyToComment, rateComment, deleteComment } from '../../services/commentsService';
import { VideoData } from '../../services/youtubeService';
import { MessageSquare, ThumbsUp, Trash2, CornerDownRight, Loader2, PlaySquare, Wand2, Zap, MoreHorizontal, Check, X } from 'lucide-react';
import { generateAiReply, fetchQuickReplies, QuickReply } from '../../services/commentsService';

interface Props {
    thread: CommentThread;
    video?: VideoData; // Optional video context
    onReplySuccess: (threadId: string) => void;
    onDeleteSuccess: (threadId: string) => void;
}

export const CommentItem: React.FC<Props> = ({ thread, video, onReplySuccess, onDeleteSuccess }) => {
    const { topLevelComment } = thread.snippet;
    const { snippet } = topLevelComment;
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isRating, setIsRating] = useState(false);
    // Local state for optimistic update
    const [viewerRating, setViewerRating] = useState<'like' | 'none'>(snippet.viewerRating);
    const [likeCount, setLikeCount] = useState(snippet.likeCount);

    // AI & Quick Reply State
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [aiStyle, setAiStyle] = useState('professional');

    const handleAiReply = async () => {
        setIsGeneratingAi(true);
        try {
            const reply = await generateAiReply(snippet.textOriginal, video?.title, aiStyle);
            setReplyText(reply);
        } catch (error) {
            alert("Erro ao gerar resposta com IA.");
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleLoadQuickReplies = async () => {
        if (!showQuickReplies) {
            const replies = await fetchQuickReplies();
            setQuickReplies(replies);
        }
        setShowQuickReplies(!showQuickReplies);
    };

    const handleSelectQuickReply = (text: string) => {
        setReplyText(text);
        setShowQuickReplies(false);
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;
        setIsSending(true);
        try {
            await replyToComment(topLevelComment.id, replyText);
            setReplyText('');
            setIsReplying(false);
            onReplySuccess(thread.id);
        } catch (error) {
            alert("Erro ao responder comentário.");
        } finally {
            setIsSending(false);
        }
    };






    const handleRate = async () => {
        if (isRating) return;

        // Optimistic update
        const oldRating = viewerRating;
        const newRating = oldRating === 'like' ? 'none' : 'like';
        const oldLikeCount = likeCount;

        setViewerRating(newRating);
        setLikeCount(prev => newRating === 'like' ? prev + 1 : Math.max(0, prev - 1));
        setIsRating(true);

        try {
            const success = await rateComment(topLevelComment.id, newRating);
            if (!success) {
                // Revert if failed
                setViewerRating(oldRating);
                setLikeCount(oldLikeCount);
            }
        } catch (error) {
            console.error(error);
            setViewerRating(oldRating);
            setLikeCount(oldLikeCount);
        } finally {
            setIsRating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir este comentário?")) return;
        try {
            const success = await deleteComment(topLevelComment.id);
            if (success) onDeleteSuccess(thread.id);
        } catch (error) {
            alert("Erro ao excluir comentário.");
        }
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

        if (seconds < 60) return "agora mesmo";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return rtf.format(-minutes, 'minute');
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return rtf.format(-hours, 'hour');
        const days = Math.floor(hours / 24);
        if (days < 30) return rtf.format(-days, 'day');
        const months = Math.floor(days / 30);
        if (months < 12) return rtf.format(-months, 'month');
        const years = Math.floor(days / 365);
        return rtf.format(-years, 'year');
    };

    return (
        <div className="flex gap-4 p-5 mb-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-300 group">
            {/* Avatar */}
            <div className="shrink-0">
                <img
                    src={snippet.authorProfileImageUrl}
                    alt={snippet.authorDisplayName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-sm"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-500"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="opacity-50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">

                {/* Header: Author & Time */}
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:underline cursor-pointer">
                        {snippet.authorDisplayName}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                        {timeAgo(snippet.publishedAt)}
                    </span>
                </div>

                {/* Comment Text */}
                <div
                    className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-3"
                    dangerouslySetInnerHTML={{ __html: snippet.textDisplay }}
                />

                {/* Action Bar */}
                <div className="flex items-center flex-wrap gap-2 sm:gap-4 select-none">

                    {/* Reply Button */}
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${isReplying
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <MessageSquare size={14} />
                        {isReplying ? 'Cancelar' : 'Responder'}
                    </button>

                    {/* Like Button */}
                    <button
                        onClick={handleRate}
                        disabled={isRating}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${viewerRating === 'like'
                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                            }`}
                        title={viewerRating === 'like' ? 'Remover like' : 'Curtir comentário'}
                    >
                        <ThumbsUp size={14} className={viewerRating === 'like' ? 'fill-current' : ''} />
                        {likeCount > 0 ? likeCount : 'Curtir'}
                    </button>

                    {/* Delete Button (Hover only) */}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 ml-auto sm:ml-0"
                        title="Excluir comentário"
                    >
                        <Trash2 size={14} />
                    </button>

                </div>

                {/* Reply Input Area */}
                {isReplying && (
                    <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex-1 relative">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Escreva uma resposta pública..."
                                className="w-full p-4 pr-12 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none h-32 transition-shadow"
                                autoFocus
                            />

                            {/* AI & Quick Tools Toolbar */}
                            <div className="absolute bottom-3 left-3 flex gap-2">
                                <button
                                    onClick={handleAiReply}
                                    disabled={isGeneratingAi}
                                    className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                                    title="Gerar resposta com IA"
                                >
                                    {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                    <span className="hidden sm:inline">IA Reply</span>
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={handleLoadQuickReplies}
                                        className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                                        title="Respostas Rápidas"
                                    >
                                        <Zap size={14} />
                                        <span className="hidden sm:inline">Rápidas</span>
                                    </button>

                                    {showQuickReplies && (
                                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 font-medium text-xs text-gray-500">
                                                Respostas Salvas
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {quickReplies.length === 0 ? (
                                                    <div className="p-3 text-xs text-gray-400 text-center">Nenhuma resposta salva.</div>
                                                ) : (
                                                    quickReplies.map(qr => (
                                                        <button
                                                            key={qr.id}
                                                            onClick={() => handleSelectQuickReply(qr.text)}
                                                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="font-semibold text-gray-700 dark:text-gray-200 mb-0.5">{qr.title}</div>
                                                            <div className="text-gray-500 line-clamp-1">{qr.text}</div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="absolute bottom-3 right-3 flex gap-2">
                                <button
                                    onClick={handleReply}
                                    disabled={!replyText.trim() || isSending}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            Responder
                                            <CornerDownRight size={12} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing Replies Thread */}
                {thread.replies && thread.replies.comments && thread.replies.comments.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {thread.replies.comments.map(reply => (
                            <div key={reply.id} className="flex gap-3 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                                <img
                                    src={reply.snippet.authorProfileImageUrl}
                                    className="w-6 h-6 rounded-full ring-1 ring-white dark:ring-gray-700"
                                    alt=""
                                />
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                            {reply.snippet.authorDisplayName}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {timeAgo(reply.snippet.publishedAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: reply.snippet.textDisplay }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Context Link */}
            {video && (
                <div className="w-40 shrink-0 hidden lg:block">
                    <a
                        href={`https://www.youtube.com/watch?v=${video.id}&lc=${thread.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/video block relative rounded-lg overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
                    >
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover/video:scale-105" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity duration-200">
                            <span className="flex items-center gap-1 text-xs text-white font-medium bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                                <PlaySquare size={12} /> Assistir
                            </span>
                        </div>
                    </a>
                    <div className="mt-2 text-right">
                        <a
                            href={`https://www.youtube.com/watch?v=${video.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium line-clamp-2 leading-tight transition-colors inline-block"
                        >
                            {video.title}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
