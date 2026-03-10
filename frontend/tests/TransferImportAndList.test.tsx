import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransferImport } from '../src/components/TransferImport';
import { TransferList } from '../src/components/TransferList';

// Mock API calls
vi.mock('../src/api/transfers', () => ({
  importCsv: vi.fn(async () => ({ transfers: [{ id: 1, amount: 100, labels: ['grocery'] }] })),
  getTransfers: vi.fn(async () => ([{ id: 1, amount: 100, labels: ['grocery'] }]))
}));

describe('TransferImport', () => {
  it('uploads CSV and shows progress', async () => {
    render(<TransferImport />);
    const fileInput = screen.getByLabelText(/upload/i);
    const file = new File(['csv,data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const button = screen.getByText(/import/i);
    fireEvent.click(button);
    expect(await screen.findByText(/import successful/i)).not.toBeNull();
  });
});

describe('TransferList', () => {
  it('renders transfer list with labels', async () => {
    render(<TransferList />);
    expect(await screen.findByText(/grocery/i)).not.toBeNull();
    expect(await screen.findByText(/100/i)).not.toBeNull();
  });
});
