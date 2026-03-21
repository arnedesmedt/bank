<?php

declare(strict_types=1);

namespace App\Service\BankExtractor;

use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

/**
 * Parses a bank-specific CSV file handle into a stream of structured transfer data.
 *
 * Implementations are automatically collected via the 'bank.extractor' service tag.
 * Add a new class implementing this interface to support an additional bank format.
 */
#[AutoconfigureTag('bank.extractor')]
// phpcs:ignore SlevomatCodingStandard.Classes.SuperfluousInterfaceNaming.SuperfluousSuffix
interface BankExtractorInterface
{
    /**
     * Returns true when this extractor can handle the given bank type identifier.
     */
    public function supports(string $bankType): bool;

    /**
     * Reads the file handle and yields one {@see BankTransferData} per valid transfer row.
     *
     * Rows that are structurally invalid (e.g. too few columns, missing own account)
     * are silently skipped.  Rows that contain malformed data values (e.g. unparseable
     * date or amount) raise an {@see \InvalidArgumentException}.
     *
     * Implementors MUST throw a {@see RuntimeException} when the file format cannot be
     * recognised at all (e.g. header row is missing).
     *
     * The caller is responsible for opening and closing the file handle.
     *
     * @param resource $handle A readable stream resource as returned by fopen()
     *
     * @return iterable<BankTransferData>
     *
     * @throws RuntimeException          When the file structure is unrecognisable.
     * @throws InvalidArgumentException When a row contains an unparseable value.
     */
    public function extract($handle): iterable;
}
