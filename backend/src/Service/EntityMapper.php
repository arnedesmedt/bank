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

    public function mapTransferToDto(Transfer $transfer): TransferApiResource
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
            $linkUuid  = $labelTransferLink->getId();
            $labelUuid = $label->getId();
            if ($linkUuid === null) {
                continue;
            }

            if ($labelUuid === null) {
                continue;
            }

            $linkIdStr  = $linkUuid->toRfc4122();
            $labelIdStr = $labelUuid->toRfc4122();

            // Only include in active labels if not archived
            if (! $labelTransferLink->isArchived()) {
                $transferApiResource->labelIds[]   = $labelIdStr;
                $transferApiResource->labelNames[] = $label->getName();
            }

            // Always include in labelLinks for UI display (archive/unarchive functionality)
            $transferApiResource->labelLinks[] = [
                'id'        => $linkIdStr,
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

        foreach ($transfer->getChildRefunds() as $childRefund) {
            $childUuid = $childRefund->getId();
            if (! ($childUuid instanceof Uuid)) {
                continue;
            }

            $transferApiResource->childRefundIds[] = $childUuid->toRfc4122();
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

        return $bankAccount;
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

    public function mapDtoToLabel(LabelApiResource $labelApiResource, Label $label): Label
    {
        $label->setName($labelApiResource->name);
        $label->setLinkedRegexes($labelApiResource->linkedRegexes);
        $label->setMaxValue($labelApiResource->maxValue);
        $label->setMaxPercentage($labelApiResource->maxPercentage);

        // Resolve parent label
        if ($labelApiResource->parentLabelId !== null) {
            $parentLabel = $this->labelRepository->find(Uuid::fromRfc4122($labelApiResource->parentLabelId));
            $label->setParentLabel($parentLabel);
        } else {
            $label->setParentLabel(null);
        }

        // Sync linked bank accounts
        $this->labelService->syncLinkedBankAccounts($label, $labelApiResource->linkedBankAccountIds);

        // Sync child labels
        $this->syncChildLabels($label, $labelApiResource->childLabelIds);

        return $label;
    }

    /**
     * Sync child label relationships.
     * Removes existing child relationships not in the provided list and adds new ones.
     *
     * @param array<string> $childLabelIds
     */
    private function syncChildLabels(Label $label, array $childLabelIds): void
    {
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
        }
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
