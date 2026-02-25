<?php

declare(strict_types=1);

namespace App\OAuth2;

use App\Entity\User;
use InvalidArgumentException;
use League\Bundle\OAuth2ServerBundle\Converter\UserConverterInterface;
use League\OAuth2\Server\Entities\UserEntityInterface;
use Symfony\Component\Security\Core\User\UserInterface;

use function assert;

class UserConverter implements UserConverterInterface
{
    public function toLeague(UserInterface $user): UserEntityInterface
    {
        if (! $user instanceof User) {
            throw new InvalidArgumentException('User must be an instance of ' . User::class);
        }

        $email = $user->getEmail();
        assert($email !== '', 'User email must not be empty');

        return new UserEntity($email);
    }
}
