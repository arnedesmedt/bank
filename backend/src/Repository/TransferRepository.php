<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BankAccount;
use App\Entity\Transfer;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Override;

use function array_keys;
use function array_map;
use function assert;
use function implode;
use function sprintf;

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

    /**
     * Find transfers with optional filters: search, dateFrom, dateTo, labelIds, accountId.
     *
     * @param array<string> $labelIds
     *
     * @return array<Transfer>
     */
    public function findWithFilters(
        string|null $search = null,
        DateTimeImmutable|null $dateFrom = null,
        DateTimeImmutable|null $dateTo = null,
        array $labelIds = [],
        string|null $accountId = null,
        int $limit = 30,
        int $offset = 0,
    ): array {
        $queryBuilder = $this->buildFilterQuery($search, $dateFrom, $dateTo, $labelIds, $accountId);
        $queryBuilder->orderBy('t.date', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        /** @var array<Transfer> $result */
        $result = $queryBuilder->getQuery()->getResult();

        return $result;
    }

    /**
     * Count transfers matching filters (for total/summary display).
     *
     * @param array<string> $labelIds
     */
    public function countWithFilters(
        string|null $search = null,
        DateTimeImmutable|null $dateFrom = null,
        DateTimeImmutable|null $dateTo = null,
        array $labelIds = [],
        string|null $accountId = null,
    ): int {
        $queryBuilder = $this->buildFilterQuery($search, $dateFrom, $dateTo, $labelIds, $accountId);
        $queryBuilder->select('COUNT(DISTINCT t.uuid)');

        return (int) $queryBuilder->getQuery()->getSingleScalarResult();
    }

    /**
     * Sum of positive (incoming) and negative (outgoing) amounts for filtered transfers.
     * Returns ['totalIn' => string, 'totalOut' => string, 'net' => string].
     *
     * @param array<string> $labelIds
     *
     * @return array{totalIn: string, totalOut: string, net: string}
     */
    public function sumWithFilters(
        string|null $search = null,
        DateTimeImmutable|null $dateFrom = null,
        DateTimeImmutable|null $dateTo = null,
        array $labelIds = [],
        string|null $accountId = null,
    ): array {
        $queryBuilder = $this->buildFilterQuery($search, $dateFrom, $dateTo, $labelIds, $accountId);
        $queryBuilder->select(
            'SUM(CASE WHEN CAST(t.amount AS decimal) > 0 THEN CAST(t.amount AS decimal) ELSE 0 END) AS totalIn',
            'SUM(CASE WHEN CAST(t.amount AS decimal) < 0 THEN CAST(t.amount AS decimal) ELSE 0 END) AS totalOut',
            'SUM(CAST(t.amount AS decimal)) AS net',
        );

        /** @var array{totalIn: string|null, totalOut: string|null, net: string|null} $row */
        $row = $queryBuilder->getQuery()->getSingleResult();

        return [
            'totalIn'  => $row['totalIn'] ?? '0',
            'totalOut' => $row['totalOut'] ?? '0',
            'net'      => $row['net'] ?? '0',
        ];
    }

    /**
     * Build the base query builder with all filters applied.
     *
     * @param array<string> $labelIds
     */
    private function buildFilterQuery(
        string|null $search,
        DateTimeImmutable|null $dateFrom,
        DateTimeImmutable|null $dateTo,
        array $labelIds,
        string|null $accountId,
    ): QueryBuilder {
        $queryBuilder = $this->createQueryBuilder('t');

        if ($search !== null && $search !== '') {
            $queryBuilder->andWhere('LOWER(t.reference) LIKE LOWER(:search) OR LOWER(t.csvSource) LIKE LOWER(:search)')
                ->setParameter('search', '%' . $search . '%');
        }

        if ($dateFrom instanceof DateTimeImmutable) {
            $queryBuilder->andWhere('t.date >= :dateFrom')
                ->setParameter('dateFrom', $dateFrom);
        }

        if ($dateTo instanceof DateTimeImmutable) {
            $queryBuilder->andWhere('t.date <= :dateTo')
                ->setParameter('dateTo', $dateTo);
        }

        if ($labelIds !== []) {
            $queryBuilder->join('t.labelTransferLinks', 'ltl')
                ->join('ltl.label', 'lbl')
                ->andWhere('lbl.uuid IN (:labelIds)')
                ->setParameter('labelIds', $labelIds);
        }

        if ($accountId !== null && $accountId !== '') {
            $queryBuilder->andWhere('t.fromAccount = :account OR t.toAccount = :account')
                ->setParameter('account', $accountId);
        }

        return $queryBuilder;
    }

    /**
     * Group transfers by period (month, quarter, year), label, or both combined.
     *
     * @param array<string> $labelIds
     *
     * @return array<
     *     array{
     *          period: string,
     *          label_id: string|null,
     *          label_name: string|null,
     *          total_amount: string,
     *          transfer_count: int
     *      }
     * >
     */
    public function groupBy(
        string $groupBy,
        string $period = 'month',
        DateTimeImmutable|null $dateFrom = null,
        DateTimeImmutable|null $dateTo = null,
        array $labelIds = [],
    ): array {
        $connection = $this->getEntityManager()->getConnection();

        $where  = [];
        $params = [];

        if ($dateFrom instanceof DateTimeImmutable) {
            $where[]            = 't.date >= :dateFrom';
            $params['dateFrom'] = $dateFrom->format('Y-m-d H:i:s');
        }

        if ($dateTo instanceof DateTimeImmutable) {
            $where[]          = 't.date <= :dateTo';
            $params['dateTo'] = $dateTo->format('Y-m-d H:i:s');
        }

        if ($labelIds !== []) {
            $placeholders = implode(',', array_map(static fn ($i): string => ':labelId' . $i, array_keys($labelIds)));
            $where[]      = sprintf('lbl.uuid IN (%s)', $placeholders);
            foreach ($labelIds as $i => $id) {
                $params['labelId' . $i] = $id;
            }
        }

        $whereClause = $where !== [] ? 'WHERE ' . implode(' AND ', $where) : '';

        $periodExpr = match ($period) {
            'quarter' => "TO_CHAR(t.date, 'YYYY') || '-Q' || TO_CHAR(t.date, 'Q')",
            'year'    => "TO_CHAR(t.date, 'YYYY')",
            default   => "TO_CHAR(t.date, 'YYYY-MM')",
        };

        if ($groupBy === 'label') {
            $sql = sprintf(
                '
                SELECT
                    CAST(lbl.uuid AS TEXT) AS period,
                    CAST(lbl.uuid AS TEXT) AS label_id,
                    lbl.name AS label_name,
                    SUM(CAST(t.amount AS NUMERIC)) AS total_amount,
                    COUNT(t.uuid) AS transfer_count
                FROM transfers t
                INNER JOIN label_transfer_link ltl ON ltl.transfer_uuid = t.uuid
                INNER JOIN labels lbl ON lbl.uuid = ltl.label_uuid
                %s
                GROUP BY lbl.uuid, lbl.name
                ORDER BY total_amount DESC
            ',
                $whereClause,
            );
        } elseif ($groupBy === 'label_and_period') {
            $sql = sprintf(
                '
                SELECT
                    %s AS period,
                    CAST(lbl.uuid AS TEXT) AS label_id,
                    lbl.name AS label_name,
                    SUM(CAST(t.amount AS NUMERIC)) AS total_amount,
                    COUNT(t.uuid) AS transfer_count
                FROM transfers t
                INNER JOIN label_transfer_link ltl ON ltl.transfer_uuid = t.uuid
                INNER JOIN labels lbl ON lbl.uuid = ltl.label_uuid
                %s
                GROUP BY period, lbl.uuid, lbl.name
                ORDER BY period ASC, lbl.name ASC
            ',
                $periodExpr,
                $whereClause,
            );
        } else {
            // period-only: join labels only when a label filter is active
            $labelJoin = $labelIds !== []
                ? 'INNER JOIN label_transfer_link ltl ON ltl.transfer_uuid = t.uuid
                INNER JOIN labels lbl ON lbl.uuid = ltl.label_uuid'
                : '';

            $sql = sprintf(
                '
                SELECT
                    %s AS period,
                    NULL AS label_id,
                    NULL AS label_name,
                    SUM(CAST(t.amount AS NUMERIC)) AS total_amount,
                    COUNT(t.uuid) AS transfer_count
                FROM transfers t
                %s
                %s
                GROUP BY period
                ORDER BY period ASC
            ',
                $periodExpr,
                $labelJoin,
                $whereClause,
            );
        }

        /** @var array<array{period: string, label_id: string|null, label_name: string|null, total_amount: string, transfer_count: int}> $result */
        $result = $connection->executeQuery($sql, $params)->fetchAllAssociative();

        return $result;
    }
}
