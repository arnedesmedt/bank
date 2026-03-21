<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TransferRepository;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

use function array_map;
use function array_values;
use function bcsub;
use function ltrim;

#[ORM\Entity(repositoryClass: TransferRepository::class)]
#[ORM\Table(name: 'transfers')]
#[ORM\Index(name: 'idx_transaction_id', columns: ['transaction_id'])]
#[ORM\UniqueConstraint(name: 'uniq_fingerprint', columns: ['fingerprint'])]
#[ORM\Index(name: 'idx_date', columns: ['date'])]
class Transfer
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid|null $uuid = null; // @phpstan-ignore property.unusedType (Doctrine assigns the Uuid value)

    /** @var numeric-string */
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

    /** @var Collection<int, LabelTransferLink> */
    #[ORM\OneToMany(
        targetEntity: LabelTransferLink::class,
        mappedBy: 'transfer',
        cascade: ['persist', 'remove'],
        orphanRemoval: true,
    )]
    private Collection $labelTransferLinks;

    #[ORM\Column(type: 'text')]
    private string $reference;

    #[ORM\Column(type: 'string', length: 255)]
    private string $csvSource;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private string|null $transactionId = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $fingerprint;

    #[ORM\Column(type: 'boolean')]
    private bool $isInternal = false;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'childRefunds')]
    #[ORM\JoinColumn(name: 'parent_transfer_uuid', referencedColumnName: 'uuid', nullable: true, onDelete: 'SET NULL')]
    private Transfer|null $parentTransfer = null;

    /** @var Collection<int, Transfer> */
    #[ORM\OneToMany(targetEntity: self::class, mappedBy: 'parentTransfer')]
    private Collection $childRefunds;

    public function __construct()
    {
        $this->labelTransferLinks = new ArrayCollection();
        $this->childRefunds       = new ArrayCollection();
    }

    public function getId(): Uuid|null
    {
        return $this->uuid;
    }

    /** @return numeric-string */
    public function getAmount(): string
    {
        return $this->amount;
    }

    /** @param numeric-string $amount */
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

    /** @return Collection<int, LabelTransferLink> */
    public function getLabelTransferLinks(): Collection
    {
        return $this->labelTransferLinks;
    }

    /**
     * Returns all labels linked to this transfer (via LabelTransferLink).
     * Helper for backward-compatible access.
     *
     * @return array<Label>
     */
    public function getLabels(): array
    {
        return array_values(array_map(
            static fn (LabelTransferLink $labelTransferLink): Label => $labelTransferLink->getLabel(),
            $this->labelTransferLinks->toArray(),
        ));
    }

    public function hasLabel(Label $label): bool
    {
        foreach ($this->labelTransferLinks as $labelTransferLink) {
            if ($labelTransferLink->getLabel() === $label) {
                return true;
            }
        }

        return false;
    }

    public function getLinkForLabel(Label $label): LabelTransferLink|null
    {
        foreach ($this->labelTransferLinks as $labelTransferLink) {
            if ($labelTransferLink->getLabel() === $label) {
                return $labelTransferLink;
            }
        }

        return null;
    }

    public function addLabelLink(LabelTransferLink $labelTransferLink): self
    {
        if (! $this->labelTransferLinks->contains($labelTransferLink)) {
            $this->labelTransferLinks->add($labelTransferLink);
        }

        return $this;
    }

    public function removeLabelLink(LabelTransferLink $labelTransferLink): self
    {
        $this->labelTransferLinks->removeElement($labelTransferLink);

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

    public function getParentTransfer(): Transfer|null
    {
        return $this->parentTransfer;
    }

    public function setParentTransfer(Transfer|null $parentTransfer): self
    {
        $this->parentTransfer = $parentTransfer;

        return $this;
    }

    /** @return Collection<int, Transfer> */
    public function getChildRefunds(): Collection
    {
        return $this->childRefunds;
    }

    public function addChildRefund(Transfer $transfer): self
    {
        if (! $this->childRefunds->contains($transfer)) {
            $this->childRefunds->add($transfer);
            $transfer->setParentTransfer($this);
        }

        return $this;
    }

    public function removeChildRefund(Transfer $transfer): self
    {
        if ($this->childRefunds->removeElement($transfer) && $transfer->getParentTransfer() === $this) {
            $transfer->setParentTransfer(null);
        }

        return $this;
    }

    /**
     * T019: Returns the signed balance impact of this transfer for a given bank account.
     * The fromAccount (sender) always loses |amount| → returns negative value.
     * The toAccount (receiver) always gains |amount| → returns positive value.
     * Returns null if the account is not involved in this transfer.
     */
    public function getBalanceImpactFor(BankAccount $bankAccount): string|null
    {
        $fromId = $this->fromAccount->getId();
        $toId   = $this->toAccount->getId();
        $accId  = $bankAccount->getId();

        $absAmount = ltrim($this->amount, '-');

        if ($fromId instanceof Uuid && $accId instanceof Uuid && (string) $fromId === (string) $accId) {
            return bcsub('0', $absAmount, 2); // sender always loses money
        }

        if ($toId instanceof Uuid && $accId instanceof Uuid && (string) $toId === (string) $accId) {
            return $absAmount; // receiver always gains money
        }

        return null;
    }
}
