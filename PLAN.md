# SayCle — Rencana Pemulihan dan MVP Operasional

> Status: draft setelah audit, 30 Agustus 2026.
> Sumber utama: catatan produk pemilik dan tim. Keputusan terbaru pemilik mengalahkan dokumen lama bila bertentangan.

## Tujuan MVP

Membuat alur operasional yang dapat diaudit:

`Pemasok lapor → SaaS merencanakan pickup → kurir timbang dan klasifikasi → stok gudang bertambah → sistem alokasi → kurir kirim ke Mitra → tagihan/pembayaran tercatat → statistik berasal dari transaksi nyata.`

MVP wajib mendukung:

- Pemasok publik: foto bukti, lokasi GPS atau alamat fallback, estimasi kg, pelacakan aman.
- SaaS internal: admin/operator dan kurir/officer.
- Mitra terdaftar: nama, alamat, kapasitas minimum/ideal/maksimum, hari + frekuensi penerimaan, status pengiriman, total tagihan.
- Grade tetap: `Layak → pakan ternak`; `Kurang Layak → maggot`; `Tidak Layak → kompos`.
- Defisit: minimum seluruh Mitra dipenuhi lebih dahulu; setelah itu menuju ideal.
- Surplus: kg di atas ideal sampai maksimum adalah overcapacity; hanya kg ini memakai harga modal.
- Kelebihan di atas maksimum semua Mitra diarahkan sesuai tujuan grade tanpa mengubah grade.
- Mitra menerima dan menyetujui aturan overcapacity saat registrasi atau login pertama. Tidak ada approval ulang per pengiriman.
- Admin: stok, harga tiga grade, kontrak, route, assignment kurir, jadwal, alokasi, pendapatan, pengeluaran, total Mitra, statistik sampah terolah dan emisi bila formula disetujui.

## Bukan target MVP

- Klasifikasi AI foto. Nice-to-have setelah klasifikasi petugas stabil.
- Pelacakan kendaraan real-time, prediksi traffic, navigasi turn-by-turn.
- Janji rute optimal global. Sistem memakai rute otomatis terbaik yang tersedia lalu dapat ditinjau admin.
- Klaim angka emisi tanpa formula dan baseline terverifikasi.

## Critical blockers — wajib selesai sebelum operasi

| ID | Blocker | Detail | Bukti audit | Target fase |
|---|---|---|---|---|
| C1 | Eskalasi admin publik | Register tanpa alamat membuat role `admin`. Penyerang dapat akses operasi internal. | `RegisteredUserController.php:43-50` | 1 |
| C2 | Test baseline rusak | `php artisan test`: 56 gagal, 29 lulus; mayoritas HTTP 419. Hasil fitur tidak dapat dipercaya. | Audit 30-08-2026 | 1 |
| C3 | Barang pickup tidak masuk gudang | Check-in kurir menyimpan berat/grade tetapi tidak membuat stock-in. | `OfficerController.php:87-100` | 5 |
| C4 | Delivery Mitra belum ada | Hanya pickup task. Tidak ada tugas antar, bukti serah-terima, atau stock-out. | `routes/web.php:79-90` | 4–7 |
| C5 | Billing memakai sumber salah | Billing Mitra membaca pickup pemasok, bukan delivery ke Mitra. | `PartnerPortalController.php:91-115` | 7 |
| C6 | Harga historis berubah | Statistik/billing memakai tabel harga saat ini. Harga transaksi harus snapshot. | `StatsController.php:54-80` | 7 |
| C7 | Allocation tidak mengikat stok | Allocation dapat rerun tanpa reservation, stock-out, atau delivery. | `AllocationEngine.php:21-103` | 6 |
| C8 | Grade/dataset tercampur | `sales` memuat dua makna dan grade memakai dua format. Ini merusak traceability. | `Sale.php:15-29` | 0 |

## Prinsip data dan aturan bisnis

### Aktor

| Aktor | Akses | Tanggung jawab |
|---|---|---|
| Pemasok | Form publik, tanpa akun | Lapor supply, foto, lokasi, estimasi, lihat status memakai ID + PIN. |
| SaaS Admin/Operator | Internal | Review supply, stok, harga, kontrak, jadwal, alokasi, rute, assignment, keuangan, statistik. |
| Kurir/Officer | Internal mobile | Pickup, timbang per tiga grade, foto/bukti, lokasi, label, pembayaran pemasok, serah-terima gudang dan Mitra. |
| Mitra | Akun Mitra | Data kapasitas/jadwal, terima ketentuan overcapacity, lihat kontrak, pengiriman, tagihan. |

### Identitas barang

- Satu laporan pemasok bukan satu delivery Mitra.
- Satu pickup dapat berisi kuantitas `Layak`, `Kurang Layak`, dan `Tidak Layak` sekaligus.
- Grade tidak berubah saat barang dialihkan ke tujuan akhir.
- Tujuan penggunaan disimpan terpisah: `pakan_ternak`, `maggot`, `kompos`.
- Setiap kg harus dapat ditelusuri: laporan pemasok → pickup → klasifikasi/label → receipt gudang → allocation → delivery → invoice/payment.

### Stok dan alokasi

Untuk setiap grade, dalam periode pengiriman:

1. Hitung stok gudang yang tersedia dan Mitra aktif yang jadwalnya eligible.
2. Bila stok kurang dari total minimum: bagi hanya tier minimum menurut aturan fairness yang diputuskan.
3. Bila stok cukup untuk minimum: isi minimum lalu tier ideal.
4. Bila stok di atas ideal: isi headroom `ideal → maksimum` sebagai `overcapacity`.
5. Kg di atas maksimum semua Mitra tidak boleh diberikan melebihi kontrak; arahkan sesuai tujuan grade, dengan grade asal tetap tersimpan.
6. Overcapacity tidak menunggu approval per delivery. Persetujuan ketentuan tercatat saat onboarding/registrasi Mitra.
7. Stok tidak boleh negatif; allocation harus reserve stok, delivery selesai membuat stock-out.

### Harga dan pembayaran

- Harga normal memakai harga yang disepakati untuk delivery/kontrak.
- Hanya baris kg overcapacity memakai harga modal.
- Harga, total, due date, dan status pembayaran harus disimpan pada transaksi. Perubahan harga admin tidak boleh mengubah transaksi lama.
- Pembayaran pemasok dicatat dari kuantitas yang diterima/classified sesuai keputusan bisnis final.
- Tagihan Mitra dibuat dari delivery yang selesai, bukan pickup pemasok.

## Fase 0 — Kontrak domain dan perbaikan schema

**Goal:** satu vocabulary, satu lifecycle, satu sumber kebenaran sebelum fitur baru.

### Tasks

- [x] Tetapkan entity terpisah untuk laporan pemasok, pickup, klasifikasi/lot, mutasi gudang, allocation/reservation, delivery, dan financial line.
- [x] Hilangkan konflik field `contact`/`contact_name`, `estimate_kg`/`estimated_kg`, `manual_address`/`address` pada flow yang berbeda. *(kanonik tuntas; tabel legacy `sales`/`pickup_tasks` masih dipakai untuk tracking publik & task kurir — debt tercatat)*
- [x] Gunakan satu enum/konstanta grade di seluruh codebase. *(`app/Domain/Grade.php`)*
- [x] Simpan `intended_use` terpisah dari grade.
- [x] Tentukan satu sumber kebenaran kapasitas: kontrak atau profil Mitra; jangan dua sumber aktif. *(kontrak)*
- [x] Tambahkan schedule kontrak: frekuensi + hari penerimaan.
- [x] Definisikan lifecycle dan transisi status laporan, pickup, gudang, delivery, invoice, payment.
- [x] Buat migration kompatibel database existing dan fixture/factory canonical.

### Exit gate

- Fresh migration berhasil.
- Tidak ada adapter legacy dalam controller operasi.
- Grade sama pada stock, kontrak, price, pickup, allocation, dan billing.
- Test membuktikan redirect excess mempertahankan grade asal.

## Fase 1 — Keamanan identitas, akses, dan onboarding Mitra

**Goal:** hanya pihak tepat dapat menjalankan operasi; Mitra memahami aturan overcapacity sebelum aktif.

### Tasks

- [x] Public register hanya membuat role `partner`.
- [x] Admin/officer dibuat melalui flow internal admin-only atau seed terkontrol. *(seed via env)*
- [x] Perbaiki bootstrap test/CSRF sampai seluruh test existing dapat menguji controller, bukan gagal 419. *(suite 153 hijau)*
- [x] Form Mitra wajib: nama, alamat, minimum, ideal, maksimum, frekuensi, hari penerimaan.
- [x] Tampilkan penjelasan ketentuan overcapacity saat register atau first login.
- [x] Simpan acceptance: partner/user, versi teks aturan, timestamp.
- [x] Blok portal operasi sampai acceptance valid.
- [x] Hapus approval/reject overcapacity per delivery; kontrak acceptance menjadi dasar operasi.
- [x] Tambah test role: guest, Mitra, admin, officer. *(`PhaseOneAuthTest`, incl. fail-closed middleware tanpa user)*

### Exit gate

- Public user tidak dapat membuat/admin role internal.
- Mitra tidak dapat memakai portal sebelum accept ketentuan.
- Semua test auth/role hijau.

## Fase 2 — Intake pemasok dan peta supply

**Goal:** supply yang diterima dapat dipakai aman untuk review dan rute pickup.

### Tasks

- [x] Form publik: kontak, foto, estimasi kg, GPS browser dengan consent, alamat fallback.
- [x] Simpan photo private dan metadata lokasi/source yang diperlukan.
- [x] Buat status review dan transisi intake yang eksplisit.
- [x] Admin melihat supply eligible pada peta dan dapat menerima/menolak/menjadwalkan pickup.
- [x] Supplier tracking memakai public ID + PIN dan menampilkan status lifecycle nyata.
- [x] Tambah validasi input, throttle, serta test foto/lokasi/PIN. *(throttle 10/menit intake, 5/menit tracking)*

### Exit gate

- Intake valid menghasilkan record lengkap dan traceable.
- GPS gagal tetap bisa lewat alamat fallback.
- Hanya supply diterima dengan lokasi valid masuk routing.

## Fase 3 — Kontrak Mitra dan scheduling otomatis

**Goal:** sistem membuat pekerjaan pada hari penerimaan Mitra dan supply yang sudah diterima.

### Tasks

- [x] Admin CRUD Mitra dan kontrak aktif/paused/cancelled.
- [x] Validasi `minimum ≤ ideal ≤ maksimum`.
- [x] Simpan frekuensi + hari penerimaan pada kontrak.
- [x] Scheduler menghasilkan pekerjaan masa depan idempotent dari kontrak aktif dan jadwal. *(fix whereDate service_date — ditemukan audit)*
- [x] Admin dapat melihat dan override jadwal/assignment tanpa mengubah record selesai.
- [x] Portal Mitra menampilkan jadwal sendiri.
- [x] Ganti route `tasks` coming-soon dengan workload nyata. *(alias officer tasks/routes/weighing; stub admin.tasks masih ada — debt)*

### Exit gate

- Kontrak paused/cancelled tidak menghasilkan pekerjaan baru.
- Rerun scheduler tidak membuat duplikat.
- Perubahan jadwal hanya memengaruhi kerja mendatang.

## Fase 4 — Route otomatis dan tugas kurir

**Goal:** admin dapat membuat dan assign rute pickup maupun delivery berdasarkan kerja terjadwal.

### Tasks

- [x] Route input hanya pekerjaan eligible dan bertanggal.
- [x] Kelompokkan stop menurut kapasitas kendaraan dan urutkan rute otomatis.
- [x] Pakai OSRM bila tersedia; fallback deterministik bila gagal; simpan sumber estimasi. *(estimation_source: osrm/haversine)*
- [x] Peta menampilkan titik pemasok dan Mitra, rute, muatan, unassigned kg.
- [x] Admin assign kurir dan dapat review/ubah route sebelum berjalan.
- [x] Kurir mobile melihat ordered stop, lokasi, status pickup dan delivery.
- [x] Reroute tidak boleh menghapus task assigned/in-progress/done.

### Exit gate

- Kapasitas kendaraan tidak terlewati atau kg unassigned tampil jelas.
- Pickup dan delivery sama-sama punya route/task terpisah.
- Test mencakup OSRM fallback, idempotency, capacity, assignment.

## Fase 5 — Pickup, klasifikasi, label, dan gudang

**Goal:** berat hasil lapangan menjadi stok gudang yang benar dan dapat dilacak.

### Tasks

- [x] Kurir check-in pickup dengan GPS, foto, timestamp, dan data per tiga grade.
- [x] Validasi total klasifikasi serta bukti lokasi sesuai toleransi operasional.
- [x] Buat label/lot yang menghubungkan source supply ke kuantitas grade.
- [x] Terima lot ke gudang melalui stock ledger immutable.
- [x] Buat idempotency key agar retry check-in tidak menggandakan stock-in.
- [x] Catat pembayaran pemasok dan bukti transaksi sesuai basis pembayaran yang diputuskan.
- [x] Admin melihat kg per pemasok dan grade.

### Exit gate

- Satu pickup dapat mengandung tiga grade.
- Jumlah grade = jumlah diterima.
- Setiap stock-in memiliki asal pickup/lot/petugas/bukti.
- Check-in ulang tidak menggandakan stok atau pembayaran.

## Fase 6 — Alokasi gudang: defisit, ideal, surplus, tujuan grade

**Goal:** alokasi memakai stok gudang nyata, kapasitas kontrak, jadwal, dan aturan surplus/defisit.

### Tasks

- [x] Hitung available stock per grade dari ledger dan reservation aktif.
- [x] Implementasikan tier minimum → ideal → overcapacity sampai maksimum.
- [x] Terapkan fairness rule defisit setelah product decision disetujui. *(D1: proporsional per minimum)*
- [x] Mark hanya `ideal → maksimum` sebagai overcapacity.
- [x] Berlakukan harga modal hanya pada allocation line overcapacity.
- [x] Redirect excess di atas maksimum ke tujuan grade yang sama tanpa downgrade grade. *(disuperseide keputusan owner D3: excess ditahan di gudang & tampil sebagai held_kg, tanpa redirect)*
- [x] Simpan excess yang belum punya tujuan eligible sebagai quantity terlihat; tidak boleh hilang diam-diam. *(D3: held_kg di engine + UI)*
- [x] Reserve stock atomically saat allocation; rerun harus idempotent dan conserve kg.
- [x] Buat delivery candidate hanya dari allocation eligible + schedule Mitra. *(diselesaikan di Fase 7 bersama DeliverySchedulingService)*

### Exit gate

- Test defisit tidak mengalokasikan ideal sebelum minimum.
- Test surplus tidak melebihi maksimum Mitra.
- Test excess mempertahankan grade dan intended use benar.
- Allocation/run tidak bisa mengalokasikan stok dua kali atau menghasilkan stok negatif.

## Fase 7 — Delivery, tagihan Mitra, dan pembayaran

**Goal:** barang alokasi benar-benar terkirim, stok berkurang, Mitra melihat jumlah terutang yang benar.

### Tasks

- [x] Buat delivery dari allocation reserved dan route delivery.
- [x] Kurir mencatat serah-terima Mitra: waktu, lokasi/bukti, kuantitas per grade, status.
- [x] Delivery selesai membuat stock-out satu kali dari reservation terkait.
- [x] Buat invoice/billing line dari delivery selesai.
- [x] Pisahkan normal vs overcapacity line dan snapshot unit price/cost/total.
- [x] Simpan due date/terms/payment status.
- [x] Portal Mitra: pengiriman aktif/riwayat, kontrak, allocation, total perlu dibayar.
- [x] Catat pembayaran Mitra sesuai workflow yang diputuskan.

### Exit gate

- Billing tidak pernah memakai pickup pemasok sebagai sumber.
- Update harga hari ini tidak mengubah invoice lama.
- Delivery retry tidak menggandakan stock-out atau invoice.
- Mitra hanya melihat data miliknya.

## Fase 8 — Dashboard admin, statistik, dan end-to-end hardening

**Goal:** semua angka dashboard dapat direkonsiliasi ke transaksi operasional dan finansial.

### Tasks

- [x] Dashboard admin: stok per grade, surplus/defisit, allocation tier, route/task, total Mitra, pendapatan, pengeluaran.
- [x] Statistik sampah terolah dari receipt/delivery nyata.
- [ ] Statistik emisi hanya setelah formula, unit, baseline, dan sumber disepakati; tampilkan metodologi. *(digate D8 — butuh keputusan owner: formula, baseline, sumber data; belum disepakati)*
- [x] Dashboard Mitra: schedule, delivery status, allocation, invoice/payment due.
- [x] Audit data-access lintas role.
- [x] Tambah test end-to-end: intake → pickup → classify → warehouse → allocate → delivery → bill → payment/stat.
- [x] Jalankan test suite, static lint, migration fresh, dan scenario reconciliation sebelum pilot. *(lint = pint pada file fase 8; repo belum punya pint config global)*

### Exit gate

- Semua angka dashboard cocok dengan ledger/financial line sumber.
- `php artisan test` hijau.
- Scenario end-to-end membuktikan kg dan nilai uang tidak duplikat/hilang.

## Decision gates — perlu keputusan sebelum fase terkait

Tidak dikerjakan dengan asumsi. Pilih dan catat keputusan sebelum fase dimulai.

| Gate | Keputusan yang dibutuhkan | Memblokir |
|---|---|---|
| D1 | Saat defisit minimum: proporsional, prioritas kontrak, atau metode lain? | Fase 6 |
| D2 | Penerima excess per intended use dipilih menurut kapasitas, jadwal, jarak, atau prioritas apa? | Fase 6 |
| D3 | Jika tidak ada tujuan eligible untuk excess: simpan gudang, karantina, atau proses/disposal? | Fase 6 |
| D4 | Frekuensi harian dan bulanan memakai hari penerimaan bagaimana; satu atau banyak hari? | Fase 3 |
| D5 | Basis bayar pemasok: kg pickup, kg diterima/classified, atau kg warehouse receipt? Perlakuan reject bagaimana? | Fase 5, 7 |
| D6 | Harga normal berasal dari harga kontrak, price global, atau aturan lain? Harga modal definisinya buy price global atau cost receipt? | Fase 7 |
| D7 | Pembayaran Mitra MVP: pencatatan manual/off-platform atau metode pembayaran dalam aplikasi? | Fase 7 |
| D8 | Formula emisi, baseline, dan sumber data yang sah. | Fase 8 |

## Urutan eksekusi

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`

- Fase 2 dan Fase 3 dapat mulai paralel setelah Fase 0–1 selesai, bila schema ownership tidak tumpang tindih.
- Fase 4 butuh kerja terjadwal dari Fase 3.
- Fase 6 butuh stok gudang nyata dari Fase 5.
- Fase 7 butuh reservation/allocation dari Fase 6.
- Fase 8 memakai data final Fase 5–7.

## Definition of done tiap fase

- Requirement fase dan exit gate terpenuhi.
- Migration aman pada fresh database dan upgrade database existing.
- Authorization dan validasi trust boundary diuji.
- Tidak ada duplikasi kg, stok negatif, atau transaksi uang historis berubah.
- Test terkait lulus; `php artisan test` tidak boleh regresi.
- Tidak ada angka dampak/operasional yang dibuat-buat.
