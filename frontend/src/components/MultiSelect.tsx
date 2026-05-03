import React, { useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
    id: string;
    name: string;
}

interface MultiSelectProps {
    /** Placeholder shown on the button when nothing is selected */
    placeholder: string;
    options: MultiSelectOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    searchPlaceholder?: string;
    className?: string;
}

/**
 * A dropdown multi-select component.
 *
 * - Shows selected items as dismissible chips on the trigger button
 * - Opens a dropdown with a search input
 * - Selected items are listed at the top of the dropdown (highlighted, click to deselect)
 * - Unselected items are listed below, filtered by the search query
 */
export function MultiSelect({
    placeholder,
    options,
    selectedIds,
    onChange,
    searchPlaceholder = 'Search…',
    className = '',
}: MultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (id: string) =>
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((x) => x !== id)
                : [...selectedIds, id],
        );

    const selectedOptions = selectedIds
        .map((id) => options.find((o) => o.id === id))
        .filter((o): o is MultiSelectOption => o !== undefined);

    const unselectedFiltered = options.filter(
        (o) =>
            !selectedIds.includes(o.id) &&
            o.name.toLowerCase().includes(search.toLowerCase()),
    );

    // When searching, also include already-selected items in the results
    const selectedFiltered = search
        ? selectedOptions.filter((o) =>
              o.name.toLowerCase().includes(search.toLowerCase()),
          )
        : [];

    return (
        <div className={`relative ${className}`} ref={ref}>
            {/* ── Trigger button ──────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full min-h-[38px] flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-left transition-colors"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {selectedOptions.length === 0 ? (
                        <span className="text-gray-400 text-sm py-0.5">{placeholder}</span>
                    ) : (
                        selectedOptions.map((o) => (
                            <span
                                key={o.id}
                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full"
                            >
                                {o.name}
                                <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Remove ${o.name}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggle(o.id);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggle(o.id);
                                        }
                                    }}
                                    className="cursor-pointer hover:text-blue-600 leading-none"
                                >
                                    ×
                                </span>
                            </span>
                        ))
                    )}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* ── Dropdown panel ──────────────────────────────────────────── */}
            {open && (
                <div
                    className="absolute z-40 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-md shadow-lg"
                    role="listbox"
                    aria-multiselectable="true"
                >
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <svg
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                            </svg>
                            <input
                                type="search"
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                        {/* Selected items (shown at top when not searching, or merged in results when searching) */}
                        {!search && selectedOptions.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                                    Selected ({selectedOptions.length})
                                </div>
                                {selectedOptions.map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        role="option"
                                        aria-selected={true}
                                        onClick={() => toggle(o.id)}
                                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-100 transition-colors"
                                    >
                                        <span className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center bg-blue-600">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                        <span className="flex-1 truncate">{o.name}</span>
                                        <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                ))}
                                {unselectedFiltered.length > 0 && (
                                    <div className="px-3 py-1 text-xs text-gray-300 text-center">──</div>
                                )}
                            </>
                        )}

                        {/* Selected items matching search */}
                        {search && selectedFiltered.length > 0 && (
                            <>
                                {selectedFiltered.map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        role="option"
                                        aria-selected={true}
                                        onClick={() => toggle(o.id)}
                                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-700 border-b border-gray-100 transition-colors"
                                    >
                                        <span className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center bg-blue-600">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                        <span className="flex-1 truncate">{o.name}</span>
                                        <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                ))}
                            </>
                        )}

                        {/* Unselected filtered items */}
                        {unselectedFiltered.length > 0 ? (
                            unselectedFiltered.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    onClick={() => toggle(o.id)}
                                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="w-4 h-4 border border-gray-300 rounded flex-shrink-0" />
                                    <span className="flex-1 truncate">{o.name}</span>
                                </button>
                            ))
                        ) : (
                            !search || (selectedFiltered.length === 0 && unselectedFiltered.length === 0) ? (
                                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                    {search ? 'No results found' : selectedOptions.length === options.length ? 'All items selected' : 'Nothing to select'}
                                </div>
                            ) : null
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

