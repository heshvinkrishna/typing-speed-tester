"use strict";

const DURATION = 60; // seconds
const QUOTES = [
  "The best way to learn the DOM is to build small things and break them on purpose.",
  "A good programmer reads the error message slowly before changing a single line.",
  "Every element on a web page is a node, and every node can be found, changed or removed.",
  "Practice does not make perfect, but careful practice makes steady progress.",
  "Events let a page listen to the person using it and respond at the right moment.",
  "Clean code is written for the next reader, who is often you in six months.",
  "Small steps repeated every day will take you further than a single giant leap.",
  "Make it work first, make it clear second, and only then make it fast.",
  "Curiosity is the habit of asking how something works and then opening it up to see.",
  "A calm mind types faster than a rushed one, so keep your hands relaxed."
];

const $ = (id) => document.getElementById(id);
const els = {
  time: $("time"), timeCard: $("timeCard"), mistakes: $("mistakes"),
  wpm: $("wpm"), accuracy: $("accuracy"), quote: $("quote"),
  input: $("input"), typing: $("typing"), hint: $("hint"), restart: $("restart")
};

let chars = [];          // one <span> per letter of the quote
let timerId = null;      // setInterval handle (null when no timer is running)
let startTime = null;    // set on the very first keypress
let endTime = null;
let running = false;
let finished = false;
let prevLen = 0;         // input length before the latest input event
let totalTyped = 0;      // every character entered, including ones later deleted
let mistakes = 0;        // every wrong character entered
let uncorrected = 0;     // wrong characters currently on screen

/* ---------- Step 1: split the quote into one span per letter ---------- */
function buildText() {
  const pool = [...QUOTES].sort(() => Math.random() - 0.5);
  return pool.slice(0, 6).join(" ");
}

function makeSpan(ch) {
  const span = document.createElement("span");
  span.className = "char";
  span.textContent = ch;
  return span;
}

function renderQuote(text) {
  els.quote.innerHTML = "";
  const words = text.split(" ");
  words.forEach((word, i) => {
    const wordEl = document.createElement("span");
    wordEl.className = "word";
    for (const ch of word) wordEl.appendChild(makeSpan(ch));
    els.quote.appendChild(wordEl);
    if (i < words.length - 1) els.quote.appendChild(makeSpan(" "));
  });
  chars = [...els.quote.querySelectorAll(".char")];
  chars[0].classList.add("current");
}

/* ---------- Step 2: audit the input against the spans ---------- */
function paint(value) {
  uncorrected = 0;
  chars.forEach((span, i) => {
    span.className = "char";
    if (i < value.length) {
      if (value[i] === span.textContent) {
        span.classList.add("correct");
      } else {
        span.classList.add("incorrect");
        uncorrected++;
      }
    } else if (i === value.length) {
      span.classList.add("current");
    }
  });
}

els.input.addEventListener("input", () => {
  if (finished) return;
  if (els.input.value.length > chars.length) {
    els.input.value = els.input.value.slice(0, chars.length);
  }
  const value = els.input.value;

  if (!running) startTimer(); // timer starts on the first keypress

  // Check only the newly added characters so deleting never erases a mistake.
  for (let i = prevLen; i < value.length; i++) {
    totalTyped++;
    if (value[i] !== chars[i].textContent) mistakes++;
  }
  prevLen = value.length;

  paint(value);
  updateStats();
  if (value.length === chars.length) finish("You finished the whole text.");
});

// Keep the test honest: no pasting or dropping text in.
["paste", "drop"].forEach((evt) =>
  els.input.addEventListener(evt, (e) => e.preventDefault())
);

/* ---------- Timer ---------- */
function startTimer() {
  clearInterval(timerId); // never allow two intervals at once
  running = true;
  startTime = Date.now();
  els.hint.textContent = "Go! Keep typing until the timer ends.";
  timerId = setInterval(tick, 200);
}

function tick() {
  const remaining = DURATION - (Date.now() - startTime) / 1000;
  if (remaining <= 0) {
    finish("Time is up.");
  } else {
    updateStats();
  }
}

function finish(message) {
  clearInterval(timerId);
  timerId = null;
  running = false;
  finished = true;
  endTime = Date.now();
  els.input.disabled = true;
  els.typing.classList.add("done");
  updateStats();
  els.hint.textContent = `${message} Select Restart to try again.`;
}

/* ---------- Step 3: telemetry math ---------- */
function updateStats() {
  const elapsedSec = startTime ? ((endTime || Date.now()) - startTime) / 1000 : 0;
  const remaining = Math.max(0, Math.ceil(DURATION - elapsedSec));

  // Clamp to at least 1 second so the first keystrokes don't spike the WPM.
  const minutes = Math.max(elapsedSec, 1) / 60;
  const typed = els.input.value.length;
  const netWpm = startTime
    ? Math.max(0, Math.round((typed / 5 - uncorrected) / minutes))
    : 0;
  const accuracy = totalTyped
    ? Math.round(((totalTyped - mistakes) / totalTyped) * 100)
    : 100;

  els.time.textContent = remaining;
  els.timeCard.classList.toggle("low", remaining <= 10 && !!startTime);
  els.mistakes.textContent = mistakes;
  els.wpm.textContent = netWpm;
  els.accuracy.textContent = accuracy + "%";
}

/* ---------- Restart ---------- */
function restart() {
  clearInterval(timerId); // clears any existing timer: no runaway intervals
  timerId = null;
  startTime = endTime = null;
  running = finished = false;
  prevLen = totalTyped = mistakes = uncorrected = 0;

  els.input.disabled = false;
  els.input.value = "";
  els.typing.classList.remove("done");
  els.hint.textContent =
    "Click the text and start typing. The 60-second timer begins on your first keypress.";

  renderQuote(buildText());
  updateStats();
  els.input.focus();
}

els.restart.addEventListener("click", restart);
restart();
