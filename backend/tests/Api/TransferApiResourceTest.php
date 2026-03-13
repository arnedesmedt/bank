<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use Symfony\Component\HttpFoundation\File\UploadedFile;

use function array_column;
use function assert;
use function file_exists;
use function file_put_contents;
use function implode;
use function is_array;
use function json_decode;
use function sys_get_temp_dir;
use function tempnam;
use function unlink;

class TransferApiResourceTest extends BankApiTestCase
{
    public function testGetCollectionRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/transfers');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetCollectionReturnsEmptyArrayWithNoTransfers(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/transfers', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
    }

    public function testImportEndpointRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/transfers/import');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testImportCsvRejectsMissingFile(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('POST', '/api/transfers/import', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'multipart/form-data',
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testImportCsvWithValidBelfiusFile(): void
    {
        // Given: A bank account (own account from CSV)
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        BankAccountFactory::createOne([
            'accountNumber' => $normalizedNumber,
            'accountName'   => 'My Account',
            'hash'          => BankAccount::calculateHash('My Account', $normalizedNumber),
            'isInternal'    => true,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        // Create a minimal valid Belfius CSV in memory
        $csvContent = $this->createBelfiusCsvContent();
        $tempFile   = tempnam(sys_get_temp_dir(), 'belfius_test_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra' => [
                    'files' => [
                        'file' => new UploadedFile(
                            $tempFile,
                            'belfius.csv',
                            'text/csv',
                            null,
                            true,
                        ),
                    ],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);

            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $data = json_decode($response->getContent(), true);
            assert(is_array($data));
            $this->assertArrayHasKey('imported', $data);
            $this->assertArrayHasKey('skipped', $data);
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }

    public function testImportIsDeduplicated(): void
    {
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        BankAccountFactory::createOne([
            'accountNumber' => $normalizedNumber,
            'accountName'   => 'My Account',
            'hash'          => BankAccount::calculateHash('My Account', $normalizedNumber),
            'isInternal'    => true,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $csvContent = $this->createBelfiusCsvContent();
        $tempFile   = tempnam(sys_get_temp_dir(), 'belfius_test_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        try {
            // First import
            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra'   => [
                    'files' => [
                        'file' => new UploadedFile(
                            $tempFile,
                            'belfius.csv',
                            'text/csv',
                            null,
                            true,
                        ),
                    ],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
            $response = $client->getResponse();
            assert($response instanceof Response);
            $firstData = json_decode($response->getContent(), true);
            assert(is_array($firstData));

            // Second import of the same file
            $tempFile2 = tempnam(sys_get_temp_dir(), 'belfius_test2_') . '.csv';
            file_put_contents($tempFile2, $csvContent);

            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra'   => [
                    'files' => [
                        'file' => new UploadedFile(
                            $tempFile2,
                            'belfius2.csv',
                            'text/csv',
                            null,
                            true,
                        ),
                    ],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);

            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $secondData = json_decode($response->getContent(), true);
            assert(is_array($secondData));

            // On second import everything should be skipped
            $this->assertSame(0, $secondData['imported']);
            $this->assertSame($firstData['imported'], $secondData['skipped']);

            if (file_exists($tempFile2)) {
                unlink($tempFile2);
            }
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }

    private function createBelfiusCsvContent(): string
    {
        // Real Belfius export format: metadata rows first, then a blank-ish separator,
        // then the column header row, then data rows.
        $header = 'Rekening;Boekingsdatum;Rekeninguittrekselnummer;Transactienummer;'
            . 'Rekening tegenpartij;Naam tegenpartij bevat;Straat en nummer;'
            . 'Postcode en plaats;Transactie;Valutadatum;Bedrag;Devies;BIC;Landcode;Mededelingen';

        $dataRow = 'BE68539007547034;01/01/2024;00001;001;BE76096123456789;Shop ABC;'
            . 'Main Street 1;1000 Brussels;BETALING;01/01/2024;-50,00;EUR;GKCCBEBB;BE;Groceries purchase';

        $lines = [
            'Boekingsdatum vanaf;01/01/2024',
            'Boekingsdatum tot en met;31/12/2024',
            'Bedrag vanaf;',
            'Bedrag tot en met;',
            'Rekeninguittrekselnummer vanaf;',
            'Rekeninguittrekselnummer tot en met;',
            'Mededeling;',
            'Naam tegenpartij bevat;',
            'Rekening tegenpartij;',
            'Laatste saldo;1.000,00 EUR',
            'Datum/uur van het laatste saldo;31/12/2024 23:59:59',
            ';',
            $header,
            $dataRow,
        ];

        return implode("\r\n", $lines) . "\r\n";
    }

    /** T025: Test that importing a transfer updates the own account's total balance. */
    public function testImportUpdatesBankAccountBalance(): void
    {
        // Pre-create own account so it exists before import
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        assert($normalizedNumber !== null);
        BankAccountFactory::createOne([
            'accountNumber' => $normalizedNumber,
            'accountName'   => 'My Account',
            'hash'          => BankAccount::calculateHash('My Account', $normalizedNumber),
            'isInternal'    => true,
            'totalBalance'  => '0.00',
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        // Import a transfer of -50 (outgoing from own account)
        $csvContent = $this->createBelfiusCsvContent();
        $tempFile   = tempnam(sys_get_temp_dir(), 'belfius_balance_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra' => [
                    'files'      => ['file' => new UploadedFile($tempFile, 'belfius.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);

            $this->assertResponseIsSuccessful();

            // Check that bank accounts collection reflects updated balance
            $client->request('GET', '/api/bank-accounts', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
            ]);

            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $accounts = json_decode($response->getContent(), true);
            assert(is_array($accounts));

            // Own account should have balance -50.00 (sent 50)
            $this->assertNotEmpty($accounts);
            $balances = array_column($accounts, 'totalBalance');
            $this->assertContains(
                '-50.00',
                $balances,
                'Own account (from) should have balance -50.00 after outgoing transfer',
            );
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }

    /** T025: Test that reversed internal transfers are filtered out (neither is persisted). */
    public function testReversedInternalTransfersAreFiltered(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        // First import: account A sends -50 to account B (A's own-account CSV)
        // Uses transactionId='001-A'
        $csvContentA = $this->createInternalTransferCsvContent(
            'BE68539007547034',
            'BE71096400007055',
            '-50,00',
            '01/01/2024',
            '001-A',
        );
        $tempFileA   = tempnam(sys_get_temp_dir(), 'belfius_intA_') . '.csv';
        file_put_contents($tempFileA, $csvContentA);

        // Second import: account B sends -50 to account A (B's own-account CSV)
        // Uses transactionId='001-B' (different ID to avoid transactionId dedup before the filter runs)
        $csvContentB = $this->createInternalTransferCsvContent(
            'BE71096400007055',
            'BE68539007547034',
            '-50,00',
            '01/01/2024',
            '001-B',
        );
        $tempFileB   = tempnam(sys_get_temp_dir(), 'belfius_intB_') . '.csv';
        file_put_contents($tempFileB, $csvContentB);

        try {
            // Import first CSV (A → B)
            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra' => [
                    'files'      => ['file' => new UploadedFile($tempFileA, 'a.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $firstData = json_decode($response->getContent(), true);
            assert(is_array($firstData));
            $this->assertSame(1, $firstData['imported']);

            // Import second CSV (B → A, reversed)
            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra' => [
                    'files'      => ['file' => new UploadedFile($tempFileB, 'b.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $secondData = json_decode($response->getContent(), true);
            assert(is_array($secondData));
            // The reversed internal transfer should be skipped (filtered and original deleted)
            $this->assertSame(0, $secondData['imported']);

            // Verify no transfers remain (both cancelled out)
            $client->request('GET', '/api/transfers', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
            ]);
            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $transfers = json_decode($response->getContent(), true);
            assert(is_array($transfers));
            $this->assertEmpty($transfers, 'Both reversed internal transfers should be removed');
        } finally {
            if (file_exists($tempFileA)) {
                unlink($tempFileA);
            }

            if (file_exists($tempFileB)) {
                unlink($tempFileB);
            }
        }
    }

    private function createInternalTransferCsvContent(
        string $ownAccount,
        string $counterparty,
        string $amount,
        string $date,
        string $transactionId = '001',
    ): string {
        $header = 'Rekening;Boekingsdatum;Rekeninguittrekselnummer;Transactienummer;'
            . 'Rekening tegenpartij;Naam tegenpartij bevat;Straat en nummer;'
            . 'Postcode en plaats;Transactie;Valutadatum;Bedrag;Devies;BIC;Landcode;Mededelingen';

        // Use empty counterparty name so both imports hash the account consistently (null name → same hash)
        $dataRow = $ownAccount . ';' . $date . ';00001;' . $transactionId . ';' . $counterparty . ';;'
            . 'Street 1;1000 Brussels;OVERSCHRIJVING;' . $date . ';' . $amount . ';EUR;GKCCBEBB;BE;Internal transfer';

        $lines = [
            'Boekingsdatum vanaf;01/01/2024',
            'Boekingsdatum tot en met;31/12/2024',
            'Bedrag vanaf;',
            'Bedrag tot en met;',
            'Rekeninguittrekselnummer vanaf;',
            'Rekeninguittrekselnummer tot en met;',
            'Mededeling;',
            'Naam tegenpartij bevat;',
            'Rekening tegenpartij;',
            'Laatste saldo;1.000,00 EUR',
            'Datum/uur van het laatste saldo;31/12/2024 23:59:59',
            ';',
            $header,
            $dataRow,
        ];

        return implode("\r\n", $lines) . "\r\n";
    }
}
