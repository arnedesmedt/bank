import { API_URL, apiGet } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LabelLink {
    id: string;
    name: string;
    isManual: boolean;
}

export interface Transfer {
    id: string;
    amount: string;
    date: string;
    fromAccountId: string | null;
    fromAccountNumber: string | null;
    fromAccountName: string | null;
    toAccountId: string | null;
    toAccountNumber: string | null;
    toAccountName: string | null;
    reference: string;
    csvSource: string;
    transactionId: string | null;
    isInternal: boolean;
    labelIds: string[];
    labelNames: string[];
    labelLinks: LabelLink[];
    parentTransferId: string | null;
}

export interface TransferFilters {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    labelIds?: string[];
    accountId?: string;
    accountIds?: string[];
}

export interface GroupByResult {
    id: string;
    period: string;
    labelId: string | null;
    labelName: string | null;
    totalAmount: string;
    transferCount: number;
}

export interface BulkActionRequest {
    action: 'apply_label' | 'remove_label' | 'mark_refund' | 'remove_refund';
    transferIds: string[];
    labelId?: string;
    parentTransferId?: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Fetch transfers with optional filters.
 */
export async function fetchTransfers(
    filters: TransferFilters,
    accessToken: string,
): Promise<Transfer[]> {
    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.search) params.set('search', filters.search);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.accountId) params.set('accountId', filters.accountId);
    if (filters.labelIds && filters.labelIds.length > 0) {
    if (filters.accountIds && filters.accountIds.length > 0) {
        filters.accountIds.forEach((id) => params.append('accountIds[]', id));
    }
        filters.labelIds.forEach((id) => params.append('labelIds[]', id));
    }

    const query = params.toString();
    return apiGet<Transfer[]>(`/api/transfers${query ? `?${query}` : ''}`, accessToken);
}

/**
 * Perform a bulk action on multiple transfers.
 */
export async function bulkAction(
    request: BulkActionRequest,
    accessToken: string,
): Promise<Transfer[]> {
    const response = await fetch(`${API_URL}/api/transfers/bulk`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/merge-patch+json',
            Accept: 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail ?? `Bulk action failed: ${response.status}`);
    }

    return response.json() as Promise<Transfer[]>;
}

/**
 * Fetch group-by aggregation results.
 */
export async function fetchGroupBy(    params: {
        groupBy?: 'period' | 'label' | 'label_and_period';
        period?: 'month' | 'quarter' | 'year';
        dateFrom?: string;
        dateTo?: string;
        labelIds?: string[];
    },
    accessToken: string,
): Promise<GroupByResult[]> {
    const q = new URLSearchParams();
    if (params.groupBy) q.set('groupBy', params.groupBy);
    if (params.period) q.set('period', params.period);
    if (params.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params.dateTo) q.set('dateTo', params.dateTo);
    if (params.labelIds && params.labelIds.length > 0) {
        params.labelIds.forEach((id) => q.append('labelIds[]', id));
    }

    return apiGet<GroupByResult[]>(`/api/group-by?${q.toString()}`, accessToken);
}

/**
 * Delete every transfer in the database (irreversible).
 * Returns the count of deleted records.
 */
export async function deleteAllTransfers(accessToken: string): Promise<{ deleted: number }> {
    const response = await fetch(`${API_URL}/api/settings/transfers`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail ?? `Failed to delete transfers: ${response.status}`);
    }

    return response.json() as Promise<{ deleted: number }>;
}
