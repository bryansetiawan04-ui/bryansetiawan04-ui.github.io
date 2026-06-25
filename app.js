const CONFIG_KEY = "finance-pribadi-config-v1";
const VAULT_KEY = "finance-pribadi-vault-v1";
const DB_NAME = "finance-pribadi-db";
const DB_STORE = "kv";
const ITERATIONS = 180000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const typeMeta = {
  expense: { label: "Pengeluaran", summaryKey: "expense", sign: -1 },
  income: { label: "Pendapatan", summaryKey: "income", sign: 1 },
  saving: { label: "Tabungan", summaryKey: "saving", sign: -1 },
  extra: { label: "Tambahan", summaryKey: "extra", sign: 1 }
};

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

const state = {
  key: null,
  vault: null,
  selectedPhoto: null,
  editingId: null,
  toastTimer: null
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  bindEvents();
  setDefaultDates();
  await showAuth();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function bindElements() {
  const ids = [
    "authView",
    "appView",
    "authForm",
    "authUsername",
    "authPassword",
    "authPasswordConfirm",
    "confirmPasswordWrap",
    "authSubmit",
    "authModeText",
    "authMessage",
    "resetLocalButton",
    "monthPill",
    "summaryCards",
    "summaryMeta",
    "recordForm",
    "recordDate",
    "recordAmount",
    "recordTitle",
    "recordCategory",
    "recordNote",
    "recordPhoto",
    "photoPreview",
    "photoPreviewImage",
    "photoPreviewName",
    "photoPreviewMeta",
    "removePhotoButton",
    "saveRecordButton",
    "cancelEditButton",
    "historyMonth",
    "historyYear",
    "historyTotal",
    "transactionList",
    "reportForm",
    "reportStart",
    "reportEnd",
    "previewReportButton",
    "reportMessage",
    "exportBackupButton",
    "importBackupInput",
    "logoutButton",
    "photoDialog",
    "closePhotoDialog",
    "dialogPhotoImage",
    "dialogPhotoCaption",
    "toast"
  ];

  ids.forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

function bindEvents() {
  el.authForm.addEventListener("submit", handleAuthSubmit);
  el.resetLocalButton.addEventListener("click", resetLocalData);
  el.recordForm.addEventListener("submit", handleRecordSubmit);
  el.recordPhoto.addEventListener("change", handlePhotoChange);
  el.removePhotoButton.addEventListener("click", clearSelectedPhoto);
  el.cancelEditButton.addEventListener("click", resetRecordForm);
  el.historyMonth.addEventListener("change", renderHistory);
  el.historyYear.addEventListener("change", renderHistory);
  el.reportForm.addEventListener("submit", downloadReport);
  el.previewReportButton.addEventListener("click", previewReport);
  el.exportBackupButton.addEventListener("click", exportBackup);
  el.importBackupInput.addEventListener("change", importBackup);
  el.logoutButton.addEventListener("click", logout);
  el.closePhotoDialog.addEventListener("click", () => el.photoDialog.close());
}

function setDefaultDates() {
  const today = toDateInput(new Date());
  const firstDay = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  el.recordDate.value = today;
  el.reportStart.value = firstDay;
  el.reportEnd.value = today;
  el.historyMonth.value = String(new Date().getMonth() + 1).padStart(2, "0");
}

async function showAuth() {
  const config = getConfig();
  const isSetup = !config;

  el.appView.hidden = true;
  el.authView.hidden = false;
  el.confirmPasswordWrap.hidden = !isSetup;
  el.authSubmit.textContent = isSetup ? "Buat akun" : "Masuk";
  el.authModeText.textContent = isSetup
    ? "Buat username dan password untuk membuka brankas keuangan di browser ini."
    : "Masuk dengan username dan password yang sudah dibuat. Data tersimpan terenkripsi di browser perangkat ini.";
  el.resetLocalButton.hidden = isSetup;
  el.authUsername.value = config?.username || "";
  el.authPassword.value = "";
  el.authPasswordConfirm.value = "";
  el.authMessage.textContent = "";
  el.authUsername.readOnly = Boolean(config);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  setAuthMessage("Memproses...");

  const config = getConfig();
  const username = el.authUsername.value.trim();
  const password = el.authPassword.value;

  try {
    if (!config) {
      await setupAccount(username, password, el.authPasswordConfirm.value);
    } else {
      await login(username, password, config);
    }
    enterApp();
  } catch (error) {
    setAuthMessage(error.message || "Tidak bisa memproses akun.");
  }
}

async function setupAccount(username, password, confirmPassword) {
  if (username.length < 3) {
    throw new Error("Username minimal 3 karakter.");
  }
  if (password.length < 6) {
    throw new Error("Password minimal 6 karakter.");
  }
  if (password !== confirmPassword) {
    throw new Error("Password ulang belum sama.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, ITERATIONS);
  const authProof = await encryptJson(key, {
    ok: true,
    username,
    createdAt: new Date().toISOString()
  });
  const vault = createEmptyVault();
  const encryptedVault = await encryptJson(key, vault);

  await storageSet(VAULT_KEY, encryptedVault);
  setConfig({
    version: 1,
    username,
    salt: bytesToBase64(salt),
    iterations: ITERATIONS,
    authProof
  });

  state.key = key;
  state.vault = vault;
}

async function login(username, password, config) {
  if (username !== config.username) {
    throw new Error("Username tidak cocok.");
  }

  const key = await deriveKey(password, base64ToBytes(config.salt), config.iterations || ITERATIONS);

  try {
    await decryptJson(key, config.authProof);
  } catch {
    throw new Error("Password salah.");
  }

  const encryptedVault = await storageGet(VAULT_KEY);
  const vault = encryptedVault ? await decryptJson(key, encryptedVault) : createEmptyVault();
  state.key = key;
  state.vault = normalizeVault(vault);
}

function enterApp() {
  el.authView.hidden = true;
  el.appView.hidden = false;
  setAuthMessage("");
  renderApp();
  toast("Berhasil masuk.");
}

function logout() {
  state.key = null;
  state.vault = null;
  state.selectedPhoto = null;
  state.editingId = null;
  showAuth();
}

async function resetLocalData() {
  const approved = confirm("Reset akan menghapus akun, catatan, dan foto yang tersimpan di browser ini.");
  if (!approved) return;

  localStorage.removeItem(CONFIG_KEY);
  await storageDelete(VAULT_KEY);
  state.key = null;
  state.vault = null;
  state.selectedPhoto = null;
  state.editingId = null;
  await showAuth();
  toast("Data lokal sudah direset.");
}

function setAuthMessage(message) {
  el.authMessage.textContent = message;
}

function createEmptyVault() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    records: []
  };
}

function normalizeVault(vault) {
  return {
    ...createEmptyVault(),
    ...vault,
    records: Array.isArray(vault.records) ? vault.records : []
  };
}

async function handleRecordSubmit(event) {
  event.preventDefault();

  const formData = new FormData(el.recordForm);
  const amount = Number(formData.get("amount"));
  const type = formData.get("type");
  const now = new Date().toISOString();

  if (!typeMeta[type]) {
    toast("Jenis catatan tidak valid.");
    return;
  }
  if (!amount || amount <= 0) {
    toast("Nominal harus lebih dari 0.");
    return;
  }

  const payload = {
    date: formData.get("date"),
    amount,
    type,
    title: String(formData.get("title") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    image: state.selectedPhoto,
    updatedAt: now
  };

  if (!payload.date || !payload.title) {
    toast("Tanggal dan nama catatan wajib diisi.");
    return;
  }

  if (state.editingId) {
    const index = state.vault.records.findIndex((record) => record.id === state.editingId);
    if (index >= 0) {
      state.vault.records[index] = {
        ...state.vault.records[index],
        ...payload
      };
    }
    await persistVault();
    toast("Catatan diperbarui.");
  } else {
    state.vault.records.push({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: now
    });
    await persistVault();
    toast("Catatan tersimpan.");
  }

  resetRecordForm();
  renderApp();
}

async function handlePhotoChange(event) {
  const [file] = event.target.files;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast("File harus berupa gambar.");
    el.recordPhoto.value = "";
    return;
  }

  try {
    state.selectedPhoto = await compressImage(file);
    renderPhotoPreview();
  } catch {
    toast("Foto tidak bisa diproses.");
  }
}

async function compressImage(file) {
  const image = await loadImage(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
  return {
    name: file.name,
    type: "image/jpeg",
    dataUrl,
    width,
    height,
    size: Math.round((dataUrl.length * 3) / 4),
    originalSize: file.size
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar gagal dimuat."));
    };
    image.src = url;
  });
}

function renderPhotoPreview() {
  if (!state.selectedPhoto) {
    el.photoPreview.hidden = true;
    el.photoPreviewImage.removeAttribute("src");
    el.photoPreviewName.textContent = "";
    el.photoPreviewMeta.textContent = "";
    return;
  }

  el.photoPreview.hidden = false;
  el.photoPreviewImage.src = state.selectedPhoto.dataUrl;
  el.photoPreviewName.textContent = state.selectedPhoto.name || "Foto catatan";
  el.photoPreviewMeta.textContent = `${state.selectedPhoto.width} x ${state.selectedPhoto.height} px - ${formatBytes(state.selectedPhoto.size)}`;
}

function clearSelectedPhoto() {
  state.selectedPhoto = null;
  el.recordPhoto.value = "";
  renderPhotoPreview();
}

function resetRecordForm() {
  state.editingId = null;
  state.selectedPhoto = null;
  el.recordForm.reset();
  el.recordDate.value = toDateInput(new Date());
  el.recordForm.querySelector('input[name="type"][value="expense"]').checked = true;
  el.recordPhoto.value = "";
  el.saveRecordButton.textContent = "Simpan catatan";
  el.cancelEditButton.hidden = true;
  renderPhotoPreview();
}

function editRecord(id) {
  const record = state.vault.records.find((item) => item.id === id);
  if (!record) return;

  state.editingId = id;
  state.selectedPhoto = record.image || null;
  el.recordDate.value = record.date;
  el.recordAmount.value = record.amount;
  el.recordTitle.value = record.title;
  el.recordCategory.value = record.category || "";
  el.recordNote.value = record.note || "";
  const typeInput = el.recordForm.querySelector(`input[name="type"][value="${record.type}"]`);
  if (typeInput) typeInput.checked = true;
  el.saveRecordButton.textContent = "Simpan perubahan";
  el.cancelEditButton.hidden = false;
  renderPhotoPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteRecord(id) {
  const record = state.vault.records.find((item) => item.id === id);
  if (!record) return;

  const approved = confirm(`Hapus catatan "${record.title}"?`);
  if (!approved) return;

  state.vault.records = state.vault.records.filter((item) => item.id !== id);
  await persistVault();
  renderApp();
  toast("Catatan dihapus.");
}

function renderApp() {
  renderSummary();
  renderYearOptions();
  renderHistory();
}

function renderSummary() {
  const currentMonth = toMonthKey(new Date());
  const records = state.vault.records.filter((record) => toMonthKey(record.date) === currentMonth);
  const summary = calculateSummary(records);

  el.monthPill.textContent = formatMonthKey(currentMonth);
  el.summaryMeta.textContent = `${records.length} catatan bulan ini`;
  el.summaryCards.innerHTML = [
    statCard("Sisa uang", summary.remaining, "remaining"),
    statCard("Pendapatan", summary.income, "income"),
    statCard("Pengeluaran", summary.expense, "expense"),
    statCard("Tabungan", summary.saving, "saving"),
    statCard("Tambahan", summary.extra, "extra")
  ].join("");
}

function statCard(label, amount, className) {
  return `
    <article class="stat-card ${className}">
      <span>${escapeHtml(label)}</span>
      <strong>${formatCurrency(amount)}</strong>
    </article>
  `;
}

function renderYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear]);
  state.vault.records.forEach((record) => {
    const year = Number(record.date.slice(0, 4));
    if (year) years.add(year);
  });

  const sortedYears = [...years].sort((a, b) => b - a);
  const currentValue = el.historyYear.value || String(currentYear);
  el.historyYear.innerHTML = sortedYears
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  el.historyYear.value = sortedYears.includes(Number(currentValue)) ? currentValue : String(currentYear);
}

function renderHistory() {
  const month = el.historyMonth.value;
  const year = el.historyYear.value;
  const records = getFilteredHistory(month, year);
  const summary = calculateSummary(records);

  el.historyTotal.textContent = `${records.length} catatan - Sisa ${formatCurrency(summary.remaining)} - Pendapatan ${formatCurrency(summary.income)} - Pengeluaran ${formatCurrency(summary.expense)} - Tabungan ${formatCurrency(summary.saving)} - Tambahan ${formatCurrency(summary.extra)}`;

  if (!records.length) {
    el.transactionList.innerHTML = `<div class="empty-state">Belum ada catatan pada filter ini.</div>`;
    return;
  }

  el.transactionList.innerHTML = records.map(transactionRow).join("");
  el.transactionList.querySelectorAll("[data-action]").forEach((button) => {
    const id = button.dataset.id;
    const action = button.dataset.action;
    button.addEventListener("click", () => {
      if (action === "edit") editRecord(id);
      if (action === "delete") deleteRecord(id);
      if (action === "photo") openPhoto(id);
    });
  });
}

function getFilteredHistory(month, year) {
  return [...state.vault.records]
    .filter((record) => record.date.slice(0, 4) === year)
    .filter((record) => month === "all" || record.date.slice(5, 7) === month)
    .sort((a, b) => {
      if (a.date === b.date) return new Date(b.createdAt) - new Date(a.createdAt);
      return a.date < b.date ? 1 : -1;
    });
}

function transactionRow(record) {
  const meta = typeMeta[record.type] || typeMeta.expense;
  const amountClass = meta.sign < 0 ? "amount-negative" : "amount-positive";
  const displayAmount = `${meta.sign < 0 ? "-" : "+"}${formatCurrency(record.amount)}`;
  const thumb = record.image
    ? `<button class="transaction-thumb" type="button" data-action="photo" data-id="${record.id}" aria-label="Lihat foto ${escapeHtml(record.title)}"><img src="${record.image.dataUrl}" alt=""></button>`
    : `<div class="transaction-thumb">NO FOTO</div>`;

  return `
    <article class="transaction-row">
      ${thumb}
      <div class="transaction-main">
        <span class="type-badge">${escapeHtml(meta.label)}</span>
        <strong>${escapeHtml(record.title)}</strong>
        <p>${formatDate(record.date)}${record.category ? ` - ${escapeHtml(record.category)}` : ""}${record.note ? ` - ${escapeHtml(record.note)}` : ""}</p>
      </div>
      <div class="transaction-amount ${amountClass}">${displayAmount}</div>
      <div class="row-actions">
        <button class="icon-button" type="button" data-action="edit" data-id="${record.id}" aria-label="Edit">E</button>
        <button class="icon-button" type="button" data-action="delete" data-id="${record.id}" aria-label="Hapus">X</button>
      </div>
    </article>
  `;
}

function openPhoto(id) {
  const record = state.vault.records.find((item) => item.id === id);
  if (!record?.image) return;

  el.dialogPhotoImage.src = record.image.dataUrl;
  el.dialogPhotoCaption.textContent = `${record.title} - ${formatDate(record.date)}`;
  el.photoDialog.showModal();
}

function calculateSummary(records) {
  return records.reduce(
    (summary, record) => {
      const amount = Number(record.amount) || 0;
      if (record.type === "income") summary.income += amount;
      if (record.type === "expense") summary.expense += amount;
      if (record.type === "saving") summary.saving += amount;
      if (record.type === "extra") summary.extra += amount;
      summary.remaining = summary.income + summary.extra - summary.expense - summary.saving;
      return summary;
    },
    { income: 0, expense: 0, saving: 0, extra: 0, remaining: 0 }
  );
}

async function persistVault() {
  state.vault.updatedAt = new Date().toISOString();
  const encryptedVault = await encryptJson(state.key, state.vault);
  await storageSet(VAULT_KEY, encryptedVault);
}

async function previewReport() {
  try {
    const html = buildReportFromInputs();
    const preview = window.open("", "_blank");
    if (!preview) {
      toast("Popup preview diblokir browser.");
      return;
    }
    preview.document.open();
    preview.document.write(html);
    preview.document.close();
  } catch (error) {
    setReportMessage(error.message);
  }
}

async function downloadReport(event) {
  event.preventDefault();

  try {
    const html = buildReportFromInputs();
    const fileName = `laporan-keuangan-${el.reportStart.value}-sampai-${el.reportEnd.value}.html`;
    downloadBlob(fileName, "text/html;charset=utf-8", html);
    setReportMessage("Laporan berhasil dibuat.");
  } catch (error) {
    setReportMessage(error.message);
  }
}

function buildReportFromInputs() {
  const start = el.reportStart.value;
  const end = el.reportEnd.value;
  validateReportRange(start, end);
  const records = state.vault.records
    .filter((record) => record.date >= start && record.date <= end)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  return buildInvoiceHtml(records, start, end);
}

function validateReportRange(start, end) {
  if (!start || !end) {
    throw new Error("Tanggal laporan wajib diisi.");
  }
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (startDate > endDate) {
    throw new Error("Tanggal awal tidak boleh lewat dari tanggal akhir.");
  }
  const days = Math.floor((endDate - startDate) / ONE_DAY) + 1;
  if (days > 366) {
    throw new Error("Range laporan maksimal 1 tahun.");
  }
}

function buildInvoiceHtml(records, start, end) {
  const summary = calculateSummary(records);
  const generatedAt = new Date();
  const reportNumber = `FP-${start.replaceAll("-", "")}-${end.replaceAll("-", "")}`;
  const rows = records.length
    ? records.map(reportRow).join("")
    : `<tr><td colspan="6" class="empty">Tidak ada catatan pada range ini.</td></tr>`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Laporan Keuangan ${escapeHtml(start)} sampai ${escapeHtml(end)}</title>
  <style>
    body { margin: 0; background: #f5f7f2; color: #17201c; font-family: Arial, sans-serif; }
    .page { width: min(980px, calc(100% - 28px)); margin: 24px auto; background: #fff; border: 1px solid #dbe2d9; padding: 28px; }
    .top { display: flex; justify-content: space-between; gap: 18px; border-bottom: 3px solid #116149; padding-bottom: 18px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0; color: #66736c; }
    .meta { text-align: right; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 22px 0; }
    .box { border: 1px solid #dbe2d9; padding: 12px; border-radius: 6px; }
    .box span { display: block; color: #66736c; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .box strong { display: block; margin-top: 8px; font-size: 16px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #dbe2d9; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #eef6f1; font-size: 12px; text-transform: uppercase; }
    .right { text-align: right; }
    .positive { color: #116149; font-weight: 700; }
    .negative { color: #b42318; font-weight: 700; }
    .receipt { width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #dbe2d9; }
    .empty { text-align: center; color: #66736c; }
    .print { margin: 18px 0 0; padding: 10px 14px; border: 0; border-radius: 6px; background: #116149; color: #fff; font-weight: 700; cursor: pointer; }
    @media print { body { background: #fff; } .page { width: auto; margin: 0; border: 0; } .print { display: none; } }
    @media (max-width: 780px) { .top, .summary { grid-template-columns: 1fr; display: grid; } .meta { text-align: left; } table { font-size: 12px; } th, td { padding: 7px; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div>
        <h1>Invoice Keuangan Pribadi</h1>
        <p>Periode ${escapeHtml(formatDate(start))} sampai ${escapeHtml(formatDate(end))}</p>
      </div>
      <div class="meta">
        <p><strong>No:</strong> ${escapeHtml(reportNumber)}</p>
        <p><strong>Dibuat:</strong> ${escapeHtml(generatedAt.toLocaleString("id-ID"))}</p>
      </div>
    </section>

    <section class="summary">
      ${reportBox("Sisa uang", summary.remaining)}
      ${reportBox("Pendapatan", summary.income)}
      ${reportBox("Pengeluaran", summary.expense)}
      ${reportBox("Tabungan", summary.saving)}
      ${reportBox("Tambahan", summary.extra)}
    </section>

    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Jenis</th>
          <th>Catatan</th>
          <th>Kategori</th>
          <th>Foto</th>
          <th class="right">Nominal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <button class="print" onclick="window.print()">Print / Save PDF</button>
  </main>
</body>
</html>`;
}

function reportBox(label, amount) {
  return `<div class="box"><span>${escapeHtml(label)}</span><strong>${formatCurrency(amount)}</strong></div>`;
}

function reportRow(record) {
  const meta = typeMeta[record.type] || typeMeta.expense;
  const amountClass = meta.sign < 0 ? "negative" : "positive";
  const displayAmount = `${meta.sign < 0 ? "-" : "+"}${formatCurrency(record.amount)}`;
  const image = record.image
    ? `<img class="receipt" src="${record.image.dataUrl}" alt="Foto ${escapeHtml(record.title)}">`
    : "-";

  return `<tr>
    <td>${escapeHtml(formatDate(record.date))}</td>
    <td>${escapeHtml(meta.label)}</td>
    <td>${escapeHtml(record.title)}${record.note ? `<br><small>${escapeHtml(record.note)}</small>` : ""}</td>
    <td>${escapeHtml(record.category || "-")}</td>
    <td>${image}</td>
    <td class="right ${amountClass}">${displayAmount}</td>
  </tr>`;
}

function setReportMessage(message) {
  el.reportMessage.textContent = message;
}

async function exportBackup() {
  const config = getConfig();
  const vault = await storageGet(VAULT_KEY);
  if (!config || !vault) {
    toast("Belum ada data untuk diexport.");
    return;
  }

  const backup = {
    app: "finance-pribadi",
    version: 1,
    exportedAt: new Date().toISOString(),
    config,
    vault
  };

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  downloadBlob(`backup-keuangan-${stamp}.json`, "application/json;charset=utf-8", JSON.stringify(backup, null, 2));
  toast("Backup terenkripsi dibuat.");
}

async function importBackup(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (backup.app !== "finance-pribadi" || !backup.config || !backup.vault) {
      throw new Error("File backup tidak valid.");
    }

    const approved = confirm("Import backup akan mengganti akun dan data lokal di browser ini.");
    if (!approved) return;

    localStorage.setItem(CONFIG_KEY, JSON.stringify(backup.config));
    await storageSet(VAULT_KEY, backup.vault);
    logout();
    toast("Backup berhasil diimport. Masuk dengan password backup.");
  } catch (error) {
    toast(error.message || "Backup gagal diimport.");
  } finally {
    el.importBackupInput.value = "";
  }
}

function downloadBlob(fileName, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJson(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptJson(key, payload) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB tidak tersedia."));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storageGet(key) {
  try {
    const db = await openDb();
    return await dbRequest(db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key));
  } catch {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

async function storageSet(key, value) {
  try {
    const db = await openDb();
    await dbRequest(db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(value, key));
  } catch {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

async function storageDelete(key) {
  try {
    const db = await openDb();
    await dbRequest(db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(key));
  } catch {
    localStorage.removeItem(key);
  }
}

function dbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toMonthKey(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(value).slice(0, 7);
}

function formatMonthKey(key) {
  const [year, month] = key.split("-");
  return `${monthNames[Number(month) - 1]} ${year}`;
}

function formatDate(value) {
  return parseLocalDate(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2600);
}

window.financeApp = {
  editRecord,
  deleteRecord
};
