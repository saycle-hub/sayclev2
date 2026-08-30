<?php

namespace App\Domain;

final class Grade
{
    public const FIT = 'Layak';
    public const LESS_FIT = 'Kurang Layak';
    public const NOT_FIT = 'Tidak Layak';

    public const ALL = [self::FIT, self::LESS_FIT, self::NOT_FIT];

    public const INTENDED_USES = [
        self::FIT => 'pakan_ternak',
        self::LESS_FIT => 'maggot',
        self::NOT_FIT => 'kompos',
    ];
}
