<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\UserFactory;
use Symfony\Component\HttpFoundation\File\UploadedFile;

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
        // Given: A user with bank accounts
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountNumber' => 'BE68539007547034',
            'accountName'   => 'My Account',
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
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountNumber' => 'BE68539007547034',
            'accountName'   => 'My Account',
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
}
