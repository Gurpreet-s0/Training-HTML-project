document.addEventListener('DOMContentLoaded', function () {
  var scoreKey = 'linuxHubMcqBestScore.v1';
  var get = function (id) { return document.getElementById(id); };
  var questions = [];
  var session = [];
  var answers = [];
  var current = 0;

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var pick = Math.floor(Math.random() * (i + 1));
      var temporary = copy[i]; copy[i] = copy[pick]; copy[pick] = temporary;
    }
    return copy;
  }
  function labelFor(source) {
    return source.replace('Introduction to ', '').replace('Getting Started with ', '').replace('Linux ', 'Linux ').replace(' & ', ' and ');
  }
  function updateBest() {
    var best = 0;
    try { best = Number(localStorage.getItem(scoreKey)) || 0; } catch (error) { /* Optional storage. */ }
    get('best-score').textContent = best + '%';
    get('best-score-detail').textContent = best ? 'Your strongest completed session.' : 'Complete a quiz to save a score.';
  }
  function saveBest(score) {
    try {
      var oldScore = Number(localStorage.getItem(scoreKey)) || 0;
      if (score > oldScore) localStorage.setItem(scoreKey, score);
    } catch (error) { /* Quiz remains usable without storage. */ }
    updateBest();
  }
  function populateTopics() {
    var names = Array.from(new Set(questions.map(function (question) { return question.source; }))).sort();
    names.forEach(function (name) {
      var option = document.createElement('option');
      option.value = name; option.textContent = name;
      get('topic-select').appendChild(option);
    });
  }
  function startSession() {
    var selectedTopic = get('topic-select').value;
    var pool = selectedTopic === 'all' ? questions : questions.filter(function (question) { return question.source === selectedTopic; });
    session = shuffle(pool).slice(0, Math.min(10, pool.length));
    answers = session.map(function () { return { selected: null, checked: false, correct: false, skipped: false }; });
    current = 0;
    get('session-topic').textContent = selectedTopic === 'all' ? 'All Linux topics' : labelFor(selectedTopic);
    get('question-count').textContent = session.length + ' questions selected';
    get('quiz-body').hidden = false;
    get('quiz-results').hidden = true;
    renderMap();
    renderQuestion();
  }
  function renderMap() {
    get('question-map').innerHTML = '';
    session.forEach(function (question, index) {
      var answer = answers[index];
      var state = answer.checked ? (answer.correct ? 'correct' : 'incorrect') : (answer.skipped ? 'skipped' : '');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-button ' + (index === current ? 'active ' : '') + state;
      button.textContent = String(index + 1).padStart(2, '0');
      button.setAttribute('aria-label', 'Go to question ' + (index + 1));
      button.addEventListener('click', function () { current = index; renderMap(); renderQuestion(); });
      var item = document.createElement('li'); item.appendChild(button);
      get('question-map').appendChild(item);
    });
  }
  function renderQuestion() {
    var question = session[current];
    if (!question) return;
    var answer = answers[current];
    get('source-label').textContent = labelFor(question.source).toUpperCase();
    get('quiz-position').textContent = 'QUESTION ' + (current + 1) + ' OF ' + session.length;
    get('question-number').textContent = String(current + 1).padStart(2, '0');
    get('question-text').textContent = question.question;
    var options = get('answer-options');
    options.innerHTML = '';
    question.options.forEach(function (option, index) {
      var button = document.createElement('button');
      var state = answer.selected === index ? 'selected' : '';
      if (answer.checked) state += index === question.correct_answer ? ' correct' : (answer.selected === index ? ' incorrect' : '');
      button.className = 'answer-option ' + state;
      button.type = 'button';
      button.disabled = answer.checked;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', answer.selected === index ? 'true' : 'false');
      button.innerHTML = '<span>' + String.fromCharCode(65 + index) + '</span><b></b>';
      button.querySelector('b').textContent = option;
      button.addEventListener('click', function () {
        answer.selected = index; answer.skipped = false;
        get('check-answer').disabled = false;
        renderMap(); renderQuestion();
      });
      options.appendChild(button);
    });
    var feedback = get('answer-feedback');
    if (answer.checked) {
      feedback.hidden = false;
      feedback.className = 'answer-feedback ' + (answer.correct ? 'is-correct' : 'is-incorrect');
      feedback.innerHTML = '<strong>' + (answer.correct ? 'Correct — nice work.' : 'Not quite.') + '</strong><p>' + question.explanation + '</p>';
    } else feedback.hidden = true;
    var check = get('check-answer');
    check.disabled = answer.selected === null;
    check.innerHTML = answer.checked ? (current === session.length - 1 ? 'View result <span>→</span>' : 'Next question <span>→</span>') : 'Check answer <span>→</span>';
    get('skip-question').textContent = current === session.length - 1 ? 'Finish quiz' : 'Skip for now';
  }
  function checkAnswer() {
    var answer = answers[current];
    if (answer.checked) { goNext(); return; }
    if (answer.selected === null) return;
    answer.checked = true;
    answer.correct = answer.selected === session[current].correct_answer;
    renderMap(); renderQuestion();
  }
  function goNext() {
    if (current < session.length - 1) { current += 1; renderMap(); renderQuestion(); }
    else showResults();
  }
  function skipQuestion() {
    if (current === session.length - 1) { showResults(); return; }
    if (!answers[current].checked) answers[current].skipped = true;
    current += 1; renderMap(); renderQuestion();
  }
  function showResults() {
    var completed = answers.filter(function (answer) { return answer.checked; });
    var correct = completed.filter(function (answer) { return answer.correct; }).length;
    var score = session.length ? Math.round(correct / session.length * 100) : 0;
    saveBest(score);
    get('quiz-body').hidden = true;
    var results = get('quiz-results');
    results.hidden = false;
    results.innerHTML = '<div class="result-mark">' + (score >= 70 ? '✦' : '↗') + '</div><p class="question-number">SESSION COMPLETE</p><h2>' + correct + ' out of ' + session.length + ' correct</h2><strong class="result-score">' + score + '%</strong><p>' + (score >= 70 ? 'Strong work. Keep sharpening your Linux instincts in the Practice Lab.' : 'Every answer is a chance to learn. Review the explanations, then try another session.') + '</p><div><button class="quiz-primary" id="new-session" type="button">New quiz session <span>→</span></button><a class="quiz-secondary result-lab-link" href="learning-hub.html">Open Practice Lab</a></div>';
    get('new-session').addEventListener('click', startSession);
  }
  function showLoadError() {
    get('question-text').textContent = 'The question bank could not be loaded.';
    get('answer-options').innerHTML = '<p class="quiz-load-error">Please make sure the supplied question bank is present, then reload this page.</p>';
  }
  get('topic-select').addEventListener('change', startSession);
  get('restart-quiz').addEventListener('click', startSession);
  get('check-answer').addEventListener('click', checkAnswer);
  get('skip-question').addEventListener('click', skipQuestion);
  updateBest();
  var items = window.LINUX_MCQ_QUESTIONS;
  if (!Array.isArray(items)) showLoadError();
  else {
    questions = items.filter(function (item) { return item && item.question && Array.isArray(item.options) && Number.isInteger(item.correct_answer); });
    populateTopics(); startSession();
  }
});
