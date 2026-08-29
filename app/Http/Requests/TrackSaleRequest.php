<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrackSaleRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return ['public_id' => ['required', 'string', 'size:32'], 'pin' => ['required', 'digits:6']];
    }
}
