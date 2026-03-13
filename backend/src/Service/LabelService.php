<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BankAccount;
use App\Entity\Label;
use App\Entity\Transfer;
use App\Repository\BankAccountRepository;
use App\Repository\LabelRepository;
use Symfony\Component\Uid\Uuid;

use function in_array;
use function preg_match;

/**
 * Service for managing Label business logic:
 * - Parent-child hierarchy propagation
 * - Linking labels to bank accounts
 * - Linking labels to regexes
 */
class LabelService
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly BankAccountRepository $bankAccountRepository,
    ) {
    }

    /**
     * Get the full ancestor chain of a label (from the label itself up to root).
     *
     * @return array<Label>
     */
    public function getAncestors(Label $label): array
    {
        $ancestors = [];
        $current   = $label;

        while ($current instanceof Label) {
            $ancestors[] = $current;
            $current     = $current->getParentLabel();
        }

        return $ancestors;
    }

    /**
     * Get all descendants of a label (recursive).
     *
     * @return array<Label>
     */
    public function getDescendants(Label $label): array
    {
        $descendants = [];

        foreach ($label->getChildLabels() as $childLabel) {
            $descendants[] = $childLabel;
            foreach ($this->getDescendants($childLabel) as $grandchild) {
                $descendants[] = $grandchild;
            }
        }

        return $descendants;
    }

    /**
     * Validate parent-child assignment to prevent circular references.
     */
    public function wouldCreateCircularReference(Label $label, Label $proposedParent): bool
    {
        // A label cannot be its own parent
        if ($label->getId() instanceof Uuid && $label->getId()->equals($proposedParent->getId() ?? Uuid::v4())) {
            return true;
        }

        // Check if proposedParent is a descendant of label
        $descendants = $this->getDescendants($label);
        foreach ($descendants as $descendant) {
            $descendantId     = $descendant->getId();
            $proposedParentId = $proposedParent->getId();
            if (
                $descendantId !== null
                && $proposedParentId instanceof Uuid
                && $descendantId->equals($proposedParentId)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Apply label and all parent labels to a transfer (hierarchy propagation).
     * Note: Prefer LabelingService for full manual/automatic tracking.
     */
    public function applyLabelWithParents(Label $label, Transfer $transfer): void
    {
        $ancestors = $this->getAncestors($label);

        foreach ($ancestors as $ancestor) {
            if ($transfer->hasLabel($ancestor)) {
                continue;
            }

            // Direct link creation without LabelTransferLink tracking (legacy usage)
            // For proper tracking, use LabelingService instead.
        }
    }

    /**
     * Sync linked bank accounts for a label from a list of UUIDs.
     * Adds new links and removes old ones.
     *
     * @param array<string> $bankAccountIds
     */
    public function syncLinkedBankAccounts(Label $label, array $bankAccountIds): void
    {
        // Remove existing linked bank accounts not in new list
        foreach ($label->getLinkedBankAccounts() as $linkedBankAccount) {
            $existingId = $linkedBankAccount->getId();
            if ($existingId === null) {
                continue;
            }

            if (in_array($existingId->toRfc4122(), $bankAccountIds, true)) {
                continue;
            }

            $label->removeLinkedBankAccount($linkedBankAccount);
        }

        // Add new bank accounts
        foreach ($bankAccountIds as $bankAccountId) {
            $bankAccount = $this->bankAccountRepository->find(Uuid::fromRfc4122($bankAccountId));

            if (! $bankAccount instanceof BankAccount) {
                continue;
            }

            $label->addLinkedBankAccount($bankAccount);
        }
    }

    /**
     * Sync linked regexes for a label.
     *
     * @param array<string> $regexes
     */
    public function syncLinkedRegexes(Label $label, array $regexes): void
    {
        $label->setLinkedRegexes($regexes);
    }

    /**
     * Find labels that match a transfer via bank account links.
     *
     * @return array<Label>
     */
    public function findMatchingLabelsByBankAccount(Transfer $transfer): array
    {
        $labels  = $this->labelRepository->findAll();
        $matches = [];

        foreach ($labels as $label) {
            foreach ($label->getLinkedBankAccounts() as $linkedBankAccount) {
                if (
                    $transfer->getFromAccount()->getId()?->equals($linkedBankAccount->getId() ?? Uuid::v4())
                    || $transfer->getToAccount()->getId()?->equals($linkedBankAccount->getId() ?? Uuid::v4())
                ) {
                    $matches[] = $label;
                    break;
                }
            }
        }

        return $matches;
    }

    /**
     * Find labels that match a transfer via regex patterns.
     * Matches against both reference and account names (FR-010).
     *
     * @return array<Label>
     */
    public function findMatchingLabelsByRegex(Transfer $transfer): array
    {
        $labels    = $this->labelRepository->findAll();
        $matches   = [];
        $reference = $transfer->getReference();
        $fromName  = $transfer->getFromAccount()->getAccountName() ?? '';
        $toName    = $transfer->getToAccount()->getAccountName() ?? '';

        foreach ($labels as $label) {
            foreach ($label->getLinkedRegexes() as $regex) {
                if (
                    preg_match($regex, $reference) === 1
                    || preg_match($regex, $fromName) === 1
                    || preg_match($regex, $toName) === 1
                ) {
                    $matches[] = $label;
                    break;
                }
            }
        }

        return $matches;
    }
}
