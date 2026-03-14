// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Amount from '../src/components/Amount';

describe('Amount', () => {
    it('renders positive amount in green', () => {
        render(<Amount amount="100.50" />);
        const el = screen.getByTestId('amount');
        expect(el).toHaveClass('text-green-700');
        expect(el).not.toHaveClass('text-red-700');
    });

    it('renders negative amount in red', () => {
        render(<Amount amount="-42.00" />);
        const el = screen.getByTestId('amount');
        expect(el).toHaveClass('text-red-700');
        expect(el).not.toHaveClass('text-green-700');
    });

    it('renders zero amount in neutral gray', () => {
        render(<Amount amount="0.00" />);
        const el = screen.getByTestId('amount');
        expect(el).toHaveClass('text-gray-700');
        expect(el).not.toHaveClass('text-green-700');
        expect(el).not.toHaveClass('text-red-700');
    });

    it('shows + prefix for positive amount (colorblind accessibility)', () => {
        render(<Amount amount="100.50" />);
        expect(screen.getByTestId('amount').textContent).toContain('+');
    });

    it('shows − prefix for negative amount (colorblind accessibility)', () => {
        render(<Amount amount="-42.00" />);
        expect(screen.getByTestId('amount').textContent).toContain('−');
    });

    it('shows no sign prefix for zero', () => {
        render(<Amount amount="0.00" />);
        const text = screen.getByTestId('amount').textContent ?? '';
        expect(text).not.toContain('+');
        expect(text).not.toContain('−');
    });

    it('hides sign prefix when showSign=false', () => {
        render(<Amount amount="100.50" showSign={false} />);
        expect(screen.getByTestId('amount').textContent).not.toContain('+');
    });

    it('has an aria-label for screen readers', () => {
        render(<Amount amount="100.50" />);
        const label = screen.getByTestId('amount').getAttribute('aria-label') ?? '';
        expect(label).toBeTruthy();
        expect(label.toLowerCase()).toContain('positive');
    });

    it('applies additional className', () => {
        render(<Amount amount="50.00" className="text-2xl" />);
        expect(screen.getByTestId('amount')).toHaveClass('text-2xl');
    });
});

