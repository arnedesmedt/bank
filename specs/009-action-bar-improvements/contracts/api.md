# API Contract: Bulk Actions (Transfers)

## Endpoint: PATCH /api/transfers/bulk

- **Description**: Perform bulk actions on multiple transfers (apply/remove label, mark as refund of another transfer, remove refund link)
- **Request Body** (JSON):
  - `action`: string ("apply_label" | "remove_label" | "mark_refund" | "remove_refund")
  - `transferIds`: string[] (UUIDs)
  - `labelId`: string (for label actions, optional)
  - `parentTransferId`: string (for mark_refund, optional)
- **Response**: 200 OK, returns updated transfers
- **Errors**: 400 (invalid input), 404 (not found), 409 (conflict)

---

# API Contract: Filtering & Grouping

## Endpoint: GET /api/transfers
- **Query Params**:
  - `search`: string (optional)
  - `dateFrom`: string (YYYY-MM-DD, optional)
  - `dateTo`: string (YYYY-MM-DD, optional)
  - `labelIds`: string[] (optional)
  - `accountId`: string (optional)
  - `page`: int (optional)
  - `pageSize`: int (optional)
- **Response**: 200 OK, paginated list of transfers

## Endpoint: GET /api/group-by
- **Query Params**:
  - `groupBy`: string ("period" | "label")
  - `period`: string ("month" | "quarter" | "year")
  - `relative`: boolean (optional)
  - `labelIds`: string[] (optional)
  - `dateFrom`, `dateTo`: string (optional)
- **Response**: 200 OK, list of GroupByResult objects

---

# UI Contract: Action Bar & Bulk Actions

- Action bar must show search, date range, and label filters on all relevant pages
- Multi-select checkboxes in transfer list
- Bulk action dropdown or buttons (apply/remove label, mark as refund)
- Collapsible/indented UI for refund/parent relationships
- Group by and graph pages accessible from navigation
- Graphs use Nivo, interactive (click to filter)
- Empty/error states for no results or invalid filters

