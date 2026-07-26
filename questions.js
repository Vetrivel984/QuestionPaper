let questionBank = [];
let questionsLoaded = false;
const questionLoadCallbacks = [];

function onQuestionBankReady(callback) {
  if (questionsLoaded) {
    callback();
    return;
  }
  questionLoadCallbacks.push(callback);
}

function loadQuestionBank() {
  fetch("questions.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load questions.json: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      questionBank = data;
      questionsLoaded = true;
      questionLoadCallbacks.forEach((callback) => callback());
    })
    .catch((error) => {
      console.error("Failed to load questions.json", error);
      questionsLoaded = true;
      questionLoadCallbacks.forEach((callback) => callback());
    });
}

loadQuestionBank();
