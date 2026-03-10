<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BankAccount;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<BankAccount> */
class BankAccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BankAccount::class);
    }

    public function findByAccountNumber(string $accountNumber): BankAccount|null
    {
        return $this->findOneBy(['accountNumber' => $accountNumber]);
    }

    /** @return array<BankAccount> */
    public function findByOwner(User $user): array
    {
        return $this->findBy(['user' => $user]);
    }

    public function save(BankAccount $bankAccount, bool $flush = false): void
    {
        $this->getEntityManager()->persist($bankAccount);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }

    public function remove(BankAccount $bankAccount, bool $flush = false): void
    {
        $this->getEntityManager()->remove($bankAccount);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }
}
