// Inicjalizacja Supabase przy użyciu danych z pliku config.js
const _supabase = supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY,
);

// Stan gry
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = CONFIG.QUESTION_TIME;

// Elementy DOM
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const summaryScreen = document.getElementById("summary-screen");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const questionNumberEl = document.getElementById("question-number");
const scoreCounterEl = document.getElementById("score-counter");
const timerEl = document.getElementById("timer");
const progressBarEl = document.getElementById("progress-bar");
const questionTextEl = document.getElementById("question-text");
const answersContainer = document.getElementById("answers-container");

const finalScoreEl = document.getElementById("final-score");
const summaryMessageEl = document.getElementById("summary-message");

const nicknameInput = document.getElementById("nickname-input");
const saveScoreBtn = document.getElementById("save-score-btn");
const saveStatusEl = document.getElementById("save-status");
const saveScoreContainer = document.getElementById("save-score-container");

startBtn.addEventListener("click", startQuiz);
restartBtn.addEventListener("click", startQuiz);
saveScoreBtn.addEventListener("click", saveScoreToSupabase);

function startQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  scoreCounterEl.textContent = score;

  nicknameInput.value = "";
  nicknameInput.disabled = false;
  saveScoreBtn.disabled = false;
  saveScoreContainer.style.display = "block";
  saveStatusEl.textContent = "";

  switchScreen(startScreen, quizScreen);
  loadQuestion();
}

function switchScreen(fromScreen, toScreen) {
  fromScreen.classList.remove("active");
  toScreen.classList.add("active");
}

function loadQuestion() {
  resetTimer();

  const currentQ = pubQuizQuestions[currentQuestionIndex];
  questionNumberEl.textContent = `${currentQuestionIndex + 1}/${pubQuizQuestions.length}`;
  questionTextEl.textContent = currentQ.question;

  answersContainer.innerHTML = "";

  currentQ.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.classList.add("answer-btn");
    button.textContent = answer.text;
    button.dataset.correct = answer.correct;
    button.addEventListener("click", selectAnswer);
    answersContainer.appendChild(button);
  });

  startTimer();
}

function startTimer() {
  timeLeft = CONFIG.QUESTION_TIME;
  timerEl.textContent = timeLeft;
  progressBarEl.style.width = "100%";

  const intervalTime = 100;
  const step = 100 / (CONFIG.QUESTION_TIME * (1000 / intervalTime));

  timer = setInterval(() => {
    timeLeft -= 0.1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      clearInterval(timer);
      handleTimeout();
    }
    timerEl.textContent = Math.ceil(timeLeft);
    const percentage = (timeLeft / CONFIG.QUESTION_TIME) * 100;
    progressBarEl.style.width = `${percentage}%`;
  }, intervalTime);
}

function resetTimer() {
  clearInterval(timer);
}

function selectAnswer(e) {
  resetTimer();
  const selectedBtn = e.currentTarget;
  const isCorrect = selectedBtn.dataset.correct === "true";

  Array.from(answersContainer.children).forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.correct === "true") {
      btn.classList.add("correct");
    }
  });

  if (isCorrect) {
    score++;
    scoreCounterEl.textContent = score;
  } else {
    selectedBtn.classList.add("incorrect");
  }

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < pubQuizQuestions.length) {
      loadQuestion();
    } else {
      endQuiz();
    }
  }, 1200);
}

function handleTimeout() {
  Array.from(answersContainer.children).forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.correct === "true") {
      btn.classList.add("correct");
    }
  });

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < pubQuizQuestions.length) {
      loadQuestion();
    } else {
      endQuiz();
    }
  }, 1200);
}

function endQuiz() {
  switchScreen(quizScreen, summaryScreen);
  finalScoreEl.textContent = `${score} / ${pubQuizQuestions.length}`;

  if (score === pubQuizQuestions.length) {
    summaryMessageEl.textContent =
      "Brilliant! Pełen sukces, zasługujesz na pintę ale!";
  } else if (score >= 7) {
    summaryMessageEl.textContent =
      "Dobra robota, mate! Znasz Wyspy Brytyjskie bardzo dobrze.";
  } else if (score >= 4) {
    summaryMessageEl.textContent =
      "Nieźle, ale przydałoby się jeszcze trochę wizyt w pubie!";
  } else {
    summaryMessageEl.textContent =
      "Oj, cienko! Czas odświeżyć wiedzę o brytyjskiej kulturze.";
  }
}

async function saveScoreToSupabase() {
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    saveStatusEl.textContent = "Wpisz swój nick przed zapisaniem!";
    return;
  }

  saveScoreBtn.disabled = true;
  nicknameInput.disabled = true;
  saveStatusEl.textContent = "Zapisywanie wyniku...";

  // Zapis z wykorzystaniem nazwy tabeli z config.js
  const { error } = await _supabase
    .from(CONFIG.SUPABASE_TABLE)
    .insert([{ nickname: nickname, score: score }]);

  if (error) {
    console.error("Błąd Supabase:", error);
    saveStatusEl.textContent = "Błąd zapisu! Spróbuj ponownie.";
    saveScoreBtn.disabled = false;
    nicknameInput.disabled = false;
  } else {
    saveStatusEl.textContent = "Sukces! Wynik zapisany w bazie.";
  }
}
