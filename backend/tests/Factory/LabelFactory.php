<?php

declare(strict_types=1);

namespace App\Tests\Factory;

use App\Entity\Label;
use App\Entity\User;
use Override;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/** @extends PersistentObjectFactory<Label> */
final class LabelFactory extends PersistentObjectFactory
{
    public static function class(): string
    {
        return Label::class;
    }

    /** @return array<string, mixed> */
    protected function defaults(): array
    {
        return [
            'name'               => self::faker()->word(),
            'owner'              => UserFactory::new(),
            'linkedRegexes'      => [],
            'linkedBankAccounts' => [],
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
