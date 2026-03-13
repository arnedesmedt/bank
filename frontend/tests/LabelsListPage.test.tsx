// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LabelsListPage from '../src/pages/LabelsListPage';

// Mock AuthContext so the component gets a token without a real provider
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

const mockLabelsResponse = [
    {
        id: '1',
        name: 'Groceries',
        parentLabelId: null,
        parentLabelName: null,
        linkedBankAccountIds: ['ba-1'],
        linkedRegexes: ['/CARREFOUR/i'],
        maxValue: null,
        maxPercentage: null,
    },
    {
        id: '2',
        name: 'Bread',
        parentLabelId: '1',
        parentLabelName: 'Groceries',
        linkedBankAccountIds: [],
        linkedRegexes: [],
        maxValue: null,
        maxPercentage: null,
    },
];

describe('LabelsListPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders LabelManager with labels', async () => {
        // LabelManager uses fetch directly for both labels and bank accounts
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation((url: string) => {
                if (typeof url === 'string' && url.includes('/api/labels')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockLabelsResponse),
                    });
                }
                if (typeof url === 'string' && url.includes('/api/bank-accounts')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve([]),
                    });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }),
        );

        render(<LabelsListPage />);

        await waitFor(() => {
            expect(screen.getByText('Labels')).toBeInTheDocument();
            expect(screen.getByText('Groceries')).toBeInTheDocument();
            expect(screen.getByText('Bread')).toBeInTheDocument();
        });
    });

    it('shows create label button on labels page', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            }),
        );

        render(<LabelsListPage />);

        await waitFor(() => {
            expect(screen.getByTestId('create-label-button')).toBeInTheDocument();
        });
    });

    it('shows empty state when no labels', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            }),
        );

        render(<LabelsListPage />);

        await waitFor(() => {
            expect(
                screen.getByText(/No labels yet/i) || screen.queryByTestId('labels-list') === null,
            ).toBeTruthy();
        });
    });
});
