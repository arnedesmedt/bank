<?php

declare(strict_types=1);

namespace App\Command;

use App\Message\CsvFileProcessingMessage;
use App\Message\MultiCsvFileProcessingMessage;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Messenger\MessageBusInterface;

#[AsCommand(
    name: 'app:test-messenger',
    description: 'Test the messenger system with sample messages',
)]
class TestMessengerCommand extends Command
{
    public function __construct(
        private readonly MessageBusInterface $messageBus,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Testing Symfony Messenger system...');

        // Test single file processing message
        $csvFileProcessingMessage = new CsvFileProcessingMessage(
            '/tmp/test.csv',
            'test.csv',
            'belfius',
            '1', // dummy user ID as string
            'test-upload-id-1',
        );

        $this->messageBus->dispatch($csvFileProcessingMessage);
        $output->writeln('✓ Single file processing message dispatched');

        // Test multi-file processing message
        $multiCsvFileProcessingMessage = new MultiCsvFileProcessingMessage(
            [
                [
                    'filePath' => '/tmp/test1.csv',
                    'originalFileName' => 'test1.csv',
                    'bankType' => 'belfius',
                ],
                [
                    'filePath' => '/tmp/test2.csv',
                    'originalFileName' => 'test2.csv',
                    'bankType' => 'belfius',
                ],
            ],
            '1', // dummy user ID as string
            'test-upload-id-2',
        );

        $this->messageBus->dispatch($multiCsvFileProcessingMessage);
        $output->writeln('✓ Multi-file processing message dispatched');

        $output->writeln('Messenger test completed successfully!');

        return Command::SUCCESS;
    }
}
