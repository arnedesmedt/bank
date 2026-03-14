import React from 'react';

interface AmountProps {
    /** Numeric amount as a string (e.g. "1250.50" or "-42.00") */
    amount: string;
    /** CSS class to add to the root element */
    className?: string;
    /** Whether to show +/- prefix for sighted and colorblind users */
    showSign?: boolean;
    /** Currency code, defaults to EUR */
    currency?: string;
}

/**
 * T031/T032 [US4]: Color positive amounts green and negative amounts red.
 * Ensures accessible contrast (WCAG AA) and adds +/- prefix for colorblind users.
 */
const Amount: React.FC<AmountProps> = ({
    amount,
    className = '',
    showSign = true,
    currency = 'EUR',
}) => {
    const numericValue = parseFloat(amount);
    const isPositive = numericValue > 0;
    const isNegative = numericValue < 0;
    const isZero = numericValue === 0;

    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        signDisplay: 'never',
    }).format(Math.abs(numericValue));

    const colorClass = isPositive
        ? 'text-green-700'
        : isNegative
          ? 'text-red-700'
          : 'text-gray-700';

    const prefix = showSign && !isZero ? (isPositive ? '+' : '−') : '';
    // Screen-reader-friendly label (avoids confusing "+" as "positive" ambiguity)
    const ariaLabel = `${isNegative ? 'negative' : isPositive ? 'positive' : ''} ${formatted}`.trim();

    return (
        <span
            className={`font-mono font-medium ${colorClass} ${className}`}
            aria-label={ariaLabel}
            data-testid="amount"
        >
            {prefix}
            {formatted}
        </span>
    );
};

export default Amount;

