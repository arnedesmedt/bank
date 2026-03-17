<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * T030 [US3]: Safety net controller that explicitly rejects DELETE requests
 * on bank account endpoints, ensuring a clear error message is returned
 * even if a client attempts a direct API call.
 *
 * Note: The DELETE operation has also been removed from BankAccountApiResource (T028),
 * so API Platform will not register a DELETE route. This controller provides
 * an explicit 405 response as a belt-and-suspenders approach.
 */
class BankAccountController extends AbstractController
{
    /**
     * Explicitly block bank account deletion via direct API call.
     * Returns 405 Method Not Allowed with a descriptive error message.
     */
    #[Route(
        path: '/api/bank-accounts/{id}',
        name: 'bank_account_delete_blocked',
        methods: ['DELETE'],
    )]
    public function deleteBankAccountBlocked(): JsonResponse
    {
        return $this->json(
            [
                'type'   => 'https://tools.ietf.org/html/rfc7231#section-6.5.5',
                'title'  => 'Method Not Allowed',
                'status' => Response::HTTP_METHOD_NOT_ALLOWED,
                'detail' => 'Bank account deletion is not allowed. ' .
                    'Accounts are retained for financial record integrity.',
            ],
            Response::HTTP_METHOD_NOT_ALLOWED,
            ['Allow' => 'GET, PUT'],
        );
    }
}
