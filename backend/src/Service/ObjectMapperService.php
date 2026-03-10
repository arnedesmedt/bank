<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\ObjectMapper\ObjectMapperInterface;

/**
 * Service wrapper around Symfony's ObjectMapper for DTO <-> Entity mapping.
 * Uses the #[Map] attributes defined on DTO classes to configure mapping.
 */
class ObjectMapperService
{
    public function __construct(
        private readonly ObjectMapperInterface $objectMapper,
    ) {
    }

    /**
     * Map source object to target class or instance.
     *
     * @param class-string<T>|T $target
     *
     * @return T
     *
     * @template T of object
     */
    public function map(object $source, object|string|null $target = null): object
    {
        // phpcs:ignore SlevomatCodingStandard.Commenting.InlineDocCommentDeclaration.MissingVariable,SlevomatCodingStandard.PHP.RequireExplicitAssertion.RequiredExplicitAssertion
        /** @var T $result */
        $result = $this->objectMapper->map($source, $target);

        return $result;
    }
}
