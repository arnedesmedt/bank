<?php

declare(strict_types=1);

namespace App\OAuth2;

use League\OAuth2\Server\Entities\Traits\EntityTrait;
use League\OAuth2\Server\Entities\UserEntityInterface;

class UserEntity implements UserEntityInterface
{
    use EntityTrait;

    /** @param non-empty-string $identifier */
    public function __construct(string $identifier)
    {
        $this->setIdentifier($identifier);
    }
}
