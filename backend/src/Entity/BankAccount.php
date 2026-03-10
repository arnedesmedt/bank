<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BankAccountRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: BankAccountRepository::class)]
#[ORM\Table(name: 'bank_accounts')]
class BankAccount
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid|null $uuid = null; // @phpstan-ignore property.unusedType (Doctrine assigns the Uuid value)

    #[ORM\Column(type: 'string', length: 255)]
    private string $accountName;

    #[ORM\Column(type: 'string', length: 255, unique: true)]
    private string $accountNumber;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(referencedColumnName: 'uuid', nullable: false)]
    private User $user;

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

    public function getAccountName(): string
    {
        return $this->accountName;
    }

    public function setAccountName(string $accountName): self
    {
        $this->accountName = $accountName;

        return $this;
    }

    public function getAccountNumber(): string
    {
        return $this->accountNumber;
    }

    public function setAccountNumber(string $accountNumber): self
    {
        $this->accountNumber = $accountNumber;

        return $this;
    }

    public function getOwner(): User
    {
        return $this->user;
    }

    public function setOwner(User $user): self
    {
        $this->user = $user;

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
}
