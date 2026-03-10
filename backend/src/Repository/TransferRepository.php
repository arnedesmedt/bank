<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Transfer;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

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
    public function findByOwner(User $user, int $limit = 100, int $offset = 0): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->setParameter('user', $user)
            ->orderBy('t.date', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<Transfer> */
    public function findNonInternalByOwner(User $user, int $limit = 100, int $offset = 0): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.isInternal = :isInternal')
            ->setParameter('user', $user)
            ->setParameter('isInternal', false)
            ->orderBy('t.date', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<Transfer> */
    public function findByDateRange(User $user, DateTimeImmutable $startDate, DateTimeImmutable $endDate): array
    {
        /** @var array<Transfer> $result */
        $result = $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.date >= :startDate')
            ->andWhere('t.date <= :endDate')
            ->setParameter('user', $user)
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->orderBy('t.date', 'DESC')
            ->getQuery()
            ->getResult();

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
