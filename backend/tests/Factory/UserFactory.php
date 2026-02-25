<?php

declare(strict_types=1);

namespace App\Tests\Factory;

use App\Entity\User;
use Override;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

use function str_starts_with;

/** @extends PersistentObjectFactory<User> */
final class UserFactory extends PersistentObjectFactory
{
    public const string ADMIN_EMAIL = 'admin@bank-app.be';

    public const string ADMIN_PASSWORD = 'password';

    /** @phpstan-ignore property.readOnlyByPhpDocDefaultValue (Static property can be mutated via setPasswordHasher) */
    private static UserPasswordHasherInterface|null $userPasswordHasher = null;

    public static function class(): string
    {
        return User::class;
    }

    public static function setPasswordHasher(UserPasswordHasherInterface $userPasswordHasher): void
    {
        self::$userPasswordHasher = $userPasswordHasher;
    }

    /** @return array<string, mixed> */
    protected function defaults(): array
    {
        return [
            'email' => self::faker()->unique()->email(),
            'password' => 'password', // Will be hashed in initialize()
            'roles' => ['ROLE_USER'],
        ];
    }

    #[Override]
    protected function initialize(): static
    {
        return $this->afterInstantiate(static function (User $user): void {
            if (
                ! self::$userPasswordHasher instanceof UserPasswordHasherInterface
                || str_starts_with($user->getPassword(), '$')
            ) {
                return;
            }

            $hashedPassword = self::$userPasswordHasher->hashPassword($user, $user->getPassword());
            $user->setPassword($hashedPassword);
        });
    }

    /**
     * Create a user with specific email and password
     */
    public function withCredentials(string $email, string $password): self
    {
        return $this->with([
            'email' => $email,
            'password' => $password,
        ]);
    }

    /**
     * Create an admin user
     */
    public function admin(): self
    {
        return $this->with([
            'roles' => ['ROLE_USER', 'ROLE_ADMIN'],
        ]);
    }
}
