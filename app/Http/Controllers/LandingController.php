<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\SupplierReport;
use App\Models\WarehouseMutation;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    private const DESTINATION_BY_GRADE = [
        'Layak' => 'Pakan ternak',
        'Kurang Layak' => 'Pakan maggot',
        'Tidak Layak' => 'Kompos',
    ];

    public function __invoke(): Response
    {
        $destinations = WarehouseMutation::query()
            ->where('type', 'receipt')
            ->get(['intended_use', 'grade', 'kg'])
            ->groupBy(fn (WarehouseMutation $mutation) => $this->destinationLabel($mutation))
            ->map(fn (Collection $mutations, string $label) => [
                'label' => $label,
                'kg' => round((float) $mutations->sum('kg'), 2),
            ])
            ->values();

        return Inertia::render('welcome', [
            'impactStats' => [
                'processedKg' => round((float) WarehouseMutation::query()->where('type', 'receipt')->sum('kg'), 2),
                'partnerCount' => Partner::count(),
                'reportCount' => SupplierReport::count(),
                'destinations' => $destinations,
            ],
        ]);
    }

    private function destinationLabel(WarehouseMutation $mutation): string
    {
        $intendedUse = trim((string) $mutation->intended_use);

        return $intendedUse !== ''
            ? Str::of($intendedUse)->replace('_', ' ')->squish()->ucfirst()->toString()
            : (self::DESTINATION_BY_GRADE[$mutation->grade] ?? 'Pengolahan organik');
    }
}
