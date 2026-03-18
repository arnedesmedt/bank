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
        $transferApiResource->date   = $transfer->getDate();

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

            $labelIdStr                        = $labelUuid->toRfc4122();
            $transferApiResource->labelIds[]   = $labelIdStr;
            $transferApiResource->labelNames[] = $label->getName();
            $transferApiResource->labelLinks[] = [
                'id'       => $labelIdStr,
                'name'     => $label->getName(),
                'isManual' => $labelTransferLink->isManual(),
            ];
        }

        $parentTransfer = $transfer->getParentTransfer();
        if ($parentTransfer instanceof Transfer) {
            $parentUuid = $parentTransfer->getId();
            if ($parentUuid instanceof Uuid) {
                $transferApiResource->parentTransferId = $parentUuid->toRfc4122();
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

        return $label;
    }
}
