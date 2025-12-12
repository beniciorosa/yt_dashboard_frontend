import React, { useState } from 'react';
import { CommentThread, replyToComment, rateComment, deleteComment } from '../../services/commentsService';
import { VideoData } from '../../services/youtubeService';
import { MessageSquare, ThumbsUp, Trash2, CornerDownRight, MoreVertical, Heart, User, CheckCircle2, PlaySquare } from 'lucide-react';


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
    const [isRating, setIsRating] = useState(false); // For managing heart/like state locally if needed
    const [hasHearted, setHasHearted] = useState(snippet.viewerRating === 'like');

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
        const newRating = hasHearted ? 'none' : 'like';
        setIsRating(true);
        try {
            const success = await rateComment(topLevelComment.id, newRating);
            if (success) {
                setHasHearted(!hasHearted);
            }
        } catch (error) {
            console.error(error);
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

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " anos atrás";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " meses atrás";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " dias atrás";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " horas atrás";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " min atrás";
        return "agora mesmo";
    };

    return (
        <div className="flex gap-4 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            {/* Avatar */}
            <div className="shrink-0">
                <img
                    src={snippet.authorProfileImageUrl}
                    alt={snippet.authorDisplayName}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-gray-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                    }}
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {snippet.authorDisplayName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            • {timeAgo(snippet.publishedAt)}
                        </span>
                    </div>
                </div>

                <div
                    className="text-sm text-gray-800 dark:text-gray-300 mb-2 whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: snippet.textDisplay }}
                />

                {/* Actions Bar */}
                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        <MessageSquare size={14} />
                        {isReplying ? 'Cancelar' : 'Responder'}
                    </button>

                    <button
                        onClick={handleRate}
                        disabled={isRating}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${hasHearted ? 'text-red-500' : 'text-gray-500 hover:text-red-500 dark:text-gray-400'}`}
                    >
                        <Heart size={14} className={hasHearted ? "fill-red-500" : ""} />
                        {hasHearted ? 'Amei' : 'Amei'}
                    </button>

                    {/* Like Count Display (Not actionable by owner usually for self-like via API in same way, but let's show count) */}
                    <div className="flex items-center gap-1 text-xs text-gray-400" title="Likes do público">
                        <ThumbsUp size={12} />
                        {snippet.likeCount > 0 && <span>{snippet.likeCount}</span>}
                    </div>

                    <div className="flex-1"></div>

                    <button
                        onClick={handleDelete}
                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir comentário"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Reply Box */}
                {isReplying && (
                    <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex-1">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Escreva sua resposta..."
                                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => setIsReplying(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReply}
                                    disabled={!replyText.trim() || isSending}
                                    className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSending ? 'Enviando...' : 'Responder'}
                                    {!isSending && <CornerDownRight size={12} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing Replies (Simple thread view) */}
                {thread.replies && thread.replies.comments && thread.replies.comments.length > 0 && (
                    <div className="mt-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-4">
                        {thread.replies.comments.map(reply => (
                            <div key={reply.id} className="flex gap-3">
                                <img
                                    src={reply.snippet.authorProfileImageUrl}
                                    className="w-6 h-6 rounded-full"
                                />
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{reply.snippet.authorDisplayName}</span>
                                        <span className="text-[10px] text-gray-500">{timeAgo(reply.snippet.publishedAt)}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: reply.snippet.textDisplay }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Context */}
            {video && (
                <div className="w-32 shrink-0 hidden md:block">
                    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="group/video block relative rounded-lg overflow-hidden aspect-video border border-gray-100 dark:border-gray-700">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity">
                            <PlaySquare className="text-white" size={20} />
                        </div>
                    </a>
                    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="block mt-2 text-[10px] sm:text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium line-clamp-2 leading-tight">
                        {video.title}
                    </a>
                </div>
            )}
        </div>
    );
};
