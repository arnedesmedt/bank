<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Label;
use App\Entity\LabelTransferLink;
use App\Entity\Transfer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

use function assert;

/** @extends ServiceEntityRepository<LabelTransferLink> */
class LabelTransferLinkRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LabelTransferLink::class);
    }

    public function findByLabelAndTransfer(Label $label, Transfer $transfer): LabelTransferLink|null
    {
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.label = :label')
            ->andWhere('ltl.transfer = :transfer')
            ->setParameter('label', $label)
            ->setParameter('transfer', $transfer)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
        assert($result instanceof LabelTransferLink || $result === null);

        return $result;
    }

    /** @return array<LabelTransferLink> */
    public function findByTransfer(Transfer $transfer): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.transfer = :transfer')
            ->andWhere('ltl.isArchived = false')
            ->setParameter('transfer', $transfer)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<LabelTransferLink> */
    public function findByLabel(Label $label): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.label = :label')
            ->andWhere('ltl.isArchived = false')
            ->setParameter('label', $label)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<LabelTransferLink> */
    public function findAutomaticByLabel(Label $label): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.label = :label')
            ->andWhere('ltl.isManual = false')
            ->andWhere('ltl.isArchived = false')
            ->setParameter('label', $label)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<LabelTransferLink> */
    public function findActiveByLabel(Label $label): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.label = :label')
            ->andWhere('ltl.isArchived = false')
            ->setParameter('label', $label)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<LabelTransferLink> */
    public function findAllByTransfer(Transfer $transfer): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.transfer = :transfer')
            ->setParameter('transfer', $transfer)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /** @return array<LabelTransferLink> */
    public function findAllByLabel(Label $label): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->andWhere('ltl.label = :label')
            ->setParameter('label', $label)
            ->getQuery()
            ->getResult();

        return $result;
    }

    public function save(LabelTransferLink $labelTransferLink, bool $flush = false): void
    {
        $this->getEntityManager()->persist($labelTransferLink);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }

    public function remove(LabelTransferLink $labelTransferLink, bool $flush = false): void
    {
        $this->getEntityManager()->remove($labelTransferLink);

        if (! $flush) {
            return;
        }

        $this->getEntityManager()->flush();
    }

    public function flush(): void
    {
        $this->getEntityManager()->flush();
    }

    /** @return array<LabelTransferLink> */
    public function findByLabelUuid(Uuid $labelUuid): array
    {
        /** @var array<LabelTransferLink> $result */
        $result = $this->createQueryBuilder('ltl')
            ->join('ltl.label', 'l')
            ->andWhere('l.uuid = :uuid')
            ->setParameter('uuid', $labelUuid, 'uuid')
            ->getQuery()
            ->getResult();

        return $result;
    }
}
