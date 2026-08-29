<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $role = $request->user()?->role ?? 'admin';
        abort_unless($request->user() && in_array($role, $roles, true), 403);
        return $next($request);
    }
}
