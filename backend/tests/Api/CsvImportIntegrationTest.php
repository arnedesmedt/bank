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
use function json_encode;
use function sprintf;
use function sys_get_temp_dir;
use function tempnam;
use function unlink;

class CsvImportIntegrationTest extends BankApiTestCase
{
    public function testImportAutoLabelsTransfersByBankAccount(): void
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

        // Create counterparty bank account via API so it is visible to the HTTP kernel
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'accountName'   => 'Shop ABC',
                'accountNumber' => 'BE76096123456789',
            ],
        ]);
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $bankAccountData = json_decode($response->getContent(), true);
        assert(is_array($bankAccountData));
        $counterpartyId = $bankAccountData['id'];
        assert(is_string($counterpartyId));

        // Create label linked to the counterparty bank account via API
        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'                 => 'Groceries',
                'linkedBankAccountIds' => [$counterpartyId],
                'linkedRegexes'        => [],
            ],
        ]);
        $this->assertResponseIsSuccessful();

        $csvContent = $this->createBelfiusCsvContent();
        $tempFile   = tempnam(sys_get_temp_dir(), 'belfius_autolabel_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        try {
            $client->request('POST', '/api/transfers/import', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
                'extra'   => [
                    'files'      => [
                        'file' => new UploadedFile($tempFile, 'belfius.csv', 'text/csv', null, true),
                    ],
                    'parameters' => ['bankType' => 'belfius'],
                ],
            ]);

            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $importData = json_decode($response->getContent(), true);
            assert(is_array($importData));
            $this->assertGreaterThan(0, $importData['imported']);

            // Fetch transfers and verify auto-labeling was applied
            $client->request('GET', '/api/transfers', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token,
                    'Accept'        => 'application/json',
                ],
            ]);

            $this->assertResponseIsSuccessful();
            $response = $client->getResponse();
            assert($response instanceof Response);
            $transferData = json_decode($response->getContent(), true);
            assert(is_array($transferData));

            $found            = false;
            $toAccountNumbers = [];

            foreach ($transferData as $transfer) {
                assert(is_array($transfer));
                $toAccountNumbers[] = isset($transfer['toAccountNumber']) && is_string($transfer['toAccountNumber'])
                    ? $transfer['toAccountNumber']
                    : 'N/A';

                if (isset($transfer['toAccountNumber']) && $transfer['toAccountNumber'] === 'BE76 0961 2345 6789') {
                    assert(is_array($transfer['labelIds']));
                    $this->assertNotEmpty(
                        $transfer['labelIds'],
                        sprintf(
                            'Transfer to BE76096123456789 should be auto-labeled. Full transfer: %s',
                            json_encode($transfer),
                        ),
                    );
                    $found = true;
                    break;
                }
            }

            $this->assertTrue($found, sprintf(
                'Expected a transfer to counterparty BE76096123456789. Found toAccountNumbers: %s',
                implode(', ', $toAccountNumbers),
            ));
        } finally {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
        }
    }

    private function createBelfiusCsvContent(): string
    {
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
}
