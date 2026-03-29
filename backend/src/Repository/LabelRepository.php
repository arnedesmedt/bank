<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Label;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Override;

/** @extends ServiceEntityRepository<Label> */
class LabelRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Label::class);
    }

    /** @return array<Label> */
    #[Override]
    public function findAll(): array
    {
        return $this->findBy([], ['name' => 'ASC']);
    }

    /** @return array<Label> */
    public function findParentLabels(): array
    {
        /** @var array<Label> $result */
        $result = $this->createQueryBuilder('l')
            ->andWhere('l.parentLabel IS NULL')
            ->orderBy('l.name', 'ASC')
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
