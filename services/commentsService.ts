import { getAccessToken } from './authService';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

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
        url.searchParams.append('allThreadsRelatedToChannelId', 'MINE'); // Default to my channel
    }

    if (params.order) url.searchParams.append('order', params.order);
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

    const url = `${BASE_URL}/comments?part=snippet`;

    const body = {
        snippet: {
            parentId: parentId,
            textOriginal: text
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const err = await res.json();
        console.error("Error replying to comment:", err);
        throw new Error(err.error?.message || "Failed to reply");
    }

    return await res.json();
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const url = `${BASE_URL}/comments?id=${commentId}`; // DELETE method

    const res = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        console.error("Error deleting comment:", await res.text());
        return false;
    }

    return true; // 204 No Content typically
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

export const rateComment = async (commentId: string, rating: 'like' | 'none'): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication required");

    const url = `${BASE_URL}/comments/rate?id=${commentId}&rating=${rating}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        console.error("Error rating comment:", await res.text());
        return false;
    }
    return true;
};
