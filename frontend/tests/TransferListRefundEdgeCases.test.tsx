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

// ── T016: Edge case tests ─────────────────────────────────────────────────────

describe('TransferList – refund linking edge cases (T016)', () => {
    beforeEach(() => vi.restoreAllMocks());

    // ── Self-link: parent itself not shown in modal ────────────────────────────

    it('modal does not list the parent transfer as an eligible refund (self-link prevention)', async () => {
        mockFetchWith([
            makeTransfer({ id: 'parent-self', reference: 'Parent itself', amount: '100.00' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent itself')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer parent-self'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            // The only transfer IS the parent — modal should show "no eligible" message
            expect(screen.getByText(/No eligible transfers/i)).toBeInTheDocument();
        });
    });

    // ── Already-linked: already a child of another parent not shown ────────────

    it('modal excludes transfers already linked to a parent', async () => {
        mockFetchWith([
            makeTransfer({ id: 'p', reference: 'Parent', amount: '200.00' }),
            makeTransfer({ id: 'linked', reference: 'Already a child', amount: '-10.00', parentTransferId: 'some-other' }),
            makeTransfer({ id: 'free', reference: 'Free transfer', amount: '-30.00' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer p'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));

        await waitFor(() => {
            expect(screen.queryByText('Already a child')).not.toBeInTheDocument();
            expect(screen.getByText('Free transfer')).toBeInTheDocument();
        });
    });

    // ── Already a child of this parent excluded ────────────────────────────────

    it('modal excludes transfers already linked as a child of the selected parent', async () => {
        mockFetchWith([
            makeTransfer({ id: 'par', reference: 'Parent', amount: '300.00', childRefundIds: ['existing-child'] }),
            makeTransfer({ id: 'existing-child', reference: 'Existing child', amount: '-50.00', parentTransferId: 'par' }),
            makeTransfer({ id: 'new-candidate', reference: 'New candidate', amount: '-20.00' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer par'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));

        await waitFor(() => {
            // Existing child already has a parentTransferId set — filtered out
            expect(screen.queryByText('Existing child')).not.toBeInTheDocument();
            expect(screen.getByText('New candidate')).toBeInTheDocument();
        });
    });

    // ── Link Refunds button only when exactly 1 selected ─────────────────────

    it('Link Refunds button is absent when 0 transfers are selected', async () => {
        mockFetchWith([makeTransfer({ id: 't1', reference: 'T1' })]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('T1')).toBeInTheDocument());

        expect(screen.queryByLabelText('Link refund transfers')).not.toBeInTheDocument();
    });

    it('Link Refunds button is absent when 3 transfers are selected', async () => {
        mockFetchWith([
            makeTransfer({ id: 'a', reference: 'A' }),
            makeTransfer({ id: 'b', reference: 'B' }),
            makeTransfer({ id: 'c', reference: 'C' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer a'));
        fireEvent.click(screen.getByLabelText('Select transfer b'));
        fireEvent.click(screen.getByLabelText('Select transfer c'));

        await waitFor(() => {
            expect(screen.queryByLabelText('Link refund transfers')).not.toBeInTheDocument();
        });
    });

    // ── Confirm disabled when no refunds selected ──────────────────────────────

    it('confirm button is disabled when no refunds are selected in modal', async () => {
        mockFetchWith([
            makeTransfer({ id: 'par2', reference: 'Parent 2', amount: '100.00' }),
            makeTransfer({ id: 'cand', reference: 'Candidate', amount: '-5.00' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Parent 2')).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText('Select transfer par2'));
        await waitFor(() => fireEvent.click(screen.getByLabelText('Link refund transfers')));

        await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

        const confirmBtn = screen.getByRole('button', { name: /Link refunds/i });
        expect(confirmBtn).toBeDisabled();
    });

    // ── Orphaned refunds: parentTransferId set but parent not in list ──────────

    it('shows Refund badge for transfers with parentTransferId even if parent not loaded', async () => {
        mockFetchWith([
            makeTransfer({ id: 'orphan', reference: 'Orphaned refund', parentTransferId: 'missing-parent' }),
        ]);

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText('Orphaned refund')).toBeInTheDocument();
            expect(screen.getByText('Refund')).toBeInTheDocument();
        });
    });

    // ── amountBeforeRefund: not shown when null ────────────────────────────────

    it('does NOT show strikethrough when amountBeforeRefund is null', async () => {
        mockFetchWith([
            makeTransfer({ id: 'plain', reference: 'Plain transfer', amount: '50.00', amountBeforeRefund: null }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Plain transfer')).toBeInTheDocument());

        expect(document.querySelector('.line-through')).not.toBeInTheDocument();
    });

    it('does NOT show strikethrough when amountBeforeRefund equals amount', async () => {
        mockFetchWith([
            makeTransfer({ id: 'same', reference: 'Same amount', amount: '50.00', amountBeforeRefund: '50.00' }),
        ]);

        renderWithRouter(<TransferList />);
        await waitFor(() => expect(screen.getByText('Same amount')).toBeInTheDocument());

        expect(document.querySelector('.line-through')).not.toBeInTheDocument();
    });
});

