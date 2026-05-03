<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Change the transfer fingerprint formula to be format-agnostic (CSV vs PDF).
 *
 * Previous formula: sha256(date | amount | from | to | reference | transactionId)
 * New formula:
 *   - IBAN transfers (counter account known): sha256(date | amount | from | to | "")
 *   - Card payments  (no counter IBAN):       sha256(date | amount | from | "" | normalizedRef)
 *
 * "normalizedRef" = reference with the Belfius-CSV-specific "REF. : …" suffix stripped
 * and interior whitespace collapsed to a single space.
 *
 * This allows the same real-world transaction that was imported once from a Belfius CSV
 * and once from a Belfius PDF to be detected as a duplicate, because:
 *   - For IBAN transfers the counter-IBAN is sufficient for uniqueness.
 *   - For card payments the normalised reference (which includes the transaction time)
 *     is the same in both formats after stripping the CSV-only suffix.
 *
 * Existing duplicate records (same transfer imported from both CSV and PDF) are removed
 * by this migration; the CSV-imported copy (non-null transaction_id) is preferred.
 * label_transfer_link rows are removed automatically via ON DELETE CASCADE.
 * parent_transfer_uuid references are nulled automatically via ON DELETE SET NULL.
 */
final class Version20260409000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Recalculate transfer fingerprints to be format-agnostic (CSV vs PDF deduplication) and remove cross-format duplicates';
    }

    public function up(Schema $schema): void
    {
        // ── 1. Drop the unique index so we can freely update fingerprints ──────
        $this->addSql('DROP INDEX uniq_fingerprint');

        // ── 2. Materialise the new fingerprint for every transfer ────────────────
        //
        // New fingerprint = sha256(date | amount | from_iban | to_iban | normalised_ref)
        //
        // to_iban is empty string when the counter account has no account_number (card
        // payments).  In that case normalised_ref is included; otherwise it is empty.
        //
        // Normalisation of the reference:
        //   a) Strip "REF. : …" trailer (Belfius CSV-specific suffix)
        //   b) Collapse runs of whitespace to a single space (pdftotext artefacts)
        //   c) TRIM
        $this->addSql("
            CREATE TEMP TABLE transfer_new_fingerprints AS
            SELECT
                t.uuid,
                t.transaction_id,
                encode(
                    sha256(
                        CONCAT(
                            to_char(t.date, 'YYYY-MM-DD'), '|',
                            t.amount::text, '|',
                            COALESCE(fa.account_number, ''), '|',
                            COALESCE(ta.account_number, ''), '|',
                            CASE
                                WHEN ta.account_number IS NOT NULL THEN ''
                                ELSE TRIM(
                                    REGEXP_REPLACE(
                                        REGEXP_REPLACE(t.reference, '\s*REF\.\s*:.*$', '', 'i'),
                                        '\s+', ' ', 'g'
                                    )
                                )
                            END
                        )::bytea
                    ),
                    'hex'
                ) AS new_fp
            FROM transfers t
            JOIN bank_accounts fa ON fa.uuid = t.from_account_id
            JOIN bank_accounts ta ON ta.uuid = t.to_account_id
        ");

        // ── 3. Remove cross-format duplicates ────────────────────────────────────
        //
        // When multiple transfers share the same new fingerprint, keep exactly one:
        //   Priority 1: transfer with a non-null transaction_id  (CSV import, richer data)
        //   Priority 2: smallest UUID as tiebreaker              (oldest import)
        //
        // label_transfer_link rows are removed by ON DELETE CASCADE.
        // parent_transfer_uuid references are nulled by ON DELETE SET NULL.
        $this->addSql("
            DELETE FROM transfers
            WHERE uuid IN (
                SELECT nf.uuid
                FROM transfer_new_fingerprints nf
                WHERE nf.new_fp IN (
                    SELECT new_fp
                    FROM transfer_new_fingerprints
                    GROUP BY new_fp
                    HAVING COUNT(*) > 1
                )
                AND nf.uuid NOT IN (
                    SELECT DISTINCT ON (new_fp) uuid
                    FROM transfer_new_fingerprints
                    WHERE new_fp IN (
                        SELECT new_fp
                        FROM transfer_new_fingerprints
                        GROUP BY new_fp
                        HAVING COUNT(*) > 1
                    )
                    ORDER BY
                        new_fp,
                        (transaction_id IS NULL),   -- false (has txid) sorts before true
                        uuid                        -- smaller UUID = older, kept as tiebreak
                )
            )
        ");

        // ── 4. Apply the new fingerprints to all remaining transfers ─────────────
        $this->addSql('
            UPDATE transfers t
            SET fingerprint = nf.new_fp
            FROM transfer_new_fingerprints nf
            WHERE t.uuid = nf.uuid
        ');

        // ── 5. Clean up temp table ────────────────────────────────────────────────
        $this->addSql('DROP TABLE transfer_new_fingerprints');

        // ── 6. Restore unique index ───────────────────────────────────────────────
        $this->addSql('CREATE UNIQUE INDEX uniq_fingerprint ON transfers (fingerprint)');
    }

    public function down(Schema $schema): void
    {
        // The previous fingerprints cannot be reliably restored without the original
        // raw CSV/PDF data.  We reset fingerprints to a placeholder so the constraint
        // can be re-added without collisions; a full re-import is required to restore
        // the original values.
        $this->addSql('DROP INDEX IF EXISTS uniq_fingerprint');
        $this->addSql("UPDATE transfers SET fingerprint = encode(sha256(uuid::text::bytea), 'hex')");
        $this->addSql('CREATE UNIQUE INDEX uniq_fingerprint ON transfers (fingerprint)');
    }
}




