
const SUPABASE_URL = "https://hknolhwqrhikijilqmdv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ptNdPgdUNE-9_8D98dNo-Q_pLoWx_JZ";

// URL Webhook n8n
// localhost hanya berlaku jika website dijalankan di komputer yang sama
const N8N_EMAIL_WEBHOOK_URL =
  "https://bobbed-unicycle-retry.ngrok-free.dev/webhook/sus-email-notification";

// Koneksi Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#susForm");

  if (!form) {
    console.error("Form SUS tidak ditemukan.");
    return;
  }

  // Mengambil nilai berdasarkan ID elemen HTML
  function getFieldValue(id) {
    const field = document.getElementById(id);
    return field ? field.value.trim() : "";
  }

  // Mengambil 10 jawaban SUS
  // Nama input: q_0 sampai q_9
  function getAnswers() {
    const answers = [];

    for (let i = 0; i < 10; i++) {
      const selected = form.querySelector(
        `input[name="q_${i}"]:checked`
      );

      if (!selected) {
        console.error(`Jawaban pertanyaan ${i + 1} belum dipilih.`);
        return null;
      }

      answers.push(Number(selected.value));
    }

    return answers;
  }

  // Menghitung skor SUS
  function calculateSUS(answers) {
    let totalScore = 0;

    answers.forEach((answer, index) => {
      const questionNumber = index + 1;

      if (questionNumber % 2 === 1) {
        totalScore += answer - 1;
      } else {
        totalScore += 5 - answer;
      }
    });

    return {
      score: Number((totalScore * 2.5).toFixed(2))
    };
  }

  // Mengirim notifikasi email ke n8n
  async function sendEmailNotification(data) {
    try {
      const response = await fetch(N8N_EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(
          `Webhook gagal dengan status ${response.status}`
        );
      }

      console.log("Notifikasi email berhasil dikirim.");
      return true;

    } catch (error) {
      console.error("Gagal mengirim notifikasi email:", error);
      return false;
    }
  }

  // Menampilkan pesan
  function showAlert(type, title, message) {
    const alertElement = document.querySelector("#alert");

    if (!alertElement) {
      alert(`${title}\n${message}`);
      return;
    }

    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
      <strong>${title}</strong>
      <p>${message}</p>
    `;

    alertElement.style.display = "block";
  }

  // Mengamankan teks HTML
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[char];
    });
  }

  // Proses submit form
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      // 1. Mengambil data identitas responden
      const nama = getFieldValue("nama");
      const peran = getFieldValue("peran");
      const sumber_trafik = getFieldValue("sumber_trafik");
      const tahap_funnel = getFieldValue("tahap_funnel");

      console.log("Nama:", nama);
      console.log("Peran:", peran);
      console.log("Sumber trafik:", sumber_trafik);
      console.log("Tahap funnel:", tahap_funnel);

      // Validasi identitas
      if (!nama || !peran || !sumber_trafik || !tahap_funnel) {
        throw new Error("Mohon lengkapi seluruh data responden.");
      }

      // 2. Mengambil jawaban SUS
      const answers = getAnswers();

      if (!answers) {
        throw new Error("Mohon jawab seluruh 10 pertanyaan SUS.");
      }

      console.log("Jawaban SUS:", answers);

      // 3. Menghitung skor SUS
      const calculatedSus = calculateSUS(answers);

      console.log("Skor SUS:", calculatedSus.score);

      // 4. Menyusun data responden
      const record = {
        nama: nama,
        peran: peran,
        sumber_trafik: sumber_trafik,
        tahap_funnel: tahap_funnel,
        jawaban: answers,
        skor_sus: calculatedSus.score
      };

      console.log("Data yang akan dikirim:", record);

      // 5. Menyimpan data ke Supabase
      const { error } = await supabaseClient
        .from("kuesioner_sus")
        .insert([record]);

      if (error) {
        throw error;
      }

      console.log("Data berhasil disimpan ke Supabase.");

      // 6. Mengirim notifikasi email melalui n8n
      const emailSent = await sendEmailNotification(record);

      // 7. Menampilkan hasil pengiriman
      if (emailSent) {
        showAlert(
          "success",
          "Pengiriman Berhasil!",
          `Data kuesioner atas nama ${escapeHtml(nama)} berhasil disimpan dan notifikasi email berhasil dikirim.`
        );
      } else {
        showAlert(
          "success",
          "Data Berhasil Disimpan!",
          `Data kuesioner atas nama ${escapeHtml(nama)} berhasil disimpan ke database, tetapi notifikasi email gagal dikirim.`
        );
      }

      // 8. Menampilkan modal sukses jika tersedia
      if (typeof showSuccessModal === "function") {
        showSuccessModal(record, calculatedSus);
      }

      // 9. Reset form
      form.reset();

    } catch (error) {
      console.error("Terjadi kesalahan:", error);

      showAlert(
        "danger",
        "Pengiriman Gagal!",
        escapeHtml(
          error.message || "Terjadi kesalahan saat mengirim data."
        )
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
});
