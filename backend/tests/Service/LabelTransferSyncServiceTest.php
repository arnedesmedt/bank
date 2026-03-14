<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\Label;
use App\Service\LabelingService;
use App\Service\LabelTransferSyncService;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

/**
 * T037 [Phase 7]: Unit tests for LabelTransferSyncService.
 *
 * Verifies that:
 * - syncTransferLinksForLabel calls autoAssignLabelToAllTransfers atomically
 * - syncTransferLinksForLabels processes all labels in a single transaction
 * - Empty label array is handled gracefully (no DB calls)
 * - Nested transaction scenarios are handled correctly (no double-transaction wrapping)
 */
class LabelTransferSyncServiceTest extends TestCase
{
    private MockObject&EntityManagerInterface $entityManager;

    private MockObject&Connection $connection;

    private MockObject&LabelingService $labelingService;

    private LabelTransferSyncService $labelTransferSyncService;

    protected function setUp(): void
    {
        $this->connection      = $this->createMock(Connection::class);
        $this->entityManager   = $this->createMock(EntityManagerInterface::class);
        $this->labelingService = $this->createMock(LabelingService::class);

        $this->entityManager
            ->method('getConnection')
            ->willReturn($this->connection);

        $this->labelTransferSyncService = new LabelTransferSyncService(
            $this->entityManager,
            $this->labelingService,
        );
    }

    public function testSyncTransferLinksForLabelCallsAutoAssign(): void
    {
        $label = $this->createMock(Label::class);

        $this->connection
            ->method('isTransactionActive')
            ->willReturn(false);

        // wrapInTransaction should call the callback
        $this->entityManager
            ->expects($this->once())
            ->method('wrapInTransaction')
            ->willReturnCallback(static fn (callable $callback) => $callback());

        $this->labelingService
            ->expects($this->once())
            ->method('autoAssignLabelToAllTransfers')
            ->with($label);

        $this->labelTransferSyncService->syncTransferLinksForLabel($label);
    }

    public function testSyncTransferLinksForLabelSkipsTransactionWhenAlreadyActive(): void
    {
        $label = $this->createMock(Label::class);

        $this->connection
            ->method('isTransactionActive')
            ->willReturn(true);

        // Should NOT start a new transaction
        $this->entityManager
            ->expects($this->never())
            ->method('wrapInTransaction');

        $this->labelingService
            ->expects($this->once())
            ->method('autoAssignLabelToAllTransfers')
            ->with($label);

        $this->labelTransferSyncService->syncTransferLinksForLabel($label);
    }

    public function testSyncTransferLinksForLabelsProcessesAllLabels(): void
    {
        $label1 = $this->createMock(Label::class);
        $label2 = $this->createMock(Label::class);

        $this->connection
            ->method('isTransactionActive')
            ->willReturn(false);

        $this->entityManager
            ->expects($this->once())
            ->method('wrapInTransaction')
            ->willReturnCallback(static fn (callable $callback) => $callback());

        $this->labelingService
            ->expects($this->exactly(2))
            ->method('autoAssignLabelToAllTransfers');

        $this->labelTransferSyncService->syncTransferLinksForLabels([$label1, $label2]);
    }

    public function testSyncTransferLinksForLabelsDoesNothingForEmptyArray(): void
    {
        $this->entityManager
            ->expects($this->never())
            ->method('wrapInTransaction');

        $this->labelingService
            ->expects($this->never())
            ->method('autoAssignLabelToAllTransfers');

        $this->labelTransferSyncService->syncTransferLinksForLabels([]);
    }
}
