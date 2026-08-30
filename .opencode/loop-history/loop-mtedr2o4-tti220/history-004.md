# Phase 4 — Allocation Engine: SHIP

## Attempt history

- Attempt 1 (fixer fix-9/fix-10): kedua sesi mati tanpa output — tidak ada partial work di disk.
- Attempt 2 (orchestrator inline): implementasi penuh — migration, model, engine service, controller, routes, frontend index/show, AllocationBar, sidebar nav, 9 feature test.
- Critique round 1: fix (3 P1: bar aggregate salah, status recompute invent state, kompos cadangan cuma komentar; 2 P2).
- Fix round 1: aggregate ideal/max dikirim controller; status honest (Tanpa kontrak/Belum dijalankan); redirectToFallback; approval badge hanya overcapacity; orange focus tombol approve/reject.
- Critique round 2: fix (P1 fallback math tidak pernah menyalurkan ke kompos karena share tidak di-cap + rounding dust; P2 comment kontradiktif + docblock surplusPrice).
- Fix round 2: pool surplus di-cap min(surplus, totalHeadroom); unhandled = surplus − totalHeadroom → fallback approved rows via array_merge; flagging di allocateProportional dihapus (callers guarantee capacity); test fallback baru; comment/docblock jujur.
- Root-cause bugs ditemukan saat fixing: PHP union `+` operator mempertahankan 'pending' menimpa override 'approved' (diperbaiki array_merge); flagging ideal > headroom salah semantik (dihapus).
- Critique round 3: **ship**.

## Ship gate

1. `php artisan test` — PASS: 65 tests, 399 assertions (11 AllocationTest).
2. `npm run build` — PASS.
3. `git diff --check` — clean.
4. `detect.mjs` — clean.
5. `impeccable critique` — ship (round 3).
6. Responsive + a11y — verified by critique (min-h-11, orange focus, Radix Dialog, /70 contrast).

## Notes

- Fallback drop saat tidak ada kontrak kompos aktif masih silent — surface di Phase 8 statistics.
- Tipe `surplus` jadi dead vocabulary di TYPES/show label — trim saat next touch.
- Commit: feat(allocation): add weekly allocation engine.
