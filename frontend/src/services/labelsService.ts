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
