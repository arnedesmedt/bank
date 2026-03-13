<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Label;
use App\Entity\Transfer;
use App\Repository\LabelRepository;
use App\Repository\TransferRepository;

use function array_any;
use function preg_match;

class LabelingService
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly TransferRepository $transferRepository,
    ) {
    }

    /**
     * Auto-label transfer based on bank account links and regex patterns.
     */
    public function autoLabel(Transfer $transfer): void
    {
        // Get all labels
        $labels  = $this->labelRepository->findAll();
        $applied = false;

        foreach ($labels as $label) {
            // Check if transfer should be labeled
            if (! $this->shouldApplyLabel($label, $transfer)) {
                continue;
            }

            $this->applyLabelWithParents($label, $transfer);
            $applied = true;
        }

        if (! $applied) {
            return;
        }

        $this->transferRepository->save($transfer, true);
    }

    private function shouldApplyLabel(Label $label, Transfer $transfer): bool
    {
        // Check bank account links (compare by account number, not object identity)
        foreach ($label->getLinkedBankAccounts() as $linkedBankAccount) {
            $linkedNumber = $linkedBankAccount->getAccountNumber();
            if (
                $transfer->getFromAccount()->getAccountNumber() === $linkedNumber
                || $transfer->getToAccount()->getAccountNumber() === $linkedNumber
            ) {
                return true;
            }
        }

        // Check regex patterns
        $reference = $transfer->getReference();

        return array_any($label->getLinkedRegexes(), static fn ($regex): bool => preg_match($regex, $reference) === 1);
    }

    /**
     * Apply label and all parent labels to transfer.
     */
    public function applyLabelWithParents(Label $label, Transfer $transfer): void
    {
        // Add the label itself
        if (! $transfer->getLabels()->contains($label)) {
            $transfer->addLabel($label);
        }

        // Add parent labels recursively
        $parentLabel = $label->getParentLabel();
        while ($parentLabel instanceof Label) {
            if (! $transfer->getLabels()->contains($parentLabel)) {
                $transfer->addLabel($parentLabel);
            }

            $parentLabel = $parentLabel->getParentLabel();
        }
    }

    /**
     * Manually add label to transfer (with parent labels).
     */
    public function manuallyLabelTransfer(Transfer $transfer, Label $label): void
    {
        $this->applyLabelWithParents($label, $transfer);
    }
}
