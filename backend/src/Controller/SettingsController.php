<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\BankAccountRepository;
use App\Repository\TransferRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Settings controller — exposes destructive admin operations behind
 * ROLE_USER authentication. Currently provides:
 *   DELETE /api/settings/transfers  — wipe all transfer records.
 */
#[Route('/api/settings', name: 'settings_')]
#[IsGranted('ROLE_USER')]
class SettingsController extends AbstractController
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
        private readonly BankAccountRepository $bankAccountRepository,
    ) {
    }

    /**
     * Delete every transfer in the database and reset all bank-account balances to 0.
     *
     * Returns the number of deleted rows on success.
     */
    #[Route('/transfers', name: 'delete_all_transfers', methods: ['DELETE'])]
    public function deleteAllTransfers(): JsonResponse
    {
        $deleted = $this->transferRepository->deleteAll();
        $this->bankAccountRepository->resetAllBalances();

        return $this->json(
            ['deleted' => $deleted],
            Response::HTTP_OK,
        );
    }
}
