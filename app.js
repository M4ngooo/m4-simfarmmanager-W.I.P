const APP_STORAGE_KEY = "fs25_multi_farm_data";
const CURRENT_FARM_KEY = "fs25_current_farm_id";
const LEGACY_ZIP_STORAGE_KEY = "fs25_saves_zip";
const LEGACY_PLAN_STORAGE_KEY = "fs25_workplan";
const LEGACY_PURCHASE_STORAGE_KEY = "fs25_purchase_plan";

const saveZipInput = document.getElementById("saveZipInput");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const selectedFileName = document.getElementById("selectedFileName");
const clearAllSavesBtn = document.getElementById("clearAllSavesBtn");
const zipStatus = document.getElementById("zipStatus");
const saveList = document.getElementById("saveList");
const addRowBtn = document.getElementById("addRowBtn");
const planTableBody = document.getElementById("planTableBody");
const addPurchaseBtn = document.getElementById("addPurchaseBtn");
const purchaseTableBody = document.getElementById("purchaseTableBody");
const farmSelect = document.getElementById("farmSelect");
const addFarmBtn = document.getElementById("addFarmBtn");
const farmName = document.querySelector(".farm-name");
const farmModal = document.getElementById("farmModal");
const farmNameInput = document.getElementById("farmNameInput");
const farmModalCancelBtn = document.getElementById("farmModalCancelBtn");
const farmModalSaveBtn = document.getElementById("farmModalSaveBtn");
const daysPerMonthInput = document.getElementById("daysPerMonthInput");
const refreshFinanceBtn = document.getElementById("refreshFinanceBtn");
const clearFinanceBtn = document.getElementById("clearFinanceBtn");
const financeTableBody = document.getElementById("financeTableBody");
const financeSummary = document.getElementById("financeSummary");
const seasonChart = document.getElementById("seasonChart");
const topDaysPerMonthInput = document.getElementById("topDaysPerMonthInput");
const saveDifficultySelect = document.getElementById("saveDifficultySelect");
const saveStartDateInput = document.getElementById("saveStartDateInput");
const farmNotebookInput = document.getElementById("farmNotebookInput");
const calcDisplay = document.getElementById("calcDisplay");
const calcButtons = document.querySelectorAll("[data-calc-digit], [data-calc-op], [data-calc-action]");

const SEASON_MONTHS = [
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
  "Styczeń",
  "Luty"
];

function createDefaultFinanceRows() {
  return SEASON_MONTHS.map((month) => ({ month, income: "", expense: "" }));
}

function createEmptyFarmData() {
  return {
    saves: [],
    plan: [{ field: "", crop: "", status: "" }],
    purchases: [{ item: "", price: "", status: "" }],
    daysPerMonth: 3,
    finance: createDefaultFinanceRows(),
    notebook: "",
    saveDifficulty: "Normalny",
    saveStartDate: ""
  };
}

function ensureFarmDataShape(farmData) {
  if (!farmData || typeof farmData !== "object") return createEmptyFarmData();
  if (!Array.isArray(farmData.saves)) farmData.saves = [];
  if (!Array.isArray(farmData.plan) || !farmData.plan.length) {
    farmData.plan = [{ field: "", crop: "", status: "" }];
  }
  if (!Array.isArray(farmData.purchases) || !farmData.purchases.length) {
    farmData.purchases = [{ item: "", price: "", status: "" }];
  }
  if (!Number.isFinite(Number(farmData.daysPerMonth))) {
    farmData.daysPerMonth = 3;
  }
  if (!Array.isArray(farmData.finance) || farmData.finance.length !== SEASON_MONTHS.length) {
    farmData.finance = createDefaultFinanceRows();
  } else {
    farmData.finance = SEASON_MONTHS.map((month, index) => {
      const row = farmData.finance[index] || {};
      return { month, income: row.income ?? "", expense: row.expense ?? "" };
    });
  }
  if (typeof farmData.notebook !== "string") farmData.notebook = "";
  if (typeof farmData.saveDifficulty !== "string" || !farmData.saveDifficulty) {
    farmData.saveDifficulty = "Normalny";
  }
  if (typeof farmData.saveStartDate !== "string") farmData.saveStartDate = "";
  return farmData;
}

function readLegacyArray(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function readAppState() {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.farms) && parsed.dataByFarm) {
        parsed.farms.forEach((farm) => {
          parsed.dataByFarm[farm.id] = ensureFarmDataShape(parsed.dataByFarm[farm.id]);
        });
        return parsed;
      }
    } catch (error) {
      console.error("Nie udalo sie odczytac danych gospodarstw:", error);
    }
  }

  const defaultFarmId = "farm_default";
  const legacySaves = readLegacyArray(LEGACY_ZIP_STORAGE_KEY);
  const legacyPlan = readLegacyArray(LEGACY_PLAN_STORAGE_KEY);
  const legacyPurchases = readLegacyArray(LEGACY_PURCHASE_STORAGE_KEY);

  const state = {
    farms: [{ id: defaultFarmId, name: "Gospodarstwo Solec" }],
    dataByFarm: {
      [defaultFarmId]: ensureFarmDataShape({
        ...createEmptyFarmData(),
        saves: legacySaves,
        plan: legacyPlan.length ? legacyPlan : [{ field: "", crop: "", status: "" }],
        purchases: legacyPurchases.length ? legacyPurchases : [{ item: "", price: "", status: "" }]
      })
    }
  };

  localStorage.removeItem(LEGACY_ZIP_STORAGE_KEY);
  localStorage.removeItem(LEGACY_PLAN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_PURCHASE_STORAGE_KEY);
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(CURRENT_FARM_KEY, defaultFarmId);
  return state;
}

function saveAppState(state) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
}

let appState = readAppState();
let calcState = {
  display: "0",
  firstValue: null,
  operator: null,
  waitingSecond: false
};

function getCurrentFarmId() {
  const savedId = localStorage.getItem(CURRENT_FARM_KEY);
  const exists = appState.farms.some((farm) => farm.id === savedId);
  if (savedId && exists) return savedId;
  const fallbackId = appState.farms[0]?.id;
  localStorage.setItem(CURRENT_FARM_KEY, fallbackId);
  return fallbackId;
}

function getCurrentFarm() {
  return appState.farms.find((farm) => farm.id === getCurrentFarmId());
}

function getCurrentFarmData() {
  const farmId = getCurrentFarmId();
  if (!appState.dataByFarm[farmId]) {
    appState.dataByFarm[farmId] = createEmptyFarmData();
  }
  appState.dataByFarm[farmId] = ensureFarmDataShape(appState.dataByFarm[farmId]);
  saveAppState(appState);
  return appState.dataByFarm[farmId];
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getDateText(timestamp) {
  return new Date(timestamp).toLocaleString("pl-PL");
}

function renderFarmSelector() {
  const currentId = getCurrentFarmId();
  farmSelect.innerHTML = "";
  appState.farms.forEach((farm) => {
    const option = document.createElement("option");
    option.value = farm.id;
    option.textContent = farm.name;
    if (farm.id === currentId) option.selected = true;
    farmSelect.appendChild(option);
  });
  farmName.textContent = getCurrentFarm().name;
}

function removeSave(id) {
  const farmData = getCurrentFarmData();
  farmData.saves = farmData.saves.filter((save) => save.id !== id);
  saveAppState(appState);
  updateZipStatus();
}

function updateZipStatus() {
  const saves = getCurrentFarmData().saves;
  saveList.innerHTML = "";

  if (!saves.length) {
    zipStatus.innerHTML =
      '<i class="fa-solid fa-circle-info"></i> Nie dodano jeszcze zadnego save ZIP.';
    return;
  }

  zipStatus.innerHTML = `<i class="fa-solid fa-database"></i> Liczba zapisanych save ZIP: ${saves.length}`;

  saves
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .forEach((zip) => {
      const item = document.createElement("div");
      item.className = "save-item";

      const meta = document.createElement("div");
      meta.className = "save-meta";

      const name = document.createElement("span");
      name.className = "save-name";
      name.textContent = `${zip.name} (${formatFileSize(zip.size)})`;

      const date = document.createElement("span");
      date.className = "save-date";
      date.textContent = `Wgrano: ${getDateText(zip.savedAt)}`;

      meta.appendChild(name);
      meta.appendChild(date);

      const actions = document.createElement("div");
      actions.className = "save-actions";

      const download = document.createElement("a");
      download.className = "btn btn-compact";
      download.href = zip.dataUrl;
      download.download = zip.name;
      download.innerHTML = '<i class="fa-solid fa-download"></i> Pobierz';

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-compact delete-row";
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Usun';
      deleteBtn.addEventListener("click", () => removeSave(zip.id));

      actions.appendChild(download);
      actions.appendChild(deleteBtn);
      item.appendChild(meta);
      item.appendChild(actions);
      saveList.appendChild(item);
    });
}

function savePlanRows() {
  const rows = [];
  planTableBody.querySelectorAll("tr").forEach((tr) => {
    const field = tr.querySelector('[data-field="field"]').value.trim();
    const crop = tr.querySelector('[data-field="crop"]').value.trim();
    const status = tr.querySelector('[data-field="status"]').value.trim();
    rows.push({ field, crop, status });
  });
  getCurrentFarmData().plan = rows;
  saveAppState(appState);
}

function createCellInput(type, value, fieldName) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.dataset.field = fieldName;
  input.addEventListener("input", savePlanRows);
  return input;
}

function createRow(row = { field: "", crop: "", status: "" }) {
  const tr = document.createElement("tr");
  const fieldTd = document.createElement("td");
  fieldTd.appendChild(createCellInput("number", row.field, "field"));
  tr.appendChild(fieldTd);

  const cropTd = document.createElement("td");
  cropTd.appendChild(createCellInput("text", row.crop, "crop"));
  tr.appendChild(cropTd);

  const statusTd = document.createElement("td");
  statusTd.appendChild(createCellInput("text", row.status, "status"));
  tr.appendChild(statusTd);

  const actionTd = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-compact delete-row";
  removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Usun';
  removeBtn.addEventListener("click", () => {
    tr.remove();
    savePlanRows();
  });
  actionTd.appendChild(removeBtn);
  tr.appendChild(actionTd);
  return tr;
}

function renderPlanTable() {
  const rows = getCurrentFarmData().plan;
  planTableBody.innerHTML = "";
  const dataRows = rows.length ? rows : [{ field: "", crop: "", status: "" }];
  dataRows.forEach((row) => planTableBody.appendChild(createRow(row)));
  savePlanRows();
}

function savePurchaseRows() {
  const rows = [];
  purchaseTableBody.querySelectorAll("tr").forEach((tr) => {
    const item = tr.querySelector('[data-purchase="item"]').value.trim();
    const price = tr.querySelector('[data-purchase="price"]').value.trim();
    const status = tr.querySelector('[data-purchase="status"]').value.trim();
    rows.push({ item, price, status });
  });
  getCurrentFarmData().purchases = rows;
  saveAppState(appState);
}

function createPurchaseInput(type, value, fieldName, placeholder) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.dataset.purchase = fieldName;
  input.addEventListener("input", savePurchaseRows);
  return input;
}

function createPurchaseRow(row = { item: "", price: "", status: "" }) {
  const tr = document.createElement("tr");
  const itemTd = document.createElement("td");
  itemTd.appendChild(createPurchaseInput("text", row.item, "item", "Np. traktor, siewnik..."));
  tr.appendChild(itemTd);

  const priceTd = document.createElement("td");
  priceTd.appendChild(createPurchaseInput("text", row.price, "price", "Np. 250 000 EUR"));
  tr.appendChild(priceTd);

  const statusTd = document.createElement("td");
  statusTd.appendChild(
    createPurchaseInput("text", row.status, "status", "Np. W trakcie szukania / Kupione")
  );
  tr.appendChild(statusTd);

  const actionTd = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-compact delete-row";
  removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Usun';
  removeBtn.addEventListener("click", () => {
    tr.remove();
    savePurchaseRows();
  });
  actionTd.appendChild(removeBtn);
  tr.appendChild(actionTd);
  return tr;
}

function renderPurchaseTable() {
  const rows = getCurrentFarmData().purchases;
  purchaseTableBody.innerHTML = "";
  const dataRows = rows.length ? rows : [{ item: "", price: "", status: "" }];
  dataRows.forEach((row) => purchaseTableBody.appendChild(createPurchaseRow(row)));
  savePurchaseRows();
}

function parseMoney(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function saveFinanceRows() {
  const rows = [];
  financeTableBody.querySelectorAll("tr").forEach((tr, index) => {
    const income = tr.querySelector('[data-finance="income"]').value.trim();
    const expense = tr.querySelector('[data-finance="expense"]').value.trim();
    rows.push({ month: SEASON_MONTHS[index], income, expense });
  });
  getCurrentFarmData().finance = rows;
  saveAppState(appState);
  renderFinanceSummaryAndChart();
}

function createFinanceInput(value, fieldName) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.dataset.finance = fieldName;
  input.placeholder = "0";
  input.addEventListener("input", saveFinanceRows);
  return input;
}

function createFinanceRow(row, index) {
  const tr = document.createElement("tr");

  const monthTd = document.createElement("td");
  monthTd.textContent = SEASON_MONTHS[index];
  tr.appendChild(monthTd);

  const incomeTd = document.createElement("td");
  incomeTd.appendChild(createFinanceInput(row.income ?? "", "income"));
  tr.appendChild(incomeTd);

  const expenseTd = document.createElement("td");
  expenseTd.appendChild(createFinanceInput(row.expense ?? "", "expense"));
  tr.appendChild(expenseTd);

  const profitTd = document.createElement("td");
  profitTd.className = "finance-profit-cell";
  const profitValue = parseMoney(row.income) - parseMoney(row.expense);
  profitTd.textContent = `${profitValue.toLocaleString("pl-PL")} €`;
  tr.appendChild(profitTd);

  return tr;
}

function drawSeasonChart(rows) {
  const ctx = seasonChart.getContext("2d");
  const width = seasonChart.width;
  const height = seasonChart.height;
  ctx.clearRect(0, 0, width, height);

  const incomes = rows.map((row) => Math.max(0, parseMoney(row.income)));
  const expenses = rows.map((row) => Math.max(0, parseMoney(row.expense)));
  const maxValue = Math.max(1, ...incomes, ...expenses);

  const paddingLeft = 46;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 42;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const baseY = paddingTop + chartHeight;
  const groupWidth = chartWidth / SEASON_MONTHS.length;

  // tlo wykresu
  ctx.fillStyle = "#0a0f15";
  ctx.fillRect(0, 0, width, height);

  // pozioma siatka
  const ticks = 4;
  for (let i = 0; i <= ticks; i += 1) {
    const ratio = i / ticks;
    const y = paddingTop + ratio * chartHeight;
    const value = maxValue * (1 - ratio);

    ctx.strokeStyle = "#243141";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    ctx.fillStyle = "#7f95ab";
    ctx.font = "11px Inter, Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(value / 1000)}k`, 10, y + 3);
  }

  // słupki: zielony przychód, czerwony wydatki
  incomes.forEach((income, index) => {
    const expense = expenses[index];
    const xStart = paddingLeft + index * groupWidth;
    const barWidth = Math.max(6, groupWidth * 0.28);
    const incomeHeight = (income / maxValue) * chartHeight;
    const expenseHeight = (expense / maxValue) * chartHeight;

    const incomeX = xStart + groupWidth * 0.18;
    const expenseX = incomeX + barWidth + 4;

    ctx.fillStyle = "#53f37b";
    ctx.fillRect(incomeX, baseY - incomeHeight, barWidth, incomeHeight);

    ctx.fillStyle = "#ff788d";
    ctx.fillRect(expenseX, baseY - expenseHeight, barWidth, expenseHeight);

    ctx.fillStyle = "#8ea3b8";
    ctx.font = "10px Inter, Arial";
    ctx.textAlign = "center";
    ctx.fillText(SEASON_MONTHS[index].slice(0, 3), xStart + groupWidth / 2, height - 14);
  });
}

function renderFinanceSummaryAndChart() {
  const rows = getCurrentFarmData().finance;
  const totalIncome = rows.reduce((sum, row) => sum + parseMoney(row.income), 0);
  const totalExpense = rows.reduce((sum, row) => sum + parseMoney(row.expense), 0);
  const totalProfit = totalIncome - totalExpense;
  const daysPerMonth = Number.parseInt(getCurrentFarmData().daysPerMonth, 10) || 1;
  const daysInSeason = daysPerMonth * SEASON_MONTHS.length;
  const profitPerDay = totalProfit / daysInSeason;

  financeSummary.innerHTML =
    `<i class="fa-solid fa-chart-line"></i> Sezon: przychód ${totalIncome.toLocaleString("pl-PL")} €, ` +
    `wydatki ${totalExpense.toLocaleString("pl-PL")} €, ` +
    `zysk ${totalProfit.toLocaleString("pl-PL")} € | ` +
    `średnio ${profitPerDay.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} € / dzień`;

  drawSeasonChart(rows);
}

function renderFinanceTable() {
  const farmData = getCurrentFarmData();
  const rows = farmData.finance;
  daysPerMonthInput.value = farmData.daysPerMonth;

  financeTableBody.innerHTML = "";
  rows.forEach((row, index) => {
    financeTableBody.appendChild(createFinanceRow(row, index));
  });

  renderFinanceSummaryAndChart();
}

function renderTopSaveSettings() {
  const farmData = getCurrentFarmData();
  topDaysPerMonthInput.value = farmData.daysPerMonth;
  saveDifficultySelect.value = farmData.saveDifficulty || "Normalny";
  saveStartDateInput.value = farmData.saveStartDate || "";
}

function renderNotebookAndCalculator() {
  const farmData = getCurrentFarmData();
  farmNotebookInput.value = farmData.notebook || "";
  calcState = { display: "0", firstValue: null, operator: null, waitingSecond: false };
  calcDisplay.textContent = calcState.display;
}

function roundCalcValue(value) {
  return Number.parseFloat(value.toFixed(10));
}

function computeCalc(a, b, operator) {
  if (operator === "+") return a + b;
  if (operator === "-") return a - b;
  if (operator === "*") return a * b;
  if (operator === "/") return b === 0 ? null : a / b;
  return b;
}

function updateCalcDisplay() {
  calcDisplay.textContent = calcState.display;
}

function handleCalcDigit(digit) {
  if (calcState.waitingSecond) {
    calcState.display = digit;
    calcState.waitingSecond = false;
  } else {
    calcState.display = calcState.display === "0" ? digit : calcState.display + digit;
  }
  updateCalcDisplay();
}

function handleCalcDot() {
  if (calcState.waitingSecond) {
    calcState.display = "0.";
    calcState.waitingSecond = false;
    updateCalcDisplay();
    return;
  }
  if (!calcState.display.includes(".")) {
    calcState.display += ".";
    updateCalcDisplay();
  }
}

function handleCalcOperator(nextOperator) {
  const inputValue = Number.parseFloat(calcState.display);
  if (!Number.isFinite(inputValue)) return;

  if (calcState.firstValue === null) {
    calcState.firstValue = inputValue;
  } else if (calcState.operator && !calcState.waitingSecond) {
    const result = computeCalc(calcState.firstValue, inputValue, calcState.operator);
    if (result === null) {
      calcState.display = "Error";
      calcState.firstValue = null;
      calcState.operator = null;
      calcState.waitingSecond = true;
      updateCalcDisplay();
      return;
    }
    calcState.firstValue = roundCalcValue(result);
    calcState.display = String(calcState.firstValue);
  }

  calcState.operator = nextOperator;
  calcState.waitingSecond = true;
  updateCalcDisplay();
}

function handleCalcEquals() {
  if (!calcState.operator) return;
  const secondValue = Number.parseFloat(calcState.display);
  if (!Number.isFinite(secondValue) || calcState.firstValue === null) return;
  const result = computeCalc(calcState.firstValue, secondValue, calcState.operator);
  if (result === null) {
    calcState.display = "Error";
  } else {
    const normalized = roundCalcValue(result);
    calcState.display = String(normalized);
    calcState.firstValue = normalized;
  }
  calcState.operator = null;
  calcState.waitingSecond = true;
  updateCalcDisplay();
}

function handleCalcAction(action) {
  if (action === "clear") {
    calcState = { display: "0", firstValue: null, operator: null, waitingSecond: false };
    updateCalcDisplay();
    return;
  }

  if (action === "plusminus") {
    if (calcState.display !== "0" && calcState.display !== "Error") {
      calcState.display = calcState.display.startsWith("-")
        ? calcState.display.slice(1)
        : `-${calcState.display}`;
      updateCalcDisplay();
    }
    return;
  }

  if (action === "percent") {
    if (calcState.display !== "Error") {
      const value = Number.parseFloat(calcState.display);
      if (Number.isFinite(value)) {
        calcState.display = String(roundCalcValue(value / 100));
        updateCalcDisplay();
      }
    }
    return;
  }

  if (action === "dot") {
    handleCalcDot();
    return;
  }

  if (action === "equals") {
    handleCalcEquals();
  }
}

function renderAllForCurrentFarm() {
  renderFarmSelector();
  renderTopSaveSettings();
  updateZipStatus();
  renderPlanTable();
  renderPurchaseTable();
  renderFinanceTable();
  renderNotebookAndCalculator();
}

function closeFarmModal() {
  farmModal.classList.add("hidden");
  farmNameInput.value = "";
}

function openFarmModal() {
  farmModal.classList.remove("hidden");
  farmNameInput.value = "";
  farmNameInput.focus();
}

function createFarmFromInput() {
  const trimmed = farmNameInput.value.trim();
  if (!trimmed) return;

  const newId = `farm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  appState.farms.push({ id: newId, name: trimmed });
  appState.dataByFarm[newId] = createEmptyFarmData();
  saveAppState(appState);
  localStorage.setItem(CURRENT_FARM_KEY, newId);
  selectedFileName.textContent = "Nie wybrano pliku";
  closeFarmModal();
  renderAllForCurrentFarm();
}

chooseFileBtn.addEventListener("click", () => {
  saveZipInput.click();
});

saveZipInput.addEventListener("change", async () => {
  const file = saveZipInput.files[0];
  if (!file) return;
  selectedFileName.textContent = file.name;

  if (!file.name.toLowerCase().endsWith(".zip")) {
    zipStatus.textContent = "To nie jest plik ZIP.";
    selectedFileName.textContent = "Nie wybrano pliku";
    saveZipInput.value = "";
    return;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Blad odczytu pliku ZIP."));
      reader.readAsDataURL(file);
    });

    getCurrentFarmData().saves.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type || "application/zip",
      savedAt: Date.now(),
      dataUrl
    });
    saveAppState(appState);
    updateZipStatus();
  } catch (error) {
    zipStatus.textContent =
      "Nie udalo sie zapisac ZIP-a. Plik moze byc za duzy dla localStorage.";
    console.error(error);
  }

  selectedFileName.textContent = "Nie wybrano pliku";
  saveZipInput.value = "";
});

clearAllSavesBtn.addEventListener("click", () => {
  getCurrentFarmData().saves = [];
  saveAppState(appState);
  saveZipInput.value = "";
  selectedFileName.textContent = "Nie wybrano pliku";
  updateZipStatus();
});

addRowBtn.addEventListener("click", () => {
  planTableBody.appendChild(createRow());
  savePlanRows();
});

addPurchaseBtn.addEventListener("click", () => {
  purchaseTableBody.appendChild(createPurchaseRow());
  savePurchaseRows();
});

daysPerMonthInput.addEventListener("input", () => {
  const parsed = Number.parseInt(daysPerMonthInput.value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : 1;
  getCurrentFarmData().daysPerMonth = safeValue;
  daysPerMonthInput.value = String(safeValue);
  topDaysPerMonthInput.value = String(safeValue);
  saveAppState(appState);
  renderFinanceSummaryAndChart();
});

refreshFinanceBtn.addEventListener("click", () => {
  renderFinanceTable();
});

clearFinanceBtn.addEventListener("click", () => {
  getCurrentFarmData().finance = createDefaultFinanceRows();
  saveAppState(appState);
  renderFinanceTable();
});

farmNotebookInput.addEventListener("input", () => {
  getCurrentFarmData().notebook = farmNotebookInput.value;
  saveAppState(appState);
});

calcButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const digit = button.dataset.calcDigit;
    const op = button.dataset.calcOp;
    const action = button.dataset.calcAction;

    if (digit) handleCalcDigit(digit);
    if (op) handleCalcOperator(op);
    if (action) handleCalcAction(action);
  });
});

topDaysPerMonthInput.addEventListener("input", () => {
  const parsed = Number.parseInt(topDaysPerMonthInput.value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : 1;
  getCurrentFarmData().daysPerMonth = safeValue;
  topDaysPerMonthInput.value = String(safeValue);
  daysPerMonthInput.value = String(safeValue);
  saveAppState(appState);
  renderFinanceSummaryAndChart();
});

saveDifficultySelect.addEventListener("change", () => {
  getCurrentFarmData().saveDifficulty = saveDifficultySelect.value;
  saveAppState(appState);
});

saveStartDateInput.addEventListener("change", () => {
  getCurrentFarmData().saveStartDate = saveStartDateInput.value;
  saveAppState(appState);
});

farmSelect.addEventListener("change", () => {
  localStorage.setItem(CURRENT_FARM_KEY, farmSelect.value);
  selectedFileName.textContent = "Nie wybrano pliku";
  renderAllForCurrentFarm();
});

addFarmBtn.addEventListener("click", openFarmModal);

farmModalCancelBtn.addEventListener("click", closeFarmModal);
farmModalSaveBtn.addEventListener("click", createFarmFromInput);

farmModal.addEventListener("click", (event) => {
  if (event.target === farmModal) closeFarmModal();
});

farmNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createFarmFromInput();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !farmModal.classList.contains("hidden")) {
    closeFarmModal();
  }
});

renderAllForCurrentFarm();
