import { useState, useEffect } from 'react';
import type { TransferFilters } from '../components/ActionBar';

const STORAGE_KEY = 'bank-transfer-filters';

const DEFAULT_FILTERS: TransferFilters = {
    search: '',
    dateFrom: '',
    dateTo: '',
    labelIds: [],
    accountIds: []
};

/**
 * Hook for persisting transfer filters to localStorage
 * Automatically saves filter changes and restores them on component mount
 */
export function usePersistedFilters(): [TransferFilters, (filters: TransferFilters) => void] {
    // Initialize filters synchronously from localStorage
    const getInitialFilters = (): TransferFilters => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsedFilters = JSON.parse(stored);
                // Validate that the parsed object has the expected structure
                if (parsedFilters && 
                    typeof parsedFilters === 'object' &&
                    typeof parsedFilters.search === 'string' &&
                    typeof parsedFilters.dateFrom === 'string' &&
                    typeof parsedFilters.dateTo === 'string' &&
                    Array.isArray(parsedFilters.labelIds) &&
                    Array.isArray(parsedFilters.accountIds)) {
                    return parsedFilters;
                }
            }
        } catch (error) {
            console.warn('Failed to load filters from localStorage:', error);
        }
        return DEFAULT_FILTERS;
    };

    const [filters, setFilters] = useState<TransferFilters>(getInitialFilters);

    // Create a wrapper function that saves to localStorage
    const updateFilters = (newFilters: TransferFilters) => {
        setFilters(newFilters);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
        } catch (error) {
            console.warn('Failed to save filters to localStorage:', error);
        }
    };

    return [filters, updateFilters];
}
