// ============================================================================
// KONFIGURASI WEBHOOK n8n
// Ganti URL di bawah ini dengan URL Webhook Production/Test n8n aktif Anda
// ============================================================================
const N8N_WEBHOOK_URL = "https://URL-N8N-ANDA/webhook/kuesioner-sus";

// ============================================================================
// INISIALISASI ELEMEN DOM
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("susForm");
  const submitBtn = document.getElementById("submitBtn");
  const btnSpinner = document.getElementById("btnSpinner");
  const btnSubmitIcon = document.getElementById("btnSubmitIcon");
  const btnSubmitText = document.getElementById("btnSubmitText");
  const resetBtn = document.getElementById("resetBtn");

  // Bagian A Input Controls
  const inputNama = document.getElementById("nama");
  const selectPeran = document.getElementById("peran");
  const selectSumberTrafik = document.getElementById("sumber_trafik");
  const selectTahapFunnel = document.getElementById("tahap_funnel");

  // Bagian B & Progress Controls
  const susProgressBar = document.getElementById("susProgressBar");
  const susProgressText = document.getElementById("susProgressText");
  const susItems = document.querySelectorAll(".sus-item");

  // Alert & Modal
  const statusAlert = document.getElementById("statusAlert");
  const alertIcon = document.getElementById("alertIcon");
  const alertTitle = document.getElementById("alertTitle");
  const alertMessage = document.getElementById("alertMessage");
  const alertCloseBtn = document.getElementById("alertCloseBtn");

  const successModal = document.getElementById("successModal");
  const modalSummary = document.getElementById("modalSummary");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalDashboardLink = document.getElementById("modalDashboardLink");

  const TOTAL_SUS_QUESTIONS = 10;

  // ==========================================================================
  // EVENT LISTENERS UNTUK REAL-TIME PROGRESS & FEEDBACK
  // ==========================================================================

  // Pantau perubahan pada seluruh radio button kuesioner SUS
  susItems.forEach((item, index) => {
    const radios = item.querySelectorAll('input[type="radio"]');
    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        // Tandai card butir sudah terjawab
        item.classList.add("answered");
        item.classList.remove("error");
        clearFieldError(`q_${index}`);

        // Perbarui bilah progres
        updateSusProgress();
      });
    });
  });

  // Hapus error saat field Bagian A mulai diisi
  inputNama.addEventListener("input", () => {
    if (inputNama.value.trim() !== "") {
      clearFieldError("nama");
    }
  });

  selectPeran.addEventListener("change", () => {
    if (selectPeran.value !== "") {
      clearFieldError("peran");
    }
  });

  selectSumberTrafik.addEventListener("change", () => {
    if (selectSumberTrafik.value !== "") {
      clearFieldError("sumber_trafik");
    }
  });

  selectTahapFunnel.addEventListener("change", () => {
    if (selectTahapFunnel.value !== "") {
      clearFieldError("tahap_funnel");
    }
  });

  // Tutup alert notifikasi manual
  if (alertCloseBtn) {
    alertCloseBtn.addEventListener("click", () => {
      hideAlert();
    });
  }

  // Tombol Reset Form
  resetBtn.addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan seluruh isian formulir?")) {
      resetPortalForm();
      showAlert(
        "info",
        "Form Direset",
        "Seluruh isian formulir dan pilihan kuesioner telah dikosongkan."
      );
    }
  });

  // Tombol Tutup Modal Sukses
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      hideSuccessModal();
    });
  }

  if (modalDashboardLink) {
    modalDashboardLink.addEventListener("click", (e) => {
      e.preventDefault();
      hideSuccessModal();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ==========================================================================
  // LOGIKA PENGIRIMAN FORMULIR (SUBMIT HANDLER)
  // ==========================================================================
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();

    // 1. Validasi Sisi Klien
    const validationResult = validateFormData();

    if (!validationResult.isValid) {
      // Tampilkan pesan peringatan yang jelas dan batalkan pengiriman
      showAlert(
        "error",
        "Formulir Belum Lengkap",
        validationResult.errorMessage
      );

      // Scroll ke elemen pertama yang belum lengkap
      if (validationResult.firstErrorElement) {
        validationResult.firstErrorElement.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        // Fokus ke input jika memungkinkan
        if (typeof validationResult.firstErrorElement.focus === "function") {
          validationResult.firstErrorElement.focus();
        }
      }
      return;
    }

    // Siapkan Payload JSON sesuai spesifikasi
    const payload = {
      nama: validationResult.data.nama,
      peran: validationResult.data.peran,
      sumber_trafik: validationResult.data.sumber_trafik,
      tahap_funnel: validationResult.data.tahap_funnel,
      jawaban: validationResult.data.jawaban
    };

    console.log("Mengirim payload ke n8n webhook:", payload);

    // 2. Aktifkan State Loading pada Tombol Kirim
    setLoadingState(true);

    try {
      // 3. Kirim data menggunakan fetch() dengan POST & Application/JSON
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      // Status 200 - 299
      if (response.ok) {
        let responseData = {};
        try {
          responseData = await response.json();
        } catch (_) {
          // Tangani jika response n8n berupa teks kosong / text plain
          responseData = { message: "Data diterima dengan sukses oleh workflow n8n." };
        }

        // Hitung estimasi skor SUS (Standard System Usability Scale Formula)
        const calculatedSus = calculateSusScore(payload.jawaban);

        // Tampilkan pesan sukses dan modal ringkasan
        showAlert(
          "success",
          "Pengiriman Berhasil!",
          `Data kuesioner atas nama ${payload.nama} berhasil dikirim ke webhook n8n.`
        );

        showSuccessModal(payload, calculatedSus);

        // Reset formulir setelah pengiriman berhasil
        resetPortalForm();

      } else {
        // Status 400, 404, 500, dll.
        const errorText = await response.text();
        console.error("Respon Error dari Server:", response.status, errorText);

        showAlert(
          "error",
          `Gagal Mengirim Data (Status: ${response.status})`,
          `Webhook menolak pengiriman data. Detail: ${errorText || "Periksa konfigurasi node Webhook di n8n."}`
        );
      }

    } catch (networkError) {
      // Error Jaringan, CORS, atau Placeholder URL
      console.error("Network or CORS Error:", networkError);

      const isPlaceholderUrl = N8N_WEBHOOK_URL.includes("URL-N8N-ANDA");
      
      let messageDetail = `Terjadi kesalahan koneksi atau CORS saat menghubungi webhook (${networkError.message}).`;
      
      if (isPlaceholderUrl) {
        messageDetail = `URL Webhook masih berupa placeholder (<strong>${N8N_WEBHOOK_URL}</strong>). Silakan buka file <code>js/form.js</code> dan ubah nilai variabel <code>N8N_WEBHOOK_URL</code> dengan alamat webhook n8n Anda.`;
      }

      showAlert(
        "error",
        "Gagal Menghubungi Webhook n8n",
        messageDetail
      );

      // Value-add: Berikan opsi simulasi sukses jika pengguna sedang menguji coba secara lokal
      if (isPlaceholderUrl) {
        console.info(
          "%c[INFO TESTING]%c Karena URL webhook masih placeholder, payload yang siap dikirim adalah:\n",
          "background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;",
          "color:#334155;font-weight:bold;",
          payload
        );
      }

    } finally {
      // 4. Kembalikan state tombol ke normal
      setLoadingState(false);
    }
  });

  // ==========================================================================
  // HELPER VALIDASI FORMULIR
  // ==========================================================================
  function validateFormData() {
    let isValid = true;
    let errorMessage = "";
    let firstErrorElement = null;

    // Bersihkan seluruh error state terdahulu
    clearAllErrors();

    // 1. Validasi Nama
    const namaValue = inputNama.value.trim();
    if (!namaValue) {
      setFieldError("nama", "Nama lengkap wajib diisi.");
      isValid = false;
      errorMessage = "Nama lengkap responden wajib diisi.";
      firstErrorElement = firstErrorElement || inputNama;
    }

    // 2. Validasi Peran
    if (!selectPeran.value) {
      setFieldError("peran", "Silakan pilih salah satu peran pengguna.");
      isValid = false;
      if (!errorMessage) errorMessage = "Peran pengguna belum dipilih.";
      firstErrorElement = firstErrorElement || selectPeran;
    }

    // 3. Validasi Sumber Trafik
    if (!selectSumberTrafik.value) {
      setFieldError("sumber_trafik", "Silakan pilih sumber asal trafik.");
      isValid = false;
      if (!errorMessage) errorMessage = "Sumber asal trafik belum dipilih.";
      firstErrorElement = firstErrorElement || selectSumberTrafik;
    }

    // 4. Validasi Tahap Funnel
    if (!selectTahapFunnel.value) {
      setFieldError("tahap_funnel", "Silakan tentukan tahap funnel properti.");
      isValid = false;
      if (!errorMessage) errorMessage = "Tahap funnel properti belum dipilih.";
      firstErrorElement = firstErrorElement || selectTahapFunnel;
    }

    // 5. Validasi 10 Butir Pertanyaan SUS
    const jawabanArray = [];
    const unansweredQuestions = [];

    for (let i = 0; i < TOTAL_SUS_QUESTIONS; i++) {
      const selectedRadio = document.querySelector(`input[name="q_${i}"]:checked`);
      const itemCard = document.getElementById(`sus-item-${i}`);

      if (selectedRadio) {
        const numericValue = parseInt(selectedRadio.value, 10);
        jawabanArray.push(numericValue);
      } else {
        unansweredQuestions.push(i + 1);
        if (itemCard) {
          itemCard.classList.add("error");
          setFieldError(`q_${i}`, `Butir ${i + 1} belum diberi penilaian.`);
        }
        isValid = false;
        firstErrorElement = firstErrorElement || itemCard;
      }
    }

    // Pastikan array berisi tepat 10 jawaban angka 1-5
    if (unansweredQuestions.length > 0) {
      const missingList = unansweredQuestions.slice(0, 3).join(", ") + 
        (unansweredQuestions.length > 3 ? ` dan ${unansweredQuestions.length - 3} butir lainnya` : "");
      
      errorMessage = `Terdapat ${unansweredQuestions.length} pertanyaan SUS yang belum dijawab (Butir: ${missingList}). Seluruh 10 butir wajib dinilai.`;
    }

    return {
      isValid,
      errorMessage,
      firstErrorElement,
      data: {
        nama: namaValue,
        peran: selectPeran.value,
        sumber_trafik: selectSumberTrafik.value,
        tahap_funnel: selectTahapFunnel.value,
        jawaban: jawabanArray
      }
    };
  }

  // ==========================================================================
  // PROGRESS TRACKER (BAGIAN B)
  // ==========================================================================
  function updateSusProgress() {
    let answeredCount = 0;
    for (let i = 0; i < TOTAL_SUS_QUESTIONS; i++) {
      const selectedRadio = document.querySelector(`input[name="q_${i}"]:checked`);
      if (selectedRadio) {
        answeredCount++;
      }
    }

    const percentage = Math.round((answeredCount / TOTAL_SUS_QUESTIONS) * 100);
    susProgressBar.style.width = `${percentage}%`;
    susProgressText.textContent = `${answeredCount} dari ${TOTAL_SUS_QUESTIONS} Terjawab (${percentage}%)`;

    if (answeredCount === TOTAL_SUS_QUESTIONS) {
      susProgressText.style.backgroundColor = "var(--success-50)";
      susProgressText.style.color = "var(--success-700)";
      susProgressText.style.borderColor = "var(--success-100)";
    } else {
      susProgressText.style.backgroundColor = "var(--primary-50)";
      susProgressText.style.color = "var(--primary-600)";
      susProgressText.style.borderColor = "var(--primary-200)";
    }
  }

  // ==========================================================================
  // MANAJEMEN ERROR & FEEDBACK VISUAL
  // ==========================================================================
  function setFieldError(fieldKey, message) {
    const errorEl = document.getElementById(`error-${fieldKey}`);
    if (errorEl) {
      errorEl.textContent = message;
    }

    const formGroup = document.getElementById(fieldKey)?.closest(".form-group");
    if (formGroup) {
      formGroup.classList.add("has-error");
    }
  }

  function clearFieldError(fieldKey) {
    const errorEl = document.getElementById(`error-${fieldKey}`);
    if (errorEl) {
      errorEl.textContent = "";
    }

    const formGroup = document.getElementById(fieldKey)?.closest(".form-group");
    if (formGroup) {
      formGroup.classList.remove("has-error");
    }
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-error, .sus-field-error").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll(".form-group.has-error").forEach((group) => {
      group.classList.remove("has-error");
    });
    document.querySelectorAll(".sus-item.error").forEach((item) => {
      item.classList.remove("error");
    });
  }

  // ==========================================================================
  // STATE LOADING INDIKATOR
  // ==========================================================================
  function setLoadingState(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      btnSpinner.classList.remove("hidden");
      btnSubmitIcon.classList.add("hidden");
      btnSubmitText.textContent = "Mengirim ke n8n...";
      submitBtn.classList.add("btn-loading");
    } else {
      submitBtn.disabled = false;
      btnSpinner.classList.add("hidden");
      btnSubmitIcon.classList.remove("hidden");
      btnSubmitText.textContent = "Kirim Data & Kuesioner";
      submitBtn.classList.remove("btn-loading");
    }
  }

  // ==========================================================================
  // NOTIFIKASI ALERT
  // ==========================================================================
  function showAlert(type, title, messageHtml) {
    statusAlert.className = `status-alert ${type}`;
    alertTitle.textContent = title;
    alertMessage.innerHTML = messageHtml;

    // Set SVG Icon sesuai tipe
    let iconSvg = "";
    if (type === "success") {
      iconSvg = `
        <svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--success-600)">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
        </svg>
      `;
    } else if (type === "error") {
      iconSvg = `
        <svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--error-600)">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      `;
    } else {
      iconSvg = `
        <svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--warning-600)">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
        </svg>
      `;
    }

    alertIcon.innerHTML = iconSvg;
    statusAlert.classList.remove("hidden");

    // Scroll ke alert agar terbaca jelas oleh user
    statusAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideAlert() {
    statusAlert.classList.add("hidden");
  }

  // ==========================================================================
  // MODAL RINGKASAN SUKSES
  // ==========================================================================
  function showSuccessModal(data, susInfo) {
    if (!successModal || !modalSummary) return;

    modalSummary.innerHTML = `
      <div class="modal-summary-row">
        <span>Nama Responden:</span>
        <strong>${escapeHtml(data.nama)}</strong>
      </div>
      <div class="modal-summary-row">
        <span>Peran:</span>
        <strong>${escapeHtml(data.peran)}</strong>
      </div>
      <div class="modal-summary-row">
        <span>Sumber Trafik:</span>
        <strong>${escapeHtml(data.sumber_trafik)}</strong>
      </div>
      <div class="modal-summary-row">
        <span>Tahap Funnel:</span>
        <strong>${escapeHtml(data.tahap_funnel)}</strong>
      </div>
      <div class="modal-summary-row">
        <span>Array Jawaban SUS:</span>
        <code>[${data.jawaban.join(", ")}]</code>
      </div>
      <div style="margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px;">
        <span class="sus-score-badge">
          Skor SUS Terhitung: ${susInfo.score} / 100 (${susInfo.grade} - ${susInfo.adjective})
        </span>
      </div>
    `;

    successModal.classList.remove("hidden");
  }

  function hideSuccessModal() {
    if (successModal) {
      successModal.classList.add("hidden");
    }
  }

  // ==========================================================================
  // RESET FORMULIR TOTAL
  // ==========================================================================
  function resetPortalForm() {
    form.reset();
    clearAllErrors();

    // Hapus kelas answered dari butir SUS
    susItems.forEach((item) => {
      item.classList.remove("answered");
      item.classList.remove("error");
    });

    // Reset progress tracker
    updateSusProgress();
  }

  // ==========================================================================
  // KALKULATOR SKOR SUS (SYSTEM USABILITY SCALE STANDARD FORMULA)
  // ==========================================================================
  // Rumus SUS:
  // Butir Ganjil (1, 3, 5, 7, 9): skor - 1
  // Butir Genap  (2, 4, 6, 8, 10): 5 - skor
  // Total Skor = Jumlah Kontribusi * 2.5 (Range 0 - 100)
  function calculateSusScore(answers) {
    if (!Array.isArray(answers) || answers.length !== 10) {
      return { score: 0, grade: "F", adjective: "Invalid" };
    }

    let sum = 0;
    for (let i = 0; i < answers.length; i++) {
      const val = answers[i];
      if (i % 2 === 0) {
        // Ganjil (indeks 0, 2, 4, 6, 8)
        sum += (val - 1);
      } else {
        // Genap (indeks 1, 3, 5, 7, 9)
        sum += (5 - val);
      }
    }

    const susScore = Number((sum * 2.5).toFixed(1));

    // Kategori SUS Berdasarkan Bangor et al. (2008)
    let grade = "F";
    let adjective = "Not Acceptable";

    if (susScore >= 80.3) {
      grade = "A";
      adjective = "Excellent";
    } else if (susScore >= 74) {
      grade = "B";
      adjective = "Good";
    } else if (susScore >= 68) {
      grade = "C";
      adjective = "OK / Marginal";
    } else if (susScore >= 51) {
      grade = "D";
      adjective = "Poor";
    }

    return {
      score: susScore,
      grade: grade,
      adjective: adjective
    };
  }

  // Helper Sanitasi HTML
  function escapeHtml(string) {
    const div = document.createElement("div");
    div.textContent = string;
    return div.innerHTML;
  }
});
