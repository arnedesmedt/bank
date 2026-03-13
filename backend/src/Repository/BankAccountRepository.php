<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BankAccount;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<BankAccount> */
class BankAccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BankAccount::class);
    }

    public function findByHash(string $hash): BankAccount|null
    {
        return $this->findOneBy(['hash' => $hash]);
    }

    /** @return array<BankAccount> */
    public function findAll(): array
    {
        return $this->findBy([], ['accountName' => 'ASC']);
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
