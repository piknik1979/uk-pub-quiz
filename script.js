// Inicjalizacja klienta Supabase z pliku config.js
const supabaseClient = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY
);

// Stan gry
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let selectedDifficulty = 'mix';
let timer = null;
let timeLeft = CONFIG.QUESTION_TIME || 15;

// Unikalne ID urządzenia gracza
let deviceId = localStorage.getItem('pub_quiz_device_id');
if (!deviceId) {
  deviceId = 'user_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('pub_quiz_device_id', deviceId);
}

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('summary-screen') || document.getElementById('result-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');

const startBtn = document.getElementById('start-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const restartBtn = document.getElementById('restart-btn');
const backToStartBtn = document.getElementById('back-to-menu-btn') || document.getElementById('back-to-start-btn');
const saveScoreBtn = document.getElementById('save-score-btn');
const themeToggle = document.getElementById('theme-toggle-btn') || document.getElementById('theme-toggle');

const questionText = document.getElementById('question-text');
const answersContainer = document.getElementById('answers-container');
const questionCounter = document.getElementById('question-number') || document.getElementById('question-counter');
const scoreDisplay = document.getElementById('score-counter') || document.getElementById('score-display');
const finalScoreText = document.getElementById('final-score') || document.getElementById('final-score-text');
const bonusInfoText = document.getElementById('summary-message') || document.getElementById('bonus-info-text');
const playerNickname = document.getElementById('nickname-input') || document.getElementById('player-nickname');
const leaderboardList = document.getElementById('leaderboard-list');
const timerBar = document.getElementById('timer-bar') || document.getElementById('progress-bar');
const timerText = document.getElementById('timer');
const diffButtons = document.querySelectorAll('.diff-btn');

// --- MOTYW (DAY / NIGHT) ---
const savedTheme = localStorage.getItem('pub_quiz_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeToggle) themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('pub_quiz_theme', newTheme);
      themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
  });
}

// --- WYBÓR TRUDNOŚCI ---
diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDifficulty = btn.getAttribute('data-diff');
  });
});

// --- NAWIGACJA MIĘDZY EKRANAMI ---
function showScreen(screen) {
  [startScreen, quizScreen, resultScreen, leaderboardScreen].forEach(s => {
      if (s) s.classList.remove('active');
  });
  if (screen) screen.classList.add('active');
}

// --- START QUIZU (Pobieranie pytań z Supabase) ---
if (startBtn) {
  startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Loading questions... 🍻';

      try {
          let query = supabaseClient.from(CONFIG.SUPABASE_TABLE).select('*');
          
          if (selectedDifficulty !== 'mix') {
              query = query.eq('difficulty', selectedDifficulty);
          }

          const { data, error } = await query;
          if (error) throw error;

          if (!data || data.length === 0) {
              alert('No questions found for this difficulty in the database!');
              startBtn.disabled = false;
              startBtn.textContent = 'Start Quiz';
              return;
          }

          currentQuestions = data.sort(() => Math.random() - 0.5).slice(0, 10);
          
          currentIndex = 0;
          score = 0;
          correctAnswersCount = 0;
          if (playerNickname) {
              playerNickname.value = "";
              playerNickname.disabled = false;
          }
          if (saveScoreBtn) saveScoreBtn.disabled = false;

          showScreen(quizScreen);
          nextQuestion();
      } catch (err) {
          console.error('Error fetching questions:', err);
          alert('Failed to load questions from database.');
      } finally {
          startBtn.disabled = false;
          startBtn.textContent = 'Start Quiz';
      }
  });
}

// --- LOGIKA PYTAŃ I CZASU ---
function nextQuestion() {
  if (currentIndex >= currentQuestions.length) {
      endQuiz();
      return;
  }

  clearInterval(timer);
  timeLeft = CONFIG.QUESTION_TIME || 15;
  updateTimerDisplay();

  const q = currentQuestions[currentIndex];
  if (questionCounter) questionCounter.textContent = `${currentIndex + 1}/${currentQuestions.length}`;
  if (scoreDisplay) scoreDisplay.textContent = score;
  if (questionText) questionText.textContent = q.question;

  if (answersContainer) {
      answersContainer.innerHTML = '';
      const options = q.options;
      const correctIndex = q.correct_index;

      options.forEach((opt, index) => {
          const btn = document.createElement('button');
          btn.classList.add('answer-btn');
          btn.textContent = opt;
          btn.addEventListener('click', () => selectAnswer(index, correctIndex));
          answersContainer.appendChild(btn);
      });
  }

  startTimer();
}

function startTimer() {
  timer = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      if (timeLeft <= 0) {
          clearInterval(timer);
          handleTimeout();
      }
  }, 1000);
}

function updateTimerDisplay() {
  if (timerText) timerText.textContent = `${timeLeft}s`;
  if (timerBar) {
      const maxTime = CONFIG.QUESTION_TIME || 15;
      const percentage = (timeLeft / maxTime) * 100;
      timerBar.style.width = `${percentage}%`;
  }
}

function handleTimeout() {
  const q = currentQuestions[currentIndex];
  const correctIndex = q.correct_index;
  if (answersContainer) {
      const buttons = answersContainer.querySelectorAll('.answer-btn');
      buttons.forEach((btn, index) => {
          btn.disabled = true;
          if (index === correctIndex) btn.classList.add('correct');
      });
  }

  setTimeout(() => {
      currentIndex++;
      nextQuestion();
  }, 1500);
}

function selectAnswer(selectedIndex, correctIndex) {
  clearInterval(timer);
  if (!answersContainer) return;
  const buttons = answersContainer.querySelectorAll('.answer-btn');
  
  let points = 10;
  const q = currentQuestions[currentIndex];
  const diff = q.difficulty ? q.difficulty.trim().toLowerCase() : 'easy';
  if (diff === 'medium') points = 15;
  if (diff === 'hard') points = 20;

  buttons.forEach((btn, index) => {
      btn.disabled = true;
      if (index === correctIndex) {
          btn.classList.add('correct');
      } else if (index === selectedIndex) {
          btn.classList.add('incorrect');
      }
  });

  if (selectedIndex === correctIndex) {
      correctAnswersCount++;
      score += points + Math.floor(timeLeft / 3);
  }

  if (scoreDisplay) scoreDisplay.textContent = score;

  setTimeout(() => {
      currentIndex++;
      nextQuestion();
  }, 1200);
}

// --- KONIEC QUIZU (Usunięty durny tekst o piwie) ---
function endQuiz() {
  clearInterval(timer);
  showScreen(resultScreen);
  
  let bonusText = `You got ${correctAnswersCount} out of ${currentQuestions.length} correct.`;

  if (finalScoreText) finalScoreText.textContent = `${score} pts`;
  if (bonusInfoText) bonusInfoText.textContent = bonusText;
}

// --- ZAPIS WYNIKU DO SUPABASE ---
if (saveScoreBtn) {
  saveScoreBtn.addEventListener('click', async () => {
      const nickname = (playerNickname ? playerNickname.value.trim() : '') || 'Anonymous';
      saveScoreBtn.disabled = true;
      saveScoreBtn.textContent = 'Saving...';

      try {
          const { error } = await supabaseClient
              .from(CONFIG.SUPABASE_TABLE)
              .insert([
                  {
                      device_id: deviceId,
                      nickname: nickname,
                      score: score,
                      difficulty: selectedDifficulty,
                      correct_count: correctAnswersCount
                  }
              ]);

          if (error) throw error;
          alert('Score saved successfully!');
          loadLeaderboard();
          showScreen(leaderboardScreen);
      } catch (err) {
          console.error('Error saving score:', err);
          alert('Failed to save score.');
      } finally {
          saveScoreBtn.disabled = false;
          saveScoreBtn.textContent = 'Save Score';
      }
  });
}

// --- LEADERBOARD ---
if (leaderboardBtn) {
  leaderboardBtn.addEventListener('click', () => {
      loadLeaderboard();
      showScreen(leaderboardScreen);
  });
}

if (backToStartBtn) {
  backToStartBtn.addEventListener('click', () => {
      showScreen(startScreen);
  });
}

if (restartBtn) {
  restartBtn.addEventListener('click', () => {
      showScreen(startScreen);
  });
}

async function loadLeaderboard() {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '<p class="loading-text">Loading scores...</p>';

  try {
      const { data, error } = await supabaseClient
          .from(CONFIG.SUPABASE_TABLE)
          .select('*')
          .order('score', { ascending: false })
          .limit(10);

      if (error) throw error;

      leaderboardList.innerHTML = '';
      if (!data || data.length === 0) {
          leaderboardList.innerHTML = '<p class="loading-text">No scores yet.</p>';
          return;
      }

      data.forEach((entry, index) => {
          const item = document.createElement('div');
          item.classList.add('leaderboard-item');
          const diff = entry.difficulty ? entry.difficulty.toUpperCase() : 'MIX';
          const correct = entry.correct_count !== undefined ? `${entry.correct_count}/10 correct` : '';
          
          item.innerHTML = `
              <span>#${index + 1} <strong>${escapeHtml(entry.nickname)}</strong> <small>(${diff})</small></span>
              <span><strong>${entry.score} pts</strong> <br><small style="color:var(--text-muted);">${correct}</small></span>
          `;
          leaderboardList.appendChild(item);
      });
  } catch (err) {
      console.error('Error loading leaderboard:', err);
      leaderboardList.innerHTML = '<p class="loading-text">Failed to load leaderboard.</p>';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}