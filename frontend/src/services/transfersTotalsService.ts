import { API_URL } from './apiClient';

export interface TransferTotals {
    totalIn: number;
    totalOut: number;
    net: number;
}

export async function fetchTransferTotals(
    filters: {
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        labelIds?: string[];
        accountIds?: string[];
        amountMin?: string;
        amountMax?: string;
        amountOperator?: string;
        excludeInternal?: boolean;
    },
    accessToken: string,
): Promise<TransferTotals> {
    const params = new URLSearchParams();

    // Add filter parameters
    if (filters.search) params.set('search', filters.search);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.labelIds && filters.labelIds.length > 0) {
        filters.labelIds.forEach(id => params.append('labelIds[]', id));
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
        filters.accountIds.forEach(id => params.append('accountIds[]', id));
    }
    if (filters.amountMin && filters.amountOperator !== 'none') params.set('amountMin', filters.amountMin);
    if (filters.amountMax && filters.amountOperator !== 'none') params.set('amountMax', filters.amountMax);
    if (filters.amountOperator && filters.amountOperator !== 'none') params.set('amountOperator', filters.amountOperator);
    if (filters.excludeInternal) params.set('excludeInternal', 'true');

    const response = await fetch(`${API_URL}/api/transfers/totals?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch transfer totals: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
        totalIn: data.totalIn || 0,
        totalOut: data.totalOut || 0,
        net: data.net || 0,
    };
}
