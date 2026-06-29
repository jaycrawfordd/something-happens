const STORE_KEY = "jayLooksmaxTracker.v1";
const APP_NAME = "something happens";
const todayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const categories = [
  ["face_bloat", "Face bloat"],
  ["jawline", "Jawline sharpness"],
  ["eyebags", "Eyebags"],
  ["forehead_wrinkles", "Forehead wrinkles"],
  ["skin_quality", "Skin quality"],
  ["paleness_sun", "Paleness / sun exposure"],
  ["hair", "Hair quality / haircut freshness"],
  ["grooming", "Facial hair / grooming"],
  ["posture", "Posture"],
  ["teeth", "Teeth / retainer / orthodontist follow-up"],
  ["clothing_fit", "Clothing fit"],
  ["other", "Other"]
];

const categoryLabel = (key) => categories.find(([id]) => id === key)?.[1] || "Other";
const uid = () => Math.random().toString(36).slice(2, 10);
const defaultChecklistTemplates = [
  "Weigh in",
  "Train or active recovery",
  "Cardio / steps",
  "Skincare AM",
  "SPF",
  "Posture reset",
  "Grooming check",
  "Sleep on time"
];

const starterGoals = [
  {
    name: "Reduce face bloat",
    category: "face_bloat",
    currentStatus: "Tracking what makes mornings look puffy.",
    whyItMatters: "Leaner face, sharper baseline, fewer false alarms.",
    priority: "high",
    dailyActions: ["Weigh in", "Avoid obvious sodium bombs late at night", "Do cardio / steps", "Keep food normal instead of random junk", "Do not eat a huge meal right before bed"],
    weeklyActions: ["Check if weight trend is going down", "Notice which foods make face look puffier", "Adjust if face looks bloated multiple days in a row"],
    notes: "Face bloat is probably body fat, sodium, late food, sleep quality, and hydration. Do not panic over one bad morning. Track the trend."
  },
  {
    name: "Sharpen jawline",
    category: "jawline",
    currentStatus: "Tied mostly to body fat and posture.",
    whyItMatters: "This is one of the highest visual payoffs from cutting.",
    priority: "high",
    dailyActions: ["Hit weight-loss basics", "Train or stay active", "Keep posture clean", "Avoid looking down at phone all day", "Do not bulk up with random calories"],
    weeklyActions: ["Compare weight trend", "Check if face looks sharper at lower average weight", "Keep cutting slowly if weight is stalled"],
    notes: "Jawline improvement mostly comes from getting leaner. Do not rely on gimmicks."
  },
  {
    name: "Reduce eyebags",
    category: "eyebags",
    currentStatus: "Watch sleep, caffeine, and late scrolling.",
    whyItMatters: "Eyes drive first impression. Tired eyes make everything worse.",
    priority: "medium",
    dailyActions: ["Sleep on time", "Avoid caffeine too late", "Avoid huge late meals", "Keep skincare simple", "Do not stay up scrolling"],
    weeklyActions: ["Track if eyebags are worse after bad sleep", "Adjust caffeine cutoff if sleep quality sucks"],
    notes: "Eyebags may be sleep quality, genetics, dehydration, allergies, or late caffeine. Focus on controllables first."
  },
  {
    name: "Fix forehead lines",
    category: "forehead_wrinkles",
    currentStatus: "Prevent worsening and keep skin from looking dry.",
    whyItMatters: "Forehead lines are easier to slow down than reverse.",
    priority: "high",
    dailyActions: ["Apply SPF 30+ every morning", "Moisturize daily", "Avoid excessive forehead raising", "Keep skin hydrated", "Do skincare at night"],
    weeklyActions: ["Check if skin looks dry or irritated", "Consider adding retinoid later, slowly, if skin tolerates it", "Avoid overdoing products"],
    notes: "Sunscreen is non-negotiable for preventing lines from getting worse. Retinoids can help long term, but introduce carefully."
  },
  {
    name: "Improve skin quality",
    category: "skin_quality",
    currentStatus: "Simple routine, no product chaos.",
    whyItMatters: "Clearer skin makes everything else look cleaner.",
    priority: "medium",
    dailyActions: ["Cleanse face", "Moisturize", "SPF in the morning", "Do not pick skin", "Keep pillowcase clean", "Stay consistent"],
    weeklyActions: ["Change pillowcase", "Check for irritation or breakouts", "Keep routine simple"],
    notes: "Basic skincare matters more than buying 20 products. Consistency beats random overcomplicated routines."
  },
  {
    name: "Improve grooming",
    category: "grooming",
    currentStatus: "Easy points. Keep it tight.",
    whyItMatters: "Bad grooming makes good progress look sloppy.",
    priority: "medium",
    dailyActions: ["Check facial hair", "Shave or trim when needed", "Keep neckline clean", "Keep eyebrows/nose hair under control if needed"],
    weeklyActions: ["Do a full grooming check", "Trim facial hair before it looks lazy"],
    notes: "Grooming is easy points. No reason to look sloppy."
  },
  {
    name: "Improve posture",
    category: "posture",
    currentStatus: "Desk and phone posture need attention.",
    whyItMatters: "Posture affects how tall, lean, and confident you look.",
    priority: "medium",
    dailyActions: ["Keep shoulders back", "Do not hunch at desk", "Do posture reset during workday", "Avoid neck-forward phone posture"],
    weeklyActions: ["Stretch chest/hips", "Check posture in mirror", "Adjust desk/chair setup if needed"],
    notes: "Office work makes this easy to mess up. Reset before it becomes your default."
  }
];

const defaultState = () => {
  const now = new Date().toISOString();
  return {
    version: 2,
    settings: { userName: "Guest", theme: "dark", sidebarCollapsed: false, visualVersion: 1 },
    selectedDate: todayIso(),
    calendarMonth: todayIso().slice(0, 7),
    logs: {},
    checklist: {},
    checklistSkips: {},
    checklistTemplates: defaultChecklistTemplates.map((label) => ({ id: uid(), label, source: "default" })),
    goals: starterGoals.map((goal) => ({
      id: uid(),
      name: goal.name,
      priority: goal.priority,
      whyItMatters: goal.whyItMatters,
      actions: [...goal.dailyActions, ...goal.weeklyActions],
      resources: [],
      trackActionsDaily: false,
      progress: 0,
      progressHistory: [],
      createdAt: now,
      updatedAt: now
    }))
  };
};

let state = loadState();
let lastCsvImportMessage = "";
const openChecklistDates = new Set();
let goalBulkMode = false;
const selectedGoalIds = new Set();

function normalizeGoal(goal) {
  const actions = Array.isArray(goal.actions) && goal.actions.length
    ? goal.actions
    : [...(goal.dailyActions || []), ...(goal.weeklyActions || [])];
  const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0));
  return {
    ...goal,
    name: goal.name || "Untitled goal",
    priority: ["high", "medium", "low"].includes(goal.priority) ? goal.priority : "medium",
    whyItMatters: goal.whyItMatters || "",
    actions: [...new Set(actions.map((action) => String(action).trim()).filter(Boolean))],
    resources: Array.isArray(goal.resources) ? goal.resources.map(normalizeResourceUrl).filter(Boolean) : [],
    trackActionsDaily: Boolean(goal.trackActionsDaily),
    progress,
    progressHistory: Array.isArray(goal.progressHistory) ? goal.progressHistory : []
  };
}

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) return defaultState();
  try {
    const parsed = JSON.parse(saved);
    const fresh = defaultState();
    const migrated = { ...fresh, ...parsed };
    migrated.settings = { ...fresh.settings, ...(parsed.settings || {}) };
    if (!parsed.settings?.visualVersion) {
      migrated.settings.theme = "dark";
      migrated.settings.visualVersion = 1;
    }
    if (!parsed.checklistTemplates || parsed.version !== 2) {
      migrated.checklistTemplates = fresh.checklistTemplates;
      migrated.checklist = {};
      migrated.version = 2;
    }
    migrated.goals = (Array.isArray(parsed.goals) ? parsed.goals : fresh.goals).map(normalizeGoal);
    if (!migrated.settings.userName) migrated.settings.userName = "Guest";
    if (!["light", "dark"].includes(migrated.settings.theme)) migrated.settings.theme = "dark";
    return migrated;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme || "dark";
  document.documentElement.style.colorScheme = state.settings.theme || "dark";
  document.body.classList.remove("sidebar-collapsed");
}

function updateLogNavState() {
  const logButton = document.querySelector('[data-view="log"]');
  if (!logButton) return;
  const loggedToday = Boolean(state.logs[todayIso()]?.dailyLogged);
  logButton.classList.toggle("is-pending", !loggedToday);
  logButton.title = loggedToday ? "Today is logged" : "Today still needs a log";
}

function checklistFor(date) {
  const existingRaw = state.checklist[date];
  const existing = Array.isArray(existingRaw) ? existingRaw : Object.values(existingRaw || {});
  const byTemplate = new Map(existing.filter((item) => item.templateId).map((item) => [item.templateId, item]));
  const custom = existing.filter((item) => !item.templateId);
  const skipped = new Set(state.checklistSkips?.[date] || []);
  const generated = state.checklistTemplates
    .filter((template) => !skipped.has(template.id))
    .map((template) => ({
      id: `${date}:${template.id}`,
      templateId: template.id,
      goalId: template.goalId,
      date,
      label: template.label,
      completed: byTemplate.get(template.id)?.completed || false
    }));
  state.checklist[date] = [...generated, ...custom];
  saveState();
  return state.checklist[date];
}

function logFor(date) {
  return state.logs[date] || { id: date, date, didLift: false, notes: "" };
}

function upsertLog(date, log) {
  state.logs[date] = { ...logFor(date), ...log, id: date, date };
  saveState();
  render();
}

function setView(viewName) {
  if (viewName === "log") state.selectedDate = todayIso();
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === viewName));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === viewName));
  document.getElementById("viewTitle").textContent = {
    dashboard: "Dashboard",
    calendar: "Calendar",
    log: "Log Today",
    goals: "Goals",
    weight: "Weight Progress",
    settings: "Settings"
  }[viewName];
  render();
  window.scrollTo(0, 0);
}

function render() {
  applyTheme();
  updateLogNavState();
  document.getElementById("sidebarDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  renderDashboard();
  renderCalendar();
  renderLog();
  renderGoals();
  renderWeight();
  renderSettings();
}

function weightEntries() {
  return Object.values(state.logs)
    .filter((log) => Number.isFinite(Number(log.weight)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sevenDayAverage() {
  const start = parseLocalDate(todayIso());
  start.setDate(start.getDate() - 6);
  const entries = weightEntries().filter((log) => parseLocalDate(log.date) >= start);
  if (!entries.length) return null;
  return entries.reduce((sum, log) => sum + Number(log.weight), 0) / entries.length;
}

function parseLocalDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function dailyNotesPrompt(date) {
  const prompts = [
    "What's your thoughts on your lift?",
    "New PR?",
    "How was cardio?",
    "What felt strong today?",
    "Anything worth remembering?"
  ];
  const index = Math.floor(parseLocalDate(date).getTime() / 86400000) % prompts.length;
  return prompts[index];
}

function scoreBadge(score, prefix) {
  if (!score) return "";
  const cls = score >= 8 ? "good" : score >= 5 ? "warn" : "bad";
  return `<span class="badge ${cls}">${prefix} ${score}</span>`;
}

function renderDashboard() {
  const entries = weightEntries();
  const weekly = weeklyChecklistProgress();
  document.getElementById("dashboard").innerHTML = `
    <div class="grid">
      <div class="panel progress-panel span-8">
        <div>
          <h3>Scale trend</h3>
        </div>
        <canvas id="dashboardWeightCanvas" width="900" height="340"></canvas>
      </div>
      <div class="panel progress-panel span-4">
        <div>
          <h3>Checklist done</h3>
        </div>
        <canvas id="dashboardGoalsCanvas" width="520" height="340"></canvas>
      </div>
    </div>
  `;
  drawLineChart("dashboardWeightCanvas", entries, {
    empty: "Log weights to draw the line.",
    yLabel: "Weight",
    value: (entry) => Number(entry.weight),
    label: (entry) => entry.date,
    accentVar: "--accent"
  });
  drawBarChart("dashboardGoalsCanvas", weekly, {
    empty: "Check off items to build the bars.",
    value: (entry) => entry.done,
    label: (entry) => entry.label
  });
}

function renderChecklist(date, checks, options = {}) {
  const editable = options.editable !== false;
  const list = checks.length ? `
    <div class="check-list">${checks.map((item) => `
      <div class="check-row ${item.completed ? "is-complete" : ""}">
        <label>
          <input type="checkbox" data-check-id="${item.id}" ${item.completed ? "checked" : ""}>
          <span class="check-content">
            <span>${escapeHtml(item.label)}</span>
            ${item.goalId ? `<small>${escapeHtml(state.goals.find((goal) => goal.id === item.goalId)?.name || "Goal")}</small>` : ""}
          </span>
        </label>
        ${editable ? `<button class="mini-btn" data-remove-check="${item.id}" aria-label="Remove ${escapeHtml(item.label)}">Remove</button>` : ""}
      </div>
    `).join("")}</div>
  ` : `<p class="muted">Nothing on the list. Add only what matters today.</p>`;
  const addForm = editable ? `
    <form class="inline-add" data-add-check-form>
      <input placeholder="Add item for this day">
      <button class="ghost-btn">Add</button>
    </form>
  ` : "";
  return `${list}${addForm}`;
}

function renderTemplateManager() {
  if (!state.checklistTemplates.length) return `<p class="muted">No default checklist items. Add a few that deserve daily attention.</p>`;
  return `<div class="check-list">${state.checklistTemplates.map((item) => `
    <div class="check-row">
      <span>${escapeHtml(item.label)}</span>
      <button class="mini-btn" data-remove-template="${item.id}">Remove</button>
    </div>
  `).join("")}</div>`;
}

function checklistArray(date) {
  const raw = state.checklist[date];
  return Array.isArray(raw) ? raw : Object.values(raw || {});
}

function addChecklistItemForDate(date, label) {
  state.checklist[date] = checklistArray(date);
  state.checklist[date].push({
    id: `${date}:custom:${uid()}`,
    date,
    label,
    completed: false
  });
  saveState();
}

function addChecklistTemplate(label, goalId) {
  const key = label.trim().toLowerCase();
  if (!key) return;
  const exists = state.checklistTemplates.some((template) => template.label.trim().toLowerCase() === key);
  if (exists) return;
  state.checklistTemplates.push({ id: uid(), label: label.trim(), goalId, source: goalId ? "goal" : "custom" });
  Object.keys(state.checklist).forEach((date) => {
    state.checklist[date] = checklistArray(date).filter((item) => !item.templateId || state.checklistTemplates.some((template) => template.id === item.templateId));
  });
  saveState();
}

function bindViewJumps(root = document) {
  root.querySelectorAll("[data-view-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.viewJump === "log") state.selectedDate = todayIso();
      setView(btn.dataset.viewJump);
    });
  });
}

function openLogForDate(date) {
  state.selectedDate = date;
  saveState();
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === "log"));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === "log"));
  document.getElementById("viewTitle").textContent = "Log Today";
  render();
  window.scrollTo(0, 0);
}

function bindChecklist(root, date) {
  root.querySelectorAll("[data-check-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const item = state.checklist[date].find((check) => check.id === input.dataset.checkId);
      if (item) item.completed = input.checked;
      saveState();
      render();
    });
  });
  root.querySelectorAll("[data-remove-check]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.removeCheck;
      const item = state.checklist[date].find((check) => check.id === id);
      if (item?.templateId) {
        state.checklistSkips ||= {};
        state.checklistSkips[date] ||= [];
        if (!state.checklistSkips[date].includes(item.templateId)) state.checklistSkips[date].push(item.templateId);
        state.checklist[date] = checklistArray(date).filter((check) => check.templateId !== item.templateId);
      } else {
        state.checklist[date] = checklistArray(date).filter((check) => check.id !== id);
      }
      saveState();
      render();
    });
  });
  root.querySelectorAll("[data-add-check-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input");
      const label = input.value.trim();
      if (!label) return;
      addChecklistItemForDate(date, label);
      input.value = "";
      render();
    });
  });
}

function renderLog() {
  const date = state.selectedDate || todayIso();
  const log = logFor(date);
  const logViewIsActive = document.getElementById("log").classList.contains("is-active");
  const checks = logViewIsActive ? checklistFor(date) : checklistArray(date);
  const liftValue = log.dailyLogged ? log.didLift : null;
  document.getElementById("log").innerHTML = `
    <div class="grid">
      <form class="panel log-form span-8" id="dailyLogForm">
        <div class="row" style="justify-content: space-between;">
          <div>
            <p class="eyebrow">Fast daily log</p>
            <h3>${date === todayIso() ? "Today" : "Edit day"}</h3>
          </div>
          <label class="compact-date">Date<input type="date" id="logDate" value="${date}"></label>
        </div>
        <label>Weight<input type="number" step="0.1" id="weightInput" value="${log.weight ?? ""}" placeholder="185.4"></label>
        <label>Did lift?</label>
        <div class="lift-switch ${liftValue === true ? "is-yes" : liftValue === false ? "is-no" : ""}" id="didLiftToggle" role="radiogroup" aria-label="Did lift" tabindex="0">
          <span class="lift-thumb" aria-hidden="true"></span>
          <button type="button" data-lift="true" role="radio" aria-checked="${liftValue === true}">Yes</button>
          <button type="button" data-lift="false" role="radio" aria-checked="${liftValue === false}">No</button>
        </div>
        <div class="form-grid">
          <label>Lift score<input type="number" min="1" max="10" id="liftInput" value="${log.liftScore ?? ""}" placeholder="1-10"></label>
          <label>Cardio score<input type="number" min="1" max="10" id="cardioInput" value="${log.cardioScore ?? ""}" placeholder="1-10"></label>
        </div>
        <label>Notes<textarea id="notesInput" rows="5" placeholder="${escapeHtml(dailyNotesPrompt(date))}">${escapeHtml(log.notes || "")}</textarea></label>
        <details class="checklist-disclosure" ${openChecklistDates.has(date) ? "open" : ""}>
          <summary>
            <span>Today's checklist</span>
            <span class="checklist-count">${checks.filter((item) => item.completed).length}/${checks.length}</span>
          </summary>
          <div class="checklist-drawer">
            <p class="muted">Only open this when you need it.</p>
            ${renderChecklist(date, checks, { editable: true })}
          </div>
        </details>
        <div class="log-actions"><button class="primary-btn log-save">Save Log</button></div>
      </form>
    </div>
  `;
  bindLogForm(date, log);
  bindChecklist(document.getElementById("log"), date);
  document.querySelector("#log .checklist-disclosure").addEventListener("toggle", (event) => {
    if (event.target.open) openChecklistDates.add(date);
    else openChecklistDates.delete(date);
  });
}

function bindLogForm(date, log) {
  const form = document.getElementById("dailyLogForm");
  const liftSwitch = document.getElementById("didLiftToggle");
  let didLift = log.dailyLogged ? (log.didLift === true ? true : log.didLift === false ? false : null) : null;
  let draggingLift = false;
  const setLift = (value) => {
    didLift = value;
    liftSwitch.classList.toggle("is-yes", value === true);
    liftSwitch.classList.toggle("is-no", value === false);
    liftSwitch.querySelectorAll("[data-lift]").forEach((item) => {
      item.setAttribute("aria-checked", String(item.dataset.lift === String(value)));
    });
  };
  const setLiftFromPointer = (event) => {
    const rect = liftSwitch.getBoundingClientRect();
    setLift(event.clientX < rect.left + rect.width / 2);
  };
  document.getElementById("logDate").addEventListener("change", (event) => {
    state.selectedDate = event.target.value;
    saveState();
    render();
  });
  document.querySelectorAll("[data-lift]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLift(btn.dataset.lift === "true");
    });
  });
  liftSwitch.addEventListener("pointerdown", (event) => {
    draggingLift = true;
    liftSwitch.setPointerCapture(event.pointerId);
    setLiftFromPointer(event);
  });
  liftSwitch.addEventListener("pointermove", (event) => {
    if (draggingLift) setLiftFromPointer(event);
  });
  liftSwitch.addEventListener("pointerup", (event) => {
    draggingLift = false;
    setLiftFromPointer(event);
  });
  liftSwitch.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") setLift(true);
    if (event.key === "ArrowRight") setLift(false);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    upsertLog(date, {
      weight: numberOrUndefined(document.getElementById("weightInput").value),
      didLift,
      liftScore: numberOrUndefined(document.getElementById("liftInput").value),
      cardioScore: numberOrUndefined(document.getElementById("cardioInput").value),
      notes: document.getElementById("notesInput").value.trim(),
      dailyLogged: true,
      loggedAt: new Date().toISOString()
    });
    setView("dashboard");
  });
}

function renderCalendar() {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const blanks = first.getDay();
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells = [];
  for (let i = 0; i < blanks; i += 1) cells.push(`<div class="day-cell is-empty"></div>`);
  for (let day = 1; day <= days; day += 1) {
    const date = `${state.calendarMonth}-${String(day).padStart(2, "0")}`;
    const log = logFor(date);
    const score = Number(log.liftScore);
    const cls = score >= 8 ? "lift-good" : score >= 5 ? "lift-mid" : score >= 1 ? "lift-bad" : "lift-none";
    const checks = checklistArray(date);
    const done = checks.length && checks.every((item) => item.completed);
    cells.push(`
      <button class="day-cell ${cls}" data-date="${date}">
        <span class="day-num">${day}</span>
        <span class="day-data">
          ${log.weight ? `<span class="badge">${log.weight} lb</span>` : ""}
          ${scoreBadge(log.liftScore, "L")}
          ${log.cardioScore ? scoreBadge(log.cardioScore, "C") : ""}
          ${done ? `<span class="badge good">Done</span>` : ""}
        </span>
      </button>
    `);
  }
  document.getElementById("calendar").innerHTML = `
    <div class="panel">
      <div class="calendar-head">
        <div>
          <h3>${monthLabel}</h3>
        </div>
        <div class="month-tools">
          <button class="ghost-btn" id="prevMonth">Prev</button>
          <input type="month" id="monthInput" value="${state.calendarMonth}">
          <button class="ghost-btn" id="nextMonth">Next</button>
        </div>
      </div>
      <div class="calendar-wrap">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="weekday">${day}</div>`).join("")}
        ${cells.join("")}
      </div>
    </div>
  `;
  document.getElementById("monthInput").addEventListener("change", (event) => {
    state.calendarMonth = event.target.value;
    saveState();
    renderCalendar();
  });
  document.getElementById("prevMonth").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => shiftMonth(1));
  document.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedDate = btn.dataset.date;
      saveState();
      openLogForDate(btn.dataset.date);
    });
  });
}

function shiftMonth(delta) {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  state.calendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  saveState();
  renderCalendar();
}

function renderGoals() {
  const query = document.getElementById("goalSearch")?.value?.toLowerCase() || "";
  let goals = [...state.goals].sort(prioritySort);
  if (query) goals = goals.filter((goal) => [goal.name, goal.whyItMatters, ...(goal.actions || [])].join(" ").toLowerCase().includes(query));
  document.getElementById("goals").innerHTML = `
    <div class="goal-toolbar">
      <input id="goalSearch" placeholder="Search goals" value="${escapeHtml(query)}">
      <div class="goal-toolbar-actions">
        <button class="ghost-btn" id="goalActionsBtn">${goalBulkMode ? "Done" : "Actions"}</button>
        <button class="primary-btn" id="addGoalBtn">Add Goal</button>
      </div>
    </div>
    ${goalBulkMode ? `
      <div class="bulk-actions">
        <span><strong>${selectedGoalIds.size}</strong> selected</span>
        <button class="danger-btn" id="deleteSelectedGoals" ${selectedGoalIds.size ? "" : "disabled"}>Delete selected</button>
      </div>
    ` : ""}
    <div class="goal-list">${goals.map(goalCardHtml).join("") || `<div class="panel"><p class="muted">No goals match that search.</p></div>`}</div>
  `;
  document.getElementById("goalSearch").addEventListener("input", renderGoals);
  document.getElementById("addGoalBtn").addEventListener("click", () => openGoalDialog());
  document.getElementById("goalActionsBtn").addEventListener("click", () => {
    goalBulkMode = !goalBulkMode;
    if (!goalBulkMode) selectedGoalIds.clear();
    renderGoals();
  });
  document.getElementById("deleteSelectedGoals")?.addEventListener("click", () => {
    if (!selectedGoalIds.size || !confirm(`Delete ${selectedGoalIds.size} selected goal${selectedGoalIds.size === 1 ? "" : "s"}?`)) return;
    deleteGoals(selectedGoalIds);
    selectedGoalIds.clear();
    goalBulkMode = false;
    saveState();
    render();
  });
  bindGoalCards(document.getElementById("goals"));
}

function goalCardHtml(goal) {
  const tracking = goalTrackingStats(goal);
  const resources = (goal.resources || []).slice(0, 3);
  return `
    <article class="goal-card ${goalBulkMode ? "is-selecting" : ""}">
      <div class="goal-card-head">
        ${goalBulkMode ? `<input type="checkbox" class="goal-select" data-select-goal="${goal.id}" aria-label="Select ${escapeHtml(goal.name)}" ${selectedGoalIds.has(goal.id) ? "checked" : ""}>` : ""}
        <div class="goal-title">
          <h3>${escapeHtml(goal.name)}</h3>
          <span class="badge ${goal.priority === "high" ? "bad" : goal.priority === "medium" ? "warn" : ""}">${goal.priority}</span>
        </div>
        <button class="mini-btn" data-edit-goal="${goal.id}">Edit</button>
      </div>
      <div class="goal-progress-head">
        <span>30-day consistency</span>
        <strong>${tracking.percent}%</strong>
      </div>
      <div class="goal-progress-track" aria-label="${tracking.percent}% consistency"><span style="width: ${tracking.percent}%"></span></div>
      <div class="goal-compact-meta">
        ${goal.trackActionsDaily
          ? `<span>${tracking.completed}/${tracking.total} completed</span><span>${tracking.days} tracked day${tracking.days === 1 ? "" : "s"}</span>`
          : `<span>Tracking off</span><span>Edit to link daily actions</span>`}
      </div>
      ${resources.length ? `<div class="goal-resources">${resources.map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resourceLabel(url))}</a>`).join("")}</div>` : ""}
    </article>
  `;
}

function bindGoalCards(root) {
  root.querySelectorAll("[data-edit-goal]").forEach((btn) => {
    btn.addEventListener("click", () => openGoalDialog(btn.dataset.editGoal));
  });
  root.querySelectorAll("[data-select-goal]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) selectedGoalIds.add(input.dataset.selectGoal);
      else selectedGoalIds.delete(input.dataset.selectGoal);
      renderGoals();
    });
  });
}

function goalTrackingStats(goal) {
  const cutoff = parseLocalDate(todayIso());
  cutoff.setDate(cutoff.getDate() - 29);
  const items = [];
  const days = new Set();
  Object.entries(state.checklist).forEach(([date, raw]) => {
    const parsed = parseLocalDate(date);
    if (parsed < cutoff || date > todayIso()) return;
    const goalItems = (Array.isArray(raw) ? raw : Object.values(raw || {})).filter((item) => item.goalId === goal.id);
    if (goalItems.length) days.add(date);
    items.push(...goalItems);
  });
  const completed = items.filter((item) => item.completed).length;
  return {
    completed,
    total: items.length,
    days: days.size,
    percent: items.length ? Math.round((completed / items.length) * 100) : 0
  };
}

function openGoalDialog(id) {
  const goal = state.goals.find((item) => item.id === id);
  document.getElementById("goalDialogTitle").textContent = goal ? "Edit Goal" : "New Goal";
  document.getElementById("goalId").value = goal?.id || "";
  document.getElementById("goalName").value = goal?.name || "";
  document.getElementById("goalPriority").value = goal?.priority || "medium";
  document.getElementById("goalWhy").value = goal?.whyItMatters || "";
  document.getElementById("goalActions").value = (goal?.actions || []).join("\n");
  document.getElementById("goalResources").value = (goal?.resources || []).join("\n");
  document.getElementById("goalTrackDaily").checked = goal ? Boolean(goal.trackActionsDaily) : true;
  document.getElementById("goalDialog").showModal();
}

function saveGoalFromForm(event) {
  event.preventDefault();
  const id = document.getElementById("goalId").value || uid();
  const existing = state.goals.find((goal) => goal.id === id);
  const now = new Date().toISOString();
  const goal = {
    id,
    name: document.getElementById("goalName").value.trim(),
    priority: document.getElementById("goalPriority").value,
    whyItMatters: document.getElementById("goalWhy").value.trim(),
    actions: linesFromTextarea("goalActions"),
    resources: linesFromTextarea("goalResources").map(normalizeResourceUrl).filter(Boolean),
    trackActionsDaily: document.getElementById("goalTrackDaily").checked,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  if (existing) {
    state.goals = state.goals.map((item) => item.id === id ? goal : item);
  } else {
    state.goals.unshift(goal);
  }
  syncGoalActionTemplates(goal);
  saveState();
  document.getElementById("goalDialog").close();
  render();
}

function syncGoalActionTemplates(goal) {
  const existing = state.checklistTemplates.filter((template) => template.goalId === goal.id);
  const unrelated = state.checklistTemplates.filter((template) => template.goalId !== goal.id);
  const byLabel = new Map(existing.map((template) => [template.label.trim().toLowerCase(), template]));
  const next = goal.trackActionsDaily
    ? goal.actions.map((label) => byLabel.get(label.trim().toLowerCase()) || {
      id: uid(),
      label,
      goalId: goal.id,
      source: "goal"
    })
    : [];
  const keptIds = new Set(next.map((template) => template.id));
  state.checklistTemplates = [...unrelated, ...next];
  Object.keys(state.checklist).forEach((date) => {
    state.checklist[date] = checklistArray(date).filter((item) => item.goalId !== goal.id || keptIds.has(item.templateId));
  });
}

function normalizeResourceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function resourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Resource";
  }
}

function deleteGoals(ids) {
  const idSet = new Set(ids);
  state.goals = state.goals.filter((goal) => !idSet.has(goal.id));
  state.checklistTemplates = state.checklistTemplates.filter((template) => !idSet.has(template.goalId));
  Object.keys(state.checklist).forEach((date) => {
    state.checklist[date] = checklistArray(date).filter((item) => !item.goalId || !idSet.has(item.goalId));
  });
}

function renderWeight() {
  const entries = weightEntries();
  const latest = entries.at(-1);
  const values = entries.map((entry) => Number(entry.weight));
  const avg = sevenDayAverage();
  const today = logFor(todayIso());
  document.getElementById("weight").innerHTML = `
    <div class="grid">
      <form class="weight-quickbar span-12" id="quickWeightForm">
        <div class="weight-quick-title">
          <p class="eyebrow">Quick set weight</p>
        </div>
        <label>Date<input type="date" id="quickWeightDate" value="${todayIso()}"></label>
        <label>Weight<input type="number" step="0.1" id="quickWeightInput" value="${today.weight ?? ""}" placeholder="185.4"></label>
        <button class="primary-btn weight-save">Set Weight</button>
      </form>
      <div class="panel stat span-3"><small>Latest</small><strong>${latest ? latest.weight : "--"}</strong><span class="muted">${latest ? latest.date : "No weigh-ins yet"}</span></div>
      <div class="panel stat span-3"><small>7-day avg</small><strong>${avg ? avg.toFixed(1) : "--"}</strong></div>
      <div class="panel stat span-3"><small>High</small><strong>${values.length ? Math.max(...values).toFixed(1) : "--"}</strong><span class="muted">All logs</span></div>
      <div class="panel stat span-3"><small>Low</small><strong>${values.length ? Math.min(...values).toFixed(1) : "--"}</strong><span class="muted">All logs</span></div>
      <div class="panel span-8">
        <p class="eyebrow">Weight trend</p>
        <canvas id="weightCanvas" width="900" height="300"></canvas>
      </div>
      <div class="panel span-4">
        <p class="eyebrow">Recent weigh-ins</p>
        <table class="small-table">
          <thead><tr><th>Date</th><th>Weight</th><th></th></tr></thead>
          <tbody>${entries.slice(-10).reverse().map((entry) => `
            <tr>
              <td>${entry.date}</td>
              <td>${entry.weight}</td>
              <td><button class="mini-btn" data-delete-weight="${entry.date}">Remove</button></td>
            </tr>
          `).join("") || `<tr><td colspan="3">No weights logged.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
  bindWeightControls();
  drawWeightChart(entries);
}

function bindWeightControls() {
  document.getElementById("quickWeightDate").addEventListener("change", (event) => {
    document.getElementById("quickWeightInput").value = logFor(event.target.value).weight ?? "";
  });
  document.getElementById("quickWeightForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const date = document.getElementById("quickWeightDate").value || todayIso();
    const weight = numberOrUndefined(document.getElementById("quickWeightInput").value);
    if (!weight) return;
    upsertLog(date, { weight });
    state.selectedDate = date;
    saveState();
    renderWeight();
  });
  document.querySelectorAll("[data-delete-weight]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const log = state.logs[btn.dataset.deleteWeight];
      if (!log) return;
      delete log.weight;
      saveState();
      render();
    });
  });
}

function importWeightCsv({ csv, dateColumn, weightColumn, dateFormat }) {
  const rows = parseCsv(csv.trim());
  if (rows.length < 2) return { count: 0, message: "No rows found." };
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf(dateColumn.trim().toLowerCase());
  const weightIndex = headers.indexOf(weightColumn.trim().toLowerCase());
  if (dateIndex < 0 || weightIndex < 0) return { count: 0, message: "Column name not found." };
  let imported = 0;
  let skipped = 0;
  rows.slice(1).forEach((row) => {
    const date = normalizeCsvDate(row[dateIndex], dateFormat);
    const weight = numberOrUndefined(row[weightIndex]);
    if (!date || !weight) {
      skipped += 1;
      return;
    }
    state.logs[date] = { ...logFor(date), weight, id: date, date };
    imported += 1;
  });
  return { count: imported, message: `Imported ${imported} weight${imported === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.` };
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeCsvDate(value, format) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (format === "yyyy-mm-dd") {
    const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return "";
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function drawWeightChart(entries) {
  drawLineChart("weightCanvas", entries, {
    empty: "Log at least two weights to draw a trend.",
    yLabel: "Weight",
    value: (entry) => Number(entry.weight),
    label: (entry) => entry.date,
    accentVar: "--accent"
  });
}

function chartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    canvasBg: styles.getPropertyValue("--canvas-bg").trim() || "#fff",
    muted: styles.getPropertyValue("--muted").trim() || "#6e6b63",
    line: styles.getPropertyValue("--line").trim() || "#d9d4ca",
    accent: styles.getPropertyValue("--accent").trim() || "#2563eb",
    ink: styles.getPropertyValue("--ink").trim() || "#191917",
    good: styles.getPropertyValue("--good").trim() || "#177245"
  };
}

function drawLineChart(canvasId, entries, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { canvasBg, muted, line, accent, ink } = chartTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (entries.length < 2) {
    ctx.fillStyle = muted;
    ctx.font = "18px system-ui";
    ctx.fillText(options.empty, 28, 54);
    return;
  }
  const pad = 44;
  const values = entries.map(options.value);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = pad + ((canvas.height - pad * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(canvas.width - pad, y);
    ctx.stroke();
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  entries.forEach((entry, index) => {
    const x = pad + ((canvas.width - pad * 2) / (entries.length - 1)) * index;
    const y = canvas.height - pad - ((options.value(entry) - min) / (max - min)) * (canvas.height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = ink;
  entries.forEach((entry, index) => {
    const x = pad + ((canvas.width - pad * 2) / (entries.length - 1)) * index;
    const y = canvas.height - pad - ((options.value(entry) - min) / (max - min)) * (canvas.height - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = muted;
  ctx.font = "12px system-ui";
  ctx.fillText(`${options.yLabel}: ${values[0].toFixed(1)} start`, pad, 22);
  ctx.fillText(options.label(entries[0]), pad, canvas.height - 12);
  ctx.fillText(options.label(entries.at(-1)), canvas.width - pad - 76, canvas.height - 12);
}

function weeklyChecklistProgress() {
  const rows = Object.keys(state.checklist)
    .sort()
    .map((date) => ({ date, items: checklistArray(date) }));
  const weeks = new Map();
  rows.forEach(({ date, items }) => {
    const week = weekKey(date);
    const current = weeks.get(week) || { label: week, done: 0 };
    current.done += items.filter((item) => item.completed).length;
    weeks.set(week, current);
  });
  return [...weeks.values()].slice(-8);
}

function weekKey(date) {
  const day = new Date(`${date}T12:00:00`);
  const start = new Date(day);
  start.setDate(day.getDate() - day.getDay());
  return `${start.getMonth() + 1}/${start.getDate()}`;
}

function drawBarChart(canvasId, entries, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { canvasBg, muted, line, accent, ink } = chartTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!entries.length || Math.max(...entries.map(options.value)) === 0) {
    ctx.fillStyle = muted;
    ctx.font = "18px system-ui";
    ctx.fillText(options.empty, 26, 54);
    return;
  }
  const pad = 38;
  const max = Math.max(...entries.map(options.value));
  const gap = 10;
  const barWidth = (canvas.width - pad * 2 - gap * (entries.length - 1)) / entries.length;
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(canvas.width - pad, canvas.height - pad);
  ctx.stroke();
  entries.forEach((entry, index) => {
    const value = options.value(entry);
    const x = pad + index * (barWidth + gap);
    const height = (value / max) * (canvas.height - pad * 2);
    const y = canvas.height - pad - height;
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, barWidth, height);
    ctx.fillStyle = ink;
    ctx.font = "13px system-ui";
    ctx.fillText(String(value), x + 4, y - 7);
    ctx.fillStyle = muted;
    ctx.font = "11px system-ui";
    ctx.fillText(options.label(entry), x, canvas.height - 12);
  });
}

function renderSettings() {
  document.getElementById("settings").innerHTML = `
    <div class="grid">
      <div class="panel span-6">
        <p class="eyebrow">Profile</p>
        <h3>Your name</h3>
        <form class="inline-add settings-form" id="nameForm">
          <input id="userNameInput" value="${escapeHtml(state.settings.userName || "Guest")}" placeholder="Guest">
          <button class="primary-btn">Save</button>
        </form>
      </div>
      <div class="panel span-6">
        <p class="eyebrow">Appearance</p>
        <h3>Theme</h3>
        <div class="theme-switch" role="group" aria-label="Theme">
          <button class="${state.settings.theme !== "dark" ? "is-active" : ""}" data-theme-choice="light">Light</button>
          <button class="${state.settings.theme === "dark" ? "is-active" : ""}" data-theme-choice="dark">Dark</button>
        </div>
      </div>
      <div class="panel span-6">
        <p class="eyebrow">Data</p>
        <h3>Local storage only</h3>
        <p class="muted">Everything is stored in this browser. No login. No cloud. No health app sprawl.</p>
        <div class="row">
          <button class="ghost-btn" id="exportBtn">Export JSON</button>
          <button class="danger-btn" id="resetBtn">Reset App</button>
        </div>
      </div>
      <div class="panel span-6">
        <p class="eyebrow">Weight data</p>
        <h3>Import CSV</h3>
        <p class="muted">Map your date and weight columns. Existing dates are updated.</p>
        <form class="csv-import" id="csvImportForm">
          <div class="form-grid">
            <label>Date column<input id="csvDateColumn" value="date" placeholder="date"></label>
            <label>Weight column<input id="csvWeightColumn" value="weight" placeholder="weight"></label>
            <label>Date format<select id="csvDateFormat">
              <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              <option value="mm/dd/yyyy">MM/DD/YYYY</option>
              <option value="m/d/yyyy">M/D/YYYY</option>
            </select></label>
            <label>CSV file<input type="file" id="csvFileInput" accept=".csv,text/csv"></label>
          </div>
          <label>CSV<textarea id="csvInput" rows="5" placeholder="date,weight&#10;2026-06-06,185.4&#10;2026-06-07,184.9"></textarea></label>
          <div class="row">
            <button class="primary-btn">Import Weights</button>
            <span class="muted" id="csvImportStatus">${escapeHtml(lastCsvImportMessage)}</span>
          </div>
        </form>
      </div>
      <div class="panel span-6">
        <p class="eyebrow">Checklist defaults</p>
        <h3>Keep this short</h3>
        <p class="muted">These are the items that appear on each new day. Keep it short.</p>
        ${renderTemplateManager()}
        <form class="inline-add" id="templateForm">
          <input id="templateInput" placeholder="Add default checklist item">
          <button class="ghost-btn">Add Default</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById("nameForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings.userName = document.getElementById("userNameInput").value.trim() || "Guest";
    saveState();
    render();
  });
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.themeChoice;
      saveState();
      render();
    });
  });
  document.getElementById("csvImportForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const result = importWeightCsv({
      csv: document.getElementById("csvInput").value,
      dateColumn: document.getElementById("csvDateColumn").value,
      weightColumn: document.getElementById("csvWeightColumn").value,
      dateFormat: document.getElementById("csvDateFormat").value
    });
    lastCsvImportMessage = result.message;
    document.getElementById("csvImportStatus").textContent = result.message;
    if (result.count > 0) saveState();
  });
  document.getElementById("csvFileInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    document.getElementById("csvInput").value = await file.text();
    lastCsvImportMessage = `Loaded ${file.name}. Review, then import.`;
    document.getElementById("csvImportStatus").textContent = lastCsvImportMessage;
  });
  document.getElementById("templateForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("templateInput");
    addChecklistTemplate(input.value);
    input.value = "";
    render();
  });
  document.querySelectorAll("[data-remove-template]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.checklistTemplates = state.checklistTemplates.filter((template) => template.id !== btn.dataset.removeTemplate);
      Object.keys(state.checklist).forEach((date) => {
        state.checklist[date] = checklistArray(date).filter((item) => item.templateId !== btn.dataset.removeTemplate);
      });
      Object.keys(state.checklistSkips || {}).forEach((date) => {
        state.checklistSkips[date] = state.checklistSkips[date].filter((id) => id !== btn.dataset.removeTemplate);
      });
      saveState();
      render();
    });
  });
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${APP_NAME.replaceAll(" ", "-")}-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Reset all logs, goals, and checklist data?")) return;
    state = defaultState();
    saveState();
    render();
    setView("dashboard");
  });
}

function prioritySort(a, b) {
  const rank = { high: 0, medium: 1, low: 2 };
  return rank[a.priority] - rank[b.priority] || a.name.localeCompare(b.name);
}

function numberOrUndefined(value) {
  const num = Number(value);
  return Number.isFinite(num) && value !== "" ? num : undefined;
}

function linesFromTextarea(id) {
  return document.getElementById(id).value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.view === "log") state.selectedDate = todayIso();
    setView(btn.dataset.view);
  });
});

bindViewJumps();

document.getElementById("goalForm").addEventListener("submit", saveGoalFromForm);
document.getElementById("closeGoalDialog").addEventListener("click", () => document.getElementById("goalDialog").close());

render();
