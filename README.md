# Finance Pribadi

Aplikasi web statis untuk mencatat keuangan pribadi. Cocok ditaruh di GitHub Pages karena tidak membutuhkan server atau proses build.

## Fitur

- Login lokal dengan username dan password.
- Data catatan disimpan terenkripsi di browser.
- Catatan pengeluaran, pendapatan, tabungan, dan tambahan.
- Upload foto nota atau barang, lalu foto dikompres sebelum disimpan.
- Ringkasan bulan berjalan otomatis, jadi saat bulan berganti angka bulan ini mulai dari nol.
- History bisa difilter per bulan dan tahun.
- Laporan seperti invoice dengan range maksimal 1 tahun dan bisa di-download sebagai file HTML.
- Export dan import backup terenkripsi untuk pindah data antar perangkat.

## Catatan penting untuk GitHub Pages

GitHub Pages hanya menyediakan hosting statis. Artinya website bisa diakses dari HP dan laptop, tetapi data tidak otomatis tersinkron antar perangkat karena tidak ada database server.

Untuk memakai data yang sama di perangkat lain:

1. Buka aplikasi di perangkat lama.
2. Klik `Export Backup`.
3. Kirim file backup ke perangkat baru.
4. Buka aplikasi di perangkat baru.
5. Klik `Import Backup`.
6. Masuk memakai username dan password yang sama.

Kalau nanti ingin sinkron otomatis lintas perangkat, aplikasi ini bisa dikembangkan lagi memakai backend seperti Firebase atau Supabase.

## Cara upload ke GitHub Pages

1. Buat repository baru di GitHub.
2. Upload semua file di folder ini ke repository tersebut.
3. Masuk ke `Settings` -> `Pages`.
4. Pada `Build and deployment`, pilih `Deploy from a branch`.
5. Pilih branch utama, biasanya `main`, lalu folder `/root`.
6. Simpan, lalu tunggu URL GitHub Pages aktif.

## Menjalankan lokal

File `index.html` bisa langsung dibuka di browser. Untuk pengalaman yang sama seperti GitHub Pages, bisa juga jalankan server statis lokal dari folder ini.
