// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as labelsService from '../src/services/labelsService';
import LabelsListPage from '../src/pages/LabelsListPage';

// Mock AuthContext so the page gets a token without a real provider
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

const mockLabels: labelsService.Label[] = [
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

    it('renders labels list', async () => {
        vi.spyOn(labelsService, 'fetchLabels').mockResolvedValue(mockLabels);
        render(<LabelsListPage />);
        await waitFor(() => {
            expect(screen.getByText('Labels')).toBeInTheDocument();
            // Groceries appears as a row name (td) and as a parent-label badge (span)
            expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Bread')).toBeInTheDocument();
        });
    });

    it('shows parent label name in the row', async () => {
        vi.spyOn(labelsService, 'fetchLabels').mockResolvedValue(mockLabels);
        render(<LabelsListPage />);
        await waitFor(() => {
            expect(screen.getByText('Groceries', { selector: 'span' })).toBeInTheDocument();
        });
    });

    it('shows empty state when no labels', async () => {
        vi.spyOn(labelsService, 'fetchLabels').mockResolvedValue([]);
        render(<LabelsListPage />);
        await waitFor(() => {
            expect(screen.getByText('No labels found.')).toBeInTheDocument();
        });
    });

    it('shows error state on fetch failure', async () => {
        vi.spyOn(labelsService, 'fetchLabels').mockRejectedValue(new Error('API error'));
        render(<LabelsListPage />);
        await waitFor(() => {
            expect(screen.getByText('Failed to load labels.')).toBeInTheDocument();
        });
    });
});


