import { apiGet, API_URL } from './apiClient';

/**
 * Represents a label as returned by GET /api/labels.
 * Labels are applied to transfers either manually or automatically
 * based on bank account links and regex patterns configured during
 * the CSV import feature.
 */
export interface Label {
    id: string;
    name: string;
    parentLabelId: string | null;
    parentLabelName: string | null;
    linkedBankAccountIds: string[];
    linkedRegexes: string[];
    maxValue: string | null;
    maxPercentage: string | null;
}

/** Fetch all labels belonging to the authenticated user. */
export function fetchLabels(accessToken: string): Promise<Label[]> {
    return apiGet<Label[]>('/api/labels', accessToken);
}

/** Fetch a single label by ID. */
export function fetchLabel(id: string, accessToken: string): Promise<Label> {
    return apiGet<Label>(`/api/labels/${id}`, accessToken);
}

/** Update a label by ID. */
export async function updateLabel(
    id: string,
    data: Omit<Label, 'id' | 'parentLabelName'>,
    accessToken: string,
): Promise<Label> {
    const response = await fetch(`${API_URL}/api/labels/${id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const err = (await response.json()) as { detail?: string };
        throw new Error(err.detail ?? 'Failed to update label');
    }

    return response.json() as Promise<Label>;
}

/** Delete a label by ID. */
export async function deleteLabel(id: string, accessToken: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/labels/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete label');
    }
}

/** Fetch transfers linked to a specific label. */
export interface LabelTransfer {
    id: string;
    amount: string;
    date: string;
    fromAccountName: string | null;
    fromAccountNumber: string | null;
    toAccountName: string | null;
    toAccountNumber: string | null;
    reference: string;
    isInternal: boolean;
    labelLinks: { id: string; name: string; isManual: boolean }[];
}

export function fetchLabelTransfers(
    labelId: string,
    accessToken: string,
    filters?: { search?: string; dateFrom?: string; dateTo?: string },
): Promise<LabelTransfer[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    const query = params.toString();
    return apiGet<LabelTransfer[]>(`/api/labels/${labelId}/transfers${query ? `?${query}` : ''}`, accessToken);
}

/** Manually assign a label to a transfer. */
export async function assignLabelToTransfer(
    transferId: string,
    labelId: string,
    accessToken: string,
): Promise<void> {
    const response = await fetch(`${API_URL}/api/transfers/${transferId}/labels/${labelId}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to assign label to transfer');
    }
}

/** Remove a label from a transfer (explicit removal). */
export async function removeLabelFromTransfer(
    transferId: string,
    labelId: string,
    accessToken: string,
): Promise<void> {
    const response = await fetch(`${API_URL}/api/transfers/${transferId}/labels/${labelId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to remove label from transfer');
    }
}
