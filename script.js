const STORAGE_KEYS = {
  theme: "tamilQuizTheme",
  attempts: "tamilQuizAttempts",
  latestResult: "tamilQuizLatestResult",
  quizSession: "tamilQuizSession",
  usedQuestions: "tamilQuizUsedQuestions"
};

const state = {
  currentPage: document.body.dataset.page || "home",
  selectedSubject: "all",
  questionCount: 25,
  questions: [],
  currentIndex: 0,
  answers: {},
  reviewMarks: new Set(),
  startTime: null,
  timerInterval: null,
  resultData: null
};

function init() {
  applyTheme(readTheme());
  bindThemeToggle();
  restoreQuizSession();
  populateHomePage();
  populateResultsPage();
  bindQuizPage();
  bindHomePage();
}

function bindThemeToggle() {
  document.querySelectorAll("#themeToggle").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
      applyTheme(nextTheme);
      persistTheme(nextTheme);
    });
  });
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  document.querySelectorAll("#themeToggle").forEach((button) => {
    button.textContent = theme === "dark" ? "☀️ வெளிச்சம்" : "🌙 இரவில் பார்க்க";
  });
}

function readTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || "light";
}

function persistTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function populateHomePage() {
  renderQuestionPreview();
  renderAttempts();
}

function bindHomePage() {
  const page = state.currentPage;
  if (page !== "home") return;

  populateSubjectDropdown();
  
  const form = document.getElementById("quizSetupForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const subjectValue = document.getElementById("subjectSelect").value;
    const countValue = Number(document.getElementById("questionCountSelect").value);
    const shuffleQuestions = document.getElementById("shuffleQuestions").checked;
    const shuffleOptions = document.getElementById("shuffleOptions").checked;

    const filtered = getFilteredQuestions(subjectValue);
    const selected = pickQuestionsForSession(filtered, countValue, subjectValue);
    const finalQuestions = shuffleQuestions ? shuffleArray(selected) : selected;
    const preparedQuestions = finalQuestions.map((question) => ({
      ...question,
      options: shuffleOptions ? shuffleArray([...question.options]) : [...question.options]
    }));

    state.selectedSubject = subjectValue;
    state.questionCount = countValue;
    state.questions = preparedQuestions;
    state.answers = {};
    state.reviewMarks = new Set();
    state.currentIndex = 0;
    state.startTime = Date.now();
    persistQuizSession();
    window.location.href = "quiz.html";
  });

  const searchInput = document.getElementById("searchQuestions");
  const filterSubject = document.getElementById("filterSubject");

  [searchInput, filterSubject].forEach((element) => {
    element.addEventListener("input", renderQuestionPreview);
  });

  populateHomePage();
}

function bindQuizPage() {
  const page = state.currentPage;
  if (page !== "quiz") return;

  const quizMeta = document.getElementById("quizMeta");
  const questionCounter = document.getElementById("questionCounter");
  const questionText = document.getElementById("questionText");
  const optionsContainer = document.getElementById("optionsContainer");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const saveBtn = document.getElementById("saveBtn");
  const markReviewBtn = document.getElementById("markReviewBtn");
  const submitBtn = document.getElementById("submitBtn");
  const reviewToggle = document.getElementById("reviewToggle");
  const reviewPanel = document.getElementById("reviewPanel");
  const reviewSummary = document.getElementById("reviewSummary");
  const progressBar = document.getElementById("progressBar");
  const timerDisplay = document.getElementById("timerDisplay");
  const fullscreenToggle = document.getElementById("fullscreenToggle");

  if (!state.questions.length) {
    const restored = restoreQuizSession();
    if (!restored) {
      window.location.href = "index.html";
      return;
    }
  }

  if (!state.questions.length) {
    window.location.href = "index.html";
    return;
  }

  const subjectLabel = state.selectedSubject === "all" ? "அனைத்து பாடங்கள்" : state.selectedSubject;
  quizMeta.textContent = `${subjectLabel} • ${state.questionCount} வினாக்கள்`;

  const startTimer = () => {
    state.timerInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      timerDisplay.textContent = formatTime(elapsed);
    }, 1000);
  };

  fullscreenToggle.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  reviewToggle.addEventListener("click", () => {
    reviewPanel.classList.toggle("hidden");
    renderReviewSummary(reviewSummary);
  });

  const renderQuestion = () => {
    const currentQuestion = state.questions[state.currentIndex];
    if (!currentQuestion) return;

    questionCounter.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    questionText.textContent = currentQuestion.question;
    document.getElementById("questionNumber").textContent = `வினா ${state.currentIndex + 1}`;
    progressBar.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;

    optionsContainer.innerHTML = "";
    currentQuestion.options.forEach((option, index) => {
      const optionLabel = document.createElement("label");
      optionLabel.className = "option-item";
      const isChecked = state.answers[state.currentIndex] === index;
      optionLabel.innerHTML = `
        <input type="radio" name="answer" value="${index}" ${isChecked ? "checked" : ""} />
        <span>${option}</span>
      `;
      optionLabel.querySelector("input").addEventListener("change", () => {
        state.answers[state.currentIndex] = index;
        persistQuizSession();
        renderReviewSummary(reviewSummary);
      });
      optionsContainer.appendChild(optionLabel);
    });

    saveBtn.textContent = state.answers[state.currentIndex] !== undefined ? "பதிலை மாற்று" : "பதிலைச் சேமி";
    markReviewBtn.textContent = state.reviewMarks.has(state.currentIndex) ? "மறுபார்வை நீக்கு" : "மறுபார்வைக்கு குறி";
    prevBtn.disabled = state.currentIndex === 0;
    nextBtn.disabled = state.currentIndex === state.questions.length - 1;
  };

  prevBtn.addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      persistQuizSession();
      renderQuestion();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      persistQuizSession();
      renderQuestion();
    }
  });

  saveBtn.addEventListener("click", () => {
    const selectedValue = state.answers[state.currentIndex];
    if (selectedValue === undefined) {
      alert("முதலில் ஒரு விடையைத் தேர்ந்தெடுக்கவும்.");
      return;
    }
    persistQuizSession();
    alert("பதில் சேமிக்கப்பட்டது.");
    renderQuestion();
  });

  markReviewBtn.addEventListener("click", () => {
    if (state.reviewMarks.has(state.currentIndex)) {
      state.reviewMarks.delete(state.currentIndex);
    } else {
      state.reviewMarks.add(state.currentIndex);
    }
    persistQuizSession();
    renderQuestion();
    renderReviewSummary(reviewSummary);
  });

  submitBtn.addEventListener("click", () => {
    const confirmation = confirm("தேர்வை சமர்ப்பிக்க வேண்டுமா?");
    if (!confirmation) return;
    finalizeQuiz();
  });

  startTimer();
  renderQuestion();
  renderReviewSummary(reviewSummary);
}

function renderReviewSummary(container) {
  if (!container) return;
  const items = state.questions.map((question, index) => {
    const answer = state.answers[index];
    const marker = state.reviewMarks.has(index) ? "⭐" : "•";
    return `<div class="review-item"><strong>${marker} ${question.question}</strong><p>${answer !== undefined ? `பதில்: ${question.options[answer]}` : "பதில் இல்லை"}</p></div>`;
  });
  container.innerHTML = items.join("");
}

function finalizeQuiz() {
  clearInterval(state.timerInterval);
  const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  const totalQuestions = state.questions.length;
  const correct = state.questions.reduce((acc, question, index) => {
    return acc + (state.answers[index] === question.answer ? 1 : 0);
  }, 0);
  const wrong = totalQuestions - correct - skippedCount();
  const skipped = skippedCount();
  const percentage = Math.round((correct / totalQuestions) * 100);
  const grade = getGrade(percentage);
  const scoreText = `${correct} / ${totalQuestions}`;
  const subjectBreakdown = getSubjectBreakdown();
  const feedback = getFeedback(percentage, subjectBreakdown);
  const result = {
    totalQuestions,
    correct,
    wrong,
    skipped,
    scoreText,
    percentage,
    grade,
    timeTaken: formatTime(elapsedSeconds),
    feedback,
    subjectBreakdown,
    questions: state.questions,
    answers: state.answers,
    reviewMarks: Array.from(state.reviewMarks),
    startedAt: new Date().toISOString()
  };
  state.resultData = result;
  persistAttempt(result);
  localStorage.setItem(STORAGE_KEYS.latestResult, JSON.stringify(result));
  clearQuizSession();
  window.location.href = "result.html";
}

function skippedCount() {
  return state.questions.reduce((acc, question, index) => {
    return acc + (state.answers[index] === undefined ? 1 : 0);
  }, 0);
}

function getSubjectBreakdown() {
  const counts = {};
  state.questions.forEach((question, index) => {
    const subject = question.subject;
    if (!counts[subject]) {
      counts[subject] = { subject, total: 0, correct: 0 };
    }
    counts[subject].total += 1;
    if (state.answers[index] === question.answer) {
      counts[subject].correct += 1;
    }
  });
  return Object.values(counts).map((entry) => ({
    ...entry,
    percentage: Math.round((entry.correct / entry.total) * 100)
  }));
}

function getGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 50) return "C";
  return "D";
}

function getFeedback(percentage, subjectBreakdown) {
  if (percentage > 90) {
    return {
      title: "Excellent!",
      message: "You have an outstanding understanding of the syllabus. Keep practicing to maintain your performance.",
      topics: []
    };
  }
  if (percentage >= 70) {
    return {
      title: "Very Good!",
      message: "You performed well. Revise Science and Nature lessons for even better results.",
      topics: subjectBreakdown.filter((entry) => entry.percentage < 70).map((entry) => entry.subject)
    };
  }
  return {
    title: "Needs Improvement.",
    message: "Focus on the topics below and practice more mock tests.",
    topics: subjectBreakdown.filter((entry) => entry.percentage < 70).map((entry) => entry.subject)
  };
}

function populateResultsPage() {
  const page = state.currentPage;
  if (page !== "result") return;

  const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.latestResult) || "null");
  if (!result) return;

  document.getElementById("totalQuestions").textContent = result.totalQuestions;
  document.getElementById("correctCount").textContent = result.correct;
  document.getElementById("wrongCount").textContent = result.wrong;
  document.getElementById("skippedCount").textContent = result.skipped;
  document.getElementById("scoreText").textContent = result.scoreText;
  document.getElementById("percentageText").textContent = `${result.percentage}%`;
  document.getElementById("gradeText").textContent = result.grade;
  document.getElementById("timeText").textContent = result.timeTaken;

  document.getElementById("feedbackText").innerHTML = `<strong>${result.feedback.title}</strong><br>${result.feedback.message}`;

  const topicScores = document.getElementById("topicScores");
  topicScores.innerHTML = result.subjectBreakdown.map((entry) => `
    <div class="topic-item">
      <strong>${entry.subject}</strong>
      <span>${entry.correct} / ${entry.total} • ${"⭐".repeat(Math.max(1, Math.round(entry.percentage / 20)))}</span>
    </div>
  `).join("");

  const reviewList = document.getElementById("reviewList");
  reviewList.innerHTML = result.questions.map((question, index) => {
    const selectedIndex = result.answers[index];
    const isCorrect = selectedIndex === question.answer;
    const selectedText = selectedIndex !== undefined ? question.options[selectedIndex] : "பதில் இல்லை";
    const correctText = question.options[question.answer];
    return `
      <div class="review-item ${isCorrect ? "correct-answer" : "wrong-answer"}">
        <strong>${index + 1}. ${question.question}</strong>
        <p>🔴 உங்கள் பதில்: ${selectedText}</p>
        <p>🟢 சரியான பதில்: ${correctText}</p>
        <p>விளக்கம்: ${question.explanation}</p>
      </div>
    `;
  }).join("");

  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("pdfBtn").addEventListener("click", () => window.print());
  document.getElementById("restartBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

function getUniqueSubjects() {
  const subjects = [...new Set(questionBank.map((question) => question.subject))];
  return subjects.sort();
}

function populateSubjectDropdown() {
  const subjectSelect = document.getElementById("subjectSelect");
  const filterSubject = document.getElementById("filterSubject");
  const uniqueSubjects = getUniqueSubjects();
  
  const populateSelect = (selectElement) => {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    while (selectElement.options.length > 1) {
      selectElement.remove(1);
    }
    uniqueSubjects.forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      selectElement.appendChild(option);
    });
    if (currentValue && Array.from(selectElement.options).some(o => o.value === currentValue)) {
      selectElement.value = currentValue;
    }
  };
  
  populateSelect(subjectSelect);
  populateSelect(filterSubject);
}

function renderQuestionPreview() {
  const container = document.getElementById("questionPreview");
  if (!container) return;
  const searchValue = document.getElementById("searchQuestions").value.trim().toLowerCase();
  const subjectValue = document.getElementById("filterSubject").value;
  const filtered = getFilteredQuestions(subjectValue);
  const matches = filtered.filter((question) => question.question.toLowerCase().includes(searchValue));
  container.innerHTML = matches.slice(0, 15).map((question) => `
    <div class="preview-item">
      <strong>${question.subject}</strong>
      <p>${question.question}</p>
    </div>
  `).join("");
}

function getFilteredQuestions(subjectValue) {
  return questionBank.filter((question) => {
    return subjectValue === "all" || question.subject === subjectValue;
  });
}

function pickQuestionsForSession(filteredQuestions, countValue, subjectValue) {
  const subjects = subjectValue === "all"
    ? [...new Set(filteredQuestions.map((question) => question.subject))]
    : [subjectValue];

  if (!subjects.length) {
    return [];
  }

  const availableQuestions = [];
  subjects.forEach((subject) => {
    const pool = filteredQuestions.filter((question) => question.subject === subject);
    if (!pool.length) {
      return;
    }

    const usedQuestions = readUsedQuestions();
    const unusedQuestions = pool.filter((question) => !isQuestionUsed(question, usedQuestions));

    if (!unusedQuestions.length) {
      resetUsedQuestionsForSubject(subject);
      availableQuestions.push(...pool);
      return;
    }

    availableQuestions.push(...unusedQuestions);
  });

  const selected = availableQuestions.slice(0, countValue);
  selected.forEach((question) => {
    markQuestionAsUsed(question.id, question.subject);
  });
  return selected;
}

function isQuestionUsed(question, usedQuestions) {
  const used = usedQuestions[question.subject] || [];
  return used.includes(question.id);
}

function markQuestionAsUsed(questionId, subject) {
  const usedQuestions = readUsedQuestions();
  const used = usedQuestions[subject] || [];
  if (!used.includes(questionId)) {
    usedQuestions[subject] = [...used, questionId];
    localStorage.setItem(STORAGE_KEYS.usedQuestions, JSON.stringify(usedQuestions));
  }
}

function resetUsedQuestionsForSubject(subject) {
  const usedQuestions = readUsedQuestions();
  delete usedQuestions[subject];
  localStorage.setItem(STORAGE_KEYS.usedQuestions, JSON.stringify(usedQuestions));
}

function readUsedQuestions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.usedQuestions) || "{}");
  } catch (error) {
    return {};
  }
}

function persistQuizSession() {
  const session = {
    selectedSubject: state.selectedSubject,
    questionCount: state.questionCount,
    questions: state.questions,
    currentIndex: state.currentIndex,
    answers: state.answers,
    reviewMarks: Array.from(state.reviewMarks),
    startTime: state.startTime
  };
  localStorage.setItem(STORAGE_KEYS.quizSession, JSON.stringify(session));
}

function restoreQuizSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.quizSession) || "null");
    if (!session) return false;
    state.selectedSubject = session.selectedSubject || state.selectedSubject;
    state.questionCount = session.questionCount || state.questionCount;
    state.questions = session.questions || [];
    state.currentIndex = session.currentIndex || 0;
    state.answers = session.answers || {};
    state.reviewMarks = new Set(session.reviewMarks || []);
    state.startTime = session.startTime || Date.now();
    return Boolean(state.questions.length);
  } catch (error) {
    return false;
  }
}

function clearQuizSession() {
  localStorage.removeItem(STORAGE_KEYS.quizSession);
}

function renderAttempts() {
  const container = document.getElementById("attemptHistory");
  const summary = document.getElementById("statsSummary");
  if (!container || !summary) return;
  const attempts = readAttempts();
  const best = attempts.reduce((acc, item) => (item.percentage > acc.percentage ? item : acc), { percentage: 0 });
  summary.innerHTML = `
    <span class="pill">சிறந்த மதிப்பெண்: ${best.percentage || 0}%</span>
    <span class="pill">மொத்த முயற்சிகள்: ${attempts.length}</span>
  `;
  container.innerHTML = attempts.slice(0, 6).map((attempt) => `
    <div class="attempt-item">
      <strong>${attempt.correct} / ${attempt.totalQuestions} • ${attempt.grade}</strong>
      <p>${attempt.startedAt ? new Date(attempt.startedAt).toLocaleString("ta-IN") : ""}</p>
    </div>
  `).join("");
}

function persistAttempt(result) {
  const attempts = readAttempts();
  attempts.push({
    correct: result.correct,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    grade: result.grade,
    startedAt: result.startedAt
  });
  localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(attempts));
}

function readAttempts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts) || "[]");
  } catch (error) {
    return [];
  }
}

function exportToCsv(result) {
  const rows = [
    ["Question", "Your Answer", "Correct Answer", "Explanation"],
    ...result.questions.map((question, index) => {
      const selectedIndex = result.answers[index];
      const selectedText = selectedIndex !== undefined ? question.options[selectedIndex] : "No answer";
      const correctText = question.options[question.answer];
      return [question.question, selectedText, correctText, question.explanation];
    })
  ];
  const csvContent = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tamil-quiz-results.csv";
  link.click();
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function formatTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

init();
