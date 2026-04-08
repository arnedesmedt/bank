<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Transfer;
use App\Repository\TransferRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

use function count;
use function sprintf;

#[AsCommand(
    name: 'app:fix-internal-transfers',
    description: 'Fix transfers that should be marked as internal but are not',
)]
class FixInternalTransfersCommand extends Command
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Fixing transfers that should be internal but are not...');

        // Find all transfers between internal accounts that are not marked as internal
        $queryBuilder = $this->transferRepository->createQueryBuilder('t')
            ->join('t.fromAccount', 'baFrom')
            ->join('t.toAccount', 'baTo')
            ->where('baFrom.isInternal = true')
            ->andWhere('baTo.isInternal = true')
            ->andWhere('t.isInternal = false');

        $transfers = $queryBuilder->getQuery()->getResult();
        /** @var array<Transfer> $transfers */
        $count = count($transfers);

        $output->writeln(sprintf('Found %d transfers to fix...', $count));

        foreach ($transfers as $transfer) {
            $transfer->setIsInternal(true);
        }

        $this->entityManager->flush();

        $output->writeln(sprintf('Fixed %d transfers. They are now marked as internal.', $count));

        return Command::SUCCESS;
    }
}
