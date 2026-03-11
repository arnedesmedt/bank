# Contract: Labels List Page

## Interface
- **Route**: `/labels`
- **Method**: GET (page load)
- **API Endpoint**: `/api/labels` (GET)
- **Response Shape**:
  ```json
  [
    { "id": 1, "name": "Groceries", "description": "Food and household items" },
    ...
  ]
  ```
- **UI Contract**:
  - Display each label as a row: name, description
  - Show "No labels found" if empty
  - Show "Failed to load data" if error

## Reference
- See csv import transfers for provenance

