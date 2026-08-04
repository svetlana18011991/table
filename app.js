const elements = {
  setupScreen: document.getElementById("setupScreen"),
  quizScreen: document.getElementById("quizScreen"),
  resultsScreen: document.getElementById("resultsScreen"),
  tablesGrid: document.getElementById("tablesGrid"),
  tablesHint: document.getElementById("tablesHint"),
  randomTables: document.getElementById("randomTables"),
  questionCount: document.getElementById("questionCount"),
  minFactor: document.getElementById("minFactor"),
  maxFactor: document.getElementById("maxFactor"),
  timeLimit: document.getElementById("timeLimit"),
  instantFeedback: document.getElementById("instantFeedback"),
  secondAttempt: document.getElementById("secondAttempt"),
  shuffleQuestions: document.getElementById("shuffleQuestions"),
  startButton: document.getElementById("startButton"),
  downloadHtmlButton: document.getElementById("downloadHtmlButton"),
  createGameButton: document.getElementById("createGameButton"),
  gameModal: document.getElementById("gameModal"),
  closeGameModalButton: document.getElementById("closeGameModalButton"),
  cancelGameButton: document.getElementById("cancelGameButton"),
  downloadGameButton: document.getElementById("downloadGameButton"),
  gameLimitWarning: document.getElementById("gameLimitWarning"),
  gameTemplateStatus: document.getElementById("gameTemplateStatus"),
  studentFileBanner: document.getElementById("studentFileBanner"),
  setupError: document.getElementById("setupError"),
  selectAllTables: document.getElementById("selectAllTables"),
  clearTables: document.getElementById("clearTables"),
  clearHistory: document.getElementById("clearHistory"),
  historyContent: document.getElementById("historyContent"),
  themeButton: document.getElementById("themeButton"),
  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  timerText: document.getElementById("timerText"),
  questionLabel: document.getElementById("questionLabel"),
  questionText: document.getElementById("questionText"),
  visualArea: document.getElementById("visualArea"),
  answerArea: document.getElementById("answerArea"),
  feedback: document.getElementById("feedback"),
  submitButton: document.getElementById("submitButton"),
  nextButton: document.getElementById("nextButton"),
  finishEarlyButton: document.getElementById("finishEarlyButton"),
  resultTitle: document.getElementById("resultTitle"),
  scorePercent: document.getElementById("scorePercent"),
  correctStat: document.getElementById("correctStat"),
  timeStat: document.getElementById("timeStat"),
  averageStat: document.getElementById("averageStat"),
  streakStat: document.getElementById("streakStat"),
  tableResults: document.getElementById("tableResults"),
  recommendation: document.getElementById("recommendation"),
  mistakesList: document.getElementById("mistakesList"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  retryMistakesButton: document.getElementById("retryMistakesButton"),
  restartButton: document.getElementById("restartButton"),
  numericAnswerTemplate: document.getElementById("numericAnswerTemplate")
};

const TYPE_LABELS = {
  direct: "Обычный пример",
  reversed: "Перестановка множителей",
  missing: "Пропущенный множитель",
  division: "Обратное действие",
  choice: "Выбор ответа",
  boolean: "Верно или неверно",
  comparison: "Сравнение выражений",
  visual: "Наглядная модель"
};

const state = {
  settings: null,
  questions: [],
  currentIndex: 0,
  selectedAnswer: null,
  attemptsForCurrent: 0,
  answers: [],
  startedAt: 0,
  questionStartedAt: 0,
  timerId: null,
  elapsedSeconds: 0,
  bestStreak: 0,
  currentStreak: 0,
  locked: false,
  retryMode: false,
  selectedGameType: "race"
};

function init() {
  buildTableControls();
  applyPresetSettings(window.TRAINER_PRESET);
  bindEvents();
  loadTheme();
  renderHistory();

  if (window.TRAINER_STUDENT_FILE) {
    elements.studentFileBanner.classList.remove("hidden");
  }
}

function buildTableControls() {
  elements.tablesGrid.innerHTML = "";
  for (let table = 2; table <= 10; table += 1) {
    const label = document.createElement("label");
    label.className = "table-chip";
    label.innerHTML = `
      <input type="checkbox" value="${table}" ${[5, 6].includes(table) ? "checked" : ""}>
      <span>× ${table}</span>
    `;
    elements.tablesGrid.appendChild(label);
  }
}

function bindEvents() {
  elements.selectAllTables.addEventListener("click", () => setAllTables(true));
  elements.clearTables.addEventListener("click", () => setAllTables(false));
  elements.randomTables.addEventListener("change", updateTablesDisabledState);
  elements.startButton.addEventListener("click", startQuiz);
  elements.downloadHtmlButton.addEventListener("click", downloadStandaloneHtml);
  elements.createGameButton.addEventListener("click", openGameModal);
  elements.closeGameModalButton.addEventListener("click", closeGameModal);
  elements.cancelGameButton.addEventListener("click", closeGameModal);
  elements.downloadGameButton.addEventListener("click", downloadSelectedGame);
  elements.gameModal.addEventListener("click", (event) => {
    if (event.target === elements.gameModal) closeGameModal();
    const card = event.target.closest("[data-game-type]");
    if (card) selectGameType(card.dataset.gameType);
  });
  elements.submitButton.addEventListener("click", submitCurrentAnswer);
  elements.nextButton.addEventListener("click", goToNextQuestion);
  elements.finishEarlyButton.addEventListener("click", () => finishQuiz("Тренировка завершена досрочно"));
  elements.restartButton.addEventListener("click", resetToSetup);
  elements.retryMistakesButton.addEventListener("click", startMistakeRetry);
  elements.exportCsvButton.addEventListener("click", exportCsv);
  elements.clearHistory.addEventListener("click", clearHistory);
  elements.themeButton.addEventListener("click", toggleTheme);

  elements.answerArea.addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer]");
    if (!button || state.locked) return;

    elements.answerArea.querySelectorAll(".choice-button").forEach((item) => {
      item.classList.remove("selected");
    });
    button.classList.add("selected");
    state.selectedAnswer = parseAnswerValue(button.dataset.answer);
  });

  document.addEventListener("keydown", (event) => {
    if (elements.quizScreen.classList.contains("hidden")) return;

    if (event.key === "Enter") {
      if (!elements.nextButton.classList.contains("hidden")) {
        goToNextQuestion();
      } else {
        submitCurrentAnswer();
      }
    }
  });
}

function setAllTables(isChecked) {
  elements.tablesGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = isChecked;
  });
}

function updateTablesDisabledState() {
  const disabled = elements.randomTables.checked;
  elements.tablesGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.disabled = disabled;
  });
  elements.tablesHint.textContent = disabled
    ? "Для каждого примера таблица будет выбрана случайно."
    : "Выберите хотя бы одну таблицу.";
}

function applyPresetSettings(preset) {
  if (!preset || typeof preset !== "object") return;

  elements.randomTables.checked = Boolean(preset.randomTables);
  elements.questionCount.value = preset.count ?? 15;
  elements.minFactor.value = preset.minFactor ?? 1;
  elements.maxFactor.value = preset.maxFactor ?? 10;
  elements.timeLimit.value = String(preset.timeLimit ?? 0);
  elements.instantFeedback.checked = preset.instantFeedback !== false;
  elements.secondAttempt.checked = preset.secondAttempt !== false;
  elements.shuffleQuestions.checked = preset.shuffle !== false;

  const presetTables = new Set((preset.tables || []).map(Number));
  elements.tablesGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = presetTables.has(Number(input.value));
  });

  const presetTypes = new Set(preset.types || []);
  document.querySelectorAll('#typesGrid input[type="checkbox"]').forEach((input) => {
    input.checked = presetTypes.has(input.value);
  });

  updateTablesDisabledState();
}

async function inlineExternalResources(clone) {
  const baseUrl = document.baseURI;

  for (const link of [...clone.querySelectorAll('link[rel="stylesheet"][href]')]) {
    const response = await fetch(new URL(link.getAttribute("href"), baseUrl));
    if (!response.ok) throw new Error(`Не удалось загрузить стили: ${link.getAttribute("href")}`);
    const style = clone.ownerDocument.createElement("style");
    style.id = link.id || "trainerStyles";
    style.textContent = await response.text();
    link.replaceWith(style);
  }

  for (const script of [...clone.querySelectorAll("script[src]")]) {
    const source = script.getAttribute("src");
    const response = await fetch(new URL(source, baseUrl));
    if (!response.ok) throw new Error(`Не удалось загрузить скрипт: ${source}`);
    const inlineScript = clone.ownerDocument.createElement("script");
    if (script.type) inlineScript.type = script.type;
    inlineScript.textContent = await response.text();
    script.replaceWith(inlineScript);
  }
}

async function downloadStandaloneHtml() {
  const settings = getSettings();
  const error = validateSettings(settings);
  elements.setupError.textContent = error;
  if (error) return;

  elements.downloadHtmlButton.disabled = true;
  elements.setupError.textContent = "Подготавливаю автономный HTML…";

  try {
    const clone = document.documentElement.cloneNode(true);
    await inlineExternalResources(clone);

    const presetScript = clone.querySelector("#trainerPreset");
    const safePreset = JSON.stringify(settings).replaceAll("<", "\\u003c");

    if (presetScript) {
      presetScript.textContent =
        `window.TRAINER_PRESET = ${safePreset}; window.TRAINER_STUDENT_FILE = true;`;
    }

    const setupScreen = clone.querySelector("#setupScreen");
    const quizScreen = clone.querySelector("#quizScreen");
    const resultsScreen = clone.querySelector("#resultsScreen");
    if (setupScreen) setupScreen.classList.remove("hidden");
    if (quizScreen) quizScreen.classList.add("hidden");
    if (resultsScreen) resultsScreen.classList.add("hidden");

    clone.querySelectorAll("#tablesGrid, #historyContent, #answerArea, #visualArea, #tableResults, #mistakesList")
      .forEach((node) => { node.innerHTML = ""; });

    const feedback = clone.querySelector("#feedback");
    if (feedback) {
      feedback.textContent = "";
      feedback.className = "feedback";
    }

    const setupError = clone.querySelector("#setupError");
    if (setupError) setupError.textContent = "";

    const title = clone.querySelector("title");
    if (title) title.textContent = "Тренажёр по таблице умножения — задание";

    const html = `<!DOCTYPE html>\n${clone.outerHTML}`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const tablesPart = settings.randomTables ? "random" : settings.tables.join("-");

    link.href = url;
    link.download = `trenazher-tablica-${tablesPart}-${settings.count}-primerov.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    elements.setupError.textContent = "HTML-файл готов. Его можно отправить ученику.";
    elements.setupError.classList.add("success-message");
    window.setTimeout(() => {
      elements.setupError.textContent = "";
      elements.setupError.classList.remove("success-message");
    }, 3500);
  } catch (error) {
    console.error(error);
    elements.setupError.textContent =
      "Не удалось собрать автономный файл. Откройте тренажёр через GitHub Pages и повторите.";
  } finally {
    elements.downloadHtmlButton.disabled = false;
  }
}


function openGameModal() {
  const settings = getSettings();
  const error = validateSettings(settings);
  elements.setupError.textContent = error;
  if (error) return;

  selectGameType(state.selectedGameType || "race");
  elements.gameModal.classList.remove("hidden");
  elements.gameModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  elements.closeGameModalButton.focus();
}

function closeGameModal() {
  elements.gameModal.classList.add("hidden");
  elements.gameModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function selectGameType(type) {
  const allowed = ["race", "tower", "pinata"];
  state.selectedGameType = allowed.includes(type) ? type : "race";

  elements.gameModal.querySelectorAll("[data-game-type]").forEach((card) => {
    const selected = card.dataset.gameType === state.selectedGameType;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });

  const settings = getSettings();
  const messages = {
    race: `Гонка получит ${settings.count} заданий. Код механики сохранён, трасса — летнее стандартное шоссе.`,
    tower: "Башня рассчитана только на 9 заданий. Будут использованы оригинальный фон и 9 изображений блоков из архива.",
    pinata: "Пиньята рассчитана только на 5 заданий. Будут использованы оригинальный фон и стадии пиньяты из архива."
  };
  const labels = {
    race: "Скачать игру «Гонка»",
    tower: "Скачать игру «Башня»",
    pinata: "Скачать игру «Пиньята»"
  };

  elements.gameLimitWarning.textContent = messages[state.selectedGameType];
  elements.gameLimitWarning.classList.toggle("limit-warning", state.selectedGameType !== "race");
  elements.downloadGameButton.textContent = labels[state.selectedGameType];
  elements.gameTemplateStatus.textContent = "";
}

async function downloadSelectedGame() {
  const settings = getSettings();
  const error = validateSettings(settings);
  if (error) {
    elements.gameTemplateStatus.textContent = error;
    return;
  }

  if (!window.GAME_TEMPLATE_BASE64?.[state.selectedGameType]) {
    elements.gameTemplateStatus.textContent = "Шаблон игры не найден.";
    return;
  }

  const originalText = elements.downloadGameButton.textContent;
  elements.downloadGameButton.disabled = true;
  elements.downloadGameButton.textContent = "Подготавливаю игру…";
  elements.gameTemplateStatus.textContent = "Создаю задания и собираю один HTML-файл.";

  try {
    const html = await buildGameHtml(state.selectedGameType, settings);
    const fileNames = {
      race: "tablica-umnozheniya-gonka.html",
      tower: "tablica-umnozheniya-bashnya-9-zadaniy.html",
      pinata: "tablica-umnozheniya-pinyata-5-zadaniy.html"
    };
    triggerHtmlDownload(html, fileNames[state.selectedGameType]);
    elements.gameTemplateStatus.textContent = "Игра готова. HTML-файл можно отправить ученику.";
  } catch (error) {
    console.error(error);
    elements.gameTemplateStatus.textContent = `Не удалось создать игру: ${error.message || error}`;
  } finally {
    elements.downloadGameButton.disabled = false;
    elements.downloadGameButton.textContent = originalText;
  }
}

async function buildGameHtml(type, settings) {
  const counts = { race: settings.count, tower: 9, pinata: 5 };
  const count = counts[type];
  const generated = generateQuestions({ ...settings, count });
  const questions = generated.map(toUniversalGameQuestion);
  const template = decodeBase64Utf8(window.GAME_TEMPLATE_BASE64[type]);

  if (type === "race") return buildRaceGameHtml(template, questions);
  if (type === "tower") return buildTowerGameHtml(template, questions, settings);
  return buildPinataGameHtml(template, questions);
}

function toUniversalGameQuestion(question) {
  const rawChoices = question.choices
    ? question.choices.map((choice) => ({ label: String(choice.label), value: choice.value }))
    : buildGameChoices(question.correctAnswer, question.table, question.factor);

  const correctIndex = rawChoices.findIndex((choice) => answersEqual(choice.value, question.correctAnswer));
  const safeCorrectIndex = correctIndex >= 0 ? correctIndex : 0;

  return {
    prompt: question.type === "visual" ? `${question.table} × ${question.factor} = ?` : question.prompt,
    options: rawChoices.map((choice) => choice.label),
    correctIndex: safeCorrectIndex,
    correctLabel: rawChoices[safeCorrectIndex]?.label ?? formatAnswer(question.correctAnswer)
  };
}

function buildGameChoices(correctAnswer, table, factor) {
  if (typeof correctAnswer === "boolean") {
    return [
      { label: "Верно", value: true },
      { label: "Неверно", value: false }
    ];
  }
  if ([">", "<", "="].includes(correctAnswer)) {
    return [">", "<", "="].map((value) => ({ label: value, value }));
  }

  return buildNumericChoices(Number(correctAnswer), table, factor)
    .map((choice) => ({ label: choice.label, value: choice.value }));
}

function buildRaceGameHtml(template, questions) {
  const summerRoadside = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="1000" viewBox="0 0 420 1000">
      <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#83d65d"/><stop offset="1" stop-color="#3c9b43"/></linearGradient></defs>
      <rect width="420" height="1000" fill="url(#g)"/>
      <path d="M0 0h55v1000H0z" fill="#d6bf7a" opacity=".72"/>
      <g fill="#1f7137"><circle cx="150" cy="90" r="42"/><circle cx="290" cy="220" r="55"/><circle cx="185" cy="410" r="48"/><circle cx="315" cy="610" r="58"/><circle cx="150" cy="810" r="52"/></g>
      <g fill="#f7e36a"><circle cx="90" cy="170" r="8"/><circle cx="225" cy="320" r="7"/><circle cx="110" cy="560" r="8"/><circle cx="260" cy="760" r="7"/><circle cx="350" cy="900" r="8"/></g>
    </svg>`);

  const playerCars = [
    ["Красная машина", "#ef4444"],
    ["Синяя машина", "#3b82f6"],
    ["Жёлтая машина", "#facc15"]
  ].map(([name, color], index) => ({
    id: `summer_player_${index}`,
    name,
    src: carSvgDataUrl(color, "#e9f3ff"),
    scale: 1,
    rotation: 0
  }));

  const trafficCars = [
    ["Легковая", "#8b5cf6"],
    ["Такси", "#f59e0b"],
    ["Автобус", "#22c55e"]
  ].map(([name, color], index) => ({
    id: `summer_traffic_${index}`,
    name,
    src: carSvgDataUrl(color, "#dff4ff"),
    scale: index === 2 ? 0.86 : 0.74,
    rotation: 0
  }));

  const config = {
    language: "ru",
    title: "Гонка по таблице умножения",
    instruction: "Едь по летнему шоссе, собирай бонусы и отвечай на задания по таблице умножения.",
    maxLives: 5,
    lifeScoreStep: 100,
    starPoints: 10,
    forceMode: "on",
    speedMultiplier: 1,
    difficultyMode: "teacher",
    fixedLevel: "easy",
    interfaceTheme: "classic",
    useLatex: false,
    questionNeonEnabled: true,
    questionNeonColor: "#46d6ff",
    questionPlateColor: "#101b31",
    levels: { easy: { forceAfter: 18 }, medium: { forceAfter: 14 }, hard: { forceAfter: 10 } },
    trackId: "highway",
    customTrack: "",
    environmentId: "meadow",
    customEnvironment: summerRoadside,
    enabledPlayerIds: [],
    customPlayers: playerCars,
    playerSelectionExplicit: true,
    enabledTrafficIds: [],
    customTraffic: trafficCars,
    trafficSelectionExplicit: true,
    bonusImage: starSvgDataUrl(),
    bonusRotate: true,
    tasks: questions.map((question, index) => ({
      id: `mult_${index + 1}`,
      level: "easy",
      type: "choice",
      question: question.prompt,
      answers: question.options,
      correct: question.correctIndex,
      accepts: [],
      explanation: `Правильный ответ: ${question.correctLabel}`,
      image: "",
      audio: "",
      font: "",
      fontSize: 34,
      textColor: "#ffffff"
    }))
  };

  const safeConfig = safeJson(config);
  if (!template.includes("const EMBEDDED_CONFIG = null;")) {
    throw new Error("В шаблоне гонки не найдено место для конфигурации.");
  }
  return template.replace("const EMBEDDED_CONFIG = null;", `const EMBEDDED_CONFIG = ${safeConfig};`);
}

function buildTowerGameHtml(template, questions, settings) {
  const assets = window.GAME_ASSET_BASE64?.tower;
  if (!assets?.background || !Array.isArray(assets.blocks) || assets.blocks.length < 9) {
    throw new Error("В архиве башни не найдены все изображения.");
  }

  const background = pngBase64DataUrl(assets.background);
  const blockFiles = assets.blocks.slice(0, 9).map(pngBase64DataUrl);
  const logo = assets.logo ? pngBase64DataUrl(assets.logo) : "";

  const config = {
    title: "Башня умножения",
    useRepoBg: true,
    bgDataUrl: background,
    timer: {
      enabled: settings.timeLimit > 0,
      seconds: settings.timeLimit > 0 ? Math.max(10, Math.round(settings.timeLimit / 9)) : 30
    },
    useImages: true,
    useLatex: false,
    instruction: {
      text: "Построй башню из 9 этажей. Ответь правильно — и оригинальный блок станет новым этажом.",
      color: "#f2d37a",
      glow: true
    },
    feedback: {
      text: "Башня построена! Таблица умножения становится крепче."
    },
    questions: questions.slice(0, 9).map((question) => ({
      type: "choice",
      prompt: question.prompt,
      options: question.options,
      correctIndices: [question.correctIndex],
      seconds: null,
      image: "",
      audio: "",
      font: "",
      fontSize: 30
    }))
  };

  let output = injectEmbeddedConfig(template, config);
  output = output.replace(
    'const BG_FILE = "1.png";',
    `const BG_FILE = ${JSON.stringify(background)};`
  );
  output = output.replace(
    'const BLOCK_FILES = ["3.png","4.png","5.png","6.png","7.png","8.png","9.png","10.png","11.png"];',
    `const BLOCK_FILES = ${JSON.stringify(blockFiles)};`
  );
  if (logo) output = output.replaceAll("logo.png", logo);
  return output;
}

function buildPinataGameHtml(template, questions) {
  const assets = window.GAME_ASSET_BASE64?.pinata;
  if (!assets?.background || !Array.isArray(assets.stages) || assets.stages.length < 6) {
    throw new Error("В архиве пиньяты не найдены все изображения.");
  }

  const background = pngBase64DataUrl(assets.background);
  const stages = assets.stages.slice(0, 6).map(pngBase64DataUrl);
  const logo = assets.logo ? pngBase64DataUrl(assets.logo) : "";

  const config = {
    title: "Пиньята умножения",
    titleFont: "",
    titleFontSize: 34,
    useLatex: false,
    bgDataUrl: background,
    startImage: stages[0],
    images: stages,
    winText: "Молодец! Пиньята открыта!",
    instruction: {
      text: "Ответь правильно и ударь по пиньяте. Всего 5 заданий.",
      color: "#ffb703",
      glow: true
    },
    questions: questions.slice(0, 5).map((question) => ({
      type: "choice",
      prompt: question.prompt,
      options: question.options,
      correctIndices: [question.correctIndex],
      font: "",
      fontSize: 24,
      image: "",
      audio: ""
    }))
  };

  let output = injectEmbeddedConfig(template, config);
  if (logo) output = output.replaceAll("logo.png", logo);
  return output;
}

function injectEmbeddedConfig(template, config) {
  const safeConfig = safeJson(config);
  const mainScriptMarker = "<script>\n(() => {";
  if (!template.includes(mainScriptMarker)) {
    throw new Error("В шаблоне игры не найден основной скрипт.");
  }
  return template.replace(mainScriptMarker, `<script>window.__EMBEDDED_CFG__=${safeConfig};<\/script>\n${mainScriptMarker}`);
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function decodeBase64Utf8(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function triggerHtmlDownload(html, fileName) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function pngBase64DataUrl(base64Value) {
  return `data:image/png;base64,${base64Value}`;
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function carSvgDataUrl(bodyColor, glassColor) {
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="300" viewBox="0 0 180 300">
      <defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${bodyColor}"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
      <rect x="29" y="24" width="122" height="252" rx="42" fill="url(#b)" stroke="#ffffff" stroke-opacity=".35" stroke-width="5"/>
      <path d="M48 70 Q90 34 132 70 L139 126 H41Z" fill="${glassColor}" opacity=".92"/>
      <path d="M44 170 H136 L126 238 H54Z" fill="#0f172a" opacity=".48"/>
      <rect x="18" y="70" width="22" height="63" rx="10" fill="#111827"/><rect x="140" y="70" width="22" height="63" rx="10" fill="#111827"/>
      <rect x="18" y="186" width="22" height="63" rx="10" fill="#111827"/><rect x="140" y="186" width="22" height="63" rx="10" fill="#111827"/>
      <circle cx="55" cy="50" r="10" fill="#fff8b5"/><circle cx="125" cy="50" r="10" fill="#fff8b5"/>
      <rect x="55" y="253" width="70" height="10" rx="5" fill="#ff5d6c"/>
    </svg>`);
}

function starSvgDataUrl() {
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><path d="M80 8l20 44 48 5-36 33 10 48-42-24-42 24 10-48-36-33 48-5z" fill="#ffd54a" stroke="#fff6b7" stroke-width="8"/></svg>`);
}

function towerBlockSvgDataUrl(number) {
  const colors = ["#e95d5d", "#f59e0b", "#eab308", "#65a30d", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
  const color = colors[(number - 1) % colors.length];
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="180" viewBox="0 0 520 180">
      <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#000000" stop-opacity=".18"/></linearGradient></defs>
      <path d="M24 30 Q24 12 44 12 H476 Q496 12 496 30 V145 Q496 166 474 166 H46 Q24 166 24 145Z" fill="${color}" stroke="#fff" stroke-opacity=".65" stroke-width="6"/>
      <path d="M30 35 H490 V150 H30Z" fill="url(#g)"/>
      <text x="260" y="116" text-anchor="middle" font-family="Arial,sans-serif" font-size="82" font-weight="900" fill="#fff" opacity=".95">${number}</text>
    </svg>`);
}

function pinataStageSvgDataUrl(stage) {
  const damage = Math.min(5, Math.max(0, stage));
  const bodyOpacity = 1 - damage * 0.07;
  const crackPaths = Array.from({ length: damage }, (_, index) => {
    const x = 76 + index * 18;
    return `<path d="M${x} 92 l-12 20 18 15-14 24" fill="none" stroke="#3b1b52" stroke-width="5" stroke-linecap="round"/>`;
  }).join("");
  const candies = stage >= 5
    ? `<g><circle cx="38" cy="195" r="12" fill="#ffd54a"/><rect x="202" y="185" width="23" height="23" rx="5" fill="#46d6ff"/><circle cx="120" cy="222" r="11" fill="#ff5d8f"/><path d="M170 210l12 18-22 3z" fill="#6ee7b7"/></g>`
    : "";
  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="280" viewBox="0 0 260 280">
      <path d="M130 5v44" stroke="#f5e7c3" stroke-width="8"/>
      <g opacity="${bodyOpacity}">
        <path d="M69 72 Q130 32 191 72 L208 147 Q195 204 130 211 Q65 204 52 147Z" fill="#ff5d8f" stroke="#fff" stroke-opacity=".55" stroke-width="6"/>
        <path d="M62 105 H198" stroke="#ffd54a" stroke-width="21"/><path d="M57 143 H203" stroke="#46d6ff" stroke-width="21"/><path d="M69 178 H191" stroke="#7ddc6f" stroke-width="21"/>
        <path d="M84 76 L52 42 L39 92Z" fill="#8b5cf6"/><path d="M176 76 L208 42 L221 92Z" fill="#8b5cf6"/>
        <circle cx="105" cy="102" r="8" fill="#222"/><circle cx="155" cy="102" r="8" fill="#222"/><path d="M111 126 Q130 142 149 126" fill="none" stroke="#222" stroke-width="5" stroke-linecap="round"/>
        ${crackPaths}
      </g>
      ${candies}
    </svg>`);
}

function getSettings() {
  const selectedTables = [...elements.tablesGrid.querySelectorAll('input:checked')]
    .map((input) => Number(input.value));

  const selectedTypes = [...document.querySelectorAll('#typesGrid input:checked')]
    .map((input) => input.value);

  return {
    randomTables: elements.randomTables.checked,
    tables: selectedTables,
    count: Number(elements.questionCount.value),
    minFactor: Number(elements.minFactor.value),
    maxFactor: Number(elements.maxFactor.value),
    timeLimit: Number(elements.timeLimit.value),
    instantFeedback: elements.instantFeedback.checked,
    secondAttempt: elements.secondAttempt.checked,
    shuffle: elements.shuffleQuestions.checked,
    types: selectedTypes
  };
}

function validateSettings(settings) {
  if (!settings.randomTables && settings.tables.length === 0) {
    return "Выберите хотя бы одну таблицу или включите случайный режим.";
  }
  if (settings.types.length === 0) {
    return "Выберите хотя бы один вид задания.";
  }
  if (!Number.isInteger(settings.count) || settings.count < 5 || settings.count > 100) {
    return "Количество примеров должно быть от 5 до 100.";
  }
  if (
    !Number.isInteger(settings.minFactor) ||
    !Number.isInteger(settings.maxFactor) ||
    settings.minFactor < 1 ||
    settings.maxFactor > 12 ||
    settings.minFactor > settings.maxFactor
  ) {
    return "Проверьте диапазон множителей: от 1 до 12.";
  }
  return "";
}

function startQuiz() {
  const settings = getSettings();
  const error = validateSettings(settings);
  elements.setupError.textContent = error;
  if (error) return;

  state.settings = settings;
  state.questions = generateQuestions(settings);
  state.currentIndex = 0;
  state.selectedAnswer = null;
  state.attemptsForCurrent = 0;
  state.answers = [];
  state.startedAt = Date.now();
  state.questionStartedAt = Date.now();
  state.elapsedSeconds = 0;
  state.bestStreak = 0;
  state.currentStreak = 0;
  state.locked = false;
  state.retryMode = false;

  showScreen("quiz");
  startTimer();
  renderQuestion();
}

function generateQuestions(settings) {
  const tables = settings.randomTables
    ? Array.from({ length: 9 }, (_, index) => index + 2)
    : settings.tables;

  const tableSequence = [];
  if (settings.randomTables) {
    for (let i = 0; i < settings.count; i += 1) {
      tableSequence.push(randomItem(tables));
    }
  } else {
    for (let i = 0; i < settings.count; i += 1) {
      tableSequence.push(tables[i % tables.length]);
    }
    if (settings.shuffle) shuffle(tableSequence);
  }

  const questions = [];
  const signatures = new Set();
  const maxAttempts = settings.count * 20;
  let attempts = 0;

  while (questions.length < settings.count && attempts < maxAttempts) {
    attempts += 1;
    const table = tableSequence[questions.length];
    const factor = randomInt(settings.minFactor, settings.maxFactor);
    const type = randomItem(settings.types);
    const question = createQuestion(table, factor, type, settings);
    const signature = `${question.type}|${question.table}|${question.factor}|${question.prompt}`;

    if (!signatures.has(signature) || signatures.size >= possibleUniqueEstimate(settings)) {
      signatures.add(signature);
      questions.push(question);
    }
  }

  while (questions.length < settings.count) {
    const table = tableSequence[questions.length];
    const factor = randomInt(settings.minFactor, settings.maxFactor);
    const type = randomItem(settings.types);
    questions.push(createQuestion(table, factor, type, settings));
  }

  if (settings.shuffle) shuffle(questions);
  return questions;
}

function possibleUniqueEstimate(settings) {
  const tableCount = settings.randomTables ? 9 : settings.tables.length;
  const factorCount = settings.maxFactor - settings.minFactor + 1;
  return tableCount * factorCount * settings.types.length;
}

function createQuestion(table, factor, type, settings) {
  const product = table * factor;
  const base = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    table,
    factor,
    type,
    correctAnswer: product,
    prompt: `${table} × ${factor}`,
    label: TYPE_LABELS[type],
    choices: null,
    visual: null
  };

  switch (type) {
    case "direct":
      return {
        ...base,
        prompt: `${table} × ${factor} = ?`,
        correctAnswer: product
      };

    case "reversed":
      return {
        ...base,
        prompt: `${factor} × ${table} = ?`,
        correctAnswer: product
      };

    case "missing": {
      const hideFirst = Math.random() < 0.5;
      return {
        ...base,
        prompt: hideFirst ? `□ × ${factor} = ${product}` : `${table} × □ = ${product}`,
        correctAnswer: hideFirst ? table : factor
      };
    }

    case "division": {
      const divisorIsTable = Math.random() < 0.5;
      return {
        ...base,
        prompt: divisorIsTable ? `${product} ÷ ${table} = ?` : `${product} ÷ ${factor} = ?`,
        correctAnswer: divisorIsTable ? factor : table
      };
    }

    case "choice": {
      return {
        ...base,
        prompt: `${table} × ${factor} = ?`,
        correctAnswer: product,
        choices: buildNumericChoices(product, table, factor)
      };
    }

    case "boolean": {
      const isTrue = Math.random() < 0.5;
      const shownAnswer = isTrue ? product : buildWrongAnswer(product, table, factor);
      return {
        ...base,
        prompt: `${table} × ${factor} = ${shownAnswer}`,
        correctAnswer: isTrue,
        choices: [
          { label: "Верно", value: true },
          { label: "Неверно", value: false }
        ]
      };
    }

    case "comparison": {
      const secondTable = randomInt(2, 10);
      const secondFactor = randomInt(settings.minFactor, settings.maxFactor);
      const left = product;
      const right = secondTable * secondFactor;
      const sign = left === right ? "=" : left > right ? ">" : "<";

      return {
        ...base,
        prompt: `${table} × ${factor}  □  ${secondTable} × ${secondFactor}`,
        correctAnswer: sign,
        choices: [
          { label: ">", value: ">" },
          { label: "<", value: "<" },
          { label: "=", value: "=" }
        ]
      };
    }

    case "visual":
      return {
        ...base,
        prompt: `${table} рядов по ${factor}`,
        label: "Сколько всего точек?",
        correctAnswer: product,
        visual: { rows: table, columns: factor }
      };

    default:
      return base;
  }
}

function buildNumericChoices(correct, table, factor) {
  const values = new Set([correct]);
  const candidates = [
    correct + table,
    correct - table,
    correct + factor,
    correct - factor,
    table + factor,
    correct + 1,
    correct - 1,
    (table + 1) * factor,
    table * Math.max(1, factor - 1)
  ].filter((value) => Number.isInteger(value) && value >= 0);

  shuffle(candidates);
  for (const value of candidates) {
    values.add(value);
    if (values.size === 4) break;
  }

  while (values.size < 4) {
    values.add(Math.max(0, correct + randomInt(-10, 10)));
  }

  return shuffle([...values]).map((value) => ({ label: String(value), value }));
}

function buildWrongAnswer(correct, table, factor) {
  const options = [
    correct + table,
    correct - table,
    correct + factor,
    correct - factor,
    correct + 1,
    correct - 1
  ].filter((value) => value >= 0 && value !== correct);

  return randomItem(options);
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) {
    finishQuiz();
    return;
  }

  state.selectedAnswer = null;
  state.attemptsForCurrent = 0;
  state.questionStartedAt = Date.now();
  state.locked = false;

  elements.progressText.textContent = `Задание ${state.currentIndex + 1} из ${state.questions.length}`;
  elements.progressBar.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
  elements.questionLabel.textContent = question.label;
  elements.questionText.textContent = question.prompt;
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
  elements.submitButton.classList.remove("hidden");
  elements.submitButton.disabled = false;
  elements.nextButton.classList.add("hidden");
  elements.visualArea.classList.add("hidden");
  elements.visualArea.innerHTML = "";

  if (question.visual) {
    renderVisualModel(question.visual);
  }

  renderAnswerInput(question);

  requestAnimationFrame(() => {
    const input = elements.answerArea.querySelector(".answer-input");
    if (input) input.focus();
  });
}

function renderVisualModel(visual) {
  const totalDots = visual.rows * visual.columns;
  const maxDots = 120;

  elements.visualArea.classList.remove("hidden");
  elements.visualArea.style.gridTemplateColumns = `repeat(${visual.columns}, 18px)`;

  if (totalDots > maxDots) {
    elements.visualArea.innerHTML = `<strong>${visual.rows} ряда × ${visual.columns} точек</strong>`;
    elements.visualArea.style.gridTemplateColumns = "1fr";
    return;
  }

  for (let i = 0; i < totalDots; i += 1) {
    const dot = document.createElement("span");
    dot.className = "dot";
    elements.visualArea.appendChild(dot);
  }
}

function renderAnswerInput(question) {
  elements.answerArea.innerHTML = "";

  if (question.choices) {
    const grid = document.createElement("div");
    grid.className = "choice-grid";

    question.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.dataset.answer = serializeAnswerValue(choice.value);
      button.textContent = choice.label;
      grid.appendChild(button);
    });

    elements.answerArea.appendChild(grid);
    return;
  }

  const fragment = elements.numericAnswerTemplate.content.cloneNode(true);
  elements.answerArea.appendChild(fragment);
}

function getCurrentAnswer() {
  const question = state.questions[state.currentIndex];

  if (question.choices) {
    return state.selectedAnswer;
  }

  const input = elements.answerArea.querySelector(".answer-input");
  if (!input || input.value.trim() === "") return null;
  return Number(input.value);
}

function submitCurrentAnswer() {
  if (state.locked) return;

  const question = state.questions[state.currentIndex];
  const answer = getCurrentAnswer();

  if (answer === null || Number.isNaN(answer)) {
    showFeedback("Введите или выберите ответ.", "warning");
    return;
  }

  state.attemptsForCurrent += 1;
  const isCorrect = answersEqual(answer, question.correctAnswer);

  if (!isCorrect && state.settings.secondAttempt && state.attemptsForCurrent === 1) {
    showFeedback("Пока неверно. Попробуй ещё раз.", "warning");
    markSelectedChoice(question, false, false);
    state.selectedAnswer = null;
    elements.answerArea.querySelectorAll(".choice-button").forEach((button) => {
      button.classList.remove("selected", "wrong");
    });
    const input = elements.answerArea.querySelector(".answer-input");
    if (input) {
      input.select();
      input.focus();
    }
    return;
  }

  const timeSpent = Math.max(1, Math.round((Date.now() - state.questionStartedAt) / 1000));
  const firstTryCorrect = isCorrect && state.attemptsForCurrent === 1;

  state.answers.push({
    questionId: question.id,
    table: question.table,
    factor: question.factor,
    type: question.type,
    prompt: question.prompt,
    userAnswer: answer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    firstTryCorrect,
    attempts: state.attemptsForCurrent,
    timeSpent
  });

  if (firstTryCorrect) {
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  } else {
    state.currentStreak = 0;
  }

  state.locked = true;
  lockAnswerControls();
  markSelectedChoice(question, isCorrect, true);

  if (state.settings.instantFeedback) {
    if (isCorrect) {
      const message = state.attemptsForCurrent === 1
        ? "Верно!"
        : "Верно со второй попытки.";
      showFeedback(message, "success");
    } else {
      showFeedback(`Неверно. Правильный ответ: ${formatAnswer(question.correctAnswer)}.`, "error");
    }
    elements.submitButton.classList.add("hidden");
    elements.nextButton.classList.remove("hidden");
    elements.nextButton.focus();
  } else {
    goToNextQuestion();
  }
}

function markSelectedChoice(question, isCorrect, showCorrect) {
  if (!question.choices) return;

  elements.answerArea.querySelectorAll(".choice-button").forEach((button) => {
    const value = parseAnswerValue(button.dataset.answer);
    if (showCorrect && answersEqual(value, question.correctAnswer)) {
      button.classList.add("correct");
    }
    if (button.classList.contains("selected") && !isCorrect) {
      button.classList.add("wrong");
    }
  });
}

function lockAnswerControls() {
  elements.answerArea.querySelectorAll("button, input").forEach((control) => {
    control.disabled = true;
  });
  elements.submitButton.disabled = true;
}

function goToNextQuestion() {
  if (state.currentIndex >= state.questions.length - 1) {
    finishQuiz();
    return;
  }

  state.currentIndex += 1;
  renderQuestion();
}

function startTimer() {
  clearInterval(state.timerId);
  updateTimerText();

  state.timerId = setInterval(() => {
    state.elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
    updateTimerText();

    if (state.settings.timeLimit > 0 && state.elapsedSeconds >= state.settings.timeLimit) {
      finishQuiz("Время закончилось");
    }
  }, 250);
}

function updateTimerText() {
  const limit = state.settings?.timeLimit ?? 0;
  const value = limit > 0
    ? Math.max(0, limit - state.elapsedSeconds)
    : state.elapsedSeconds;

  elements.timerText.textContent = formatTime(value);
}

function finishQuiz(customTitle = "") {
  clearInterval(state.timerId);
  state.timerId = null;

  state.elapsedSeconds = Math.max(
    state.elapsedSeconds,
    Math.floor((Date.now() - state.startedAt) / 1000)
  );

  if (!state.answers.length) {
    resetToSetup();
    return;
  }

  renderResults(customTitle);
  saveHistory();
  showScreen("results");
}

function renderResults(customTitle = "") {
  const total = state.answers.length;
  const correct = state.answers.filter((answer) => answer.firstTryCorrect).length;
  const percent = Math.round((correct / total) * 100);
  const average = Math.round(
    state.answers.reduce((sum, answer) => sum + answer.timeSpent, 0) / total
  );

  elements.resultTitle.textContent = customTitle || getResultTitle(percent);
  elements.scorePercent.textContent = `${percent}%`;
  elements.correctStat.textContent = `${correct} из ${total}`;
  elements.timeStat.textContent = formatTime(state.elapsedSeconds);
  elements.averageStat.textContent = `${average} сек`;
  elements.streakStat.textContent = String(state.bestStreak);

  renderTableResults();
  renderRecommendation();
  renderReviewList();

  const hasMistakes = state.answers.some((answer) => !answer.firstTryCorrect);
  elements.retryMistakesButton.disabled = !hasMistakes;
}

function getResultTitle(percent) {
  if (percent === 100) return "Отлично! Все ответы верные.";
  if (percent >= 85) return "Очень хороший результат!";
  if (percent >= 65) return "Хорошая работа!";
  return "Продолжим тренировку!";
}

function renderTableResults() {
  const grouped = groupBy(state.answers, (answer) => answer.table);
  const rows = [...grouped.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([table, answers]) => {
      const correct = answers.filter((answer) => answer.firstTryCorrect).length;
      const percent = Math.round((correct / answers.length) * 100);
      return `
        <div class="result-bar-row">
          <strong>На ${table}</strong>
          <div class="result-bar-track">
            <div class="result-bar-fill" style="width: ${percent}%"></div>
          </div>
          <span>${percent}%</span>
        </div>
      `;
    });

  elements.tableResults.innerHTML = rows.join("");
}

function renderRecommendation() {
  const grouped = groupBy(state.answers, (answer) => answer.table);
  const weakTables = [...grouped.entries()]
    .map(([table, answers]) => {
      const correct = answers.filter((answer) => answer.firstTryCorrect).length;
      return {
        table: Number(table),
        percent: Math.round((correct / answers.length) * 100)
      };
    })
    .filter((item) => item.percent < 80)
    .sort((a, b) => a.percent - b.percent);

  const weakExamples = state.answers
    .filter((answer) => !answer.firstTryCorrect)
    .slice(0, 5)
    .map((answer) => answer.prompt.replace(" = ?", ""));

  if (weakTables.length === 0) {
    elements.recommendation.textContent =
      "Все выбранные таблицы усвоены хорошо. Для закрепления можно увеличить количество примеров или включить сравнение выражений и задания с пропущенным множителем.";
    return;
  }

  const tablesText = weakTables.map((item) => `на ${item.table}`).join(", ");
  const examplesText = weakExamples.length
    ? ` Особое внимание: ${weakExamples.join("; ")}.`
    : "";

  elements.recommendation.textContent =
    `Стоит повторить таблицы ${tablesText}.${examplesText}`;
}

function renderReviewList() {
  elements.mistakesList.innerHTML = state.answers.map((answer, index) => {
    const className = answer.firstTryCorrect ? "correct-review" : "wrong-review";
    const status = answer.firstTryCorrect
      ? "Верно с первой попытки"
      : answer.isCorrect
        ? "Исправлено со второй попытки"
        : "Ошибка";

    return `
      <div class="review-item ${className}">
        <div>
          <div class="review-question">${index + 1}. ${escapeHtml(answer.prompt)}</div>
          <div class="review-meta">${TYPE_LABELS[answer.type]}</div>
        </div>
        <div>
          <div class="review-meta">Ответ ученика</div>
          <strong>${escapeHtml(formatAnswer(answer.userAnswer))}</strong>
        </div>
        <div>
          <div class="review-meta">${status}</div>
          <strong>Правильно: ${escapeHtml(formatAnswer(answer.correctAnswer))}</strong>
        </div>
      </div>
    `;
  }).join("");
}

function startMistakeRetry() {
  const mistakeAnswers = state.answers.filter((answer) => !answer.firstTryCorrect);
  if (!mistakeAnswers.length) return;

  const originalQuestions = new Map(state.questions.map((question) => [question.id, question]));
  const retryQuestions = mistakeAnswers
    .map((answer) => originalQuestions.get(answer.questionId))
    .filter(Boolean)
    .map((question) => ({ ...question, id: `${question.id}-retry-${Date.now()}` }));

  state.questions = retryQuestions;
  state.currentIndex = 0;
  state.selectedAnswer = null;
  state.attemptsForCurrent = 0;
  state.answers = [];
  state.startedAt = Date.now();
  state.questionStartedAt = Date.now();
  state.elapsedSeconds = 0;
  state.bestStreak = 0;
  state.currentStreak = 0;
  state.locked = false;
  state.retryMode = true;
  state.settings = {
    ...state.settings,
    count: retryQuestions.length,
    secondAttempt: true,
    instantFeedback: true,
    timeLimit: 0
  };

  showScreen("quiz");
  startTimer();
  renderQuestion();
}

function saveHistory() {
  const history = loadHistory();
  const total = state.answers.length;
  const correct = state.answers.filter((answer) => answer.firstTryCorrect).length;
  const tables = [...new Set(state.answers.map((answer) => answer.table))].sort((a, b) => a - b);

  history.unshift({
    date: new Date().toISOString(),
    correct,
    total,
    percent: Math.round((correct / total) * 100),
    time: state.elapsedSeconds,
    tables,
    retryMode: state.retryMode
  });

  localStorage.setItem("multiplicationTrainerHistory", JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("multiplicationTrainerHistory") || "[]");
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  if (!history.length) {
    elements.historyContent.innerHTML =
      '<p class="empty-state">Здесь появятся результаты после первой тренировки.</p>';
    return;
  }

  elements.historyContent.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Дата</th>
          <th>Таблицы</th>
          <th>Результат</th>
          <th>Время</th>
        </tr>
      </thead>
      <tbody>
        ${history.map((item) => `
          <tr>
            <td>${formatDate(item.date)}</td>
            <td>${item.retryMode ? "Работа над ошибками" : item.tables.join(", ")}</td>
            <td>${item.correct}/${item.total} — ${item.percent}%</td>
            <td>${formatTime(item.time)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function clearHistory() {
  localStorage.removeItem("multiplicationTrainerHistory");
  renderHistory();
}

function exportCsv() {
  if (!state.answers.length) return;

  const header = [
    "Номер",
    "Таблица",
    "Тип задания",
    "Пример",
    "Ответ ученика",
    "Правильный ответ",
    "С первой попытки",
    "Количество попыток",
    "Время, сек"
  ];

  const rows = state.answers.map((answer, index) => [
    index + 1,
    answer.table,
    TYPE_LABELS[answer.type],
    answer.prompt,
    formatAnswer(answer.userAnswer),
    formatAnswer(answer.correctAnswer),
    answer.firstTryCorrect ? "Да" : "Нет",
    answer.attempts,
    answer.timeSpent
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `multiplication-results-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetToSetup() {
  clearInterval(state.timerId);
  state.timerId = null;
  showScreen("setup");
  renderHistory();
}

function showScreen(name) {
  elements.setupScreen.classList.toggle("hidden", name !== "setup");
  elements.quizScreen.classList.toggle("hidden", name !== "quiz");
  elements.resultsScreen.classList.toggle("hidden", name !== "results");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showFeedback(message, type) {
  elements.feedback.textContent = message;
  elements.feedback.className = `feedback ${type}`;
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "multiplicationTrainerTheme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
}

function loadTheme() {
  const saved = localStorage.getItem("multiplicationTrainerTheme");
  if (saved === "dark") {
    document.body.classList.add("dark");
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoDate));
}

function formatAnswer(value) {
  if (value === true) return "Верно";
  if (value === false) return "Неверно";
  return String(value);
}

function answersEqual(a, b) {
  return a === b;
}

function serializeAnswerValue(value) {
  return JSON.stringify({ value });
}

function parseAnswerValue(serialized) {
  try {
    return JSON.parse(serialized).value;
  } catch {
    return serialized;
  }
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
