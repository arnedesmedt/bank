import { useState, useRef } from 'react';
import type { TransferFilters } from '../components/ActionBar';

const DEFAULT_FILTERS: TransferFilters = {
    search: '',
    dateFrom: '',
    dateTo: '',
    labelIds: [],
    accountIds: [],
    amountMin: '',
    amountMax: '',
    amountOperator: 'eq',
    excludeInternal: false
};

/**
 * Hook for persisting transfer filters to localStorage
 * Automatically saves filter changes and restores them on component mount
 * 
 * @param storageKey - The localStorage key to use for storing filters (defaults to 'bank-transfer-filters')
 */
export function usePersistedFilters(storageKey: string = 'bank-transfer-filters'): [TransferFilters, (filters: TransferFilters) => void] {
    // Initialize filters synchronously from localStorage
    const getInitialFilters = (): TransferFilters => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored && stored !== 'undefined' && stored !== 'null') {
                const parsedFilters = JSON.parse(stored);
                // Validate that the parsed object has the expected structure
                if (parsedFilters && 
                    typeof parsedFilters === 'object' &&
                    typeof parsedFilters.search === 'string' &&
                    typeof parsedFilters.dateFrom === 'string' &&
                    typeof parsedFilters.dateTo === 'string' &&
                    Array.isArray(parsedFilters.labelIds) &&
                    Array.isArray(parsedFilters.accountIds) &&
                    typeof parsedFilters.amountMin === 'string' &&
                    typeof parsedFilters.amountMax === 'string' &&
                    typeof parsedFilters.amountOperator === 'string' &&
                    typeof parsedFilters.excludeInternal === 'boolean' &&
                    ['eq', 'lt', 'gt', 'lte', 'gte'].includes(parsedFilters.amountOperator)) {
                    return parsedFilters;
                }
            }
        } catch (error) {
            console.warn('Failed to load filters from localStorage:', error);
            // Clear corrupted data to prevent future errors
            try {
                localStorage.removeItem(storageKey);
            } catch (clearError) {
                console.warn('Failed to clear corrupted localStorage:', clearError);
            }
        }
        return DEFAULT_FILTERS;
    };

    const [filters, setFilters] = useState<TransferFilters>(getInitialFilters);
    const prevFiltersRef = useRef<TransferFilters>(getInitialFilters());

    // Create a wrapper function that saves to localStorage only when filters actually change
    const updateFilters = (newFilters: TransferFilters) => {
        // Ensure we have valid filter objects
        const prevFilters = prevFiltersRef.current || DEFAULT_FILTERS;
        const safeNewFilters = {
            search: newFilters.search || '',
            dateFrom: newFilters.dateFrom || '',
            dateTo: newFilters.dateTo || '',
            labelIds: newFilters.labelIds || [],
            accountIds: newFilters.accountIds || [],
            amountMin: newFilters.amountMin || '',
            amountMax: newFilters.amountMax || '',
            amountOperator: (newFilters.amountOperator || 'eq') as TransferFilters['amountOperator'],
            excludeInternal: typeof newFilters.excludeInternal === 'boolean' ? newFilters.excludeInternal : false
        };
        
        // Check if filters actually changed
        const filtersChanged = 
            safeNewFilters.search !== prevFilters.search ||
            safeNewFilters.dateFrom !== prevFilters.dateFrom ||
            safeNewFilters.dateTo !== prevFilters.dateTo ||
            safeNewFilters.labelIds.length !== prevFilters.labelIds.length ||
            safeNewFilters.labelIds.some((id, i) => id !== prevFilters.labelIds[i]) ||
            safeNewFilters.accountIds.length !== prevFilters.accountIds.length ||
            safeNewFilters.accountIds.some((id, i) => id !== prevFilters.accountIds[i]) ||
            safeNewFilters.amountMin !== prevFilters.amountMin ||
            safeNewFilters.amountMax !== prevFilters.amountMax ||
            safeNewFilters.amountOperator !== prevFilters.amountOperator ||
            safeNewFilters.excludeInternal !== prevFilters.excludeInternal;

        if (!filtersChanged) {
            return; // No change, don't update
        }

        setFilters(safeNewFilters);
        prevFiltersRef.current = safeNewFilters;
        
        try {
            localStorage.setItem(storageKey, JSON.stringify(safeNewFilters));
        } catch (error) {
            console.warn('Failed to save filters to localStorage:', error);
        }
    };

    return [filters, updateFilters];
}
