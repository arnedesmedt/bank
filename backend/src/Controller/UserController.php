<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

class UserController extends AbstractController
{
    #[Route('/api/me', name: 'api_user_me', methods: ['GET'])]
    public function me(
        #[CurrentUser]
        User|null $user,
    ): JsonResponse {
        if (! $user instanceof User) {
            return $this->json([
                'error' => ['message' => 'Not authenticated'],
            ], 401);
        }

        $uuid = $user->getId();
        if (! $uuid instanceof Uuid) {
            return $this->json([
                'error' => ['message' => 'User has no ID'],
            ], 500);
        }

        return $this->json([
            'id' => $uuid->toRfc4122(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
        ]);
    }
}
