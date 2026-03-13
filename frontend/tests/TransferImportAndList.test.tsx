// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransferImport } from '../src/components/TransferImport';
import { TransferList } from '../src/components/TransferList';

// Provide a token so the components don't bail out early
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

// ─── TransferImport (T016: collapsible side panel) ────────────────────────────

describe('TransferImport', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the toggle button', () => {
        render(<TransferImport />);
        expect(screen.getByTestId('import-panel-toggle')).toBeInTheDocument();
    });

    it('panel is hidden by default', () => {
        render(<TransferImport />);
        const panel = screen.getByTestId('import-panel');
        // Panel has translate-x-full class when closed
        expect(panel.className).toContain('translate-x-full');
    });

    it('opens panel when toggle is clicked', async () => {
        render(<TransferImport />);
        fireEvent.click(screen.getByTestId('import-panel-toggle'));
        const panel = screen.getByTestId('import-panel');
        await waitFor(() => {
            expect(panel.className).toContain('translate-x-0');
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
            // T018: callback should be invoked
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
});

// ─── TransferList (T018: auto-update, T024: manual/auto label badges) ──────────

describe('TransferList', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders transfer rows with label badges', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1',
                    amount: '-50.00',
                    date: '2024-01-15T00:00:00+00:00',
                    fromAccountNumber: 'BE68539007547034',
                    fromAccountName: 'My Account',
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

        render(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText('Shop ABC')).toBeInTheDocument();
            expect(screen.getByText('Groceries purchase')).toBeInTheDocument();
        });
    });

    it('T024: shows automatic label badge (⚙) for auto-assigned labels', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ([
                {
                    id: 't-1', amount: '-10.00', date: '2024-01-01T00:00:00+00:00',
                    fromAccountNumber: null, fromAccountName: 'Me',
                    toAccountNumber: null, toAccountName: 'Shop',
                    reference: 'ref', csvSource: 'x.csv', transactionId: null,
                    isInternal: false,
                    labelIds: ['l-1'], labelNames: ['Auto'],
                    labelLinks: [{ id: 'l-1', name: 'Auto', isManual: false }],
                },
            ]),
        }));

        render(<TransferList />);
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
                    fromAccountNumber: null, fromAccountName: 'Me',
                    toAccountNumber: null, toAccountName: 'Shop',
                    reference: 'ref', csvSource: 'x.csv', transactionId: null,
                    isInternal: false,
                    labelIds: ['l-1'], labelNames: ['Manual'],
                    labelLinks: [{ id: 'l-1', name: 'Manual', isManual: true }],
                },
            ]),
        }));

        render(<TransferList />);
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

        render(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText(/No transfers found/i)).toBeInTheDocument();
        });
    });

    it('shows error state when the API fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({}),
        }));

        render(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to load transfers/i)).toBeInTheDocument();
        });
    });
});

