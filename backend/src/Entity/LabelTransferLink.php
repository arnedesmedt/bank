<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\LabelTransferLinkRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Join entity for Label ↔ Transfer with a manual/automatic flag.
 *
 * isManual = false → link was created automatically by rule-matching
 * isManual = true  → link was explicitly created by a user or API call
 *
 * Manual links persist regardless of rule changes;
 * automatic links are removed/updated when rules no longer match.
 */
#[ORM\Entity(repositoryClass: LabelTransferLinkRepository::class)]
#[ORM\Table(name: 'label_transfer_link')]
#[ORM\UniqueConstraint(name: 'uq_label_transfer', columns: ['label_uuid', 'transfer_uuid'])]
class LabelTransferLink
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private Uuid|null $uuid = null; // @phpstan-ignore property.unusedType (Doctrine assigns the Uuid value)

    #[ORM\ManyToOne(targetEntity: Label::class, inversedBy: 'labelTransferLinks')]
    #[ORM\JoinColumn(name: 'label_uuid', referencedColumnName: 'uuid', nullable: false, onDelete: 'CASCADE')]
    private Label $label;

    #[ORM\ManyToOne(targetEntity: Transfer::class, inversedBy: 'labelTransferLinks')]
    #[ORM\JoinColumn(name: 'transfer_uuid', referencedColumnName: 'uuid', nullable: false, onDelete: 'CASCADE')]
    private Transfer $transfer;

    /** true = manually assigned by user/API; false = auto-assigned by rules */
    #[ORM\Column(type: 'boolean')]
    private bool $isManual = false;

    public function getId(): Uuid|null
    {
        return $this->uuid;
    }

    public function getLabel(): Label
    {
        return $this->label;
    }

    public function setLabel(Label $label): self
    {
        $this->label = $label;

        return $this;
    }

    public function getTransfer(): Transfer
    {
        return $this->transfer;
    }

    public function setTransfer(Transfer $transfer): self
    {
        $this->transfer = $transfer;

        return $this;
    }

    public function isManual(): bool
    {
        return $this->isManual;
    }

    public function setIsManual(bool $isManual): self
    {
        $this->isManual = $isManual;

        return $this;
    }
}
