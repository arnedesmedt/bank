<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BankAccount;
use App\Entity\Transfer;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Override;

use function assert;

/** @extends ServiceEntityRepository<Transfer> */
class TransferRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transfer::class);
    }

    public function findByTransactionId(string $transactionId): Transfer|null
    {
        return $this->findOneBy(['transactionId' => $transactionId]);
    }

    public function findByFingerprint(string $fingerprint): Transfer|null
    {
        return $this->findOneBy(['fingerprint' => $fingerprint]);
    }

    /** @return array<Transfer> */
    public function findByAccount(BankAccount $bankAccount, int $limit = 100, int $offset = 0): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->andWhere('t.fromAccount = :account OR t.toAccount = :account')
            ->setParameter('account', $bankAccount)
            ->orderBy('t.date', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<Transfer> */
    #[Override]
    public function findAll(int $limit = 100, int $offset = 0): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->orderBy('t.date', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<Transfer> */
    public function findNonInternal(int $limit = 100, int $offset = 0): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->andWhere('t.isInternal = :isInternal')
            ->setParameter('isInternal', false)
            ->orderBy('t.date', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<Transfer> */
    public function findByDateRange(DateTimeImmutable $startDate, DateTimeImmutable $endDate): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->andWhere('t.date >= :startDate')
            ->andWhere('t.date <= :endDate')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->orderBy('t.date', 'DESC')
            ->getQuery()
            ->getResult();

        return $result;
    }

    /**
     * Find the reverse of an internal transfer.
     * A "reversed" transfer has the accounts switched and the same amount, on the same date.
     * (In the Belfius dual-export scenario: A→B,-50 is the reverse of B→A,-50 on the same date.)
     */
    public function findReversedInternalTransfer(
        BankAccount $fromAccount,
        BankAccount $toAccount,
        string $amount,
        DateTimeImmutable $date,
    ): Transfer|null {
        $result = $this->createQueryBuilder('t')
            ->andWhere('t.fromAccount = :from')
            ->andWhere('t.toAccount = :to')
            ->andWhere('t.amount = :amount')
            ->andWhere('t.date = :date')
            ->setParameter('from', $toAccount)
            ->setParameter('to', $fromAccount)
            ->setParameter('amount', $amount)
            ->setParameter('date', $date)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
        assert($result instanceof Transfer || $result === null);

        return $result;
    }

    public function save(Transfer $transfer, bool $flush = false): void
    {
        $this->getEntityManager()->persist($transfer);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }

    public function remove(Transfer $transfer, bool $flush = false): void
    {
        $this->getEntityManager()->remove($transfer);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }
}
