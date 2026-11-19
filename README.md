# PropTech / EduFunnel — Form Portal & Kuesioner SUS

Website frontend lengkap untuk pengumpulan data identitas prospek/pengguna properti dan evaluasi kegunaan sistem (*System Usability Scale* / SUS 10 butir) terintegrasi langsung dengan Webhook n8n.

## 📁 Struktur Direktori
```
proptech-form-portal/
├── index.html         # Struktur semantik HTML5 portal form & kuesioner
├── css/
│   └── style.css      # Desain UI modern, responsif, & tema dashboard analytics
├── js/
│   └── form.js        # Validasi sisi klien, kalkulasi SUS, & integrasi webhook n8n
└── README.md          # Petunjuk penggunaan & konfigurasi webhook
```

---

## 🚀 Fitur Utama
1. **Desain Modern Dashboard SaaS**:
   - Skema warna Slate, Royal Blue, dan Emerald Green yang selaras dengan UI analytics web app.
   - Tata letak terpusat (*centered layout*) dengan `max-width: 760px`.
   - Header ringkas dengan tombol kembali ke Dashboard Utama dan badge status versi.
   - Kartu terorganisir: **Bagian A (Identitas & Funnel)** dan **Bagian B (Kuesioner SUS)**.
   - Responsif optimal pada perangkat Desktop, Tablet, maupun Smartphone.

2. **Bagian A — Identitas & Data Funnel Properti**:
   - `nama`: Text input wajib diisi.
   - `peran`: Dropdown (`Calon Pembeli`, `Agen Properti`, `Marketing`, `Pimpinan`).
   - `sumber_trafik`: Dropdown (`Instagram`, `Website`, `TikTok`, `Referensi`).
   - `tahap_funnel`: Dropdown (`Awareness`, `Consideration`, `Conversion`, `Retention`, `Advocacy`).

3. **Bagian B — Kuesioner Evaluasi Kegunaan (SUS - 10 Butir, Skala 1–5)**:
   - 10 butir pertanyaan standar SUS dalam Bahasa Indonesia yang dikontekstualisasikan untuk platform properti.
   - Sistem radio matrix interaktif dengan pilihan Likert 1 (Sangat Tidak Setuju) hingga 5 (Sangat Setuju).
   - Indikator progres interaktif (*real-time progress bar* menghitung butir yang sudah dijawab).
   - Validasi ketat: Seluruh 10 butir wajib dinilai (menghasilkan tepat 10 integer 1–5).

4. **Integrasi Webhook n8n**:
   - Konfigurasi URL webhook diletakkan di baris paling atas `js/form.js`:
     ```javascript
     const N8N_WEBHOOK_URL = "https://URL-N8N-ANDA/webhook/kuesioner-sus";
     ```
   - Menggunakan `fetch()` method `POST` dengan header `"Content-Type": "application/json"`.
   - Format payload JSON:
     ```json
     {
       "nama": "Arya Wiratama",
       "peran": "Calon Pembeli",
       "sumber_trafik": "Instagram",
       "tahap_funnel": "Consideration",
       "jawaban": [4, 2, 4, 1, 5, 2, 4, 2, 5, 1]
     }
     ```
   - Tombol kirim dilengkapi indikator *loading spinner* dan status dinamis saat proses transmisi berlangsung.
   - Penanganan status yang informatif:
     - Sukses (`response.ok` / 200): Notifikasi berhasil, modal ringkasan (termasuk kalkulasi estimasi skor SUS 0–100), dan *auto-reset* formulir.
     - Gagal (`status 400` / error jaringan / CORS): Menampilkan pesan kesalahan rinci tanpa menghilangkan isian formulir.

---

## 🛠️ Cara Menjalankan & Menguji

### 1. Membuka di Browser
Anda dapat langsung membuka file `index.html` dengan cara:
- Double-click file `index.html` di File Explorer, atau
- Jalankan local server (misal VS Code Live Server atau `npx serve .`).

### 2. Mengatur URL Webhook n8n
Buka file `js/form.js`, lalu ubah baris ke-4:
```javascript
const N8N_WEBHOOK_URL = "https://subdomain.anda.n8n.cloud/webhook/kuesioner-sus";
```
Pastikan node Webhook di n8n diatur ke:
- **HTTP Method**: `POST`
- **Path**: `kuesioner-sus`
- **Response Mode**: `When Last Node Finishes` atau `Immediately (200 OK)`
