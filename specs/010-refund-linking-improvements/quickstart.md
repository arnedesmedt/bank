# Quickstart: Refund Linking Improvements (010)

## End-User Workflow

1. **Select one transfer** in the transfer list (tick its checkbox).  
   The floating action panel appears at the bottom of the screen.

2. Click **"Link Refunds"** (🔗). A modal opens showing all eligible transfers
   (not already linked, not the parent itself).

3. **Select one or more refund transfers**. The modal footer shows a live preview:
   - Refund sum
   - New parent amount after linking

4. Click **"Link N refunds"** to confirm and close.

The list refreshes. The parent row shows a ▶ toggle to expand/collapse its refund children.
The original amount is shown in strikethrough below the updated amount.

---

## Running the Migration

```bash
docker compose exec php php bin/console doctrine:migrations:migrate
```

Adds `amount_before_refund NUMERIC(10,2) DEFAULT NULL` to the `transfers` table.
Rolling back: `doctrine:migrations:migrate prev` (drops the column safely).

---

## API

`PATCH /api/transfers/bulk`

```json
{
  "action": "mark_refund",
  "transferIds": ["<refund-uuid>"],
  "parentTransferId": "<parent-uuid>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `amount` | string | Current (post-refund) amount |
| `amountBeforeRefund` | string\|null | Original amount before any refunds were linked |
| `childRefundIds` | string[] | UUIDs of all linked refund children |
| `parentTransferId` | string\|null | UUID of parent if this is a refund child |

---

## Edge Cases

| Situation | Behaviour |
|-----------|-----------|
| Self-link attempt | Skipped silently (warning logged) |
| Transfer already linked to another parent | Skipped (warning logged) |
| No eligible transfers in modal | "No eligible transfers" message |

---

## Architecture

| Layer | File | Change |
|-------|------|--------|
| DB migration | `migrations/Version20260324100000.php` | Add `amount_before_refund` column |
| Entity | `src/Entity/Transfer.php` | `amountBeforeRefund` property + getter/setter |
| API DTO | `src/ApiResource/TransferApiResource.php` | `amountBeforeRefund`, `childRefundIds` fields |
| Mapper | `src/Service/EntityMapper.php` | Maps new fields to DTO |
| Service | `src/Service/TransferService.php` | `bulkMarkRefund` recalculates amount + logs |
| Bulk action | `src/ApiResource/BulkTransferAction.php` | Removed `remove_refund` action |
| Processor | `src/State/TransferBulkActionProcessor.php` | Removed `remove_refund` handler |
| API client | `frontend/src/services/transfersService.ts` | Updated types |
| Action bar | `frontend/src/components/ActionBar.tsx` | Removed `remove_refund` from bulk menu |
| Transfer list | `frontend/src/components/TransferList.tsx` | `RefundPickerModal`, "Link Refunds" button, `amountBeforeRefund` display |
