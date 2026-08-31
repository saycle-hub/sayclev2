<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Fail-closed: a missing role must never fall through to admin.
        // (The old default-to-admin here defeated the middleware for any
        // user whose role column was null.)
        $role = $request->user()?->role;
        abort_unless($role !== null && in_array($role, $roles, true), 403);

        return $next($request);
    }
}
