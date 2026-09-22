// Initialize Supabase client using configuration from config.js
const _supabase = supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY,
);

// Game state
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = CONFIG.QUESTION_TIME;

// DOM Elements
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const summaryScreen = document.getElementById("summary-screen");
const leaderboardScreen = document.getElementById("leaderboard-screen");

const startBtn = document.getElementById("start-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const restartBtn = document.getElementById("restart-btn");
const homeBtnSummary = document.getElementById("home-btn-summary");
const backToMenuBtn = document.getElementById("back-to-menu-btn");
const quitBtn = document.getElementById("quit-btn");

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
const leaderboardListEl = document.getElementById("leaderboard-list");

// Event Listeners
startBtn.addEventListener("click", startQuiz);
restartBtn.addEventListener("click", startQuiz);
leaderboardBtn.addEventListener("click", showLeaderboard);
backToMenuBtn.addEventListener("click", showMainMenu);
homeBtnSummary.addEventListener("click", showMainMenu);
quitBtn.addEventListener("click", quitToMenu);
saveScoreBtn.addEventListener("click", saveScoreToSupabase);

function switchScreen(fromScreen, toScreen) {
  fromScreen.classList.remove("active");
  toScreen.classList.add("active");
}

function showMainMenu() {
  resetTimer();
  const activeScreen = document.querySelector(".screen.active");
  switchScreen(activeScreen, startScreen);
}

function quitToMenu() {
  if (confirm("Are you sure you want to quit the quiz?")) {
    resetTimer();
    switchScreen(quizScreen, startScreen);
  }
}

function startQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  scoreCounterEl.textContent = score;

  nicknameInput.value = "";
  nicknameInput.disabled = false;
  saveScoreBtn.disabled = false;
  saveScoreContainer.style.display = "block";
  saveStatusEl.textContent = "";

  const activeScreen = document.querySelector(".screen.active");
  switchScreen(activeScreen, quizScreen);
  loadQuestion();
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
      "Brilliant! Full success, you deserve a pint of ale!";
  } else if (score >= 7) {
    summaryMessageEl.textContent =
      "Good job, mate! You know the British Isles very well.";
  } else if (score >= 4) {
    summaryMessageEl.textContent =
      "Not bad, but could use a few more pub visits!";
  } else {
    summaryMessageEl.textContent =
      "Oof! Time to brush up on your British culture.";
  }
}

async function saveScoreToSupabase() {
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    saveStatusEl.textContent = "Please enter your nickname first!";
    return;
  }

  saveScoreBtn.disabled = true;
  nicknameInput.disabled = true;
  saveStatusEl.textContent = "Saving score...";

  const { error } = await _supabase
    .from(CONFIG.SUPABASE_TABLE)
    .insert([{ nickname: nickname, score: score }]);

  if (error) {
    console.error("Supabase error:", error);
    saveStatusEl.textContent = "Save failed! Try again.";
    saveScoreBtn.disabled = false;
    nicknameInput.disabled = false;
  } else {
    saveStatusEl.textContent = "Success! Score saved to leaderboard.";
  }
}

async function showLeaderboard() {
  const activeScreen = document.querySelector(".screen.active");
  switchScreen(activeScreen, leaderboardScreen);

  leaderboardListEl.innerHTML =
    '<p class="loading-scores">Loading scores...</p>';

  const { data, error } = await _supabase
    .from(CONFIG.SUPABASE_TABLE)
    .select("nickname, score, created_at")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    leaderboardListEl.innerHTML =
      '<p class="no-scores">Failed to load leaderboard.</p>';
    return;
  }

  if (!data || data.length === 0) {
    leaderboardListEl.innerHTML =
      '<p class="no-scores">No scores recorded yet. Be the first!</p>';
    return;
  }

  leaderboardListEl.innerHTML = "";
  data.forEach((row, index) => {
    const item = document.createElement("div");
    item.classList.add("leaderboard-item");
    item.innerHTML = `
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${escapeHtml(row.nickname)}</span>
            <span class="leaderboard-score">${row.score} / ${pubQuizQuestions.length}</span>
        `;
    leaderboardListEl.appendChild(item);
  });
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}
