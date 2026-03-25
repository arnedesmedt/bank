// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransferList } from '../src/components/TransferList';
import type { Transfer } from '../src/services/transfersService';

vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTransfer = (overrides: Partial<Transfer> = {}): Transfer => ({
    id: 't-' + Math.random().toString(36).slice(2),
    amount: '-50.00',
    amountBeforeRefund: null,
    date: '2026-01-15T00:00:00+00:00',
    fromAccountId: 'acct-1',
    fromAccountNumber: 'BE68539007547034',
    fromAccountName: 'My Account',
    toAccountId: 'acct-2',
    toAccountNumber: 'BE76096123456789',
    toAccountName: 'Shop ABC',
    reference: 'Test transfer',
    csvSource: 'belfius.csv',
    transactionId: null,
    isInternal: false,
    labelIds: [],
    labelNames: [],
    labelLinks: [],
    parentTransferId: null,
    childRefundIds: [],
    ...overrides,
});

const mockFetchWith = (transfers: Transfer[]) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => transfers,
    }));
};

// ── T015: Refund linking UI integration ───────────────────────────────────────

describe('TransferList – refund linking UI (T015)', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('shows Link Refunds button in action panel when exactly 1 transfer is selected', async () => {
        mockFetchWith([makeTransfer({ id: 't-1', reference: 'Salary' })]);

        renderWithRouter(<TransferList />);

        await waitFor(() => expect(screen.getByText('Salary')).toBeInTheDocument());

        // Select the single transfer
        const checkbox = screen.getByLabelText('Select transfer t-1');
        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(screen.getByLabelText('Link refund transfers')).toBeInTheDocument();
        });
    });

    it('does NOT show Link Refunds button when more than 1 transfer is selected', async () => {
        mockFetchWith([
            makeTransfer({ id: 't-1', reference: 'Transfer A' }),
            makeTransfer({ id: 't-2', reference: 'Transfer B' }),
        ]);

        renderWithRouter(<TransferList />);

        await waitFor(() => expect(screen.getByText('Transfer A')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer t-1'));
        fireEvent.click(screen.getByLabelText('Select transfer t-2'));

        await waitFor(() => {
            expect(screen.queryByLabelText('Link refund transfers')).not.toBeInTheDocument();
        });
    });

    it('opens the refund picker modal on Link Refunds click', async () => {
        mockFetchWith([
            makeTransfer({ id: 't-1', reference: 'Parent invoice', amount: '100.00' }),
            makeTransfer({ id: 't-2', reference: 'Partial refund', amount: '-15.00' }),
        ]);

        renderWithRouter(<TransferList />);

        await waitFor(() => expect(screen.getByText('Parent invoice')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer t-1'));

        await waitFor(() =>
            expect(screen.getByLabelText('Link refund transfers')).toBeInTheDocument(),
        );
        fireEvent.click(screen.getByLabelText('Link refund transfers'));

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: /Select refund transfers/i })).toBeInTheDocument();
            expect(screen.getByText('Link Refund Transfers')).toBeInTheDocument();
        });
    });

    it('modal lists eligible transfers (not the parent, not already linked)', async () => {
        mockFetchWith([
            makeTransfer({ id: 't-1', reference: 'Parent', amount: '100.00' }),
            makeTransfer({ id: 't-2', reference: 'Eligible refund', amount: '-10.00' }),
            makeTransfer({ id: 't-3', reference: 'Already linked', amount: '-5.00', parentTransferId: 'other-parent' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer t-1'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));

        await waitFor(() => {
            // Eligible refund appears
            expect(screen.getByText('Eligible refund')).toBeInTheDocument();
            // Already-linked transfer should not appear
            expect(screen.queryByText('Already linked')).not.toBeInTheDocument();
        });
    });

    it('modal shows live amount preview when refunds are selected', async () => {
        mockFetchWith([
            makeTransfer({ id: 't-1', reference: 'Parent', amount: '100.00' }),
            makeTransfer({ id: 't-2', reference: 'Refund item', amount: '-20.00' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer t-1'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));

        await waitFor(() => expect(screen.getByText('Refund item')).toBeInTheDocument());

        // Select the refund in the modal
        fireEvent.click(screen.getByLabelText('Select refund transfer t-2'));

        await waitFor(() => {
            expect(screen.getByText(/1 refund selected/i)).toBeInTheDocument();
            expect(screen.getByText(/refund sum/i)).toBeInTheDocument();
        });
    });

    it('confirm button calls bulkAction with mark_refund and closes modal', async () => {
        const mockFetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [makeTransfer({ id: 't-1' }), makeTransfer({ id: 't-2' })] }) // initial load
            .mockResolvedValueOnce({ ok: true, json: async () => [makeTransfer({ id: 't-2' })] }) // bulk PATCH
            .mockResolvedValue({ ok: true, json: async () => [makeTransfer({ id: 't-1' }), makeTransfer({ id: 't-2' })] }); // reload

        vi.stubGlobal('fetch', mockFetch);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));

        fireEvent.click(screen.getByLabelText('Select transfer t-1'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Select refund transfer t-2')));

        fireEvent.click(screen.getByRole('button', { name: /Link 1 refund/i }));

        await waitFor(() => {
            const patchCall = mockFetch.mock.calls.find(
                (call) => call[0] === `${import.meta.env.VITE_API_URL ?? ''}/api/transfers/bulk`,
            );
            expect(patchCall).toBeDefined();
        });
    });

    it('Cancel button closes the modal without calling API', async () => {
        mockFetchWith([
            makeTransfer({ id: 't-1', reference: 'Parent' }),
            makeTransfer({ id: 't-2', reference: 'Potential refund' }),
        ]);

        const mockFetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [makeTransfer({ id: 't-1' }), makeTransfer({ id: 't-2' })],
        });
        vi.stubGlobal('fetch', mockFetchSpy);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer t-1'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));
        await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

        const callsBefore = mockFetchSpy.mock.calls.length;
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        // No additional API calls were made
        expect(mockFetchSpy.mock.calls.length).toBe(callsBefore);
    });

    it('shows refund child indented under parent with Refund badge', async () => {
        mockFetchWith([
            makeTransfer({ id: 'parent-1', reference: 'Main transfer', amount: '100.00', childRefundIds: ['child-1'] }),
            makeTransfer({ id: 'child-1', reference: 'Refund row', amount: '-10.00', parentTransferId: 'parent-1' }),
        ]);

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText('Main transfer')).toBeInTheDocument();
            expect(screen.getByText('Refund row')).toBeInTheDocument();
            expect(screen.getByText('Refund')).toBeInTheDocument();
        });
    });

    it('shows original amount as strikethrough when amountBeforeRefund differs', async () => {
        mockFetchWith([
            makeTransfer({
                id: 't-1',
                reference: 'Parent with refund',
                amount: '85.00',
                amountBeforeRefund: '100.00',
            }),
        ]);

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            const struckThrough = document.querySelector('.line-through');
            expect(struckThrough).toBeInTheDocument();
        });
    });

    it('collapse toggle hides/shows refund children', async () => {
        mockFetchWith([
            makeTransfer({ id: 'p-1', reference: 'Parent', childRefundIds: ['c-1'] }),
            makeTransfer({ id: 'c-1', reference: 'Child refund', parentTransferId: 'p-1' }),
        ]);

        renderWithRouter(<TransferList />);

        await waitFor(() => expect(screen.getByText('Child refund')).toBeInTheDocument());

        // Collapse
        fireEvent.click(screen.getByLabelText('Collapse refunds'));
        await waitFor(() => expect(screen.queryByText('Child refund')).not.toBeInTheDocument());

        // Expand again
        fireEvent.click(screen.getByLabelText('Expand refunds'));
        await waitFor(() => expect(screen.getByText('Child refund')).toBeInTheDocument());
    });
});

