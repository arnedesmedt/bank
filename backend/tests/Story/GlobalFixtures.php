<?php

declare(strict_types=1);

namespace App\Tests\Story;

use App\Tests\Factory\UserFactory;
use Zenstruck\Foundry\Story;

class GlobalFixtures extends Story
{
    public function build(): void
    {
        // Password hasher must be set before loading this story
        UserFactory::createOne(
            [
                'email' => UserFactory::ADMIN_EMAIL,
            ],
        );
    }
}
