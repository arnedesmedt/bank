<?php

declare(strict_types=1);

namespace App\Tests\Factory;

use App\Entity\BankAccount;
use App\Entity\User;
use Override;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/** @extends PersistentObjectFactory<BankAccount> */
final class BankAccountFactory extends PersistentObjectFactory
{
    public static function class(): string
    {
        return BankAccount::class;
    }

    /** @return array<string, mixed> */
    protected function defaults(): array
    {
        return [
            'accountName'   => self::faker()->name(),
            'accountNumber' => 'BE' . self::faker()->numerify('##############'),
            'owner'         => UserFactory::new(),
        ];
    }

    #[Override]
    protected function initialize(): static
    {
        return $this;
    }

    public function withOwner(User $user): self
    {
        return $this->with(['owner' => $user]);
    }
}
