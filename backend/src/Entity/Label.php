<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\LabelRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

use function array_filter;
use function array_values;
use function in_array;

#[ORM\Entity(repositoryClass: LabelRepository::class)]
#[ORM\Table(name: 'labels')]
class Label
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid|null $uuid = null; // @phpstan-ignore property.unusedType (Doctrine assigns the Uuid value)

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'childLabels')]
    #[ORM\JoinColumn(referencedColumnName: 'uuid', nullable: true, onDelete: 'SET NULL')]
    private Label|null $parentLabel = null;

    /** @var Collection<int, Label> */
    #[ORM\OneToMany(targetEntity: self::class, mappedBy: 'parentLabel')]
    private Collection $childLabels;

    /** @var Collection<int, BankAccount> */
    #[ORM\ManyToMany(targetEntity: BankAccount::class, inversedBy: 'linkedLabels')]
    #[ORM\JoinTable(name: 'label_bank_account')]
    #[ORM\JoinColumn(name: 'label_uuid', referencedColumnName: 'uuid')]
    #[ORM\InverseJoinColumn(name: 'bank_account_uuid', referencedColumnName: 'uuid')]
    private Collection $linkedBankAccounts;

    /** @var array<string> */
    #[ORM\Column(type: 'json')]
    private array $linkedRegexes = [];

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private string|null $maxValue = null;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, nullable: true)]
    private string|null $maxPercentage = null;

    /** @var Collection<int, LabelTransferLink> */
    #[ORM\OneToMany(
        targetEntity: LabelTransferLink::class,
        mappedBy: 'label',
        cascade: ['persist', 'remove'],
        orphanRemoval: true,
    )]
    private Collection $labelTransferLinks;

    public function __construct()
    {
        $this->childLabels        = new ArrayCollection();
        $this->linkedBankAccounts = new ArrayCollection();
        $this->labelTransferLinks = new ArrayCollection();
    }

    public function getId(): Uuid|null
    {
        return $this->uuid;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getParentLabel(): Label|null
    {
        return $this->parentLabel;
    }

    public function setParentLabel(Label|null $parentLabel): self
    {
        $this->parentLabel = $parentLabel;

        return $this;
    }

    /** @return Collection<int, Label> */
    public function getChildLabels(): Collection
    {
        return $this->childLabels;
    }

    /** @return Collection<int, BankAccount> */
    public function getLinkedBankAccounts(): Collection
    {
        return $this->linkedBankAccounts;
    }

    public function addLinkedBankAccount(BankAccount $bankAccount): self
    {
        if (! $this->linkedBankAccounts->contains($bankAccount)) {
            $this->linkedBankAccounts->add($bankAccount);
        }

        return $this;
    }

    public function removeLinkedBankAccount(BankAccount $bankAccount): self
    {
        $this->linkedBankAccounts->removeElement($bankAccount);

        return $this;
    }

    /** @return array<string> */
    public function getLinkedRegexes(): array
    {
        return $this->linkedRegexes;
    }

    /** @param array<string> $linkedRegexes */
    public function setLinkedRegexes(array $linkedRegexes): self
    {
        $this->linkedRegexes = $linkedRegexes;

        return $this;
    }

    public function addLinkedRegex(string $regex): self
    {
        if (! in_array($regex, $this->linkedRegexes, true)) {
            $this->linkedRegexes[] = $regex;
        }

        return $this;
    }

    public function removeLinkedRegex(string $regex): self
    {
        $this->linkedRegexes = array_values(
            array_filter(
                $this->linkedRegexes,
                static fn (string $r): bool => $r !== $regex,
            ),
        );

        return $this;
    }

    public function getMaxValue(): string|null
    {
        return $this->maxValue;
    }

    public function setMaxValue(string|null $maxValue): self
    {
        $this->maxValue = $maxValue;

        return $this;
    }

    public function getMaxPercentage(): string|null
    {
        return $this->maxPercentage;
    }

    public function setMaxPercentage(string|null $maxPercentage): self
    {
        $this->maxPercentage = $maxPercentage;

        return $this;
    }

    /** @return Collection<int, LabelTransferLink> */
    public function getLabelTransferLinks(): Collection
    {
        return $this->labelTransferLinks;
    }
}
