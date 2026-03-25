// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActionBar } from '../src/components/ActionBar';
import type { TransferFilters } from '../src/components/ActionBar';

vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

const EMPTY_FILTERS: TransferFilters = { search: '', dateFrom: '', dateTo: '', labelIds: [], accountIds: [] };

// ─── ActionBar filtering tests ────────────────────────────────────────────────

describe('ActionBar', () => {
    it('renders nothing when no children and no filters', () => {
        const { container } = renderWithRouter(<ActionBar />);
        expect(container.firstChild).toBeNull();
    });

    it('renders children when provided', () => {
        renderWithRouter(
            <ActionBar>
                <button>Import</button>
            </ActionBar>,
        );
        expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('renders filter controls when filters prop is provided', () => {
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={() => {}}
            />,
        );
        expect(screen.getByPlaceholderText(/Search transfers/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Date from/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Date to/i)).toBeInTheDocument();
    });

    it('calls onFiltersChange with updated search on input', async () => {
        const onFiltersChange = vi.fn();
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={onFiltersChange}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText(/Search transfers/i), {
            target: { value: 'supermarket' },
        });
        // Debounced - wait for callback
        await waitFor(() => {
            expect(onFiltersChange).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'supermarket' }),
            );
        }, { timeout: 500 });
    });

    it('calls onFiltersChange with dateFrom on date input', () => {
        const onFiltersChange = vi.fn();
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={onFiltersChange}
            />,
        );
        fireEvent.change(screen.getByLabelText(/Date from/i), {
            target: { value: '2026-01-01' },
        });
        expect(onFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ dateFrom: '2026-01-01' }),
        );
    });

    it('shows label dropdown with available labels', () => {
        const labels = [
            { id: 'label-1', name: 'Groceries' },
            { id: 'label-2', name: 'Transport' },
        ];
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={() => {}}
                availableLabels={labels}
            />,
        );
        expect(screen.getByRole('button', { name: /Labels/i })).toBeInTheDocument();
    });

    it('opens label dropdown on click and shows label options', () => {
        const labels = [{ id: 'label-1', name: 'Groceries' }];
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={() => {}}
                availableLabels={labels}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Labels/i }));
        expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    it('shows Clear button when filters are active', () => {
        const filtersWithSearch: TransferFilters = { ...EMPTY_FILTERS, search: 'test' };
        renderWithRouter(
            <ActionBar
                filters={filtersWithSearch}
                onFiltersChange={() => {}}
            />,
        );
        expect(screen.getByRole('button', { name: /Clear all filters/i })).toBeInTheDocument();
    });

    it('calls onFiltersChange with empty filters on Clear click', () => {
        const onFiltersChange = vi.fn();
        const filtersWithSearch: TransferFilters = { ...EMPTY_FILTERS, search: 'test' };
        renderWithRouter(
            <ActionBar
                filters={filtersWithSearch}
                onFiltersChange={onFiltersChange}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Clear all filters/i }));
        expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_FILTERS);
    });

    it('shows bulk action button when selectedCount > 0', () => {
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={() => {}}
                selectedCount={3}
                onBulkAction={() => {}}
            />,
        );
        expect(screen.getByRole('button', { name: /Bulk actions/i })).toBeInTheDocument();
    });

    it('does NOT show remove refund link in bulk menu (removed in spec 010)', () => {
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={() => {}}
                selectedCount={2}
                onBulkAction={() => {}}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Bulk actions/i }));
        expect(screen.queryByText(/Remove refund link/i)).not.toBeInTheDocument();
    });

    it('does not expose remove_refund action in bulk menu', () => {
        const onBulkAction = vi.fn();
        renderWithRouter(
            <ActionBar
                filters={EMPTY_FILTERS}
                onFiltersChange={() => {}}
                selectedCount={2}
                onBulkAction={onBulkAction}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Bulk actions/i }));
        // No remove_refund button should exist in the menu
        expect(screen.queryByText(/remove.refund/i)).not.toBeInTheDocument();
        expect(onBulkAction).not.toHaveBeenCalled();
    });
});

