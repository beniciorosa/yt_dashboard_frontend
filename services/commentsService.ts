import { getAccessToken } from './authService';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
// Use the same backend domain style as youtubeService, but targeting the new proxy-action endpoint
const PROXY_ACTION_URL = 'https://yt-dashboard-backend.vercel.app/youtube/proxy-action';

export interface CommentSnippet {
    authorDisplayName: string;
    authorProfileImageUrl: string;
    textDisplay: string;
    textOriginal: string;
    publishedAt: string;
    updatedAt: string;
    likeCount: number;
    viewerRating: 'none' | 'like';
    videoId?: string;
    canReply?: boolean;
    totalReplyCount?: number;
    isPublic?: boolean;
}

export interface CommentThread {
    id: string;
    snippet: {
        videoId: string;
        topLevelComment: {
            id: string;
            snippet: CommentSnippet;
        };
        totalReplyCount: number;
        canReply: boolean;
        isPublic: boolean;
    };
    replies?: {
        comments: {
            id: string;
            snippet: CommentSnippet;
        }[];
    };
}

export interface CommentsResponse {
    items: CommentThread[];
    nextPageToken?: string;
    pageInfo?: {
        totalResults: number;
        resultsPerPage: number;
    };
}

export interface ReplyResponse {
    id: string;
    snippet: CommentSnippet;
}

export const fetchComments = async (
    params: {
        part?: string;
        allThreadsRelatedToChannelId?: string; // usually 'MINE' if authorized
        videoId?: string;
        order?: 'time' | 'relevance';
        searchTerms?: string;
        pageToken?: string;
        maxResults?: number;
    }
): Promise<CommentsResponse | null> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const url = new URL(`${BASE_URL}/commentThreads`);
    url.searchParams.append('part', params.part || 'snippet,replies');

    if (params.videoId) {
        url.searchParams.append('videoId', params.videoId);
    } else {
        // Resolve Channel ID if not provided
        let channelId = params.allThreadsRelatedToChannelId;
        if (!channelId || channelId === 'MINE') {
            try {
                channelId = await getMyChannelId();
            } catch (e) {
                console.warn("Failed to resolve channel ID, defaulting to MINE", e);
                channelId = 'MINE';
            }
        }
        url.searchParams.append('allThreadsRelatedToChannelId', channelId);
    }

    if (params.order) {
        // API Constraint: 'relevance' order is NOT supported for channel-wide comments (allThreadsRelatedToChannelId).
        // It requires a specific videoId. We fallback to 'time' to avoid 400 Bad Request.
        if (!params.videoId && params.order === 'relevance') {
            url.searchParams.append('order', 'time');
        } else {
            url.searchParams.append('order', params.order);
        }
    }
    if (params.searchTerms) url.searchParams.append('searchTerms', params.searchTerms);
    if (params.pageToken) url.searchParams.append('pageToken', params.pageToken);
    if (params.maxResults) url.searchParams.append('maxResults', params.maxResults.toString());

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!res.ok) {
        const err = await res.json();
        console.error("Error fetching comments:", err);
        return null; // Or throw
    }

    return await res.json();
};


export const replyToComment = async (parentId: string, text: string): Promise<ReplyResponse | null> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const endpoint = 'comments?part=snippet';

    const bodyData = {
        snippet: {
            parentId: parentId,
            textOriginal: text
        }
    };

    const res = await fetch(PROXY_ACTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: token,
            method: 'POST',
            endpoint: endpoint,
            data: bodyData
        })
    });

    if (!res.ok) {
        const err = await res.json();
        console.error("Error replying to comment:", err);
        throw new Error(err.message || "Failed to reply");
    }

    return await res.json();
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const endpoint = `comments?id=${commentId}`;

    const res = await fetch(PROXY_ACTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: token,
            method: 'DELETE',
            endpoint: endpoint
        })
    });

    if (!res.ok) {
        console.error("Error deleting comment:", await res.text());
        return false;
    }

    return true;
};

export const setCommentModerationStatus = async (commentId: string, status: 'heldForReview' | 'published' | 'rejected'): Promise<boolean> => {
    // NOTE: This usually requires 'moderationStatus' parameter in 'comments.setModerationStatus'
    // id: string (commentId)
    // moderationStatus: string
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const url = `${BASE_URL}/comments/setModerationStatus?id=${commentId}&moderationStatus=${status}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        console.error("Error setting moderation status:", await res.text());
        return false;
    }
    return true;
};

// NOTE: Creating a "Pin" logic via API v3 is not straightforwardly exposed as "pinComment".
// Often it is separate or requires 'channel owner' context heavily.
// However, we will assume for now we can't easily "Pin" via standard v3 without potential workaround or specific permission.
// I'll leave a placeholder or try `update` if I find `isPinned` is writable, but docs say it's read-only.
// Let's implement 'Heart' (ViewerRating) instead as requested "curtir, dar coração".

// Helper to get Channel ID
export const getMyChannelId = async (): Promise<string> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const res = await fetch(`${BASE_URL}/channels?part=id&mine=true`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error("Failed to fetch channel ID");

    const data = await res.json();
    if (data.items && data.items.length > 0) {
        return data.items[0].id;
    }
    throw new Error("No channel found for this user");
};

export const rateComment = async (commentId: string, rating: 'like' | 'none'): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const endpoint = 'comments/rate';
    const params = { id: commentId, rating: rating };

    const res = await fetch(PROXY_ACTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: token,
            method: 'POST',
            endpoint: endpoint,
            params: params,
            // Header Content-Length: 0 will be handled by backend if 'data' is undefined/null
        })
    });

    if (!res.ok) {
        console.error("Error rating comment:", await res.text());
        return false;
    }
    return true;
};

// --- AI & Quick Replies ---

const BACKEND_API_URL = 'https://yt-dashboard-backend.vercel.app/comments';

export const generateAiReply = async (commentText: string, videoTitle?: string, style: string = 'professional', authorName?: string): Promise<string> => {
    try {
        const res = await fetch(`${BACKEND_API_URL}/generate-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentText, videoTitle, style, authorName })
        });

        if (!res.ok) {
            console.error("Failed to generate AI reply status:", res.status);
            throw new Error("Failed to generate AI reply");
        }
        return await res.text();
    } catch (error) {
        console.error("Error generating AI reply:", error);
        throw error;
    }
};

export interface QuickReply {
    id: string;
    title: string;
    text: string;
}

export const fetchQuickReplies = async (): Promise<QuickReply[]> => {
    try {
        const res = await fetch(`${BACKEND_API_URL}/quick-replies`);
        if (!res.ok) throw new Error("Failed to fetch quick replies");
        return await res.json();
    } catch (error) {
        console.error("Error fetching quick replies:", error);
        return [];
    }
};

export const createQuickReply = async (title: string, text: string): Promise<QuickReply[]> => {
    const res = await fetch(`${BACKEND_API_URL}/quick-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text })
    });
    if (!res.ok) throw new Error("Failed to create quick reply");
    return await res.json();
};

export const deleteQuickReply = async (id: string): Promise<boolean> => {
    const res = await fetch(`${BACKEND_API_URL}/quick-replies/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete quick reply");
    return true;
};

export const learnReply = async (commentText: string, replyText: string): Promise<void> => {
    // Fire and forget learning, but we log errors
    try {
        await fetch(`${BACKEND_API_URL}/learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentText, replyText })
        });
    } catch (e) {
        console.warn("Failed to save reply for learning:", e);
    }
};
