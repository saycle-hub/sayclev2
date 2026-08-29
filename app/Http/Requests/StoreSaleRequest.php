<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'contact' => ['required', 'string', 'max:255'],
            'estimate_kg' => ['required', 'numeric', 'min:0.01', 'max:100000'],
            'location_consent' => ['required', 'boolean'],
            'manual_address' => ['nullable', 'string', 'max:1000', 'required_without_all:latitude,longitude'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude', 'prohibited_unless:location_consent,1'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude', 'prohibited_unless:location_consent,1'],
            'photo' => ['required', 'file', 'image', 'max:10240'],
        ];
    }
}
