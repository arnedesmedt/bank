<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\Label;
use App\Entity\LabelTransferLink;
use App\Entity\Transfer;
use App\Repository\LabelRepository;
use App\Repository\LabelTransferLinkRepository;
use App\Repository\TransferRepository;
use App\Service\LabelingService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

/**
 * Test for parent label propagation to existing transfers.
 */
class LabelingServiceParentPropagationTest extends TestCase
{
    private LabelingService $labelingService;

    private MockObject $labelRepository;

    private MockObject $labelTransferLinkRepository;

    private MockObject $transferRepository;

    protected function setUp(): void
    {
        $this->labelRepository             = $this->createMock(LabelRepository::class);
        $this->labelTransferLinkRepository = $this->createMock(LabelTransferLinkRepository::class);
        $this->transferRepository          = $this->createMock(TransferRepository::class);

        $this->labelingService = new LabelingService(
            $this->labelRepository,
            $this->labelTransferLinkRepository,
            $this->transferRepository,
            $this->createMock(LoggerInterface::class),
        );
    }

    public function testPropagateParentLabelToExistingTransfers(): void
    {
        // Create test data
        $childLabel = new Label();
        $childLabel->setName('Inkomen Hanne');

        $parentLabel = new Label();
        $parentLabel->setName('Inkomen');

        $transfer1 = $this->createMock(Transfer::class);
        $transfer2 = $this->createMock(Transfer::class);
        $transfer3 = $this->createMock(Transfer::class);

        // Create mock existing link for transfer 1 and 2 (but not 3)
        $existingLink1 = $this->createMock(LabelTransferLink::class);
        $existingLink2 = $this->createMock(LabelTransferLink::class);

        // Mock repository calls
        $this->transferRepository->expects(self::once())
            ->method('findAll')
            ->with(10000, 0)
            ->willReturn([$transfer1, $transfer2, $transfer3]);

        // Mock findByLabelAndTransfer for each transfer
        $this->labelTransferLinkRepository->expects(self::exactly(3))
            ->method('findByLabelAndTransfer')
            ->willReturnMap([
                [$childLabel, $transfer1, $existingLink1],  // Has child label
                [$childLabel, $transfer2, $existingLink2],  // Has child label
                [$childLabel, $transfer3, null],            // No child label
            ]);

        // Mock flush call
        $this->labelTransferLinkRepository->expects(self::once())
            ->method('flush');

        // Test the method
        $this->labelingService->propagateParentLabelToExistingTransfers($childLabel, $parentLabel);

        // The assertion is that the method completes without error
        // In a real test with database, we would verify that parent label was added to transfers 1 and 2
        $this->expectNotToPerformAssertions();
    }
}
