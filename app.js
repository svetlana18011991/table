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
  retryMode: false
};

function init() {
  buildTableControls();
  bindEvents();
  loadTheme();
  renderHistory();
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
