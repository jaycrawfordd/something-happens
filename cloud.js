const SUPABASE_URL = "https://obmfhwidmsppirfovyqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_syp-AF6cByleQs7UawzINQ_rq--OKss";
const CLOUD_TABLE = "user_app_state";
const CLOUD_MIGRATION_PREFIX = "something-happens-cloud-migrated.";

const cloudClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "something-happens-auth"
  }
});

let cloudUser = null;
let cloudLocalMode = false;
let cloudApplying = false;
let cloudDirty = false;
let cloudSaveTimer = null;
let cloudPullTimer = null;
let lastCloudUpdatedAt = "";
let cloudStatusText = "Checking sync...";
let cloudStatusTone = "";

function setCloudStatus(message, tone = "") {
  cloudStatusText = message;
  cloudStatusTone = tone;
  ["syncIndicator", "cloudSyncStatus"].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.dataset.tone = tone;
  });
}

function setAuthStatus(message, isError = false) {
  const status = document.getElementById("authStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = isError ? "error" : "";
}

function showAuthScreen() {
  document.getElementById("appShell")?.setAttribute("hidden", "");
  document.getElementById("authScreen")?.removeAttribute("hidden");
}

function showCloudApp() {
  document.getElementById("authScreen")?.setAttribute("hidden", "");
  document.getElementById("appShell")?.removeAttribute("hidden");
}

function isLocalHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}

function hasMeaningfulLocalData(candidate) {
  if (!candidate) return false;
  const name = candidate.settings?.userName || "Guest";
  return Object.keys(candidate.logs || {}).length > 0
    || Object.keys(candidate.checklist || {}).length > 0
    || name !== "Guest";
}

function migrationKey() {
  return `${CLOUD_MIGRATION_PREFIX}${cloudUser?.id || "unknown"}`;
}

function cloudErrorMessage(error) {
  if (!error) return "Cloud sync is unavailable.";
  if (error.code === "PGRST205" || /user_app_state/i.test(error.message || "")) {
    return "Cloud table needs setup. Run supabase/schema.sql in Supabase.";
  }
  return error.message || "Cloud sync is unavailable.";
}

async function fetchCloudRow() {
  return cloudClient
    .from(CLOUD_TABLE)
    .select("state, updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();
}

async function pushCloudState() {
  if (!cloudClient || !cloudUser || cloudLocalMode || cloudApplying) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = null;
  cloudDirty = false;
  setCloudStatus("Syncing...");

  const { data, error } = await cloudClient
    .from(CLOUD_TABLE)
    .upsert({ user_id: cloudUser.id, state }, { onConflict: "user_id" })
    .select("updated_at")
    .single();

  if (error) {
    cloudDirty = true;
    setCloudStatus(cloudErrorMessage(error), "error");
    return;
  }
  lastCloudUpdatedAt = data.updated_at;
  localStorage.setItem(migrationKey(), "1");
  setCloudStatus("Synced", "success");
}

function queueCloudSave() {
  if (cloudApplying || cloudLocalMode || !cloudUser) return;
  cloudDirty = true;
  setCloudStatus("Saving...");
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(pushCloudState, 550);
}

async function pullCloudState() {
  if (!cloudClient || !cloudUser || cloudLocalMode || document.hidden) return;
  if (cloudDirty) await pushCloudState();
  const { data, error } = await fetchCloudRow();
  if (error) {
    setCloudStatus(cloudErrorMessage(error), "error");
    return;
  }
  if (!data) {
    await pushCloudState();
    return;
  }
  if (lastCloudUpdatedAt && data.updated_at <= lastCloudUpdatedAt) {
    setCloudStatus("Synced", "success");
    return;
  }

  cloudApplying = true;
  state = normalizeState(data.state);
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  lastCloudUpdatedAt = data.updated_at;
  localStorage.setItem(migrationKey(), "1");
  cloudApplying = false;
  render();
  setCloudStatus("Synced", "success");
}

async function hydrateCloudState() {
  setCloudStatus("Loading cloud...");
  const localState = state;
  const { data, error } = await fetchCloudRow();
  if (error) {
    setCloudStatus(cloudErrorMessage(error), "error");
    showCloudApp();
    render();
    return;
  }

  if (!data) {
    showCloudApp();
    render();
    await pushCloudState();
    return;
  }

  const alreadyMigrated = localStorage.getItem(migrationKey()) === "1";
  const keepDeviceCopy = !alreadyMigrated
    && hasMeaningfulLocalData(localState)
    && confirm("This device has existing tracker data. Use it as your cloud copy?\n\nChoose Cancel to use the data already in your cloud account.");

  if (keepDeviceCopy) {
    showCloudApp();
    render();
    await pushCloudState();
    return;
  }

  cloudApplying = true;
  state = normalizeState(data.state);
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  lastCloudUpdatedAt = data.updated_at;
  localStorage.setItem(migrationKey(), "1");
  cloudApplying = false;
  showCloudApp();
  render();
  setCloudStatus("Synced", "success");
}

function startCloudPolling() {
  clearInterval(cloudPullTimer);
  cloudPullTimer = setInterval(pullCloudState, 20000);
}

async function handleCloudSession(session) {
  cloudUser = session?.user || null;
  if (!cloudUser) {
    clearInterval(cloudPullTimer);
    cloudPullTimer = null;
    setCloudStatus("Signed out");
    showAuthScreen();
    return;
  }
  await hydrateCloudState();
  startCloudPolling();
}

async function submitAuth(event) {
  event.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const button = document.getElementById("signInBtn");
  button.disabled = true;
  setAuthStatus("Signing in...");
  const { error } = await cloudClient.auth.signInWithPassword({ email, password });
  button.disabled = false;
  setAuthStatus(error ? error.message : "", Boolean(error));
}

async function createCloudAccount() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || password.length < 8) {
    setAuthStatus("Enter an email and a password with at least 8 characters.", true);
    return;
  }
  setAuthStatus("Creating account...");
  const emailRedirectTo = `${location.origin}${location.pathname}`;
  const { data, error } = await cloudClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo }
  });
  if (error) {
    setAuthStatus(error.message, true);
  } else if (data.session) {
    setAuthStatus("");
  } else {
    setAuthStatus("Check your email to confirm your account.");
  }
}

async function initializeCloudApp() {
  const localButton = document.getElementById("localModeBtn");
  localButton.hidden = !isLocalHost();
  document.getElementById("authForm").addEventListener("submit", submitAuth);
  document.getElementById("createAccountBtn").addEventListener("click", createCloudAccount);
  localButton.addEventListener("click", () => {
    cloudLocalMode = true;
    setCloudStatus("Local preview");
    showCloudApp();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && cloudDirty) {
      pushCloudState();
    } else if (!document.hidden) {
      pullCloudState();
    }
  });
  window.addEventListener("online", pullCloudState);

  if (!cloudClient) {
    setAuthStatus("The secure sync client could not load.", true);
    return;
  }

  cloudClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      setTimeout(() => handleCloudSession(session), 0);
    }
  });
  const { data, error } = await cloudClient.auth.getSession();
  if (error) {
    setAuthStatus(error.message, true);
    showAuthScreen();
    return;
  }
  await handleCloudSession(data.session);
}

function renderCloudSettingsPanel() {
  if (cloudLocalMode) {
    return `
      <div class="panel span-12 account-panel">
        <p class="eyebrow">Account</p>
        <h3>Local preview</h3>
        <p class="muted">Sign in on the published app to sync across devices.</p>
      </div>
    `;
  }
  return `
    <div class="panel span-12 account-panel">
      <div>
        <p class="eyebrow">Account</p>
        <h3>${escapeHtml(cloudUser?.email || "Signed in")}</h3>
        <p class="muted" id="cloudSyncStatus" data-tone="${escapeHtml(cloudStatusTone)}">${escapeHtml(cloudStatusText)}</p>
      </div>
      <div class="row">
        <button class="ghost-btn" id="syncNowBtn" type="button">Sync now</button>
        <button class="danger-btn" id="signOutBtn" type="button">Sign out</button>
      </div>
    </div>
  `;
}

function bindCloudSettingsControls() {
  document.getElementById("syncNowBtn")?.addEventListener("click", pullCloudState);
  document.getElementById("signOutBtn")?.addEventListener("click", async () => {
    if (cloudDirty) await pushCloudState();
    await cloudClient.auth.signOut();
  });
}
