<?php

namespace Tests\Unit;

use App\Domain\Grade;
use Tests\TestCase;

class GradeTest extends TestCase
{
    public function test_grade_mapping_is_complete(): void
    {
        $this->assertSame(Grade::ALL, array_keys(Grade::INTENDED_USES));
    }
}
