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

// ─── TransferImport ────────────────────────────────────────────────────────────

describe('TransferImport', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the file input and import button', () => {
        render(<TransferImport />);
        expect(screen.getByText(/Import CSV Transfers/i)).toBeInTheDocument();
        expect(document.getElementById('file-upload')).toBeInTheDocument();
    });

    it('shows success message after a successful import', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Import completed', imported: 3, skipped: 1, errors: [] }),
        }));

        render(<TransferImport />);

        // Select a file first (button only appears after file selection)
        const file = new File(['date;amount'], 'belfius.csv', { type: 'text/csv' });
        const input = document.getElementById('file-upload') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [file] } });

        fireEvent.click(screen.getByRole('button', { name: /Upload & Import/i }));

        await waitFor(() => {
            expect(screen.getByText(/Import Complete!/i)).toBeInTheDocument();
            expect(screen.getByText(/Imported: 3 transfers/i)).toBeInTheDocument();
        });
    });

    it('shows error message when the upload fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: { message: 'Invalid CSV format' } }),
        }));

        render(<TransferImport />);

        const file = new File(['bad data'], 'bad.csv', { type: 'text/csv' });
        const input = document.getElementById('file-upload') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [file] } });

        fireEvent.click(screen.getByRole('button', { name: /Upload & Import/i }));

        await waitFor(() => {
            expect(screen.getByText(/Error: Invalid CSV format/i)).toBeInTheDocument();
        });
    });
});

// ─── TransferList ──────────────────────────────────────────────────────────────

describe('TransferList', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders transfer rows after loading', async () => {
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
                },
            ]),
        }));

        render(<TransferList />);

        await waitFor(() => {
            expect(screen.getByText('Shop ABC')).toBeInTheDocument();
            expect(screen.getByText('Groceries purchase')).toBeInTheDocument();
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



