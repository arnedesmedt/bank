// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../src/components/TopBar';

describe('TopBar', () => {
    it('renders the page title', () => {
        render(<TopBar title="Transfers" />);
        expect(screen.getByTestId('topbar-title')).toHaveTextContent('Transfers');
    });

    it('has header landmark with accessible label', () => {
        render(<TopBar title="Transfers" />);
        expect(screen.getByRole('banner', { name: 'Top navigation bar' })).toBeInTheDocument();
    });

    it('does not render back button when onBack is not provided', () => {
        render(<TopBar title="Transfers" />);
        expect(screen.queryByTestId('topbar-back-button')).not.toBeInTheDocument();
    });

    it('renders back button when onBack is provided', () => {
        render(<TopBar title="Bank Account Detail" onBack={vi.fn()} />);
        expect(screen.getByTestId('topbar-back-button')).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
        const onBack = vi.fn();
        render(<TopBar title="Bank Account Detail" onBack={onBack} />);
        fireEvent.click(screen.getByTestId('topbar-back-button'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders user email', () => {
        render(<TopBar title="Transfers" userEmail="user@example.com" />);
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('renders logout button when onLogout is provided', () => {
        render(<TopBar title="Transfers" userEmail="user@example.com" onLogout={vi.fn()} />);
        expect(screen.getByTestId('topbar-logout-button')).toBeInTheDocument();
    });

    it('calls onLogout when logout button is clicked', () => {
        const onLogout = vi.fn();
        render(<TopBar title="Transfers" userEmail="user@example.com" onLogout={onLogout} />);
        fireEvent.click(screen.getByTestId('topbar-logout-button'));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('logout button has accessible label', () => {
        render(<TopBar title="Transfers" userEmail="user@example.com" onLogout={vi.fn()} />);
        expect(screen.getByLabelText('Sign out')).toBeInTheDocument();
    });

    it('back button has accessible label', () => {
        render(<TopBar title="Detail" onBack={vi.fn()} />);
        expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });
});

