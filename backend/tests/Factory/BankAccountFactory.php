<?php

declare(strict_types=1);

namespace App\Tests\Factory;

use App\Entity\BankAccount;
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
        $name   = self::faker()->name();
        $digits = self::faker()->numerify('##############');
        $number = 'BE' . $digits;

        return [
            'accountName'   => $name,
            'accountNumber' => BankAccount::normalizeAccountNumber($number) ?? $number,
            'hash'          => BankAccount::calculateHash($name, BankAccount::normalizeAccountNumber($number)),
        ];
    }

    #[Override]
    protected function initialize(): static
    {
        return $this;
    }
}
