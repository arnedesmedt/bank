import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelManager } from '../components/LabelManager';

// ---------------------------------------------------------------------------
// Mock AuthContext
// ---------------------------------------------------------------------------
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    user: { id: '1', email: 'admin@example.com', roles: ['ROLE_ADMIN'] },
    login: vi.fn(),
    logout: vi.fn(),
    error: null,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockLabels = [
  {
    id: 'label-1',
    name: 'Food',
    parentLabelId: null,
    parentLabelName: null,
    linkedBankAccountIds: [],
    linkedRegexes: [],
    maxValue: null,
    maxPercentage: null,
  },
  {
    id: 'label-2',
    name: 'Bread',
    parentLabelId: 'label-1',
    parentLabelName: 'Food',
    linkedBankAccountIds: ['ba-1'],
    linkedRegexes: ['/BAKERY/i'],
    maxValue: '50.00',
    maxPercentage: '5.00',
  },
];

const mockBankAccounts = [
  {
    id: 'ba-1',
    accountName: 'My Savings',
    accountNumber: 'BE68539007547034',
    linkedLabelIds: [],
  },
  {
    id: 'ba-2',
    accountName: 'Current Account',
    accountNumber: 'BE71096400007055',
    linkedLabelIds: [],
  },
];

function setupFetchMock(
  labelsData: typeof mockLabels = mockLabels,
  bankAccountsData: typeof mockBankAccounts = mockBankAccounts,
) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const urlStr = url as string;
    // Match exact paths - /api/labels but NOT /api/labels/xxx
    if (/\/api\/labels$/.test(urlStr)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(labelsData),
      });
    }
    if (/\/api\/bank-accounts$/.test(urlStr)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(bankAccountsData),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LabelManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    setupFetchMock();
    render(<LabelManager />);
    expect(screen.getByTestId('label-manager-loading')).toBeInTheDocument();
  });

  it('renders label list after loading', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByTestId('label-manager')).toBeInTheDocument();
    });

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('shows empty state when no labels exist', async () => {
    setupFetchMock([], []);
    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByText(/No labels yet/i)).toBeInTheDocument();
    });
  });

  it('shows parent label badge for child labels', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByText(/child of Food/i)).toBeInTheDocument();
    });
  });

  it('shows max value and percentage badges', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByText(/max €50.00/i)).toBeInTheDocument();
      expect(screen.getByText(/max 5.00%/i)).toBeInTheDocument();
    });
  });

  it('shows linked bank account info', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByText(/My Savings/i)).toBeInTheDocument();
    });
  });

  it('shows regex patterns', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByText('/BAKERY/i')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Create form
  // -------------------------------------------------------------------------

  it('opens create form when clicking Create Label button', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('create-label-button'));

    fireEvent.click(screen.getByTestId('create-label-button'));

    expect(screen.getByTestId('label-form')).toBeInTheDocument();
    expect(screen.getByText('Create New Label')).toBeInTheDocument();
  });

  it('closes form when clicking Cancel', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('create-label-button'));
    fireEvent.click(screen.getByTestId('create-label-button'));

    expect(screen.getByTestId('label-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-label-button'));

    expect(screen.queryByTestId('label-form')).not.toBeInTheDocument();
  });

  it('creates a new label with name', async () => {
    const user = userEvent.setup();
    const fetchMock = setupFetchMock();

    // Mock POST response
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLabels[0]),
      }),
    );

    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('create-label-button'));
    fireEvent.click(screen.getByTestId('create-label-button'));

    await user.type(screen.getByTestId('label-name-input'), 'Transport');
    fireEvent.click(screen.getByTestId('submit-label-button'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/labels'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Transport"'),
        }),
      );
    });
  });

  it('shows parent label options in select', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('create-label-button'));
    fireEvent.click(screen.getByTestId('create-label-button'));

    const select = screen.getByTestId('parent-label-select');
    expect(select).toBeInTheDocument();
    // Should show both labels as parent options
    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
  });

  it('shows bank account checkboxes', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('create-label-button'));
    fireEvent.click(screen.getByTestId('create-label-button'));

    expect(screen.getByTestId('bank-account-checkboxes')).toBeInTheDocument();
    expect(screen.getByTestId('bank-account-checkbox-ba-1')).toBeInTheDocument();
    expect(screen.getByTestId('bank-account-checkbox-ba-2')).toBeInTheDocument();
  });

  it('adds and removes regex patterns', async () => {
    const user = userEvent.setup();
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('create-label-button'));
    fireEvent.click(screen.getByTestId('create-label-button'));

    // Add regex
    await user.type(screen.getByTestId('regex-input'), '/NETFLIX/i');
    fireEvent.click(screen.getByTestId('add-regex-button'));

    await waitFor(() => {
      expect(screen.getByTestId('regex-list')).toBeInTheDocument();
      expect(screen.getByText('/NETFLIX/i')).toBeInTheDocument();
    });

    // Remove regex
    const removeButton = screen.getByLabelText('Remove regex /NETFLIX/i');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('/NETFLIX/i')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Edit form
  // -------------------------------------------------------------------------

  it('opens edit form when clicking Edit button', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId(`edit-label-label-2`));
    fireEvent.click(screen.getByTestId('edit-label-label-2'));

    expect(screen.getByTestId('label-form')).toBeInTheDocument();
    expect(screen.getByText('Edit Label: Bread')).toBeInTheDocument();
  });

  it('pre-fills form when editing', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('edit-label-label-2'));
    fireEvent.click(screen.getByTestId('edit-label-label-2'));

    const nameInput = screen.getByTestId('label-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Bread');

    const maxValueInput = screen.getByTestId('max-value-input') as HTMLInputElement;
    expect(maxValueInput.value).toBe('50.00');
  });

  it('excludes editing label from parent options', async () => {
    setupFetchMock();
    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('edit-label-label-2'));
    fireEvent.click(screen.getByTestId('edit-label-label-2'));

    // Bread (label-2) should not appear in parent options
    const options = screen.getAllByRole('option');
    const optionTexts = options.map((o) => o.textContent ?? '');
    expect(optionTexts).not.toContain('Bread');
  });

  it('submits PUT request when updating', async () => {
    const fetchMock = setupFetchMock();

    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('edit-label-label-2'));
    fireEvent.click(screen.getByTestId('edit-label-label-2'));

    // Override fetch to intercept the PUT call (and subsequent reload)
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      const urlStr = url as string;
      if (options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockLabels[1], name: 'Sourdough' }),
        });
      }
      if (/\/api\/labels$/.test(urlStr)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLabels) });
      }
      if (/\/api\/bank-accounts$/.test(urlStr)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBankAccounts) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const nameInput = screen.getByTestId('label-name-input');
    fireEvent.change(nameInput, { target: { value: 'Sourdough' } });
    fireEvent.click(screen.getByTestId('submit-label-button'));

    await waitFor(() => {
      const putCalls = fetchMock.mock.calls.filter(
        (call) => (call[1] as RequestInit)?.method === 'PUT',
      );
      expect(putCalls.length).toBeGreaterThan(0);
      expect(putCalls[0][0]).toContain('/api/labels/label-2');
    });
  });

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  it('deletes a label after confirmation', async () => {
    const fetchMock = setupFetchMock();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('delete-label-label-1'));

    // Override fetch to handle DELETE + reload
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (/\/api\/labels$/.test(url as string)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/\/api\/bank-accounts$/.test(url as string)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBankAccounts) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    fireEvent.click(screen.getByTestId('delete-label-label-1'));

    await waitFor(() => {
      const deleteCalls = fetchMock.mock.calls.filter(
        (call) => (call[1] as RequestInit)?.method === 'DELETE',
      );
      expect(deleteCalls.length).toBeGreaterThan(0);
      expect(deleteCalls[0][0]).toContain('/api/labels/label-1');
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const fetchMock = setupFetchMock();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));

    render(<LabelManager />);

    await waitFor(() => screen.getByTestId('delete-label-label-1'));
    fireEvent.click(screen.getByTestId('delete-label-label-1'));

    // DELETE should not have been called
    const deleteCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit)?.method === 'DELETE',
    );
    expect(deleteCalls).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it('shows error when API fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    render(<LabelManager />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });
});




