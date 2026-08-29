# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Pemasok:** melaporkan dan menjual sampah sayuran lewat formulir publik tanpa akun; perlu proses ringan, lokasi fallback, dan pelacakan aman.
- **Officer:** mengambil, menimbang, mengklasifikasikan, melabeli, membayar pemasok, lalu melakukan serah-terima gudang atau mitra dari perangkat lapangan.
- **Mitra:** menetapkan kapasitas dan frekuensi; memantau kontrak, alokasi, pengiriman, dan transaksi.
- **Operator/Admin:** menjalankan pembelian, harga, stok, alokasi, rute, pembayaran, penjualan, dan dampak.

Semua peran adalah pengguna utama selama pilot.

## Product Purpose

SayCle mengelola rantai pasok sirkular untuk sampah sayuran yang tidak layak dikonsumsi manusia tetapi masih dapat menjadi pakan ternak, maggot, atau kompos. Platform menghubungkan pelaporan pemasok, pickup, penimbangan, klasifikasi, pembayaran, penyimpanan, alokasi, dan penyaluran mitra.

Keberhasilan pilot diukur dari limbah sayuran yang dialihkan dari pembuangan, pembayaran pemasok, kelancaran pasokan mitra, dan baseline dampak yang dapat dipertanggungjawabkan.

## Positioning

SayCle adalah operasi rantai pasok sirkular yang dikelola operator, bukan SaaS langganan murni. Pendapatan berasal dari margin transaksi penjualan. Pembeda utama MVP adalah Smart Route Optimization: pembagian titik pickup ke beberapa kendaraan berdasarkan lokasi, estimasi berat, kapasitas kendaraan, serta jarak dan durasi normal OSRM; admin selalu dapat meninjau dan menyesuaikan hasil.

## Operating Context

- Pilot di Indonesia, UI bilingual Bahasa Indonesia dan English.
- Pemasok memakai formulir web publik; GPS browser perlu izin eksplisit dan fallback alamat manual atau pin peta.
- Officer bekerja mobile-first di lapangan.
- Operator mengatur tanggal pengiriman dari stok, rute, dan operasi; mitra hanya memilih frekuensi.
- Gudang menjadi titik penerimaan sebelum pengiriman mitra, kecuali alur yang disetujui.
- Grade tetap: Layak → pakan ternak; Kurang Layak → maggot; Tidak Layak → kompos.

## Capabilities and Constraints

- Status sale wajib: Accepted → Scheduled → Pickup in progress → Weighed & Classified → Paid.
- Sale ID wajib dipasangkan dengan token aman atau PIN untuk pelacakan; ID saja tidak memberi akses.
- Officer mencatat berat aktual per grade, label sumber, pembayaran pemasok, dan bukti transaksi.
- Kapasitas mitra memakai minimum, ideal, maksimum dalam kg per minggu; stok serta alokasi terpisah menurut grade dan tipe mitra.
- Alokasi mengikuti aturan minimum proporsional, ideal proporsional, surplus/overcapacity, dan mitra kompos cadangan sesuai PRD.
- Routing memakai Leaflet/OpenStreetMap dan OSRM. Hasil bukan jaminan optimal global; tidak mencakup pelacakan kendaraan real-time, prediksi lalu lintas, atau navigasi real-time.
- Pembayaran pemasok dilakukan officer saat pickup. Penagihan mitra manual/off-platform pada MVP.
- Stack: Laravel 12, Inertia 2, React 19, TypeScript, Vite 6, Tailwind CSS 4, shadcn-style components, Radix, Lucide.

## Brand Commitments

- Nama produk: SayCle.
- Framing utama: SDG 11 — Sustainable Cities and Communities.
- Dampak pendukung: SDG 8 — Decent Work and Economic Growth.
- Jangan membingkai produk sebagai solusi SDG 7.
- Gunakan komponen reusable shadcn yang sudah ada untuk dashboard; ReactBits hanya untuk elemen hero landing yang modern dan terukur.

## Evidence on Hand

- PRD SayCle dari pemilik produk, Agustus 2026.
- Starter web app Laravel/Inertia tersedia.
- Belum ada logo, foto, testimonial, pelanggan, studi kasus, baseline pilot, atau KPI numerik terverifikasi. Jangan mengarang bukti tersebut.

## Product Principles

- Operasi nyata lebih penting daripada klaim teknologi.
- Grade, stok, alokasi, dan audit trail tidak boleh tercampur.
- Formulir pemasok harus ringan, tanpa login, dan tetap berguna saat GPS gagal.
- Keputusan otomatis harus dapat ditinjau serta diubah operator.
- Ukur dampak secara konservatif sebelum membuat target atau klaim karbon.

## Accessibility & Inclusion

- Responsive dan mobile-first untuk web.
- Form publik harus tetap dapat digunakan melalui fallback lokasi saat izin GPS ditolak atau tidak akurat.
- Antarmuka bilingual Bahasa Indonesia dan English.
