const API_BASE = 'http://localhost:8080/api/active-campaign'; // Pointing to local backend (NestJS default port 8080) for testing

export interface ACList {
    id: string;
    name: string;
    stringid: string;
}

export interface ACCampaign {
    id: string;
    name: string;
    status: string;
    sdate: string;
    opens: string;
    uniqueopens: string;
    linkclicks: string;
    subscriberclicks: string;
    forwards: string;
    hardbounces: string;
    softbounces: string;
    unsubscribes: string;
}

export const getLists = async (): Promise<ACList[]> => {
    try {
        const res = await fetch(`${API_BASE}/lists`);
        if (!res.ok) throw new Error('Failed to fetch lists');
        const data = await res.json();
        return data.lists || [];
    } catch (error) {
        console.error("Error fetching lists:", error);
        return [];
    }
};

export const sendCampaign = async (subject: string, body: string, listId: string, fromname: string, fromemail: string, reply2: string, preheader: string): Promise<{ success: boolean, campaignId?: string }> => {
    try {
        const res = await fetch(`${API_BASE}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body, listId, fromname, fromemail, reply2, preheader })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to send campaign');
        }
        return await res.json();
    } catch (error) {
        console.error("Error sending campaign:", error);
        throw error;
    }
};

export const sendTestEmail = async (subject: string, body: string, emailTo: string): Promise<{ success: boolean, message?: string }> => {
    try {
        const res = await fetch(`${API_BASE}/send-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, body, emailTo })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || err.error || 'Failed to send test email');
        }
        return await res.json();
    } catch (error) {
        console.error("Error sending test email:", error);
        throw error;
    }
};

export const getReports = async (): Promise<ACCampaign[]> => {
    try {
        const res = await fetch(`${API_BASE}/reports`);
        if (!res.ok) throw new Error('Failed to fetch reports');
        return await res.json();
    } catch (error) {
        console.error("Error fetching reports:", error);
        return [];
    }
};
