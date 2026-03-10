import { apiGet } from './apiClient';

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
