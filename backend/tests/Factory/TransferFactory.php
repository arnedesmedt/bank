<?php

declare(strict_types=1);

namespace App\Tests\Factory;

use App\Entity\Transfer;
use DateTimeImmutable;
use Override;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

use function md5;
use function uniqid;

/** @extends PersistentObjectFactory<Transfer> */
final class TransferFactory extends PersistentObjectFactory
{
    public static function class(): string
    {
        return Transfer::class;
    }

    /** @return array<string, mixed> */
    protected function defaults(): array
    {
        $unique = uniqid('', true);

        return [
            'amount'      => '-' . self::faker()->randomFloat(2, 1, 1000),
            'date'        => DateTimeImmutable::createFromMutable(self::faker()->dateTimeBetween('-2 years', 'now')),
            'reference'   => self::faker()->sentence(),
            'csvSource'   => 'test.csv',
            'fingerprint' => md5($unique),
        ];
    }

    #[Override]
    protected function initialize(): static
    {
        return $this;
    }
}
