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
use InvalidArgumentException;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class LabelArchivingTest extends TestCase
{
    private LabelingService $labelingService;

    private MockObject $repository;

    protected function setUp(): void
    {
        $this->repository      = $this->createMock(LabelTransferLinkRepository::class);
        $this->labelingService = new LabelingService(
            $this->createMock(LabelRepository::class),
            $this->repository,
            $this->createMock(TransferRepository::class),
        );
    }

    public function testArchiveAutomaticLink(): void
    {
        $label = new Label();
        $label->setName('Test Label');

        $transfer = new Transfer();

        $labelTransferLink = new LabelTransferLink();
        $labelTransferLink->setLabel($label);
        $labelTransferLink->setTransfer($transfer);
        $labelTransferLink->setIsManual(false);
        $labelTransferLink->setIsArchived(false);

        $this->repository->expects($this->once())
            ->method('save')
            ->with($labelTransferLink, true);

        $this->labelingService->archiveLabelTransferLink($labelTransferLink);

        $this->assertTrue($labelTransferLink->isArchived());
    }

    public function testArchiveManualLinkThrowsException(): void
    {
        $label = new Label();
        $label->setName('Test Label');

        $transfer = new Transfer();

        $labelTransferLink = new LabelTransferLink();
        $labelTransferLink->setLabel($label);
        $labelTransferLink->setTransfer($transfer);
        $labelTransferLink->setIsManual(true);
        $labelTransferLink->setIsArchived(false);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Manual links cannot be archived');

        $this->labelingService->archiveLabelTransferLink($labelTransferLink);
    }

    public function testUnarchiveLink(): void
    {
        $label = new Label();
        $label->setName('Test Label');

        $transfer = new Transfer();

        $labelTransferLink = new LabelTransferLink();
        $labelTransferLink->setLabel($label);
        $labelTransferLink->setTransfer($transfer);
        $labelTransferLink->setIsManual(false);
        $labelTransferLink->setIsArchived(true);

        $this->repository->expects($this->once())
            ->method('save')
            ->with($labelTransferLink, true);

        $this->labelingService->unarchiveLabelTransferLink($labelTransferLink);

        $this->assertFalse($labelTransferLink->isArchived());
    }
}
