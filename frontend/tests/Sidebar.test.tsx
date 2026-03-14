// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../src/components/Sidebar';

const mockPages = [
    { id: 'transfers', label: 'Transfers', icon: <span>T</span> },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: <span>B</span> },
    { id: 'labels', label: 'Labels', icon: <span>L</span> },
];

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders navigation with ARIA role', () => {
        render(
            <Sidebar
                expanded={false}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('renders all nav items with accessible labels', () => {
        render(
            <Sidebar
                expanded={false}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByRole('button', { name: 'Transfers' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Bank Accounts' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Labels' })).toBeInTheDocument();
    });

    it('marks current page with aria-current="page"', () => {
        render(
            <Sidebar
                expanded={false}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByRole('button', { name: 'Transfers' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('button', { name: 'Bank Accounts' })).not.toHaveAttribute(
            'aria-current',
        );
    });

    it('shows labels when expanded', () => {
        render(
            <Sidebar
                expanded={true}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        // Labels should be visible as text (not just aria-label)
        expect(screen.getByText('Transfers')).toBeInTheDocument();
        expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    });

    it('calls onNavigate when a nav item is clicked', () => {
        const onNavigate = vi.fn();
        render(
            <Sidebar
                expanded={false}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={onNavigate}
            />,
        );
        fireEvent.click(screen.getByTestId('nav-bank-accounts'));
        expect(onNavigate).toHaveBeenCalledWith('bank-accounts');
    });

    it('calls onToggle when hamburger button is clicked', () => {
        const onToggle = vi.fn();
        render(
            <Sidebar
                expanded={false}
                onToggle={onToggle}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByTestId('sidebar-toggle'));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('hamburger button has accessible label', () => {
        render(
            <Sidebar
                expanded={false}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('hamburger label changes when expanded', () => {
        render(
            <Sidebar
                expanded={true}
                onToggle={vi.fn()}
                pages={mockPages}
                currentPage="transfers"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });
});

