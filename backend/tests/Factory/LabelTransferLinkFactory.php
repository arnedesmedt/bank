<?php

declare(strict_types=1);

namespace App\Tests\Factory;

use App\Entity\LabelTransferLink;
use Override;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/** @extends PersistentObjectFactory<LabelTransferLink> */
final class LabelTransferLinkFactory extends PersistentObjectFactory
{
    public static function class(): string
    {
        return LabelTransferLink::class;
    }

    /** @return array<string, mixed> */
    protected function defaults(): array
    {
        return ['isManual' => false];
    }

    #[Override]
    protected function initialize(): static
    {
        return $this;
    }
}
