# Saycle

Laravel + React starter application.

## Stack

- Laravel 12
- React + TypeScript
- Inertia.js
- Tailwind CSS
- shadcn/ui
- SQLite

## Requirements

- PHP 8.2+
- Composer 2+
- Node.js 20+

## Setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
npm install
```

## Development

```bash
composer run dev
```

Open http://localhost:8000.

## Checks

```bash
npm run build
php artisan test
```

## Git

`.env`, `vendor`, `node_modules`, runtime files, and generated frontend builds stay untracked.
