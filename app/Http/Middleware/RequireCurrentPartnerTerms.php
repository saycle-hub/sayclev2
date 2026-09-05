<?php
namespace App\Http\Middleware;
use App\Models\Partner;
use Closure;
use Illuminate\Http\Request;
class RequireCurrentPartnerTerms {
    public function handle(Request $request, Closure $next) {
        $partner = Partner::where('user_id', $request->user()->id)->first();
        abort_unless($partner, 403);
        if ($partner->overcapacity_terms_version !== Partner::OVERCAPACITY_TERMS_VERSION || ! $partner->overcapacity_terms_accepted_at) {
            return to_route('partner.terms');
        }
        return $next($request);
    }
}
