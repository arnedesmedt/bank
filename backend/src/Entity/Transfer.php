<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TransferRepository;
use DateTimeImmutable;

use function bcsub;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TransferRepository::class)]
#[ORM\Table(name: 'transfers')]
#[ORM\Index(name: 'idx_transaction_id', columns: ['transaction_id'])]
#[ORM\Index(name: 'idx_fingerprint', columns: ['fingerprint'])]
#[ORM\Index(name: 'idx_date', columns: ['date'])]
class Transfer
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid|null $uuid = null; // @phpstan-ignore property.unusedType (Doctrine assigns the Uuid value)

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $date;

    #[ORM\ManyToOne(targetEntity: BankAccount::class, inversedBy: 'outgoingTransfers')]
    #[ORM\JoinColumn(referencedColumnName: 'uuid', nullable: false)]
    private BankAccount $fromAccount;

    #[ORM\ManyToOne(targetEntity: BankAccount::class, inversedBy: 'incomingTransfers')]
    #[ORM\JoinColumn(referencedColumnName: 'uuid', nullable: false)]
    private BankAccount $toAccount;

    /** @var Collection<int, Label> */
    #[ORM\ManyToMany(targetEntity: Label::class, inversedBy: 'transfers')]
    #[ORM\JoinTable(name: 'transfer_label')]
    #[ORM\JoinColumn(name: 'transfer_uuid', referencedColumnName: 'uuid')]
    #[ORM\InverseJoinColumn(name: 'label_uuid', referencedColumnName: 'uuid')]
    private Collection $labels;

    #[ORM\Column(type: 'text')]
    private string $reference;

    #[ORM\Column(type: 'string', length: 255)]
    private string $csvSource;

    #[ORM\Column(type: 'string', length: 255, unique: true, nullable: true)]
    private string|null $transactionId = null;

    #[ORM\Column(type: 'string', length: 255, unique: true)]
    private string $fingerprint;

    #[ORM\Column(type: 'boolean')]
    private bool $isInternal = false;


    public function __construct()
    {
        $this->labels = new ArrayCollection();
    }

    public function getId(): Uuid|null
    {
        return $this->uuid;
    }

    public function getAmount(): string
    {
        return $this->amount;
    }

    public function setAmount(string $amount): self
    {
        $this->amount = $amount;

        return $this;
    }

    public function getDate(): DateTimeImmutable
    {
        return $this->date;
    }

    public function setDate(DateTimeImmutable $date): self
    {
        $this->date = $date;

        return $this;
    }

    public function getFromAccount(): BankAccount
    {
        return $this->fromAccount;
    }

    public function setFromAccount(BankAccount $bankAccount): self
    {
        $this->fromAccount = $bankAccount;

        return $this;
    }

    public function getToAccount(): BankAccount
    {
        return $this->toAccount;
    }

    public function setToAccount(BankAccount $bankAccount): self
    {
        $this->toAccount = $bankAccount;

        return $this;
    }

    /** @return Collection<int, Label> */
    public function getLabels(): Collection
    {
        return $this->labels;
    }

    public function addLabel(Label $label): self
    {
        if (! $this->labels->contains($label)) {
            $this->labels->add($label);
        }

        return $this;
    }

    public function removeLabel(Label $label): self
    {
        $this->labels->removeElement($label);

        return $this;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function setReference(string $reference): self
    {
        $this->reference = $reference;

        return $this;
    }

    public function getCsvSource(): string
    {
        return $this->csvSource;
    }

    public function setCsvSource(string $csvSource): self
    {
        $this->csvSource = $csvSource;

        return $this;
    }

    public function getTransactionId(): string|null
    {
        return $this->transactionId;
    }

    public function setTransactionId(string|null $transactionId): self
    {
        $this->transactionId = $transactionId;

        return $this;
    }

    public function getFingerprint(): string
    {
        return $this->fingerprint;
    }

    public function setFingerprint(string $fingerprint): self
    {
        $this->fingerprint = $fingerprint;

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

    /**
     * T019: Returns the signed balance impact of this transfer for a given bank account.
     * - If account is the fromAccount (sender): returns the amount as-is (add to balance)
     * - If account is the toAccount (receiver): returns the negated amount (subtract from balance)
     * Returns null if the account is not involved in this transfer.
     */
    public function getBalanceImpactFor(BankAccount $account): string|null
    {
        $fromId = $this->fromAccount->getId();
        $toId   = $this->toAccount->getId();
        $accId  = $account->getId();

        if ($fromId !== null && $accId !== null && (string) $fromId === (string) $accId) {
            return $this->amount;
        }

        if ($toId !== null && $accId !== null && (string) $toId === (string) $accId) {
            return bcsub('0', $this->amount, 2);
        }

        return null;
    }
}
