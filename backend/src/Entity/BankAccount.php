<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BankAccountRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

use function assert;
use function bcadd;
use function hash;
use function is_string;
use function preg_match;
use function preg_replace;
use function strtolower;
use function strtoupper;
use function substr;
use function trim;

#[ORM\Entity(repositoryClass: BankAccountRepository::class)]
#[ORM\Table(name: 'bank_accounts')]
class BankAccount
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid|null $uuid = null; // @phpstan-ignore property.unusedType (Doctrine assigns the Uuid value)

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private string|null $accountName = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private string|null $accountNumber = null;

    #[ORM\Column(type: 'string', length: 64, unique: true)]
    private string $hash;

    #[ORM\Column(type: 'boolean')]
    private bool $isInternal = false;

    /** @var numeric-string */
    #[ORM\Column(type: 'decimal', precision: 15, scale: 2)]
    private string $totalBalance = '0.00';

    /** @var Collection<int, Label> */
    #[ORM\ManyToMany(targetEntity: Label::class, mappedBy: 'linkedBankAccounts')]
    private Collection $linkedLabels;

    /** @var Collection<int, Transfer> */
    #[ORM\OneToMany(targetEntity: Transfer::class, mappedBy: 'fromAccount')]
    private Collection $outgoingTransfers;

    /** @var Collection<int, Transfer> */
    #[ORM\OneToMany(targetEntity: Transfer::class, mappedBy: 'toAccount')]
    private Collection $incomingTransfers;

    public function __construct()
    {
        $this->linkedLabels      = new ArrayCollection();
        $this->outgoingTransfers = new ArrayCollection();
        $this->incomingTransfers = new ArrayCollection();
    }

    public function getId(): Uuid|null
    {
        return $this->uuid;
    }

    public function getAccountName(): string|null
    {
        return $this->accountName;
    }

    public function setAccountName(string|null $accountName): self
    {
        // T010: Strict property handling — store null if missing/empty
        $trimmed           = $accountName !== null ? trim($accountName) : null;
        $this->accountName = $trimmed !== null && $trimmed !== '' ? $trimmed : null;

        return $this;
    }

    public function getAccountNumber(): string|null
    {
        return $this->accountNumber;
    }

    public function setAccountNumber(string|null $accountNumber): self
    {
        // T011: Normalize to 'BEXX XXXX XXXX XXXX' format; null if invalid
        $this->accountNumber = self::normalizeAccountNumber($accountNumber);

        return $this;
    }

    public function getHash(): string
    {
        return $this->hash;
    }

    public function setHash(string $hash): self
    {
        $this->hash = $hash;

        return $this;
    }

    public function isInternal(): bool
    {
        return $this->isInternal;
    }

    public function setIsInternal(bool $isInternal): self
    {
        $this->isInternal = $isInternal;

        return $this;
    }

    /** @return numeric-string */
    public function getTotalBalance(): string
    {
        return $this->totalBalance;
    }

    /** @param numeric-string $totalBalance */
    public function setTotalBalance(string $totalBalance): self
    {
        $this->totalBalance = $totalBalance;

        return $this;
    }

    /**
     * @param numeric-string $delta
     * T020: Apply a signed delta to the total balance using arbitrary-precision arithmetic.
     * Positive delta increases balance; negative delta decreases balance.
     */
    public function adjustBalance(string $delta): self
    {
        $this->totalBalance = bcadd($this->totalBalance, $delta, 2);

        return $this;
    }

    /** @return Collection<int, Label> */
    public function getLinkedLabels(): Collection
    {
        return $this->linkedLabels;
    }

    public function addLinkedLabel(Label $label): self
    {
        if (! $this->linkedLabels->contains($label)) {
            $this->linkedLabels->add($label);
            $label->addLinkedBankAccount($this);
        }

        return $this;
    }

    public function removeLinkedLabel(Label $label): self
    {
        if ($this->linkedLabels->removeElement($label)) {
            $label->removeLinkedBankAccount($this);
        }

        return $this;
    }

    /** @return Collection<int, Transfer> */
    public function getOutgoingTransfers(): Collection
    {
        return $this->outgoingTransfers;
    }

    /** @return Collection<int, Transfer> */
    public function getIncomingTransfers(): Collection
    {
        return $this->incomingTransfers;
    }

    /**
     * T009: Calculate a stable SHA-256 hash from account name and number.
     * Used for uniqueness checks on creation/import only.
     * Concatenates normalized number and name (lowercased, pipe-separated) for reliable hashing.
     */
    public static function calculateHash(string|null $accountName, string|null $accountNumber): string
    {
        $normalizedNumber = self::normalizeAccountNumber($accountNumber) ?? '';
        $cleanName        = $accountName !== null ? trim($accountName) : '';
        $raw              = strtolower($normalizedNumber . '|' . $cleanName);

        return hash('sha256', $raw);
    }

    /**
     * T011: Normalize account number to 'BEXX XXXX XXXX XXXX' format.
     * Returns null if the number is missing or cannot be normalized.
     */
    public static function normalizeAccountNumber(string|null $accountNumber): string|null
    {
        if ($accountNumber === null) {
            return null;
        }

        $stripped = preg_replace('/\s+/', '', $accountNumber);
        assert(is_string($stripped));

        // Validate: must be BE + 14 digits (total 16 chars)
        if (preg_match('/^BE\d{14}$/i', $stripped) !== 1) {
            return null;
        }

        $upper = strtoupper($stripped);

        // Format as 'BEXX XXXX XXXX XXXX'
        return substr($upper, 0, 4) . ' '
            . substr($upper, 4, 4) . ' '
            . substr($upper, 8, 4) . ' '
            . substr($upper, 12, 4);
    }

    /**
     * T012: Mark this account as internal (own account).
     * The first imported/created account is always internal.
     */
    public function markAsInternal(): self
    {
        $this->isInternal = true;

        return $this;
    }
}
