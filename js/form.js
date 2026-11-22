
const SUPABASE_URL = "https://hknolhwqrhikijilqmdv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrbm9saHdxcmhpa2lqaWxxbWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwNzkwNDMsImV4cCI6MjExMDY1NTA0M30.jaa5yl_5p1OhX_u_3kkajmcnCPUuhsMIQubhP8U2GfI";

// URL Webhook produksi n8n
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
        console.error(
          `Jawaban pertanyaan ${i + 1} belum dipilih.`
        );
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

  // Mengirim notifikasi email melalui n8n
  async function sendEmailNotification(data) {
    try {
      const body = new URLSearchParams({
        nama: data.nama,
        peran: data.peran,
        sumber_trafik: data.sumber_trafik,
        tahap_funnel: data.tahap_funnel,
        jawaban: JSON.stringify(data.jawaban),
        skor_sus: String(data.skor_sus)
      });

      await fetch(N8N_EMAIL_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        body: body
      });

      console.log(
        "Permintaan notifikasi sudah dikirim ke n8n. Periksa Executions untuk memastikan email berhasil."
      );

      // Tidak bisa memastikan email terkirim karena respons
      // tidak dapat dibaca dalam mode no-cors.
      return "unknown";

    } catch (error) {
      console.error(
        "Gagal mengirim notifikasi email:",
        error
      );

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
        throw new Error(
          "Mohon lengkapi seluruh data responden."
        );
      }

      // 2. Mengambil jawaban SUS
      const answers = getAnswers();

      if (!answers) {
        throw new Error(
          "Mohon jawab seluruh 10 pertanyaan SUS."
        );
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

      console.log(
        "Data berhasil disimpan ke Supabase."
      );

      // 6. Mengirim notifikasi email melalui n8n
      const emailStatus = await sendEmailNotification(record);

      // 7. Menampilkan hasil
      if (emailStatus === "unknown") {
        showAlert(
          "success",
          "Data Berhasil Disimpan!",
          `Data kuesioner atas nama ${escapeHtml(nama)} berhasil disimpan. Permintaan notifikasi sudah dikirim ke n8n. Status email perlu diperiksa melalui workflow n8n.`
        );
      } else {
        showAlert(
          "success",
          "Data Berhasil Disimpan!",
          `Data kuesioner atas nama ${escapeHtml(nama)} berhasil disimpan, tetapi permintaan notifikasi email gagal dikirim.`
        );
      }

      // 8. Menampilkan modal sukses jika tersedia
      if (typeof showSuccessModal === "function") {
        showSuccessModal(record, calculatedSus);
      }

      // 9. Reset form
      form.reset();

    } catch (error) {
      console.error(
        "Terjadi kesalahan:",
        error
      );

      showAlert(
        "danger",
        "Pengiriman Gagal!",
        escapeHtml(
          error.message ||
          "Terjadi kesalahan saat mengirim data."
        )
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
});
