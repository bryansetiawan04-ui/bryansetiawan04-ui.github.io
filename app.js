const STORAGE_KEY = "dompet-pribadi-transactions-v1";

const expenseCategories = [
  { name: "Makan & Minum", color: "#dc2626" },
  { name: "Belanja", color: "#c2410c" },
  { name: "Transportasi", color: "#2563eb" },
  { name: "Tagihan", color: "#7c3aed" },
  { name: "Kesehatan", color: "#0891b2" },
  { name: "Hiburan", color: "#be123c" },
  { name: "Pendidikan", color: "#4f46e5" },
  { name: "Rumah", color: "#0f766e" },
  { name: "Lainnya", color: "#64748b" },
];

const incomeCategories = [
  { name: "Gaji", color: "#15803d" },
  { name: "Freelance", color: "#0f766e" },
  { name: "Investasi", color: "#2563eb" },
  { name: "Hadiah", color: "#b7791f" },
  { name: "Refund", color: "#be123c" },
  { name: "Lainnya", color: "#64748b" },
];

const elements = {};
let transactions = [];
let selectedType = "expense";
let selectedReceiptFile = null;
let lastDetection = null;
let toastTimer = null;
let resizeTimer = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  transactions = loadTransactions();
  elements.dateInput.value = toInputDate(new Date());
  elements.todayLabel.textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  setTransactionType("expense");
  bindEvents();
  refreshUI();
  refreshIcons();
}

function cacheElements() {
  const ids = [
    "todayLabel",
    "balanceValue",
    "incomeValue",
    "expenseValue",
    "cashflowValue",
    "transactionForm",
    "formModeLabel",
    "editingId",
    "amountInput",
    "dateInput",
    "categoryInput",
    "accountInput",
    "merchantInput",
    "noteInput",
    "resetFormButton",
    "receiptFile",
    "receiptPreview",
    "emptyPreview",
    "scanReceiptButton",
    "parseReceiptButton",
    "receiptText",
    "scanStatus",
    "scanProgress",
    "detectedBox",
    "detectedType",
    "detectedAmount",
    "detectedDate",
    "detectedCategory",
    "detectedMerchant",
    "fillDetectedButton",
    "saveDetectedButton",
    "monthlyChart",
    "categoryBreakdown",
    "transactionCount",
    "transactionList",
    "typeFilter",
    "monthFilter",
    "searchInput",
    "exportCsvButton",
    "exportJsonButton",
    "importJsonFile",
    "toast",
  ];

  ids.forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-transaction-type]").forEach((button) => {
    button.addEventListener("click", () => setTransactionType(button.dataset.transactionType));
  });

  elements.transactionForm.addEventListener("submit", saveFromForm);
  elements.resetFormButton.addEventListener("click", resetForm);
  elements.receiptFile.addEventListener("change", handleReceiptFile);
  elements.scanReceiptButton.addEventListener("click", scanReceiptImage);
  elements.parseReceiptButton.addEventListener("click", parseReceiptText);
  elements.fillDetectedButton.addEventListener("click", fillFormFromDetection);
  elements.saveDetectedButton.addEventListener("click", saveDetectionAsTransaction);
  elements.transactionList.addEventListener("click", handleTransactionAction);
  elements.typeFilter.addEventListener("change", renderTransactions);
  elements.monthFilter.addEventListener("change", renderTransactions);
  elements.searchInput.addEventListener("input", renderTransactions);
  elements.exportCsvButton.addEventListener("click", exportCsv);
  elements.exportJsonButton.addEventListener("click", exportJson);
  elements.importJsonFile.addEventListener("change", importJson);

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderMonthlyChart, 120);
  });
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidTransaction) : [];
  } catch (error) {
    showToast("Data lokal tidak bisa dibaca.");
    return [];
  }
}

function persistTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function isValidTransaction(item) {
  return item && ["income", "expense"].includes(item.type) && Number(item.amount) > 0 && item.date;
}

function refreshUI() {
  renderSummary();
  renderMonthOptions();
  renderTransactions();
  renderMonthlyChart();
  renderCategoryBreakdown();
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
    return;
  }

  document.querySelectorAll("i[data-lucide]").forEach((placeholder) => {
    placeholder.replaceWith(createFallbackIcon(placeholder.dataset.lucide));
  });
}

function createFallbackIcon(name) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const shapes = fallbackIconShapes[name] || fallbackIconShapes.activity;
  shapes.forEach((shape) => {
    const node = document.createElementNS(namespace, shape.tag);
    Object.entries(shape.attrs).forEach(([key, value]) => node.setAttribute(key, value));
    svg.appendChild(node);
  });

  return svg;
}

const fallbackIconShapes = {
  activity: [
    { tag: "path", attrs: { d: "M3 12h4l3 7 4-14 3 7h4" } },
  ],
  "arrow-down-left": [
    { tag: "path", attrs: { d: "M17 7 7 17" } },
    { tag: "path", attrs: { d: "M17 17H7V7" } },
  ],
  "arrow-up-right": [
    { tag: "path", attrs: { d: "M7 17 17 7" } },
    { tag: "path", attrs: { d: "M7 7h10v10" } },
  ],
  "banknote": [
    { tag: "rect", attrs: { x: "3", y: "6", width: "18", height: "12", rx: "2" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "2" } },
    { tag: "path", attrs: { d: "M6 12h.01M18 12h.01" } },
  ],
  "bar-chart-3": [
    { tag: "path", attrs: { d: "M3 20h18" } },
    { tag: "path", attrs: { d: "M7 16V9" } },
    { tag: "path", attrs: { d: "M12 16V5" } },
    { tag: "path", attrs: { d: "M17 16v-6" } },
  ],
  check: [
    { tag: "path", attrs: { d: "M20 6 9 17l-5-5" } },
  ],
  download: [
    { tag: "path", attrs: { d: "M12 3v12" } },
    { tag: "path", attrs: { d: "m7 10 5 5 5-5" } },
    { tag: "path", attrs: { d: "M5 21h14" } },
  ],
  "file-pen-line": [
    { tag: "path", attrs: { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" } },
    { tag: "path", attrs: { d: "M14 2v6h6" } },
    { tag: "path", attrs: { d: "M10 15l4-4 2 2-4 4H10z" } },
  ],
  image: [
    { tag: "rect", attrs: { x: "3", y: "5", width: "18", height: "14", rx: "2" } },
    { tag: "circle", attrs: { cx: "9", cy: "10", r: "1.5" } },
    { tag: "path", attrs: { d: "m21 15-4-4L7 19" } },
  ],
  "minus-circle": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "path", attrs: { d: "M8 12h8" } },
  ],
  pencil: [
    { tag: "path", attrs: { d: "M17 3a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5z" } },
    { tag: "path", attrs: { d: "m15 5 4 4" } },
  ],
  "pie-chart": [
    { tag: "path", attrs: { d: "M12 3v9h9" } },
    { tag: "path", attrs: { d: "M21 12a9 9 0 1 1-9-9" } },
  ],
  "plus-circle": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } },
    { tag: "path", attrs: { d: "M12 8v8" } },
    { tag: "path", attrs: { d: "M8 12h8" } },
  ],
  "receipt-text": [
    { tag: "path", attrs: { d: "M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1V3z" } },
    { tag: "path", attrs: { d: "M8 8h8" } },
    { tag: "path", attrs: { d: "M8 12h8" } },
    { tag: "path", attrs: { d: "M8 16h5" } },
  ],
  "rotate-ccw": [
    { tag: "path", attrs: { d: "M3 12a9 9 0 1 0 3-6.7" } },
    { tag: "path", attrs: { d: "M3 4v6h6" } },
  ],
  save: [
    { tag: "path", attrs: { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" } },
    { tag: "path", attrs: { d: "M17 21v-8H7v8" } },
    { tag: "path", attrs: { d: "M7 3v5h8" } },
  ],
  "scan-text": [
    { tag: "path", attrs: { d: "M4 7V5a1 1 0 0 1 1-1h2" } },
    { tag: "path", attrs: { d: "M17 4h2a1 1 0 0 1 1 1v2" } },
    { tag: "path", attrs: { d: "M20 17v2a1 1 0 0 1-1 1h-2" } },
    { tag: "path", attrs: { d: "M7 20H5a1 1 0 0 1-1-1v-2" } },
    { tag: "path", attrs: { d: "M8 9h8" } },
    { tag: "path", attrs: { d: "M8 13h6" } },
  ],
  search: [
    { tag: "circle", attrs: { cx: "11", cy: "11", r: "7" } },
    { tag: "path", attrs: { d: "m20 20-4-4" } },
  ],
  sparkles: [
    { tag: "path", attrs: { d: "M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" } },
    { tag: "path", attrs: { d: "M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" } },
  ],
  table: [
    { tag: "rect", attrs: { x: "3", y: "4", width: "18", height: "16", rx: "2" } },
    { tag: "path", attrs: { d: "M3 10h18" } },
    { tag: "path", attrs: { d: "M9 4v16" } },
    { tag: "path", attrs: { d: "M15 4v16" } },
  ],
  "trash-2": [
    { tag: "path", attrs: { d: "M3 6h18" } },
    { tag: "path", attrs: { d: "M8 6V4h8v2" } },
    { tag: "path", attrs: { d: "M19 6l-1 15H6L5 6" } },
    { tag: "path", attrs: { d: "M10 11v6" } },
    { tag: "path", attrs: { d: "M14 11v6" } },
  ],
  "trending-down": [
    { tag: "path", attrs: { d: "m3 7 7 7 4-4 7 7" } },
    { tag: "path", attrs: { d: "M21 10v7h-7" } },
  ],
  "trending-up": [
    { tag: "path", attrs: { d: "m3 17 7-7 4 4 7-7" } },
    { tag: "path", attrs: { d: "M14 7h7v7" } },
  ],
  upload: [
    { tag: "path", attrs: { d: "M12 21V9" } },
    { tag: "path", attrs: { d: "m7 14 5-5 5 5" } },
    { tag: "path", attrs: { d: "M5 3h14" } },
  ],
  "wallet-cards": [
    { tag: "rect", attrs: { x: "3", y: "6", width: "18", height: "14", rx: "2" } },
    { tag: "path", attrs: { d: "M7 6V4h10v2" } },
    { tag: "path", attrs: { d: "M16 12h3" } },
  ],
};

function setTransactionType(type) {
  selectedType = type === "income" ? "income" : "expense";
  document.querySelectorAll("[data-transaction-type]").forEach((button) => {
    button.classList.toggle("active", button.dataset.transactionType === selectedType);
  });

  const categories = selectedType === "income" ? incomeCategories : expenseCategories;
  const currentValue = elements.categoryInput.value;
  elements.categoryInput.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`)
    .join("");

  if (categories.some((category) => category.name === currentValue)) {
    elements.categoryInput.value = currentValue;
  }
}

function saveFromForm(event) {
  event.preventDefault();

  const amount = Math.round(Number(elements.amountInput.value));
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Nominal harus lebih dari 0.");
    return;
  }

  const editingId = elements.editingId.value;
  const previous = transactions.find((item) => item.id === editingId);
  const transaction = {
    id: editingId || createId(),
    type: selectedType,
    amount,
    date: elements.dateInput.value,
    category: elements.categoryInput.value,
    account: elements.accountInput.value,
    merchant: elements.merchantInput.value.trim() || (selectedType === "income" ? "Pemasukan" : "Pengeluaran"),
    note: elements.noteInput.value.trim(),
    source: previous?.source || "manual",
    rawText: previous?.rawText || "",
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (editingId) {
    transactions = transactions.map((item) => (item.id === editingId ? transaction : item));
    showToast("Transaksi diperbarui.");
  } else {
    transactions.unshift(transaction);
    showToast("Transaksi disimpan.");
  }

  persistTransactions();
  resetForm();
  refreshUI();
}

function resetForm() {
  elements.transactionForm.reset();
  elements.editingId.value = "";
  elements.dateInput.value = toInputDate(new Date());
  elements.formModeLabel.textContent = "Tambah transaksi baru";
  setTransactionType("expense");
}

function fillForm(transaction) {
  elements.editingId.value = transaction.id || "";
  setTransactionType(transaction.type);
  elements.amountInput.value = transaction.amount || "";
  elements.dateInput.value = transaction.date || toInputDate(new Date());
  elements.categoryInput.value = transaction.category || (transaction.type === "income" ? "Lainnya" : "Lainnya");
  elements.accountInput.value = transaction.account || "Tunai";
  elements.merchantInput.value = transaction.merchant || "";
  elements.noteInput.value = transaction.note || "";
  elements.formModeLabel.textContent = transaction.id ? "Edit transaksi" : "Dari bill scanner";
}

function renderSummary() {
  const currentMonth = getMonthKey(new Date());
  const totalIncome = sum(transactions.filter((item) => item.type === "income"), "amount");
  const totalExpense = sum(transactions.filter((item) => item.type === "expense"), "amount");
  const monthlyIncome = sum(
    transactions.filter((item) => item.type === "income" && getMonthKey(item.date) === currentMonth),
    "amount"
  );
  const monthlyExpense = sum(
    transactions.filter((item) => item.type === "expense" && getMonthKey(item.date) === currentMonth),
    "amount"
  );

  elements.balanceValue.textContent = formatCurrency(totalIncome - totalExpense);
  elements.incomeValue.textContent = formatCurrency(monthlyIncome);
  elements.expenseValue.textContent = formatCurrency(monthlyExpense);
  elements.cashflowValue.textContent = formatCurrency(monthlyIncome - monthlyExpense);
}

function renderMonthOptions() {
  const currentValue = elements.monthFilter.value || "all";
  const months = [...new Set(transactions.map((item) => getMonthKey(item.date)).filter(Boolean))].sort().reverse();
  elements.monthFilter.innerHTML = `<option value="all">Semua bulan</option>${months
    .map((month) => `<option value="${month}">${formatMonthLabel(month)}</option>`)
    .join("")}`;
  elements.monthFilter.value = months.includes(currentValue) ? currentValue : "all";
}

function renderTransactions() {
  const typeFilter = elements.typeFilter.value;
  const monthFilter = elements.monthFilter.value;
  const search = elements.searchInput.value.trim().toLowerCase();

  const filtered = transactions
    .filter((item) => typeFilter === "all" || item.type === typeFilter)
    .filter((item) => monthFilter === "all" || getMonthKey(item.date) === monthFilter)
    .filter((item) => {
      if (!search) return true;
      return [item.merchant, item.category, item.account, item.note]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((a, b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`));

  elements.transactionCount.textContent = `${filtered.length} transaksi`;

  if (!filtered.length) {
    elements.transactionList.innerHTML = `<div class="empty-state">Belum ada transaksi yang cocok.</div>`;
    refreshIcons();
    return;
  }

  elements.transactionList.innerHTML = filtered
    .map((item) => {
      const typeLabel = item.type === "income" ? "Pemasukan" : "Pengeluaran";
      const sign = item.type === "income" ? "+" : "-";
      const icon = item.type === "income" ? "arrow-down-left" : "arrow-up-right";
      const sourceChip = item.source === "bill" ? `<span class="source-chip">Bill</span>` : "";
      return `
        <article class="transaction-item">
          <div class="transaction-type-icon ${item.type}" aria-hidden="true"><i data-lucide="${icon}"></i></div>
          <div class="transaction-main">
            <div class="transaction-title">
              <span>${escapeHtml(item.merchant)}</span>
              ${sourceChip}
            </div>
            <div class="transaction-meta">
              <span>${escapeHtml(typeLabel)}</span>
              <span>${escapeHtml(item.category)}</span>
              <span>${escapeHtml(item.account)}</span>
              <span>${formatShortDate(item.date)}</span>
            </div>
          </div>
          <div class="transaction-amount ${item.type}">${sign}${formatCurrency(item.amount)}</div>
          <div class="transaction-actions">
            <button class="icon-button" type="button" data-action="edit" data-id="${item.id}" title="Edit transaksi" aria-label="Edit transaksi">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-button" type="button" data-action="delete" data-id="${item.id}" title="Hapus transaksi" aria-label="Hapus transaksi">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  refreshIcons();
}

function handleTransactionAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const transaction = transactions.find((item) => item.id === button.dataset.id);
  if (!transaction) return;

  if (button.dataset.action === "edit") {
    fillForm(transaction);
    elements.transactionForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Hapus transaksi ${transaction.merchant}?`);
    if (!confirmed) return;
    transactions = transactions.filter((item) => item.id !== transaction.id);
    persistTransactions();
    refreshUI();
    showToast("Transaksi dihapus.");
  }
}

function renderMonthlyChart() {
  const canvas = elements.monthlyChart;
  const context = canvas.getContext("2d");
  const cssWidth = canvas.clientWidth || 800;
  const cssHeight = canvas.clientHeight || 300;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  if (!transactions.length) {
    context.fillStyle = "#64707d";
    context.textAlign = "center";
    context.font = "700 14px Inter, system-ui, sans-serif";
    context.fillText("Belum ada data", cssWidth / 2, cssHeight / 2);
    context.textAlign = "start";
    return;
  }

  const months = getLastMonths(6);
  const data = months.map((month) => {
    const monthTransactions = transactions.filter((item) => getMonthKey(item.date) === month.key);
    return {
      ...month,
      income: sum(monthTransactions.filter((item) => item.type === "income"), "amount"),
      expense: sum(monthTransactions.filter((item) => item.type === "expense"), "amount"),
    };
  });

  const maxValue = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);
  const padding = { top: 20, right: 18, bottom: 44, left: 72 };
  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(24, groupWidth * 0.24);

  context.strokeStyle = "#d9e2e6";
  context.lineWidth = 1;
  context.fillStyle = "#64707d";
  context.font = "12px Inter, system-ui, sans-serif";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(cssWidth - padding.right, y);
    context.stroke();
    const labelValue = Math.round(maxValue - (maxValue / 4) * i);
    context.fillText(compactCurrency(labelValue), 8, y + 4);
  }

  data.forEach((item, index) => {
    const xCenter = padding.left + groupWidth * index + groupWidth / 2;
    const incomeHeight = (item.income / maxValue) * chartHeight;
    const expenseHeight = (item.expense / maxValue) * chartHeight;
    const baseY = padding.top + chartHeight;

    context.fillStyle = "#15803d";
    roundRect(context, xCenter - barWidth - 3, baseY - incomeHeight, barWidth, incomeHeight, 5);
    context.fill();

    context.fillStyle = "#c2410c";
    roundRect(context, xCenter + 3, baseY - expenseHeight, barWidth, expenseHeight, 5);
    context.fill();

    context.fillStyle = "#64707d";
    context.textAlign = "center";
    context.fillText(item.label, xCenter, cssHeight - 18);
    context.textAlign = "start";
  });

}

function renderCategoryBreakdown() {
  const currentMonth = getMonthKey(new Date());
  const expenses = transactions.filter((item) => item.type === "expense" && getMonthKey(item.date) === currentMonth);
  const grouped = expenses.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.amount);
    return accumulator;
  }, {});
  const rows = Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const max = Math.max(...rows.map((row) => row.amount), 1);

  if (!rows.length) {
    elements.categoryBreakdown.innerHTML = `<div class="empty-state">Belum ada pengeluaran bulan ini.</div>`;
    return;
  }

  elements.categoryBreakdown.innerHTML = rows
    .map((row) => {
      const meta = getCategoryMeta(row.category, "expense");
      const percent = Math.max(2, Math.round((row.amount / max) * 100));
      return `
        <div class="category-item">
          <div class="category-row">
            <span class="category-name">
              <span class="category-dot" style="background:${meta.color}"></span>
              <span>${escapeHtml(row.category)}</span>
            </span>
            <span class="category-amount">${formatCurrency(row.amount)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${percent}%; background:${meta.color}"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function handleReceiptFile(event) {
  const file = event.target.files?.[0];
  selectedReceiptFile = file || null;
  lastDetection = null;
  elements.detectedBox.classList.add("hidden");
  elements.scanProgress.textContent = "0%";
  elements.scanStatus.textContent = file ? "Bill dipilih" : "Siap membaca bill";

  const previewBox = elements.receiptPreview.closest(".receipt-preview");
  previewBox.classList.remove("has-image");
  elements.receiptPreview.removeAttribute("src");
  elements.scanReceiptButton.disabled = true;

  if (!file) return;

  if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
    const reader = new FileReader();
    reader.onload = () => {
      elements.receiptText.value = String(reader.result || "");
      parseReceiptText();
    };
    reader.readAsText(file);
    return;
  }

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      elements.receiptPreview.src = String(reader.result || "");
      previewBox.classList.add("has-image");
    };
    reader.readAsDataURL(file);
    elements.scanReceiptButton.disabled = false;
    return;
  }

  showToast("Format bill belum didukung.");
}

async function scanReceiptImage() {
  if (!selectedReceiptFile) {
    showToast("Pilih gambar bill terlebih dahulu.");
    return;
  }

  if (!window.Tesseract) {
    showToast("OCR belum siap. Cek koneksi internet lalu coba lagi.");
    return;
  }

  elements.scanReceiptButton.disabled = true;
  elements.scanStatus.textContent = "Membaca gambar bill";
  elements.scanProgress.textContent = "0%";

  try {
    const result = await window.Tesseract.recognize(selectedReceiptFile, "ind+eng", {
      logger(message) {
        if (message.status) {
          elements.scanStatus.textContent = normalizeOcrStatus(message.status);
        }
        if (typeof message.progress === "number") {
          elements.scanProgress.textContent = `${Math.round(message.progress * 100)}%`;
        }
      },
    });

    elements.receiptText.value = result?.data?.text || "";
    elements.scanStatus.textContent = "Bill selesai dibaca";
    elements.scanProgress.textContent = "100%";
    parseReceiptText();
  } catch (error) {
    console.error(error);
    elements.scanStatus.textContent = "OCR gagal";
    showToast("OCR gagal membaca gambar. Coba paste teks bill.");
  } finally {
    elements.scanReceiptButton.disabled = false;
  }
}

function parseReceiptText() {
  const rawText = elements.receiptText.value.trim();
  if (!rawText) {
    showToast("Teks bill masih kosong.");
    return;
  }

  const detection = parseBill(rawText);
  if (!detection.amount) {
    showToast("Nominal belum terbaca. Periksa teks bill.");
  }

  lastDetection = detection;
  renderDetection(detection);
}

function renderDetection(detection) {
  elements.detectedType.textContent = detection.type === "income" ? "Pemasukan" : "Pengeluaran";
  elements.detectedAmount.textContent = detection.amount ? formatCurrency(detection.amount) : "Rp0";
  elements.detectedDate.textContent = formatShortDate(detection.date);
  elements.detectedCategory.textContent = detection.category;
  elements.detectedMerchant.textContent = detection.merchant;
  elements.detectedBox.classList.remove("hidden");
}

function fillFormFromDetection() {
  if (!lastDetection) {
    showToast("Belum ada hasil bill.");
    return;
  }

  fillForm({
    id: "",
    type: lastDetection.type,
    amount: lastDetection.amount,
    date: lastDetection.date,
    category: lastDetection.category,
    account: lastDetection.account,
    merchant: lastDetection.merchant,
    note: lastDetection.note,
  });
  showToast("Hasil bill masuk ke form.");
}

function saveDetectionAsTransaction() {
  if (!lastDetection) {
    showToast("Belum ada hasil bill.");
    return;
  }

  if (!lastDetection.amount) {
    showToast("Nominal bill belum valid.");
    return;
  }

  transactions.unshift({
    id: createId(),
    type: lastDetection.type,
    amount: lastDetection.amount,
    date: lastDetection.date,
    category: lastDetection.category,
    account: lastDetection.account,
    merchant: lastDetection.merchant,
    note: lastDetection.note,
    source: "bill",
    rawText: elements.receiptText.value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  persistTransactions();
  refreshUI();
  showToast("Transaksi dari bill disimpan.");
}

function parseBill(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 1);
  const text = lines.join(" ").toLowerCase();
  const type = inferType(text);
  const amount = findBestAmount(lines);
  const date = findBestDate(lines) || toInputDate(new Date());
  const merchant = findMerchant(lines, type);
  const category = inferCategory(text, type);
  const account = inferAccount(text);
  const note = lines.slice(0, 8).join(" | ");

  return {
    type,
    amount,
    date,
    category,
    account,
    merchant,
    note,
  };
}

function inferType(text) {
  const incomeKeywords = [
    "gaji",
    "salary",
    "payroll",
    "transfer masuk",
    "dana masuk",
    "uang masuk",
    "pendapatan",
    "pemasukan",
    "refund",
    "cashback",
    "reimbursement",
    "dividen",
    "bonus",
  ];
  return incomeKeywords.some((keyword) => text.includes(keyword)) ? "income" : "expense";
}

function findBestAmount(lines) {
  const candidates = [];

  lines.forEach((line, lineIndex) => {
    const lower = line.toLowerCase();
    const numbers = extractMoneyCandidates(line);
    if (!numbers.length) return;

    const hasCurrency = /\b(rp|idr|total)\b/i.test(line);
    let score = hasCurrency ? 15 : 0;

    if (/grand\s*total|total\s*(belanja|bayar|pembayaran|tagihan|due|amount)|jumlah\s*(bayar|tagihan)|amount\s*due/i.test(lower)) {
      score += 100;
    } else if (/\btotal\b/i.test(lower)) {
      score += 80;
    }

    if (/\b(subtotal|sub total)\b/i.test(lower)) score += 18;
    if (/\b(kembali|change|kembalian|diskon|discount|tax|pajak|ppn|qty|jumlah item)\b/i.test(lower)) score -= 35;

    numbers.forEach((amount) => {
      candidates.push({
        amount,
        score: score + Math.min(amount / 100000, 10) - lineIndex * 0.2,
      });
    });
  });

  if (!candidates.length) return 0;
  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  return Math.round(candidates[0].amount);
}

function extractMoneyCandidates(line) {
  const matches = line.match(/(?:rp|idr)?\s*-?\d[\d\s.,]*/gi) || [];
  return matches
    .map((match) => parseMoney(match))
    .filter((value) => Number.isFinite(value) && value > 0)
    .filter((value) => value >= 100 || /rp|idr/i.test(line));
}

function parseMoney(raw) {
  let value = String(raw).toLowerCase().replace(/rp|idr/g, "").replace(/\s+/g, "");
  value = value.replace(/[^\d.,-]/g, "");
  if (!value || value === "-") return 0;

  const hasDot = value.includes(".");
  const hasComma = value.includes(",");

  if (hasDot && hasComma) {
    const lastDot = value.lastIndexOf(".");
    const lastComma = value.lastIndexOf(",");
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    value = value.split(thousandSep).join("");
    value = value.replace(decimalSep, ".");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const parts = value.split(sep);

    if (parts.length > 2) {
      value = parts.join("");
    } else {
      const [integer, fraction = ""] = parts;
      if (fraction.length === 3) {
        value = `${integer}${fraction}`;
      } else if (fraction.length > 0 && fraction.length <= 2) {
        value = `${integer}.${fraction}`;
      } else {
        value = `${integer}${fraction}`;
      }
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(Math.abs(parsed)) : 0;
}

function findBestDate(lines) {
  for (const line of lines) {
    const yearFirst = line.match(/\b(20\d{2}|19\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);
    if (yearFirst) {
      const [, year, month, day] = yearFirst;
      const date = createDateString(Number(year), Number(month), Number(day));
      if (date) return date;
    }

    const dayFirst = line.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
    if (dayFirst) {
      const [, day, month, rawYear] = dayFirst;
      const year = normalizeYear(rawYear);
      const date = createDateString(year, Number(month), Number(day));
      if (date) return date;
    }

    const textMonth = line.match(/\b(\d{1,2})\s+([a-zA-Z]+)\s+(\d{2,4})\b/);
    if (textMonth) {
      const [, day, monthName, rawYear] = textMonth;
      const month = monthNameToNumber(monthName);
      const year = normalizeYear(rawYear);
      const date = createDateString(year, month, Number(day));
      if (date) return date;
    }

    const monthFirst = line.match(/\b([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
    if (monthFirst) {
      const [, monthName, day, rawYear] = monthFirst;
      const month = monthNameToNumber(monthName);
      const date = createDateString(Number(rawYear), month, Number(day));
      if (date) return date;
    }
  }

  return "";
}

function findMerchant(lines, type) {
  const blocked = /\b(receipt|struk|nota|invoice|total|subtotal|tanggal|date|time|waktu|kasir|cashier|server|meja|table|qty|jumlah|pajak|tax|ppn|kembali|change|tunai|cash|debit|credit|visa|mastercard|no\.?|nomor|telp|phone)\b/i;
  const candidate = lines.find((line) => {
    const cleaned = line.replace(/[^a-zA-Z0-9&.\-\s]/g, "").trim();
    if (cleaned.length < 3 || cleaned.length > 48) return false;
    if (!/[a-zA-Z]/.test(cleaned)) return false;
    if (blocked.test(cleaned)) return false;
    if (extractMoneyCandidates(cleaned).length) return false;
    return true;
  });

  if (candidate) {
    return titleCase(candidate.replace(/\s{2,}/g, " ").slice(0, 48));
  }

  return type === "income" ? "Pemasukan" : "Pembelian";
}

function inferCategory(text, type) {
  if (type === "income") {
    const incomeRules = [
      ["Gaji", ["gaji", "salary", "payroll", "upah"]],
      ["Freelance", ["freelance", "project", "invoice", "fee", "honor"]],
      ["Investasi", ["dividen", "dividend", "bunga", "interest", "saham", "crypto", "reksa"]],
      ["Hadiah", ["hadiah", "bonus", "gift"]],
      ["Refund", ["refund", "cashback", "reimbursement", "retur"]],
    ];
    return matchRule(text, incomeRules, "Lainnya");
  }

  const expenseRules = [
    ["Makan & Minum", ["makan", "minum", "resto", "restaurant", "cafe", "kopi", "coffee", "ayam", "bakso", "nasi", "gofood", "grabfood", "food"]],
    ["Belanja", ["indomaret", "alfamart", "supermarket", "hypermart", "mart", "toko", "grocer", "market", "mall"]],
    ["Transportasi", ["gojek", "grab", "taxi", "tol", "parkir", "parking", "pertamina", "shell", "bensin", "kereta", "bus"]],
    ["Tagihan", ["tagihan", "bill", "listrik", "pln", "internet", "wifi", "pdam", "pulsa", "token", "telkomsel", "xl", "indihome"]],
    ["Kesehatan", ["apotek", "klinik", "hospital", "dokter", "pharmacy", "obat"]],
    ["Hiburan", ["bioskop", "cinema", "movie", "netflix", "spotify", "game", "karaoke"]],
    ["Pendidikan", ["sekolah", "kampus", "course", "kursus", "buku", "book", "udemy"]],
    ["Rumah", ["rumah", "furniture", "ace hardware", "ikea", "perabot", "laundry"]],
  ];
  return matchRule(text, expenseRules, "Lainnya");
}

function matchRule(text, rules, fallback) {
  const found = rules.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)));
  return found ? found[0] : fallback;
}

function inferAccount(text) {
  if (/\b(visa|mastercard|credit|kartu kredit)\b/i.test(text)) return "Kartu Kredit";
  if (/\b(ovo|gopay|dana|shopeepay|linkaja|qris|e-wallet|ewallet)\b/i.test(text)) return "E-Wallet";
  if (/\b(debit|transfer|bca|mandiri|bni|bri|cimb|bank)\b/i.test(text)) return "Bank";
  return "Tunai";
}

function exportCsv() {
  const headers = ["tanggal", "jenis", "nominal", "kategori", "akun", "merchant", "catatan", "sumber"];
  const rows = transactions.map((item) => [
    item.date,
    item.type,
    item.amount,
    item.category,
    item.account,
    item.merchant,
    item.note,
    item.source,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadBlob(csv, `dompet-pribadi-${toInputDate(new Date())}.csv`, "text/csv;charset=utf-8");
}

function exportJson() {
  const payload = JSON.stringify(transactions, null, 2);
  downloadBlob(payload, `dompet-pribadi-${toInputDate(new Date())}.json`, "application/json;charset=utf-8");
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(parsed)) throw new Error("Invalid JSON");
      const imported = parsed.filter(isValidTransaction).map((item) => ({
        ...item,
        id: item.id || createId(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const knownIds = new Set(transactions.map((item) => item.id));
      transactions = [...imported.filter((item) => !knownIds.has(item.id)), ...transactions];
      persistTransactions();
      refreshUI();
      showToast(`${imported.length} transaksi diimport.`);
    } catch (error) {
      showToast("File JSON tidak valid.");
    } finally {
      elements.importJsonFile.value = "";
    }
  };
  reader.readAsText(file);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sum(items, field) {
  return items.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function compactCurrency(value) {
  if (value >= 1000000) return `${Math.round(value / 1000000)} jt`;
  if (value >= 1000) return `${Math.round(value / 1000)} rb`;
  return `${Math.round(value)}`;
}

function toInputDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getMonthKey(date) {
  if (date instanceof Date) return toInputDate(date).slice(0, 7);
  return String(date || "").slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatShortDate(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year, month - 1, day)
  );
}

function getLastMonths(count) {
  const today = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = toInputDate(date).slice(0, 7);
    months.push({
      key,
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
    });
  }
  return months;
}

function getCategoryMeta(category, type) {
  const categories = type === "income" ? incomeCategories : expenseCategories;
  return categories.find((item) => item.name === category) || { color: "#64748b" };
}

function normalizeLine(line) {
  return String(line)
    .replace(/[|_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeYear(year) {
  const value = Number(year);
  if (value < 100) return value >= 70 ? 1900 + value : 2000 + value;
  return value;
}

function createDateString(year, month, day) {
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return toInputDate(date);
}

function monthNameToNumber(name) {
  const key = String(name).toLowerCase().slice(0, 3);
  const months = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    mei: 5,
    may: 5,
    jun: 6,
    jul: 7,
    agu: 8,
    aug: 8,
    sep: 9,
    okt: 10,
    oct: 10,
    nov: 11,
    des: 12,
    dec: 12,
  };
  return months[key] || 0;
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeOcrStatus(status) {
  const labels = {
    "loading tesseract core": "Menyiapkan OCR",
    "initializing tesseract": "Menyiapkan OCR",
    "loading language traineddata": "Memuat bahasa",
    "initializing api": "Menyiapkan pembaca",
    "recognizing text": "Membaca teks",
  };
  return labels[status] || status;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function roundRect(context, x, y, width, height, radius) {
  const safeHeight = Math.max(height, 0);
  const safeRadius = Math.min(radius, width / 2, safeHeight / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + safeHeight - safeRadius);
  context.quadraticCurveTo(x + width, y + safeHeight, x + width - safeRadius, y + safeHeight);
  context.lineTo(x + safeRadius, y + safeHeight);
  context.quadraticCurveTo(x, y + safeHeight, x, y + safeHeight - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2600);
}
