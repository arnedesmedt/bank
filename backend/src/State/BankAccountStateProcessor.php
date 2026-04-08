<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\BankAccountApiResource;
use App\Entity\BankAccount;
use App\Repository\BankAccountRepository;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;
use App\Service\LabelingService;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function count;
use function is_string;
use function trim;

/** @implements ProcessorInterface<BankAccountApiResource, BankAccountApiResource> */
class BankAccountStateProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly EntityMapper $entityMapper,
        private readonly LabelingService $labelingService,
        private readonly TransferRepository $transferRepository,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     */
    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = [],
    ): BankAccountApiResource {
        $id = $uriVariables['id'] ?? null;

        if ($id !== null && is_string($id)) {
            // Update existing — hash is NOT recalculated on update (set only on creation/import)
            $bankAccount = $this->bankAccountRepository->find(Uuid::fromRfc4122($id));
            if (! $bankAccount instanceof BankAccount) {
                throw new NotFoundHttpException('BankAccount not found');
            }

            // Check if internal status is changing
            $oldInternalStatus = $bankAccount->isInternal();
            $this->entityMapper->mapDtoToBankAccount($data, $bankAccount);
            $newInternalStatus = $bankAccount->isInternal();

            $this->bankAccountRepository->save($bankAccount, true);

            // Update internal status for transfers if account internal status changed
            if ($oldInternalStatus !== $newInternalStatus) {
                $this->transferRepository->updateTransferInternalStatusForAccount($bankAccount);
            }

            // FR-011: Re-evaluate automatic label links for labels linked to this bank account
            $affectedLabels = $bankAccount->getLinkedLabels()->toArray();
            if (count($affectedLabels) > 0) {
                $this->labelingService->reevaluateLinksForLabels($affectedLabels);
            }

            return $this->entityMapper->mapBankAccountToDto($bankAccount);
        }

        // T010: Strict property handling — clean name/number before hashing
        $cleanName        = $data->accountName !== null && trim($data->accountName) !== ''
            ? trim($data->accountName)
            : null;
        $normalizedNumber = BankAccount::normalizeAccountNumber($data->accountNumber);

        // T009: Calculate SHA-256 hash from cleaned name and normalized number
        $hash = BankAccount::calculateHash($cleanName, $normalizedNumber);

        // T014: Reject duplicate accounts based on hash uniqueness
        $existing = $this->bankAccountRepository->findByHash($hash);
        if ($existing instanceof BankAccount) {
            throw new ConflictHttpException('A bank account with this name and number already exists');
        }

        $bankAccount = new BankAccount();
        $bankAccount->setHash($hash);

        // T012: Mark first created account as internal (own account)
        $totalCount = $this->bankAccountRepository->count([]);
        if ($totalCount === 0) {
            $bankAccount->markAsInternal();
        }

        $this->entityMapper->mapDtoToBankAccount($data, $bankAccount);
        $this->bankAccountRepository->save($bankAccount, true);

        return $this->entityMapper->mapBankAccountToDto($bankAccount);
    }
}
