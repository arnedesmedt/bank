<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Label;
use App\Entity\LabelTransferLink;
use App\Entity\Transfer;
use App\Repository\LabelRepository;
use App\Repository\LabelTransferLinkRepository;
use App\Repository\TransferRepository;
use Symfony\Component\Uid\Uuid;

use function array_any;
use function array_values;
use function preg_match;

class LabelingService
{
    /** @var list<Label>|null In-memory cache; populated on first use, cleared by clearCache() */
    private array|null $labelsCache = null;

    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly LabelTransferLinkRepository $labelTransferLinkRepository,
        private readonly TransferRepository $transferRepository,
    ) {
    }

    /**
     * Clear the in-memory labels cache.
     * Call this after any operation that modifies labels so the cache stays consistent.
     */
    public function clearCache(): void
    {
        $this->labelsCache = null;
    }

    /**
     * Return all labels, using the in-memory cache to avoid repeated DB queries.
     *
     * @return list<Label>
     */
    private function getAllLabels(): array
    {
        if ($this->labelsCache === null) {
            $this->labelsCache = array_values($this->labelRepository->findAll());
        }

        return $this->labelsCache;
    }

    /**
     * Auto-label a single transfer based on all label rules (bank account and regex).
     * Only creates automatic links. Existing manual links are never touched.
     */
    public function autoLabel(Transfer $transfer): void
    {
        $labels  = $this->getAllLabels();
        $applied = false;

        foreach ($labels as $label) {
            if (! $this->matchesLabel($label, $transfer)) {
                continue;
            }

            $this->createOrUpgradeLink($label, $transfer, false);
            $this->propagateParentLinks($label, $transfer, false);
            $applied = true;
        }

        if (! $applied) {
            return;
        }

        $this->transferRepository->save($transfer, true);
    }

    /**
     * Auto-assign a label to all existing transfers that match its rules.
     * Called when a label is created or updated.
     * Only creates/modifies automatic links; never removes manual links.
     */
    public function autoAssignLabelToAllTransfers(Label $label): void
    {
        $transfers = $this->transferRepository->findAll(10000, 0);

        foreach ($transfers as $transfer) {
            if ($this->matchesLabel($label, $transfer)) {
                $this->createOrUpgradeLink($label, $transfer, false);
                $this->propagateParentLinks($label, $transfer, false);
            } elseif (! $this->isParentOfLinkedDescendant($label, $transfer)) {
                // Only remove if the label is not kept as a propagated parent of a
                // child label that still matches this transfer.
                $this->removeAutomaticLink($label, $transfer);
            }
        }

        $this->labelTransferLinkRepository->flush();
    }

    /**
     * Re-evaluate automatic label links for a specific transfer.
     * Called when a transfer is updated.
     *
     * Two-phase approach to avoid order-dependent bugs:
     * Phase 1 — add all directly-matching labels and propagate their parents.
     * Phase 2 — remove automatic links for labels that are no longer needed
     *            (i.e. don't match directly AND are not a propagated parent of a
     *             still-matched label).
     */
    public function reevaluateTransferLinks(Transfer $transfer): void
    {
        $labels = $this->labelRepository->findAll();

        // Phase 1: additions — ensures propagated parents are in place before any removals.
        foreach ($labels as $label) {
            if (! $this->matchesLabel($label, $transfer)) {
                continue;
            }

            $this->createOrUpgradeLink($label, $transfer, false);
            $this->propagateParentLinks($label, $transfer, false);
        }

        // Phase 2: removals — safe now because all additions (including propagations) are done.
        foreach ($labels as $label) {
            if ($this->matchesLabel($label, $transfer)) {
                continue;
            }

            if ($this->isParentOfLinkedDescendant($label, $transfer)) {
                continue;
            }

            $this->removeAutomaticLink($label, $transfer);
        }

        $this->transferRepository->save($transfer, true);
    }

    /**
     * Manually assign a label (and its parents) to a transfer.
     * Creates a "manual" link that persists regardless of rule changes.
     */
    public function manuallyLabelTransfer(Transfer $transfer, Label $label): void
    {
        $this->createOrUpgradeLink($label, $transfer, true);
        $this->propagateParentLinks($label, $transfer, true);
        $this->transferRepository->save($transfer, true);
    }

    /**
     * Remove a label link from a transfer (only explicit/manual removal is allowed).
     * Returns true if a link was found and removed, false if no link existed.
     */
    public function removeLabelFromTransfer(Transfer $transfer, Label $label): bool
    {
        $link = $this->labelTransferLinkRepository->findByLabelAndTransfer($label, $transfer);

        if (! $link instanceof LabelTransferLink) {
            return false;
        }

        $this->labelTransferLinkRepository->remove($link, true);

        return true;
    }

    /**
     * Re-evaluate automatic links for all transfers affected by a bank account change.
     *
     * @param array<Label> $affectedLabels
     */
    public function reevaluateLinksForLabels(array $affectedLabels): void
    {
        foreach ($affectedLabels as $affectedLabel) {
            $this->autoAssignLabelToAllTransfers($affectedLabel);
        }
    }

    /**
     * Returns true if the label should be applied to the transfer.
     */
    public function matchesLabel(Label $label, Transfer $transfer): bool
    {
        // Bank account match — compare by entity ID so accounts without an account number
        // (e.g. merchants that only have a name) are still matched correctly.
        // Fall back to account-number comparison for cases where the same IBAN appears under
        // different entity instances (e.g. two imports with slightly different names).
        $fromAccountId     = $transfer->getFromAccount()->getId();
        $toAccountId       = $transfer->getToAccount()->getId();
        $fromAccountNumber = $transfer->getFromAccount()->getAccountNumber();
        $toAccountNumber   = $transfer->getToAccount()->getAccountNumber();

        foreach ($label->getLinkedBankAccounts() as $linkedBankAccount) {
            $linkedId     = $linkedBankAccount->getId();
            $linkedNumber = $linkedBankAccount->getAccountNumber();

            // Primary: match by entity ID (works even when accountNumber is null)
            if (
                $linkedId instanceof Uuid
                && (
                    ($fromAccountId instanceof Uuid && $linkedId->equals($fromAccountId))
                    || ($toAccountId instanceof Uuid && $linkedId->equals($toAccountId))
                )
            ) {
                return true;
            }

            // Fallback: match by account number (handles same IBAN across different entity instances)
            if (
                $linkedNumber !== null
                && ($fromAccountNumber === $linkedNumber || $toAccountNumber === $linkedNumber)
            ) {
                return true;
            }
        }

        // Regex match against reference AND account name (FR-010)
        $reference = $transfer->getReference();
        $fromName  = $transfer->getFromAccount()->getAccountName() ?? '';
        $toName    = $transfer->getToAccount()->getAccountName() ?? '';

        return array_any($label->getLinkedRegexes(), static fn ($regex): bool => preg_match($regex, $reference) === 1
        || preg_match($regex, $fromName) === 1
        || preg_match($regex, $toName) === 1);
    }

    /**
     * Create a new LabelTransferLink or update an existing one.
     * If a manual link already exists and we are creating an automatic one, we leave it as manual.
     * If creating a manual link, upgrade any existing automatic link to manual.
     */
    private function createOrUpgradeLink(Label $label, Transfer $transfer, bool $isManual): void
    {
        $existingLink = $this->labelTransferLinkRepository->findByLabelAndTransfer($label, $transfer);

        if ($existingLink instanceof LabelTransferLink) {
            if ($isManual && ! $existingLink->isManual()) {
                $existingLink->setIsManual(true);
                $this->labelTransferLinkRepository->save($existingLink);
            }

            return;
        }

        $labelTransferLink = new LabelTransferLink();
        $labelTransferLink->setLabel($label);
        $labelTransferLink->setTransfer($transfer);
        $labelTransferLink->setIsManual($isManual);

        $this->labelTransferLinkRepository->save($labelTransferLink);
        $transfer->addLabelLink($labelTransferLink);
    }

    /**
     * Remove an automatic link; leaves manual links untouched.
     */
    private function removeAutomaticLink(Label $label, Transfer $transfer): void
    {
        $link = $this->labelTransferLinkRepository->findByLabelAndTransfer($label, $transfer);

        if (! $link instanceof LabelTransferLink || $link->isManual()) {
            return;
        }

        $this->labelTransferLinkRepository->remove($link);
        $transfer->removeLabelLink($link);
    }

    /**
     * Propagate label assignment to all parent labels.
     */
    private function propagateParentLinks(Label $label, Transfer $transfer, bool $isManual): void
    {
        $parentLabel = $label->getParentLabel();

        while ($parentLabel instanceof Label) {
            $this->createOrUpgradeLink($parentLabel, $transfer, $isManual);
            $parentLabel = $parentLabel->getParentLabel();
        }
    }

    /**
     * Returns true if $label is an ancestor of any label that is currently linked
     * to $transfer. Used to prevent removing a parent label whose presence is
     * justified by a still-matched child label.
     */
    private function isParentOfLinkedDescendant(Label $label, Transfer $transfer): bool
    {
        $labelId = $label->getId();
        if (! $labelId instanceof Uuid) {
            return false;
        }

        foreach ($transfer->getLabelTransferLinks() as $labelTransferLink) {
            $current = $labelTransferLink->getLabel()->getParentLabel();
            while ($current instanceof Label) {
                if ($current->getId()?->equals($labelId)) {
                    return true;
                }

                $current = $current->getParentLabel();
            }
        }

        return false;
    }
}
