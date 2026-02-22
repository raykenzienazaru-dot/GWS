// ================= NAVBAR EFFECTS =================

window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar-aquacheck");
  if (!navbar) return;
  if (window.scrollY > 50) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function () {
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    this.classList.add("active");
  });
});

const toggler = document.querySelector(".icon-toggler");
const navbarCollapse = document.getElementById("navbarContent");
if (navbarCollapse && toggler) {
  navbarCollapse.addEventListener("show.bs.collapse", () => toggler.classList.add("active"));
  navbarCollapse.addEventListener("hide.bs.collapse", () => toggler.classList.remove("active"));
}

// ================= HISTORY STORAGE =================

let historyData = JSON.parse(localStorage.getItem("aircek_history") || "[]");

function saveToHistory(query, response, status) {
  const entry = { id: Date.now(), date: new Date().toLocaleString("id-ID"), query, response, status };
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

function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999;";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement("div");
  toast.className = `toast-message toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.remove(); if (!toastContainer.children.length) toastContainer.remove(); }, 3000);
}

function updateHistoryDisplay() {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  if (historyData.length === 0) {
    container.innerHTML = `<div class="text-center text-muted"><i class="fas fa-inbox fa-3x mb-3 floating"></i><p>Belum ada riwayat analisis.</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">Riwayat Analisis (${historyData.length})</h6>
      <button onclick="clearHistory()" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash me-1"></i>Hapus Semua</button>
    </div>
    ${historyData.map(entry => `
      <div class="history-card">
        <div class="history-header">
          <div><i class="fas fa-clock me-2 text-muted"></i><span class="history-date">${entry.date}</span></div>
          <span class="status-badge status-${entry.status === "Layak" ? "layak" : "tidak-layak"}">${entry.status}</span>
        </div>
        <div class="mb-2"><strong><i class="fas fa-question-circle me-2 text-success"></i>Pertanyaan:</strong><p class="mb-0 mt-1">${escapeHTML(entry.query)}</p></div>
        <div><strong><i class="fas fa-robot me-2 text-success"></i>Hasil:</strong><div class="mt-1" style="font-size:13px;">${entry.response}</div></div>
      </div>`).join("")}`;
}

// ================= CHAT HELPER FUNCTIONS =================

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

// ================= AI ENGINE =================

function AIR_AI(input) {
  const q = input.toLowerCase().trim();
  if (q.includes("apa itu") || q.includes("apa yang dimaksud") || q.includes("definisi")) return getEducationalContent(q);

  let statusObj = { status: "Layak", isCritical: false };
  let alasan = [], solusi = [], parameterTerdeteksi = [];

  const phRegex = /ph\s*[:=]?\s*(\d+(\.\d+)?)/i;
  const phMatch = q.match(phRegex);
  if (phMatch) {
    let ph = parseFloat(phMatch[1]);
    if (ph < 0 || ph > 14) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push("Nilai pH tidak realistis (harus antara 0-14)"); solusi.push("Periksa kembali pengukuran pH"); }
    else { parameterTerdeteksi.push(`pH: ${ph}`); analyzePH(ph, alasan, solusi, statusObj); }
  }

  const tdsRegex = /tds\s*[:=]?\s*(\d+)/i;
  const tdsMatch = q.match(tdsRegex);
  if (tdsMatch) {
    let tds = parseInt(tdsMatch[1]);
    if (tds < 0 || tds > 10000) { alasan.push("Nilai TDS tidak realistis (0-10,000 ppm)"); statusObj.isCritical = true; }
    else { parameterTerdeteksi.push(`TDS: ${tds} ppm`); analyzeTDS(tds, alasan, solusi, statusObj); }
  }

  const turbidityMatch = q.match(/kekeruhan\s*[:=]?\s*(\d+(\.\d+)?)/i);
  if (turbidityMatch) {
    let turbidity = parseFloat(turbidityMatch[1]);
    if (turbidity < 0 || turbidity > 1000) { alasan.push("Nilai kekeruhan tidak realistis"); statusObj.isCritical = true; }
    else { parameterTerdeteksi.push(`Kekeruhan: ${turbidity} NTU`); analyzeTurbidity(turbidity, alasan, solusi, statusObj); }
  }

  analyzePhysicalConditions(q, alasan, solusi, statusObj);

  const chlorineMatch = q.match(/klorin\s*[:=]?\s*(\d+(\.\d+)?)/i);
  if (chlorineMatch) {
    let chlorine = parseFloat(chlorineMatch[1]);
    if (chlorine < 0 || chlorine > 50) { alasan.push("Nilai klorin tidak realistis"); statusObj.isCritical = true; }
    else { parameterTerdeteksi.push(`Klorin: ${chlorine} mg/L`); analyzeChlorine(chlorine, alasan, solusi, statusObj); }
  }

  const hardnessMatch = q.match(/kesadahan\s*[:=]?\s*(\d+)/i);
  if (hardnessMatch) {
    let hardness = parseInt(hardnessMatch[1]);
    if (hardness < 0 || hardness > 5000) { alasan.push("Nilai kesadahan tidak realistis"); statusObj.isCritical = true; }
    else { parameterTerdeteksi.push(`Kesadahan: ${hardness} mg/L`); analyzeHardness(hardness, alasan, solusi, statusObj); }
  }

  analyzeHeavyMetals(q, alasan, solusi, statusObj, parameterTerdeteksi);

  if (parameterTerdeteksi.length === 0 && alasan.length === 0) return generateDefaultResponse();

  const response = generateFinalResponse(statusObj, alasan, solusi, parameterTerdeteksi);
  saveToHistory(input, response, statusObj.status);
  return response;
}

function analyzePH(ph, alasan, solusi, statusObj) {
  if (ph < 6.5) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`pH ${ph} terlalu asam (di bawah 6,5)`); solusi.push("Netralkan dengan filter alkali atau tambahkan kapur"); solusi.push("Pertimbangkan sistem reverse osmosis dengan remineralisasi"); }
  else if (ph > 8.5) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`pH ${ph} terlalu basa (di atas 8,5)`); solusi.push("Netralkan dengan filter asam atau tambahkan asam organik lemah"); solusi.push("Gunakan filter dengan media penetral pH"); }
  else if (ph >= 7.0 && ph <= 7.5) alasan.push(`pH ${ph} optimal untuk konsumsi manusia`);
  else alasan.push(`pH ${ph} dalam batas aman (6,5-8,5)`);
}

function analyzeTDS(tds, alasan, solusi, statusObj) {
  if (tds > 1000) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`TDS ${tds} ppm sangat tinggi (berbahaya untuk dikonsumsi)`); solusi.push("Gunakan sistem reverse osmosis (RO)"); solusi.push("Pertimbangkan distilasi air"); solusi.push("Konsultasikan dengan ahli kualitas air"); }
  else if (tds > 500) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`TDS ${tds} ppm melebihi batas maksimal 500 ppm`); solusi.push("Gunakan filter reverse osmosis"); solusi.push("Pertimbangkan filter ultrafiltrasi"); }
  else if (tds > 300) { alasan.push(`TDS ${tds} ppm masih dalam batas layak minum (<500 ppm)`); solusi.push("Pertahankan dengan filter karbon aktif untuk rasa yang lebih baik"); }
  else if (tds > 50) alasan.push(`TDS ${tds} ppm sangat baik untuk konsumsi`);
  else { alasan.push(`TDS ${tds} ppm sangat rendah, kurang mineral`); solusi.push("Pertimbangkan untuk remineralisasi air setelah penyaringan"); }
}

function analyzeTurbidity(turbidity, alasan, solusi, statusObj) {
  if (turbidity > 5) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`Kekeruhan ${turbidity} NTU terlalu tinggi (>5 NTU)`); solusi.push("Gunakan filter sedimentasi atau multi-media filter"); solusi.push("Pertimbangkan koagulasi-flokulasi sebelum penyaringan"); }
  else if (turbidity > 1) { alasan.push(`Kekeruhan ${turbidity} NTU dalam batas aman (<5 NTU)`); solusi.push("Filter sedimen 5 mikron dapat meningkatkan kejernihan"); }
  else alasan.push(`Kekeruhan ${turbidity} NTU sangat baik`);
}

function analyzePhysicalConditions(q, alasan, solusi, statusObj) {
  if (q.includes("keruh") || q.includes("kabur") || q.includes("tidak jernih")) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push("Air keruh menunjukkan adanya partikel tersuspensi"); solusi.push("Gunakan filter sedimentasi"); solusi.push("Lakukan penyaringan bertahap (sand filter kemudian cartridge filter)"); }
  if (q.includes("bau") || q.includes("anyir") || q.includes("amis")) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push("Air berbau menunjukkan kontaminasi organik atau kimia"); solusi.push("Gunakan filter karbon aktif untuk menghilangkan bau"); solusi.push("Pertimbangkan aerasi untuk bau yang disebabkan oleh gas"); }
  if (q.includes("berwarna") || q.includes("kuning") || q.includes("coklat") || q.includes("kehijauan")) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push("Air berwarna menunjukkan kontaminasi logam atau organik"); solusi.push("Gunakan filter dengan media khusus penyerap warna"); solusi.push("Pertimbangkan sistem filtrasi multi-tahap dengan oksidasi"); }
  if (q.includes("rasa") && (q.includes("aneh") || q.includes("tidak enak") || q.includes("logam"))) { alasan.push("Rasa tidak enak dapat berasal dari mineral atau kontaminan"); solusi.push("Filter karbon aktif biasanya efektif menghilangkan rasa tidak enak"); }
}

function analyzeChlorine(chlorine, alasan, solusi, statusObj) {
  if (chlorine > 5) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`Klorin ${chlorine} mg/L berbahaya (maksimal 4 mg/L)`); solusi.push("Biarkan air dalam wadah terbuka 24 jam untuk menguapkan klorin"); solusi.push("Gunakan filter karbon aktif untuk menghilangkan klorin"); }
  else if (chlorine > 2) { alasan.push(`Klorin ${chlorine} mg/L tinggi tetapi masih dalam batas aman`); solusi.push("Filter karbon aktif akan menghilangkan klorin berlebih"); }
  else if (chlorine > 0.2) alasan.push(`Klorin ${chlorine} mg/L optimal untuk disinfeksi residu`);
  else { alasan.push("Klorin sangat rendah, risiko kontaminasi bakteri"); solusi.push("Pertimbangkan disinfeksi sebelum konsumsi"); }
}

function analyzeHardness(hardness, alasan, solusi, statusObj) {
  if (hardness > 500) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`Kesadahan ${hardness} mg/L sangat tinggi (>500 mg/L)`); solusi.push("Gunakan softener air atau sistem reverse osmosis"); solusi.push("Pertimbangkan pelunakan dengan resin penukar ion"); }
  else if (hardness > 300) { alasan.push(`Kesadahan ${hardness} mg/L tinggi (dapat menyebabkan kerak)`); solusi.push("Filter pelunak air dapat mengurangi kesadahan"); }
  else if (hardness > 60) alasan.push(`Kesadahan ${hardness} mg/L dalam batas normal`);
  else alasan.push(`Kesadahan ${hardness} mg/L rendah (air lunak)`);
}

function analyzeHeavyMetals(q, alasan, solusi, statusObj, parameterTerdeteksi) {
  const metals = { "timbal": {max:0.01,unit:"mg/L",nama:"Timbal (Pb)"}, "merkuri": {max:0.006,unit:"mg/L",nama:"Merkuri (Hg)"}, "arsen": {max:0.01,unit:"mg/L",nama:"Arsen (As)"}, "kadmium": {max:0.003,unit:"mg/L",nama:"Kadmium (Cd)"}, "tembaga": {max:2,unit:"mg/L",nama:"Tembaga (Cu)"} };
  for (const [metal, info] of Object.entries(metals)) {
    const regex = new RegExp(`${metal}\\s*[:=]?\\s*(\\d+(\\.\\d+)?)`, "i");
    const match = q.match(regex);
    if (match) {
      const value = parseFloat(match[1]);
      if (value < 0 || value > 100) { alasan.push(`Nilai ${info.nama} tidak realistis`); statusObj.isCritical = true; continue; }
      parameterTerdeteksi.push(`${info.nama}: ${value} ${info.unit}`);
      if (value > info.max) { statusObj.status = "Tidak Layak"; statusObj.isCritical = true; alasan.push(`${info.nama} ${value} ${info.unit} melebihi batas maksimal ${info.max} ${info.unit}`); solusi.push("Gunakan filter khusus penyerap logam berat seperti media KDF"); solusi.push("Sistem reverse osmosis efektif menghilangkan logam berat"); }
      else alasan.push(`${info.nama} dalam batas aman`);
    }
  }
}

function getEducationalContent(q) {
  if (q.includes("ph")) return `EDUKASI: Apa itu pH Air?\n\nDefinisi: pH adalah ukuran keasaman atau kebasaan air pada skala 0–14.\n• pH < 7: Asam\n• pH = 7: Netral\n• pH > 7: Basa/Alkali\n\npH Air Minum Ideal: 6.5 – 8.5\n• Terlalu asam (<6.5): Dapat mengikis pipa dan mengandung logam berat terlarut\n• Terlalu basa (>8.5): Rasa pahit dan dapat menyebabkan pengendapan mineral\n\nCara mengukur:\nGunakan pH meter, kertas lakmus, atau pH strip`;
  if (q.includes("tds")) return `EDUKASI: Apa itu TDS?\n\nTDS (Total Dissolved Solids) adalah total zat padat terlarut dalam air, diukur dalam ppm.\n\nStandar TDS Air Minum:\n• < 50 ppm: Sangat rendah, hampir murni\n• 50-150 ppm: Ideal\n• 150-300 ppm: Baik (mengandung mineral)\n• 300-500 ppm: Masih dapat diterima\n• > 500 ppm: Tidak direkomendasikan`;
  if (q.includes("kekeruhan")) return `EDUKASI: Apa itu Kekeruhan Air?\n\nKekeruhan mengukur kejernihan air (satuan NTU).\n\nStandar:\n• < 1 NTU: Sangat jernih\n• 1–5 NTU: Dapat diterima\n• > 5 NTU: Tidak layak minum\n\nBahaya: dapat menyembunyikan patogen berbahaya`;
  if (q.includes("klorin")) return `EDUKASI: Klorin dalam Air\n\nFungsi: Disinfektan untuk membunuh bakteri dan virus.\n\nStandar:\n• Maksimal: 4 mg/L (WHO)\n• Optimal residual: 0.2–0.5 mg/L\n\nCara menghilangkan: Filter karbon aktif, aerasi, atau didiamkan 24 jam.`;
  if (q.includes("kualitas air")) return `EDUKASI: Parameter Kualitas Air\n\n1. pH (6.5–8.5)\n2. TDS (< 500 ppm)\n3. Kekeruhan (< 5 NTU)\n4. Klorin (< 4 mg/L)\n5. Kesadahan (60–300 mg/L)\n6. Kondisi fisik: jernih, tidak berbau, tidak berwarna\n7. Logam berat: harus sangat rendah\n\nKetik "apa itu [parameter]" untuk detail.`;
}

function generateDefaultResponse() {
  return `GWS siap membantu!\n\nContoh input:\n• "pH 7.5, air jernih"\n• "pH:6.2, air sedikit keruh"\n• "Kekeruhan 3 NTU, kesadahan 250 mg/L"\n• "pH 8, klorin 1.5"\n\nUntuk edukasi:\n• "Apa itu pH?"\n• "Definisi TDS"\n• "Apa itu kekeruhan air?"\n\nParameter yang didukung:\n1. pH (6.5–8.5)\n2. TDS (Total Dissolved Solids)\n3. Kekeruhan (NTU)\n4. Klorin (mg/L)\n5. Kesadahan (mg/L)\n6. Logam berat\n7. Kondisi fisik (jernih, keruh, bau, berwarna)`;
}

function generateFinalResponse(statusObj, alasan, solusi, parameterTerdeteksi) {
  const status = statusObj.status;
  const waterScore = calculateWaterScore(statusObj, alasan, parameterTerdeteksi);
  let confidenceLevel = "Sedang";
  if (parameterTerdeteksi.length >= 3) confidenceLevel = "Tinggi";
  if (parameterTerdeteksi.length === 1) confidenceLevel = "Rendah";

  let response = `ANALISIS KUALITAS AIR\n`;
  if (parameterTerdeteksi.length > 0) {
    response += `Parameter Terdeteksi:\n`;
    parameterTerdeteksi.forEach(p => response += `• ${escapeHTML(p)}\n`);
    response += `\n`;
  }
  const icon = status === "Layak" ? "✅" : "❌";
  response += `Status: ${icon} ${status === "Layak" ? "LAYAK KONSUMSI" : "TIDAK LAYAK KONSUMSI"}\n\nAnalisis:\n`;
  alasan.forEach(a => response += `• ${escapeHTML(a)}\n`);
  if (solusi.length > 0) { response += `\nRekomendasi Perbaikan:\n`; solusi.forEach(s => response += `- ${escapeHTML(s)}\n`); }
  response += `\nSkor Kualitas Air: ${waterScore}/100`;
  response += `\nTingkat Keyakinan Analisis: ${confidenceLevel}`;
  if (status === "Tidak Layak") response += `\n\n⚠️ PERINGATAN:\nAir ini tidak direkomendasikan untuk dikonsumsi langsung tanpa pengolahan terlebih dahulu.`;
  else response += `\n\n💡 Tips:\nMeskipun layak, selalu pastikan air disimpan dalam wadah bersih dan terlindung dari kontaminasi.`;
  response += `\n\nIngin belajar lebih? Tanyakan "apa itu [parameter]" untuk penjelasan detail.`;
  response += `\n\n📋 Catatan:\nHasil analisis bersifat estimasi berbasis logika AI dan tidak menggantikan uji laboratorium.`;
  return response;
}

function calculateWaterScore(statusObj, alasan, parameterTerdeteksi) {
  let score = 70;
  if (statusObj.status === "Layak") score += 20;
  if (statusObj.status === "Tidak Layak") score -= 30;
  score += Math.min(parameterTerdeteksi.length * 3, 10);
  if (statusObj.isCritical) score -= 20;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// ================= SEND MESSAGE =================

function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  addBubble(escapeHTML(message), "user");
  input.value = "";
  addTypingIndicator();
  setTimeout(() => { removeTypingIndicator(); const response = AIR_AI(message); addBubble(response, "bot"); }, 1000);
}

const chatInput = document.getElementById("chatInput");
if (chatInput) {
  chatInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } });
}

// ================= IMAGE UPLOAD =================

const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");

if (imageInput && imagePreview && previewImg) {
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Harap upload file gambar!", "warning"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Ukuran file terlalu besar (maks 5MB)", "warning"); this.value = ""; return; }
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      imagePreview.classList.remove("d-none");
      previewImg.onload = () => {
        addTypingIndicator();
        setTimeout(() => {
          removeTypingIndicator();
          const result = analyzePHFromImage(previewImg);
          let status = "LAYAK", solusi = "Air aman untuk diminum";
          if (result.ph < 6.5 || result.ph > 8.5) { status = "TIDAK LAYAK"; solusi = result.ph < 6.5 ? "Air terlalu asam, gunakan filter penetral pH" : "Air terlalu basa, gunakan filter penurun pH"; }
          const response = `HASIL ANALISIS FOTO pH\n\n• Warna terdeteksi: ${result.label}\n• Perkiraan pH: ${result.ph}\n• Status: ${status}\n• Solusi: ${solusi}\n• Tingkat keyakinan: Rendah\n\nCatatan: Analisis warna bersifat estimasi visual dan tidak seakurat pH meter.`;
          addBubble(response, "bot");
          saveToHistory("Upload foto analisis pH", response, status === "LAYAK" ? "Layak" : "Tidak Layak");
        }, 1500);
      };
    };
    reader.readAsDataURL(file);
  });
}

function removeImage() {
  if (imageInput && imagePreview && previewImg) { imageInput.value = ""; imagePreview.classList.add("d-none"); previewImg.src = ""; }
}

const pHColorMap = [
  { ph: 2, color: [255, 0, 0], label: "Merah (Sangat Asam)" },
  { ph: 4, color: [255, 165, 0], label: "Oranye (Asam)" },
  { ph: 6, color: [255, 255, 0], label: "Kuning (Agak Asam)" },
  { ph: 7, color: [0, 255, 0], label: "Hijau (Netral)" },
  { ph: 8, color: [0, 128, 255], label: "Biru Muda (Agak Basa)" },
  { ph: 10, color: [0, 0, 255], label: "Biru (Basa)" },
  { ph: 12, color: [128, 0, 128], label: "Ungu (Sangat Basa)" }
];

function colorDistance(c1, c2) { return Math.sqrt(Math.pow(c1[0]-c2[0],2)+Math.pow(c1[1]-c2[1],2)+Math.pow(c1[2]-c2[2],2)); }

function analyzePHFromImage(imgElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = Math.min(imgElement.width, 200);
  canvas.height = Math.min(imgElement.height, 200);
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r=0, g=0, b=0, count=0;
  for (let i=0; i<imageData.length; i+=16) { r+=imageData[i]; g+=imageData[i+1]; b+=imageData[i+2]; count++; }
  if (!count) count=1;
  return detectPH([Math.round(r/count), Math.round(g/count), Math.round(b/count)]);
}

function detectPH(rgb) {
  let closest=pHColorMap[0], minDist=Infinity;
  pHColorMap.forEach(item => { const dist=colorDistance(rgb,item.color); if(dist<minDist){minDist=dist;closest=item;} });
  return closest;
}

// ================= TOAST STYLE =================

function addToastStyles() {
  if (document.getElementById('toast-styles')) return;
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    .toast-message{padding:12px 20px;margin-bottom:10px;border-radius:8px;color:white;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:slideIn .3s ease;max-width:300px;}
    .toast-success{background:linear-gradient(135deg,#10b981,#047857);border-left:4px solid #065f46;}
    .toast-warning{background:linear-gradient(135deg,#fbbf24,#f59e0b);border-left:4px solid #d97706;}
    .toast-info{background:linear-gradient(135deg,#10b981,#0891b2);border-left:4px solid #047857;}
    .toast-error{background:linear-gradient(135deg,#ef4444,#dc2626);border-left:4px solid #b91c1c;}
    @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  `;
  document.head.appendChild(style);
}

// ================= IOT STATE =================
// Disesuaikan dengan Arduino:
// - deviceId   : "GWS_ESP32_01"
// - field JSON : device, ph, status
// - topic      : gws/device/GWS_ESP32_01/sensors

let latestIoT = { deviceId: "GWS_ESP32_01", ph: null, status: null, ts: null };

function nowLocalID() { return new Date().toLocaleString("id-ID"); }

function setMQTTStatus(status) {
  const badge = document.getElementById("mqttStatusBadge");
  if (!badge) return;
  if (status === "CONNECTED")       { badge.className="iot-badge iot-badge-on"; badge.textContent="CONNECTED"; }
  else if (status === "CONNECTING") { badge.className="iot-badge iot-badge-warn"; badge.textContent="CONNECTING"; }
  else                              { badge.className="iot-badge iot-badge-off"; badge.textContent="DISCONNECTED"; }
}

function updateRealtimeCards() {
  const phEl        = document.getElementById("phRealtime");
  const lastUpdateEl = document.getElementById("lastUpdateText");
  const phBadge     = document.getElementById("phBadge");
  const phGaugeLabel = document.getElementById("phGaugeLabel");
  // Tampilkan status dari Arduino langsung
  const deviceStatusEl = document.getElementById("deviceStatusText");

  if (lastUpdateEl)  lastUpdateEl.textContent  = latestIoT.ts ? nowLocalID() : "-";
  if (phEl)          phEl.textContent          = latestIoT.ph ?? "--";
  if (phGaugeLabel)  phGaugeLabel.textContent  = latestIoT.ph ?? "--";

  // Status dari Arduino (LAYAK / ASAM_TIDAK_LAYAK / BASA_TIDAK_LAYAK)
  if (deviceStatusEl) {
    const s = latestIoT.status || "-";
    deviceStatusEl.textContent = s;
    deviceStatusEl.style.color = s === "LAYAK" ? "#065f46" : "#991b1b";
  }

  if (phBadge) {
    const ph = latestIoT.ph;
    if (typeof ph !== "number") { phBadge.className="iot-badge iot-badge-off"; phBadge.textContent="-"; }
    else if (ph >= 6.5 && ph <= 8.5) { phBadge.className="iot-badge iot-badge-on"; phBadge.textContent="AMAN"; }
    else { phBadge.className="iot-badge iot-badge-off"; phBadge.style.background="#fee2e2"; phBadge.style.color="#991b1b"; phBadge.textContent="TIDAK AMAN"; }
  }

  updateGauge(latestIoT.ph);
}

// ================= GAUGE CANVAS =================

function drawGauge(canvas, value, min, max, label) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H - 10;
  const r = Math.min(W, H * 1.8) / 2 - 6;
  const startAngle = Math.PI, endAngle = 2 * Math.PI;

  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#e5e7eb";
  ctx.stroke();

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const valAngle = startAngle + pct * Math.PI;
  let arcColor = "#10b981";
  if (value < 6.5 || value > 8.5) arcColor = "#ef4444";
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, valAngle);
  ctx.lineWidth = 14;
  ctx.strokeStyle = arcColor;
  ctx.stroke();

  const needleAngle = startAngle + pct * Math.PI;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + (r - 6) * Math.cos(needleAngle), cy + (r - 6) * Math.sin(needleAngle));
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#374151";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = "#374151";
  ctx.fill();

  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "center";
  ctx.fillText(min, cx - r + 4, cy - 2);
  ctx.fillText(max, cx + r - 4, cy - 2);
}

function updateGauge(ph) {
  const canvas = document.getElementById("phGauge");
  if (!canvas) return;
  if (typeof ph !== "number") { const ctx=canvas.getContext("2d"); ctx.clearRect(0,0,canvas.width,canvas.height); return; }
  drawGauge(canvas, ph, 0, 14, "pH");
}

// ================= CHARTS =================

let phChartObj = null;

function initCharts() {
  const phCanvas = document.getElementById("phChart");
  if (!phCanvas || typeof Chart === "undefined") return;

  phChartObj = new Chart(phCanvas, {
    type: "line",
    data: { labels: [], datasets: [{ data: [], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.08)", fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: "#047857" }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { min: 0, max: 14, ticks: { maxTicksLimit: 5 }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

function pushChartPoint(chartObj, value) {
  if (!chartObj || typeof value !== "number") return;
  chartObj.data.labels.push("");
  chartObj.data.datasets[0].data.push(value);
  const MAX = 30;
  if (chartObj.data.datasets[0].data.length > MAX) { chartObj.data.labels.shift(); chartObj.data.datasets[0].data.shift(); }
  chartObj.update();
}

// ================= MQTT =================
// Disesuaikan dengan Arduino:
// broker  : t2ffd5ca.ala.asia-southeast1.emqxsl.com  (port WSS 8084)
// user    : GWS
// pass    : GWS123
// clientId: GWS_ESP32_01
// topic   : gws/device/GWS_ESP32_01/sensors
// topic alert: gws/device/GWS_ESP32_01/alert

const MQTT_BROKER_URL = "wss://t2ffd5ca.ala.asia-southeast1.emqxsl.com:8084/mqtt";
const DEVICE_ID       = "GWS_ESP32_01";
const TOPIC_SENSORS   = `gws/device/${DEVICE_ID}/sensors`;
const TOPIC_ALERT     = `gws/device/${DEVICE_ID}/alert`;

const mqttOptions = {
  username: "GWS",
  password: "GWS123",
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 3000,
  clientId: "web_" + Math.random().toString(16).substr(2, 8) // unik agar tidak bentrok dengan ESP32
};

let mqttClient = null;

function connectMQTT() {
  const brokerText = document.getElementById("mqttBrokerText");
  if (brokerText) brokerText.textContent = MQTT_BROKER_URL;

  const deviceText = document.getElementById("deviceIdText");
  if (deviceText) deviceText.textContent = DEVICE_ID;

  setMQTTStatus("CONNECTING");
  mqttClient = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

  mqttClient.on("connect", () => {
    setMQTTStatus("CONNECTED");
    // Subscribe topic sensor DAN alert dari Arduino
    mqttClient.subscribe([TOPIC_SENSORS, TOPIC_ALERT], err => {
      if (err) showToast("Gagal subscribe topic IoT", "error");
      else showToast("Terhubung ke perangkat IoT", "success");
    });
  });

  mqttClient.on("reconnect", () => setMQTTStatus("CONNECTING"));
  mqttClient.on("close",     () => setMQTTStatus("DISCONNECTED"));
  mqttClient.on("error",     () => setMQTTStatus("DISCONNECTED"));

  mqttClient.on("message", (topic, payload) => {
    let msg;
    try { msg = JSON.parse(payload.toString()); } catch { showToast("Payload IoT bukan JSON valid", "warning"); return; }

    if (topic === TOPIC_SENSORS) {
      // Format Arduino: { "device":"GWS", "ph":7.20, "status":"LAYAK" }
      // Key "device" dipakai Arduino, kita mapping ke deviceId website
      latestIoT.deviceId = msg.device || DEVICE_ID;
      if (typeof msg.ph === "number") latestIoT.ph = msg.ph;
      latestIoT.status = msg.status || null;
      latestIoT.ts = Date.now();

      updateRealtimeCards();
      pushChartPoint(phChartObj, latestIoT.ph);
      updateReportPreview();
    }

    if (topic === TOPIC_ALERT) {
      // Peringatan dari Arduino jika air tidak layak
      const alertMsg = msg.warning || "PERINGATAN dari perangkat IoT";
      const phVal    = typeof msg.ph === "number" ? ` (pH: ${msg.ph})` : "";
      showToast(`⚠️ ${alertMsg}${phVal}`, "warning");
    }
  });
}

function reconnectMQTT() {
  try { if (mqttClient) mqttClient.end(true); } catch {}
  connectMQTT();
}

// ================= AI DASHBOARD HOOK =================

function runAIFromLatestIoT() {
  const parts = [];
  if (typeof latestIoT.ph === "number") parts.push(`pH ${latestIoT.ph}`);
  if (parts.length === 0) { showToast("Belum ada data IoT untuk dianalisis", "warning"); return; }

  const query  = parts.join(", ");
  const aiText = AIR_AI(query);

  const out = document.getElementById("aiLogicOutput");
  if (out) { out.classList.remove("ai-output-placeholder"); out.innerHTML = aiText.replace(/\n/g, "<br>"); }

  const isLayak = !aiText.includes("TIDAK LAYAK");
  const circle       = document.getElementById("aiStatusCircle");
  const icon         = document.getElementById("aiStatusIcon");
  const aiStatusText = document.getElementById("aiStatusText");
  const aiScoreText  = document.getElementById("aiScoreText");
  const aiConfText   = document.getElementById("aiConfidenceText");
  const aiLastParams = document.getElementById("aiLastParams");

  if (circle)       circle.className = "ai-status-circle " + (isLayak ? "layak" : "tidak");
  if (icon)         icon.className   = isLayak ? "fas fa-check" : "fas fa-times";
  if (aiStatusText) aiStatusText.textContent = isLayak ? "LAYAK KONSUMSI" : "TIDAK LAYAK";
  if (aiScoreText)  { const m = aiText.match(/Skor Kualitas Air:\s*(\d+)\/100/i); aiScoreText.textContent = m ? `${m[1]}/100` : "-"; }
  if (aiConfText)   { const m = aiText.match(/Tingkat Keyakinan Analisis:\s*(.+)/i); aiConfText.textContent = m ? m[1].trim() : "-"; }

  // Tampilkan info device dari Arduino (tidak ada lat/lng karena Arduino tidak kirim)
  if (aiLastParams) {
    aiLastParams.innerHTML =
      `Device: <b>${latestIoT.deviceId}</b><br>` +
      `pH: <b>${latestIoT.ph ?? "-"}</b><br>` +
      `Status IoT: <b>${latestIoT.status ?? "-"}</b>`;
  }

  updateReportPreview(aiText);
}

// ================= REPORT =================

function fillFromIoT() {
  const ph  = document.getElementById("reportPH");
  const dev = document.getElementById("reportDeviceId");
  // Arduino tidak kirim lat/lng, kosongkan saja
  const lat = document.getElementById("reportLat");
  const lng = document.getElementById("reportLng");

  if (dev) dev.value = latestIoT.deviceId || DEVICE_ID;
  if (ph  && typeof latestIoT.ph === "number") ph.value = latestIoT.ph;
  if (lat) lat.value = "";
  if (lng) lng.value = "";
  updateReportPreview();
}

function fillGPS() {
  if (!navigator.geolocation) { showToast("Browser tidak mendukung geolocation", "error"); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = document.getElementById("reportLat");
      const lng = document.getElementById("reportLng");
      if (lat) lat.value = pos.coords.latitude;
      if (lng) lng.value = pos.coords.longitude;
      showToast("GPS berhasil diambil", "success");
      updateReportPreview();
    },
    () => showToast("Gagal mengambil GPS", "warning"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function updateReportPreview(aiTextOptional) {
  const box = document.getElementById("reportPreview");
  if (!box) return;
  const payload = buildReportPayload(aiTextOptional);
  box.innerHTML = `<div class="small text-muted">Preview JSON yang akan dikirim</div><pre class="mb-0" style="white-space:pre-wrap;">${escapeHTML(JSON.stringify(payload, null, 2))}</pre>`;
}

function buildReportPayload(aiTextOptional) {
  const deviceId  = document.getElementById("reportDeviceId")?.value?.trim() || DEVICE_ID;
  const ph        = parseFloat(document.getElementById("reportPH")?.value);
  const condition = document.getElementById("reportCondition")?.value?.trim() || "";
  const notes     = document.getElementById("reportNotes")?.value?.trim() || "";
  const lat       = parseFloat(document.getElementById("reportLat")?.value);
  const lng       = parseFloat(document.getElementById("reportLng")?.value);

  return {
    deviceId,
    ts: Date.now(),
    sensors: { ph: Number.isFinite(ph) ? ph : null },
    // Status langsung dari Arduino disertakan juga
    iot_status: latestIoT.status || null,
    gps: { lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null },
    condition,
    notes,
    ai_summary: aiTextOptional || null
  };
}

// ================= INIT =================

addToastStyles();

document.addEventListener("DOMContentLoaded", () => {
  updateHistoryDisplay();
  initCharts();
  connectMQTT();

  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    setTimeout(() => chatInput.focus(), 500);
  }

  const form = document.getElementById("reportForm");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const aiOut  = document.getElementById("aiLogicOutput");
      const aiText = aiOut ? aiOut.innerText : null;
      const payload = buildReportPayload(aiText);
      updateReportPreview(aiText);
      try {
        const res = await fetch("/api/water-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("HTTP " + res.status);
        showToast("Laporan berhasil dikirim ke admin", "success");
      } catch {
        showToast("Gagal kirim laporan. Cek endpoint backend /api/water-reports", "error");
      }
    });
  }
});