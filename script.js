// 1. Konfiguracja i inicjalizacja Supabase
const CONFIG = {
  SUPABASE_URL: "https://icodelhzrzmdlrpgsygh.supabase.co/",
  SUPABASE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljb2RlbGh6cnptZGxycGdzeWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTM2OTIsImV4cCI6MjA5MTgyOTY5Mn0.1CIOeHwKxKMBwX2Lee9OA0LYFpVdDevealH6l6PlkC4",
  SUPABASE_TABLE: "pub_quiz_scores",
  QUESTION_TIME: 15,
};

const supabaseClient = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY,
);

// Referencje do ekranów
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");
const leaderboardScreen = document.getElementById("leaderboard-screen");

// Przyciski i elementy interfejsu
const startBtn = document.getElementById("start-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const backToStartBtn = document.getElementById("back-to-start-btn");
const restartBtn = document.getElementById("restart-btn");
const saveScoreBtn = document.getElementById("save-score-btn");
const themeToggle = document.getElementById("theme-toggle");

// Dolna nawigacja
const navHome = document.getElementById("nav-home");
const navLeaderboard = document.getElementById("nav-leaderboard");

const diffButtons = document.querySelectorAll(".diff-btn");
const filterButtons = document.querySelectorAll(".filter-btn");

const questionCounter = document.getElementById("question-counter");
const scoreDisplay = document.getElementById("score-counter");
const categoryTag = document.getElementById("category-tag");
const beerDifficulty = document.getElementById("beer-difficulty");
const questionText = document.getElementById("question-text");
const answersContainer = document.getElementById("answers-container");
const timerBar = document.getElementById("timer-bar");
const timerText = document.getElementById("timer");

const finalScoreText = document.getElementById("final-score-text");
const bonusInfoText = document.getElementById("bonus-info-text");
const playerNicknameInput = document.getElementById("player-nickname");
const leaderboardList = document.getElementById("leaderboard-list");

// Stan gry
let selectedDifficulty = "mix";
let currentFilter = "all";
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let correctAnswersCount = 0; // Licznik poprawnych odpowiedzi w sesji
let timerInterval = null;
let timeLeft = CONFIG.QUESTION_TIME;

// Słownik ikon dla kategorii
const categoryIcons = {
  "Geography & UK": "🗺️",
  "Pub Culture & Slang": "🍻",
  "History & Monarchy": "👑",
  "Pop Culture & Music": "🎸",
};

// Poziomy trudności i ikony piwka
const difficultyBeers = {
  easy: { text: "Easy", icon: "🍺", class: "easy" },
  medium: { text: "Medium", icon: "🍻", class: "medium" },
  hard: { text: "Hard", icon: "🍻🔥", class: "hard" },
};

// Obsługa wyboru poziomu trudności przed startem
diffButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    diffButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDifficulty = btn.getAttribute("data-diff");
  });
});

// Obsługa przycisków filtrowania w Leaderboardzie
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.getAttribute("data-filter");
    loadLeaderboard();
  });
});

// Motyw jasny / ciemny
themeToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  if (currentTheme === "dark") {
    html.setAttribute("data-theme", "light");
    themeToggle.textContent = "☀️";
  } else {
    html.setAttribute("data-theme", "dark");
    themeToggle.textContent = "🌙";
  }
});

// Obsługa dolnej nawigacji
if (navHome) {
  navHome.addEventListener("click", () => showScreen(startScreen));
}
if (navLeaderboard) {
  navLeaderboard.addEventListener("click", () => {
    showScreen(leaderboardScreen);
    loadLeaderboard();
  });
}

function showScreen(screen) {
  [startScreen, quizScreen, resultScreen, leaderboardScreen].forEach((s) =>
    s.classList.remove("active"),
  );
  screen.classList.add("active");
}

startBtn.addEventListener("click", async () => {
  await fetchQuestions();
  if (currentQuestions.length === 0) {
    alert("Brak pytań w bazie dla wybranego poziomu!");
    return;
  }
  currentIndex = 0;
  score = 0;
  correctAnswersCount = 0; // Resetujemy licznik poprawnych odpowiedzi
  showScreen(quizScreen);
  loadQuestion();
});

async function fetchQuestions() {
  let query = supabaseClient.from("pub_quiz_questions").select("*");

  if (selectedDifficulty !== "mix") {
    query = query.eq("difficulty", selectedDifficulty);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Błąd pobierania pytań:", error);
    currentQuestions = [];
  } else {
    currentQuestions = data.sort(() => 0.5 - Math.random()).slice(0, 10);
  }
}

function loadQuestion() {
  clearInterval(timerInterval);
  if (currentIndex >= currentQuestions.length) {
    endQuiz();
    return;
  }

  const q = currentQuestions[currentIndex];

  if (questionCounter)
    questionCounter.textContent = `Question ${currentIndex + 1}/${currentQuestions.length}`;
  if (scoreDisplay) scoreDisplay.textContent = score;
  if (questionText) questionText.textContent = q.question;

  const rawCategory = q.category ? q.category.trim() : "General";
  const icon = categoryIcons[rawCategory] || "📌";
  if (categoryTag) {
    categoryTag.innerHTML = `${icon} ${rawCategory}`;
  }

  const diffKey = q.difficulty ? q.difficulty.trim().toLowerCase() : "easy";
  const diffData = difficultyBeers[diffKey] || {
    text: diffKey,
    icon: "🍺",
    class: "easy",
  };

  if (beerDifficulty) {
    beerDifficulty.innerHTML = `${diffData.icon} <span>${diffData.text}</span>`;
    beerDifficulty.className = `beer-difficulty ${diffData.class}`;
  }

  answersContainer.innerHTML = "";
  q.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.classList.add("answer-btn");
    btn.textContent = option;
    btn.addEventListener("click", () => selectAnswer(index, q.correct_index));
    answersContainer.appendChild(btn);
  });

  startTimer();
}

function startTimer() {
  timeLeft = CONFIG.QUESTION_TIME;
  if (timerText) timerText.textContent = `${timeLeft}s`;
  if (timerBar) timerBar.style.width = "100%";

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timerText) timerText.textContent = `${timeLeft}s`;
    if (timerBar)
      timerBar.style.width = `${(timeLeft / CONFIG.QUESTION_TIME) * 100}%`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout() {
  const buttons = answersContainer.querySelectorAll(".answer-btn");
  const q = currentQuestions[currentIndex];

  buttons.forEach((btn, index) => {
    btn.disabled = true;
    if (index === q.correct_index) btn.classList.add("correct");
  });

  setTimeout(() => {
    currentIndex++;
    loadQuestion();
  }, 2000);
}

function selectAnswer(selectedIndex, correctIndex) {
  clearInterval(timerInterval);
  const buttons = answersContainer.querySelectorAll(".answer-btn");

  buttons.forEach((btn, index) => {
    btn.disabled = true;
    if (index === correctIndex) {
      btn.classList.add("correct");
    } else if (index === selectedIndex) {
      btn.classList.add("incorrect");
    }
  });

  if (selectedIndex === correctIndex) {
    correctAnswersCount++; // Zwiększamy licznik poprawnych odpowiedzi
    let points = 10;
    const q = currentQuestions[currentIndex];
    const diff = q.difficulty ? q.difficulty.trim().toLowerCase() : "easy";
    if (diff === "medium") points = 15;
    if (diff === "hard") points = 20;

    score += points + Math.floor(timeLeft / 3);
  }

  setTimeout(() => {
    currentIndex++;
    loadQuestion();
  }, 1500);
}

function endQuiz() {
  showScreen(resultScreen);
  if (finalScoreText) finalScoreText.textContent = `Your Final Score: ${score}`;
  if (bonusInfoText) {
    if (score > 150)
      bonusInfoText.textContent = "🏆 Amazing! True British Pub Champion!";
    else if (score > 80)
      bonusInfoText.textContent =
        "🍻 Not bad! You know your way around the pub.";
    else bonusInfoText.textContent = "😅 Time for another pint and try again!";
  }
}

// Zapisywanie wyniku (wraz z zapisaną liczbą poprawnych odpowiedzi)
saveScoreBtn.addEventListener("click", async () => {
  const nickname = playerNicknameInput.value.trim() || "Anonymous";

  const deviceId =
    localStorage.getItem("quiz_device_id") ||
    "device_" + Math.random().toString(36).substring(2, 9);
  localStorage.setItem("quiz_device_id", deviceId);

  const { error } = await supabaseClient.from(CONFIG.SUPABASE_TABLE).insert([
    {
      nickname: nickname,
      score: score,
      device_id: deviceId,
      difficulty: selectedDifficulty,
      correct_count: correctAnswersCount, // Zapisujemy liczbę poprawnych odpowiedzi
    },
  ]);

  if (error) {
    console.error("Błąd zapisu wyniku:", error);
    alert("Could not save score.");
  } else {
    loadLeaderboard();
    showScreen(leaderboardScreen);
  }
});

leaderboardBtn.addEventListener("click", () => {
  showScreen(leaderboardScreen);
  loadLeaderboard();
});

// Ładowanie rankingu z wyświetleniem poziomu, liczby trafionych pytań i punktów
async function loadLeaderboard() {
  if (leaderboardList)
    leaderboardList.innerHTML = '<p class="loading-text">Loading scores...</p>';

  let query = supabaseClient
    .from(CONFIG.SUPABASE_TABLE)
    .select("*")
    .order("score", { ascending: false });

  if (currentFilter !== "all") {
    query = query.eq("difficulty", currentFilter);
  }

  const { data, error } = await query.limit(10); // Pobieramy do 10 wyników

  if (error) {
    if (leaderboardList)
      leaderboardList.innerHTML =
        '<p class="loading-text">Failed to load leaderboard.</p>';
    return;
  }

  if (data.length === 0) {
    if (leaderboardList)
      leaderboardList.innerHTML =
        '<p class="loading-text">No scores yet for this filter.</p>';
    return;
  }

  if (leaderboardList) leaderboardList.innerHTML = "";
  data.forEach((row, index) => {
    const item = document.createElement("div");
    item.classList.add("leaderboard-item");

    const diff = row.difficulty ? row.difficulty.toLowerCase() : "mix";
    let diffBadge = "🎲 Mix";
    let badgeClass = "mix";
    if (diff === "easy") {
      diffBadge = "🍺 Easy";
      badgeClass = "easy";
    } else if (diff === "medium") {
      diffBadge = "🍻 Med";
      badgeClass = "medium";
    } else if (diff === "hard") {
      diffBadge = "🔥 Hard";
      badgeClass = "hard";
    }

    // Odczytujemy liczbę poprawnych odpowiedzi (jeśli kolumna istnieje w bazie, w przeciwnym razie domyślnie pokazuje np. wynik)
    const correctCount =
      row.correct_count !== undefined && row.correct_count !== null
        ? `${row.correct_count}/10 correct`
        : "";

    item.innerHTML = `
            <span>#${index + 1} <strong>${row.nickname}</strong> <span class="lb-badge ${badgeClass}">${diffBadge}</span></span>
            <div class="lb-score-box">
                <span class="lb-pts">${row.score} pts</span>
                <span class="lb-qcount">${correctCount}</span>
            </div>
        `;
    leaderboardList.appendChild(item);
  });
}

backToStartBtn.addEventListener("click", () => showScreen(startScreen));
restartBtn.addEventListener("click", () => showScreen(startScreen));
