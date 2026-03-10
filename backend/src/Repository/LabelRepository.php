<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Label;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Label> */
class LabelRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Label::class);
    }

    /** @return array<Label> */
    public function findByOwner(User $user): array
    {
        return $this->findBy(['user' => $user]);
    }

    /** @return array<Label> */
    public function findParentLabels(User $user): array
    {
        /** @var array<Label> $result */
        $result = $this->createQueryBuilder('l')
            ->where('l.user = :user')
            ->andWhere('l.parentLabel IS NULL')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();

        return $result;
    }

    public function save(Label $label, bool $flush = false): void
    {
        $this->getEntityManager()->persist($label);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }

    public function remove(Label $label, bool $flush = false): void
    {
        $this->getEntityManager()->remove($label);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }
}
