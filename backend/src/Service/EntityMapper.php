<?php

declare(strict_types=1);

namespace App\Service;

use App\ApiResource\BankAccountApiResource;
use App\ApiResource\LabelApiResource;
use App\ApiResource\TransferApiResource;
use App\Entity\BankAccount;
use App\Entity\Label;
use App\Entity\Transfer;
use App\Repository\LabelRepository;
use LogicException;
use Symfony\Component\Uid\Uuid;

use function in_array;

/**
 * Maps between ApiResource DTOs and Doctrine Entities.
 * Handles the complex relational mapping that Symfony ObjectMapper cannot do automatically.
 */
class EntityMapper
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly LabelService $labelService,
    ) {
    }

    public function mapTransferToDto(Transfer $transfer, int $depth = 0): TransferApiResource
    {
        $transferApiResource = new TransferApiResource();
        $uuid                = $transfer->getId();

        if (! $uuid instanceof Uuid) {
            throw new LogicException('Transfer has no ID');
        }

        $transferApiResource->id     = $uuid->toRfc4122();
        $transferApiResource->amount = $transfer->getAmount();
        $transferApiResource->date   = $transfer->getDate()->format('Y-m-d');

        $fromAccountId                          = $transfer->getFromAccount()->getId();
        $transferApiResource->fromAccountId     = $fromAccountId?->toRfc4122();
        $transferApiResource->fromAccountNumber = $transfer->getFromAccount()->getAccountNumber();
        $transferApiResource->fromAccountName   = $transfer->getFromAccount()->getAccountName();

        $toAccountId                          = $transfer->getToAccount()->getId();
        $transferApiResource->toAccountId     = $toAccountId?->toRfc4122();
        $transferApiResource->toAccountNumber = $transfer->getToAccount()->getAccountNumber();
        $transferApiResource->toAccountName   = $transfer->getToAccount()->getAccountName();
        $transferApiResource->reference       = $transfer->getReference();
        $transferApiResource->csvSource       = $transfer->getCsvSource();
        $transferApiResource->transactionId   = $transfer->getTransactionId();
        $transferApiResource->isInternal      = $transfer->isInternal();

        foreach ($transfer->getLabelTransferLinks() as $labelTransferLink) {
            $label     = $labelTransferLink->getLabel();
            $labelUuid = $label->getId();
            if ($labelUuid === null) {
                continue;
            }

            $labelIdStr = $labelUuid->toRfc4122();

            // Only include in active labels if not archived
            if (! $labelTransferLink->isArchived()) {
                $transferApiResource->labelIds[]   = $labelIdStr;
                $transferApiResource->labelNames[] = $label->getName();
            }

            // Always include in labelLinks for UI display (archive/unarchive functionality)
            // Use the LabelTransferLink UUID for archive operations, but also include label UUID for consistency
            $linkUuid = $labelTransferLink->getId();
            if ($linkUuid === null) {
                continue;
            }

            $transferApiResource->labelLinks[] = [
                'id'        => $linkUuid->toRfc4122(),  // Use LabelTransferLink UUID for archive operations
                'labelId'   => $labelIdStr,             // Include Label UUID for reference
                'name'      => $label->getName(),
                'isManual'  => $labelTransferLink->isManual(),
                'isArchived' => $labelTransferLink->isArchived(),
            ];
        }

        $parentTransfer = $transfer->getParentTransfer();
        if ($parentTransfer instanceof Transfer) {
            $parentUuid = $parentTransfer->getId();
            if ($parentUuid instanceof Uuid) {
                $transferApiResource->parentTransferId = $parentUuid->toRfc4122();
            }
        }

        $transferApiResource->amountBeforeRefund = $transfer->getAmountBeforeRefund();

        // Embed child refund transfers (one level deep only)
        if ($depth === 0) {
            foreach ($transfer->getChildRefunds() as $childRefund) {
                $childUuid = $childRefund->getId();
                if (! ($childUuid instanceof Uuid)) {
                    continue;
                }

                $transferApiResource->childRefunds[] = $this->mapTransferToDto($childRefund, 1);
            }
        }

        return $transferApiResource;
    }

    public function mapBankAccountToDto(BankAccount $bankAccount): BankAccountApiResource
    {
        $bankAccountApiResource = new BankAccountApiResource();
        $uuid                   = $bankAccount->getId();

        if (! $uuid instanceof Uuid) {
            throw new LogicException('BankAccount has no ID');
        }

        $bankAccountApiResource->id            = $uuid->toRfc4122();
        $bankAccountApiResource->accountName   = $bankAccount->getAccountName();
        $bankAccountApiResource->accountNumber = $bankAccount->getAccountNumber();
        $bankAccountApiResource->hash          = $bankAccount->getHash();
        $bankAccountApiResource->isInternal    = $bankAccount->isInternal();
        $bankAccountApiResource->totalBalance  = $bankAccount->getTotalBalance();

        foreach ($bankAccount->getLinkedLabels() as $linkedLabel) {
            $labelUuid = $linkedLabel->getId();
            if ($labelUuid === null) {
                continue;
            }

            $bankAccountApiResource->linkedLabelIds[] = $labelUuid->toRfc4122();
        }

        return $bankAccountApiResource;
    }

    public function mapDtoToBankAccount(
        BankAccountApiResource $bankAccountApiResource,
        BankAccount $bankAccount,
    ): BankAccount {
        $bankAccount->setAccountName($bankAccountApiResource->accountName);
        $bankAccount->setAccountNumber($bankAccountApiResource->accountNumber);

        // Handle isInternal field if provided
        if (isset($bankAccountApiResource->isInternal)) {
            $bankAccount->setIsInternal($bankAccountApiResource->isInternal);
        }

        // Sync linked labels (from bank account edit side)
        $this->syncLinkedLabels($bankAccount, $bankAccountApiResource->linkedLabelIds);

        return $bankAccount;
    }

    /**
     * Sync the labels linked to a bank account from a list of label UUIDs.
     * Mirrors LabelService::syncLinkedBankAccounts but from the bank account side.
     *
     * @param array<string> $labelIds
     */
    private function syncLinkedLabels(BankAccount $bankAccount, array $labelIds): void
    {
        // Remove labels no longer in the list
        foreach ($bankAccount->getLinkedLabels() as $linkedLabel) {
            $existingId = $linkedLabel->getId();
            if ($existingId === null) {
                continue;
            }

            if (in_array($existingId->toRfc4122(), $labelIds, true)) {
                continue;
            }

            $bankAccount->removeLinkedLabel($linkedLabel);
        }

        // Collect current IDs after removals for duplicate check
        $currentIds = [];
        foreach ($bankAccount->getLinkedLabels() as $linkedLabel) {
            $existingId = $linkedLabel->getId();
            if ($existingId === null) {
                continue;
            }

            $currentIds[] = $existingId->toRfc4122();
        }

        // Add new labels
        foreach ($labelIds as $labelId) {
            if (in_array($labelId, $currentIds, true)) {
                continue;
            }

            $label = $this->labelRepository->find(Uuid::fromRfc4122($labelId));
            if (! ($label instanceof Label)) {
                continue;
            }

            $bankAccount->addLinkedLabel($label);
            $currentIds[] = $labelId;
        }
    }

    public function mapLabelToDto(Label $label): LabelApiResource
    {
        $labelApiResource = new LabelApiResource();
        $uuid             = $label->getId();

        if (! $uuid instanceof Uuid) {
            throw new LogicException('Label has no ID');
        }

        $labelApiResource->id            = $uuid->toRfc4122();
        $labelApiResource->name          = $label->getName();
        $labelApiResource->linkedRegexes = $label->getLinkedRegexes();
        $labelApiResource->maxValue      = $label->getMaxValue();
        $labelApiResource->maxPercentage = $label->getMaxPercentage();

        $parentLabel = $label->getParentLabel();
        if ($parentLabel instanceof Label) {
            $parentUuid = $parentLabel->getId();
            if ($parentUuid instanceof Uuid) {
                $labelApiResource->parentLabelId   = $parentUuid->toRfc4122();
                $labelApiResource->parentLabelName = $parentLabel->getName();
            }
        }

        foreach ($label->getLinkedBankAccounts() as $linkedBankAccount) {
            $bankAccountUuid = $linkedBankAccount->getId();
            if ($bankAccountUuid === null) {
                continue;
            }

            $labelApiResource->linkedBankAccountIds[] = $bankAccountUuid->toRfc4122();
        }

        foreach ($label->getChildLabels() as $childLabel) {
            $childUuid = $childLabel->getId();
            if ($childUuid === null) {
                continue;
            }

            $labelApiResource->childLabelIds[] = $childUuid->toRfc4122();
        }

        return $labelApiResource;
    }

    /**
     * Map DTO to Label entity and detect parent/child label changes.
     * Returns array with label and information about changes.
     *
     * @return array{
     *   label: Label,
     *   parentChanged: bool,
     *   oldParent: Label|null,
     *   newParent: Label|null,
     *   childChanges: array{added: array<Label>, removed: array<Label>}
     * }
     */
    public function mapDtoToLabel(LabelApiResource $labelApiResource, Label $label): array
    {
        $oldParent = $label->getParentLabel();

        $label->setName($labelApiResource->name);
        $label->setLinkedRegexes($labelApiResource->linkedRegexes);
        $label->setMaxValue($labelApiResource->maxValue);
        $label->setMaxPercentage($labelApiResource->maxPercentage);

        // Resolve parent label
        $newParent = null;
        if ($labelApiResource->parentLabelId !== null) {
            $newParent = $this->labelRepository->find(Uuid::fromRfc4122($labelApiResource->parentLabelId));
            $label->setParentLabel($newParent);
        } else {
            $label->setParentLabel(null);
        }

        // Detect if parent label changed
        $parentChanged = false;
        if ($oldParent !== $newParent) {
            // Check if it's actually a different UUID (not just different object instances)
            $oldParentId = $oldParent?->getId();
            $newParentId = $newParent?->getId();

            if ($oldParentId !== $newParentId) {
                $parentChanged = true;
            }
        }

        // Sync linked bank accounts
        $this->labelService->syncLinkedBankAccounts($label, $labelApiResource->linkedBankAccountIds);

        // Sync child labels and track changes
        $childChanges = $this->syncChildLabels($label, $labelApiResource->childLabelIds);

        return [
            'label' => $label,
            'parentChanged' => $parentChanged,
            'oldParent' => $oldParent,
            'newParent' => $newParent,
            'childChanges' => $childChanges,
        ];
    }

    /**
     * Sync child label relationships and track changes.
     * Removes existing child relationships not in the provided list and adds new ones.
     * Returns information about added and removed children.
     *
     * @param array<string> $childLabelIds
     *
     * @return array{added: array<Label>, removed: array<Label>}
     */
    private function syncChildLabels(Label $label, array $childLabelIds): array
    {
        $addedChildren   = [];
        $removedChildren = [];

        // Get current child labels
        $currentChildLabels = $label->getChildLabels();
        $currentChildIds    = [];

        foreach ($currentChildLabels as $childLabel) {
            $childUuid = $childLabel->getId();
            if ($childUuid === null) {
                continue;
            }

            $currentChildIds[] = $childUuid->toRfc4122();
        }

        // Remove child labels that are not in the new list
        foreach ($currentChildLabels as $childLabel) {
            $childUuid = $childLabel->getId();
            if (! $childUuid instanceof Uuid) {
                continue;
            }

            if (in_array($childUuid->toRfc4122(), $childLabelIds, true)) {
                continue;
            }

            $childLabel->setParentLabel(null);
            $removedChildren[] = $childLabel;
        }

        // Add new child labels
        foreach ($childLabelIds as $childLabelId) {
            // Skip if already a child
            if (in_array($childLabelId, $currentChildIds, true)) {
                continue;
            }

            $childLabel = $this->labelRepository->find(Uuid::fromRfc4122($childLabelId));
            if (! ($childLabel instanceof Label)) {
                continue;
            }

            // Prevent circular references
            if ($this->wouldCreateCircularReference($label, $childLabel)) {
                continue;
            }

            $childLabel->setParentLabel($label);
            $addedChildren[] = $childLabel;
        }

        return [
            'added' => $addedChildren,
            'removed' => $removedChildren,
        ];
    }

    /**
     * Check if setting a parent-child relationship would create a circular reference.
     */
    private function wouldCreateCircularReference(Label $parent, Label $child): bool
    {
        $current = $parent;
        $visited = [];

        while ($current instanceof Label) {
            $currentId = $current->getId();
            if (! $currentId instanceof Uuid) {
                break;
            }

            if (in_array($currentId->toRfc4122(), $visited, true)) {
                return true; // Circular reference detected
            }

            $visited[] = $currentId->toRfc4122();

            if ($current->getId() === $child->getId()) {
                return true; // Would create circular reference
            }

            $current = $current->getParentLabel();
        }

        return false;
    }
}
