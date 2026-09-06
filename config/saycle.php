<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Warehouse depot
    |--------------------------------------------------------------------------
    |
    | Origin point of every pickup route. Override per deployment via env.
    |
    */

    'depot' => [
        'lat' => env('SAYCLE_DEPOT_LAT', -7.8285),
        'lng' => env('SAYCLE_DEPOT_LNG', 110.3780),
    ],

    'pickup_gps_tolerance_m' => env('SAYCLE_PICKUP_GPS_TOLERANCE_M', 50),

    /*
    |--------------------------------------------------------------------------
    | OSRM routing service
    |--------------------------------------------------------------------------
    |
    | Public demo server by default; point OSRM_BASE_URL at a self-hosted
    | instance for production traffic.
    |
    */

    'osrm' => [
        'base_url' => env('OSRM_BASE_URL', 'https://router.project-osrm.org'),
        'timeout' => (int) env('OSRM_TIMEOUT', 4),
    ],

];
