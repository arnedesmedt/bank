<?php

declare(strict_types=1);

namespace App\OAuth2;

use App\Entity\User;
use App\Repository\UserRepository;
use League\OAuth2\Server\Entities\ClientEntityInterface;
use League\OAuth2\Server\Entities\UserEntityInterface;
use League\OAuth2\Server\Repositories\UserRepositoryInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

use function assert;

class PasswordGrantUserRepository implements UserRepositoryInterface
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $userPasswordHasher,
    ) {
    }

    public function getUserEntityByUserCredentials(
        string $username,
        string $password,
        string $grantType,
        ClientEntityInterface $clientEntity,
    ): UserEntityInterface|null {
        // Only handle password grant
        if ($grantType !== 'password') {
            return null;
        }

        $user = $this->userRepository->findOneBy(['email' => $username]);

        if (! $user instanceof User) {
            return null;
        }

        if (! $this->userPasswordHasher->isPasswordValid($user, $password)) {
            return null;
        }

        $email = $user->getEmail();
        assert($email !== '', 'User email must not be empty');

        return new UserEntity($email);
    }
}
