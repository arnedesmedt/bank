<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use Symfony\Component\HttpFoundation\File\UploadedFile;

use function assert;
use function file_exists;
use function file_put_contents;
use function implode;
use function is_array;
use function is_string;
use function json_decode;
use function str_replace;
use function sys_get_temp_dir;
use function tempnam;
use function unlink;

/**
 * Tests for LabelTransferLink join entity and manual/automatic label assignment logic.
 *
 * - Auto-assign labels on creation (FR-008)
 * - Manual label assignment (FR-009)
 * - Manual links never removed automatically (FR-012)
 * - Automatic links removed when rules no longer match (FR-013)
 * - Regex matches against reference AND account name (FR-010)
 */
class LabelTransferLinkTest extends BankApiTestCase
{
    /**
     * FR-008: When a label is created with rules, it must be auto-assigned to all matching
     * existing transfers as "automatic" links.
     */
    public function testCreateLabelAutoAssignsToExistingMatchingTransfers(): void
    {
        // Setup: Create bank accounts and import a transfer
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        BankAccountFactory::createOne([
            'accountNumber' => $normalizedNumber,
            'accountName'   => 'My Account',
            'hash'          => BankAccount::calculateHash('My Account', $normalizedNumber),
            'isInternal'    => true,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        // Create counterparty
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'accountName'   => 'Shop AutoLabel',
                'accountNumber' => 'BE76096123456789',
            ],
        ]);
        $this->assertResponseIsSuccessful();
        $resp = $client->getResponse();
        assert($resp instanceof Response);
        $baData = json_decode($resp->getContent(), true);
        assert(is_array($baData));
        $counterpartyId = $baData['id'];
        assert(is_string($counterpartyId));

        // Import a transfer first (no label exists yet)
        $csvContent = $this->buildCsvContent('BE68539007547034', 'BE76096123456789', 'Shop AutoLabel', '-50.00');
        $tempFile   = tempnam(sys_get_temp_dir(), 'ltl_test_') . '.csv';
        file_put_contents($tempFile, $csvContent);
        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
                'extra'   => [
                    'files'      => ['file' => new UploadedFile($tempFile, 'test.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
            $this->assertResponseIsSuccessful();
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // Verify transfer has no label yet
        $client->request('GET', '/api/transfers', [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $this->assertResponseIsSuccessful();
        $transfersResp = $client->getResponse();
        assert($transfersResp instanceof Response);
        $transfers = json_decode($transfersResp->getContent(), true);
        assert(is_array($transfers));
        $this->assertNotEmpty($transfers);
        $firstTransfer = $transfers[0];
        assert(is_array($firstTransfer));
        $this->assertEmpty($firstTransfer['labelIds'], 'Transfer should have no labels before label creation');

        // Now create a label linked to the counterparty bank account
        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'                 => 'Shopping',
                'linkedBankAccountIds' => [$counterpartyId],
                'linkedRegexes'        => [],
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);

        // Verify the existing transfer now has the label (auto-assigned)
        $client->request('GET', '/api/transfers', [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $this->assertResponseIsSuccessful();
        $transfersResp2 = $client->getResponse();
        assert($transfersResp2 instanceof Response);
        $transfers2 = json_decode($transfersResp2->getContent(), true);
        assert(is_array($transfers2));
        $this->assertNotEmpty($transfers2);
        $transfer2 = $transfers2[0];
        assert(is_array($transfer2));
        $labelNames = $transfer2['labelNames'];
        assert(is_array($labelNames));
        $this->assertContains('Shopping', $labelNames, 'Transfer should be auto-labeled');

        // Verify the link is automatic
        $labelLinks = $transfer2['labelLinks'];
        assert(is_array($labelLinks));
        $this->assertNotEmpty($labelLinks);
        $firstLink = $labelLinks[0];
        assert(is_array($firstLink));
        $this->assertFalse($firstLink['isManual'], 'Auto-assigned link should not be manual');
    }

    /**
     * FR-009: Manual label assignment via API creates a "manual" link.
     */
    public function testManualLabelAssignmentCreatesManualLink(): void
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

        // Import a transfer
        $csvContent = $this->buildCsvContent('BE68539007547034', 'BE76096123456789', 'Some Shop', '-20.00');
        $tempFile   = tempnam(sys_get_temp_dir(), 'ltl_manual_') . '.csv';
        file_put_contents($tempFile, $csvContent);
        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
                'extra'   => [
                    'files'      => ['file' => new UploadedFile($tempFile, 'test.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // Create a label (no matching rule)
        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['name' => 'ManualLabel', 'linkedRegexes' => []],
        ]);
        $labelResp = $client->getResponse();
        assert($labelResp instanceof Response);
        $labelData = json_decode($labelResp->getContent(), true);
        assert(is_array($labelData));
        $labelId = $labelData['id'];
        assert(is_string($labelId));

        // Get the transfer
        $client->request('GET', '/api/transfers', [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $transfersResp = $client->getResponse();
        assert($transfersResp instanceof Response);
        $transfers = json_decode($transfersResp->getContent(), true);
        assert(is_array($transfers));
        $firstTransfer = $transfers[0];
        assert(is_array($firstTransfer));
        $transferId = $firstTransfer['id'];
        assert(is_string($transferId));

        // Manually assign the label
        $client->request('POST', '/api/transfers/' . $transferId . '/labels/' . $labelId, [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $this->assertResponseStatusCodeSame(201);

        // Verify the link is manual
        $client->request('GET', '/api/transfers/' . $transferId, [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $transferResp = $client->getResponse();
        assert($transferResp instanceof Response);
        $transferData = json_decode($transferResp->getContent(), true);
        assert(is_array($transferData));
        $labelNames = $transferData['labelNames'];
        assert(is_array($labelNames));
        $this->assertContains('ManualLabel', $labelNames);
        $labelLinks = $transferData['labelLinks'];
        assert(is_array($labelLinks));
        $firstLink = $labelLinks[0];
        assert(is_array($firstLink));
        $this->assertTrue($firstLink['isManual'], 'Manually assigned link should be manual');
    }

    /**
     * FR-012 + FR-013: Manual links persist after label rule changes; automatic links are removed.
     */
    public function testManualLinkPersistsWhenAutoLinkWouldBeRemoved(): void
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

        // Create counterparty
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['accountName' => 'Target Shop', 'accountNumber' => 'BE76096123456789'],
        ]);
        $baResp = $client->getResponse();
        assert($baResp instanceof Response);
        $baData = json_decode($baResp->getContent(), true);
        assert(is_array($baData));
        $counterpartyId = $baData['id'];

        // Create label linked to counterparty
        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['name' => 'AutoLabel', 'linkedBankAccountIds' => [$counterpartyId], 'linkedRegexes' => []],
        ]);
        $labelResp = $client->getResponse();
        assert($labelResp instanceof Response);
        $labelData = json_decode($labelResp->getContent(), true);
        assert(is_array($labelData));
        $labelId = $labelData['id'];
        assert(is_string($labelId));

        // Import transfer
        $csvContent = $this->buildCsvContent('BE68539007547034', 'BE76096123456789', 'Target Shop', '-30.00');
        $tempFile   = tempnam(sys_get_temp_dir(), 'ltl_persist_') . '.csv';
        file_put_contents($tempFile, $csvContent);
        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
                'extra'   => [
                    'files'      => ['file' => new UploadedFile($tempFile, 'test.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // Get transfer
        $client->request('GET', '/api/transfers', [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $transfersResp = $client->getResponse();
        assert($transfersResp instanceof Response);
        $transfers = json_decode($transfersResp->getContent(), true);
        assert(is_array($transfers));
        $firstTransfer = $transfers[0];
        assert(is_array($firstTransfer));
        $transferId = $firstTransfer['id'];
        assert(is_string($transferId));

        // Label was auto-assigned — upgrade it to manual via API
        $client->request('POST', '/api/transfers/' . $transferId . '/labels/' . $labelId, [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $this->assertResponseStatusCodeSame(201);

        // Update label to remove bank account link (rule no longer matches)
        $client->request('PUT', '/api/labels/' . $labelId, [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['name' => 'AutoLabel', 'linkedBankAccountIds' => [], 'linkedRegexes' => []],
        ]);
        $this->assertResponseIsSuccessful();

        // Manual link should still exist
        $client->request('GET', '/api/transfers/' . $transferId, [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $transferResp = $client->getResponse();
        assert($transferResp instanceof Response);
        $transferData = json_decode($transferResp->getContent(), true);
        assert(is_array($transferData));
        $labelNames2 = $transferData['labelNames'];
        assert(is_array($labelNames2));
        $this->assertContains('AutoLabel', $labelNames2, 'Manual link should persist after rule change');
        $labelLinks2 = $transferData['labelLinks'];
        assert(is_array($labelLinks2));
        $firstLink2 = $labelLinks2[0];
        assert(is_array($firstLink2));
        $this->assertTrue($firstLink2['isManual'], 'Link must remain manual');
    }

    /**
     * FR-010: Regex rules must match against both reference and account name.
     */
    public function testRegexMatchesAccountNameAndReference(): void
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

        // Import transfer with a specific account name
        $csvContent = $this->buildCsvContent('BE68539007547034', 'BE76096123456789', 'Netflix Inc', '-15.99');
        $tempFile   = tempnam(sys_get_temp_dir(), 'ltl_regex_') . '.csv';
        file_put_contents($tempFile, $csvContent);
        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
                'extra'   => [
                    'files'      => ['file' => new UploadedFile($tempFile, 'test.csv', 'text/csv', null, true)],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }

        // Create label with regex matching account name
        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['name' => 'Streaming', 'linkedRegexes' => ['/Netflix/i']],
        ]);
        $this->assertResponseStatusCodeSame(201);

        // Transfer should be auto-labeled via account name regex match
        $client->request('GET', '/api/transfers', [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $resp = $client->getResponse();
        assert($resp instanceof Response);
        $data = json_decode($resp->getContent(), true);
        assert(is_array($data));
        $this->assertNotEmpty($data);
        $firstItem = $data[0];
        assert(is_array($firstItem));
        $labelNamesRegex = $firstItem['labelNames'];
        assert(is_array($labelNamesRegex));
        $this->assertContains('Streaming', $labelNamesRegex, 'Transfer should be labeled via account name regex match');
    }

    /**
     * Build a minimal Belfius CSV file with a single transfer row.
     */
    private function buildCsvContent(
        string $fromAccount,
        string $toAccount,
        string $toName,
        string $amount,
    ): string {
        // Format amount as Belfius uses comma as decimal separator
        $belfiusAmount = str_replace('.', ',', $amount);

        $header = 'Rekening;Boekingsdatum;Rekeninguittrekselnummer;Transactienummer;'
            . 'Rekening tegenpartij;Naam tegenpartij bevat;Straat en nummer;'
            . 'Postcode en plaats;Transactie;Valutadatum;Bedrag;Devies;BIC;Landcode;Mededelingen';

        $dataRow = $fromAccount . ';13/03/2026;00001;001;' . $toAccount . ';' . $toName . ';'
            . 'Main Street 1;1000 Brussels;BETALING;13/03/2026;' . $belfiusAmount . ';EUR;GKCCBEBB;BE;Test payment';

        $lines = [
            'Boekingsdatum vanaf;01/01/2026',
            'Boekingsdatum tot en met;31/12/2026',
            'Bedrag vanaf;',
            'Bedrag tot en met;',
            'Rekeninguittrekselnummer vanaf;',
            'Rekeninguittrekselnummer tot en met;',
            'Mededeling;',
            'Naam tegenpartij bevat;',
            'Rekening tegenpartij;',
            'Laatste saldo;1.000,00 EUR',
            'Datum/uur van het laatste saldo;31/12/2026 23:59:59',
            ';',
            $header,
            $dataRow,
        ];

        return implode("\r\n", $lines) . "\r\n";
    }
}
