// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransferImport } from '../src/components/TransferImport';
import { TransferList } from '../src/components/TransferList';

// Provide a token so the components don't bail out early
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

// ─── TransferImport (US2: responsive import panel) ────────────────────────────

describe('TransferImport', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Simulate narrow screen by default for accordion tests
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    });

    it('renders the toggle button on narrow screens', () => {
        render(<TransferImport />);
        expect(screen.getByTestId('import-panel-toggle')).toBeInTheDocument();
    });

    it('panel content is hidden by default on narrow screens', () => {
        render(<TransferImport />);
        expect(screen.queryByTestId('file-input')).not.toBeInTheDocument();
    });

    it('opens panel when toggle is clicked on narrow screens', async () => {
        render(<TransferImport />);
        fireEvent.click(screen.getByTestId('import-panel-toggle'));
        await waitFor(() => {
            expect(screen.getByTestId('file-input')).toBeInTheDocument();
        });
    });

    it('shows file input in open panel', async () => {
        render(<TransferImport />);
        fireEvent.click(screen.getByTestId('import-panel-toggle'));
        await waitFor(() => {
            expect(screen.getByTestId('file-input')).toBeInTheDocument();
        });
    });

    it('shows success message after a successful import', async () => {
        const onImportComplete = vi.fn();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Import completed', imported: 3, skipped: 1, errors: [] }),
        }));

        render(<TransferImport onImportComplete={onImportComplete} />);

        // Open the panel
        fireEvent.click(screen.getByTestId('import-panel-toggle'));

        // Select a file
        const file = new File(['date;amount'], 'belfius.csv', { type: 'text/csv' });
        const input = screen.getByTestId('file-input');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(screen.getByTestId('upload-button')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('upload-button'));

        await waitFor(() => {
            expect(screen.getByText(/Import Complete!/i)).toBeInTheDocument();
            expect(screen.getByText(/Imported: 3 transfers/i)).toBeInTheDocument();
            expect(onImportComplete).toHaveBeenCalledOnce();
        });
    });

    it('shows error message when the upload fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: { message: 'Invalid CSV format' } }),
        }));

        render(<TransferImport />);
        fireEvent.click(screen.getByTestId('import-panel-toggle'));

        const file = new File(['bad data'], 'bad.csv', { type: 'text/csv' });
        const input = screen.getByTestId('file-input');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(screen.getByTestId('upload-button')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('upload-button'));

        await waitFor(() => {
            expect(screen.getByText(/Error: Invalid CSV format/i)).toBeInTheDocument();
        });
    });

    it('renders as fixed panel on wide screens (no toggle button)', () => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
        render(<TransferImport />);
        // On wide screens: no toggle button, panel always visible
        expect(screen.queryByTestId('import-panel-toggle')).not.toBeInTheDocument();
        expect(screen.getByTestId('import-panel')).toBeInTheDocument();
        expect(screen.getByTestId('file-input')).toBeInTheDocument();
    });
});

// ─── TransferList (US1: clickable bank accounts, label badges) ─────────────────


describe('TransferList', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    const renderWithRouter = (ui: React.ReactElement) =>
        render(<MemoryRouter>{ui}</MemoryRouter>);

    it('renders transfer rows with label badges', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1',
                    amount: '-50.00',
                    date: '2024-01-15T00:00:00+00:00',
                    fromAccountId: 'acct-1',
                    fromAccountNumber: 'BE68539007547034',
                    fromAccountName: 'My Account',
                    toAccountId: 'acct-2',
                    toAccountNumber: 'BE76096123456789',
                    toAccountName: 'Shop ABC',
                    reference: 'Groceries purchase',
                    csvSource: 'belfius.csv',
                    transactionId: '001',
                    isInternal: false,
                    labelIds: ['l-1'],
                    labelNames: ['Groceries'],
                    labelLinks: [{ id: 'l-1', name: 'Groceries', isManual: false }],
                },
            ]),
        }));

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText('Shop ABC')).toBeInTheDocument();
            expect(screen.getByText('Groceries purchase')).toBeInTheDocument();
        });
    });

    it('US1: renders bank accounts as clickable links when IDs are provided', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1',
                    amount: '-50.00',
                    date: '2024-01-15T00:00:00+00:00',
                    fromAccountId: 'acct-from',
                    fromAccountNumber: 'BE68539007547034',
                    fromAccountName: 'My Account',
                    toAccountId: 'acct-to',
                    toAccountNumber: 'BE76096123456789',
                    toAccountName: 'Shop ABC',
                    reference: 'ref',
                    csvSource: 'x.csv',
                    transactionId: null,
                    isInternal: false,
                    labelIds: [],
                    labelNames: [],
                    labelLinks: [],
                },
            ]),
        }));

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            const fromLink = screen.getByRole('link', { name: /View account: My Account/i });
            expect(fromLink).toBeInTheDocument();
            expect(fromLink).toHaveAttribute('href', '/accounts/acct-from');
            const toLink = screen.getByRole('link', { name: /View account: Shop ABC/i });
            expect(toLink).toBeInTheDocument();
            expect(toLink).toHaveAttribute('href', '/accounts/acct-to');
        });
    });

    it('US1: renders plain text (no link) when account IDs are missing', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1',
                    amount: '-10.00',
                    date: '2024-01-01T00:00:00+00:00',
                    fromAccountId: null,
                    fromAccountNumber: null,
                    fromAccountName: 'Unknown',
                    toAccountId: null,
                    toAccountNumber: null,
                    toAccountName: 'Payee',
                    reference: 'ref',
                    csvSource: 'x.csv',
                    transactionId: null,
                    isInternal: false,
                    labelIds: [],
                    labelNames: [],
                    labelLinks: [],
                },
            ]),
        }));

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText('Payee')).toBeInTheDocument();
            // No links when accountId is null
            expect(screen.queryByRole('link', { name: /View account: Payee/i })).not.toBeInTheDocument();
        });
    });

    it('T024: shows automatic label badge (⚙) for auto-assigned labels', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1', amount: '-10.00', date: '2024-01-01T00:00:00+00:00',
                    fromAccountId: null, fromAccountNumber: null, fromAccountName: 'Me',
                    toAccountId: null, toAccountNumber: null, toAccountName: 'Shop',
                    reference: 'ref', csvSource: 'x.csv', transactionId: null,
                    isInternal: false,
                    labelIds: ['l-1'], labelNames: ['Auto'],
                    labelLinks: [{ id: 'l-1', name: 'Auto', isManual: false }],
                },
            ]),
        }));

        renderWithRouter(<TransferList />);
        await waitFor(() => {
            const badge = screen.getByTitle('Auto-assigned');
            expect(badge).toBeInTheDocument();
        });
    });

    it('T024: shows manual label badge (🖊) for manually-assigned labels', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1', amount: '-10.00', date: '2024-01-01T00:00:00+00:00',
                    fromAccountId: null, fromAccountNumber: null, fromAccountName: 'Me',
                    toAccountId: null, toAccountNumber: null, toAccountName: 'Shop',
                    reference: 'ref', csvSource: 'x.csv', transactionId: null,
                    isInternal: false,
                    labelIds: ['l-1'], labelNames: ['Manual'],
                    labelLinks: [{ id: 'l-1', name: 'Manual', isManual: true }],
                },
            ]),
        }));

        renderWithRouter(<TransferList />);
        await waitFor(() => {
            const badge = screen.getByTitle('Manually assigned');
            expect(badge).toBeInTheDocument();
        });
    });

    it('shows empty state when there are no transfers', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([]),
        }));

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText(/No transfers found/i)).toBeInTheDocument();
        });
    });

    it('shows error state when the API fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({}),
        }));

        renderWithRouter(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to load transfers/i)).toBeInTheDocument();
        });
    });
});

