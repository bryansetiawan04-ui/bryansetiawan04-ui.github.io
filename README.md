# Dompet Pribadi

Aplikasi web lokal untuk mencatat pemasukan, pengeluaran, dan membaca bill pembelian.

## Cara Pakai

Buka file `index.html` di browser. Data transaksi disimpan di `localStorage` browser yang dipakai.

## Fitur

- Dashboard saldo, pemasukan, pengeluaran, dan arus kas bulanan.
- Form transaksi manual untuk pemasukan dan pengeluaran.
- Bill scanner dengan OCR gambar melalui Tesseract.js saat internet tersedia.
- Fallback paste teks bill untuk isi otomatis tanpa OCR.
- Parser nominal, tanggal, kategori, akun, dan merchant dari teks bill.
- Simpan otomatis transaksi dari hasil bill.
- Riwayat transaksi dengan filter, pencarian, edit, dan hapus.
- Export CSV/JSON dan import JSON.

## Catatan

OCR gambar memakai Tesseract.js dari CDN. Jika browser sedang offline atau CDN tidak bisa diakses, tempel teks bill ke kolom scanner lalu klik `Isi otomatis`.
