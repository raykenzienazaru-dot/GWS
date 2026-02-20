// ================= NAVBAR EFFECTS =================

// Navbar scroll effect - FIXED (aman)
window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar-aquacheck");
  if (!navbar) return; // Mencegah error jika navbar tidak ada

  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Active nav link
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function () {
    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.remove("active"));
    this.classList.add("active");
  });
});

// Navbar toggler animation - FIXED (aman)
const toggler = document.querySelector(".icon-toggler");
const navbarCollapse = document.getElementById("navbarContent");

if (navbarCollapse && toggler) { // Cek keberadaan elemen
  navbarCollapse.addEventListener("show.bs.collapse", () => {
    toggler.classList.add("active");
  });

  navbarCollapse.addEventListener("hide.bs.collapse", () => {
    toggler.classList.remove("active");
  });
}

// ================= HISTORY STORAGE =================

let historyData = JSON.parse(
  localStorage.getItem("aircek_history") || "[]"
);

function saveToHistory(query, response, status) {
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleString("id-ID"),
    query: query,
    response: response,
    status: status,
  };

  historyData.unshift(entry);
  if (historyData.length > 20) historyData.pop();

  localStorage.setItem("aircek_history", JSON.stringify(historyData));
  updateHistoryDisplay();
}

function clearHistory() {
  if (confirm("Apakah Anda yakin ingin menghapus semua riwayat analisis?")) {
    localStorage.removeItem("aircek_history");
    historyData = [];
    updateHistoryDisplay();
    showToast("Riwayat berhasil dihapus", "success");
  }
}

// Fungsi untuk menampilkan toast/notifikasi
function showToast(message, type = "info") {
  // Cek apakah toast container sudah ada
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast-message toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Hapus toast setelah 3 detik
  setTimeout(() => {
    toast.remove();
    if (toastContainer.children.length === 0) {
      toastContainer.remove();
    }
  }, 3000);
}

function updateHistoryDisplay() {
  const container = document.getElementById("historyContainer");
  if (!container) return;

  if (historyData.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted">
        <i class="fas fa-inbox fa-3x mb-3 floating"></i>
        <p>Belum ada riwayat analisis.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">Riwayat Analisis (${historyData.length})</h6>
      <button onclick="clearHistory()" class="btn btn-sm btn-outline-danger">
        <i class="fas fa-trash me-1"></i>Hapus Semua
      </button>
    </div>
    ${historyData.map(
      (entry) => `
      <div class="history-card">
        <div class="history-header">
          <div>
            <i class="fas fa-clock me-2 text-muted"></i>
            <span class="history-date">${entry.date}</span>
          </div>
          <span class="status-badge status-${
            entry.status === "Layak" ? "layak" : "tidak-layak"
          }">
            ${entry.status}
          </span>
        </div>
        <div class="mb-2">
          <strong><i class="fas fa-question-circle me-2 text-primary"></i>Pertanyaan:</strong>
          <p class="mb-0 mt-1">${escapeHTML(entry.query)}</p>
        </div>
        <div>
          <strong><i class="fas fa-robot me-2 text-primary"></i>Hasil:</strong>
          <div class="mt-1" style="font-size: 13px;">${entry.response}</div>
        </div>
      </div>
    `
    ).join("")}`;
}

// ================= CHAT HELPER FUNCTIONS =================

// Fungsi escape HTML untuk mencegah XSS - FIXED
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addBubble(text, sender) {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) return;
  
  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender}`;
  
  // Mencegah XSS: gunakan textContent dulu, lalu replace newline
  bubble.textContent = text;
  bubble.innerHTML = bubble.innerHTML.replace(/\n/g, "<br>");
  
  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function removeLastBotBubble() {
  const chatBody = document.getElementById("chatBody");
  const bots = chatBody.querySelectorAll(".bubble.bot");
  if (bots.length > 0) bots[bots.length - 1].remove();
}

function addTypingIndicator() {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) return;
  
  const indicator = document.createElement("div");
  indicator.className = "bubble bot typing-indicator";
  indicator.id = "typing";
  indicator.innerHTML = "<span></span><span></span><span></span>";
  chatBody.appendChild(indicator);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing");
  if (indicator) indicator.remove();
}

// ================= AI ENGINE (DENGAN PERBAIKAN) =================

function AIR_AI(input) {
  const q = input.toLowerCase().trim();
  
  // Mode edukasi
  if (q.includes("apa itu") || q.includes("apa yang dimaksud") || q.includes("definisi")) {
    return getEducationalContent(q);
  }
  
  // Reset variabel analisis dengan sistem flag yang lebih baik
  let statusObj = { 
    status: "Layak",
    isCritical: false // Flag untuk masalah kritis
  };
  let alasan = [];
  let solusi = [];
  let parameterTerdeteksi = [];
  
  // ===== DETEKSI MULTI-PARAMETER =====
  
  // Deteksi pH dengan validasi ekstrem
  const phRegex = /ph\s*[:=]?\s*(\d+(\.\d+)?)/i;
  const phMatch = q.match(phRegex);
  if (phMatch) {
    let ph = parseFloat(phMatch[1]);
    
    // Validasi nilai ekstrem
    if (ph < 0 || ph > 14) {
      statusObj.status = "Tidak Layak";
      statusObj.isCritical = true;
      alasan.push(" Nilai pH tidak realistis (harus antara 0-14)");
      solusi.push(" Periksa kembali pengukuran pH");
    } else {
      parameterTerdeteksi.push(`pH: ${ph}`);
      analyzePH(ph, alasan, solusi, statusObj);
    }
  }
  
  // Deteksi TDS dengan validasi ekstrem
  const tdsRegex = /tds\s*[:=]?\s*(\d+)/i;
  const tdsMatch = q.match(tdsRegex);
  if (tdsMatch) {
    let tds = parseInt(tdsMatch[1]);
    
    if (tds < 0 || tds > 10000) {
      alasan.push(" Nilai TDS tidak realistis (0-10,000 ppm)");
      statusObj.isCritical = true;
    } else {
      parameterTerdeteksi.push(`TDS: ${tds} ppm`);
      analyzeTDS(tds, alasan, solusi, statusObj);
    }
  }
  
  // Deteksi kekeruhan dengan validasi
  const turbidityMatch = q.match(/kekeruhan\s*[:=]?\s*(\d+(\.\d+)?)/i);
  if (turbidityMatch) {
    let turbidity = parseFloat(turbidityMatch[1]);
    
    if (turbidity < 0 || turbidity > 1000) {
      alasan.push(" Nilai kekeruhan tidak realistis");
      statusObj.isCritical = true;
    } else {
      parameterTerdeteksi.push(`Kekeruhan: ${turbidity} NTU`);
      analyzeTurbidity(turbidity, alasan, solusi, statusObj);
    }
  }

  // Deteksi kondisi fisik air
  analyzePhysicalConditions(q, alasan, solusi, statusObj);
  
  // Deteksi klorin dengan validasi
  const chlorineMatch = q.match(/klorin\s*[:=]?\s*(\d+(\.\d+)?)/i);
  if (chlorineMatch) {
    let chlorine = parseFloat(chlorineMatch[1]);
    
    if (chlorine < 0 || chlorine > 50) {
      alasan.push(" Nilai klorin tidak realistis");
      statusObj.isCritical = true;
    } else {
      parameterTerdeteksi.push(`Klorin: ${chlorine} mg/L`);
      analyzeChlorine(chlorine, alasan, solusi, statusObj);
    }
  }
  
  // Deteksi kesadahan dengan validasi
  const hardnessMatch = q.match(/kesadahan\s*[:=]?\s*(\d+)/i);
  if (hardnessMatch) {
    let hardness = parseInt(hardnessMatch[1]);
    
    if (hardness < 0 || hardness > 5000) {
      alasan.push(" Nilai kesadahan tidak realistis");
      statusObj.isCritical = true;
    } else {
      parameterTerdeteksi.push(`Kesadahan: ${hardness} mg/L`);
      analyzeHardness(hardness, alasan, solusi, statusObj);
    }
  }
  
  // Deteksi logam berat
  analyzeHeavyMetals(q, alasan, solusi, statusObj, parameterTerdeteksi);
  
  // ===== TANGGAPAN UNTUK INPUT KOSONG =====
  if (parameterTerdeteksi.length === 0 && alasan.length === 0) {
    return generateDefaultResponse();
  }
  
  // ===== FORMAT JAWABAN =====
  const response = generateFinalResponse(statusObj, alasan, solusi, parameterTerdeteksi);
  
  // Save to history
  saveToHistory(input, response, statusObj.status);
  
  return response;
}

// ================= FUNGSI ANALISIS INDIVIDUAL (DENGAN VALIDASI) =================

function analyzePH(ph, alasan, solusi, statusObj) {
  if (ph < 6.5) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` pH ${ph} terlalu asam (di bawah 6,5)`);
    solusi.push(" Netralkan dengan filter alkali atau tambahkan kapur");
    solusi.push(" Pertimbangkan sistem reverse osmosis dengan remineralisasi");
  } else if (ph > 8.5) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` pH ${ph} terlalu basa (di atas 8,5)`);
    solusi.push(" Netralkan dengan filter asam atau tambahkan asam organik lemah");
    solusi.push(" Gunakan filter dengan media penetral pH");
  } else if (ph >= 7.0 && ph <= 7.5) {
    alasan.push(` pH ${ph} optimal untuk konsumsi manusia`);
  } else {
    alasan.push(` pH ${ph} dalam batas aman (6,5-8,5)`);
  }
}

function analyzeTDS(tds, alasan, solusi, statusObj) {
  if (tds > 1000) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` TDS ${tds} ppm sangat tinggi (berbahaya untuk dikonsumsi)`);
    solusi.push(" Gunakan sistem reverse osmosis (RO)");
    solusi.push(" Pertimbangkan distilasi air");
    solusi.push(" Konsultasikan dengan ahli kualitas air");
  } else if (tds > 500) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` TDS ${tds} ppm melebihi batas maksimal 500 ppm`);
    solusi.push(" Gunakan filter reverse osmosis");
    solusi.push(" Pertimbangkan filter ultrafiltrasi");
  } else if (tds > 300) {
    alasan.push(` TDS ${tds} ppm masih dalam batas layak minum (<500 ppm)`);
    solusi.push(" Pertahankan dengan filter karbon aktif untuk rasa yang lebih baik");
  } else if (tds > 50) {
    alasan.push(` TDS ${tds} ppm sangat baik untuk konsumsi`);
  } else {
    alasan.push(` TDS ${tds} ppm sangat rendah, kurang mineral`);
    solusi.push(" Pertimbangkan untuk remineralisasi air setelah penyaringan");
  }
}

function analyzeTurbidity(turbidity, alasan, solusi, statusObj) {
  if (turbidity > 5) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` Kekeruhan ${turbidity} NTU terlalu tinggi (>5 NTU)`);
    solusi.push(" Gunakan filter sedimentasi atau multi-media filter");
    solusi.push(" Pertimbangkan koagulasi-flokulasi sebelum penyaringan");
  } else if (turbidity > 1) {
    alasan.push(` Kekeruhan ${turbidity} NTU dalam batas aman (<5 NTU)`);
    solusi.push(" Filter sedimen 5 mikron dapat meningkatkan kejernihan");
  } else {
    alasan.push(` Kekeruhan ${turbidity} NTU sangat baik`);
  }
}

function analyzePhysicalConditions(q, alasan, solusi, statusObj) {
  if (q.includes("keruh") || q.includes("kabur") || q.includes("tidak jernih")) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(" Air keruh menunjukkan adanya partikel tersuspensi");
    solusi.push(" Gunakan filter sedimentasi");
    solusi.push(" Lakukan penyaringan bertahap (sand filter kemudian cartridge filter)");
  }
  
  if (q.includes("bau") || q.includes("anyir") || q.includes("amis")) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(" Air berbau menunjukkan kontaminasi organik atau kimia");
    solusi.push(" Gunakan filter karbon aktif untuk menghilangkan bau");
    solusi.push(" Pertimbangkan aerasi untuk bau yang disebabkan oleh gas");
  }
  
  if (q.includes("berwarna") || q.includes("kuning") || q.includes("coklat") || q.includes("kehijauan")) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(" Air berwarna menunjukkan kontaminasi logam atau organik");
    solusi.push(" Gunakan filter dengan media khusus penyerap warna");
    solusi.push(" Pertimbangkan sistem filtrasi multi-tahap dengan oksidasi");
  }
  
  if (q.includes("rasa") && (q.includes("aneh") || q.includes("tidak enak") || q.includes("logam"))) {
    alasan.push(" Rasa tidak enak dapat berasal dari mineral atau kontaminan");
    solusi.push(" Filter karbon aktif biasanya efektif menghilangkan rasa tidak enak");
  }
}

function analyzeChlorine(chlorine, alasan, solusi, statusObj) {
  if (chlorine > 5) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` Klorin ${chlorine} mg/L berbahaya (maksimal 4 mg/L)`);
    solusi.push(" Biarkan air dalam wadah terbuka 24 jam untuk menguapkan klorin");
    solusi.push(" Gunakan filter karbon aktif untuk menghilangkan klorin");
  } else if (chlorine > 2) {
    alasan.push(` Klorin ${chlorine} mg/L tinggi tetapi masih dalam batas aman`);
    solusi.push(" Filter karbon aktif akan menghilangkan klorin berlebih");
  } else if (chlorine > 0.2) {
    alasan.push(` Klorin ${chlorine} mg/L optimal untuk disinfeksi residu`);
  } else {
    alasan.push(" Klorin sangat rendah, risiko kontaminasi bakteri");
    solusi.push(" Pertimbangkan disinfeksi sebelum konsumsi");
  }
}

function analyzeHardness(hardness, alasan, solusi, statusObj) {
  if (hardness > 500) {
    statusObj.status = "Tidak Layak";
    statusObj.isCritical = true;
    alasan.push(` Kesadahan ${hardness} mg/L sangat tinggi (>500 mg/L)`);
    solusi.push(" Gunakan softener air atau sistem reverse osmosis");
    solusi.push(" Pertimbangkan pelunakan dengan resin penukar ion");
  } else if (hardness > 300) {
    alasan.push(` Kesadahan ${hardness} mg/L tinggi (dapat menyebabkan kerak)`);
    solusi.push(" Filter pelunak air dapat mengurangi kesadahan");
  } else if (hardness > 60) {
    alasan.push(` Kesadahan ${hardness} mg/L dalam batas normal`);
  } else {
    alasan.push(` Kesadahan ${hardness} mg/L rendah (air lunak)`);
  }
}

function analyzeHeavyMetals(q, alasan, solusi, statusObj, parameterTerdeteksi) {
  const metals = {
    "timbal": {max: 0.01, unit: "mg/L", nama: "Timbal (Pb)"},
    "merkuri": {max: 0.006, unit: "mg/L", nama: "Merkuri (Hg)"},
    "arsen": {max: 0.01, unit: "mg/L", nama: "Arsen (As)"},
    "kadmium": {max: 0.003, unit: "mg/L", nama: "Kadmium (Cd)"},
    "tembaga": {max: 2, unit: "mg/L", nama: "Tembaga (Cu)"}
  };
  
  for (const [metal, info] of Object.entries(metals)) {
    const regex = new RegExp(`${metal}\\s*[:=]?\\s*(\\d+(\\.\\d+)?)`, "i");
    const match = q.match(regex);
    
    if (match) {
      const value = parseFloat(match[1]);
      
      // Validasi nilai ekstrem
      if (value < 0 || value > 100) {
        alasan.push(` Nilai ${info.nama} tidak realistis`);
        statusObj.isCritical = true;
        continue;
      }
      
      parameterTerdeteksi.push(`${info.nama}: ${value} ${info.unit}`);
      
      if (value > info.max) {
        statusObj.status = "Tidak Layak";
        statusObj.isCritical = true;
        alasan.push(`${info.nama} ${value} ${info.unit} melebihi batas maksimal ${info.max} ${info.unit}`);
        solusi.push(` Gunakan filter khusus penyerap logam berat seperti media KDF`);
        solusi.push(` Sistem reverse osmosis efektif menghilangkan logam berat`);
      } else {
        alasan.push(`${info.nama} dalam batas aman`);
      }
    }
  }
}

// ================= FUNGSI RESPONS EDUKASI =================

function getEducationalContent(q) {
  if (q.includes("ph")) {
 return `EDUKASI: Apa itu pH Air?

Definisi: pH adalah ukuran keasaman atau kebasaan air pada skala 0–14.
• pH < 7: Asam (semakin kecil semakin asam)
• pH = 7: Netral
• pH > 7: Basa/Alkali (semakin besar semakin basa)

pH Air Minum Ideal: 6.5 – 8.5
• Terlalu asam (<6.5): Dapat mengikis pipa dan mengandung logam berat terlarut
• Terlalu basa (>8.5): Rasa pahit dan dapat menyebabkan pengendapan mineral

Pengaruh pH terhadap kesehatan:
- pH optimal membantu menjaga keseimbangan asam–basa tubuh
- Air dengan pH ekstrem dapat mengganggu pencernaan

Cara mengukur:
Gunakan pH meter, kertas lakmus, atau pH strip`;

  }
  
  if (q.includes("tds")) {
    return `EDUKASI: Apa itu TDS (Total Dissolved Solids)?
Definisi : TDS adalah total zat padat terlarut dalam air, diukur dalam ppm (parts per million).
Komponen TDS
- Mineral alami (kalsium, magnesium, natrium)
- Garam anorganik
- Logam terlarut
- Zat organik tertentu
Standar TDS Air Minum
•  50 ppm: Sangat rendah, hampir murni
• 50-150 ppm : Ideal untuk konsumsi
• 150-300 ppm: Baik untuk kesehatan (mengandung mineral)
• 300-500 ppm : Masih dapat diterima
•  500 ppm : Tidak direkomendasikan untuk minum jangka panjang
• 1000 ppm : Tidak layak minum
TDS tinggi tidak selalu buruk
Air dengan TDS 200-400 ppm dari mineral alami lebih sehat daripada air dengan TDS rendah tetapi terkontaminasi.`;
  }
  
  if (q.includes("kekeruhan")) {
return `EDUKASI: Apa itu Kekeruhan Air?

Definisi: Kekeruhan mengukur kejernihan air dan disebabkan oleh partikel tersuspensi.

Penyebab kekeruhan:
- Partikel tanah liat, lumpur, sedimen
- Mikroorganisme (alga, bakteri)
- Zat organik terdekomposisi
- Polutan industri

Satuan pengukuran:
NTU (Nephelometric Turbidity Units)

Standar kekeruhan air minum:
• < 1 NTU: Sangat jernih
• 1–5 NTU: Dapat diterima
• > 5 NTU: Tidak layak minum (membutuhkan pengolahan)

Bahaya air keruh:
- Dapat menyembunyikan patogen berbahaya
- Mengurangi efektivitas disinfeksi
- Menunjukkan kemungkinan kontaminasi`;

  }
  if (q.includes("klorin")) {
 return ` EDUKASI: Klorin dalam Air

Fungsi:
Disinfektan untuk membunuh bakteri dan virus.

Standar dalam air minum:
• Maksimal: 4 mg/L (WHO)
• Optimal residual: 0.2–0.5 mg/L (setelah pengolahan)

Bahaya kelebihan klorin:
- Iritasi kulit dan mata
- Rasa dan bau tidak enak
- Membentuk trihalometana (THM) yang berpotensi karsinogenik

Cara menghilangkan:
Filter karbon aktif, aerasi, atau didiamkan selama 24 jam.`;

  }
   if (q.includes("kualitas air")) {
return `📚 EDUKASI: Parameter Kualitas Air

Parameter utama untuk menilai air layak minum:

1. pH (6.5–8.5): Keasaman air
2. TDS (< 500 ppm): Total zat terlarut
3. Kekeruhan (< 5 NTU): Kejernihan air
4. Klorin (< 4 mg/L): Disinfektan residual
5. Kesadahan (60–300 mg/L): Kandungan mineral kalsium dan magnesium
6. Kondisi fisik: Jernih, tidak berbau, tidak berwarna
7. Logam berat: Timbal, merkuri, arsen (harus sangat rendah)

Ketik "apa itu [parameter]" untuk penjelasan detail, contoh: "apa itu pH"`;


   }
}

// ================= FUNGSI PEMBANTU =================

function generateDefaultResponse() {
 return `AIR-AI Enhanced siap membantu!

Contoh input multi-parameter:
• "pH 7.5, TDS 300, air jernih"
• "TDS=450, pH:6.2, air sedikit keruh"
• "Kekeruhan 3 NTU, kesadahan 250 mg/L"
• "pH 8, TDS 600, klorin 1.5"

Untuk edukasi, tanyakan:
• "Apa itu pH?"
• "Definisi TDS"
• "Apa yang dimaksud dengan kekeruhan air?"

Parameter yang didukung:
1. pH (6.5–8.5)
2. TDS (Total Dissolved Solids)
3. Kekeruhan (NTU)
4. Klorin (mg/L)
5. Kesadahan (mg/L)
6. Logam berat (timbal, merkuri, arsen, dll)
7. Kondisi fisik (jernih, keruh, bau, berwarna)`;


}

function generateFinalResponse(statusObj, alasan, solusi, parameterTerdeteksi) {
  const status = statusObj.status;
  
  // Hitung skor kualitas air
  const waterScore = calculateWaterScore(statusObj, alasan, parameterTerdeteksi);
  
  // Tentukan confidence level
  let confidenceLevel = "Sedang";
  if (parameterTerdeteksi.length >= 3) confidenceLevel = "Tinggi";
  if (parameterTerdeteksi.length === 1) confidenceLevel = "Rendah";
  
  let response = `ANALISIS KUALITAS AIR`;
  
  if (parameterTerdeteksi.length > 0) {
    response += `Parameter Terdeteksi`;
    parameterTerdeteksi.forEach(p => response += `• ${escapeHTML(p)}<br>`);
    response += `<br>`;
  }
  
  const icon = status === "Layak" ? "✅" : "❌";

response += `
Status: ${icon} ${status === "Layak" ? "LAYAK KONSUMSI" : "TIDAK LAYAK KONSUMSI"}

Analisis:
`;

alasan.forEach(a => {
  response += `• ${escapeHTML(a)}\n`;
});

if (solusi.length > 0) {
  response += `
Rekomendasi Perbaikan:
`;
  solusi.forEach(s => {
    response += `- ${escapeHTML(s)}\n`;
  });
}

  
  // Tambahkan skor kualitas air
 response += `

Skor Kualitas Air: ${waterScore}/100`;

// Tambahkan confidence level
response += `
Tingkat Keyakinan Analisis: ${confidenceLevel}`;

  // Tambahkan tips berdasarkan status
 if (status === "Tidak Layak") {
  response += `

PERINGATAN:
Air ini tidak direkomendasikan untuk dikonsumsi langsung tanpa pengolahan terlebih dahulu.`;
} else {
  response += `

Tips:
Meskipun layak, selalu pastikan air disimpan dalam wadah bersih dan terlindung dari kontaminasi.`;
}

  // Tambahkan saran edukasi
response += `

Ingin belajar lebih?
Tanyakan "apa itu [parameter]" untuk penjelasan detail.`;

// Disclaimer akademik (NILAI TAMBAH UNTUK LOMBA)
response += `

Catatan:
Hasil analisis bersifat estimasi berbasis logika AI dan tidak menggantikan uji laboratorium.
Konsultasikan dengan ahli untuk diagnosis yang lebih akurat.`;

  return response;
}

// Fungsi hitung skor kualitas air (dimanfaatkan)
function calculateWaterScore(statusObj, alasan, parameterTerdeteksi) {
  let score = 70; // Skor dasar
  
  // Pengaruh status
  if (statusObj.status === "Layak") score += 20;
  if (statusObj.status === "Tidak Layak") score -= 30;
  
  // Pengaruh jumlah parameter
  score += Math.min(parameterTerdeteksi.length * 3, 10); // Maks +10
  
  // Pengaruh alasan kritis
  if (statusObj.isCritical) score -= 20;
  
  // Pastikan skor dalam rentang 0-100
  score = Math.max(0, Math.min(100, score));
  
  return Math.round(score);
}

// ================= FUNGSI SEND MESSAGE =================

function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  
  if (!message) return;
  
  // Tampilkan pesan user
  addBubble(escapeHTML(message), "user");
  input.value = "";
  
  // Tampilkan typing indicator
  addTypingIndicator();
  
  // Kirim ke AI dan dapatkan respons
  setTimeout(() => {
    removeTypingIndicator();
    const response = AIR_AI(message);
    addBubble(response, "bot");
  }, 1000);
}

// ================= ENTER KEY =================

const chatInput = document.getElementById("chatInput");
if (chatInput) {
  chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ================= IMAGE UPLOAD PREVIEW =================

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");

if (imageInput && imagePreview && previewImg) {
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Harap upload file gambar!", "warning");
      return;
    }

    // Validasi ukuran file (maks 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran file terlalu besar (maks 5MB)", "warning");
      this.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      imagePreview.classList.remove("d-none");

      previewImg.onload = () => {
        addTypingIndicator();
        
        setTimeout(() => {
          removeTypingIndicator();
          
          const result = analyzePHFromImage(previewImg);

          let status = "LAYAK";
          let solusi = "Air aman untuk diminum";
          let confidence = "Rendah"; // Confidence untuk analisis gambar

          if (result.ph < 6.5 || result.ph > 8.5) {
            status = "TIDAK LAYAK";
            solusi = result.ph < 6.5
              ? "Air terlalu asam, gunakan filter penetral pH"
              : "Air terlalu basa, gunakan filter penurun pH";
          }

          const response = `HASIL ANALISIS FOTO pH<br><br>
• Warna terdeteksi: ${result.label}<br>
• Perkiraan pH: ${result.ph}<br>
• Status: ${status}<br>
• Solusi: ${solusi}<br>
• 🎯 Tingkat keyakinan: ${confidence}<br><br>
<small><i>Catatan: Analisis warna bersifat estimasi visual dan tidak seakurat pH meter.</i></small>`;


          addBubble(response, "bot");
          saveToHistory(
            "Upload foto analisis pH",
            response,
            status === "LAYAK" ? "Layak" : "Tidak Layak"
          );
        }, 1500);
      };
    };

    reader.readAsDataURL(file);
  });
}

function removeImage() {
  if (imageInput && imagePreview && previewImg) {
    imageInput.value = "";
    imagePreview.classList.add("d-none");
    previewImg.src = "";
  }
}

// ================= ANALISIS WARNA pH (AI SEDERHANA) =================

const pHColorMap = [
  { ph: 2, color: [255, 0, 0], label: "Merah (Sangat Asam)" },
  { ph: 4, color: [255, 165, 0], label: "Oranye (Asam)" },
  { ph: 6, color: [255, 255, 0], label: "Kuning (Agak Asam)" },
  { ph: 7, color: [0, 255, 0], label: "Hijau (Netral)" },
  { ph: 8, color: [0, 128, 255], label: "Biru Muda (Agak Basa)" },
  { ph: 10, color: [0, 0, 255], label: "Biru (Basa)" },
  { ph: 12, color: [128, 0, 128], label: "Ungu (Sangat Basa)" }
];

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

function analyzePHFromImage(imgElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = Math.min(imgElement.width, 200); // Batasi ukuran untuk performa
  canvas.height = Math.min(imgElement.height, 200);
  
  // Gambar gambar ke canvas
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let r = 0, g = 0, b = 0, count = 0;

  // Ambil sampel acak untuk performa
  for (let i = 0; i < imageData.length; i += 16) { // Ambil setiap 4 pixel (16 byte)
    r += imageData[i];
    g += imageData[i + 1];
    b += imageData[i + 2];
    count++;
  }

  if (count === 0) count = 1; // Hindari pembagian nol
  
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return detectPH([r, g, b]);
}

function detectPH(rgb) {
  let closest = pHColorMap[0];
  let minDist = Infinity;

  pHColorMap.forEach(item => {
    const dist = colorDistance(rgb, item.color);
    if (dist < minDist) {
      minDist = dist;
      closest = item;
    }
  });

  return closest;
}

// ================= FITUR TAMBAHAN =================

// Rekomendasi filter berdasarkan masalah
function recommendFilterSystem(problems) {
  const recommendations = [];
  
  if (problems.includes("TDS tinggi")) {
    recommendations.push("Sistem Reverse Osmosis (RO)");
  }
  
  if (problems.includes("pH tidak normal")) {
    recommendations.push("Filter penetral pH dengan media calcite/calcium carbonate");
  }
  
  if (problems.includes("kekeruhan")) {
    recommendations.push("Multi-media filter (sand, carbon, sediment)");
  }
  
  if (problems.includes("bau")) {
    recommendations.push("Filter karbon aktif granular");
  }
  
  if (problems.includes("logam berat")) {
    recommendations.push("Filter dengan media KDF atau zeolit");
  }
  
  return recommendations;
}

// Database parameter standar
const waterStandards = {
  "pH": { min: 6.5, max: 8.5, unit: "", ideal: "7.0-7.5" },
  "TDS": { min: 50, max: 500, unit: "ppm", ideal: "50-150" },
  "Turbidity": { min: 0, max: 5, unit: "NTU", ideal: "<1" },
  "Chlorine": { min: 0.2, max: 4, unit: "mg/L", ideal: "0.2-0.5" },
  "Hardness": { min: 60, max: 300, unit: "mg/L", ideal: "60-120" },
  "Lead": { min: 0, max: 0.01, unit: "mg/L", ideal: "0" },
  "Mercury": { min: 0, max: 0.006, unit: "mg/L", ideal: "0" }
};

// Fungsi untuk menampilkan semua standar
function showAllStandards() {
  let standardsText = "<b>📋 STANDAR KUALITAS AIR MINUM</b>:<br><br>";
  
  for (const [param, data] of Object.entries(waterStandards)) {
    standardsText += `<b>${param}</b>: ${data.min}-${data.max} ${data.unit} (Ideal: ${data.ideal} ${data.unit})<br>`;
  }
  
  standardsText += "<br><small><i>Sumber: Permenkes No. 492/MENKES/PER/IV/2010</i></small>";
  
  return standardsText;
}

// ================= CSS TOAST STYLE =================
function addToastStyles() {
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-message {
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        max-width: 300px;
      }
      
      .toast-success {
        background: linear-gradient(135deg, #28a745, #20c997);
        border-left: 4px solid #1e7e34;
      }
      
      .toast-warning {
        background: linear-gradient(135deg, #ffc107, #fd7e14);
        border-left: 4px solid #d39e00;
      }
      
      .toast-info {
        background: linear-gradient(135deg, #17a2b8, #007bff);
        border-left: 4px solid #117a8b;
      }
      
      .toast-error {
        background: linear-gradient(135deg, #dc3545, #c82333);
        border-left: 4px solid #bd2130;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// ================= INITIALIZE =================

// Tambahkan style toast
addToastStyles();

// Initialize history display on page load
document.addEventListener('DOMContentLoaded', function() {
  updateHistoryDisplay();
  
  // Tambahkan event listener untuk tombol enter jika chatInput ada
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Auto-focus pada input chat jika ada
  if (chatInput) {
    setTimeout(() => {
      chatInput.focus();
    }, 500);
  }
});
// ================= IOT DASHBOARD STATE =================
let latestIoT = {
  deviceId: "sofia_esp32",
  ph: null,
  tds: null,
  lat: null,
  lng: null,
  ts: null
};

function nowLocalID() {
  return new Date().toLocaleString("id-ID");
}

function setMQTTStatus(status) {
  const badge = document.getElementById("mqttStatusBadge");
  if (!badge) return;

  if (status === "CONNECTED") {
    badge.className = "badge bg-success";
    badge.textContent = "CONNECTED";
  } else if (status === "CONNECTING") {
    badge.className = "badge bg-warning text-dark";
    badge.textContent = "CONNECTING";
  } else {
    badge.className = "badge bg-secondary";
    badge.textContent = "DISCONNECTED";
  }
}

function updateRealtimeCards() {
  const phEl = document.getElementById("phRealtime");
  const tdsEl = document.getElementById("tdsRealtime");
  const lastUpdateEl = document.getElementById("lastUpdateText");
  const phBadge = document.getElementById("phBadge");
  const tdsBadge = document.getElementById("tdsBadge");

  if (lastUpdateEl) lastUpdateEl.textContent = latestIoT.ts ? nowLocalID() : "-";

  if (phEl) phEl.textContent = latestIoT.ph ?? "--";
  if (tdsEl) tdsEl.textContent = latestIoT.tds ?? "--";

  if (phBadge) {
    const ph = latestIoT.ph;
    if (typeof ph !== "number") {
      phBadge.className = "badge bg-secondary";
      phBadge.textContent = "-";
    } else if (ph >= 6.5 && ph <= 8.5) {
      phBadge.className = "badge bg-success";
      phBadge.textContent = "AMAN";
    } else {
      phBadge.className = "badge bg-danger";
      phBadge.textContent = "TIDAK AMAN";
    }
  }

  if (tdsBadge) {
    const tds = latestIoT.tds;
    if (typeof tds !== "number") {
      tdsBadge.className = "badge bg-secondary";
      tdsBadge.textContent = "-";
    } else if (tds <= 300) {
      tdsBadge.className = "badge bg-success";
      tdsBadge.textContent = "BAIK";
    } else if (tds <= 500) {
      tdsBadge.className = "badge bg-warning text-dark";
      tdsBadge.textContent = "CUKUP";
    } else {
      tdsBadge.className = "badge bg-danger";
      tdsBadge.textContent = "TINGGI";
    }
  }
}

// ================= CHARTS =================
let phChartObj = null;
let tdsChartObj = null;

function initCharts() {
  const phCanvas = document.getElementById("phChart");
  const tdsCanvas = document.getElementById("tdsChart");
  if (!phCanvas || !tdsCanvas || typeof Chart === "undefined") return;

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { ticks: { maxTicksLimit: 4 } }
    }
  };

  phChartObj = new Chart(phCanvas, {
    type: "line",
    data: { labels: [], datasets: [{ data: [], borderColor: "#1a73e8", tension: 0.35 }] },
    options: baseOptions
  });

  tdsChartObj = new Chart(tdsCanvas, {
    type: "line",
    data: { labels: [], datasets: [{ data: [], borderColor: "#0d47a1", tension: 0.35 }] },
    options: baseOptions
  });
}

function pushChartPoint(chartObj, value) {
  if (!chartObj || typeof value !== "number") return;
  const labels = chartObj.data.labels;
  const data = chartObj.data.datasets[0].data;

  labels.push("");
  data.push(value);

  const MAX_POINTS = 30;
  if (data.length > MAX_POINTS) {
    labels.shift();
    data.shift();
  }

  chartObj.update();
}

// ================= MQTT SETUP =================
// Catatan: kredensial hardcode sebaiknya dipindah ke backend/config.
// Untuk sekarang mengikuti kebutuhanmu.
const mqttOptions = {
  username: "sofia_esp32",
  password: "sofia123",
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 3000
};

const MQTT_BROKER_URL = "wss://h6c5ea94.ala.asia-southeast1.emqxsl.com:8084/mqtt";
const DEVICE_ID = "sofia_esp32";
const TOPIC_SENSORS = `aircek/${DEVICE_ID}/sensors`;

let mqttClient = null;

function connectMQTT() {
  const brokerText = document.getElementById("mqttBrokerText");
  if (brokerText) brokerText.textContent = MQTT_BROKER_URL;

  setMQTTStatus("CONNECTING");

  mqttClient = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

  mqttClient.on("connect", () => {
    setMQTTStatus("CONNECTED");
    mqttClient.subscribe([TOPIC_SENSORS], (err) => {
      if (err) showToast("Gagal subscribe topic IoT", "error");
    });
  });

  mqttClient.on("reconnect", () => setMQTTStatus("CONNECTING"));
  mqttClient.on("close", () => setMQTTStatus("DISCONNECTED"));
  mqttClient.on("error", () => setMQTTStatus("DISCONNECTED"));

  mqttClient.on("message", (topic, payload) => {
    if (topic !== TOPIC_SENSORS) return;

    let msg;
    try {
      msg = JSON.parse(payload.toString());
    } catch {
      showToast("Payload IoT bukan JSON valid", "warning");
      return;
    }

    // Normalisasi
    latestIoT.deviceId = msg.deviceId || DEVICE_ID;
    if (typeof msg.ph === "number") latestIoT.ph = msg.ph;
    if (typeof msg.tds === "number") latestIoT.tds = msg.tds;
    if (typeof msg.lat === "number") latestIoT.lat = msg.lat;
    if (typeof msg.lng === "number") latestIoT.lng = msg.lng;
    latestIoT.ts = msg.ts || Date.now();

    updateRealtimeCards();
    pushChartPoint(phChartObj, latestIoT.ph);
    pushChartPoint(tdsChartObj, latestIoT.tds);

    // Optional: auto-update preview laporan
    updateReportPreview();
  });
}

function reconnectMQTT() {
  try {
    if (mqttClient) mqttClient.end(true);
  } catch {}
  connectMQTT();
}

// ================= AI DASHBOARD HOOK =================
function runAIFromLatestIoT() {
  const parts = [];
  if (typeof latestIoT.ph === "number") parts.push(`pH ${latestIoT.ph}`);
  if (typeof latestIoT.tds === "number") parts.push(`TDS ${latestIoT.tds}`);
  if (parts.length === 0) {
    showToast("Belum ada data IoT untuk dianalisis", "warning");
    return;
  }

  const query = parts.join(", ");
  const aiText = AIR_AI(query); // pakai AI logic kamu yang sudah ada

  // Tampilkan ke AI Dashboard
  const out = document.getElementById("aiLogicOutput");
  if (out) out.innerHTML = aiText.replace(/\n/g, "<br>");

  // Ringkasan (ambil dari teks—versi ringan)
  const aiStatusText = document.getElementById("aiStatusText");
  const aiScoreText = document.getElementById("aiScoreText");
  const aiConfidenceText = document.getElementById("aiConfidenceText");
  const aiLastParams = document.getElementById("aiLastParams");

  if (aiLastParams) {
    aiLastParams.innerHTML =
      `Device: <b>${latestIoT.deviceId}</b><br>` +
      `pH: <b>${latestIoT.ph ?? "-"}</b><br>` +
      `TDS: <b>${latestIoT.tds ?? "-"}</b> ppm<br>` +
      `GPS: <b>${latestIoT.lat ?? "-"}</b>, <b>${latestIoT.lng ?? "-"}</b>`;
  }

  // Parsing sederhana (opsional)
  if (aiStatusText) aiStatusText.textContent = aiText.includes("TIDAK LAYAK") ? "TIDAK LAYAK" : "LAYAK";
  if (aiScoreText) {
    const m = aiText.match(/Skor Kualitas Air:\s*(\d+)\/100/i);
    aiScoreText.textContent = m ? `${m[1]}/100` : "-";
  }
  if (aiConfidenceText) {
    const m = aiText.match(/Tingkat Keyakinan Analisis:\s*(.+)/i);
    aiConfidenceText.textContent = m ? m[1].trim() : "-";
  }

  updateReportPreview(aiText);
}

// ================= REPORT FORM + GPS =================
function fillFromIoT() {
  const ph = document.getElementById("reportPH");
  const tds = document.getElementById("reportTDS");
  const dev = document.getElementById("reportDeviceId");
  const lat = document.getElementById("reportLat");
  const lng = document.getElementById("reportLng");

  if (dev) dev.value = latestIoT.deviceId || DEVICE_ID;
  if (ph && typeof latestIoT.ph === "number") ph.value = latestIoT.ph;
  if (tds && typeof latestIoT.tds === "number") tds.value = latestIoT.tds;
  if (lat && typeof latestIoT.lat === "number") lat.value = latestIoT.lat;
  if (lng && typeof latestIoT.lng === "number") lng.value = latestIoT.lng;

  updateReportPreview();
}

function fillGPS() {
  if (!navigator.geolocation) {
    showToast("Browser tidak mendukung geolocation", "error");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = document.getElementById("reportLat");
      const lng = document.getElementById("reportLng");
      if (lat) lat.value = pos.coords.latitude;
      if (lng) lng.value = pos.coords.longitude;
      showToast("GPS berhasil diambil", "success");
      updateReportPreview();
    },
    () => showToast("Gagal mengambil GPS (izin ditolak / sinyal lemah)", "warning"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function updateReportPreview(aiTextOptional) {
  const box = document.getElementById("reportPreview");
  if (!box) return;

  const payload = buildReportPayload(aiTextOptional);
  box.innerHTML = `
    <div class="small text-muted">Preview JSON yang akan dikirim</div>
    <pre class="mb-0" style="white-space:pre-wrap;">${escapeHTML(JSON.stringify(payload, null, 2))}</pre>
  `;
}

function buildReportPayload(aiTextOptional) {
  const deviceId = document.getElementById("reportDeviceId")?.value?.trim() || DEVICE_ID;
  const ph = parseFloat(document.getElementById("reportPH")?.value);
  const tds = parseInt(document.getElementById("reportTDS")?.value);
  const condition = document.getElementById("reportCondition")?.value?.trim() || "";
  const notes = document.getElementById("reportNotes")?.value?.trim() || "";
  const lat = parseFloat(document.getElementById("reportLat")?.value);
  const lng = parseFloat(document.getElementById("reportLng")?.value);

  return {
    deviceId,
    ts: Date.now(),
    sensors: {
      ph: Number.isFinite(ph) ? ph : null,
      tds: Number.isFinite(tds) ? tds : null
    },
    gps: {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null
    },
    condition,
    notes,
    ai_summary: aiTextOptional || null
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  connectMQTT();

  const form = document.getElementById("reportForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Jika ingin lampirkan AI summary terbaru:
      const aiOut = document.getElementById("aiLogicOutput");
      const aiText = aiOut ? aiOut.innerText : null;

      const payload = buildReportPayload(aiText);

      updateReportPreview(aiText);

      try {
        // GANTI URL sesuai backend kamu
        const res = await fetch("/api/water-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        showToast("Laporan berhasil dikirim ke admin", "success");
      } catch (err) {
        showToast("Gagal kirim laporan. Cek endpoint backend /api/water-reports", "error");
      }
    });
  }
});
