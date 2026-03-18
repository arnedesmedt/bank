# UI Contract: Action Bar Improvements & Advanced Filtering

## Action Bar
- Consistent placement and style across transfer list, bank account detail, label detail, and bank account list pages
- Contains:
  - Search input (debounced, full-text)
  - Date range picker (calendar UI)
  - Multi-label filter (dropdown, multi-select)
  - Bulk action controls (when multi-select active)
  - Import button (on transfer list page)

## Transfer List
- Multi-select checkboxes for each row
- Bulk action dropdown or buttons (apply/remove label, mark as refund, remove refund)
- Collapsible/indented rows for refund/parent relationships
- Empty state and error state handling
- Totals update in real time as filters are applied

## Group By & Graph Pages
- Group by period (month, quarter, year; relative/absolute) or label
- Graphs rendered with Nivo (bar/line chart)
- Interactive: clicking a graph element filters the list view
- Loading and empty states

## Accessibility & Responsiveness
- All controls keyboard accessible
- Sufficient color contrast
- Responsive layout for mobile/desktop

## Edge Cases
- No results: show empty state
- Invalid filter: show warning or disable action
- Orphaned refunds: show as orphaned, allow relinking

