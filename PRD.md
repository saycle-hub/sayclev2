# PRD: PilahPangan

## Ringkasan Produk dan Visi

PilahPangan adalah platform rantai pasok sirkular yang dikelola operator. Platform membeli sampah sayuran dari pemasok—sayuran yang tidak layak untuk konsumsi manusia tetapi berpotensi digunakan untuk pakan ternak, maggot, atau kompos—lalu mengatur pengambilan, penimbangan, klasifikasi, pembayaran, penyimpanan, dan penyaluran ke mitra. Pendapatan operator berasal dari margin per transaksi penjualan, bukan langganan SaaS murni.

Framing kompetisi utama adalah **SDG 11 (Sustainable Cities and Communities)** melalui pengelolaan sampah organik perkotaan. **SDG 8 (Decent Work and Economic Growth)** menjadi dampak pendukung melalui pendapatan pemasok, pekerjaan operasional, dan akses usaha. Produk tidak dibingkai sebagai solusi SDG 7.

## Masalah dan Pengguna

Sampah sayuran dari pasar, kebun, dan pemasok lokal—sayuran yang tidak layak untuk konsumsi manusia tetapi berpotensi digunakan untuk pakan ternak, maggot, atau kompos—sering terbuang karena tidak ada kanal pelaporan, pembelian, pengambilan, dan pemrosesan yang terkoordinasi. Mitra pakan ternak, maggot, dan kompos membutuhkan pasokan yang terukur dan terjangkau.

| Pengguna | Peran                                                                                                                                                                            |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pemasok  | Melaporkan dan menjual sampah sayuran melalui formulir publik tanpa login.                                                                                                       |
| Officer  | Menggabungkan peran kurir: mengambil sampah sayuran, menimbang akhir, mengklasifikasikan dan memberi label di sumber, membayar pemasok, serta mengantar ke gudang lalu ke mitra. |
| Mitra    | Menetapkan kapasitas dan frekuensi pengiriman; menerima grade yang sesuai; melihat status dan transaks                                                                         |
| Operator | Membeli sampah sayuran, mengelola harga, kontrak, stok, alokasi, rute, pembayaran, dan penjualan ke mitra.                                                                       |

## Keputusan Bisnis P0

- Grade tetap: **Layak → pakan ternak; Kurang Layak → maggot; Tidak Layak → kompos**.
- Stok dan alokasi dipisahkan berdasarkan grade dan tipe mitra; grade tidak boleh dipertukarkan dalam alokasi normal.
- Kapasitas **minimum, ideal, maksimum** dinyatakan dalam kg per minggu.
- Mitra memilih frekuensi pengiriman, bukan tanggal pengiriman. Operator menjadwalkan tanggal berdasarkan stok, rute, dan operasi.
- Jika stok grade berada di bawah total minimum, alokasi dibagi proporsional terhadap minimum setiap mitra.
- Alokasi normal dimulai dari minimum, lalu sisa dibagi proporsional menuju ideal.
- Jika pasokan melebihi total ideal, sisa menjadi surplus/overcapacity kontraktual, dialokasikan dengan harga pokok agar seluruh limbah pasar tetap tertangani.
- Maksimum adalah kapasitas aman normal. Kapasitas di atas maksimum hanya boleh melalui persetujuan overcapacity darurat secara kontraktual.
- Jika kapasitas darurat tidak dapat menyerap sisa, operator mengalihkan sisa ke mitra kompos cadangan.
- Officer melakukan klasifikasi dan pelabelan di sumber. Penimbangan akhir dilakukan saat pickup.

## Peran dan Akses

| Peran          | Akses utama                                                                                                                                |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| Officer        | Melihat tugas pickup/pengiriman, mencatat berat tiap grade, membayar pemasok, memperbarui status, dan mengelola serah terima gudang/mitra. |
| Operator/Admin | Mengelola pemasok, mitra, kontrak, harga, stok per grade, alokasi, rute, pembayaran, dan laporan.                                          |
| Mitra          | Mengelola kapasitas dan frekuensi pengiriman; melihat kontrak, alokasi, status, dan tagihan.                                               |
| Pemasok        | Tidak memiliki akun; menggunakan formulir publik sebagai antarmuka pemasok.                                                                |

## Alur Penawaran dan Pelacakan

Formulir publik tanpa login meminta foto sampah sayuran, estimasi kuantitas, kontak, dan izin lokasi browser secara eksplisit. Lokasi utama adalah GPS. Pemasok dapat memakai fallback alamat manual atau pin peta bila GPS tidak tersedia/akurat.

Setiap transaksi menghasilkan sale ID dan token aman atau PIN. Sale ID saja tidak cukup untuk mengakses pelacakan.

Status transaksi wajib mengikuti urutan:

**Accepted → Scheduled → Pickup in progress → Weighed & Classified → Paid**

Officer mengambil sampah sayuran, melakukan penimbangan akhir, klasifikasi dan pelabelan di sumber, membayar pemasok, lalu mengantar barang ke gudang dan selanjutnya ke mitra sesuai alokasi.

## Kebutuhan Fungsional

- **FR-01:** Formulir publik pemasok menangkap foto, estimasi kg, kontak, izin GPS browser, dan fallback alamat/pin peta.
- **FR-02:** Sistem membuat sale ID, token/PIN pelacakan, dan status transaksi sesuai alur P0.
- **FR-03:** Officer mencatat berat aktual Layak, Kurang Layak, dan Tidak Layak serta label sumber.
- **FR-04:** Officer mencatat pembayaran pemasok dan bukti transaksi.
- **FR-05:** Mitra menetapkan kapasitas minimum/ideal/maksimum kg per minggu dan frekuensi pengiriman.
- **FR-06:** Sistem menyimpan stok dan alokasi terpisah per grade dan tipe mitra.
- **FR-07:** Mesin alokasi menjalankan aturan minimum, ideal, overcapacity, harga pokok, dan mitra kompos cadangan P0.
- **FR-08:** Sistem menghasilkan urutan rute otomatis dengan opsi terbaik/tercepat yang didukung penyedia peta. Admin dapat menyesuaikan urutan akhir.
- **FR-09:** Dashboard menampilkan transaksi, pembayaran pemasok, stok per grade, alokasi, pengiriman, pendapatan margin, dan dampak.

## Non-Fungsional dan Integrasi

- HTTPS, autentikasi berbasis peran untuk pengguna internal/mitra, validasi input, dan kontrol akses.
- Audit trail untuk perubahan status, berat, klasifikasi, pembayaran, alokasi, dan kontrak.
- Integrasi peta digunakan untuk GPS, geocoding, estimasi jarak/waktu, dan urutan rute; hasil rute tidak dijanjikan optimal secara global.
- Formulir publik harus tetap dapat menolak atau meminta fallback ketika izin lokasi ditolak.

## Model Operasi dan Data Utama

- Pemasok melaporkan dan menjual sampah sayuran; operator membeli dan membayar berdasarkan transaksi.
- Operator menjual stok terklasifikasi ke mitra berdasarkan kontrak, alokasi, dan harga per grade; margin dihitung per transaksi.
- Gudang menjadi titik penerimaan sebelum pengiriman ke mitra, kecuali alur operasional yang disetujui.
- Frekuensi mitra adalah cadence operasional; tanggal aktual dibuat kemudian oleh operator.

## SDG dan Metrik Dampak

Metrik utama berpusat pada:

- kg sampah sayuran yang dialihkan dari pembuangan, per grade dan tujuan;
- total serta distribusi pembayaran/pendapatan pemasok;
- penghematan biaya atau manfaat biaya mitra dibanding sumber alternatif;
- jumlah pemasok/mitra SME dan hambatan akses (perangkat, konektivitas, lokasi, dan literasi digital).

Estimasi pengurangan karbon hanya metrik opsional. Jika digunakan, baseline, asumsi, faktor emisi, dan batas pengukuran harus didokumentasikan secara konservatif; angka tidak boleh diposisikan sebagai pengukuran pasti.

Target KPI numerik belum ditetapkan. Baseline ditetapkan selama pilot sebelum target pascapilot dibuat.

## Risiko dan Mitigasi

| Risiko                                  | Mitigasi                                                                                           |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------- |
| GPS ditolak atau tidak akurat           | Minta izin secara eksplisit; sediakan alamat manual/pin peta; officer memvalidasi sebelum pickup.  |
| Sale ID bocor                           | Wajibkan token aman atau ID+PIN untuk pelacakan; jangan izinkan ID saja.                           |
| Salah timbang/klasifikasi               | Pelatihan, foto/label sumber, audit trail, dan rekonsiliasi gudang.                                |
| Stok tidak memenuhi minimum             | Jalankan alokasi proporsional terhadap minimum; komunikasikan kekurangan kepada mitra.             |
| Pasokan melebihi kapasitas              | Gunakan overcapacity kontraktual; bila kapasitas darurat habis, alihkan ke mitra kompos cadangan.  |
| Mitra menolak atau tidak mampu menerima | Kontrak dan prosedur eskalasi; reallocate ke mitra sesuai grade atau cadangan kompos.              |
| Biaya/kegagalan penyedia peta           | Batas penggunaan, cache seperlunya, dan fallback manual untuk penyesuaian rute.                    |
| Hambatan akses SME                      | Formulir ringan tanpa login, fallback lokasi, bantuan officer, dan pengukuran hambatan saat pilot. |

## Batasan dan Asumsi

- Pembayaran pemasok dilakukan officer saat pickup; integrasi pembayaran digital pemasok belum termasuk.
- Mitra ditagih secara manual/off-platform pada MVP; platform mencatat nilai transaksi dan margin.
- Web responsif digunakan; aplikasi native tidak diperlukan untuk MVP.
- Internet dan perangkat berkemampuan GPS diasumsikan, tetapi fallback lokasi wajib tersedia.
- Kapasitas kontrak, harga pokok, harga jual, dan aturan overcapacity harus tercatat sebelum alokasi.

## Di Luar Cakupan

- Login atau portal akun pemasok; formulir publik pemasok tetap termasuk dalam cakupan.
- AI klasifikasi dan AI prediksi permintaan; hanya nice-to-have setelah MVP.
- Pelacakan posisi kendaraan langsung.
- Klaim bahwa urutan rute selalu optimal secara global.
- Pembayaran digital pemasok dan gateway pembayaran tagihan mitra.
- Integrasi ERP atau logistik pihak ketiga.
- Penetapan target dampak sebelum baseline pilot tersedia.
