<?php

declare(strict_types=1);

namespace App\DataFixtures\Story;

use App\Tests\Factory\UserFactory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Zenstruck\Foundry\Attribute\AsFixture;
use Zenstruck\Foundry\Story;

/**
 * Dev fixtures — loaded via `make fixtures-load` for local development.
 * Provides a realistic dataset to work with in the browser.
 */
#[AsFixture(name: 'dev')]
class DevFixtures extends Story
{
    public function __construct(
        private readonly UserPasswordHasherInterface $userPasswordHasher,
    ) {
    }

    public function build(): void
    {
        UserFactory::setPasswordHasher($this->userPasswordHasher);

        // Create admin user
        UserFactory::createOne([
            'email' => UserFactory::ADMIN_EMAIL,
        ]);
    }
}
