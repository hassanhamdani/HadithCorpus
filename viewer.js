const state = {
  summary: null,
  collectionsByTradition: {},
  fileCache: new Map(),
  currentRecord: null,
};

const traditionSelect = document.getElementById("tradition-select");
const collectionSelect = document.getElementById("collection-select");
const hadithInput = document.getElementById("hadith-input");
const statusEl = document.getElementById("status");
const referenceEl = document.getElementById("reference-label");
const collectionEl = document.getElementById("collection-label");
const identifierEl = document.getElementById("identifier-label");
const arabicTextEl = document.getElementById("arabic-text");
const englishTextEl = document.getElementById("english-text");
const loadButton = document.getElementById("load-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

function setStatus(message) {
  statusEl.textContent = message;
}

function titleForCollection(collection) {
  return collection.titles?.english || collection.collection_id;
}

function buildCollectionsIndex() {
  const traditions = state.summary.traditions;
  for (const [traditionId, tradition] of Object.entries(traditions)) {
    state.collectionsByTradition[traditionId] = tradition.collections;
  }
}

function renderTraditions() {
  traditionSelect.innerHTML = "";
  for (const traditionId of Object.keys(state.collectionsByTradition)) {
    const option = document.createElement("option");
    option.value = traditionId;
    option.textContent = traditionId[0].toUpperCase() + traditionId.slice(1);
    traditionSelect.appendChild(option);
  }
}

function renderCollections() {
  const traditionId = traditionSelect.value;
  const collections = state.collectionsByTradition[traditionId] || [];
  collectionSelect.innerHTML = "";
  for (const collection of collections) {
    const option = document.createElement("option");
    option.value = collection.collection_id;
    option.textContent = titleForCollection(collection);
    collectionSelect.appendChild(option);
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

async function fetchJsonl(path) {
  if (state.fileCache.has(path)) {
    return state.fileCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  const text = await response.text();
  const records = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  state.fileCache.set(path, records);
  return records;
}

function activeTradition() {
  return traditionSelect.value;
}

function activeCollectionId() {
  return collectionSelect.value;
}

function isExcludedPreface(record) {
  if (activeTradition() !== "shia") {
    return false;
  }

  if (
    activeCollectionId() === "al-kafi" &&
    record.reference?.book_section_number === 0
  ) {
    return true;
  }

  if (
    activeCollectionId() === "man-la-yahduruhu-al-faqih" &&
    (record.reference?.chapter_name_en === "Prelude" ||
      record.reference?.hadith_number === 0)
  ) {
    return true;
  }

  return false;
}

function getActiveFilePath() {
  return `./corpus/${activeTradition()}/v1/hadiths/${activeCollectionId()}.jsonl`;
}

function getShiaSourceNumber(record) {
  const numberByBook = record.reference?.number_by_book;
  if (Number.isFinite(numberByBook)) {
    return numberByBook;
  }
  return record.reference?.hadith_number ?? null;
}

function getSunniSourceNumber(record) {
  const numericNumber = record.citation?.numeric_number;
  if (Number.isFinite(numericNumber)) {
    return numericNumber;
  }
  return null;
}

function getSourceNumber(record) {
  return activeTradition() === "shia"
    ? getShiaSourceNumber(record)
    : getSunniSourceNumber(record);
}

function getViewerNumber(record, index) {
  if (activeTradition() === "shia" && activeCollectionId() === "al-kafi") {
    const sourceNumber = getShiaSourceNumber(record);
    if (Number.isFinite(sourceNumber)) {
      return sourceNumber - 1;
    }
  }

  const sourceNumber = getSourceNumber(record);
  if (Number.isFinite(sourceNumber)) {
    return sourceNumber;
  }

  return index + 1;
}

function prepareRecords(records) {
  return records
    .filter((record) => !isExcludedPreface(record))
    .map((record, index) => ({
      ...record,
      __viewerNumber: getViewerNumber(record, index),
    }));
}

function getReferenceLabel(record) {
  if (activeTradition() === "shia") {
    return record.reference?.citation_text || record.canonical_id;
  }
  return record.citation?.citation_label || record.internal_id;
}

function getArabicText(record) {
  if (activeTradition() === "shia") {
    return record.text_ar || "Arabic text unavailable.";
  }
  return record.texts?.arabic?.full || "Arabic text unavailable.";
}

function getEnglishText(record) {
  if (activeTradition() === "shia") {
    return record.text_en || "English text unavailable.";
  }
  return (
    record.texts?.english?.full ||
    record.texts?.translations?.[0]?.full ||
    "English text unavailable."
  );
}

function renderRecord(record) {
  state.currentRecord = record;
  referenceEl.textContent = getReferenceLabel(record);
  collectionEl.textContent = collectionSelect.options[collectionSelect.selectedIndex]?.textContent || "-";
  identifierEl.textContent = record.canonical_id || record.internal_id || "-";
  arabicTextEl.textContent = getArabicText(record);
  englishTextEl.textContent = getEnglishText(record);
  hadithInput.value = String(record.__viewerNumber ?? "");
}

async function loadHadithByInput() {
  const requested = Number(hadithInput.value.trim());
  if (!Number.isFinite(requested) || requested <= 0) {
    setStatus("Enter a valid hadith number.");
    return;
  }

  setStatus("Loading hadith file…");
  const records = prepareRecords(await fetchJsonl(getActiveFilePath()));
  const record = records.find((entry) => entry.__viewerNumber === requested);

  if (!record) {
    setStatus("No hadith matched that number in the selected collection.");
    return;
  }

  renderRecord(record);
  if (activeCollectionId() === "sahih-muslim") {
    setStatus(`Loaded entry ${requested}. Source label: ${getReferenceLabel(record)}.`);
    return;
  }
  setStatus(`Loaded hadith ${requested}.`);
}

async function stepRecord(direction) {
  const currentNumber = Number(hadithInput.value.trim());
  if (!Number.isFinite(currentNumber)) {
    setStatus("Load a hadith first.");
    return;
  }

  const records = prepareRecords(await fetchJsonl(getActiveFilePath()));
  const sorted = [...records].sort((a, b) => a.__viewerNumber - b.__viewerNumber);
  const index = sorted.findIndex((entry) => entry.__viewerNumber === currentNumber);

  if (index === -1) {
    setStatus("Current hadith number is not loaded.");
    return;
  }

  const nextRecord = sorted[index + direction];
  if (!nextRecord) {
    setStatus(direction > 0 ? "Already at the last available hadith." : "Already at the first available hadith.");
    return;
  }

  renderRecord(nextRecord);
  if (activeCollectionId() === "sahih-muslim") {
    setStatus(
      `Loaded entry ${nextRecord.__viewerNumber}. Source label: ${getReferenceLabel(nextRecord)}.`
    );
    return;
  }
  setStatus(`Loaded hadith ${nextRecord.__viewerNumber}.`);
}

async function init() {
  try {
    state.summary = await fetchJson("./metadata/summary.json");
    buildCollectionsIndex();
    renderTraditions();
    renderCollections();
    setStatus("Viewer ready.");
  } catch (error) {
    setStatus(`Unable to initialize viewer: ${error.message}`);
  }
}

traditionSelect.addEventListener("change", () => {
  renderCollections();
  state.currentRecord = null;
  referenceEl.textContent = "-";
  collectionEl.textContent = "-";
  identifierEl.textContent = "-";
  arabicTextEl.textContent = "Select a collection and hadith number.";
  englishTextEl.textContent = "Select a collection and hadith number.";
  hadithInput.value = "";
  setStatus("Select a collection and hadith number.");
});

collectionSelect.addEventListener("change", () => {
  state.currentRecord = null;
  referenceEl.textContent = "-";
  collectionEl.textContent = "-";
  identifierEl.textContent = "-";
  arabicTextEl.textContent = "Select a collection and hadith number.";
  englishTextEl.textContent = "Select a collection and hadith number.";
  hadithInput.value = "";
  setStatus("Collection changed.");
});

loadButton.addEventListener("click", () => {
  loadHadithByInput().catch((error) => setStatus(error.message));
});

hadithInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadHadithByInput().catch((error) => setStatus(error.message));
  }
});

prevButton.addEventListener("click", () => {
  stepRecord(-1).catch((error) => setStatus(error.message));
});

nextButton.addEventListener("click", () => {
  stepRecord(1).catch((error) => setStatus(error.message));
});

init();
