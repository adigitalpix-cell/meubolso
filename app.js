const SESSION_KEY = "minhas-financas-session";
const LOCAL_DB_KEY = "minhas-financas-local-db";
const OFFLINE_QUEUE_KEY = "minhas-financas-offline-queue";
const ACTIVITY_LOG_KEY = "minhas-financas-activity-log";
const NOTIFICATION_BLOCK_NOTICE_KEY = "minhas-financas-notification-blocked";
const DUE_NOTIFICATION_LOG_KEY = "minhas-financas-due-notifications";
const ADMIN_NOTIFICATION_KEY = "meu-bolso-admin-notifications";
const APP_NAME = "MEU BOLSO";
const APP_UPDATED_AT = "14/07/2026";
const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {};
const SUPABASE_READY = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
const DEFAULT_CATEGORY_DEFINITIONS = [
  { name: "Alimentação", type: "expense" },
  { name: "Moradia", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Saúde", type: "expense" },
  { name: "Educação", type: "expense" },
  { name: "Lazer", type: "expense" },
  { name: "Salário", type: "income" },
  { name: "Outros", type: "both" }
];
const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_DEFINITIONS.map(item => ({ ...item, active: true }));
const PAYMENT_METHODS = ["Dinheiro", "Pix", "Cartão", "Poupança"];
const DEFAULT_ACCOUNTS = ["Conta corrente", "Dinheiro", "Poupança", "Carteira", "Mercado Pago"];
const SUPPORT_STATUSES = { pending: "Pendente", progress: "Em Atendimento", resolved: "Resolvido" };
let deferredInstallPrompt = null;
let serviceWorkerReloading = false;
let isOfflineMode = !navigator.onLine;
let isSyncingOfflineQueue = false;
let dueNotificationTimer = null;

const seed = {
  users: [
    { id: "master", name: "Alex", username: "alex", password: "sepi25al22Mu", role: "master", whatsapp: "", email: "alex.cf10@outlook.com", createdAt: dateOffset(-365) },
    { id: "user-demo", name: "Mariana Costa", username: "mariana", password: "123456", role: "user", whatsapp: "", email: "", createdAt: dateOffset(-30), accessExpiresAt: futureDate(365), blocked: false, renewalPrice: 49.9 }
  ],
  transactions: {
    "user-demo": [
      { id: crypto.randomUUID(), name: "Salário", amount: 5200, type: "income", repeat: "fixed", dueDate: dateOffset(-8), status: "paid", category: "Salário", account: "Conta corrente" },
      { id: crypto.randomUUID(), name: "Aluguel", amount: 1450, type: "expense", repeat: "fixed", dueDate: dateOffset(-4), status: "paid", category: "Moradia", account: "Conta corrente" },
      { id: crypto.randomUUID(), name: "Supermercado", amount: 386.72, type: "card", repeat: "none", dueDate: dateOffset(9), status: "pending", category: "Alimentação", account: "Cartão principal" },
      { id: crypto.randomUUID(), name: "Academia", amount: 119.9, type: "card", repeat: "fixed", dueDate: dateOffset(9), status: "pending", category: "Saúde", account: "Cartão principal" }
    ]
  },
  cards: {
    "user-demo": [
      { id: "card-demo", name: "Cartão principal", brand: "Visa", limit: 5000, closingDay: 20, dueDay: 10 }
    ]
  },
  cardPurchases: {
    "user-demo": [
      { id: crypto.randomUUID(), cardId: "card-demo", name: "Supermercado", amount: 386.72, installments: 1, purchaseDate: dateOffset(-5), category: "Alimentação" },
      { id: crypto.randomUUID(), cardId: "card-demo", name: "Academia", amount: 119.9, installments: 1, purchaseDate: dateOffset(-3), category: "Saúde" }
    ]
  },
  categories: {
    "user-demo": defaultCategoryRecords()
  },
  accounts: {
    "user-demo": DEFAULT_ACCOUNTS
  },
  renewals: [],
  supportTickets: []
};

let db = normalizeDatabase(structuredClone(seed));
let session = loadSavedSession()?.id || null;
let isBooting = true;
let lastSyncError = "";
let currentView = "home";
let authView = "login";
let transactionFilter = "all";
let transactionSearch = "";
let transactionStatusFilter = "all";
let transactionPeriodFilter = "all";
let editingTransactionId = null;
let editingUserId = null;
let userFormOpen = false;
let userListScope = "all";
let userSearch = "";
let userStatusFilter = "all";
let userExpiryFilter = "";
let userPeriodFilter = "all";
let reportUserId = "all";
let reportPeriod = "monthly";
let reportMonth = new Date().toISOString().slice(0, 7);
let reportYear = String(new Date().getFullYear());
let purchaseFormOpen = false;
let selectedCardId = null;
let editingCardId = null;
let editingPurchaseId = null;
let selectedPurchaseId = null;
let dashboardDetail = null;
let receivablesReturnView = "home";
let receivedIncomeReturnView = "home";
let paidExpenseReturnView = "home";
let overdueValueReturnView = "home";
let payablesExpandedCardIds = new Set();
let overdueExpandedCardIds = new Set();
let profileDashboardDetailType = null;
let renewTargetUserId = null;
let activeListType = "categories";
let editingListItem = null;
let preferredCategory = "";
let preferredAccount = "";
let supportSearch = "";
let supportStatusFilter = "all";
let categorySearch = "";
let categoryTypeFilter = "all";
let editingCategoryId = null;

function dateOffset(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function futureDate(days) {
  return dateOffset(days);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDatabase(data = structuredClone(seed)) {
  data.users ||= [];
  data.transactions ||= {};
  data.cards ||= {};
  data.cardPurchases ||= {};
  data.categories ||= {};
  data.accounts ||= {};
  data.renewals ||= [];
  data.supportTickets ||= [];
  data.users.forEach(user => {
    if (user.role === "master") {
      user.name = "Alex";
      user.username = "alex";
      if (!user.password || user.password === "master123") user.password = "sepi25al22Mu";
      if (!user.email) user.email = "alex.cf10@outlook.com";
    }
    if (!user.whatsapp) user.whatsapp = "";
    if (!user.email) user.email = "";
    if (!user.createdAt) user.createdAt = dateOffset();
    if (user.role === "user") {
      if (!user.accessExpiresAt) user.accessExpiresAt = futureDate(365);
      if (typeof user.blocked !== "boolean") user.blocked = false;
      if (!Number.isFinite(user.renewalPrice)) user.renewalPrice = 49.9;
    }
    data.transactions[user.id] ||= [];
    data.cards[user.id] ||= [];
    data.cardPurchases[user.id] ||= [];
    data.categories[user.id] = (data.categories[user.id] || defaultCategoryRecords()).map(normalizeCategoryRecord);
    data.accounts[user.id] ||= [...DEFAULT_ACCOUNTS];
    data.cardPurchases[user.id].forEach(purchase => {
      purchase.paidInstallments ||= [];
    });
  });
  return data;
}

function normalizeCategoryRecord(item, index = 0) {
  if (typeof item === "string") return { id: crypto.randomUUID(), name: item, type: "both", active: true };
  const type = ["income", "expense", "both"].includes(item?.type) ? item.type : "both";
  return {
    id: item?.id || `local-category-${crypto.randomUUID()}`,
    name: String(item?.name || item?.nome || "Outros").trim(),
    type,
    active: item?.active !== false && item?.ativo !== false
  };
}

function defaultCategoryRecords() {
  return DEFAULT_CATEGORIES.map(item => ({ id: crypto.randomUUID(), ...item }));
}

function loadSavedSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return saved?.id ? saved : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(user) {
  if (!user?.id) return;
  session = user.id;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.blocked ? "bloqueado" : isExpired(user) ? "vencido" : "ativo",
    accessExpiresAt: user.accessExpiresAt || "",
    savedAt: new Date().toISOString()
  }));
}

function clearSession() {
  session = null;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function cacheDatabase() {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify({ db, cachedAt: new Date().toISOString() }));
  } catch (error) {
    console.warn("[MEU BOLSO][Offline] não foi possível salvar cache local", error);
  }
}

function loadCachedDatabase() {
  try {
    const cached = JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || "null");
    return cached?.db ? normalizeDatabase(cached.db) : null;
  } catch {
    localStorage.removeItem(LOCAL_DB_KEY);
    return null;
  }
}

function offlineQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    return [];
  }
}

function saveOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function queueSupabaseOperation(operation) {
  const queue = offlineQueue();
  queue.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...operation });
  saveOfflineQueue(queue);
  isOfflineMode = true;
  cacheDatabase();
}

function hasOfflineQueue() {
  return offlineQueue().length > 0;
}

function activityLog() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || "[]");
  } catch {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
    return [];
  }
}

function saveActivityLog(items) {
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(items.slice(0, 500)));
}

function logActivity(message, userId = session) {
  if (!userId || !message) return;
  const now = new Date();
  const item = {
    id: crypto.randomUUID(),
    userId,
    message,
    date: localDateKey(now),
    time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    createdAt: now.toISOString()
  };
  saveActivityLog([item, ...activityLog()]);
}

function actionVerb(isEditing, createText, editText) {
  return isEditing ? editText : createText;
}

function userActivityLog(userId = session) {
  return activityLog().filter(item => item.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function isNetworkError(error) {
  return !navigator.onLine || error?.name === "TypeError" || /fetch|network|failed/i.test(error?.message || "");
}

async function loadDatabase() {
  if (!SUPABASE_READY) throw new Error("Supabase não configurado.");
  const cached = loadCachedDatabase();
  if (!navigator.onLine && cached) {
    isOfflineMode = true;
    return cached;
  }
  if (session) {
    const user = await loadUserById(session);
    if (user) return loadScopedDatabase(user);
  }
  const usuarios = await supabaseSelect("usuarios", "select=*");
  const loaded = normalizeDatabase(fromSupabaseRows({ usuarios, receitas: [], despesas: [], cartoes: [], compras: [], parcelas: [], suporte: [], renovacoes: [], categorias: [], tiposConta: [] }));
  db = loaded;
  cacheDatabase();
  return loaded;
}

async function loadScopedDatabase(loggedUser) {
  const isLoggedMaster = loggedUser.role === "master";
  const userFilter = isLoggedMaster ? "" : `usuario_id=eq.${loggedUser.id}`;
  const [usuarios, receitas, despesas, cartoes, compras, parcelas, suporte, renovacoes, categorias, tiposConta] = await Promise.all([
    isLoggedMaster ? supabaseSelect("usuarios", "select=*") : Promise.resolve([userToSupabaseLike(loggedUser)]),
    supabaseSelect("receitas", selectWithFilter(userFilter)),
    supabaseSelect("despesas", selectWithFilter(userFilter)),
    supabaseSelect("cartoes", selectWithFilter(userFilter)),
    supabaseSelect("compras_cartao", selectWithFilter(userFilter)),
    supabaseSelect("parcelas", selectWithFilter(userFilter)),
    supabaseSelect("suporte", selectWithFilter(userFilter)),
    supabaseSelect("renovacoes", selectWithFilter(userFilter)),
    supabaseSelect("categorias", selectWithFilter(userFilter)),
    supabaseSelect("tipos_conta", selectWithFilter(userFilter))
  ]);
  const loaded = normalizeDatabase(fromSupabaseRows({ usuarios, receitas, despesas, cartoes, compras, parcelas, suporte, renovacoes, categorias, tiposConta }));
  if (isLoggedMaster) console.log("[MEU BOLSO][Supabase] SELECT usuarios master", usuarios.length, usuarios);
  logSupabaseLoad(loggedUser, loaded);
  isOfflineMode = false;
  db = loaded;
  if (!isLoggedMaster) await ensureMonthlyOccurrences(loggedUser.id);
  cacheDatabase();
  return loaded;
}

async function refreshMasterData() {
  const user = await loadUserById(session);
  if (!user || user.role !== "master") throw new Error("Master não encontrado no Supabase.");
  db = await loadScopedDatabase(user);
}

async function refreshCurrentUserData() {
  const user = await loadUserById(session);
  if (!user) throw new Error("Usuário logado não encontrado no Supabase.");
  db = await loadScopedDatabase(user);
}

async function refreshUserFinancialData() {
  if (!navigator.onLine) {
    isOfflineMode = true;
    await ensureMonthlyOccurrences(session);
    cacheDatabase();
    return;
  }
  const user = currentUser() || await loadUserById(session);
  if (!user) throw new Error("Usuário logado não encontrado no Supabase.");
  const filter = `usuario_id=eq.${session}`;
  const [receitas, despesas, cartoes, compras, parcelas, categorias, tiposConta] = await Promise.all([
    supabaseSelect("receitas", selectWithFilter(filter)),
    supabaseSelect("despesas", selectWithFilter(filter)),
    supabaseSelect("cartoes", selectWithFilter(filter)),
    supabaseSelect("compras_cartao", selectWithFilter(filter)),
    supabaseSelect("parcelas", selectWithFilter(filter)),
    supabaseSelect("categorias", selectWithFilter(filter)),
    supabaseSelect("tipos_conta", selectWithFilter(filter))
  ]);
  console.log("[MEU BOLSO][Supabase] SELECT despesas usuario_id", session, despesas.length, despesas);
  const loaded = normalizeDatabase(fromSupabaseRows({
    usuarios: [userToSupabaseLike(user)],
    receitas,
    despesas,
    cartoes,
    compras,
    parcelas,
    suporte: [],
    renovacoes: [],
    categorias,
    tiposConta
  }));
  db.users = db.users.some(item => item.id === user.id) ? db.users.map(item => item.id === user.id ? user : item) : [...db.users, user];
  db.transactions[session] = loaded.transactions[session] || [];
  db.cards[session] = loaded.cards[session] || [];
  db.cardPurchases[session] = loaded.cardPurchases[session] || [];
  db.categories[session] = loaded.categories[session] || defaultCategoryRecords();
  db.accounts[session] = loaded.accounts[session] || [...DEFAULT_ACCOUNTS];
  isOfflineMode = false;
  await ensureMonthlyOccurrences(session);
  cacheDatabase();
  logSupabaseLoad(user, db);
}

async function loadUserById(id) {
  if (!id) return null;
  const rows = await supabaseSelect("usuarios", `select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ? fromSupabaseRows({ usuarios: rows, receitas: [], despesas: [], cartoes: [], compras: [], parcelas: [], suporte: [], renovacoes: [], categorias: [], tiposConta: [] }).users[0] : null;
}

async function loadUserByCredentials(username, password) {
  const query = `select=*&usuario=eq.${encodeURIComponent(username)}&senha=eq.${encodeURIComponent(password)}&limit=1`;
  const rows = await supabaseSelect("usuarios", query);
  return rows[0] ? fromSupabaseRows({ usuarios: rows, receitas: [], despesas: [], cartoes: [], compras: [], parcelas: [], suporte: [], renovacoes: [], categorias: [], tiposConta: [] }).users[0] : null;
}

function selectWithFilter(filter = "") {
  return filter ? `select=*&${filter}` : "select=*";
}

function userToSupabaseLike(user) {
  return {
    id: user.id,
    nome: user.name,
    usuario: user.username,
    senha: user.password,
    whatsapp: user.whatsapp || "",
    email: user.email || "",
    data_cadastro: user.createdAt,
    data_vencimento: user.accessExpiresAt,
    status: user.blocked ? "bloqueado" : "ativo",
    perfil: user.role === "master" ? "master" : "usuario",
    valor_renovacao: Number(user.renewalPrice || 49.9)
  };
}

function logSupabaseLoad(user, data) {
  console.log("[MEU BOLSO][Supabase] usuário logado", user?.username, user?.id);
  console.log("[MEU BOLSO][Supabase] usuario_id usado", user?.id);
  console.log("[MEU BOLSO][Supabase] cartões carregados", data.cards?.[user?.id]?.length || 0);
  console.log("[MEU BOLSO][Supabase] despesas carregadas", (data.transactions?.[user?.id] || []).filter(item => item.type === "expense").length);
  console.log("[MEU BOLSO][Supabase] receitas carregadas", (data.transactions?.[user?.id] || []).filter(item => item.type === "income").length);
}

function saveDatabase() {
  return persistDatabase().catch(error => {
    lastSyncError = error.message;
    showToast("Não foi possível sincronizar com o Supabase.");
  });
}

async function persistDatabase() {
  if (!SUPABASE_READY) throw new Error("Supabase não configurado.");
  const payload = toSupabaseRows(db);
  await upsertRows("usuarios", payload.usuarios);
  await Promise.all([
    upsertRows("categorias", payload.categorias),
    upsertRows("tipos_conta", payload.tiposConta, "usuario_id,nome"),
    upsertRows("receitas", payload.receitas),
    upsertRows("despesas", payload.despesas),
    upsertRows("cartoes", payload.cartoes, "usuario_id,nome")
  ]);
  await upsertRows("compras_cartao", payload.compras);
  await upsertRows("parcelas", payload.parcelas, "compra_cartao_id,numero");
  await Promise.all([
    upsertRows("suporte", payload.suporte),
    upsertRows("renovacoes", payload.renovacoes)
  ]);
}

async function clearTable(table) {
  await supabaseRequest(table, { method: "DELETE", query: "id=not.is.null" });
}

async function insertRows(table, rows) {
  if (rows.length) await supabaseRequest(table, { method: "POST", body: rows, prefer: "return=minimal" });
}

async function upsertRows(table, rows, onConflict = "") {
  if (!rows.length) return;
  const query = onConflict ? `on_conflict=${encodeURIComponent(onConflict)}` : "";
  await supabaseRequest(table, { method: "POST", query, body: rows, prefer: "resolution=merge-duplicates,return=minimal" });
}

async function deleteRows(table, query) {
  await supabaseRequest(table, { method: "DELETE", query });
}

async function deleteRowById(table, id) {
  if (id) await deleteRows(table, supabaseEq("id", id));
}

function supabaseEq(column, value) {
  return `${column}=eq.${encodeURIComponent(value)}`;
}

function supabaseAnd(...filters) {
  return filters.filter(Boolean).join("&");
}

function showDeleteError(error) {
  console.error("[MEU BOLSO][Supabase] erro ao excluir", error);
  if (isOfflineMode || hasOfflineQueue() || isNetworkError(error)) {
    showToast("Exclusão salva offline. Será sincronizada quando a internet voltar.");
    render();
    return;
  }
  showToast("Não foi possível concluir a operação.");
}

async function supabaseSelect(table, query = "select=*") {
  return supabaseRequest(table, { method: "GET", query });
}

async function supabaseRequest(table, { method = "GET", query = "", body = null, prefer = "return=representation" } = {}) {
  if (method !== "GET" && !navigator.onLine) {
    queueSupabaseOperation({ table, method, query, body, prefer });
    return [];
  }
  const separator = query ? `?${query}` : "";
  let response;
  try {
    response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}${separator}`, {
      method,
      cache: "no-store",
      headers: {
        apikey: SUPABASE_CONFIG.anonKey,
        Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Prefer: prefer
      },
      body: body ? JSON.stringify(body) : null
    });
  } catch (error) {
    if (method !== "GET" && isNetworkError(error)) {
      queueSupabaseOperation({ table, method, query, body, prefer });
      return [];
    }
    throw error;
  }
  if (!response.ok) {
    const responseText = await response.text();
    let payload = null;
    try { payload = responseText ? JSON.parse(responseText) : null; } catch {}
    const requestError = new Error(payload?.message || responseText || `Erro Supabase: ${response.status}`);
    requestError.name = "SupabaseRequestError";
    requestError.status = response.status;
    requestError.code = payload?.code || "";
    requestError.details = payload?.details || "";
    requestError.hint = payload?.hint || "";
    requestError.operation = `${method} ${table}`;
    console.error("[MEU BOLSO][Supabase] erro", {
      operation: requestError.operation,
      status: requestError.status,
      code: requestError.code,
      message: requestError.message,
      details: requestError.details,
      hint: requestError.hint
    });
    throw requestError;
  }
  if (response.status === 204) return [];
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

async function syncOfflineQueue() {
  if (isSyncingOfflineQueue || !navigator.onLine || !SUPABASE_READY || !hasOfflineQueue()) return;
  isSyncingOfflineQueue = true;
  const queue = offlineQueue().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const remaining = [];
  try {
    for (const operation of queue) {
      const separator = operation.query ? `?${operation.query}` : "";
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${operation.table}${separator}`, {
        method: operation.method,
        cache: "no-store",
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Prefer: operation.prefer || "return=minimal"
        },
        body: operation.body ? JSON.stringify(operation.body) : null
      });
      if (!response.ok) throw new Error(await response.text());
    }
    saveOfflineQueue([]);
    isOfflineMode = false;
    logActivity("Sincronizou alterações offline.");
    if (session) {
      if (isMaster()) await refreshMasterData();
      else await refreshUserFinancialData();
      render();
    }
    showToast("Dados sincronizados com sucesso.");
  } catch (error) {
    console.error("[MEU BOLSO][Offline] erro ao sincronizar fila", error);
    remaining.push(...queue);
    saveOfflineQueue(remaining);
    isOfflineMode = true;
    showToast("Não foi possível sincronizar agora. Tentaremos novamente em breve.");
  } finally {
    isSyncingOfflineQueue = false;
  }
}

function fromSupabaseRows(rows) {
  const data = { users: [], transactions: {}, cards: {}, cardPurchases: {}, categories: {}, accounts: {}, renewals: [], supportTickets: [] };
  rows.usuarios.forEach(row => {
    const user = {
      id: row.id,
      name: row.nome,
      username: row.usuario,
      password: row.senha,
      role: row.perfil === "master" ? "master" : "user",
      whatsapp: row.whatsapp || "",
      email: row.email || "",
      createdAt: row.data_cadastro,
      accessExpiresAt: row.data_vencimento,
      blocked: row.status === "bloqueado",
      renewalPrice: Number(row.valor_renovacao || 49.9)
    };
    data.users.push(user);
    data.transactions[user.id] = [];
    data.cards[user.id] = [];
    data.cardPurchases[user.id] = [];
    data.categories[user.id] = [];
    data.accounts[user.id] = [];
  });
  rows.receitas.forEach(row => pushForUser(data.transactions, row.usuario_id, {
    id: row.id,
    name: row.nome,
    amount: Number(row.valor || 0),
    type: "income",
    repeat: row.recorrencia || "none",
    dueDate: row.data_vencimento,
    status: row.status === "recebido" ? "received" : "pending",
    category: row.categoria,
    account: row.tipo_conta,
    paymentMethod: row.forma_pagamento || "",
    paidDate: row.data_pagamento || "",
    paidTime: trimTime(row.hora_pagamento),
    createdAt: row.created_at || row.data_cadastro || row.criado_em || ""
  }));
  rows.despesas.forEach(row => pushForUser(data.transactions, row.usuario_id, {
    id: row.id,
    source: row.origem === "card-installment" ? "card-installment" : undefined,
    sourcePurchaseId: row.compra_cartao_id || undefined,
    sourceInstallment: row.parcela_id || undefined,
    name: row.nome,
    amount: Number(row.valor || 0),
    type: "expense",
    repeat: row.recorrencia || "none",
    dueDate: row.data_vencimento,
    status: row.status === "pago" ? "paid" : "pending",
    category: row.categoria,
    account: row.tipo_conta,
    paymentMethod: row.forma_pagamento || "",
    paidDate: row.data_pagamento || "",
    paidTime: trimTime(row.hora_pagamento),
    createdAt: row.created_at || row.data_cadastro || row.criado_em || ""
  }));
  rows.cartoes.forEach(row => pushForUser(data.cards, row.usuario_id, {
    id: row.id,
    name: row.nome,
    brand: row.bandeira,
    limit: Number(row.limite || 0),
    closingDay: Number(row.fechamento),
    dueDay: Number(row.vencimento)
  }));
  const parcelasPorCompra = groupBy(rows.parcelas, "compra_cartao_id");
  rows.compras.forEach(row => {
    const paidInstallments = [];
    const installmentPayments = {};
    (parcelasPorCompra[row.id] || []).forEach(parcela => {
      const key = `${monthKey(parcela.data_vencimento)}-${parcela.numero}`;
      if (parcela.status === "pago") {
        paidInstallments.push(key);
        installmentPayments[key] = {
          paidDate: parcela.data_pagamento || "",
          paidTime: trimTime(parcela.hora_pagamento),
          paymentMethod: parcela.forma_pagamento || "Cartão",
          account: parcela.tipo_conta || "Cartão"
        };
      }
    });
    pushForUser(data.cardPurchases, row.usuario_id, {
      id: row.id,
      cardId: row.cartao_id,
      name: row.nome,
      amount: Number(row.valor_total || 0),
      installments: Number(row.parcelas_total || 1),
      purchaseDate: row.data_compra,
      category: row.categoria,
      closed: row.status === "fechado",
      paidInstallments,
      installmentPayments
    });
  });
  rows.suporte.forEach(row => data.supportTickets.push({
    id: row.id,
    userId: row.usuario_id,
    name: row.nome,
    username: row.usuario,
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    subject: row.assunto,
    message: row.mensagem,
    status: fromSupportStatus(row.status),
    date: row.data_hora?.slice(0, 10) || dateOffset(),
    time: row.data_hora ? trimTime(row.data_hora.slice(11, 19)) : "",
    createdAt: row.data_hora || new Date().toISOString(),
    reply: row.resposta_master ? {
      message: row.resposta_master,
      date: row.respondido_em?.slice(0, 10) || "",
      time: row.respondido_em ? trimTime(row.respondido_em.slice(11, 19)) : "",
      createdAt: row.respondido_em || ""
    } : null
  }));
  data.renewals = rows.renovacoes.map(row => ({
    id: row.id,
    userId: row.usuario_id,
    date: row.data_renovacao,
    amount: Number(row.valor || 0),
    accessExpiresAt: row.nova_validade
  }));
  rows.categorias.forEach(row => pushForUser(data.categories, row.usuario_id, {
    id: row.id,
    name: row.nome,
    type: categoryTypeFromSupabase(row.tipo),
    active: row.ativo !== false
  }));
  rows.tiposConta.forEach(row => pushForUser(data.accounts, row.usuario_id, row.nome));
  data.users.forEach(user => {
    data.categories[user.id] ||= defaultCategoryRecords();
    data.accounts[user.id] ||= [...DEFAULT_ACCOUNTS];
    if (!data.categories[user.id].length) data.categories[user.id] = defaultCategoryRecords();
    if (!data.accounts[user.id].length) data.accounts[user.id] = [...DEFAULT_ACCOUNTS];
  });
  return data;
}

function toSupabaseRows(data) {
  const usuarios = data.users.map(user => ({
    id: user.id,
    nome: user.name,
    usuario: user.username,
    senha: user.password,
    whatsapp: user.whatsapp || "",
    email: user.email || "",
    data_cadastro: user.createdAt || dateOffset(),
    data_vencimento: user.role === "user" ? user.accessExpiresAt || futureDate(30) : user.accessExpiresAt || futureDate(365),
    status: user.role === "master" ? "ativo" : user.blocked ? "bloqueado" : isExpired(user) ? "vencido" : daysUntilExpiry(user) <= 7 ? "vencendo" : "ativo",
    perfil: user.role === "master" ? "master" : "usuario",
    valor_renovacao: Number(user.renewalPrice || 49.9)
  }));
  const receitas = [];
  const despesas = [];
  Object.entries(data.transactions || {}).forEach(([userId, items]) => {
    items.filter(item => item.source !== "card-installment").forEach(item => {
      if (item.type === "income") {
        receitas.push({
          id: item.id,
          usuario_id: userId,
          nome: item.name,
          valor: Number(item.amount || 0),
          recorrencia: item.repeat || "none",
          data_vencimento: item.dueDate,
          status: isPaidStatus(item) ? "recebido" : "a_receber",
          categoria: item.category || "Outros",
          tipo_conta: item.account || "Conta corrente",
          forma_pagamento: item.paymentMethod || null,
          data_pagamento: item.paidDate || null,
          hora_pagamento: item.paidTime || null
        });
      } else {
        despesas.push({
          id: item.id,
          usuario_id: userId,
          nome: item.name,
          valor: Number(item.amount || 0),
          recorrencia: item.repeat || "none",
          data_vencimento: item.dueDate,
          status: isPaidStatus(item) ? "pago" : "nao_pago",
          categoria: item.category || "Outros",
          tipo_conta: item.account || "Conta corrente",
          forma_pagamento: item.paymentMethod || null,
          data_pagamento: item.paidDate || null,
          hora_pagamento: item.paidTime || null,
          origem: item.source || "manual",
          compra_cartao_id: item.sourcePurchaseId || null,
          parcela_id: null
        });
      }
    });
  });
  const cartoes = Object.entries(data.cards || {}).flatMap(([userId, cards]) => cards.map(card => ({
    id: card.id,
    usuario_id: userId,
    nome: card.name,
    bandeira: card.brand,
    limite: Number(card.limit || 0),
    fechamento: Number(card.closingDay),
    vencimento: Number(card.dueDay)
  })));
  const compras = [];
  const parcelas = [];
  Object.entries(data.cardPurchases || {}).forEach(([userId, purchases]) => {
    purchases.forEach(purchase => {
      compras.push({
        id: purchase.id,
        usuario_id: userId,
        cartao_id: purchase.cardId,
        nome: purchase.name,
        valor_total: Number(purchase.amount || 0),
        parcelas_total: Number(purchase.installments || 1),
        categoria: purchase.category || "Outros",
        data_compra: purchase.purchaseDate,
        status: purchase.closed ? "fechado" : allInstallmentsPaid(purchase) ? "pago" : "pendente"
      });
      allInstallmentKeys(purchase).forEach(key => {
        const numero = Number(key.split("-").pop());
        const dueDate = installmentDueDate(purchase, numero);
        const paid = (purchase.paidInstallments || []).includes(key);
        const payment = purchase.installmentPayments?.[key] || {};
        parcelas.push({
          id: crypto.randomUUID(),
          usuario_id: userId,
          compra_cartao_id: purchase.id,
          numero,
          valor: Number(purchase.amount || 0) / Number(purchase.installments || 1),
          data_vencimento: dueDate,
          status: paid ? "pago" : dueDate < dateOffset() ? "atrasado" : "pendente",
          data_pagamento: payment.paidDate || null,
          hora_pagamento: payment.paidTime || null,
          forma_pagamento: payment.paymentMethod || null,
          tipo_conta: payment.account || null
        });
      });
    });
  });
  return {
    usuarios,
    receitas,
    despesas,
    cartoes,
    compras,
    parcelas,
    suporte: (data.supportTickets || []).map(ticket => ({
      id: ticket.id,
      usuario_id: ticket.userId,
      nome: ticket.name,
      usuario: ticket.username,
      whatsapp: ticket.whatsapp || "",
      email: ticket.email || "",
      assunto: ticket.subject,
      mensagem: ticket.message,
      resposta_master: ticket.reply?.message || null,
      status: toSupportStatus(ticket.status),
      data_hora: ticket.createdAt || new Date().toISOString(),
      respondido_em: ticket.reply?.createdAt || null
    })),
    renovacoes: (data.renewals || []).map(item => ({
      id: item.id,
      usuario_id: item.userId,
      data_renovacao: item.date,
      nova_validade: item.accessExpiresAt,
      valor: Number(item.amount || 0)
    })),
    categorias: Object.entries(data.categories || {}).flatMap(([userId, values]) => values.map((value, index) => categoryToSupabaseRow(normalizeCategoryRecord(value, index), userId))),
    tiposConta: Object.entries(data.accounts || {}).flatMap(([userId, values]) => [...new Set(values)].map(nome => ({ id: crypto.randomUUID(), usuario_id: userId, nome })))
  };
}

async function saveNewUserToSupabase(user) {
  await upsertRows("usuarios", [{
    id: user.id,
    nome: user.name,
    usuario: user.username,
    senha: user.password,
    whatsapp: user.whatsapp || "",
    email: user.email || "",
    data_cadastro: user.createdAt || dateOffset(),
    data_vencimento: user.accessExpiresAt || futureDate(30),
    status: "ativo",
    perfil: "usuario",
    valor_renovacao: Number(user.renewalPrice || 49.9)
  }]);
}

function transactionToSupabaseRow(item, userId = session) {
  if (item.type === "income") {
    return {
      id: item.id,
      usuario_id: userId,
      nome: item.name,
      valor: Number(item.amount || 0),
      recorrencia: item.repeat || "none",
      data_vencimento: item.dueDate,
      status: isPaidStatus(item) ? "recebido" : "a_receber",
      categoria: item.category || "Outros",
      tipo_conta: item.account || "Conta corrente",
      forma_pagamento: item.paymentMethod || null,
      data_pagamento: item.paidDate || null,
      hora_pagamento: item.paidTime || null
    };
  }
  return {
    id: item.id,
    usuario_id: userId,
    nome: item.name,
    valor: Number(item.amount || 0),
    recorrencia: item.repeat || "none",
    data_vencimento: item.dueDate,
    status: isPaidStatus(item) ? "pago" : "nao_pago",
    categoria: item.category || "Outros",
    tipo_conta: item.account || "Conta corrente",
    forma_pagamento: item.paymentMethod || null,
    data_pagamento: item.paidDate || null,
    hora_pagamento: item.paidTime || null,
    origem: item.source || "manual",
    compra_cartao_id: item.sourcePurchaseId || null,
    parcela_id: null
  };
}

function monthlyExpenseSeriesKey(item) {
  return [
    String(item.name || "").trim().toLocaleLowerCase("pt-BR"),
    Number(item.amount || 0).toFixed(2),
    String(item.category || "Outros").trim().toLocaleLowerCase("pt-BR"),
    String(item.account || "Conta corrente").trim().toLocaleLowerCase("pt-BR")
  ].join("|");
}

async function ensureMonthlyOccurrences(userId = session, targetDate = dateOffset()) {
  const incomes = await ensureMonthlyIncomeOccurrences(userId, targetDate);
  const expenses = await ensureMonthlyExpenseOccurrences(userId, targetDate);
  return { incomes, expenses };
}

function stableHashHex(value, length = 32) {
  const input = String(value || "");
  const seeds = [2166136261, 2246822519, 3266489917, 668265263];
  let output = "";
  seeds.forEach(seed => {
    let hash = seed >>> 0;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    output += hash.toString(16).padStart(8, "0");
  });
  while (output.length < length) output += stableHashHex(`${input}|${output}`, 32);
  return output.slice(0, length);
}

function monthlyIncomePermanentKey(item) {
  return [
    String(item.name || "").trim().toLocaleLowerCase("pt-BR"),
    Number(item.amount || 0).toFixed(2),
    String(item.category || "Outros").trim().toLocaleLowerCase("pt-BR"),
    String(item.account || "Conta corrente").trim().toLocaleLowerCase("pt-BR"),
    String(item.dueDate || "").slice(8, 10),
    "fixed"
  ].join("|");
}

function monthlyIncomeSeriesToken(item) {
  const compactId = String(item.id || "").replace(/-/g, "").toLowerCase();
  if (/^[0-9a-f]{32}$/.test(compactId) && compactId[12] === "5" && compactId[16] === "b") return compactId.slice(0, 20);
  const hash = stableHashHex(monthlyIncomePermanentKey(item), 32).split("");
  hash[12] = "5";
  hash[16] = "b";
  return hash.join("").slice(0, 20);
}

function monthlyIncomeOccurrenceId(seriesToken, targetMonth) {
  const compact = `${seriesToken}${stableHashHex(targetMonth, 12)}`.slice(0, 32);
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function monthlyIncomeDueDate(items, targetMonth) {
  const [year, month] = targetMonth.split("-").map(Number);
  const preferredDay = Math.max(...items.map(item => Number(item.dueDate?.slice(8, 10) || 1)), 1);
  const dueDay = Math.min(preferredDay, daysInMonth(year, month - 1));
  return `${targetMonth}-${String(dueDay).padStart(2, "0")}`;
}

async function ensureMonthlyIncomeOccurrences(userId = session, targetDate = dateOffset()) {
  if (!userId) return [];
  db.transactions[userId] ||= [];
  const targetMonth = targetDate.slice(0, 7);
  const monthlyIncomes = db.transactions[userId].filter(item =>
    item.type === "income" &&
    item.repeat === "fixed" &&
    item.dueDate &&
    item.dueDate.slice(0, 7) <= targetMonth
  );
  const series = new Map();
  monthlyIncomes.forEach(item => {
    const token = monthlyIncomeSeriesToken(item);
    series.set(token, [...(series.get(token) || []), item]);
  });
  const created = [];
  series.forEach((items, token) => {
    if (items.some(item => item.dueDate.slice(0, 7) === targetMonth)) return;
    const source = [...items].sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
    if (!source || source.dueDate.slice(0, 7) >= targetMonth) return;
    const id = monthlyIncomeOccurrenceId(token, targetMonth);
    if (db.transactions[userId].some(item => item.id === id)) return;
    created.push({
      id,
      name: source.name,
      amount: source.amount,
      type: "income",
      repeat: "fixed",
      dueDate: monthlyIncomeDueDate(items, targetMonth),
      status: "pending",
      category: source.category || "Outros",
      account: source.account || "Conta corrente",
      paymentMethod: "",
      paidDate: "",
      paidTime: "",
      notes: source.notes || source.observation || "",
      createdAt: new Date().toISOString()
    });
  });
  if (!created.length) return [];
  db.transactions[userId].unshift(...created);
  cacheDatabase();
  await upsertRows("receitas", created.map(item => transactionToSupabaseRow(item, userId)));
  created.forEach(item => logActivity(`Gerou receita mensal ${item.name} para ${targetMonth}.`, userId));
  return created;
}

function monthlyExpenseDueDate(items, targetMonth) {
  const [year, month] = targetMonth.split("-").map(Number);
  const preferredDay = Math.max(...items.map(item => Number(item.dueDate?.slice(8, 10) || 1)), 1);
  const dueDay = Math.min(preferredDay, daysInMonth(year, month - 1));
  return `${targetMonth}-${String(dueDay).padStart(2, "0")}`;
}

async function ensureMonthlyExpenseOccurrences(userId = session, targetDate = dateOffset()) {
  if (!userId) return [];
  db.transactions[userId] ||= [];
  const targetMonth = targetDate.slice(0, 7);
  const monthlyExpenses = db.transactions[userId].filter(item =>
    item.type === "expense" &&
    item.repeat === "fixed" &&
    item.source !== "card-installment" &&
    item.source !== "card-installment-virtual" &&
    item.dueDate &&
    item.dueDate.slice(0, 7) <= targetMonth
  );
  const series = new Map();
  monthlyExpenses.forEach(item => {
    const key = monthlyExpenseSeriesKey(item);
    series.set(key, [...(series.get(key) || []), item]);
  });
  const created = [];
  series.forEach(items => {
    if (items.some(item => item.dueDate.slice(0, 7) === targetMonth)) return;
    const source = [...items].sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
    if (!source || source.dueDate.slice(0, 7) >= targetMonth) return;
    created.push({
      ...source,
      id: crypto.randomUUID(),
      dueDate: monthlyExpenseDueDate(items, targetMonth),
      status: "pending",
      paymentMethod: "",
      paidDate: "",
      paidTime: "",
      createdAt: new Date().toISOString()
    });
  });
  if (!created.length) return [];
  db.transactions[userId].unshift(...created);
  cacheDatabase();
  await upsertRows("despesas", created.map(item => transactionToSupabaseRow(item, userId)));
  created.forEach(item => logActivity(`Gerou despesa mensal ${item.name} para ${targetMonth}.`, userId));
  return created;
}

async function saveTransactionToSupabase(item, previousType = item.type) {
  if (previousType && previousType !== item.type) {
    await deleteRowById(previousType === "income" ? "receitas" : "despesas", item.id);
  }
  await upsertRows(item.type === "income" ? "receitas" : "despesas", [transactionToSupabaseRow(item)]);
}

function cardToSupabaseRow(card, userId = session) {
  return {
    id: card.id,
    usuario_id: userId,
    nome: card.name,
    bandeira: card.brand,
    limite: Number(card.limit || 0),
    fechamento: Number(card.closingDay),
    vencimento: Number(card.dueDay)
  };
}

async function saveCardToSupabase(card) {
  await upsertRows("cartoes", [cardToSupabaseRow(card)], "usuario_id,nome");
}

function purchaseToSupabaseRow(purchase, userId = session) {
  return {
    id: purchase.id,
    usuario_id: userId,
    cartao_id: purchase.cardId,
    nome: purchase.name,
    valor_total: Number(purchase.amount || 0),
    parcelas_total: Number(purchase.installments || 1),
    categoria: purchase.category || "Outros",
    data_compra: purchase.purchaseDate,
    status: purchase.closed ? "fechado" : allInstallmentsPaid(purchase) ? "pago" : "pendente"
  };
}

function purchaseInstallmentRows(purchase, userId = session) {
  return allInstallmentKeys(purchase).map(key => {
    const numero = Number(key.split("-").pop());
    const dueDate = installmentDueDate(purchase, numero);
    const paid = (purchase.paidInstallments || []).includes(key);
    const payment = purchase.installmentPayments?.[key] || {};
    return {
      id: crypto.randomUUID(),
      usuario_id: userId,
      compra_cartao_id: purchase.id,
      numero,
      valor: Number(purchase.amount || 0) / Number(purchase.installments || 1),
      data_vencimento: dueDate,
      status: paid ? "pago" : dueDate < dateOffset() ? "atrasado" : "pendente",
      data_pagamento: payment.paidDate || null,
      hora_pagamento: payment.paidTime || null,
      forma_pagamento: payment.paymentMethod || null,
      tipo_conta: payment.account || null
    };
  });
}

async function savePurchaseToSupabase(purchase) {
  await upsertRows("compras_cartao", [purchaseToSupabaseRow(purchase)]);
  await deleteRows("parcelas", `compra_cartao_id=eq.${purchase.id}`);
  await upsertRows("parcelas", purchaseInstallmentRows(purchase), "compra_cartao_id,numero");
}

async function saveListItemToSupabase(type, name) {
  const table = type === "categories" ? "categorias" : "tipos_conta";
  const conflictColumns = type === "categories" ? "" : "usuario_id,nome";
  await upsertRows(table, [{ id: crypto.randomUUID(), usuario_id: session, nome: name }], conflictColumns);
}

function categoryToSupabaseRow(category, userId = session) {
  return {
    id: category.id || crypto.randomUUID(),
    usuario_id: userId,
    nome: category.name,
    tipo: categoryTypeToSupabase(category.type),
    ativo: category.active !== false
  };
}

function categoryTypeToSupabase(type) {
  return ({ income: "receita", expense: "despesa", both: "ambas" })[type] || "ambas";
}

function categoryTypeFromSupabase(type) {
  return ({ receita: "income", despesa: "expense", ambas: "both", income: "income", expense: "expense", both: "both" })[type] || "both";
}

function pushForUser(collection, userId, item) {
  collection[userId] ||= [];
  collection[userId].push(item);
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    groups[item[key]] ||= [];
    groups[item[key]].push(item);
    return groups;
  }, {});
}

function trimTime(value = "") {
  return value ? String(value).slice(0, 5) : "";
}

function toSupportStatus(status) {
  return ({ pending: "pendente", progress: "em_atendimento", resolved: "resolvido" })[status] || "pendente";
}

function fromSupportStatus(status) {
  return ({ pendente: "pending", em_atendimento: "progress", resolvido: "resolved" })[status] || "pending";
}

function currentUser() {
  return db.users.find(user => user.id === session);
}

function isMaster() {
  return currentUser()?.role === "master";
}

function regularUsers() {
  return db.users.filter(user => user.role === "user");
}

function isExpired(user) {
  return user.role === "user" && (!user.accessExpiresAt || user.accessExpiresAt < dateOffset());
}

function isAccessBlocked(user) {
  return user.role === "user" && (user.blocked || isExpired(user));
}

function daysUntilExpiry(user) {
  const start = new Date(`${dateOffset()}T12:00:00`);
  const end = new Date(`${user.accessExpiresAt}T12:00:00`);
  return Math.round((end - start) / 86400000);
}

function accessStatus(user) {
  if (user.blocked && !isExpired(user)) return { label: "Bloqueado", className: "expired" };
  if (isExpired(user)) return { label: "Vencido", className: "expired" };
  if (daysUntilExpiry(user) <= 7) return { label: "Vencendo", className: "warning" };
  return { label: "Ativo", className: "active" };
}

function transactionsFor(userId) {
  if (isMaster()) {
    if (userId === "all") return regularUsers().flatMap(user => (db.transactions[user.id] || []).map(item => ({ ...item, ownerId: user.id, ownerName: user.name })));
    if (!regularUsers().some(user => user.id === userId)) return [];
    return (db.transactions[userId] || []).map(item => ({ ...item, ownerId: userId, ownerName: db.users.find(user => user.id === userId)?.name }));
  }
  return db.transactions[session] || [];
}

function userTransactions() {
  return transactionsFor(session);
}

function userCards(userId = session) {
  return db.cards?.[userId] || [];
}

function userCardPurchases(userId = session) {
  return db.cardPurchases?.[userId] || [];
}

function userCategories(userId = session) {
  return userCategoryRecords(userId).filter(item => item.active).map(item => item.name);
}

function userCategoryRecords(userId = session) {
  return (db.categories?.[userId] || defaultCategoryRecords()).map(normalizeCategoryRecord);
}

function transactionCategoryNames(type, currentName = "") {
  const names = userCategoryRecords().filter(item => item.active && (item.type === type || item.type === "both")).map(item => item.name);
  if (currentName && !names.includes(currentName)) names.push(currentName);
  return names.length ? names : ["Outros"];
}

function userAccounts(userId = session) {
  return db.accounts?.[userId] || DEFAULT_ACCOUNTS;
}

function monthKey(value = dateOffset()) {
  return value.slice(0, 7);
}

function monthsBetween(startDate, targetMonth = monthKey()) {
  const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
  const [targetYear, targetMonthNumber] = targetMonth.split("-").map(Number);
  return (targetYear - startYear) * 12 + (targetMonthNumber - startMonth);
}

function installmentInfo(purchase, targetMonth = monthKey()) {
  const elapsed = monthsBetween(purchase.purchaseDate, targetMonth);
  const current = elapsed + 1;
  const active = current >= 1 && current <= purchase.installments;
  const installmentValue = purchase.amount / purchase.installments;
  return {
    active,
    current: Math.min(Math.max(current, 1), purchase.installments),
    total: purchase.installments,
    remaining: active ? purchase.installments - current : Math.max(purchase.installments - current, 0),
    value: installmentValue,
    key: `${targetMonth}-${Math.min(Math.max(current, 1), purchase.installments)}`,
    paid: (purchase.paidInstallments || []).includes(`${targetMonth}-${Math.min(Math.max(current, 1), purchase.installments)}`)
  };
}

function currentInvoice(cardId = null) {
  return userCardPurchases().reduce((sum, purchase) => {
    if (cardId && purchase.cardId !== cardId) return sum;
    const info = installmentInfo(purchase);
    return info.active && !info.paid ? sum + info.value : sum;
  }, 0);
}

function totalCardLimit() {
  return userCards().reduce((sum, card) => sum + Number(card.limit || 0), 0);
}

function pendingPurchaseTotal(cardId = null, excludePurchaseId = null) {
  return userCardPurchases().reduce((sum, purchase) => {
    if (cardId && purchase.cardId !== cardId) return sum;
    if (excludePurchaseId && purchase.id === excludePurchaseId) return sum;
    const paidCount = (purchase.paidInstallments || []).length;
    const remainingInstallments = Math.max(purchase.installments - paidCount, 0);
    return sum + (purchase.amount / purchase.installments) * remainingInstallments;
  }, 0);
}

function availableCardLimit(cardId = null) {
  const limit = cardId
    ? Number(userCards().find(card => card.id === cardId)?.limit || 0)
    : totalCardLimit();
  return Math.max(limit - pendingPurchaseTotal(cardId), 0);
}

function invoiceClosingDate(cardId) {
  const card = userCards().find(item => item.id === cardId);
  const today = new Date(`${dateOffset()}T12:00:00`);
  const closingDay = Number(card?.closingDay || today.getDate());
  const closing = new Date(today);
  closing.setDate(Math.min(closingDay, daysInMonth(closing.getFullYear(), closing.getMonth())));
  if (today > closing) {
    closing.setMonth(closing.getMonth() + 1);
    closing.setDate(Math.min(closingDay, daysInMonth(closing.getFullYear(), closing.getMonth())));
  }
  return localDateKey(closing);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function paidCardInstallments(targetMonth = monthKey()) {
  return userCardPurchases().flatMap(purchase => {
    const info = installmentInfo(purchase, targetMonth);
    return info.active && info.paid ? [{ purchase, ...info }] : [];
  });
}

function cardInstallmentItems(userId = session) {
  return userCardPurchases(userId).flatMap(purchase => {
    const card = userCards(userId).find(item => item.id === purchase.cardId);
    return Array.from({ length: purchase.installments }, (_, index) => {
      const installmentNumber = index + 1;
      const dueDate = installmentDueDate(purchase, installmentNumber);
      const key = `${monthKey(dueDate)}-${installmentNumber}`;
      const paid = (purchase.paidInstallments || []).includes(key);
      const payment = purchase.installmentPayments?.[key] || {};
      return {
        id: `${purchase.id}-${key}`,
        source: "card-installment-virtual",
        sourcePurchaseId: purchase.id,
        sourceInstallment: key,
        ownerId: userId,
        name: `${purchase.name} (${installmentNumber}/${purchase.installments})`,
        amount: purchase.amount / purchase.installments,
        type: "expense",
        repeat: "none",
        dueDate,
        paidDate: payment.paidDate || "",
        paidTime: payment.paidTime || "",
        status: paid ? "paid" : "pending",
        category: purchase.category || "Outros",
        account: card?.name || "Cartão",
        cardName: card?.name || "Cartão"
      };
    });
  });
}

function dashboardTransactions() {
  const baseItems = userTransactions().filter(item => item.source !== "card-installment");
  return [...baseItems, ...cardInstallmentItems()];
}

function financialItemsForUser(userId) {
  const baseItems = (db.transactions[userId] || []).filter(item => item.source !== "card-installment");
  return [...baseItems, ...cardInstallmentItems(userId)];
}

function reportTransactionsFor(userId) {
  if (!isMaster()) return financialItemsForUser(session);
  if (userId === "all") {
    return regularUsers().flatMap(user => financialItemsForUser(user.id).map(item => ({ ...item, ownerId: user.id, ownerName: user.name })));
  }
  if (!regularUsers().some(user => user.id === userId)) return [];
  const ownerName = db.users.find(user => user.id === userId)?.name;
  return financialItemsForUser(userId).map(item => ({ ...item, ownerId: userId, ownerName }));
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value, full = false) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", full ? { day: "2-digit", month: "2-digit", year: "numeric" } : { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function initials(name) {
  return name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function iconFor(category, type) {
  if (type === "income") return "↓";
  return ({ "Alimentação": "◒", "Moradia": "⌂", "Transporte": "↗", "Saúde": "+", "Lazer": "☆" })[category] || "↑";
}

function render() {
  const app = document.querySelector("#app");
  if (isBooting) {
    app.innerHTML = `
      <section class="login-page">
        <form class="login-card">
          <h2>Sincronizando informações</h2>
          <p>Atualizando seus dados com segurança...</p>
        </form>
      </section>`;
    return;
  }
  if (lastSyncError) {
    app.innerHTML = `
      <section class="login-page">
        <form class="login-card">
          <h2>Não foi possível conectar</h2>
          <div class="login-alert">Verifique sua conexão e tente novamente.</div>
          <button class="primary-button" type="button" data-retry-sync>Tentar novamente</button>
        </form>
      </section>`;
    document.querySelector("[data-retry-sync]")?.addEventListener("click", async () => {
      await syncOfflineQueue();
      initializeApp();
    });
    return;
  }
  const user = currentUser();
  if (!user) {
    clearSession();
    app.innerHTML = authView === "register" ? registerTemplate() : loginTemplate();
    bindLogin();
    return;
  }

  if (user.role === "user" && isAccessBlocked(user)) {
    clearSession();
    authView = "login";
    app.innerHTML = loginTemplate("Seu acesso expirou. Entre em contato com o administrador.");
    bindLogin();
    return;
  }

  applyNotificationViewFromUrl();
  if (!canAccessView(currentView)) currentView = "home";
  app.innerHTML = shellTemplate();
  bindAppEvents();
  scheduleDueNotificationCheck();
}

function canAccessView(view) {
  if (isMaster()) return ["home", "users", "reports", "support", "profile", "notifications", "security", "masterDashboard", "graphDashboard"].includes(view);
  return ["home", "transactions", "card", "cardPurchases", "purchaseEditor", "installments", "profile", "categories", "notifications", "profileFinancialDashboard", "profileDashboardDetail", "activityLog", "security", "financialDashboard", "graphDashboard", "dashboardDetail", "balanceAudit", "support"].includes(view);
}

function loginTemplate(message = "") {
  return `
    <section class="login-page">
      <div>
        <div class="login-copy">
          <span class="eyebrow">Sua vida financeira organizada</span>
          <h1>Dinheiro claro.<br>Vida mais leve.</h1>
          <p>Receitas, despesas e cartão em um só lugar.</p>
        </div>
      </div>
      <form class="login-card" id="login-form">
        <h2>Entre na sua conta</h2>
        ${message ? `<div class="login-alert">${escapeHtml(message)}</div>` : ""}
        <label class="field"><span>Usuário</span><input name="username" autocomplete="username" required placeholder="Digite seu usuário"></label>
        <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" required placeholder="Digite sua senha"></label>
        <button class="primary-button" type="submit">Entrar</button>
        <button class="auth-link" type="button" data-auth-view="register">Cadastrar</button>
      </form>
    </section>`;
}

function registerTemplate() {
  return `
    <section class="login-page">
      <div class="login-copy compact">
        <span class="eyebrow">Novo acesso</span>
        <h1>Crie sua conta.</h1>
        <p>Seu acesso fica liberado automaticamente por 30 dias.</p>
      </div>
      <form class="login-card" id="register-form">
        <h2>Cadastrar</h2>
        <label class="field"><span>Nome</span><input name="name" required maxlength="80" placeholder="Seu nome"></label>
        <label class="field"><span>Usuário</span><input name="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9._-]+" placeholder="Ex.: cliente01"></label>
        <label class="field"><span>Senha</span><input name="password" type="password" minlength="6" required placeholder="Mínimo de 6 caracteres"></label>
        <label class="field"><span>WhatsApp</span><input name="whatsapp" required inputmode="tel" placeholder="(00) 00000-0000"></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" required placeholder="voce@email.com"></label>
        <button class="primary-button" type="submit">Criar conta</button>
        <button class="auth-link" type="button" data-auth-view="login">Já tenho conta</button>
      </form>
    </section>`;
}

function shellTemplate() {
  const user = currentUser();
  const activeNotifications = notificationCenterItems().length;
  return `
    <section class="app-shell">
      ${currentView === "home" ? `<header class="topbar">
        <button class="avatar" data-view="profile">${initials(user.name)}</button>
        <div class="topbar-greeting"><span class="eyebrow">${greeting()}</span><h1 class="hello">${escapeHtml(user.name.split(" ")[0])}</h1></div>
        <button class="notification-bell" data-view="notifications" aria-label="Abrir notificações">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9.5 21h5"/></svg>
          ${activeNotifications ? `<span>${activeNotifications > 9 ? "9+" : activeNotifications}</span>` : ""}
        </button>
      </header>` : ""}
      ${(isOfflineMode || hasOfflineQueue()) ? `<div class="offline-banner">Você está offline. As alterações serão sincronizadas quando a internet voltar.</div>` : ""}
      <section class="page">${viewTemplate()}</section>
      ${user.role === "user" ? `<button class="fab" data-add aria-label="Adicionar movimentação">+</button>` : ""}
      <nav class="bottom-nav ${user.role === "master" ? "master-nav" : "user-nav"}">
        ${navButton("home", `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z"/></svg>`, "Início")}
        ${user.role === "master" ? navButton("users", "♙", "Usuários") : navButton("transactions", `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v15m0 0-4-4m4 4 4-4M17 21V6m0 0-4 4m4-4 4 4"/></svg>`, "Transações")}
        ${user.role === "master" ? navButton("reports", "▤", "Relatórios") : navButton("card", `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 9h18M7 15h4"/></svg>`, "Cartões")}
        ${user.role === "master" ? navButton("support", "?", "Suporte") : ""}
      </nav>
    </section>`;
}

function navButton(view, icon, label) {
  return `<button class="nav-button ${currentView === view ? "active" : ""}" data-view="${view}" data-nav-view="${view}"><b aria-hidden="true">${icon}</b><span>${label}</span></button>`;
}

function openTransactionsRoot() {
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
  document.querySelectorAll(".receivable-options[open], .category-options[open], .transaction-advanced-filters[open]").forEach(menu => { menu.open = false; });
  editingTransactionId = null;
  editingPurchaseId = null;
  selectedPurchaseId = null;
  dashboardDetail = null;
  purchaseFormOpen = false;
  if (!["all", "income", "expense", "card"].includes(transactionFilter)) transactionFilter = "all";
  currentView = "transactions";
  render();
}

function viewTemplate() {
  if (currentView === "transactions" && !isMaster()) return transactionsTemplate();
  if (currentView === "card" && !isMaster()) return cardTemplate();
  if (currentView === "cardPurchases" && !isMaster()) return cardPurchasesTemplate();
  if (currentView === "purchaseEditor" && !isMaster()) return purchaseEditorTemplate();
  if (currentView === "installments" && !isMaster()) return installmentsTemplate();
  if (currentView === "profileFinancialDashboard" && !isMaster()) return profileFinancialDashboardTemplate();
  if (currentView === "profileDashboardDetail" && !isMaster()) return profileDashboardDetailTemplate();
  if (currentView === "financialDashboard" && !isMaster()) return financialDashboardTemplate();
  if (currentView === "graphDashboard") return graphDashboardTemplate();
  if (currentView === "dashboardDetail" && !isMaster()) return dashboardDetailTemplate(dashboardDetail);
  if (currentView === "balanceAudit" && !isMaster()) return balanceAuditTemplate();
  if (currentView === "masterDashboard" && isMaster()) return masterDashboardTemplate();
  if (currentView === "support") return supportTemplate();
  if (currentView === "profile") return profileTemplate();
  if (currentView === "categories" && !isMaster()) return categoriesTemplate();
  if (currentView === "notifications") return notificationsTemplate();
  if (currentView === "activityLog" && !isMaster()) return activityLogTemplate();
  if (currentView === "security") return securityTemplate();
  if (currentView === "users" && isMaster()) return usersTemplate();
  if (currentView === "reports" && isMaster()) return reportsTemplate();
  return homeTemplate();
}

function totals(items = userTransactions()) {
  return items.reduce((sum, item) => {
    if (item.type === "income") sum.income += item.amount;
    else sum.expense += item.amount;
    if (item.type === "card" && item.status === "pending") sum.card += item.amount;
    if (!isPaidStatus(item) && item.type !== "income") sum.pending += item.amount;
    return sum;
  }, { income: 0, expense: 0, card: 0, pending: 0 });
}

function masterMetrics() {
  const users = regularUsers();
  const current = monthKey();
  const renewals = (db.renewals || []).filter(item => item.date?.slice(0, 7) === current);
  return {
    total: users.length,
    expired: users.filter(isExpired).length,
    expiring: users.filter(user => !isExpired(user) && daysUntilExpiry(user) <= 7).length,
    active: users.filter(user => !isAccessBlocked(user)).length,
    blocked: users.filter(user => user.blocked).length,
    newUsersMonth: users.filter(user => user.createdAt?.slice(0, 7) === current).length,
    renewalsMonth: renewals.length,
    renewalRevenueMonth: renewals.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    forecast: users.filter(user => !user.blocked && daysUntilExpiry(user) <= 30).reduce((sum, user) => sum + Number(user.renewalPrice || 0), 0)
  };
}

function homeTemplate() {
  if (isMaster()) {
    const metrics = masterMetrics();
    return `
      <div class="page-title"><span class="eyebrow">Painel master</span><h1>Controle de acessos</h1><p>Selecione um cartão para gerenciar os usuários.</p></div>
      <div class="metric-grid">
        ${metricTile("Total de usuários", metrics.total, "neutral", "all")}
        ${metricTile("Usuários ativos", metrics.active, "active", "active")}
        ${metricTile("Vencendo em 7 dias", metrics.expiring, "warning", "expiring")}
        ${metricTile("Usuários vencidos", metrics.expired, "expired", "expired")}
      </div>
      <div class="master-actions"><button class="primary-button" data-view="masterDashboard">Ver Dashboard Master</button></div>
      <div class="dashboard-note"><b>Administração centralizada</b><span>Os números são atualizados automaticamente conforme os acessos são alterados.</span></div>`;
  }
  const dashboard = financialDashboard();
  return `
    ${expiryNotice()}
    <article class="balance-card premium-balance-card">
      <div class="premium-balance-heading"><small>Saldo atual</small></div>
      <h2>${money(dashboard.balance)}</h2>
      <div class="balance-meta premium-balance-meta">
        <div><button class="balance-info-trigger" data-balance-info="income" data-balance-message="Total das receitas que você recebeu durante o mês atual."><span>Receitas do mês</span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.2v.2"/></svg></button><strong>+ ${money(dashboard.receivedMonth)}</strong></div>
        <div><button class="balance-info-trigger" data-balance-info="expense" data-balance-message="Total das despesas do mês atual, incluindo despesas pagas e despesas ainda a pagar."><span>Despesas do mês</span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.2v.2"/></svg></button><strong>- ${money(dashboard.monthExpense)}</strong></div>
      </div>
    </article>
    <div class="balance-info-popover" data-balance-popover role="status" hidden></div>
    <div class="dashboard-grid">
      ${dashboardShortcut("invoice", "Fatura atual", money(dashboard.invoice))}
      ${dashboardShortcut("cards", "Limite disponível", money(dashboard.availableLimit))}
      ${dashboardShortcut("today", "Vence hoje", dashboard.dueToday)}
      ${dashboardShortcut("soon", "Próximos 7 dias", dashboard.dueSoon)}
      ${dashboardShortcut("overdue", "Em atraso", dashboard.overdue, "danger-card")}
      ${dashboardShortcut("overdueValue", "Valor em atraso", money(dashboard.overdueAmount), "danger-card")}
      ${dashboardShortcut("received", "Recebido no mês", money(dashboard.receivedMonth))}
      ${dashboardShortcut("toReceive", "A receber no mês", money(dashboard.toReceiveMonth))}
      ${dashboardShortcut("paid", "Pago no mês", money(dashboard.paidMonth))}
      ${dashboardShortcut("toPay", "A pagar no mês", money(dashboard.toPayMonth))}
    </div>`;
}

function profileFinancialDashboardTemplate() {
  const dashboard = financialDashboard();
  const monthNet = dashboard.receivedMonth - dashboard.monthExpense;
  const cardLimit = totalCardLimit();
  const cardUsed = pendingPurchaseTotal();
  const cardUsage = cardLimit ? Math.min(cardUsed / cardLimit * 100, 100) : 0;
  return `
    <div class="page-title"><span class="eyebrow">Análise financeira</span><h1>Dashboard Financeiro</h1><p>Acompanhe a situação do mês, cartões e categorias.</p></div>
    <button class="secondary-button back-button" data-view="profile">Voltar ao perfil</button>
    ${monthSituationTemplate(dashboard, monthNet)}
    ${cardsOverviewTemplate(cardLimit, cardUsed, dashboard.availableLimit, cardUsage)}
    ${categoryOverviewTemplate()}`;
}

function notificationCenterSources() {
  if (!session || isMaster()) return [];
  const today = dateOffset();
  const movements = userTransactions()
    .filter(item => ["income", "expense"].includes(item.type) && !isPaidStatus(item) && item.status !== "cancelled" && item.dueDate)
    .filter(item => item.type === "income" || item.dueDate <= today)
    .map(item => {
      const kind = item.type === "income" ? "Receita" : "Despesa";
      const todayDue = item.dueDate === today;
      const overdue = item.dueDate < today;
      return {
        id: `movement:${item.type}:${item.id}:${item.dueDate}`,
        title: item.type === "income" && !overdue && !todayDue ? "Receita a receber" : `${kind} ${todayDue ? "vence hoje" : "vencida"}`,
        message: item.type === "income" && !overdue && !todayDue ? `${item.name} está prevista para ${formatDate(item.dueDate, true)}.` : `${item.name} ${todayDue ? "vence hoje" : "está vencida"}.`,
        date: item.dueDate,
        time: item.createdAt?.slice(11, 16) || "08:00",
        amount: Number(item.amount || 0),
        kind: "movement",
        recordId: item.id,
        priority: overdue ? (item.type === "expense" ? 10 : 30) : todayDue ? 40 : 50
      };
    });

  const installments = cardInstallmentItems()
    .filter(item => !isPaidStatus(item) && item.dueDate && item.dueDate <= today)
    .map(item => {
      const todayDue = item.dueDate === today;
      return {
        id: `installment:${item.sourcePurchaseId}:${item.sourceInstallment}`,
        title: `Parcela de cartão ${todayDue ? "vence hoje" : "vencida"}`,
        message: `${item.name} no cartão ${item.cardName || "Cartão"}.`,
        date: item.dueDate,
        time: "08:00",
        amount: Number(item.amount || 0),
        kind: "installment",
        purchaseId: item.sourcePurchaseId,
        installmentKey: item.sourceInstallment,
        priority: todayDue ? 40 : 20
      };
    });

  const now = new Date(`${today}T12:00:00`);
  const invoices = userCards().flatMap(card => {
    const due = new Date(now.getFullYear(), now.getMonth(), Math.min(Number(card.dueDay || 1), daysInMonth(now.getFullYear(), now.getMonth())), 12);
    const dueDate = localDateKey(due);
    const amount = currentInvoice(card.id);
    if (!amount) return [];
    const todayDue = dueDate === today;
    const overdue = dueDate < today;
    return [{
      id: `invoice:${card.id}:${dueDate}`,
      title: overdue ? "Fatura vencida" : todayDue ? "Fatura vence hoje" : "Fatura pendente",
      message: `A fatura do cartão ${card.name} ${overdue ? "está vencida" : todayDue ? "vence hoje" : "está pendente"}.`,
      date: dueDate,
      time: "08:00",
      amount: Number(amount || 0),
      kind: "invoice",
      cardId: card.id,
      priority: overdue ? 25 : todayDue ? 40 : 50
    }];
  });

  const user = currentUser();
  const accessDays = user ? daysUntilExpiry(user) : 99;
  const access = user && accessDays >= 0 && accessDays <= 7 ? [{
    id: `access:${user.id}:${user.accessExpiresAt}`,
    title: "Acesso próximo do vencimento",
    message: `Seu acesso vence ${accessDays === 0 ? "hoje" : `em ${accessDays} dia${accessDays === 1 ? "" : "s"}`}.`,
    date: user.accessExpiresAt,
    time: "08:00",
    kind: "access",
    view: "profile",
    priority: 55
  }] : [];
  return [...movements, ...invoices, ...installments, ...access, ...administrativeNotificationSources()];
}

function administrativeNotificationSources() {
  let stored = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_NOTIFICATION_KEY) || "[]");
    stored = Array.isArray(parsed) ? parsed : [];
  } catch {
    stored = [];
  }
  const configured = Array.isArray(window.APP_ADMIN_NOTIFICATIONS) ? window.APP_ADMIN_NOTIFICATIONS : [];
  const unique = new Map();
  [...stored, ...configured].forEach((item, index) => {
    if (!item || item.active === false) return;
    if (item.userId && item.userId !== session && item.userId !== "all") return;
    const id = String(item.id || `admin-${index}-${item.date || dateOffset()}`);
    unique.set(id, {
      id: `admin:${id}`,
      title: String(item.title || "Aviso do sistema"),
      message: String(item.message || "Você possui uma nova informação do MEU BOLSO."),
      date: item.date || dateOffset(),
      time: item.time || "08:00",
      amount: item.amount !== undefined && item.amount !== null && item.amount !== "" && Number.isFinite(Number(item.amount)) ? Number(item.amount) : null,
      kind: "admin",
      view: item.view || "notifications",
      priority: 60
    });
  });
  return [...unique.values()];
}

function notificationCenterItems() {
  return notificationCenterSources()
    .sort((a, b) => Number(a.priority || 99) - Number(b.priority || 99) || `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function notificationsTemplate() {
  const items = notificationCenterItems();
  return `
    <section class="notifications-page">
      <button class="receivables-back-header notifications-back-header" data-view="home" aria-label="Voltar para o início">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
        <span><strong>Notificações</strong><small>Acompanhe alertas e pendências importantes.</small></span>
      </button>
      <section class="notifications-hero">
        <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9.5 21h5"/></svg></i>
        <div><span>Notificações ativas</span><p>Você possui pendências que precisam da sua atenção.</p></div>
        <strong>${items.length}<small>${items.length === 1 ? "pendência" : "pendências"}</small></strong>
      </section>
      <div class="notification-center-list">${items.length ? items.map(notificationCenterRow).join("") : `<div class="notifications-empty"><strong>Nenhuma notificação ativa.</strong><span>Você não possui pendências no momento.</span></div>`}</div>
    </section>`;
}

function notificationCenterRow(item) {
  return `
    <button class="notification-center-item" data-notification-id="${escapeAttribute(item.id)}" data-notification-kind="${escapeAttribute(item.kind || "")}" data-notification-record="${escapeAttribute(item.recordId || "")}" data-notification-card="${escapeAttribute(item.cardId || "")}" data-notification-purchase="${escapeAttribute(item.purchaseId || "")}" data-notification-installment="${escapeAttribute(item.installmentKey || "")}" data-notification-view="${escapeAttribute(item.view || "")}">
      <span class="notification-copy"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><small><svg viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="4.5" width="12" height="10" rx="1.8"/><path d="M6 2.8v3M12 2.8v3M3 7.5h12"/></svg>${formatDate(item.date, true)} — ${escapeHtml(item.time)}</small></span>
      ${Number.isFinite(item.amount) ? `<b>${money(item.amount)}</b>` : ""}
      <i aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 4 6 6-6 6"/></svg></i>
    </button>`;
}

async function openNotificationTarget(button) {
  const kind = button.dataset.notificationKind;
  if (kind === "movement" && button.dataset.notificationRecord) {
    await markTransactionPaid(button.dataset.notificationRecord);
    return;
  }
  if (kind === "invoice" && button.dataset.notificationCard) {
    await payCardInvoice(button.dataset.notificationCard, { fromNotification: true });
    return;
  }
  if (kind === "installment" && button.dataset.notificationPurchase && button.dataset.notificationInstallment) {
    await payCardInstallment(button.dataset.notificationPurchase, button.dataset.notificationInstallment, { fromNotification: true });
    return;
  }
  currentView = button.dataset.notificationView || "notifications";
  render();
}

function monthSituationTemplate(dashboard, monthNet) {
  const totalMovement = dashboard.receivedMonth + dashboard.monthExpense;
  const incomeWidth = totalMovement ? dashboard.receivedMonth / totalMovement * 100 : 0;
  const expenseWidth = totalMovement ? dashboard.monthExpense / totalMovement * 100 : 0;
  return `
    <section class="home-dashboard-section month-situation-card">
      <div class="home-section-heading"><div><span>Visão mensal</span><h2>Situação financeira do mês</h2></div><b class="${monthNet >= 0 ? "positive" : "negative"}">${monthNet >= 0 ? "+" : ""}${money(monthNet)}</b></div>
      <div class="month-situation-values">
        <button data-financial-composition="income"><span>Receitas do mês</span><strong>${money(dashboard.receivedMonth)}</strong><small>Ver detalhes</small></button>
        <button data-financial-composition="expense"><span>Despesas do mês</span><strong>${money(dashboard.monthExpense)}</strong><small>Ver detalhes</small></button>
        <button data-financial-composition="net"><span>Saldo líquido</span><strong>${money(monthNet)}</strong><small>Ver composição</small></button>
      </div>
      <div class="month-flow-bar" aria-label="Comparação entre receitas e despesas"><i style="width:${incomeWidth}%"></i><b style="width:${expenseWidth}%"></b></div>
      <div class="month-flow-legend"><span><i></i>Receitas</span><span><i></i>Despesas</span></div>
    </section>`;
}

function dashboardMonthReceivedItems() {
  const current = monthKey();
  return transactionHistoryItems()
    .filter(item => item.type === "income" && isPaidStatus(item) && paidMonthKey(item) === current)
    .sort(compareTransactionsNewestFirst);
}

function uniqueDashboardItems(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.sourcePurchaseId && item.sourceInstallment ? `${item.sourcePurchaseId}:${item.sourceInstallment}` : item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function profileDashboardDetailTemplate() {
  const dashboard = financialDashboard();
  const type = ["income", "expense", "net"].includes(profileDashboardDetailType) ? profileDashboardDetailType : "net";
  const incomeItems = uniqueDashboardItems(dashboardMonthReceivedItems());
  const expenseItems = uniqueDashboardItems(homeMonthExpenseItems().sort(compareTransactionsNewestFirst));
  const incomeTotal = incomeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseTotal = expenseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthNet = dashboard.receivedMonth - dashboard.monthExpense;
  const title = type === "income" ? "Receitas do mês" : type === "expense" ? "Despesas do mês" : "Saldo líquido";
  return `
    <section class="financial-composition-page">
      <div class="page-title"><span class="eyebrow">Conferência do cálculo</span><h1>${title}</h1><p>Somente lançamentos considerados no mês atual.</p></div>
      <button class="secondary-button back-button" data-view="profileFinancialDashboard">Voltar ao Dashboard Financeiro</button>
      ${type === "net" ? financialNetComposition(dashboard.receivedMonth, dashboard.monthExpense, monthNet) : `
        <div class="financial-composition-list">${(type === "income" ? incomeItems : expenseItems).length
          ? (type === "income" ? incomeItems : expenseItems).map(item => financialCompositionRow(item, type)).join("")
          : `<div class="empty">Nenhum lançamento considerado neste cálculo.</div>`}</div>
        <article class="financial-composition-total"><span>Total considerado</span><strong>${money(type === "income" ? incomeTotal : expenseTotal)}</strong></article>`}
    </section>`;
}

function financialCompositionRow(item, type) {
  const origin = financialItemOrigin(item, type);
  if (type === "income") {
    return `
      <article class="financial-composition-row">
        <div><strong>${escapeHtml(item.name)}</strong><span>${statusLabel(item)}</span></div>
        <b class="positive">${money(item.amount)}</b>
        <p>Recebido em ${formatDate(item.paidDate || item.dueDate, true)}</p>
        <small>Origem: ${origin}</small>
      </article>`;
  }
  return `
    <article class="financial-composition-row">
      <div><strong>${escapeHtml(item.name)}</strong><span>${statusLabel(item)}</span></div>
      <b class="negative">${money(item.amount)}</b>
      <p>Vencimento: ${formatDate(item.dueDate, true)}${item.paidDate ? ` · Pago em ${formatDate(item.paidDate, true)}` : ""}</p>
      <small>Origem: ${origin}</small>
    </article>`;
}

function financialItemOrigin(item, type) {
  if (type === "income") return "Receitas";
  if (item.source === "card-installment-virtual" || item.source === "card-installment") return "Parcela de cartão";
  if (item.source === "card-invoice") return "Fatura de cartão";
  if (item.repeat === "fixed") return "Despesa fixa mensal";
  return "Despesa normal";
}

function financialNetComposition(income, expense, net) {
  return `
    <article class="financial-net-composition">
      <div><span>Receitas consideradas</span><strong class="positive">${money(income)}</strong></div>
      <div><span>(−) Despesas consideradas</span><strong class="negative">${money(expense)}</strong></div>
      <div class="net-result"><span>(=) Saldo líquido</span><strong>${money(net)}</strong></div>
      <p>Fórmula usada pelo sistema: Receitas consideradas − Despesas consideradas = Saldo líquido.</p>
    </article>`;
}

function cardsOverviewTemplate(limit, used, available, usage) {
  return `
    <button class="home-dashboard-section cards-overview-card" data-view="card">
      <div class="home-section-heading"><div><span>Cartões</span><h2>Uso dos cartões</h2></div><b>${Math.round(usage)}%</b></div>
      <div class="cards-overview-values">
        <div><span>Limite total</span><strong>${money(limit)}</strong></div>
        <div><span>Utilizado</span><strong>${money(used)}</strong></div>
        <div><span>Disponível</span><strong>${money(available)}</strong></div>
      </div>
      <div class="cards-usage-bar"><i style="width:${usage}%"></i></div>
      <small>${limit ? "Toque para abrir seus cartões" : "Nenhum cartão cadastrado · toque para adicionar"}</small>
    </button>`;
}

function homeMonthExpenseItems() {
  const current = monthKey();
  const items = dashboardTransactions();
  const paid = items.filter(item => item.type !== "income" && isPaidStatus(item) && paidMonthKey(item) === current);
  const pending = items.filter(item => item.type !== "income" && !isPaidStatus(item) && dueMonthKey(item) === current);
  return [...paid, ...pending];
}

function homeCategoryTotals() {
  const totals = new Map();
  homeMonthExpenseItems().forEach(item => {
    const category = item.category || "Outros";
    totals.set(category, (totals.get(category) || 0) + Number(item.amount || 0));
  });
  const sorted = [...totals].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= 6) return sorted;
  const visible = sorted.slice(0, 5);
  visible.push({ label: "Outros", value: sorted.slice(5).reduce((sum, item) => sum + item.value, 0) });
  return visible;
}

function categoryOverviewTemplate() {
  const categories = homeCategoryTotals();
  const total = categories.reduce((sum, item) => sum + item.value, 0);
  const rows = categories.map(item => {
    const percentage = total ? item.value / total * 100 : 0;
    return `<div class="category-overview-row"><div><strong>${escapeHtml(item.label)}</strong><span>${money(item.value)} · ${Math.round(percentage)}%</span></div><i><b style="width:${percentage}%"></b></i></div>`;
  }).join("");
  return `
    <section class="home-dashboard-section category-overview-card">
      <div class="home-section-heading"><div><span>Despesas</span><h2>Despesas por categoria</h2></div></div>
      <div class="category-overview-list">${rows || `<div class="home-empty-state"><b>Nenhuma despesa neste mês</b><span>As categorias aparecerão aqui automaticamente.</span></div>`}</div>
    </section>`;
}

function dashboardShortcut(detail, label, value, className = "") {
  return `<button class="dashboard-tile ${className}" data-dashboard-detail="${detail}"><span>${label}</span><strong>${value}</strong></button>`;
}

function closeBalanceInfoPopover() {
  const popover = document.querySelector("[data-balance-popover]");
  if (!popover) return;
  popover.hidden = true;
  popover.dataset.owner = "";
  clearTimeout(closeBalanceInfoPopover.timer);
}

function toggleBalanceInfoPopover(button) {
  const popover = document.querySelector("[data-balance-popover]");
  if (!popover) return;
  const owner = button.dataset.balanceInfo;
  if (!popover.hidden && popover.dataset.owner === owner) {
    closeBalanceInfoPopover();
    return;
  }
  popover.textContent = button.dataset.balanceMessage;
  popover.dataset.owner = owner;
  popover.hidden = false;
  const rect = button.getBoundingClientRect();
  const cardRect = button.closest(".balance-card")?.getBoundingClientRect() || rect;
  const width = Math.min(280, window.innerWidth - 24);
  popover.style.width = `${width}px`;
  popover.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
  popover.style.top = `${cardRect.bottom + 8}px`;
  const popoverRect = popover.getBoundingClientRect();
  if (popoverRect.bottom > window.innerHeight - 12) popover.style.top = `${Math.max(12, cardRect.top - popoverRect.height - 8)}px`;
  clearTimeout(closeBalanceInfoPopover.timer);
  closeBalanceInfoPopover.timer = setTimeout(closeBalanceInfoPopover, 4000);
}

function dashboardDetailTemplate(type) {
  if (type === "toReceive") return receivablesDetailTemplate();
  if (type === "received") return receivedIncomeDetailTemplate();
  if (type === "paid") return paidExpenseDetailTemplate();
  if (type === "toPay") return payablesDetailTemplate();
  if (type === "overdueValue") return overdueValueDetailTemplate();
  const title = ({
    invoice: "Fatura detalhada",
    cards: "Resumo dos cartões",
    today: "Contas vencendo hoje",
    soon: "Contas dos próximos 7 dias",
    overdue: "Contas atrasadas",
    overdueValue: "Valor em atraso",
    received: "Receitas recebidas",
    toReceive: "Receitas a receber",
    paid: "Despesas pagas",
    toPay: "Despesas a pagar"
  })[type] || "Detalhes";
  return `
    <section class="dashboard-detail-page">
      <div class="page-title"><span class="eyebrow">Detalhe financeiro</span><h1>${title}</h1></div>
      <button class="secondary-button back-button" data-view="home">Voltar ao início</button>
      <div class="transaction-list">${dashboardDetailRows(type)}</div>
    </section>`;
}

function expiryNotice() {
  const user = currentUser();
  if (!user || user.role !== "user") return "";
  const days = daysUntilExpiry(user);
  const messages = {
    2: "Seu acesso vence em 2 dias.",
    1: "Seu acesso vence amanhã.",
    0: "Seu acesso vence hoje."
  };
  return Object.prototype.hasOwnProperty.call(messages, days)
    ? `<div class="expiry-notice">⚠️ ${messages[days]}</div>`
    : "";
}

function dashboardDetailRows(type) {
  if (type === "invoice" || type === "cards") return type === "invoice" ? invoiceDetailRows() : cardSummaryRows();
  if (type === "toReceive") return transactionRows(
    pendingIncomeItems(),
    false,
    true,
    item => dueMonthKey(item) < monthKey() ? "past-due-income" : ""
  );
  const current = monthKey();
  const today = dateOffset();
  const seven = dateOffset(7);
  const items = dashboardTransactions().filter(item => {
    if (type === "today") return item.status === "pending" && item.type !== "income" && item.dueDate === today;
    if (type === "soon") return item.status === "pending" && item.type !== "income" && item.dueDate > today && item.dueDate <= seven;
    if (type === "overdue" || type === "overdueValue") return item.status === "pending" && item.type !== "income" && item.dueDate < today;
    if (type === "received") return item.type === "income" && isPaidStatus(item) && paidMonthKey(item) === current;
    if (type === "paid") return item.type !== "income" && isPaidStatus(item) && paidMonthKey(item) === current;
    if (type === "toPay") return item.type !== "income" && !isPaidStatus(item) && dueMonthKey(item) === current;
    return false;
  });
  return transactionRows(items, false, true);
}

function payablesDetailTemplate() {
  const today = dateOffset();
  const currentMonth = monthKey();
  const pendingExpenses = userTransactions()
    .filter(item => item.type === "expense" && !isPaidStatus(item) && item.source !== "card-installment" && !item.sourcePurchaseId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const currentItems = pendingExpenses.filter(item => dueMonthKey(item) === currentMonth && item.dueDate >= today);
  const overdueItems = pendingExpenses.filter(item => item.dueDate < today);
  const currentTotal = pendingExpenses
    .filter(item => dueMonthKey(item) === currentMonth)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const overdueTotal = overdueItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cardGroups = payablesCardGroups();
  return `
    <section class="dashboard-detail-page payables-page">
      <button class="receivables-back-header" data-close-payables aria-label="Voltar para a tela anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
        <span><strong>Despesas a Pagar</strong><small>Acompanhe suas despesas pendentes.</small></span>
      </button>
      <section class="payables-hero">
        <i>${payablesHeroIcon()}</i>
        <div><span>Mês atual</span><h2>Despesas a Pagar</h2><small>Total do mês</small><strong>${money(currentTotal)}</strong></div>
        <b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/></svg></b>
      </section>
      <section class="payables-current-section">
        <h3>${payablesCalendarIcon()}<span>${escapeHtml(payablesMonthLabel(currentMonth))}</span></h3>
        <div class="payables-list">${currentItems.length ? currentItems.map(item => payableExpenseCard(item, false)).join("") : `<div class="payables-empty">Nenhuma despesa pendente neste mês.</div>`}</div>
      </section>
      <section class="payables-card-section">
        <h3>${payablesCardIcon()}<span>Parcelas de cartão</span></h3>
        <div class="payables-card-groups">${cardGroups.length ? cardGroups.map(payablesCardGroupTemplate).join("") : `<div class="payables-empty">Nenhuma parcela de cartão pendente.</div>`}</div>
      </section>
      <section class="payables-overdue-section">
        <header><div><span>Pendências anteriores</span><h2>Despesas Atrasadas</h2><small>Total atrasado</small><strong>${money(overdueTotal)}</strong></div><i>${payablesAlertIcon()}</i></header>
        <div class="payables-list">${overdueItems.length ? overdueItems.map(item => payableExpenseCard(item, true)).join("") : `<div class="payables-empty">Nenhuma despesa atrasada.</div>`}</div>
      </section>
    </section>`;
}

function payablesMonthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function payableExpenseCard(item, overdue) {
  const repeat = item.repeat === "fixed" ? "Mensal" : "Não repete";
  const days = overdueDays(item);
  return `
    <article class="payable-expense-card ${overdue ? "overdue" : ""}">
      <i class="payable-category-icon">${payableCategoryIconSvg(item.category)}</i>
      <div class="payable-expense-copy"><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.category)} · ${formatDate(item.dueDate, true)} · ${repeat}</p><small>${escapeHtml(item.paymentMethod || item.account || "Conta corrente")}</small>${overdue ? `<b class="payable-overdue-badge">Atrasado ${days} ${days === 1 ? "dia" : "dias"}</b>` : ""}</div>
      <div class="payable-expense-value"><strong>- ${money(item.amount)}</strong><span>${overdue ? "Atrasado" : "Não pago"}</span></div>
      <div class="payable-actions">
        <button type="button" class="payable-pay-button" data-pay-transaction="${escapeAttribute(item.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Pagar</span></button>
        <details class="receivable-options payable-options"><summary aria-label="Mais opções"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div><button data-edit-transaction="${escapeAttribute(item.id)}">Editar</button><button class="danger" data-delete-transaction="${escapeAttribute(item.id)}">Excluir</button></div></details>
      </div>
    </article>`;
}

function payablesCardGroups() {
  const groups = new Map();
  const currentMonth = monthKey();
  cardInstallmentItems()
    .filter(item => !isPaidStatus(item) && dueMonthKey(item) === currentMonth)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .forEach(item => {
      const purchase = userCardPurchases().find(entry => entry.id === item.sourcePurchaseId);
      const card = userCards().find(entry => entry.id === purchase?.cardId);
      if (!purchase || !card) return;
      const group = groups.get(card.id) || { card, items: [], total: 0 };
      group.items.push({ ...item, purchase });
      group.total += Number(item.amount || 0);
      groups.set(card.id, group);
    });
  return [...groups.values()].sort((a, b) => a.card.name.localeCompare(b.card.name, "pt-BR"));
}

function payablesCardGroupTemplate(group) {
  const expanded = payablesExpandedCardIds.has(group.card.id);
  const count = group.items.length;
  return `
    <article class="payables-card-group ${expanded ? "expanded" : ""}">
      <div class="payables-card-summary">
        <i>${payablesCardIcon()}</i>
        <div><h4>${escapeHtml(group.card.name)}</h4><p>${count} ${count === 1 ? "parcela pendente" : "parcelas pendentes"}</p></div>
        <div class="payables-card-total"><small>Total</small><strong>${money(group.total)}</strong></div>
      </div>
      ${expanded ? `<div class="payables-installment-list">${group.items.map(payablesInstallmentRow).join("")}<div class="payables-installment-total"><b>Total do cartão</b><strong>${money(group.total)}</strong></div></div>` : ""}
      <div class="payables-card-actions">
        <button type="button" class="payable-pay-button" data-pay-payables-card="${escapeAttribute(group.card.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Pagar</span></button>
        <details class="receivable-options payable-options"><summary aria-label="Mais opções do cartão"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div><button data-open-card-purchases="${escapeAttribute(group.card.id)}">Abrir em Cartões</button></div></details>
        <button type="button" class="payables-toggle-card" data-toggle-payables-card="${escapeAttribute(group.card.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg><span>${expanded ? "Ocultar parcelas" : "Ver parcelas"}</span></button>
      </div>
    </article>`;
}

function payablesInstallmentRow(item) {
  const number = Number(String(item.sourceInstallment).split("-").pop());
  return `<div class="payables-installment-row"><i>${payableCategoryIconSvg(item.category)}</i><div><strong>${escapeHtml(item.purchase.name)}</strong><span>Parcela ${number}/${item.purchase.installments} · Venc. ${formatDate(item.dueDate, true)}</span></div><b>${money(item.amount)}</b></div>`;
}

function payableCategoryIconSvg(category) {
  const key = String(category || "Outros").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const path = key.includes("internet") || key.includes("celular")
    ? `<path d="M4 9a12 12 0 0 1 16 0M7 12a7.5 7.5 0 0 1 10 0M10 15a3 3 0 0 1 4 0M12 19h.01"/>`
    : key.includes("energia") || key.includes("luz")
      ? `<path d="M9 18h6M10 21h4M8.5 14.5a6 6 0 1 1 7 0c-1 .8-1.5 1.7-1.5 3h-4c0-1.3-.5-2.2-1.5-3z"/>`
      : key.includes("agua")
        ? `<path d="M12 3S6.5 9.5 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.5 12 3 12 3z"/>`
        : key.includes("aliment")
          ? `<path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10v11M9.5 3v4.5A2.5 2.5 0 0 1 7 10M16.5 3v18M16.5 3c2.2 1.2 3 3.4 3 6.5h-3"/>`
          : key.includes("transporte") || key.includes("combust")
            ? `<path d="M5 16V9l2-4h10l2 4v7M5 12h14M8 16v2M16 16v2M8 9h8"/>`
            : key.includes("moradia") || key.includes("casa")
              ? `<path d="m3 11 9-7 9 7M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/>`
              : key.includes("saude")
                ? `<path d="M12 20S4 15.5 4 9a4 4 0 0 1 7-2.6L12 7.5l1-1.1A4 4 0 0 1 20 9c0 6.5-8 11-8 11zM12 10v5M9.5 12.5h5"/>`
                : key.includes("educ")
                  ? `<path d="m3 9 9-5 9 5-9 5zM7 12v4.5c2.8 2 7.2 2 10 0V12"/>`
                  : `<circle cx="12" cy="12" r="8"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

function payablesHeroIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h3"/><path d="M18 13v7M15.5 17.5 18 20l2.5-2.5"/></svg>`;
}

function payablesCalendarIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/></svg>`;
}

function payablesCardIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>`;
}

function payablesAlertIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 17H3zM12 9v5M12 17h.01"/></svg>`;
}

function overdueValueDetailTemplate() {
  const items = overdueValueItems();
  const regularItems = items.filter(item => item.source !== "card-installment-virtual");
  const cardGroups = overdueCardGroups(items);
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthGroups = overdueMonthGroups(regularItems);
  const hasItems = regularItems.length || cardGroups.length;
  return `
    <section class="dashboard-detail-page payables-page overdue-value-page">
      <button class="receivables-back-header" data-close-overdue-value aria-label="Voltar para a tela anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
        <span><strong>Valor em Atraso</strong><small>Acompanhe todas as despesas vencidas.</small></span>
      </button>
      <section class="payables-hero overdue-value-hero">
        <i>${payablesAlertIcon()}</i>
        <div><span>Pendências em atraso</span><h2>Valor em Atraso</h2><small>Total em atraso</small><strong>${money(total)}</strong></div>
        <b aria-hidden="true">${payablesAlertIcon()}</b>
      </section>
      ${hasItems ? `
        ${monthGroups.length ? `<div class="overdue-value-groups">${monthGroups.map(overdueMonthGroupTemplate).join("")}</div>` : ""}
        ${cardGroups.length ? `<section class="payables-card-section overdue-card-section"><h3>${payablesCardIcon()}<span>Parcelas de cartão em atraso</span></h3><div class="payables-card-groups">${cardGroups.map(overdueCardGroupTemplate).join("")}</div></section>` : ""}
      ` : `<div class="overdue-value-empty-state"><i>${payablesAlertIcon()}</i><strong>Nenhuma despesa em atraso.</strong><span>Suas contas estão em dia.</span></div>`}
    </section>`;
}

function overdueValueItems() {
  const today = dateOffset();
  return dashboardTransactions()
    .filter(item => item.type !== "income" && item.status === "pending" && item.dueDate < today)
    .sort((a, b) => String(b.dueDate || "").localeCompare(String(a.dueDate || "")));
}

function overdueMonthGroups(items) {
  const groups = new Map();
  items.forEach(item => {
    const key = dueMonthKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entries]) => ({ key, entries: entries.sort((a, b) => b.dueDate.localeCompare(a.dueDate)) }));
}

function overdueMonthGroupTemplate(group) {
  return `
    <section class="payables-current-section overdue-value-month-section">
      <h3>${payablesCalendarIcon()}<span>${escapeHtml(payablesMonthLabel(group.key))}</span></h3>
      <div class="payables-list">${group.entries.map(overdueValueExpenseCard).join("")}</div>
    </section>`;
}

function overdueValueExpenseCard(item) {
  const repeat = item.repeat === "fixed" ? "Mensal" : "Não repete";
  const days = overdueDays(item);
  return `
    <article class="payable-expense-card overdue overdue-value-expense-card">
      <i class="payable-category-icon">${payableCategoryIconSvg(item.category)}</i>
      <div class="payable-expense-copy"><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.category || "Outros")} · Vencimento: ${formatDate(item.dueDate, true)}${item.repeat ? ` · ${repeat}` : ""}</p><small>${escapeHtml(item.paymentMethod || item.account || "Conta corrente")}</small><b class="payable-overdue-badge">Atrasado ${days} ${days === 1 ? "dia" : "dias"}</b></div>
      <div class="payable-expense-value"><strong>- ${money(item.amount)}</strong><span>Atrasado</span></div>
      <div class="payable-actions">
        <button type="button" class="payable-pay-button" data-pay-transaction="${escapeAttribute(item.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Pagar</span></button>
        <details class="receivable-options payable-options"><summary aria-label="Mais opções"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div><button data-edit-transaction="${escapeAttribute(item.id)}">Editar</button><button class="danger" data-delete-transaction="${escapeAttribute(item.id)}">Excluir</button></div></details>
      </div>
    </article>`;
}

function overdueCardGroups(items = overdueValueItems()) {
  const groups = new Map();
  items.filter(item => item.source === "card-installment-virtual").forEach(item => {
    const purchase = userCardPurchases().find(entry => entry.id === item.sourcePurchaseId);
    const card = userCards().find(entry => entry.id === purchase?.cardId);
    if (!purchase || !card) return;
    const group = groups.get(card.id) || { card, items: [], total: 0 };
    group.items.push({ ...item, purchase });
    group.total += Number(item.amount || 0);
    groups.set(card.id, group);
  });
  return [...groups.values()]
    .map(group => ({ ...group, items: group.items.sort((a, b) => b.dueDate.localeCompare(a.dueDate)) }))
    .sort((a, b) => a.card.name.localeCompare(b.card.name, "pt-BR"));
}

function overdueCardGroupTemplate(group) {
  const expanded = overdueExpandedCardIds.has(group.card.id);
  const count = group.items.length;
  return `
    <article class="payables-card-group overdue-card-group ${expanded ? "expanded" : ""}">
      <div class="payables-card-summary"><i>${payablesCardIcon()}</i><div><h4>${escapeHtml(group.card.name)}</h4><p>${count} ${count === 1 ? "parcela vencida" : "parcelas vencidas"}</p></div><div class="payables-card-total"><small>Total</small><strong>${money(group.total)}</strong></div></div>
      ${expanded ? `<div class="payables-installment-list">${group.items.map(payablesInstallmentRow).join("")}<div class="payables-installment-total"><b>Total vencido</b><strong>${money(group.total)}</strong></div></div>` : ""}
      <div class="payables-card-actions">
        <button type="button" class="payable-pay-button" data-pay-overdue-card="${escapeAttribute(group.card.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Pagar</span></button>
        <details class="receivable-options payable-options"><summary aria-label="Mais opções do cartão"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div><button data-open-card-purchases="${escapeAttribute(group.card.id)}">Abrir em Cartões</button></div></details>
        <button type="button" class="payables-toggle-card" data-toggle-overdue-card="${escapeAttribute(group.card.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg><span>${expanded ? "Ocultar parcelas" : "Ver parcelas"}</span></button>
      </div>
    </article>`;
}

function receivedIncomeDetailTemplate() {
  const items = dashboardMonthReceivedItems();
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const groups = groupReceivedIncomesByMonth(items);
  return `
    <section class="dashboard-detail-page receivables-page received-income-page">
      <button class="receivables-back-header" data-close-received-income aria-label="Voltar para a tela anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
        <span><strong>Receitas Recebidas</strong><small>Confira as receitas recebidas no mês</small></span>
      </button>
      <section class="receivables-section current received-income-section">
        <header><i class="receivables-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.7 2.7L16.5 9"/></svg></i><div class="receivables-section-title"><span>Recebido no mês</span><h2>Receitas Recebidas</h2></div><div class="receivables-total"><small>Total recebido</small><strong>${money(total)}</strong></div></header>
        ${groups.length ? groups.map(receivedIncomeMonthGroup).join("") : `<div class="receivables-empty">Nenhuma receita recebida neste mês.</div>`}
      </section>
    </section>`;
}

function groupReceivedIncomesByMonth(items) {
  const groups = new Map();
  items.forEach(item => {
    const key = paidMonthKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()].map(([key, entries]) => ({ key, entries }));
}

function receivedIncomeMonthGroup(group) {
  const [year, month] = group.key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return `<div class="receivables-month-group"><h3>${escapeHtml(label.charAt(0).toUpperCase() + label.slice(1))}</h3><div class="receivables-list">${group.entries.map(receivedIncomeCard).join("")}</div></div>`;
}

function receivedIncomeCard(item) {
  const receivedDate = item.paidDate || item.dueDate;
  return `
    <article class="receivable-card received-income-card">
      <div class="receivable-main"><h4>${escapeHtml(item.name)}</h4><time>Recebimento: ${formatDate(receivedDate, true)}</time><small>${escapeHtml(item.category || "Outros")}</small></div>
      <div class="receivable-value"><strong>${money(item.amount)}</strong><span>Recebido</span></div>
      <b class="received-date-badge"><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7"/><path d="m5.5 9 2.2 2.2 4.8-5"/></svg><span>Recebido em ${formatDate(receivedDate, true)}</span></b>
      <div class="receivable-actions received-income-actions">
        <details class="receivable-options"><summary aria-label="Mais opções"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div><button data-edit-transaction="${escapeAttribute(item.id)}">Editar</button><button class="danger" data-delete-transaction="${escapeAttribute(item.id)}">Excluir</button></div></details>
      </div>
    </article>`;
}

function paidExpenseDetailTemplate() {
  const items = paidExpenseItems();
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentMonth = monthKey();
  return `
    <section class="dashboard-detail-page receivables-page received-income-page paid-expense-page">
      <button class="receivables-back-header" data-close-paid-expenses aria-label="Voltar para a tela anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
        <span><strong>Despesas Pagas</strong><small>Confira suas despesas pagas no mês.</small></span>
      </button>
      <section class="receivables-section current received-income-section paid-expense-section">
        <header><i class="receivables-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.7 2.7L16.5 9"/></svg></i><div class="receivables-section-title"><span>Pago no mês</span><h2>Despesas Pagas</h2></div><div class="receivables-total"><small>Total pago</small><strong>${money(total)}</strong></div></header>
        <div class="receivables-month-group"><h3>${escapeHtml(payablesMonthLabel(currentMonth))}</h3><div class="receivables-list">${items.length ? items.map(paidExpenseCard).join("") : `<div class="receivables-empty">Nenhuma despesa paga neste mês.</div>`}</div></div>
      </section>
    </section>`;
}

function paidExpenseItems() {
  const currentMonth = monthKey();
  return dashboardTransactions()
    .filter(item => item.type !== "income" && isPaidStatus(item) && paidMonthKey(item) === currentMonth)
    .sort(compareTransactionsNewestFirst);
}

function paidExpenseCard(item) {
  const paidDate = item.paidDate || item.dueDate;
  const purchaseActions = item.source === "card-installment-virtual";
  return `
    <article class="receivable-card received-income-card paid-expense-card">
      <div class="receivable-main"><h4>${escapeHtml(item.name)}</h4><time>Pagamento: ${formatDate(paidDate, true)}</time><small>${escapeHtml(item.category || "Outros")}</small></div>
      <div class="receivable-value"><strong>${money(item.amount)}</strong><span>Pago</span></div>
      <b class="received-date-badge paid-date-badge"><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7"/><path d="m5.5 9 2.2 2.2 4.8-5"/></svg><span>Pago em ${formatDate(paidDate, true)}</span></b>
      <div class="receivable-actions received-income-actions paid-expense-actions">
        <details class="receivable-options"><summary aria-label="Mais opções"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div>${purchaseActions ? `<button data-edit-purchase="${escapeAttribute(item.sourcePurchaseId)}">Editar</button><button class="danger" data-delete-purchase="${escapeAttribute(item.sourcePurchaseId)}">Excluir</button>` : `<button data-edit-transaction="${escapeAttribute(item.id)}">Editar</button><button class="danger" data-delete-transaction="${escapeAttribute(item.id)}">Excluir</button>`}</div></details>
      </div>
    </article>`;
}

function receivablesDetailTemplate() {
  const current = monthKey();
  const items = pendingIncomeItems();
  const currentItems = items.filter(item => dueMonthKey(item) === current);
  const overdueItems = items.filter(item => dueMonthKey(item) < current);
  return `
    <section class="dashboard-detail-page receivables-page">
      <button class="receivables-back-header" data-close-receivables aria-label="Voltar para a tela anterior">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
        <span><strong>Receitas a Receber</strong><small>Acompanhe suas receitas pendentes</small></span>
      </button>
      ${receivablesSection("Receitas a Receber", currentItems, false, "Total do mês")}
      ${receivablesSection("Receitas Atrasadas", overdueItems, true, "Total atrasado")}
    </section>`;
}

function receivablesSection(title, items, overdue, totalLabel) {
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const groups = groupReceivablesByMonth(items);
  return `
    <section class="receivables-section ${overdue ? "overdue" : "current"}">
      <header><i class="receivables-section-icon" aria-hidden="true">${overdue ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v6M12 17v.2"/></svg>` : `<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/></svg>`}</i><div class="receivables-section-title"><span>${overdue ? "Pendências anteriores" : "Mês atual"}</span><h2>${title}</h2></div><div class="receivables-total"><small>${totalLabel}</small><strong>${money(total)}</strong></div></header>
      ${groups.length ? groups.map(group => receivablesMonthGroup(group, overdue)).join("") : `<div class="receivables-empty">Nenhuma receita ${overdue ? "atrasada" : "pendente neste mês"}.</div>`}
    </section>`;
}

function groupReceivablesByMonth(items) {
  const groups = new Map();
  items.forEach(item => {
    const key = dueMonthKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()].map(([key, entries]) => ({ key, entries }));
}

function receivablesMonthGroup(group, overdue) {
  const [year, month] = group.key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return `<div class="receivables-month-group"><h3>${escapeHtml(label.charAt(0).toUpperCase() + label.slice(1))}</h3><div class="receivables-list">${group.entries.map(item => receivableCard(item, overdue)).join("")}</div></div>`;
}

function receivableCard(item, overdue) {
  const days = overdueDays(item);
  return `
    <article class="receivable-card ${overdue ? "overdue" : ""}">
      <div class="receivable-main"><h4>${escapeHtml(item.name)}</h4><time>Vencimento: ${formatDate(item.dueDate, true)}</time><small>${escapeHtml(item.category || "Outros")}</small></div>
      <div class="receivable-value"><strong>${money(item.amount)}</strong><span>A receber</span></div>
      ${overdue ? `<b class="overdue-badge"><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7"/><path d="M9 5.2v5M9 13v.2"/></svg><span>Atrasado ${days} ${days === 1 ? "dia" : "dias"}</span></b>` : ""}
      <div class="receivable-actions">
        <button class="receive-compact-action" data-pay-transaction="${escapeAttribute(item.id)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Receber</span></button>
        <details class="receivable-options"><summary aria-label="Mais opções"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div><button data-edit-transaction="${escapeAttribute(item.id)}">Editar</button><button class="danger" data-delete-transaction="${escapeAttribute(item.id)}">Excluir</button></div></details>
      </div>
    </article>`;
}

function overdueDays(item) {
  const due = new Date(`${item.dueDate}T12:00:00`);
  const today = new Date(`${dateOffset()}T12:00:00`);
  return Math.max(1, Math.floor((today - due) / 86400000));
}

function pendingIncomeItems() {
  return userTransactions()
    .filter(item => item.type === "income" && !isPaidStatus(item))
    .sort((a, b) => String(b.dueDate || "").localeCompare(String(a.dueDate || "")));
}

function invoiceDetailRows() {
  const rows = userCardPurchases().filter(purchase => {
    const info = installmentInfo(purchase);
    return info.active && !info.paid;
  }).map(purchaseRow);
  return rows.join("") || `<div class="empty">Nenhuma parcela pendente na fatura.</div>`;
}

function financialDashboard() {
  const current = monthKey();
  const items = dashboardTransactions();
  const monthTransactions = items.filter(item => dueMonthKey(item) === current);
  const receivedItemsMonth = items.filter(item => item.type === "income" && isPaidStatus(item) && paidMonthKey(item) === current);
  const paidItemsMonth = items.filter(item => item.type !== "income" && isPaidStatus(item) && paidMonthKey(item) === current);
  const pendingItemsMonth = items.filter(item => !isPaidStatus(item) && dueMonthKey(item) === current);
  const monthIncome = [...receivedItemsMonth, ...pendingItemsMonth.filter(item => item.type === "income")].reduce((sum, item) => sum + item.amount, 0);
  const monthExpense = [...paidItemsMonth, ...pendingItemsMonth.filter(item => item.type !== "income")].reduce((sum, item) => sum + item.amount, 0);
  const receivedMonth = receivedItemsMonth.reduce((sum, item) => sum + item.amount, 0);
  const toReceiveMonth = pendingItemsMonth.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const paidMonth = paidItemsMonth.reduce((sum, item) => sum + item.amount, 0);
  const toPayMonth = pendingItemsMonth
    .filter(item => item.type === "expense" && item.source !== "card-installment-virtual")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = receivedMonth - paidMonth;
  const today = dateOffset();
  const seven = dateOffset(7);
  const pendingBills = items.filter(item => item.status === "pending" && item.type !== "income");
  const invoice = currentInvoice();
  const limit = totalCardLimit();
  const overdueItems = pendingBills.filter(item => item.dueDate < today);
  return {
    balance,
    monthIncome,
    monthExpense,
    invoice,
    availableLimit: availableCardLimit(),
    dueToday: pendingBills.filter(item => item.dueDate === today).length,
    dueSoon: pendingBills.filter(item => item.dueDate > today && item.dueDate <= seven).length,
    overdue: overdueItems.length,
    overdueAmount: overdueItems.reduce((sum, item) => sum + item.amount, 0),
    receivedMonth,
    toReceiveMonth,
    paidMonth,
    toPayMonth,
    upcomingRows: upcomingDueRows(pendingBills),
    cardSummaries: cardSummaryRows()
  };
}

function balanceAuditTemplate() {
  const current = monthKey();
  const dashboard = financialDashboard();
  const items = dashboardTransactions();
  const monthItems = items.filter(item => isPaidStatus(item) ? paidMonthKey(item) === current : dueMonthKey(item) === current);
  const incomeItems = monthItems.filter(item => item.type === "income");
  const manualExpenseItems = monthItems.filter(item => item.type !== "income" && item.source !== "card-installment-virtual");
  const cardItems = monthItems.filter(item => item.source === "card-installment-virtual");
  const allPaidIncome = items.filter(item => item.type === "income" && isPaidStatus(item));
  const allPaidExpenses = items.filter(item => item.type !== "income" && isPaidStatus(item));
  const totals = {
    paidIncome: incomeItems.filter(isPaidStatus).reduce((sum, item) => sum + item.amount, 0),
    pendingIncome: incomeItems.filter(item => !isPaidStatus(item)).reduce((sum, item) => sum + item.amount, 0),
    paidExpenses: manualExpenseItems.filter(isPaidStatus).reduce((sum, item) => sum + item.amount, 0),
    pendingExpenses: manualExpenseItems.filter(item => !isPaidStatus(item)).reduce((sum, item) => sum + item.amount, 0),
    paidCard: cardItems.filter(isPaidStatus).reduce((sum, item) => sum + item.amount, 0),
    pendingCard: cardItems.filter(item => !isPaidStatus(item)).reduce((sum, item) => sum + item.amount, 0),
    allPaidIncome: allPaidIncome.reduce((sum, item) => sum + item.amount, 0),
    allPaidExpenses: allPaidExpenses.reduce((sum, item) => sum + item.amount, 0)
  };
  return `
    <section class="dashboard-detail-page audit-page">
      <div class="page-title"><span class="eyebrow">Ferramenta temporária</span><h1>Auditoria do Saldo</h1><p>Mostrando somente dados do usuário logado: ${escapeHtml(currentUser()?.name || "")}</p></div>
      <button class="secondary-button back-button" data-view="home">Voltar ao início</button>
      <article class="audit-formula">
        <span>Fórmula usada hoje</span>
        <strong>Saldo atual do mês = receitas recebidas no mês - despesas pagas no mês - parcelas/faturas de cartão pagas no mês</strong>
        <p>${money(totals.paidIncome)} - ${money(totals.paidExpenses)} - ${money(totals.paidCard)} = <b>${money(dashboard.balance)}</b></p>
        <small>Cards do mês: Receitas ${money(dashboard.monthIncome)} · Despesas ${money(dashboard.monthExpense)}</small>
        <small>Comparativo antigo: todos os períodos dariam ${money(totals.allPaidIncome - totals.allPaidExpenses)}</small>
      </article>
      ${auditTotalsTemplate(totals, dashboard.balance)}
      ${auditSectionTemplate("Receitas consideradas no mês", incomeItems, "income")}
      ${auditSectionTemplate("Despesas consideradas no mês", manualExpenseItems, "expense")}
      ${auditSectionTemplate("Parcelas/faturas de cartão consideradas no mês", cardItems, "card")}
    </section>`;
}

function auditTotalsTemplate(totals, balance) {
  return `
    <div class="audit-grid">
      ${auditTotalCard("Total receitas pagas", totals.paidIncome, "positive")}
      ${auditTotalCard("Total receitas pendentes", totals.pendingIncome)}
      ${auditTotalCard("Total despesas pagas", totals.paidExpenses, "negative")}
      ${auditTotalCard("Total despesas pendentes", totals.pendingExpenses)}
      ${auditTotalCard("Total parcelas cartão pagas", totals.paidCard, "negative")}
      ${auditTotalCard("Total parcelas cartão pendentes", totals.pendingCard)}
      ${auditTotalCard("Saldo calculado final", balance, balance >= 0 ? "positive" : "negative")}
    </div>`;
}

function auditTotalCard(label, value, tone = "") {
  return `<article class="audit-total ${tone}"><span>${label}</span><strong>${money(value)}</strong></article>`;
}

function auditSectionTemplate(title, items, type) {
  return `
    <article class="audit-section">
      <div class="section-header"><h2>${title}</h2><span class="list-count">${items.length}</span></div>
      ${items.length ? items.map(item => auditItemRow(item, type)).join("") : `<div class="empty">Nenhum item encontrado neste grupo.</div>`}
    </article>`;
}

function auditItemRow(item, type) {
  const purchase = item.sourcePurchaseId ? userCardPurchases().find(purchaseItem => purchaseItem.id === item.sourcePurchaseId) : null;
  const card = purchase ? userCards().find(cardItem => cardItem.id === purchase.cardId) : null;
  const origin = auditOriginLabel(item);
  if (type === "card") {
    return `
      <div class="audit-row">
        <strong>${escapeHtml(item.cardName || card?.name || "Cartão")}</strong>
        <span>Compra: ${escapeHtml(purchase?.name || item.name)} · Parcela: ${escapeHtml(item.sourceInstallment || item.name)}</span>
        <span>Valor: ${money(item.amount)} · Status: ${statusLabel(item)} · Vencimento: ${formatDate(item.dueDate, true)}</span>
        <small>Origem da tabela: ${origin}</small>
      </div>`;
  }
  return `
    <div class="audit-row">
      <strong>${escapeHtml(item.name)}</strong>
      <span>Valor: ${money(item.amount)} · Status: ${statusLabel(item)}</span>
      <span>Vencimento: ${formatDate(item.dueDate, true)} · Pagamento: ${item.paidDate ? formatDate(item.paidDate, true) : "Sem pagamento"}</span>
      <small>Origem da tabela: ${origin}</small>
    </div>`;
}

function auditOriginLabel(item) {
  if (item.source === "card-installment-virtual") return "parcelas/compras_cartao (gerada pelo app)";
  if (item.source === "card-installment") return "despesas (parcela de cartão paga)";
  return item.type === "income" ? "receitas" : "despesas";
}

function isPaidStatus(item) {
  return item.status === "paid" || item.status === "received";
}

function paidMonthKey(item) {
  return (item.paidDate || item.dueDate || "").slice(0, 7);
}

function dueMonthKey(item) {
  return (item.dueDate || "").slice(0, 7);
}

function upcomingDueRows(items) {
  const rows = items
    .filter(item => item.dueDate >= dateOffset())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map(item => {
      const days = daysBetween(dateOffset(), item.dueDate);
      const label = days === 0 ? "Hoje" : `Em ${days} dia${days === 1 ? "" : "s"}`;
      return `<article class="due-row"><div><strong>${escapeHtml(item.name)}</strong><span>${label} · ${formatDate(item.dueDate, true)}</span></div><b>${money(item.amount)}</b><small>${statusLabel(item)}</small></article>`;
    });
  return rows.join("") || `<div class="empty">Nenhum vencimento pendente.</div>`;
}

function daysBetween(start, end) {
  return Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000);
}

function cardSummaryRows() {
  const rows = userCards().slice(0, 3).map(card => {
    const invoice = currentInvoice(card.id);
    const dueDate = nextCardDueDate(card);
    const days = daysBetween(dateOffset(), dueDate);
    return `<article class="mini-card"><div><strong>${escapeHtml(card.name)}</strong><span>Fatura: ${money(invoice)} · Vence em ${days <= 0 ? "hoje" : `${days} dia${days === 1 ? "" : "s"}`}</span></div><small>Limite disponível: ${money(availableCardLimit(card.id))}</small></article>`;
  });
  return rows.join("") || `<div class="empty">Nenhum cartão cadastrado.</div>`;
}

function nextCardDueDate(card) {
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), Number(card.dueDay || 1), 12);
  if (localDateKey(due) < dateOffset()) due = new Date(now.getFullYear(), now.getMonth() + 1, Number(card.dueDay || 1), 12);
  return localDateKey(due);
}

function financialDashboardTemplate() {
  const dashboard = financialDashboard();
  return `
    <div class="page-title"><span class="eyebrow">Dashboard</span><h1>Visão financeira</h1><p>Resumo completo separado da tela inicial.</p></div>
    <button class="secondary-button back-button" data-view="home">Voltar ao início</button>
    <div class="dashboard-grid compact">
      ${dashboardShortcut("invoice", "Fatura atual", money(dashboard.invoice))}
      ${dashboardShortcut("cards", "Limite disponível", money(dashboard.availableLimit))}
      ${dashboardShortcut("today", "Vence hoje", dashboard.dueToday)}
      ${dashboardShortcut("soon", "Próximos 7 dias", dashboard.dueSoon)}
      ${dashboardShortcut("overdue", "Em atraso", dashboard.overdue, "danger-card")}
      ${dashboardShortcut("overdueValue", "Valor em atraso", money(dashboard.overdueAmount), "danger-card")}
      ${dashboardShortcut("received", "Recebido no mês", money(dashboard.receivedMonth))}
      ${dashboardShortcut("toReceive", "A receber no mês", money(dashboard.toReceiveMonth))}
      ${dashboardShortcut("paid", "Pago no mês", money(dashboard.paidMonth))}
      ${dashboardShortcut("toPay", "A pagar no mês", money(dashboard.toPayMonth))}
    </div>
    <div class="master-actions"><button class="primary-button" data-view="graphDashboard">Dashboard de gráficos</button></div>
    <div class="section-header"><h2>Resumo dos cartões</h2><button class="text-button" data-view="card">Ver cartões</button></div>
    <div class="card-list">${dashboard.cardSummaries}</div>
    <div class="section-header"><h2>Próximos vencimentos</h2></div>
    <div class="due-list">${dashboard.upcomingRows}</div>
    <div class="section-header"><h2>Contas atrasadas</h2></div>
    <div class="transaction-list">${dashboardDetailRows("overdue")}</div>
    <div class="section-header"><h2>Movimentações recentes</h2><button class="text-button" data-view="transactions">Ver todas</button></div>
    <div class="transaction-list">${transactionRows(dashboardTransactions().slice(0, 5))}</div>`;
}

function graphDashboardTemplate() {
  if (isMaster()) {
    return `
      <div class="page-title"><span class="eyebrow">Dashboard de gráficos</span><h1>Indicadores Master</h1><p>Gráficos administrativos, sem dados financeiros particulares.</p></div>
      <button class="secondary-button back-button" data-view="masterDashboard">Voltar ao Dashboard Master</button>
      ${chartBlock("Crescimento de usuários", barRows(userGrowthRows(), "number"))}
      ${chartBlock("Status dos usuários", barRows(masterStatusRows(), "number"))}
      ${chartBlock("Novos usuários e renovações", barRows(masterMovementRows(), "number"))}`;
  }
  const dashboard = financialDashboard();
  const items = dashboardTransactions();
  const current = monthKey();
  const monthItems = items.filter(item => isPaidStatus(item) ? paidMonthKey(item) === current : dueMonthKey(item) === current);
  const income = monthItems.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthItems.filter(item => item.type !== "income").reduce((sum, item) => sum + item.amount, 0);
  const paidBills = monthItems.filter(item => item.type !== "income" && isPaidStatus(item)).reduce((sum, item) => sum + item.amount, 0);
  const pendingBills = monthItems.filter(item => item.type !== "income" && !isPaidStatus(item)).reduce((sum, item) => sum + item.amount, 0);
  return `
    <div class="page-title"><span class="eyebrow">Dashboard de gráficos</span><h1>Análise visual</h1><p>Receitas, despesas, fluxo de caixa e cartões.</p></div>
    <button class="secondary-button back-button" data-view="financialDashboard">Voltar ao Dashboard</button>
    <div class="insight-grid">
      ${insightCard("Receitas x Despesas", `${money(income)} / ${money(expenses)}`, income >= expenses ? "positive" : "negative")}
      ${insightCard("Limite utilizado", money(pendingPurchaseTotal()), "warning")}
      ${insightCard("Faturas dos cartões", money(currentInvoice()), "warning")}
      ${insightCard("Saldo atual", money(dashboard.balance), dashboard.balance >= 0 ? "positive" : "negative")}
    </div>
    ${chartBlock("Receitas x Despesas", barRows([{ label: "Receitas", value: income }, { label: "Despesas", value: expenses }]))}
    ${chartBlock("Fluxo de caixa", barRows(balanceTrend()))}
    ${chartBlock("Cartões", barRows(userCards().map(card => ({ label: card.name, value: pendingPurchaseTotal(card.id) }))))}
    ${chartBlock("Contas atrasadas", barRows(categoryTotals(dashboardTransactions().filter(item => item.status === "pending" && item.type !== "income" && item.dueDate < dateOffset()))))}
    ${chartBlock("Gastos por categoria", barRows(categoryTotals(monthItems.filter(item => item.type !== "income"))))}
    ${chartBlock("Evolução mensal", barRows(balanceTrend()))}
    ${chartBlock("Contas pagas x pendentes", barRows([{ label: "Pagas", value: paidBills }, { label: "Pendentes", value: pendingBills }]))}
    ${chartBlock("Recebido x A receber", barRows([{ label: "Recebido", value: dashboard.receivedMonth }, { label: "A receber", value: dashboard.toReceiveMonth }]))}
    ${chartBlock("Pago x A pagar", barRows([{ label: "Pago", value: dashboard.paidMonth }, { label: "A pagar", value: dashboard.toPayMonth }]))}`;
}

function masterDashboardTemplate() {
  const metrics = masterMetrics();
  const users = regularUsers();
  const active = users.filter(user => !isAccessBlocked(user)).length;
  const expired = users.filter(isExpired).length;
  const blocked = users.filter(user => user.blocked).length;
  return `
    <div class="page-title"><span class="eyebrow">Dashboard master</span><h1>Indicadores administrativos</h1><p>Sem dados financeiros particulares dos usuários.</p></div>
    <button class="secondary-button back-button" data-view="home">Voltar ao painel</button>
    <div class="insight-grid">
      ${insightCard("Total de usuários", metrics.total, "neutral")}
      ${insightCard("Usuários ativos", metrics.active, "positive")}
      ${insightCard("Usuários vencidos", metrics.expired, "negative")}
      ${insightCard("Vencendo em 7 dias", metrics.expiring, "warning")}
      ${insightCard("Novos usuários do mês", metrics.newUsersMonth, "neutral")}
      ${insightCard("Renovações do mês", metrics.renewalsMonth, "positive")}
      ${insightCard("Receita prevista", money(metrics.forecast), "positive")}
      ${insightCard("Usuários bloqueados", metrics.blocked, "negative")}
    </div>
    <div class="master-actions"><button class="primary-button" data-view="graphDashboard">Dashboard de gráficos</button></div>
    ${chartBlock("Crescimento de usuários", barRows(userGrowthRows(), "number"))}
    ${chartBlock("Status dos usuários", barRows(masterStatusRows(), "number"))}
    <div class="dashboard-note"><b>Privacidade preservada</b><span>Este dashboard mostra apenas métricas administrativas de acesso.</span></div>`;
}

function insightCard(label, value, tone = "neutral") {
  return `<article class="insight-card ${tone}"><span>${label}</span><strong>${value}</strong></article>`;
}

function chartBlock(title, rows) {
  return `<section class="chart-card"><div class="section-header"><h2>${title}</h2></div><div class="chart-list">${rows || `<div class="empty">Sem dados para exibir.</div>`}</div></section>`;
}

function categoryTotals(items) {
  const totalsByCategory = new Map();
  items.forEach(item => totalsByCategory.set(item.category || "Outros", (totalsByCategory.get(item.category || "Outros") || 0) + item.amount));
  return [...totalsByCategory].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
}

function balanceTrend() {
  const items = dashboardTransactions();
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (3 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const value = items
      .filter(item => paidMonthKey(item) === key && isPaidStatus(item))
      .reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);
    return { label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date), value };
  });
}

function userGrowthRows() {
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (3 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
      value: regularUsers().filter(user => user.createdAt?.slice(0, 7) <= key).length
    };
  });
}

function masterStatusRows() {
  const users = regularUsers();
  return [
    { label: "Ativos", value: users.filter(user => !isAccessBlocked(user)).length },
    { label: "Vencendo", value: users.filter(user => !isAccessBlocked(user) && daysUntilExpiry(user) <= 7).length },
    { label: "Vencidos", value: users.filter(isExpired).length },
    { label: "Bloqueados", value: users.filter(user => user.blocked).length }
  ];
}

function masterMovementRows() {
  const metrics = masterMetrics();
  return [
    { label: "Novos usuários", value: metrics.newUsersMonth },
    { label: "Renovações", value: metrics.renewalsMonth }
  ];
}

function barRows(rows, format = "money") {
  if (!rows.length) return "";
  const max = Math.max(...rows.map(row => Math.abs(row.value)), 1);
  return rows.map(row => `
    <article class="chart-row">
      <div><strong>${escapeHtml(row.label)}</strong><span>${format === "number" ? row.value : money(row.value)}</span></div>
      <i><b style="width:${Math.min(Math.abs(row.value) / max * 100, 100)}%"></b></i>
    </article>`).join("");
}

function metricTile(label, value, tone, scope) {
  return `<button class="metric-tile ${tone}" data-user-scope="${scope}"><span>${label}</span><strong>${value}</strong><small>Ver usuários →</small></button>`;
}

function transactionRows(items, showOwner = false, allowActions = false, itemClass = () => "") {
  if (!items.length) return `<div class="empty">Nenhuma movimentação encontrada.</div>`;
  return items.map(item => `
    <article class="transaction ${item.type} ${itemClass(item)}">
      <div class="transaction-icon">${iconFor(item.category, item.type)}</div>
      <div><h3>${escapeHtml(item.name)}</h3><p>${transactionDescription(item, showOwner)}</p>${paymentMeta(item)}</div>
      <div class="transaction-value">
        <strong class="${item.type === "income" ? "positive" : "negative"}">${item.type === "income" ? "+" : "-"} ${money(item.amount)}</strong>
        <span class="status ${isPaidStatus(item) ? "" : "pending"}">${statusLabel(item)}</span>
      </div>
      ${allowActions ? transactionActionButtons(item) : ""}
    </article>`).join("");
}

function paymentMeta(item) {
  const details = [];
  if (item.paymentMethod) details.push(item.paymentMethod);
  if (item.account) details.push(item.account);
  if (item.paidDate) details.push(`Pago em ${formatDate(item.paidDate, true)}`);
  if (item.paidTime) details.push(item.paidTime);
  return details.length ? `<small class="payment-meta">${details.map(escapeHtml).join(" · ")}</small>` : "";
}

function transactionActionButtons(item) {
  if (item.source === "card-installment-virtual") {
    return `<div class="transaction-actions">
      ${!isPaidStatus(item) ? `<button data-pay-installment="${item.sourcePurchaseId}" data-installment-key="${item.sourceInstallment}">Marcar parcela como paga</button>` : ""}
      <button data-view-installments="${item.sourcePurchaseId}">Ver parcelas</button>
      <button data-edit-purchase="${item.sourcePurchaseId}">Editar compra</button>
      <button class="danger" data-delete-purchase="${item.sourcePurchaseId}">Excluir compra</button>
    </div>`;
  }
  return `<div class="transaction-actions">
    <button data-edit-transaction="${item.id}">Editar</button>
    ${!isPaidStatus(item) ? `<button data-pay-transaction="${item.id}">${item.type === "income" ? "Marcar como recebido" : "Marcar como pago"}</button>` : ""}
    <button class="danger" data-delete-transaction="${item.id}">Excluir</button>
  </div>`;
}

function transactionDescription(item, showOwner = false) {
  const owner = showOwner ? `${escapeHtml(item.ownerName || "")} · ` : "";
  if (item.source === "card-installment-virtual") {
    return `${owner}Compra no cartão - ${escapeHtml(item.cardName || item.account || "Cartão")} · Categoria: ${escapeHtml(item.category)} · ${formatDate(item.dueDate)}`;
  }
  if (item.source === "card-installment") {
    const purchase = userCardPurchases(item.ownerId || session).find(p => p.id === item.sourcePurchaseId);
    const card = userCards(item.ownerId || session).find(c => c.id === purchase?.cardId);
    return `${owner}Compra no cartão${card ? ` - ${escapeHtml(card.name)}` : ""} · Categoria: ${escapeHtml(item.category)} · ${formatDate(item.dueDate)}`;
  }
  return `${owner}${escapeHtml(item.category)} · ${formatDate(item.dueDate)}${item.repeat === "fixed" ? " · Mensal" : ""}`;
}

function statusLabel(item) {
  if (item.type === "income") return isPaidStatus(item) ? "Recebido" : "A receber";
  return isPaidStatus(item) ? "Pago" : "Não pago";
}

function transactionsTemplate() {
  const filtered = filteredHistoryTransactions();
  return `
    <header class="transactions-page-header"><h1>Transações</h1><p>Acompanhe tudo que entra e sai.</p></header>
    <div class="transaction-filters" role="group" aria-label="Filtrar transações">
      ${filterButton("all", "Todas")}${filterButton("income", "Receitas")}${filterButton("expense", "Despesas")}${filterButton("card", "Cartões")}
    </div>
    <label class="transaction-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>
      <input type="search" data-transaction-search value="${escapeAttribute(transactionSearch)}" placeholder="Buscar transação..." autocomplete="off">
    </label>
    ${transactionAdvancedFiltersTemplate()}
    ${transactionActiveFilterChips()}
    <div class="transaction-history-list" data-transaction-results>${transactionHistoryRows(filtered)}</div>`;
}

function transactionAdvancedFiltersTemplate() {
  const activeCount = Number(transactionStatusFilter !== "all") + Number(transactionPeriodFilter !== "all");
  return `
    <div class="transaction-filter-toolbar">
      <details class="transaction-advanced-filters">
        <summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg><span>Filtros${activeCount ? ` (${activeCount})` : ""}</span></summary>
        <div class="transaction-filter-panel">
          <section><strong>Status</strong><div>${[["all", "Ambos"], ["paid", "Pago"], ["unpaid", "Não pago"]].map(([value, label]) => `<button type="button" class="${transactionStatusFilter === value ? "active" : ""}" data-transaction-status-option="${value}">${label}</button>`).join("")}</div></section>
          <section><strong>Período</strong><div>${[["all", "Todos"], ["today", "Hoje"], ["week", "Semana"], ["month", "Mês"]].map(([value, label]) => `<button type="button" class="${transactionPeriodFilter === value ? "active" : ""}" data-transaction-period-option="${value}">${label}</button>`).join("")}</div></section>
          <footer><button type="button" data-clear-transaction-filters>Limpar filtros</button><button type="button" class="apply" data-apply-transaction-filters>Aplicar filtros</button></footer>
        </div>
      </details>
    </div>`;
}

function transactionActiveFilterChips() {
  const chips = [];
  const statusLabels = { paid: "Pago", unpaid: "Não pago" };
  const periodLabels = { today: "Hoje", week: "Esta semana", month: "Este mês" };
  if (statusLabels[transactionStatusFilter]) chips.push(`<button type="button" data-remove-transaction-filter="status">${statusLabels[transactionStatusFilter]} <span>×</span></button>`);
  if (periodLabels[transactionPeriodFilter]) chips.push(`<button type="button" data-remove-transaction-filter="period">${periodLabels[transactionPeriodFilter]} <span>×</span></button>`);
  return chips.length ? `<div class="transaction-filter-chips" aria-label="Filtros ativos">${chips.join("")}</div>` : "";
}

function filteredHistoryTransactions() {
  const search = normalizeTransactionSearch(transactionSearch);
  return transactionHistoryItems()
    .filter(item => {
      const cardItem = isCardHistoryItem(item);
      if (transactionFilter === "card") return cardItem;
      if (transactionFilter === "income") return !cardItem && item.type === "income";
      if (transactionFilter === "expense") return !cardItem && item.type === "expense";
      return true;
    })
    .filter(item => transactionStatusFilter === "all" || (transactionStatusFilter === "paid" ? isPaidStatus(item) : !isPaidStatus(item)))
    .filter(item => transactionMatchesPeriod(item, transactionPeriodFilter))
    .filter(item => {
      if (!search) return true;
      const searchable = [
        item.name,
        item.category,
        item.paymentMethod,
        item.account,
        item.cardName,
        transactionHistoryStatus(item).label,
        transactionPeriodicity(item),
        String(Number(item.amount || 0)),
        Number(item.amount || 0).toFixed(2),
        money(item.amount),
        item.dueDate,
        formatDate(item.dueDate, true),
        item.paidDate,
        item.paidDate ? formatDate(item.paidDate, true) : "",
        transactionMovementDateTime(item)
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
      return searchable.includes(search);
    })
    .sort(compareTransactionsNewestFirst);
}

function transactionMatchesPeriod(item, period) {
  if (period === "all") return true;
  const movementDate = transactionSortValue(item).trim().split(" ")[0] || item.dueDate || "";
  if (!movementDate) return false;
  const today = dateOffset();
  if (period === "today") return movementDate === today;
  if (period === "month") return movementDate.slice(0, 7) === today.slice(0, 7);
  if (period === "week") {
    const todayDate = new Date(`${today}T12:00:00`);
    const movement = new Date(`${movementDate}T12:00:00`);
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - (todayDate.getDay() + 6) % 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return movement >= weekStart && movement <= weekEnd;
  }
  return true;
}

function transactionHistoryItems() {
  const regularItems = userTransactions().filter(item => item.source !== "card-installment");
  const cardItems = userCardPurchases().map(purchase => {
    const card = userCards().find(item => item.id === purchase.cardId);
    const current = installmentInfo(purchase);
    const next = nextPendingInstallment(purchase);
    const installmentNumber = current.active ? current.current : (next?.number || purchase.installments);
    const dueDate = installmentDueDate(purchase, installmentNumber);
    const installmentKey = `${monthKey(dueDate)}-${installmentNumber}`;
    const paid = (purchase.paidInstallments || []).includes(installmentKey);
    const payment = purchase.installmentPayments?.[installmentKey] || {};
    return {
      id: `${purchase.id}-${installmentKey}`,
      source: "card-installment-virtual",
      sourcePurchaseId: purchase.id,
      sourceInstallment: installmentKey,
      name: purchase.name,
      amount: Number(purchase.amount || 0) / Number(purchase.installments || 1),
      type: "expense",
      repeat: "none",
      dueDate,
      paidDate: payment.paidDate || "",
      paidTime: payment.paidTime || "",
      paymentMethod: payment.paymentMethod || "",
      status: paid ? "paid" : "pending",
      category: purchase.category || "Outros",
      account: card?.name || "Cartão",
      cardName: card?.name || "Cartão"
    };
  });
  return [...regularItems, ...cardItems];
}

function transactionHistoryRows(items) {
  if (!items.length) {
    const filtered = transactionFilter !== "all" || transactionStatusFilter !== "all" || transactionPeriodFilter !== "all" || transactionSearch.trim();
    return `<div class="empty transaction-history-empty">${filtered ? "Nenhuma transação encontrada para este filtro." : "Nenhuma transação encontrada."}</div>`;
  }
  return groupHistoryTransactions(items).map(group => `
    <section class="transaction-month-group">
      <h2>${escapeHtml(transactionMonthLabel(group.key))}</h2>
      <div class="transaction-month-list">${group.items.map(transactionHistoryCard).join("")}</div>
    </section>`).join("");
}

function normalizeTransactionSearch(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function isCardHistoryItem(item) {
  return Boolean(item.sourcePurchaseId || item.type === "card" || item.source === "card-installment" || item.source === "card-installment-virtual");
}

function transactionPeriodicity(item) {
  return item.repeat === "fixed" ? "Mensal" : item.repeat === "none" || !item.repeat ? "Não repete" : String(item.repeat);
}

function groupHistoryTransactions(items) {
  const groups = new Map();
  items.forEach(item => {
    const date = transactionSortValue(item).trim().split(" ")[0] || item.dueDate || "";
    const key = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "unknown";
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()].map(([key, entries]) => ({ key, items: entries.sort(compareTransactionsNewestFirst) }));
}

function transactionMonthLabel(key) {
  if (key === "unknown") return "Sem data";
  const [year, month] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function transactionHistoryCard(item) {
  return isCardHistoryItem(item) ? cardHistoryTransaction(item) : regularHistoryTransaction(item);
}

function regularHistoryTransaction(item) {
  const status = transactionHistoryStatus(item);
  return `
    <article class="transaction history-transaction ${item.type} status-${status.className}">
      <div class="transaction-icon">${categoryIconSvg(item.category || "Outros")}</div>
      <div class="history-transaction-main">
        <h3>${escapeHtml(item.name)}</h3>
        <time>${transactionMovementDateTime(item)}</time>
        <p>${escapeHtml(item.category || "Outros")} · ${escapeHtml(transactionPeriodicity(item))}</p>
        <small>${transactionPaymentOrigin(item)}</small>
      </div>
      <div class="transaction-value">
        <strong class="${item.type === "income" ? "history-income-value" : "history-expense-value"}">${item.type === "income" ? "+" : "-"} ${money(item.amount)}</strong>
        <span class="status ${status.className}">${status.label}</span>
      </div>
      ${transactionHistoryActions(item)}
    </article>`;
}

function cardHistoryTransaction(item) {
  const purchase = item.sourcePurchaseId ? userCardPurchases(item.ownerId || session).find(entry => entry.id === item.sourcePurchaseId) : null;
  const card = purchase ? userCards(item.ownerId || session).find(entry => entry.id === purchase.cardId) : null;
  const installmentNumber = Number(String(item.sourceInstallment || "").split("-").pop()) || 1;
  const installments = Number(purchase?.installments || 1);
  const status = transactionHistoryStatus(item);
  return `
    <article class="transaction history-transaction card-history-transaction status-${status.className}">
      <div class="transaction-icon">${categoryIconSvg(item.category || purchase?.category || "Outros")}</div>
      <div class="history-transaction-main">
        <span class="card-history-name">${escapeHtml(item.cardName || card?.name || item.account || "Cartão")}</span>
        <h3>${escapeHtml(purchase?.name || item.name)}</h3>
        <time>${transactionMovementDateTime(item)}</time>
        <p>${escapeHtml(item.category || purchase?.category || "Outros")} · Parcela ${installmentNumber}/${installments}</p>
        <small>${transactionPaymentOrigin(item)}</small>
      </div>
      <div class="transaction-value">
        <strong class="history-expense-value">- ${money(item.amount)}</strong>
        <span class="status ${status.className}">${status.label}</span>
      </div>
      ${transactionHistoryActions(item)}
    </article>`;
}

function transactionHistoryStatus(item) {
  if (isPaidStatus(item)) return { label: item.type === "income" ? "Recebido" : "Pago", className: "paid" };
  if (item.dueDate && item.dueDate < dateOffset()) return { label: "Atrasado", className: "overdue" };
  return { label: item.type === "income" ? "A receber" : "Não pago", className: "pending" };
}

function transactionHistoryActions(item) {
  const cardItem = isCardHistoryItem(item);
  let actions = "";
  if (cardItem && item.sourcePurchaseId) {
    actions = `<button type="button" data-view-installments="${escapeAttribute(item.sourcePurchaseId)}">Ver parcelas</button><button type="button" data-edit-purchase="${escapeAttribute(item.sourcePurchaseId)}">Editar compra</button><button type="button" class="danger" data-delete-purchase="${escapeAttribute(item.sourcePurchaseId)}">Excluir compra</button>`;
  } else {
    actions = `${!isPaidStatus(item) ? `<button type="button" data-pay-transaction="${escapeAttribute(item.id)}">${item.type === "income" ? "Marcar como recebido" : "Marcar como pago"}</button>` : ""}<button type="button" data-edit-transaction="${escapeAttribute(item.id)}">Editar</button><button type="button" class="danger" data-delete-transaction="${escapeAttribute(item.id)}">Excluir</button>`;
  }
  return `<details class="receivable-options transaction-options"><summary aria-label="Mais opções de ${escapeAttribute(item.name)}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="10" cy="16" r="1.2"/></svg></summary><div>${actions}</div></details>`;
}

function transactionMovementDateTime(item) {
  const [date = "", time = ""] = transactionSortValue(item).trim().split(" ");
  return `${formatDate(date, true)} — ${time ? time.slice(0, 5) : "Sem horário"}`;
}

function transactionPaymentOrigin(item) {
  if (item.source === "card-installment-virtual" || item.source === "card-installment") {
    const purchase = item.sourcePurchaseId ? userCardPurchases(item.ownerId || session).find(entry => entry.id === item.sourcePurchaseId) : null;
    const card = purchase ? userCards(item.ownerId || session).find(entry => entry.id === purchase.cardId) : null;
    return escapeHtml(item.cardName || card?.name || item.account || "Cartão");
  }
  const details = [...new Set([item.paymentMethod, item.account].filter(Boolean))];
  return escapeHtml(details.join(" · ") || "Sem forma de pagamento");
}

function categoryIconSvg(item) {
  if (item.type === "income") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-5 5m5-5 5 5"/><path d="M5 19h14"/></svg>`;
  const category = String(item.category || "").toLocaleLowerCase("pt-BR");
  if (/aliment|comida|mercado/.test(category)) return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v7a3 3 0 0 0 3 3V3M7 7h3M8.5 13v8M16 3v18M16 3c3 2 3 7 0 9"/></svg>`;
  if (/combust|gasolina/.test(category)) return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M4 21h13M7 7h7v5H7zM16 8h2l2 2v7a2 2 0 0 1-2 2h-2"/></svg>`;
  if (/celular|telefone/.test(category)) return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10 18h4"/></svg>`;
  if (/cartão|cartao/.test(category) || item.sourcePurchaseId) return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 9h18M7 15h4"/></svg>`;
  if (/moradia|casa/.test(category)) return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10h-6v-6H9v6H3z"/></svg>`;
  if (/serviço|servico/.test(category)) return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6 4-4 4 4-4 4M18 2v8M4 20l7-7M8 4l12 12-4 4L4 8z"/></svg>`;
  if (/lazer|entretenimento/.test(category)) return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8M12 8v8"/></svg>`;
}

function transactionSortValue(item) {
  const createdDate = item.createdAt?.slice(0, 10) || "";
  const createdTime = item.createdAt?.slice(11, 19) || "";
  const date = isPaidStatus(item) ? (item.paidDate || createdDate || item.dueDate || "") : (createdDate || item.dueDate || "");
  const time = isPaidStatus(item) ? (item.paidTime || createdTime || "") : createdTime;
  return `${date} ${time}`;
}

function transactionSortTimestamp(item) {
  const value = transactionSortValue(item).trim();
  if (!value) return 0;
  const [date, time = "00:00:00"] = value.split(" ");
  const timestamp = new Date(`${date}T${time || "00:00:00"}`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareTransactionsNewestFirst(a, b) {
  const diff = transactionSortTimestamp(b) - transactionSortTimestamp(a);
  if (diff !== 0) return diff;
  return String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || ""));
}

function filterButton(value, label) {
  return `<button type="button" class="${transactionFilter === value ? "active" : ""}" data-filter="${value}">${transactionFilterIconSvg(value)}<span>${label}</span></button>`;
}

function transactionFilterIconSvg(value) {
  const paths = value === "income"
    ? `<circle cx="12" cy="12" r="8"/><path d="m8.5 13.5 3.5-3.5 3.5 3.5M12 10v7"/>`
    : value === "expense"
      ? `<circle cx="12" cy="12" r="8"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5M12 7v7"/>`
      : value === "card"
        ? `<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M7 15h4"/>`
        : `<path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function cardTemplate() {
  const cards = userCards();
  const limit = totalCardLimit();
  const usedLimit = pendingPurchaseTotal();
  const availableLimit = availableCardLimit();
  return `
    <div class="page-title"><span class="eyebrow">Cartões de crédito</span><h1>Meus Cartões</h1><p>Cadastre cartões e lance compras separadamente.</p></div>
    <article class="credit-card">
      <header><small>Limite total dos cartões</small><strong>${cards.length} cartão${cards.length === 1 ? "" : "ões"}</strong></header>
      <h2>${money(limit)}</h2>
      <div class="card-limit-grid three">
        <span>Total <b>${money(limit)}</b></span>
        <span>Utilizado <b>${money(usedLimit)}</b></span>
        <span>Disponível <b>${money(availableLimit)}</b></span>
      </div>
      <div class="card-progress"><i style="width:${limit ? Math.min(usedLimit / limit * 100, 100) : 0}%"></i></div>
    </article>
    <div class="section-header"><h2>Cartões cadastrados</h2><span class="list-count">${cards.length}</span></div>
    <div class="card-list">${cards.map(cardRow).join("") || `<div class="empty">Nenhum cartão cadastrado.</div>`}</div>`;
}

function cardPurchasesTemplate() {
  const cards = userCards();
  if (!selectedCardId && cards.length) selectedCardId = cards[0].id;
  if (selectedCardId && !cards.some(card => card.id === selectedCardId)) selectedCardId = cards[0]?.id || null;
  const selectedCard = cards.find(card => card.id === selectedCardId);
  const purchases = userCardPurchases().filter(purchase => !selectedCardId || purchase.cardId === selectedCardId);
  const pendingPurchases = purchases
    .filter(purchaseHasOpenInstallment)
    .sort((a, b) => (nextPendingInstallment(a)?.dueDate || "").localeCompare(nextPendingInstallment(b)?.dueDate || ""));
  const paidThisMonth = purchases
    .filter(purchasePaidThisMonth)
    .sort((a, b) => {
      const paidA = latestMonthlyPayment(a);
      const paidB = latestMonthlyPayment(b);
      return `${paidB?.paidDate || ""} ${paidB?.paidTime || ""}`.localeCompare(`${paidA?.paidDate || ""} ${paidA?.paidTime || ""}`);
    });
  if (!selectedCard) return `<div class="page-title"><span class="eyebrow">Compras</span><h1>Nenhum cartão</h1><p>Cadastre um cartão para lançar compras.</p></div><button class="primary-button" data-view="card">Voltar para cartões</button>`;
  return `
    <div class="page-title"><span class="eyebrow">Compras do cartão</span><h1>Compras - ${escapeHtml(selectedCard.name)}</h1><p>Gerencie compras, parcelas e pagamentos deste cartão.</p></div>
    <article class="mini-card selected">
      <div><strong>${escapeHtml(selectedCard.name)}</strong><span>${escapeHtml(selectedCard.brand)} · Fatura ${money(currentInvoice(selectedCard.id))}</span></div>
      <small>Limite disponível: ${money(availableCardLimit(selectedCard.id))}</small>
    </article>
    <div class="card-actions-row single">
      <button class="secondary-button" data-view="card">Voltar</button>
    </div>
    <div class="section-header"><h2>A Pagar</h2><span class="list-count">${pendingPurchases.length}</span></div>
    <div class="purchase-list">${pendingPurchases.map(purchaseRow).join("") || `<div class="empty">Nenhuma compra com parcela pendente.</div>`}</div>
    <div class="section-header"><h2>Pagas no Mês</h2><span class="list-count">${paidThisMonth.length}</span></div>
    <div class="purchase-list">${paidThisMonth.map(purchaseRow).join("") || `<div class="empty">Nenhuma parcela paga neste mês.</div>`}</div>`;
}

function purchaseHasOpenInstallment(purchase) {
  return Boolean(nextPendingInstallment(purchase));
}

function purchasePaidThisMonth(purchase) {
  const current = monthKey();
  return Object.values(purchase.installmentPayments || {}).some(payment => payment.paidDate?.slice(0, 7) === current);
}

function nextPendingInstallment(purchase) {
  for (let index = 1; index <= purchase.installments; index += 1) {
    const dueDate = installmentDueDate(purchase, index);
    const key = `${monthKey(dueDate)}-${index}`;
    if (!(purchase.paidInstallments || []).includes(key)) {
      return { number: index, dueDate, key, value: purchase.amount / purchase.installments };
    }
  }
  return null;
}

function latestMonthlyPayment(purchase) {
  const current = monthKey();
  return Object.entries(purchase.installmentPayments || {})
    .map(([key, payment]) => ({ key, ...payment }))
    .filter(payment => payment.paidDate?.slice(0, 7) === current)
    .sort((a, b) => `${b.paidDate} ${b.paidTime || ""}`.localeCompare(`${a.paidDate} ${a.paidTime || ""}`))[0] || null;
}

function purchaseEditorTemplate() {
  const cards = userCards();
  const editing = editingPurchaseId ? userCardPurchases().find(purchase => purchase.id === editingPurchaseId) : null;
  const title = editing ? "Editar compra" : "Nova compra";
  return `
    <div class="page-title"><span class="eyebrow">Compra no cartão</span><h1>${title}</h1><p>Informe os dados da compra e o parcelamento.</p></div>
    ${purchaseFormTemplate(cards)}
    <button class="secondary-button" data-view="cardPurchases">Voltar para compras</button>`;
}

function installmentsTemplate() {
  const purchase = userCardPurchases().find(item => item.id === selectedPurchaseId);
  if (!purchase) return `<div class="page-title"><span class="eyebrow">Parcelas</span><h1>Compra não encontrada</h1></div><button class="primary-button" data-view="cardPurchases">Voltar</button>`;
  const card = userCards().find(item => item.id === purchase.cardId);
  const rows = Array.from({ length: purchase.installments }, (_, index) => installmentRow(purchase, index + 1)).join("");
  return `
    <div class="page-title"><span class="eyebrow">Histórico de parcelas</span><h1>${escapeHtml(purchase.name)}</h1><p>${escapeHtml(card?.name || "Cartão")} · ${purchase.installments}x de ${money(purchase.amount / purchase.installments)}</p></div>
    <div class="purchase-list">${rows}</div>
    <button class="secondary-button" data-view="cardPurchases">Voltar para compras</button>`;
}

function cardFormTemplate() {
  const editing = editingCardId ? userCards().find(card => card.id === editingCardId) : null;
  return `
    <div class="card-modal-fields">
      <input type="hidden" name="id" value="${editing?.id || ""}">
      <label class="field"><span>Nome do cartão</span><input name="name" required value="${escapeAttribute(editing?.name || "")}" placeholder="Ex.: Nubank"></label>
      <label class="field"><span>Bandeira</span><select name="brand">${["Visa","Mastercard","Elo","American Express","Outro"].map(brand => `<option ${editing?.brand === brand ? "selected" : ""}>${brand}</option>`).join("")}</select></label>
      <label class="field"><span>Limite</span><div class="money-input"><b>R$</b><input name="limit" required inputmode="decimal" value="${editing ? String(editing.limit).replace(".", ",") : ""}" placeholder="0,00"></div></label>
      <div class="form-grid">
        <label class="field"><span>Fechamento</span><input name="closingDay" required type="number" min="1" max="31" value="${editing?.closingDay || ""}" placeholder="20"></label>
        <label class="field"><span>Vencimento</span><input name="dueDay" required type="number" min="1" max="31" value="${editing?.dueDay || ""}" placeholder="10"></label>
      </div>
      <button class="primary-button card-save-button" type="submit">Salvar cartão</button>
    </div>`;
}

function purchaseFormTemplate(cards) {
  const editing = editingPurchaseId ? userCardPurchases().find(purchase => purchase.id === editingPurchaseId) : null;
  const card = cards.find(item => item.id === (editing?.cardId || selectedCardId)) || cards[0];
  return `
    <form class="admin-form" id="purchase-form">
      <h2>${editing ? "Editar compra" : "Nova compra"}</h2>
      <input type="hidden" name="id" value="${editing?.id || ""}">
      <label class="field"><span>Cartão</span><select name="cardId">${cards.map(card => `<option value="${card.id}" ${(editing?.cardId || selectedCardId) === card.id ? "selected" : ""}>${escapeHtml(card.name)} - ${escapeHtml(card.brand)}</option>`).join("")}</select></label>
      <label class="field"><span>Nome da compra</span><input name="name" required value="${escapeAttribute(editing?.name || "")}" placeholder="Ex.: Celular"></label>
      <label class="field"><span>Valor total</span><div class="money-input"><b>R$</b><input name="amount" required inputmode="decimal" value="${editing ? String(editing.amount).replace(".", ",") : ""}" placeholder="0,00"></div></label>
      <div class="form-grid">
        <label class="field"><span>Pagamento</span><select name="installments">${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}" ${editing?.installments === index + 1 ? "selected" : ""}>${index === 0 ? "À vista" : `${index + 1}x`}</option>`).join("")}</select></label>
        <div class="field"><span>Data de fechamento da fatura</span><div class="static-field" data-invoice-info>Dia ${card?.closingDay || "-"} · Vence dia ${card?.dueDay || "-"}</div></div>
      </div>
      <label class="field"><span class="field-title">Categoria</span><select name="category">${userCategories().map(category => `<option ${editing?.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
      <label class="field"><span>Status</span><select name="status"><option value="pending">Pendente</option><option value="paid" ${editing && allInstallmentsPaid(editing) ? "selected" : ""}>Pago</option></select></label>
      <button class="primary-button">Salvar compra</button>
    </form>`;
}

function cardRow(card) {
  const invoice = currentInvoice(card.id);
  return `
    <article class="mini-card ${selectedCardId === card.id ? "selected" : ""}">
      <div><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.brand)} · Fecha dia ${card.closingDay} · Vence dia ${card.dueDay}</span></div>
      <b>${money(invoice)}</b>
      <small>Limite: ${money(card.limit)} · Disponível: ${money(availableCardLimit(card.id))}</small>
      <div class="row-actions">
        <button type="button" data-open-card-purchases="${card.id}">Ver compras</button>
        <button type="button" data-edit-card="${card.id}">Editar</button>
        <button type="button" class="invoice-action" data-pay-invoice="${card.id}">Pagar Fatura</button>
        <button type="button" class="danger" data-delete-card="${card.id}">Excluir</button>
      </div>
    </article>`;
}

function purchaseRow(purchase) {
  const card = userCards().find(item => item.id === purchase.cardId);
  const info = installmentInfo(purchase);
  const nextPending = nextPendingInstallment(purchase);
  const monthlyPayment = latestMonthlyPayment(purchase);
  const paidCount = (purchase.paidInstallments || []).length;
  const status = allInstallmentsPaid(purchase) ? "Quitada" : info.paid ? "Parcela do mês paga" : "Parcela pendente";
  return `
    <article class="purchase-row ${info.paid ? "paid" : ""}">
      <div class="purchase-main">
        <div><strong>${escapeHtml(purchase.name)}</strong><span>${escapeHtml(card?.name || "Cartão")} · ${formatDate(purchase.purchaseDate, true)}</span></div>
        <b>${money(info.value)}</b>
      </div>
      <small>Status: ${status} · Pagas ${paidCount}/${info.total} · Parcela ${info.total}x</small>
      ${nextPending ? `<small>Próxima pendente: ${nextPending.number}/${info.total} · Vence em ${formatDate(nextPending.dueDate, true)}</small>` : `<small>Próxima pendente: nenhuma</small>`}
      ${monthlyPayment ? `<small>Paga no mês: ${formatDate(monthlyPayment.paidDate, true)} ${escapeHtml(monthlyPayment.paidTime || "")}</small>` : ""}
      <div class="row-actions">
        ${nextPending ? `<button type="button" data-pay-installment="${purchase.id}" data-installment-key="${nextPending.key}">Marcar parcela como paga</button>` : ""}
        <button type="button" data-view-installments="${purchase.id}">Ver parcelas</button>
        <button type="button" data-edit-purchase="${purchase.id}">Editar</button>
        <button type="button" class="danger" data-delete-purchase="${purchase.id}">Excluir</button>
      </div>
    </article>`;
}

function installmentRow(purchase, installmentNumber) {
  const dueDate = installmentDueDate(purchase, installmentNumber);
  const key = `${monthKey(dueDate)}-${installmentNumber}`;
  const paid = (purchase.paidInstallments || []).includes(key);
  const payment = purchase.installmentPayments?.[key];
  const overdue = !paid && dueDate < dateOffset();
  const status = paid ? "Pago" : overdue ? "Atrasado" : "Pendente";
  return `
    <article class="purchase-row ${paid ? "paid" : overdue ? "overdue" : ""}">
      <div><strong>${formatDate(dueDate, true)} - ${status}</strong><span>Parcela ${installmentNumber}/${purchase.installments}</span></div>
      <b>${money(purchase.amount / purchase.installments)}</b>
      ${payment ? `<small>${escapeHtml(payment.paymentMethod)} · ${escapeHtml(payment.account)} · ${formatDate(payment.paidDate, true)} · ${escapeHtml(payment.paidTime)}</small>` : ""}
      ${!paid ? `<button type="button" data-pay-installment="${purchase.id}" data-installment-key="${key}">Marcar como paga</button>` : ""}
    </article>`;
}

function installmentDueDate(purchase, installmentNumber) {
  const date = new Date(`${purchase.purchaseDate}T12:00:00`);
  date.setMonth(date.getMonth() + installmentNumber - 1);
  return localDateKey(date);
}

function allInstallmentsPaid(purchase) {
  return (purchase.paidInstallments || []).length >= purchase.installments;
}

function profileTemplate() {
  const user = currentUser();
  return `
    <div class="page-title"><span class="eyebrow">Sua conta</span><h1>Perfil</h1></div>
    <article class="profile-card">
      <div class="profile-avatar">${initials(user.name)}</div>
      <h2>${escapeHtml(user.name)}</h2>
      <p>@${escapeHtml(user.username)} · ${user.role === "master" ? "Administrador master" : "Usuário"}</p>
      ${user.role === "user" ? `<div class="access-date">Acesso válido até <b>${formatDate(user.accessExpiresAt, true)}</b></div>` : ""}
    </article>
    <article class="app-version-card">
      <div>
        <span>Versão do Aplicativo</span>
        <h2>${escapeHtml(APP_NAME)}</h2>
        <p>Versão ${escapeHtml(window.APP_BUILD_CONFIG.version)}</p>
        <small>Última atualização: ${escapeHtml(APP_UPDATED_AT)}</small>
      </div>
      ${profileVersionActionsTemplate()}
      ${notificationBlockedNotice()}
    </article>
    <div class="menu-list">
      ${isMaster() ? `<button class="menu-item" data-view="users"><span>Gerenciar usuários</span><b>›</b></button><button class="menu-item" data-view="reports"><span>Relatórios individuais</span><b>›</b></button>` : ""}
      ${!isMaster() ? `<button class="menu-item" data-view="profileFinancialDashboard"><span>Dashboard Financeiro</span><b>›</b></button><button class="menu-item" data-view="categories"><span>Categorias</span><b>›</b></button>` : ""}
      ${!isMaster() ? `<button class="menu-item" data-view="activityLog"><span>Histórico de atividades</span><b>›</b></button>` : ""}
      <button class="menu-item" data-view="support"><span>${isMaster() ? "Menu Suporte" : "Falar com o Suporte"}</span><b>›</b></button>
      <button class="menu-item" data-view="security"><span>Segurança</span><b>›</b></button>
      <button class="menu-item danger" data-logout><span>Sair da conta</span><b>›</b></button>
    </div>`;
}

function categoryTypeLabel(type) {
  return type === "income" ? "Receita" : type === "expense" ? "Despesa" : "Ambas";
}

function categoryIconSvg(name = "") {
  const key = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const paths = key.includes("aliment")
    ? `<path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10v11M9.5 3v4.5A2.5 2.5 0 0 1 7 10M16.5 3v18M16.5 3c2.2 1.2 3 3.4 3 6.5h-3"/>`
    : key.includes("educ")
      ? `<path d="m3 9 9-5 9 5-9 5zM7 12v4.5c2.8 2 7.2 2 10 0V12M20 10v6"/>`
      : key.includes("lazer")
        ? `<path d="M7.5 8h9a4.5 4.5 0 0 1 4.2 6.1l-1.1 3a2 2 0 0 1-3.2.8L14.5 16h-5l-1.9 1.9a2 2 0 0 1-3.2-.8l-1.1-3A4.5 4.5 0 0 1 7.5 8zM7 11v4M5 13h4M16.5 12h.01M18.5 14h.01"/>`
        : key.includes("moradia") || key.includes("casa")
          ? `<path d="m3 11 9-7 9 7v9H6v-9M9 20v-6h6v6"/>`
          : key.includes("salario") || key.includes("receita")
            ? `<path d="M4 8h16v11H4zM9 8V5h6v3M4 12h16M10 12v2h4v-2"/>`
            : key.includes("saude")
              ? `<path d="M12 20s-8-4.6-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.4-8 10-8 10zM7.5 13h2l1.2-2.5 2.2 5 1.2-2.5h2.4"/>`
              : key.includes("transport")
                ? `<path d="M5 16h14l-1-7H6zM7 9l1-3h8l1 3M7 16v2M17 16v2M7.5 13h.01M16.5 13h.01"/>`
                : key.includes("servic")
                  ? `<path d="m14.5 6.5 3-3 3 3-3 3M16 8l-9.5 9.5M4 15l5 5M4 20l-1-1 3-7 6-3 3 3-3 6-7 3z"/>`
                  : key.includes("outro")
                    ? `<circle cx="12" cy="12" r="8"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>`
                    : `<path d="M4 7.5h6l1.7 2H20v8.8a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 18.3zM4 7.5V5.7A1.7 1.7 0 0 1 5.7 4h4.7l1.7 2H18"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function categoryFilterIconSvg(type) {
  const paths = type === "income"
    ? `<circle cx="12" cy="12" r="8"/><path d="m8.5 13.5 3.5-3.5 3.5 3.5M12 10v7"/>`
    : type === "expense"
      ? `<circle cx="12" cy="12" r="8"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5M12 7v7"/>`
      : type === "both"
        ? `<path d="M7 7h10l-2.5-2.5M17 17H7l2.5 2.5M17 7l-2.5 2.5M7 17l2.5-2.5"/>`
        : `<path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function filteredCategoryRecords() {
  const term = categorySearch.trim().toLocaleLowerCase("pt-BR");
  return userCategoryRecords().filter(item => {
    const matchesSearch = !term || item.name.toLocaleLowerCase("pt-BR").includes(term);
    const matchesType = categoryTypeFilter === "all" || item.type === categoryTypeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "pt-BR"));
}

function categoriesTemplate() {
  const items = filteredCategoryRecords();
  return `
    <button class="receivables-back-header" data-view="profile" aria-label="Voltar para a tela anterior">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
      <span><strong>Categorias</strong><small>Gerencie suas categorias de receitas e despesas.</small></span>
    </button>
    <section class="categories-hero">
      <div class="categories-hero-icon">${categoryIconSvg()}</div>
      <div><h2>Suas Categorias</h2><p>Crie, edite e organize categorias para receitas e despesas.</p></div>
      <button type="button" data-new-category aria-label="Nova categoria">+</button>
    </section>
    <label class="category-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/></svg><input value="${escapeAttribute(categorySearch)}" data-category-search placeholder="Buscar categoria..."></label>
    <div class="category-filters" role="group" aria-label="Filtrar categorias">
      ${[["all", "Todas"], ["income", "Receitas"], ["expense", "Despesas"], ["both", "Ambas"]].map(([value, label]) => `<button type="button" class="${categoryTypeFilter === value ? "active" : ""}" data-category-filter="${value}">${categoryFilterIconSvg(value)}<span>${label}</span></button>`).join("")}
    </div>
    <div class="category-management-list">
      ${items.length ? items.map(categoryManagementRow).join("") : `<div class="empty">Nenhuma categoria encontrada.</div>`}
    </div>
    <p class="category-management-note">Categorias em uso não podem ser excluídas. Desative para manter o histórico.</p>`;
}

function categoryManagementRow(item) {
  return `
    <article class="category-management-row ${item.active ? "" : "inactive"}">
      <div class="category-row-icon">${categoryIconSvg(item.name)}</div>
      <div class="category-row-copy"><strong>${escapeHtml(item.name)}</strong><span class="category-kind ${item.type}">${categoryTypeLabel(item.type)}</span>${item.active ? "" : `<small>Desativada</small>`}</div>
      <details class="category-options">
        <summary aria-label="Ações da categoria ${escapeAttribute(item.name)}">⋮</summary>
        <div><button type="button" data-edit-category="${item.id}">Editar</button><button type="button" data-toggle-category="${item.id}">${item.active ? "Desativar" : "Ativar"}</button><button type="button" class="danger" data-delete-category="${item.id}">Excluir</button></div>
      </details>
    </article>`;
}

function securityTemplate() {
  return `
    <div class="page-title"><span class="eyebrow">Proteção</span><h1>Segurança</h1><p>Informações de acesso e proteção local.</p></div>
    <article class="security-card">
      <h2>Armazenamento temporário</h2>
      <p>Seus dados principais são sincronizados com o Supabase. O cache local guarda apenas arquivos temporários do aplicativo.</p>
    </article>
    <article class="security-card">
      <h2>Conta atual</h2>
      <p>Usuário: <b>${escapeHtml(currentUser().username)}</b></p>
      <p>Perfil: <b>${isMaster() ? "Master" : "Usuário comum"}</b></p>
    </article>
    <form class="admin-form" id="password-form">
      <h2>Alterar senha</h2>
      <label class="field"><span>Senha atual</span><input name="currentPassword" type="password" required></label>
      <label class="field"><span>Nova senha</span><input name="newPassword" type="password" minlength="6" required></label>
      <label class="field"><span>Confirmar nova senha</span><input name="confirmPassword" type="password" minlength="6" required></label>
      <button class="primary-button">Salvar nova senha</button>
    </form>
    <div class="menu-list">
      <button class="menu-item" data-view="profile"><span>Voltar ao perfil</span><b>›</b></button>
    </div>`;
}

function activityLogTemplate() {
  const items = userActivityLog();
  return `
    <div class="page-title"><span class="eyebrow">Sua conta</span><h1>Histórico de atividades</h1><p>Últimas ações realizadas neste aparelho.</p></div>
    <button class="secondary-button back-button" data-view="profile">Voltar ao perfil</button>
    <div class="activity-list">
      ${items.length ? items.map(activityRow).join("") : `<div class="empty">Nenhuma atividade registrada ainda.</div>`}
    </div>`;
}

function activityRow(item) {
  return `
    <article class="activity-row">
      <strong>${formatDate(item.date, true)} ${escapeHtml(item.time)}</strong>
      <span>${escapeHtml(item.message)}</span>
    </article>`;
}

function supportTemplate() {
  if (isMaster()) return masterSupportTemplate();
  return userSupportTemplate();
}

function userSupportTemplate() {
  const tickets = (db.supportTickets || []).filter(ticket => ticket.userId === session).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return `
    <div class="page-title"><span class="eyebrow">Suporte</span><h1>Falar com o Suporte</h1><p>Envie sua dúvida para o administrador.</p></div>
    <form class="admin-form" id="support-form">
      <h2>Nova mensagem</h2>
      <label class="field"><span>Assunto</span><input name="subject" required maxlength="80" placeholder="Ex.: Dúvida sobre renovação"></label>
      <label class="field"><span>Mensagem</span><textarea name="message" required maxlength="600" placeholder="Escreva sua mensagem"></textarea></label>
      <button class="primary-button">Enviar suporte</button>
    </form>
    <div class="section-header"><h2>Histórico</h2><span class="list-count">${tickets.length}</span></div>
    <div class="support-list">${tickets.map(supportTicketRow).join("") || `<div class="empty">Nenhuma mensagem enviada.</div>`}</div>`;
}

function masterSupportTemplate() {
  const metrics = supportMetrics();
  const tickets = filteredSupportTickets();
  return `
    <div class="page-title"><span class="eyebrow">Área Master</span><h1>Menu Suporte</h1><p>Acompanhe solicitações dos usuários.</p></div>
    <div class="metric-grid compact">
      ${insightCard("Pendentes", metrics.pending, "warning")}
      ${insightCard("Em Atendimento", metrics.progress, "neutral")}
      ${insightCard("Resolvidos", metrics.resolved, "positive")}
      ${insightCard("Total", metrics.total, "neutral")}
    </div>
    <section class="user-filter-panel">
      <label class="search-field"><span>⌕</span><input id="support-search" value="${escapeAttribute(supportSearch)}" placeholder="Nome, usuário, WhatsApp ou e-mail"></label>
      <div class="user-filter-grid">
        <label><span>Status</span><select id="support-status-filter">
          <option value="all">Todos</option>
          ${Object.entries(SUPPORT_STATUSES).map(([value, label]) => `<option value="${value}" ${supportStatusFilter === value ? "selected" : ""}>${label}</option>`).join("")}
        </select></label>
      </div>
    </section>
    <div class="support-list">${tickets.map(supportTicketRow).join("") || `<div class="empty">Nenhum chamado encontrado.</div>`}</div>`;
}

function supportTicketRow(ticket) {
  const reply = ticket.reply;
  return `
    <article class="support-card">
      <div class="support-head"><strong>${escapeHtml(ticket.subject)}</strong><span class="access-status ${ticket.status === "resolved" ? "active" : ticket.status === "progress" ? "warning" : "expired"}">${SUPPORT_STATUSES[ticket.status] || "Pendente"}</span></div>
      <p>${escapeHtml(ticket.message)}</p>
      <small>${escapeHtml(ticket.name)} · @${escapeHtml(ticket.username)} · ${escapeHtml(ticket.whatsapp || "Sem WhatsApp")} · ${escapeHtml(ticket.email || "Sem e-mail")}</small>
      <small>${formatDate(ticket.date, true)} · ${escapeHtml(ticket.time)}</small>
      ${reply ? `<div class="support-reply"><b>Resposta do suporte</b><p>${escapeHtml(reply.message)}</p><small>${formatDate(reply.date, true)} · ${escapeHtml(reply.time)}</small></div>` : ""}
      ${isMaster() ? `
        <div class="support-actions">${Object.entries(SUPPORT_STATUSES).map(([value, label]) => `<button data-support-status="${value}" data-ticket-id="${ticket.id}">${label}</button>`).join("")}</div>
        <div class="support-actions support-actions-secondary">
          <button data-reply-ticket="${ticket.id}">Responder</button>
          <button data-whatsapp-ticket="${ticket.id}">WhatsApp</button>
          <button class="danger" data-delete-support="${ticket.id}">Excluir</button>
        </div>
        ${ticket.replyOpen ? `<form class="reply-form" data-reply-form="${ticket.id}">
          <label class="field"><span>Digite sua resposta...</span><textarea name="reply" required>${escapeHtml(ticket.replyDraft || "")}</textarea></label>
          <button class="primary-button">Enviar resposta</button>
        </form>` : ""}` : `<div class="support-actions support-actions-secondary"><button class="danger" data-delete-support="${ticket.id}">Excluir</button></div>`}
    </article>`;
}

function supportMetrics() {
  const tickets = db.supportTickets || [];
  return {
    pending: tickets.filter(ticket => ticket.status === "pending").length,
    progress: tickets.filter(ticket => ticket.status === "progress").length,
    resolved: tickets.filter(ticket => ticket.status === "resolved").length,
    total: tickets.length
  };
}

function filteredSupportTickets() {
  const search = supportSearch.trim().toLowerCase();
  return (db.supportTickets || []).filter(ticket => {
    const matchesSearch = !search || `${ticket.name} ${ticket.username} ${ticket.whatsapp} ${ticket.email}`.toLowerCase().includes(search);
    const matchesStatus = supportStatusFilter === "all" || ticket.status === supportStatusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function usersTemplate() {
  const editing = editingUserId ? regularUsers().find(user => user.id === editingUserId) : null;
  const visibleUsers = filteredUsers();
  const title = ({ all: "Todos os usuários", active: "Usuários ativos", expiring: "Vencendo em 7 dias", expired: "Usuários vencidos" })[userListScope];
  return `
    <div class="page-title"><span class="eyebrow">Acesso master</span><h1>${title}</h1><p>Cadastre, renove e controle os acessos.</p></div>
    ${!userFormOpen ? `<button class="new-user-button" data-new-user>+ NOVO USUÁRIO</button>` : ""}
    ${userFormOpen ? `<form class="admin-form" id="user-form">
      <div class="form-title-row">
        <h2>${editing ? "Editar usuário" : "Novo usuário"}</h2>
        <button type="button" class="text-button" data-cancel-edit>Cancelar</button>
      </div>
      <input type="hidden" name="id" value="${editing?.id || ""}">
      <label class="field"><span>Nome completo</span><input name="name" required value="${escapeAttribute(editing?.name || "")}" placeholder="Nome do usuário"></label>
      <label class="field"><span>Nome de Usuário</span><input name="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9._-]+" value="${escapeAttribute(editing?.username || "")}" placeholder="Ex.: cliente01"></label>
      <label class="field"><span>WhatsApp</span><input name="whatsapp" required inputmode="tel" value="${escapeAttribute(editing?.whatsapp || "")}" placeholder="(00) 00000-0000"></label>
      <label class="field"><span>E-mail</span><input name="email" type="email" required value="${escapeAttribute(editing?.email || "")}" placeholder="cliente@email.com"></label>
      <label class="field"><span>${editing ? "Nova senha (opcional)" : "Senha inicial"}</span><input name="password" type="password" minlength="6" ${editing ? "" : "required"} placeholder="${editing ? "Mantenha em branco para não alterar" : "Mínimo de 6 caracteres"}"></label>
      <label class="field"><span>Validade do acesso</span><input name="accessExpiresAt" type="date" min="${dateOffset()}" required value="${editing?.accessExpiresAt || futureDate(30)}"></label>
      <div class="quick-validity">
        <span>Definir validade rápida</span>
        <div>${[1,2,3,6,12].map(months => `<button type="button" data-validity-months="${months}">${months} ${months === 1 ? "mês" : "meses"}</button>`).join("")}</div>
      </div>
      <label class="field"><span>Valor da renovação</span><div class="money-input"><b>R$</b><input name="renewalPrice" required inputmode="decimal" value="${String(editing?.renewalPrice ?? 49.9).replace(".", ",")}"></div></label>
      <button class="primary-button">${editing ? "Salvar alterações" : "Cadastrar usuário"}</button>
    </form>` : ""}
    <section class="user-filter-panel">
      <label class="search-field"><span>⌕</span><input id="user-search" value="${escapeAttribute(userSearch)}" placeholder="Pesquisar nome, usuário, WhatsApp ou e-mail"></label>
      <div class="user-filter-grid">
        <label><span>Status</span><select id="user-status-filter">
          <option value="all">Todos</option>
          <option value="active" ${userStatusFilter === "active" ? "selected" : ""}>Ativos</option>
          <option value="blocked" ${userStatusFilter === "blocked" ? "selected" : ""}>Bloqueados</option>
          <option value="expired" ${userStatusFilter === "expired" ? "selected" : ""}>Vencidos</option>
        </select></label>
        <label><span>Período</span><select id="user-period-filter">
          <option value="all">Qualquer período</option>
          <option value="7" ${userPeriodFilter === "7" ? "selected" : ""}>Próximos 7 dias</option>
          <option value="30" ${userPeriodFilter === "30" ? "selected" : ""}>Próximos 30 dias</option>
          <option value="expired" ${userPeriodFilter === "expired" ? "selected" : ""}>Já vencidos</option>
        </select></label>
      </div>
      <label class="filter-date"><span>Data de vencimento</span><input id="user-expiry-filter" type="date" value="${userExpiryFilter}"></label>
      ${hasUserFilters() ? `<button class="clear-filters" data-clear-user-filters>Limpar filtros</button>` : ""}
    </section>
    <div class="section-header"><div><span class="eyebrow">Gestão de acesso</span><h2>${title}</h2></div><span class="list-count">${visibleUsers.length}</span></div>
    <div class="user-list">
      ${visibleUsers.map(user => userRow(user)).join("") || `<div class="empty">Nenhum usuário encontrado neste filtro.</div>`}
    </div>`;
}

function filteredUsers() {
  const normalizedSearch = userSearch.trim().toLowerCase();
  return regularUsers().filter(user => {
    const matchesScope =
      userListScope === "all" ||
      (userListScope === "active" && !isAccessBlocked(user)) ||
      (userListScope === "expiring" && !isAccessBlocked(user) && daysUntilExpiry(user) >= 0 && daysUntilExpiry(user) <= 7) ||
      (userListScope === "expired" && isExpired(user));
    const matchesSearch = !normalizedSearch || `${user.name} ${user.username} ${user.whatsapp || ""} ${user.email || ""}`.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      userStatusFilter === "all" ||
      (userStatusFilter === "active" && !isAccessBlocked(user)) ||
      (userStatusFilter === "blocked" && user.blocked) ||
      (userStatusFilter === "expired" && isExpired(user));
    const days = daysUntilExpiry(user);
    const matchesPeriod =
      userPeriodFilter === "all" ||
      (userPeriodFilter === "7" && days >= 0 && days <= 7) ||
      (userPeriodFilter === "30" && days >= 0 && days <= 30) ||
      (userPeriodFilter === "expired" && days < 0);
    const matchesDate = !userExpiryFilter || user.accessExpiresAt === userExpiryFilter;
    return matchesScope && matchesSearch && matchesStatus && matchesPeriod && matchesDate;
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function hasUserFilters() {
  return userSearch || userStatusFilter !== "all" || userExpiryFilter || userPeriodFilter !== "all";
}

function userRow(user) {
  const status = accessStatus(user);
  const daysLabel = user.role === "master" ? "Master" : Math.max(daysUntilExpiry(user), 0);
  return `
    <article class="user-card">
      <div class="user-main">
        <i>${initials(user.name)}</i>
        <div><strong>${escapeHtml(user.name)}</strong><small>@${escapeHtml(user.username)} · ${escapeHtml(user.whatsapp || "Sem WhatsApp")}</small></div>
        <span class="access-status ${status.className}">${status.label}</span>
      </div>
      <div class="user-contact"><span>${escapeHtml(user.email || "Sem e-mail")}</span><span>Dias restantes: <b>${daysLabel}</b></span></div>
      <div class="user-dates"><span>Cadastro <b>${formatDate(user.createdAt, true)}</b></span><span>Validade <b>${formatDate(user.accessExpiresAt, true)}</b></span></div>
      <div class="user-actions">
        <button data-edit-user="${user.id}">Editar</button>
        <button data-renew-user="${user.id}">Renovar</button>
        <button data-toggle-user="${user.id}">${user.blocked ? "Desbloquear" : "Bloquear"}</button>
        <button class="danger" data-delete-user="${user.id}">Excluir</button>
      </div>
      <button class="user-report-button" data-report-user="${user.id}">Ver dados e relatórios</button>
    </article>`;
}

function reportsTemplate() {
  ensureIndividualReportUser();
  const items = filteredReportTransactions();
  const summary = totals(items);
  const balance = summary.income - summary.expense;
  const selectedName = regularUsers().find(user => user.id === reportUserId)?.name || "Usuário";
  return `
    <div class="page-title"><span class="eyebrow">Acesso master</span><h1>Relatórios</h1><p>Analise dados individuais de cada usuário.</p></div>
    <section class="report-filters">
      <label class="field"><span>Usuário</span><select id="report-user">
        ${regularUsers().map(user => `<option value="${user.id}" ${reportUserId === user.id ? "selected" : ""}>${escapeHtml(user.name)}</option>`).join("")}
      </select></label>
      <div class="period-switch">
        <button class="${reportPeriod === "monthly" ? "active" : ""}" data-period="monthly">Mensal</button>
        <button class="${reportPeriod === "annual" ? "active" : ""}" data-period="annual">Anual</button>
      </div>
      ${reportPeriod === "monthly"
        ? `<label class="field"><span>Mês</span><input id="report-month" type="month" value="${reportMonth}"></label>`
        : `<label class="field"><span>Ano</span><select id="report-year">${yearOptions()}</select></label>`}
    </section>
    <div class="report-heading"><div><span>${escapeHtml(selectedName)}</span><strong>${reportLabel()}</strong></div><b>${items.length} lançamentos</b></div>
    <div class="report-summary">
      <div><span>Receitas</span><strong class="positive">+ ${money(summary.income)}</strong></div>
      <div><span>Despesas</span><strong class="negative">- ${money(summary.expense)}</strong></div>
      <div><span>Resultado</span><strong class="${balance >= 0 ? "positive" : "negative"}">${money(balance)}</strong></div>
    </div>
    <div class="export-actions">
      <button class="secondary-button" data-export-pdf>Exportar PDF</button>
      <button class="secondary-button" data-export-excel>Exportar Excel</button>
    </div>
    <div class="section-header"><h2>Movimentações</h2></div>
    <div class="transaction-list">${transactionRows(items, false)}</div>
    <div class="section-header"><h2>Histórico de atividades</h2></div>
    <div class="activity-list">${masterActivityRows(reportUserId)}</div>`;
}

function masterActivityRows(userId) {
  const items = userActivityLog(userId);
  return items.length ? items.map(activityRow).join("") : `<div class="empty">Nenhuma atividade registrada neste aparelho.</div>`;
}

function ensureIndividualReportUser() {
  if (reportUserId === "all" || !regularUsers().some(user => user.id === reportUserId)) {
    reportUserId = regularUsers()[0]?.id || "";
  }
}

function filteredReportTransactions() {
  ensureIndividualReportUser();
  return reportTransactionsFor(reportUserId).filter(item => {
    if (reportPeriod === "monthly") return item.dueDate?.slice(0, 7) === reportMonth;
    return item.dueDate?.slice(0, 4) === reportYear;
  }).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

function reportLabel() {
  if (reportPeriod === "annual") return `Ano de ${reportYear}`;
  const [year, month] = reportMonth.split("-");
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, 1));
}

function yearOptions() {
  const current = new Date().getFullYear();
  const years = new Set([current - 2, current - 1, current, current + 1]);
  transactionsFor("all").forEach(item => years.add(Number(item.dueDate?.slice(0, 4))));
  return [...years].filter(Boolean).sort((a, b) => b - a).map(year => `<option value="${year}" ${String(year) === reportYear ? "selected" : ""}>${year}</option>`).join("");
}

function bindLogin() {
  document.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => {
    authView = button.dataset.authView;
    render();
  }));
  document.querySelector("#login-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = data.get("username").trim().toLowerCase();
    const password = data.get("password");
    let user;
    try {
      user = await loadUserByCredentials(username, password);
    } catch (error) {
      return showToast("Não foi possível conectar. Verifique sua internet.");
    }
    if (!user) return showToast("Usuário ou senha incorretos.");
    if (isAccessBlocked(user)) {
      event.currentTarget.insertAdjacentHTML("afterbegin", `<div class="login-alert">Seu acesso expirou. Entre em contato com o administrador.</div>`);
      return;
    }
    session = user.id;
    try {
      if (user.role === "master") {
        db = await loadScopedDatabase(user);
      } else {
        db = normalizeDatabase(fromSupabaseRows({ usuarios: [userToSupabaseLike(user)], receitas: [], despesas: [], cartoes: [], compras: [], parcelas: [], suporte: [], renovacoes: [], categorias: [], tiposConta: [] }));
        await refreshUserFinancialData();
      }
    } catch (error) {
      clearSession();
      return showToast("Não foi possível carregar os dados do usuário.");
    }
    currentView = "home";
    saveSession(user);
    logActivity("Fez login no aplicativo.", user.id);
    render();
  });
  document.querySelector("#register-form")?.addEventListener("submit", registerUser);
}

async function registerUser(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const username = data.get("username").trim().toLowerCase();
  const whatsapp = normalizePhone(data.get("whatsapp"));
  const email = data.get("email").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/i.test(username)) return showToast("Use apenas letras, números, ponto, hífen ou sublinhado.");
  if (!isValidEmail(email)) return showToast("Informe um e-mail válido.");
  if (db.users.some(user => user.username.toLowerCase() === username)) return showToast("Este nome de usuário já existe.");
  if (db.users.some(user => normalizePhone(user.whatsapp) === whatsapp)) return showToast("Este WhatsApp já está cadastrado.");
  if (db.users.some(user => user.email?.toLowerCase() === email)) return showToast("Este e-mail já está cadastrado.");
  const newId = crypto.randomUUID();
  const newUser = {
    id: newId,
    name: data.get("name").trim(),
    username,
    password: data.get("password"),
    whatsapp: data.get("whatsapp").trim(),
    email,
    role: "user",
    createdAt: dateOffset(),
    accessExpiresAt: futureDate(30),
    blocked: false,
    renewalPrice: 49.9
  };
  db.users.push(newUser);
  db.transactions[newId] = [];
  db.cards[newId] = [];
  db.cardPurchases[newId] = [];
  db.categories[newId] = defaultCategoryRecords();
  db.accounts[newId] = [...DEFAULT_ACCOUNTS];
  try {
    await saveNewUserToSupabase(newUser);
    await upsertRows("categorias", db.categories[newId].map(item => categoryToSupabaseRow(item, newId)));
    await upsertRows("tipos_conta", db.accounts[newId].map(nome => ({ id: crypto.randomUUID(), usuario_id: newId, nome })));
  } catch (error) {
    db.users = db.users.filter(user => user.id !== newId);
    delete db.transactions[newId];
    delete db.cards[newId];
    delete db.cardPurchases[newId];
    delete db.categories[newId];
    delete db.accounts[newId];
    return showToast("Não foi possível salvar no Supabase.");
  }
  session = newId;
  authView = "login";
  currentView = "home";
  saveSession(newUser);
  try {
    await refreshCurrentUserData();
  } catch (error) {
    console.error("[MEU BOLSO][Supabase] erro após cadastro", error);
  }
  showToast("Operação realizada com sucesso.");
  render();
}

function bindAppEvents() {
  document.querySelectorAll("[data-balance-info]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    toggleBalanceInfoPopover(event.currentTarget);
  }));
  if (!bindAppEvents.balanceInfoOutsideBound) {
    document.addEventListener("click", event => {
      if (!event.target.closest("[data-balance-info], [data-balance-popover]")) closeBalanceInfoPopover();
    });
    bindAppEvents.balanceInfoOutsideBound = true;
  }
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", async () => {
    const target = button.dataset.view;
    if (!canAccessView(target)) return showToast("Você não tem permissão para acessar esta área.");
    if (button.dataset.navView === "transactions") {
      openTransactionsRoot();
      return;
    }
    if (target === "users") userListScope = "all";
    if (target === "home" && !isMaster()) {
      try {
        await ensureMonthlyOccurrences(session);
      } catch (error) {
        console.warn("[MEU BOLSO] recorrências serão processadas na próxima sincronização", error);
      }
    }
    currentView = target;
    render();
  }));
  document.querySelectorAll("[data-user-scope]").forEach(button => button.addEventListener("click", () => {
    if (!isMaster()) return;
    userListScope = button.dataset.userScope;
    resetUserFilters();
    currentView = "users";
    render();
  }));
  document.querySelectorAll("[data-dashboard-detail]").forEach(button => button.addEventListener("click", async () => {
    const detail = button.dataset.dashboardDetail;
    if (detail === "received") receivedIncomeReturnView = currentView;
    if (detail === "paid") paidExpenseReturnView = currentView;
    if (detail === "overdueValue") overdueValueReturnView = currentView;
    if (detail === "toReceive" && !isMaster()) {
      receivablesReturnView = currentView;
      try {
        await refreshUserFinancialData();
      } catch (error) {
        console.warn("[MEU BOLSO] usando dados locais em Receitas a receber", error);
      }
    }
    dashboardDetail = detail;
    currentView = "dashboardDetail";
    render();
  }));
  document.querySelector("[data-close-dashboard-detail]")?.addEventListener("click", () => {
    dashboardDetail = null;
    currentView = "home";
    render();
  });
  document.querySelectorAll("[data-add], [data-add-type]").forEach(button => button.addEventListener("click", () => {
    if (isMaster()) return showToast("Apenas usuários podem cadastrar movimentações.");
    if (currentView === "card") {
      openCardDialog();
      return;
    }
    if (currentView === "cardPurchases") {
      editingPurchaseId = null;
      currentView = "purchaseEditor";
      render();
      return;
    }
    openTransactionDialog(button.dataset.addType);
  }));
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    transactionFilter = button.dataset.filter;
    render();
  }));
  document.querySelectorAll("[data-transaction-status-option]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-transaction-status-option]").forEach(option => option.classList.remove("active"));
    button.classList.add("active");
  }));
  document.querySelectorAll("[data-transaction-period-option]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-transaction-period-option]").forEach(option => option.classList.remove("active"));
    button.classList.add("active");
  }));
  document.querySelector("[data-apply-transaction-filters]")?.addEventListener("click", () => {
    transactionStatusFilter = document.querySelector("[data-transaction-status-option].active")?.dataset.transactionStatusOption || "all";
    transactionPeriodFilter = document.querySelector("[data-transaction-period-option].active")?.dataset.transactionPeriodOption || "all";
    render();
  });
  document.querySelector("[data-clear-transaction-filters]")?.addEventListener("click", () => {
    transactionStatusFilter = "all";
    transactionPeriodFilter = "all";
    render();
  });
  document.querySelectorAll("[data-remove-transaction-filter]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.removeTransactionFilter === "status") transactionStatusFilter = "all";
    if (button.dataset.removeTransactionFilter === "period") transactionPeriodFilter = "all";
    render();
  }));
  if (!bindAppEvents.transactionFilterOutsideBound) {
    document.addEventListener("click", event => {
      if (event.target.closest(".transaction-advanced-filters")) return;
      document.querySelectorAll(".transaction-advanced-filters[open]").forEach(panel => { panel.open = false; });
    });
    bindAppEvents.transactionFilterOutsideBound = true;
  }
  document.querySelectorAll("[data-financial-composition]").forEach(button => button.addEventListener("click", () => {
    profileDashboardDetailType = button.dataset.financialComposition;
    currentView = "profileDashboardDetail";
    render();
  }));
  document.querySelectorAll("[data-notification-id]").forEach(button => button.addEventListener("click", () => {
    openNotificationTarget(button);
  }));
  document.querySelector("[data-close-receivables]")?.addEventListener("click", () => {
    dashboardDetail = null;
    currentView = receivablesReturnView;
    render();
  });
  document.querySelector("[data-close-received-income]")?.addEventListener("click", () => {
    dashboardDetail = null;
    currentView = receivedIncomeReturnView;
    render();
  });
  document.querySelector("[data-close-paid-expenses]")?.addEventListener("click", () => {
    dashboardDetail = null;
    currentView = paidExpenseReturnView;
    render();
  });
  document.querySelector("[data-close-overdue-value]")?.addEventListener("click", () => {
    dashboardDetail = null;
    currentView = overdueValueReturnView;
    render();
  });
  document.querySelector("[data-close-payables]")?.addEventListener("click", () => {
    dashboardDetail = null;
    currentView = "home";
    render();
  });
  document.querySelectorAll("[data-toggle-payables-card]").forEach(button => button.addEventListener("click", () => {
    const cardId = button.dataset.togglePayablesCard;
    if (payablesExpandedCardIds.has(cardId)) payablesExpandedCardIds.delete(cardId);
    else payablesExpandedCardIds.add(cardId);
    render();
  }));
  document.querySelectorAll("[data-pay-payables-card]").forEach(button => button.addEventListener("click", () => payPayablesCardGroup(button.dataset.payPayablesCard)));
  document.querySelectorAll("[data-toggle-overdue-card]").forEach(button => button.addEventListener("click", () => {
    const cardId = button.dataset.toggleOverdueCard;
    if (overdueExpandedCardIds.has(cardId)) overdueExpandedCardIds.delete(cardId);
    else overdueExpandedCardIds.add(cardId);
    render();
  }));
  document.querySelectorAll("[data-pay-overdue-card]").forEach(button => button.addEventListener("click", () => payOverdueCardGroup(button.dataset.payOverdueCard)));
  const receivableMenus = [...document.querySelectorAll(".receivable-options")];
  receivableMenus.forEach(menu => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      receivableMenus.forEach(other => {
        if (other !== menu) other.open = false;
      });
    });
    menu.addEventListener("click", event => {
      if (event.target.closest("button")) menu.open = false;
    });
  });
  if (!bindAppEvents.receivableMenuOutsideBound) {
    document.addEventListener("click", event => {
      if (event.target.closest(".receivable-options")) return;
      document.querySelectorAll(".receivable-options[open]").forEach(menu => { menu.open = false; });
    });
    bindAppEvents.receivableMenuOutsideBound = true;
  }
  const categoryMenus = [...document.querySelectorAll(".category-options")];
  categoryMenus.forEach(menu => menu.addEventListener("toggle", () => {
    if (!menu.open) return;
    categoryMenus.forEach(other => { if (other !== menu) other.open = false; });
  }));
  if (!bindAppEvents.categoryMenuOutsideBound) {
    document.addEventListener("click", event => {
      if (event.target.closest(".category-options")) return;
      document.querySelectorAll(".category-options[open]").forEach(menu => { menu.open = false; });
    });
    bindAppEvents.categoryMenuOutsideBound = true;
  }
  document.querySelector("[data-new-category]")?.addEventListener("click", () => openCategoryDialog());
  document.querySelectorAll("[data-edit-category]").forEach(button => button.addEventListener("click", () => openCategoryDialog(button.dataset.editCategory)));
  document.querySelectorAll("[data-toggle-category]").forEach(button => button.addEventListener("click", () => toggleCategory(button.dataset.toggleCategory)));
  document.querySelectorAll("[data-delete-category]").forEach(button => button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory)));
  document.querySelectorAll("[data-category-filter]").forEach(button => button.addEventListener("click", () => {
    categoryTypeFilter = button.dataset.categoryFilter;
    render();
  }));
  document.querySelector("[data-category-search]")?.addEventListener("input", event => {
    categorySearch = event.currentTarget.value;
    clearTimeout(bindAppEvents.categorySearchTimer);
    bindAppEvents.categorySearchTimer = setTimeout(() => {
      render();
      const input = document.querySelector("[data-category-search]");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }, 120);
  });
  document.querySelector("[data-transaction-search]")?.addEventListener("input", event => {
    transactionSearch = event.currentTarget.value;
    clearTimeout(bindAppEvents.transactionSearchTimer);
    bindAppEvents.transactionSearchTimer = setTimeout(() => {
      render();
      const input = document.querySelector("[data-transaction-search]");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }, 120);
  });
  document.querySelectorAll("[data-edit-transaction]").forEach(button => button.addEventListener("click", () => editTransaction(button.dataset.editTransaction)));
  document.querySelectorAll("[data-delete-transaction]").forEach(button => button.addEventListener("click", () => deleteTransaction(button.dataset.deleteTransaction)));
  document.querySelectorAll("[data-pay-transaction]").forEach(button => button.addEventListener("click", () => markTransactionPaid(button.dataset.payTransaction)));
  document.querySelector("[data-toggle-purchase-form]")?.addEventListener("click", () => {
    purchaseFormOpen = !purchaseFormOpen;
    if (purchaseFormOpen) editingPurchaseId = null;
    render();
  });
  document.querySelector("#card-form")?.addEventListener("submit", saveCard);
  document.querySelector("[data-close-card-dialog]")?.addEventListener("click", closeCardDialog);
  document.querySelector("#purchase-form")?.addEventListener("submit", saveCardPurchase);
  document.querySelector("#purchase-form select[name='cardId']")?.addEventListener("change", updatePurchaseInvoiceInfo);
  document.querySelector("#password-form")?.addEventListener("submit", changePassword);
  document.querySelector("#support-form")?.addEventListener("submit", saveSupportTicket);
  document.querySelectorAll("[data-pay-installment]").forEach(button => button.addEventListener("click", () => payCardInstallment(button.dataset.payInstallment, button.dataset.installmentKey)));
  document.querySelectorAll("[data-pay-invoice]").forEach(button => button.addEventListener("click", event => payCardInvoice(event.currentTarget.dataset.payInvoice)));
  document.querySelectorAll("[data-open-card-purchases]").forEach(button => button.addEventListener("click", () => {
    selectedCardId = button.dataset.openCardPurchases;
    currentView = "cardPurchases";
    render();
  }));
  document.querySelectorAll("[data-edit-card]").forEach(button => button.addEventListener("click", () => {
    openCardDialog(button.dataset.editCard);
  }));
  document.querySelectorAll("[data-delete-card]").forEach(button => button.addEventListener("click", () => deleteCard(button.dataset.deleteCard)));
  document.querySelectorAll("[data-edit-purchase]").forEach(button => button.addEventListener("click", () => {
    editingPurchaseId = button.dataset.editPurchase;
    currentView = "purchaseEditor";
    render();
  }));
  document.querySelectorAll("[data-delete-purchase]").forEach(button => button.addEventListener("click", () => deletePurchase(button.dataset.deletePurchase)));
  document.querySelectorAll("[data-view-installments]").forEach(button => button.addEventListener("click", () => {
    selectedPurchaseId = button.dataset.viewInstallments;
    currentView = "installments";
    render();
  }));
  document.querySelectorAll("[data-manage-list]").forEach(button => {
    button.onclick = () => openListManager(button.dataset.manageList);
  });
  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    if (await confirmAction()) logout();
  });
  document.querySelector("[data-check-updates]")?.addEventListener("click", checkAppUpdates);
  document.querySelector("[data-smart-install]")?.addEventListener("click", handleSmartInstall);
  document.querySelector("#user-form")?.addEventListener("submit", saveUser);
  document.querySelector("[data-new-user]")?.addEventListener("click", () => {
    editingUserId = null;
    userFormOpen = true;
    render();
  });
  document.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    editingUserId = null;
    userFormOpen = false;
    showToast("Operação cancelada.");
    render();
  });
  document.querySelectorAll("[data-edit-user]").forEach(button => button.addEventListener("click", () => {
    if (!isMaster()) return;
    editingUserId = button.dataset.editUser;
    userFormOpen = true;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  document.querySelectorAll("[data-delete-user]").forEach(button => button.addEventListener("click", () => deleteUser(button.dataset.deleteUser)));
  document.querySelectorAll("[data-toggle-user]").forEach(button => button.addEventListener("click", () => toggleUserBlock(button.dataset.toggleUser)));
  document.querySelectorAll("[data-renew-user]").forEach(button => button.addEventListener("click", () => renewUser(button.dataset.renewUser)));
  document.querySelectorAll("[data-validity-months]").forEach(button => button.addEventListener("click", () => setQuickValidity(Number(button.dataset.validityMonths))));
  document.querySelector("#user-search")?.addEventListener("input", event => {
    userSearch = event.target.value;
    clearTimeout(bindAppEvents.searchTimer);
    bindAppEvents.searchTimer = setTimeout(() => {
      render();
      const search = document.querySelector("#user-search");
      if (search) {
        search.focus();
        search.setSelectionRange(search.value.length, search.value.length);
      }
    }, 180);
  });
  document.querySelector("#user-status-filter")?.addEventListener("change", event => {
    userStatusFilter = event.target.value;
    render();
  });
  document.querySelector("#user-period-filter")?.addEventListener("change", event => {
    userPeriodFilter = event.target.value;
    render();
  });
  document.querySelector("#user-expiry-filter")?.addEventListener("change", event => {
    userExpiryFilter = event.target.value;
    render();
  });
  document.querySelector("#support-search")?.addEventListener("input", event => {
    supportSearch = event.target.value;
    clearTimeout(bindAppEvents.supportTimer);
    bindAppEvents.supportTimer = setTimeout(render, 180);
  });
  document.querySelector("#support-status-filter")?.addEventListener("change", event => {
    supportStatusFilter = event.target.value;
    render();
  });
  document.querySelectorAll("[data-support-status]").forEach(button => button.addEventListener("click", () => updateSupportStatus(button.dataset.ticketId, button.dataset.supportStatus)));
  document.querySelectorAll("[data-reply-ticket]").forEach(button => button.addEventListener("click", () => toggleSupportReply(button.dataset.replyTicket)));
  document.querySelectorAll("[data-whatsapp-ticket]").forEach(button => button.addEventListener("click", () => openSupportWhatsapp(button.dataset.whatsappTicket)));
  document.querySelectorAll("[data-delete-support]").forEach(button => button.addEventListener("click", () => deleteSupportTicket(button.dataset.deleteSupport)));
  document.querySelectorAll("[data-reply-form]").forEach(form => form.addEventListener("submit", sendSupportReply));
  document.querySelector("[data-clear-user-filters]")?.addEventListener("click", () => {
    resetUserFilters();
    render();
  });
  document.querySelectorAll("[data-report-user]").forEach(button => button.addEventListener("click", () => {
    if (!isMaster()) return;
    reportUserId = button.dataset.reportUser;
    currentView = "reports";
    render();
  }));
  bindReportEvents();
}

function bindReportEvents() {
  document.querySelector("#report-user")?.addEventListener("change", event => { reportUserId = event.target.value; render(); });
  document.querySelector("#report-month")?.addEventListener("change", event => { reportMonth = event.target.value; render(); });
  document.querySelector("#report-year")?.addEventListener("change", event => { reportYear = event.target.value; render(); });
  document.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => { reportPeriod = button.dataset.period; render(); }));
  document.querySelector("[data-export-pdf]")?.addEventListener("click", async () => {
    if (await confirmAction()) exportPdf();
  });
  document.querySelector("[data-export-excel]")?.addEventListener("click", async () => {
    if (await confirmAction()) exportExcel();
  });
}

function logout() {
  clearSession();
  currentView = "home";
  authView = "login";
  transactionFilter = "all";
  transactionSearch = "";
  transactionStatusFilter = "all";
  transactionPeriodFilter = "all";
  render();
  showToast("Operação realizada com sucesso.");
}

async function checkAppUpdates() {
  try {
    await updateServiceWorker();
    await clearBrowserCaches();
    showToast("Cache atualizado com sucesso.");
    setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    console.error("[MEU BOLSO][PWA] erro ao verificar atualizações", error);
    showToast("Não foi possível concluir a operação.");
  }
}

async function autoCheckAppUpdates() {
  try {
    await syncOfflineQueue();
    await updateServiceWorker();
    if (session) {
      if (isMaster()) await refreshMasterData();
      else await refreshUserFinancialData();
      render();
    }
  } catch (error) {
    console.warn("[MEU BOLSO][PWA] atualização automática não concluída", error);
  }
}

async function clearAppCache() {
  if (!await confirmCacheClear()) return;
  try {
    await updateServiceWorker();
    await clearBrowserCaches();
    showToast("Cache atualizado com sucesso.");
    setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    console.error("[MEU BOLSO][PWA] erro ao limpar cache", error);
    showToast("Não foi possível concluir a operação.");
  }
}

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function notificationsSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}

function notificationPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

function notificationBlockedNotice() {
  if (isMaster() || notificationPermission() !== "denied") return "";
  return `<small class="notification-warning">Notificações bloqueadas. Ative nas configurações do navegador.</small>`;
}

function profileVersionActionsTemplate() {
  const actions = `${isMaster() ? `<button type="button" data-check-updates>Atualizar App</button>` : ""}${smartInstallButtonTemplate()}`;
  return actions ? `<div class="app-version-actions">${actions}</div>` : "";
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(character => character.charCodeAt(0)));
}

function smartInstallButtonTemplate() {
  if (isMaster()) return "";
  if (!isStandaloneApp()) {
    return `<button type="button" class="install-app-button" data-smart-install>Instalar App</button>`;
  }
  if (notificationPermission() === "default") {
    return `<button type="button" class="install-app-button" data-smart-install>Ativar Notificações</button>`;
  }
  return "";
}

function isiOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function installInstructionsMessage() {
  if (isiOSDevice()) {
    return "Para instalar no iPhone:\n1. Abra este site no Safari.\n2. Toque no botão de compartilhar.\n3. Escolha 'Adicionar à Tela de Início'.";
  }
  return "Para instalar o aplicativo, use a opção Adicionar à tela inicial ou Instalar aplicativo do navegador.";
}

async function handleSmartInstall() {
  if (isMaster()) return;
  if (!isStandaloneApp()) {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      if (choice?.outcome === "accepted") await activateNotifications();
      render();
      return;
    }
    showToast(installInstructionsMessage());
    return;
  }
  await activateNotifications();
}

async function activateNotifications() {
  if (!notificationsSupported()) {
    showToast("Notificações indisponíveis neste navegador.");
    return;
  }
  if (Notification.permission === "denied") {
    localStorage.setItem(NOTIFICATION_BLOCK_NOTICE_KEY, "1");
    showToast("Notificações bloqueadas. Ative nas configurações do navegador.");
    render();
    return;
  }
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    localStorage.setItem(NOTIFICATION_BLOCK_NOTICE_KEY, "1");
    showToast("Notificações bloqueadas. Ative nas configurações do navegador.");
    render();
    return;
  }
  localStorage.removeItem(NOTIFICATION_BLOCK_NOTICE_KEY);
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const pushPublicKey = window.APP_BUILD_CONFIG?.pushPublicKey;
  if (registration?.pushManager && pushPublicKey) {
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription = existingSubscription || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pushPublicKey)
    });
    localStorage.setItem("minhas-financas-push-subscription", JSON.stringify(subscription));
  }
  if (registration?.showNotification) {
    await registration.showNotification("Notificações ativadas", {
      body: "Você receberá avisos importantes do MEU BOLSO.",
      icon: "/icon-192.png",
      badge: "/notification-icon.png",
      tag: "notifications-enabled"
    }).catch(() => null);
  }
  showToast("Notificações ativadas com sucesso.");
  scheduleDueNotificationCheck();
  render();
}

async function testNotification() {
  if (isMaster()) return;
  if (!notificationsSupported()) {
    showToast("Notificações indisponíveis neste navegador.");
    return;
  }
  if (Notification.permission === "denied") {
    localStorage.setItem(NOTIFICATION_BLOCK_NOTICE_KEY, "1");
    showToast("Notificações bloqueadas. Ative nas configurações do navegador ou aplicativo.");
    render();
    return;
  }
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    localStorage.setItem(NOTIFICATION_BLOCK_NOTICE_KEY, "1");
    showToast("Notificações bloqueadas. Ative nas configurações do navegador ou aplicativo.");
    render();
    return;
  }
  localStorage.removeItem(NOTIFICATION_BLOCK_NOTICE_KEY);
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (registration?.showNotification) {
    await registration.showNotification("MEU BOLSO", {
      body: "Notificações ativadas com sucesso.",
      icon: "/icon-192.png",
      badge: "/notification-icon.png",
      tag: "meu-bolso-teste-notificacao",
      data: { url: "/" }
    });
  } else {
    new Notification("MEU BOLSO", {
      body: "Notificações ativadas com sucesso.",
      icon: "/icon-192.png"
    });
  }
  showToast("Notificação de teste enviada.");
  render();
}

function scheduleDueNotificationCheck() {
  clearTimeout(dueNotificationTimer);
  if (!session || isMaster() || notificationPermission() !== "granted") return;
  dueNotificationTimer = setTimeout(() => checkDueNotifications(), 700);
}

function dueNotificationLogKey() {
  return `${DUE_NOTIFICATION_LOG_KEY}:${session}:${dateOffset()}`;
}

function sentDueNotificationKeys() {
  try {
    return new Set(JSON.parse(localStorage.getItem(dueNotificationLogKey()) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSentDueNotificationKeys(keys) {
  localStorage.setItem(dueNotificationLogKey(), JSON.stringify([...keys]));
}

function dueNotificationCandidates() {
  const today = dateOffset();
  const items = userTransactions()
    .filter(item => ["income", "expense"].includes(item.type))
    .filter(item => !isPaidStatus(item) && item.dueDate && item.dueDate <= today)
    .map(item => {
      const kind = item.type === "income" ? "Receita" : "Despesa";
      const state = item.dueDate === today ? "vence hoje" : "está vencida";
      return {
        key: `${item.type}:${item.id}:${item.dueDate}:${state}`,
        body: `${kind} ${item.name} ${state}. Valor: ${money(item.amount)}`,
        url: "/?view=transactions"
      };
    });

  const cardGroups = new Map();
  cardInstallmentItems()
    .filter(item => !isPaidStatus(item) && item.dueDate && item.dueDate <= today)
    .forEach(item => {
      const state = item.dueDate === today ? "vence hoje" : "está vencida";
      const groupKey = `${item.cardName}:${item.dueDate}:${state}`;
      const current = cardGroups.get(groupKey) || { cardName: item.cardName, dueDate: item.dueDate, state, amount: 0 };
      current.amount += item.amount;
      cardGroups.set(groupKey, current);
    });

  const cardItems = [...cardGroups.values()].map(group => ({
    key: `card:${group.cardName}:${group.dueDate}:${group.state}`,
    body: `Fatura ${group.cardName} ${group.state}. Valor: ${money(group.amount)}`,
    url: "/?view=card"
  }));

  return [...items, ...cardItems];
}

async function showAppNotification(body, tag, url = "/") {
  if (notificationPermission() !== "granted") return false;
  const registration = await navigator.serviceWorker?.ready?.catch(() => null);
  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/notification-icon.png",
    tag,
    data: { url }
  };
  if (registration?.showNotification) {
    await registration.showNotification("MEU BOLSO", options);
    return true;
  }
  if ("Notification" in window) {
    new Notification("MEU BOLSO", options);
    return true;
  }
  return false;
}

async function checkDueNotifications() {
  if (!session || isMaster() || notificationPermission() !== "granted") return;
  const sent = sentDueNotificationKeys();
  const pending = dueNotificationCandidates().filter(item => !sent.has(item.key));
  for (const item of pending) {
    const delivered = await showAppNotification(item.body, `due-${item.key}`, item.url).catch(() => false);
    if (delivered) sent.add(item.key);
  }
  if (pending.length) saveSentDueNotificationKeys(sent);
}

function applyNotificationViewFromUrl() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (!view) return;
  if (view === "transactions") currentView = "transactions";
  if (view === "card") currentView = "card";
  window.history.replaceState({}, "", window.location.pathname || "/");
}
async function updateServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async registration => {
    await registration.update();
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }));
}

async function clearBrowserCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
}

function confirmCacheClear() {
  const dialog = document.querySelector("#confirm-dialog");
  const title = dialog.querySelector("h2");
  const message = dialog.querySelector("p");
  const yesButton = dialog.querySelector("[data-confirm-yes]");
  const noButton = dialog.querySelector("[data-confirm-no]");
  const oldTitle = title.textContent;
  const oldMessage = message.textContent;
  const oldYes = yesButton.textContent;
  const oldNo = noButton.textContent;
  title.textContent = "Limpar Cache";
  message.textContent = "Deseja limpar o cache do aplicativo?";
  yesButton.textContent = "Limpar Cache";
  noButton.textContent = "Cancelar";
  return confirmAction().finally(() => {
    title.textContent = oldTitle;
    message.textContent = oldMessage;
    yesButton.textContent = oldYes;
    noButton.textContent = oldNo;
  });
}

function confirmInvoicePayment(total) {
  const dialog = document.querySelector("#confirm-dialog");
  const title = dialog.querySelector("h2");
  const message = dialog.querySelector("p");
  const yesButton = dialog.querySelector("[data-confirm-yes]");
  const noButton = dialog.querySelector("[data-confirm-no]");
  const oldTitle = title.textContent;
  const oldMessage = message.textContent;
  const oldYes = yesButton.textContent;
  const oldNo = noButton.textContent;
  title.textContent = "Pagar Fatura";
  message.textContent = `Valor total da fatura: ${money(total)}. Confirmar pagamento?`;
  yesButton.textContent = "Pagar Fatura";
  noButton.textContent = "Cancelar";
  return confirmAction().finally(() => {
    title.textContent = oldTitle;
    message.textContent = oldMessage;
    yesButton.textContent = oldYes;
    noButton.textContent = oldNo;
  });
}

function openCategoryDialog(categoryId = null) {
  editingCategoryId = categoryId;
  const dialog = document.querySelector("#category-dialog");
  const form = document.querySelector("#category-form");
  const category = categoryId ? userCategoryRecords().find(item => item.id === categoryId) : null;
  form.reset();
  showCategoryFormMessage("");
  document.querySelector("#category-form-title").textContent = category ? "Editar categoria" : "Nova categoria";
  if (category) {
    form.elements.name.value = category.name;
    form.elements.categoryType.value = category.type;
  }
  dialog.showModal();
}

function showCategoryFormMessage(message, type = "error") {
  const element = document.querySelector("#category-form-message");
  if (!element) return;
  element.textContent = message;
  element.className = `category-form-message${message ? ` show ${type}` : ""}`;
}

function logCategoryOperationError(operation, error, categoryId = "") {
  console.error("[MEU BOLSO][Categorias] operação rejeitada", {
    operation,
    categoryId,
    userId: session,
    status: error?.status || "",
    code: error?.code || "",
    message: error?.message || String(error || ""),
    details: error?.details || "",
    hint: error?.hint || ""
  });
}

function categoryOperationErrorMessage(error, operation = "create") {
  const technicalMessage = [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  if (/23505|duplicate key|unique constraint/i.test(technicalMessage)) return "Já existe uma categoria com esse nome e tipo.";
  if (/42501|row-level security|permission denied|401|403/i.test(technicalMessage)) return "Sua conta não tem permissão para alterar esta categoria.";
  if (/42703|PGRST204|schema cache|categorias\.(tipo|ativo)/i.test(technicalMessage)) return "A estrutura de categorias precisa ser atualizada no Supabase.";
  if (/failed to fetch|network|internet|conex/i.test(technicalMessage)) return "Falha de conexão. Verifique sua internet e tente novamente.";
  return ({
    create: "Não foi possível salvar a categoria.",
    update: "Não foi possível atualizar a categoria.",
    deactivate: "Não foi possível desativar a categoria.",
    reactivate: "Não foi possível reativar a categoria.",
    delete: "Não foi possível excluir a categoria."
  })[operation] || "Não foi possível concluir a operação da categoria.";
}

function categoryFromSupabaseRow(row) {
  return normalizeCategoryRecord({
    id: row.id,
    name: row.nome,
    type: categoryTypeFromSupabase(row.tipo),
    active: row.ativo !== false
  });
}

async function createCategoryInSupabase(category) {
  const rows = await supabaseRequest("categorias", {
    method: "POST",
    body: [categoryToSupabaseRow(category)],
    prefer: "return=representation"
  });
  const confirmed = rows[0];
  if (!confirmed || confirmed.id !== category.id || confirmed.usuario_id !== session) throw new Error("CATEGORY_CREATE_NOT_CONFIRMED");
  return categoryFromSupabaseRow(confirmed);
}

async function updateCategoryInSupabase(categoryId, changes) {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(changes, "name")) payload.nome = changes.name;
  if (Object.prototype.hasOwnProperty.call(changes, "type")) payload.tipo = categoryTypeToSupabase(changes.type);
  if (Object.prototype.hasOwnProperty.call(changes, "active")) payload.ativo = changes.active;
  const query = supabaseAnd(supabaseEq("id", categoryId), supabaseEq("usuario_id", session));
  const rows = await supabaseRequest("categorias", { method: "PATCH", query, body: payload, prefer: "return=representation" });
  const confirmed = rows[0];
  if (!confirmed || confirmed.id !== categoryId || confirmed.usuario_id !== session) throw new Error("CATEGORY_UPDATE_NOT_CONFIRMED");
  return categoryFromSupabaseRow(confirmed);
}

function categoryMatchesTransaction(category, item) {
  if (item.categoryId) return item.categoryId === category.id;
  return String(item.category || "").trim().toLocaleLowerCase("pt-BR") === category.name.trim().toLocaleLowerCase("pt-BR");
}

function categoryIsInLocalUse(category) {
  return userTransactions().some(item => categoryMatchesTransaction(category, item)) || userCardPurchases().some(item => categoryMatchesTransaction(category, item));
}

async function categoryIsInSupabaseUse(category) {
  const result = await supabaseRequest("rpc/categoria_em_uso", {
    method: "POST",
    body: { p_categoria_id: category.id, p_usuario_id: session },
    prefer: "return=representation"
  });
  return result === true;
}

async function deleteCategoryInSupabase(categoryId) {
  const query = supabaseAnd(supabaseEq("id", categoryId), supabaseEq("usuario_id", session));
  const deleted = await supabaseRequest("categorias", { method: "DELETE", query, prefer: "return=representation" });
  if (deleted.length !== 1 || deleted[0].id !== categoryId || deleted[0].usuario_id !== session) throw new Error("CATEGORY_DELETE_NOT_CONFIRMED");
  const remaining = await supabaseSelect("categorias", `select=id&${query}&limit=1`);
  if (remaining.length) throw new Error("CATEGORY_DELETE_STILL_PRESENT");
}

async function saveCategory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const type = String(data.get("categoryType") || "expense");
  showCategoryFormMessage("");
  if (!name) return showCategoryFormMessage("Informe o nome da categoria.");
  if (!["income", "expense", "both"].includes(type)) return showCategoryFormMessage("Selecione um tipo válido para a categoria.");
  if (!SUPABASE_READY) return showCategoryFormMessage("A conexão com o Supabase não está configurada.");
  if (!navigator.onLine) return showCategoryFormMessage("Falha de conexão. Conecte-se à internet para salvar a categoria.");
  const records = userCategoryRecords();
  const normalizedName = name.toLocaleLowerCase("pt-BR");
  const duplicate = records.some(item => item.id !== editingCategoryId && item.type === type && item.name.trim().toLocaleLowerCase("pt-BR") === normalizedName);
  if (duplicate) return showCategoryFormMessage("Já existe uma categoria com esse nome e tipo.");
  const previous = records.find(item => item.id === editingCategoryId);
  const category = { id: previous?.id || crypto.randomUUID(), name, type, active: previous?.active !== false };
  const operation = previous ? "update" : "create";
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  let confirmedCategory;
  try {
    confirmedCategory = previous
      ? await updateCategoryInSupabase(previous.id, { name, type })
      : await createCategoryInSupabase(category);
  } catch (error) {
    logCategoryOperationError(operation, error, category.id);
    showCategoryFormMessage(categoryOperationErrorMessage(error, operation));
    return;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
  db.categories[session] = editingCategoryId ? records.map(item => item.id === editingCategoryId ? confirmedCategory : item) : [...records, confirmedCategory];
  cacheDatabase();
  editingCategoryId = null;
  document.querySelector("#category-dialog")?.close();
  showToast("Categoria salva com sucesso.");
  render();
}

async function toggleCategory(categoryId) {
  const records = userCategoryRecords();
  const category = records.find(item => item.id === categoryId);
  if (!category) return;
  if (!navigator.onLine) return showToast(`Não foi possível ${category.active ? "desativar" : "reativar"} a categoria. Verifique sua conexão.`);
  const updated = { ...category, active: !category.active };
  const operation = updated.active ? "reactivate" : "deactivate";
  let confirmed;
  try {
    confirmed = await updateCategoryInSupabase(category.id, { active: updated.active });
  } catch (error) {
    logCategoryOperationError(operation, error, category.id);
    return showToast(categoryOperationErrorMessage(error, operation));
  }
  db.categories[session] = records.map(item => item.id === categoryId ? confirmed : item);
  cacheDatabase();
  showToast(updated.active ? "Categoria ativada." : "Categoria desativada.");
  render();
}

async function deleteCategory(categoryId) {
  const records = userCategoryRecords();
  const category = records.find(item => item.id === categoryId);
  if (!category) return;
  if (!navigator.onLine) return showToast("Não foi possível excluir a categoria. Verifique sua conexão.");
  let inUse;
  try {
    inUse = categoryIsInLocalUse(category) || await categoryIsInSupabaseUse(category);
  } catch (error) {
    logCategoryOperationError("check-use", error, category.id);
    return showToast("Não foi possível verificar se a categoria está em uso.");
  }
  if (inUse) return showToast("Esta categoria está em uso. Desative-a para manter o histórico.");
  if (!await confirmAction()) return;
  try {
    await deleteCategoryInSupabase(category.id);
  } catch (error) {
    logCategoryOperationError("delete", error, category.id);
    return showToast(categoryOperationErrorMessage(error, "delete"));
  }
  db.categories[session] = records.filter(item => item.id !== categoryId);
  cacheDatabase();
  showToast("Categoria excluída.");
  render();
}

function requestPaymentMethod(item, labels = {}) {
  const dialog = document.querySelector("#payment-method-dialog");
  const form = document.querySelector("#payment-method-form");
  const isIncome = item.type === "income";
  form.reset();
  document.querySelector("#payment-method-eyebrow").textContent = labels.eyebrow || (isIncome ? "Confirmar recebimento" : "Confirmar pagamento");
  document.querySelector("#payment-method-title").textContent = labels.title || (isIncome ? "Marcar como recebido" : "Marcar como pago");
  document.querySelector("#payment-method-legend").textContent = labels.legend || (isIncome ? "Método de recebimento" : "Método de pagamento");
  document.querySelector("#payment-method-summary").innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>${money(item.amount)} · Vencimento: ${formatDate(item.dueDate, true)}</span>`;
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      dialog.close();
      resolve(value);
    };
    form.onsubmit = event => {
      event.preventDefault();
      const method = new FormData(form).get("paymentMethod");
      if (!PAYMENT_METHODS.includes(method)) return showToast(`Selecione o método de ${isIncome ? "recebimento" : "pagamento"}.`);
      finish(method);
    };
    dialog.querySelectorAll("[data-payment-method-cancel]").forEach(button => { button.onclick = () => finish(null); });
    dialog.oncancel = event => { event.preventDefault(); finish(null); };
    dialog.showModal();
  });
}

function openTransactionDialog(type = "expense") {
  const dialog = document.querySelector("#transaction-dialog");
  const form = document.querySelector("#transaction-form");
  form.reset();
  editingTransactionId = null;
  document.querySelector("#form-title").textContent = "Adicionar transação";
  form.elements.dueDate.value = dateOffset();
  form.elements.type.value = type === "income" ? "income" : "expense";
  updateStatusOptions();
  refreshTransactionLists();
  dialog.showModal();
}

function openCardDialog(cardId = null) {
  editingCardId = cardId;
  const dialog = document.querySelector("#card-dialog");
  const title = document.querySelector("#card-form-title");
  const body = document.querySelector("#card-form-body");
  if (!dialog || !title || !body) return;
  title.textContent = cardId ? "Editar cartão" : "Novo cartão";
  body.innerHTML = cardFormTemplate();
  dialog.showModal();
}

function closeCardDialog() {
  document.querySelector("#card-dialog")?.close();
  editingCardId = null;
}

function editTransaction(transactionId) {
  if (isMaster()) return;
  const item = userTransactions().find(transaction => transaction.id === transactionId);
  if (!item) return showToast("Não foi possível concluir a operação.");
  if (item.sourcePurchaseId) {
    editingPurchaseId = item.sourcePurchaseId;
    selectedCardId = userCardPurchases().find(purchase => purchase.id === item.sourcePurchaseId)?.cardId || selectedCardId;
    currentView = "purchaseEditor";
    render();
    return;
  }
  editingTransactionId = item.id;
  const form = document.querySelector("#transaction-form");
  form.reset();
  form.elements.type.value = item.type;
  updateStatusOptions();
  refreshTransactionLists(item.category);
  Object.entries(item).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  form.elements.amount.value = String(item.amount).replace(".", ",");
  document.querySelector("#form-title").textContent = "Editar transação";
  document.querySelector("#transaction-dialog").showModal();
}

document.querySelector("[data-close-dialog]").addEventListener("click", () => document.querySelector("#transaction-dialog").close());
document.querySelector("[data-close-category-dialog]")?.addEventListener("click", () => document.querySelector("#category-dialog")?.close());
document.querySelector("#category-form")?.addEventListener("submit", saveCategory);
document.querySelectorAll("#transaction-form input[name='type']").forEach(input => input.addEventListener("change", () => {
  updateStatusOptions();
  refreshTransactionLists();
}));
document.querySelector("#transaction-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (isMaster()) return;
  const data = new FormData(event.currentTarget);
  const amount = Number(String(data.get("amount")).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return showToast("Informe um valor válido.");
  const existingItem = editingTransactionId ? (db.transactions[session] || []).find(item => item.id === editingTransactionId) : null;
  const values = {
    name: data.get("name").trim(),
    amount,
    type: data.get("type"),
    repeat: data.get("repeat"),
    dueDate: data.get("dueDate"),
    status: data.get("status"),
    category: data.get("category"),
    account: existingItem?.account || "Conta corrente",
    paymentMethod: existingItem?.paymentMethod || "",
    paidDate: existingItem?.paidDate || "",
    paidTime: existingItem?.paidTime || ""
  };
  const requiresPaymentMethod = isPaidStatus(values) && (!existingItem || !isPaidStatus(existingItem) || !existingItem.paymentMethod);
  if (requiresPaymentMethod) {
    const method = await requestPaymentMethod(values);
    if (!method) return;
    const paidAt = nowParts();
    values.paymentMethod = method;
    values.paidDate = paidAt.date;
    values.paidTime = paidAt.time;
  } else if (!isPaidStatus(values)) {
    values.paymentMethod = "";
    values.paidDate = "";
    values.paidTime = "";
    if (!await confirmAction()) return;
  } else if (!await confirmAction()) {
    return;
  }
  db.transactions[session] ||= [];
  let savedItem;
  let previousType = values.type;
  const wasEditingTransaction = Boolean(editingTransactionId);
  if (editingTransactionId) {
    const index = db.transactions[session].findIndex(item => item.id === editingTransactionId);
    if (index < 0) return showToast("Não foi possível concluir a operação.");
    previousType = db.transactions[session][index].type;
    db.transactions[session][index] = { ...db.transactions[session][index], ...values };
    savedItem = db.transactions[session][index];
  } else {
    savedItem = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...values };
    db.transactions[session].unshift(savedItem);
  }
  try {
    await saveTransactionToSupabase(savedItem, previousType);
    await refreshUserFinancialData();
    const refreshedItem = (db.transactions[session] || []).find(item => item.id === savedItem.id);
    if (refreshedItem && savedItem.createdAt) refreshedItem.createdAt = savedItem.createdAt;
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  logActivity(`${actionVerb(wasEditingTransaction, "Cadastrou", "Editou")} ${savedItem.type === "income" ? "receita" : "despesa"} ${savedItem.name}. Valor: ${money(savedItem.amount)}`);
  editingTransactionId = null;
  document.querySelector("#transaction-dialog").close();
  showToast("Operação realizada com sucesso.");
  render();
});

async function deleteTransaction(transactionId) {
  if (isMaster() || !await confirmAction()) return;
  const item = (db.transactions[session] || []).find(transaction => transaction.id === transactionId);
  if (!item) return showToast("Não foi possível concluir a operação.");
  try {
    await deleteRowById(item.type === "income" ? "receitas" : "despesas", item.id);
    db.transactions[session] = (db.transactions[session] || []).filter(transaction => transaction.id !== transactionId);
    cacheDatabase();
    await refreshUserFinancialData();
  } catch (error) {
    return showDeleteError(error);
  }
  logActivity(`Excluiu ${item.type === "income" ? "receita" : "despesa"} ${item.name}. Valor: ${money(item.amount)}`);
  showToast("Operação realizada com sucesso.");
  render();
}

async function markTransactionPaid(transactionId) {
  if (isMaster()) return;
  const item = (db.transactions[session] || []).find(transaction => transaction.id === transactionId);
  if (!item) return showToast("Não foi possível concluir a operação.");
  const method = await requestPaymentMethod(item);
  if (!method) return;
  item.status = item.type === "income" ? "received" : "paid";
  const paidAt = nowParts();
  item.paidDate = paidAt.date;
  item.paidTime = paidAt.time;
  item.paymentMethod = method;
  try {
    await saveTransactionToSupabase(item);
    await refreshUserFinancialData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  logActivity(`${item.type === "income" ? "Marcou receita como recebida" : "Marcou despesa como paga"}: ${item.name}. Valor: ${money(item.amount)}`);
  showToast("Operação realizada com sucesso.");
  render();
}

function refreshTransactionLists(currentCategory = "") {
  const form = document.querySelector("#transaction-form");
  if (!form) return;
  fillSelect(form.elements.category, transactionCategoryNames(form.elements.type.value, currentCategory), currentCategory || preferredCategory);
}

function refreshPurchaseLists() {
  const form = document.querySelector("#purchase-form");
  if (!form) return;
  fillSelect(form.elements.category, userCategories(), preferredCategory);
}

function fillSelect(select, values, preferred = "") {
  const current = preferred || select.value;
  select.innerHTML = values.map(value => `<option>${escapeHtml(value)}</option>`).join("");
  if (values.includes(current)) select.value = current;
}

function updateStatusOptions() {
  const form = document.querySelector("#transaction-form");
  const isIncome = form.elements.type.value === "income";
  document.querySelector("#status-label").textContent = isIncome ? "Status da receita" : "Status";
  form.elements.status.innerHTML = isIncome
    ? `<option value="pending">A receber</option><option value="received">Recebido</option>`
    : `<option value="pending">Não pago</option><option value="paid">Pago</option>`;
}

function updatePurchaseInvoiceInfo(event) {
  const card = userCards().find(item => item.id === event.currentTarget.value);
  const target = document.querySelector("[data-invoice-info]");
  if (target) target.textContent = `Dia ${card?.closingDay || "-"} · Vence dia ${card?.dueDay || "-"}`;
}

async function saveSupportTicket(event) {
  event.preventDefault();
  if (isMaster()) return showToast("Acesso não autorizado.");
  const data = new FormData(event.currentTarget);
  const user = currentUser();
  const now = new Date();
  db.supportTickets ||= [];
  db.supportTickets.push({
    id: crypto.randomUUID(),
    userId: user.id,
    name: user.name,
    username: user.username,
    whatsapp: user.whatsapp || "",
    email: user.email || "",
    subject: data.get("subject").trim(),
    message: data.get("message").trim(),
    status: "pending",
    date: localDateKey(now),
    time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    createdAt: now.toISOString()
  });
  saveDatabase();
  event.currentTarget.reset();
  showToast("Operação realizada com sucesso.");
  render();
}

async function updateSupportStatus(ticketId, status) {
  if (!isMaster()) return showToast("Acesso não autorizado.");
  const ticket = (db.supportTickets || []).find(item => item.id === ticketId);
  if (!ticket || !SUPPORT_STATUSES[status]) return showToast("Não foi possível concluir a operação.");
  if (!await confirmAction()) return;
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  saveDatabase();
  showToast("Operação realizada com sucesso.");
  render();
}

function toggleSupportReply(ticketId) {
  if (!isMaster()) return showToast("Acesso não autorizado.");
  const ticket = (db.supportTickets || []).find(item => item.id === ticketId);
  if (!ticket) return showToast("Não foi possível concluir a operação.");
  ticket.replyOpen = !ticket.replyOpen;
  render();
}

async function sendSupportReply(event) {
  event.preventDefault();
  if (!isMaster()) return showToast("Acesso não autorizado.");
  const ticket = (db.supportTickets || []).find(item => item.id === event.currentTarget.dataset.replyForm);
  if (!ticket) return showToast("Não foi possível concluir a operação.");
  const data = new FormData(event.currentTarget);
  const now = new Date();
  ticket.reply = {
    message: data.get("reply").trim(),
    date: localDateKey(now),
    time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    createdAt: now.toISOString()
  };
  ticket.status = "progress";
  ticket.replyOpen = false;
  saveDatabase();
  showToast("Operação realizada com sucesso.");
  render();
}

function openSupportWhatsapp(ticketId) {
  if (!isMaster()) return showToast("Acesso não autorizado.");
  const ticket = (db.supportTickets || []).find(item => item.id === ticketId);
  if (!ticket) return showToast("Não foi possível concluir a operação.");
  const phone = normalizePhone(ticket.whatsapp);
  if (!phone) return showToast("WhatsApp não informado.");
  const message = `Olá, ${ticket.name}.\n\nRecebi sua solicitação pelo MEU BOLSO.\n\nChamado:\n${ticket.subject}\n\nComo posso ajudar?`;
  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

async function deleteSupportTicket(ticketId) {
  const ticket = (db.supportTickets || []).find(item => item.id === ticketId);
  if (!ticket || !await confirmAction()) return;
  if (!isMaster() && ticket.userId !== session) return showToast("Acesso não autorizado.");
  try {
    await deleteRowById("suporte", ticketId);
    if (isMaster()) await refreshMasterData();
    else await refreshCurrentUserData();
  } catch (error) {
    return showDeleteError(error);
  }
  showToast("Operação realizada com sucesso.");
  render();
}

async function saveUser(event) {
  event.preventDefault();
  if (!isMaster()) return showToast("Acesso não autorizado.");
  const data = new FormData(event.currentTarget);
  const id = data.get("id");
  const username = data.get("username").trim().toLowerCase();
  const whatsapp = data.get("whatsapp").trim();
  const normalizedWhatsapp = normalizePhone(whatsapp);
  const email = data.get("email").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/i.test(username)) {
    return showToast("Use apenas letras, números, ponto, hífen ou sublinhado.");
  }
  if (!isValidEmail(email)) return showToast("Informe um e-mail válido.");
  if (db.users.some(user => user.username.toLowerCase() === username && user.id !== id)) return showToast("Este nome de usuário já existe.");
  if (normalizedWhatsapp && db.users.some(user => normalizePhone(user.whatsapp) === normalizedWhatsapp && user.id !== id)) return showToast("Este WhatsApp já está cadastrado.");
  if (db.users.some(user => user.email?.toLowerCase() === email && user.id !== id)) return showToast("Este e-mail já está cadastrado.");
  if (!await confirmAction()) return;
  const renewalPrice = Number(String(data.get("renewalPrice")).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(renewalPrice) || renewalPrice < 0) return showToast("Não foi possível concluir a operação.");

  if (id) {
    const user = regularUsers().find(item => item.id === id);
    if (!user) return showToast("Usuário não encontrado.");
    user.name = data.get("name").trim();
    user.username = username;
    user.whatsapp = whatsapp;
    user.email = email;
    user.accessExpiresAt = data.get("accessExpiresAt");
    user.renewalPrice = renewalPrice;
    if (data.get("password")) user.password = data.get("password");
    editingUserId = null;
  } else {
    const newId = crypto.randomUUID();
    db.users.push({
      id: newId,
      name: data.get("name").trim(),
      username,
      password: data.get("password"),
      whatsapp,
      email,
      role: "user",
      createdAt: dateOffset(),
      accessExpiresAt: data.get("accessExpiresAt"),
      blocked: false,
      renewalPrice
    });
    db.transactions[newId] = [];
    db.cards[newId] = [];
    db.cardPurchases[newId] = [];
    db.categories[newId] = defaultCategoryRecords();
    db.accounts[newId] = [...DEFAULT_ACCOUNTS];
  }
  userFormOpen = false;
  await saveDatabase();
  try {
    await refreshMasterData();
  } catch (error) {
    console.error("[MEU BOLSO][Supabase] erro ao recarregar usuários master", error);
  }
  showToast("Operação realizada com sucesso.");
  render();
}

async function deleteUserCascade(userId) {
  const userFilter = supabaseEq("usuario_id", userId);
  await deleteRows("parcelas", userFilter);
  await deleteRows("compras_cartao", userFilter);
  await deleteRows("cartoes", userFilter);
  await deleteRows("despesas", userFilter);
  await deleteRows("receitas", userFilter);
  await deleteRows("suporte", userFilter);
  await deleteRows("renovacoes", userFilter);
  await deleteRows("categorias", userFilter);
  await deleteRows("tipos_conta", userFilter);
  await deleteRowById("usuarios", userId);
}

async function deleteUser(userId) {
  if (!isMaster()) return showToast("Acesso não autorizado.");
  if (userId === session) return showToast("Ação não permitida para o Master.");
  const user = db.users.find(item => item.id === userId);
  if (!user || user.role === "master") return showToast("Ação não permitida para o Master.");
  if (!await confirmAction()) return;
  try {
    await deleteUserCascade(userId);
    await refreshMasterData();
  } catch (error) {
    return showDeleteError(error);
  }
  if (reportUserId === userId) reportUserId = "all";
  if (editingUserId === userId) editingUserId = null;
  showToast("Operação realizada com sucesso.");
  render();
}

async function toggleUserBlock(userId) {
  if (!isMaster()) return showToast("Acesso não autorizado.");
  if (userId === session) return showToast("Ação não permitida para o Master.");
  const user = db.users.find(item => item.id === userId);
  if (!user || user.role === "master") return showToast("Ação não permitida para o Master.");
  if (!await confirmAction()) return;
  user.blocked = !user.blocked;
  try {
    await saveDatabase();
    await refreshMasterData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  showToast("Operação realizada com sucesso.");
  render();
}

async function renewUser(userId) {
  if (!isMaster()) return showToast("Acesso não autorizado.");
  const user = regularUsers().find(item => item.id === userId);
  if (!user) return;
  const newDate = await chooseRenewalDate(user);
  if (!newDate) return;
  if (!await confirmAction()) return;
  user.accessExpiresAt = newDate;
  user.blocked = false;
  db.renewals ||= [];
  db.renewals.push({ id: crypto.randomUUID(), userId: user.id, date: dateOffset(), amount: Number(user.renewalPrice || 0), accessExpiresAt: newDate });
  try {
    await saveDatabase();
    await refreshMasterData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  showToast("Operação realizada com sucesso.");
  render();
}

function chooseRenewalDate(user) {
  const dialog = document.querySelector("#renew-dialog");
  const customInput = document.querySelector("#renew-custom-date");
  const cancel = dialog.querySelector("[data-renew-cancel]");
  const applyCustom = dialog.querySelector("[data-renew-custom]");
  renewTargetUserId = user.id;
  customInput.value = user.accessExpiresAt >= dateOffset() ? user.accessExpiresAt : dateOffset();
  dialog.showModal();
  return new Promise(resolve => {
    const cleanup = value => {
      dialog.querySelectorAll("[data-renew-months]").forEach(button => button.removeEventListener("click", onMonths));
      cancel.removeEventListener("click", onCancel);
      applyCustom.removeEventListener("click", onCustom);
      dialog.removeEventListener("cancel", onCancelEvent);
      dialog.close();
      renewTargetUserId = null;
      if (!value) showToast("Operação cancelada.");
      resolve(value);
    };
    const fromMonths = months => {
      const base = user.accessExpiresAt >= dateOffset() ? new Date(`${user.accessExpiresAt}T12:00:00`) : new Date(`${dateOffset()}T12:00:00`);
      base.setMonth(base.getMonth() + months);
      return localDateKey(base);
    };
    const onMonths = event => cleanup(fromMonths(Number(event.currentTarget.dataset.renewMonths)));
    const onCancel = () => cleanup(null);
    const onCustom = () => cleanup(customInput.value || null);
    const onCancelEvent = event => {
      event.preventDefault();
      cleanup(null);
    };
    dialog.querySelectorAll("[data-renew-months]").forEach(button => button.addEventListener("click", onMonths));
    cancel.addEventListener("click", onCancel);
    applyCustom.addEventListener("click", onCustom);
    dialog.addEventListener("cancel", onCancelEvent);
  });
}

async function saveCard(event) {
  event.preventDefault();
  if (isMaster()) return;
  const data = new FormData(event.currentTarget);
  const id = data.get("id");
  const name = data.get("name").trim();
  const duplicate = userCards().some(card => card.name.toLowerCase() === name.toLowerCase() && card.id !== id);
  if (duplicate) return showToast("Não foi possível concluir a operação.");
  const limit = parseMoney(data.get("limit"));
  const closingDay = Number(data.get("closingDay"));
  const dueDay = Number(data.get("dueDay"));
  if (!Number.isFinite(limit) || limit <= 0 || closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31) return showToast("Não foi possível concluir a operação.");
  if (!await confirmAction()) return;
  db.cards[session] ||= [];
  let savedCard;
  const wasEditingCard = Boolean(id);
  if (id) {
    const card = db.cards[session].find(item => item.id === id);
    if (!card) return showToast("Não foi possível concluir a operação.");
    Object.assign(card, { name, brand: data.get("brand"), limit, closingDay, dueDay });
    savedCard = card;
    editingCardId = null;
  } else {
    const newCard = { id: crypto.randomUUID(), name, brand: data.get("brand"), limit, closingDay, dueDay };
    db.cards[session].push(newCard);
    savedCard = newCard;
    selectedCardId = newCard.id;
  }
  try {
    await saveCardToSupabase(savedCard);
    await refreshUserFinancialData();
    selectedCardId = savedCard.id;
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  document.querySelector("#card-dialog")?.close();
  editingCardId = null;
  logActivity(`${actionVerb(wasEditingCard, "Cadastrou cartão", "Editou cartão")} ${savedCard.name}. Limite: ${money(savedCard.limit)}`);
  showToast("Cartão salvo com sucesso.");
  render();
}

async function saveCardPurchase(event) {
  event.preventDefault();
  if (isMaster()) return;
  const data = new FormData(event.currentTarget);
  const id = data.get("id");
  const amount = parseMoney(data.get("amount"));
  const installments = Number(data.get("installments"));
  if (!Number.isFinite(amount) || amount <= 0 || installments < 1 || installments > 12) return showToast("Não foi possível concluir a operação.");
  if (!await confirmAction()) return;
  db.cardPurchases[session] ||= [];
  const values = {
    cardId: data.get("cardId"),
    name: data.get("name").trim(),
    amount,
    installments,
    purchaseDate: invoiceClosingDate(data.get("cardId")),
    category: data.get("category").trim(),
    paidInstallments: []
  };
  const status = data.get("status");
  const pendingValue = status === "paid" ? 0 : amount;
  const cardLimit = Number(userCards().find(card => card.id === values.cardId)?.limit || 0);
  const currentPendingWithoutThis = pendingPurchaseTotal(values.cardId, id || null);
  if (pendingValue > Math.max(cardLimit - currentPendingWithoutThis, 0)) {
    return showToast("Limite insuficiente para esta compra.");
  }
  let savedPurchase;
  const wasEditingPurchase = Boolean(id);
  if (id) {
    const purchase = db.cardPurchases[session].find(item => item.id === id);
    if (!purchase) return showToast("Não foi possível concluir a operação.");
    const previousPaid = purchase.paidInstallments || [];
    const wasFullyPaid = allInstallmentsPaid(purchase);
    Object.assign(purchase, values);
    const validKeys = allInstallmentKeys(purchase);
    if (status === "paid") {
      purchase.paidInstallments = validKeys;
      ensureInstallmentPayments(purchase);
    } else {
      purchase.paidInstallments = wasFullyPaid ? [] : previousPaid.filter(key => validKeys.includes(key));
    }
    db.transactions[session] = (db.transactions[session] || []).filter(item => item.sourcePurchaseId !== purchase.id);
    syncPaidInstallmentTransactions(purchase);
    savedPurchase = purchase;
    editingPurchaseId = null;
  } else {
    const purchase = { id: crypto.randomUUID(), ...values };
    if (status === "paid") {
      purchase.paidInstallments = allInstallmentKeys(purchase);
      ensureInstallmentPayments(purchase);
    }
    db.cardPurchases[session].push(purchase);
    syncPaidInstallmentTransactions(purchase);
    savedPurchase = purchase;
    selectedCardId = purchase.cardId;
  }
  try {
    await savePurchaseToSupabase(savedPurchase);
    const installmentTransactions = (db.transactions[session] || []).filter(item => item.sourcePurchaseId === savedPurchase.id);
    await Promise.all(installmentTransactions.map(item => saveTransactionToSupabase(item)));
    await refreshUserFinancialData();
    selectedCardId = savedPurchase.cardId;
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  purchaseFormOpen = false;
  editingPurchaseId = null;
  selectedCardId = savedPurchase.cardId;
  currentView = "cardPurchases";
  const purchaseCard = userCards().find(card => card.id === savedPurchase.cardId);
  logActivity(`${actionVerb(wasEditingPurchase, "Cadastrou compra", "Editou compra")} ${savedPurchase.name} no cartão ${purchaseCard?.name || "Cartão"}. Valor: ${money(savedPurchase.amount)}`);
  showToast("Compra salva com sucesso.");
  render();
}

function allInstallmentKeys(purchase) {
  return Array.from({ length: purchase.installments }, (_, index) => {
    const date = new Date(`${purchase.purchaseDate}T12:00:00`);
    date.setMonth(date.getMonth() + index);
    return `${monthKey(localDateKey(date))}-${index + 1}`;
  });
}

function ensureInstallmentPayments(purchase) {
  purchase.installmentPayments ||= {};
  const paidAt = nowParts();
  const account = userCards().find(card => card.id === purchase.cardId)?.name || "Cartão";
  (purchase.paidInstallments || []).forEach(key => {
    purchase.installmentPayments[key] ||= {
      paidDate: paidAt.date,
      paidTime: paidAt.time,
      paymentMethod: "Cartão",
      account
    };
  });
}

function syncPaidInstallmentTransactions(purchase) {
  db.transactions[session] ||= [];
  purchase.paidInstallments ||= [];
  purchase.paidInstallments.forEach(key => {
    if (db.transactions[session].some(item => item.sourcePurchaseId === purchase.id && item.sourceInstallment === key)) return;
    const installmentNumber = Number(key.split("-").pop());
    const payment = purchase.installmentPayments?.[key] || {};
    db.transactions[session].unshift({
      id: crypto.randomUUID(),
      source: "card-installment",
      sourcePurchaseId: purchase.id,
      sourceInstallment: key,
      name: `${purchase.name} (${installmentNumber}/${purchase.installments})`,
      amount: purchase.amount / purchase.installments,
      type: "expense",
      repeat: "none",
      dueDate: `${key.slice(0, 7)}-01`,
      status: "paid",
      category: purchase.category || "Outros",
      account: payment.account || "Cartão",
      paymentMethod: payment.paymentMethod || "Cartão",
      paidDate: payment.paidDate || dateOffset(),
      paidTime: payment.paidTime || nowParts().time
    });
  });
}

async function deleteCard(cardId) {
  if (isMaster() || !await confirmAction()) return;
  const card = userCards().find(item => item.id === cardId);
  if (!card) return showToast("Não foi possível concluir a operação.");
  try {
    await deleteCardCascade(cardId);
    db.cards[session] = (db.cards[session] || []).filter(item => item.id !== cardId);
    db.cardPurchases[session] = (db.cardPurchases[session] || []).filter(item => item.cardId !== cardId);
    db.transactions[session] = (db.transactions[session] || []).filter(item => item.cardId !== cardId);
    cacheDatabase();
    await refreshUserFinancialData();
  } catch (error) {
    return showDeleteError(error);
  }
  if (selectedCardId === cardId) selectedCardId = userCards()[0]?.id || null;
  logActivity(`Excluiu cartão ${card.name}.`);
  showToast("Operação realizada com sucesso.");
  render();
}

async function deleteCardCascade(cardId) {
  const purchases = userCardPurchases().filter(purchase => purchase.cardId === cardId);
  await Promise.all(purchases.map(purchase => deletePurchaseCascade(purchase.id)));
  await deleteRows("compras_cartao", supabaseEq("cartao_id", cardId));
  await deleteRowById("cartoes", cardId);
}

async function deletePurchase(purchaseId) {
  if (isMaster() || !await confirmAction()) return;
  const purchase = userCardPurchases().find(item => item.id === purchaseId);
  if (!purchase) return showToast("Não foi possível concluir a operação.");
  try {
    await deletePurchaseCascade(purchaseId);
    db.cardPurchases[session] = (db.cardPurchases[session] || []).filter(item => item.id !== purchaseId);
    db.transactions[session] = (db.transactions[session] || []).filter(item => item.sourcePurchaseId !== purchaseId);
    cacheDatabase();
    await refreshUserFinancialData();
  } catch (error) {
    return showDeleteError(error);
  }
  selectedCardId = purchase.cardId;
  currentView = "cardPurchases";
  logActivity(`Excluiu compra ${purchase.name}. Valor: ${money(purchase.amount)}`);
  showToast("Operação realizada com sucesso.");
  render();
}

async function deletePurchaseCascade(purchaseId) {
  await deleteRows("despesas", supabaseEq("compra_cartao_id", purchaseId));
  await deleteRows("parcelas", supabaseEq("compra_cartao_id", purchaseId));
  await deleteRowById("compras_cartao", purchaseId);
}

async function payCardInstallment(purchaseId, installmentKey = null, options = {}) {
  if (isMaster()) return;
  if (!options.fromNotification && !await confirmAction()) return;
  const purchase = userCardPurchases().find(item => item.id === purchaseId);
  if (!purchase) return showToast("Não foi possível concluir a operação.");
  const info = installmentInfo(purchase);
  const pending = nextPendingInstallment(purchase);
  const key = installmentKey || pending?.key || info.key;
  if (!installmentKey && !pending) return showToast("Não foi possível concluir a operação.");
  if ((purchase.paidInstallments || []).includes(key)) return showToast("Não foi possível concluir a operação.");
  const card = userCards().find(item => item.id === purchase.cardId);
  const installmentNumber = Number(String(key).split("-").pop()) || 1;
  let paymentMethod = "Cartão";
  if (options.fromNotification) {
    paymentMethod = await requestPaymentMethod({
      type: "expense",
      name: `${card?.name || "Cartão"} · ${purchase.name} · Parcela ${installmentNumber}/${purchase.installments}`,
      amount: Number(purchase.amount || 0) / Number(purchase.installments || 1),
      dueDate: installmentDueDate(purchase, installmentNumber)
    }, {
      eyebrow: "Confirmar pagamento da parcela",
      title: "Marcar parcela como paga"
    });
    if (!paymentMethod) return;
  }
  purchase.paidInstallments ||= [];
  purchase.installmentPayments ||= {};
  const paidAt = nowParts();
  purchase.installmentPayments[key] = {
    paidDate: paidAt.date,
    paidTime: paidAt.time,
    paymentMethod,
    account: card?.name || "Cartão"
  };
  purchase.paidInstallments.push(key);
  db.transactions[session] ||= [];
  syncPaidInstallmentTransactions(purchase);
  try {
    await savePurchaseToSupabase(purchase);
    const installmentTransactions = (db.transactions[session] || []).filter(item => item.sourcePurchaseId === purchase.id);
    await Promise.all(installmentTransactions.map(item => saveTransactionToSupabase(item)));
    await refreshUserFinancialData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  logActivity(`Marcou parcela ${purchase.name} como paga. Valor: ${money(info.value)}`);
  showToast("Operação realizada com sucesso.");
  render();
}

async function payPayablesCardGroup(cardId) {
  if (isMaster()) return;
  const group = payablesCardGroups().find(entry => entry.card.id === cardId);
  if (!group?.items.length || group.total <= 0) return showToast("Não há parcelas pendentes para este cartão.");
  const method = await requestPaymentMethod({
    type: "expense",
    name: `Parcelas do cartão ${group.card.name}`,
    amount: group.total,
    dueDate: group.items[0].dueDate
  });
  if (!method) return;
  const purchaseIds = [...new Set(group.items.map(item => item.purchase.id))];
  const purchases = purchaseIds.map(id => userCardPurchases().find(item => item.id === id)).filter(Boolean);
  const snapshots = new Map(purchases.map(purchase => [purchase.id, {
    paidInstallments: [...(purchase.paidInstallments || [])],
    installmentPayments: JSON.parse(JSON.stringify(purchase.installmentPayments || {}))
  }]));
  const paidAt = nowParts();
  group.items.forEach(item => {
    const purchase = purchases.find(entry => entry.id === item.purchase.id);
    if (!purchase) return;
    purchase.paidInstallments ||= [];
    purchase.installmentPayments ||= {};
    if (!purchase.paidInstallments.includes(item.sourceInstallment)) purchase.paidInstallments.push(item.sourceInstallment);
    purchase.installmentPayments[item.sourceInstallment] = {
      paidDate: paidAt.date,
      paidTime: paidAt.time,
      paymentMethod: method,
      account: group.card.name
    };
  });
  purchases.forEach(syncPaidInstallmentTransactions);
  try {
    await Promise.all(purchases.map(savePurchaseToSupabase));
    const paidTransactions = (db.transactions[session] || []).filter(item => purchaseIds.includes(item.sourcePurchaseId));
    await Promise.all(paidTransactions.map(item => saveTransactionToSupabase(item)));
    await refreshUserFinancialData();
  } catch (error) {
    purchases.forEach(purchase => {
      const snapshot = snapshots.get(purchase.id);
      purchase.paidInstallments = snapshot.paidInstallments;
      purchase.installmentPayments = snapshot.installmentPayments;
    });
    return showToast("Não foi possível salvar no Supabase.");
  }
  logActivity(`Pagou parcelas do cartão ${group.card.name}. Valor: ${money(group.total)}. Método: ${method}.`);
  showToast("Parcelas pagas com sucesso.");
  render();
}

async function payOverdueCardGroup(cardId) {
  if (isMaster()) return;
  const group = overdueCardGroups().find(entry => entry.card.id === cardId);
  if (!group?.items.length || group.total <= 0) return showToast("Não há parcelas vencidas para este cartão.");
  const method = await requestPaymentMethod({
    type: "expense",
    name: `Parcelas vencidas do cartão ${group.card.name}`,
    amount: group.total,
    dueDate: group.items[0].dueDate
  });
  if (!method) return;
  const purchaseIds = [...new Set(group.items.map(item => item.purchase.id))];
  const purchases = purchaseIds.map(id => userCardPurchases().find(item => item.id === id)).filter(Boolean);
  const snapshots = new Map(purchases.map(purchase => [purchase.id, {
    paidInstallments: [...(purchase.paidInstallments || [])],
    installmentPayments: JSON.parse(JSON.stringify(purchase.installmentPayments || {}))
  }]));
  const paidAt = nowParts();
  group.items.forEach(item => {
    const purchase = purchases.find(entry => entry.id === item.purchase.id);
    if (!purchase) return;
    purchase.paidInstallments ||= [];
    purchase.installmentPayments ||= {};
    if (!purchase.paidInstallments.includes(item.sourceInstallment)) purchase.paidInstallments.push(item.sourceInstallment);
    purchase.installmentPayments[item.sourceInstallment] = {
      paidDate: paidAt.date,
      paidTime: paidAt.time,
      paymentMethod: method,
      account: group.card.name
    };
  });
  purchases.forEach(syncPaidInstallmentTransactions);
  try {
    await Promise.all(purchases.map(savePurchaseToSupabase));
    const paidTransactions = (db.transactions[session] || []).filter(item => purchaseIds.includes(item.sourcePurchaseId));
    await Promise.all(paidTransactions.map(item => saveTransactionToSupabase(item)));
    await refreshUserFinancialData();
  } catch (error) {
    purchases.forEach(purchase => {
      const snapshot = snapshots.get(purchase.id);
      purchase.paidInstallments = snapshot.paidInstallments;
      purchase.installmentPayments = snapshot.installmentPayments;
    });
    return showToast("Não foi possível salvar no Supabase.");
  }
  logActivity(`Pagou parcelas vencidas do cartão ${group.card.name}. Valor: ${money(group.total)}. Método: ${method}.`);
  showToast("Parcelas vencidas pagas com sucesso.");
  render();
}

async function payCardInvoice(cardId, options = {}) {
  if (isMaster()) return;
  const pending = userCardPurchases().filter(purchase => purchase.cardId === cardId).map(purchase => ({ purchase, info: installmentInfo(purchase) })).filter(item => item.info.active && !item.info.paid);
  const total = pending.reduce((sum, item) => sum + item.info.value, 0);
  if (!pending.length || total <= 0) return showToast("Não há fatura pendente para este cartão.");
  const card = userCards().find(item => item.id === cardId);
  let paymentMethod = "Cartão";
  if (options.fromNotification) {
    const now = new Date(`${dateOffset()}T12:00:00`);
    const dueDate = localDateKey(new Date(now.getFullYear(), now.getMonth(), Math.min(Number(card?.dueDay || 1), daysInMonth(now.getFullYear(), now.getMonth())), 12));
    paymentMethod = await requestPaymentMethod({
      type: "expense",
      name: `Fatura do cartão ${card?.name || "Cartão"}`,
      amount: total,
      dueDate
    }, {
      eyebrow: "Confirmar pagamento",
      title: "Confirmar pagamento da fatura"
    });
    if (!paymentMethod) return;
  } else if (!await confirmInvoicePayment(total)) return;
  const paidAt = nowParts();
  const account = card?.name || "Cartão";
  pending.forEach(({ purchase, info }) => {
    purchase.paidInstallments ||= [];
    purchase.installmentPayments ||= {};
    purchase.installmentPayments[info.key] = {
      paidDate: paidAt.date,
      paidTime: paidAt.time,
      paymentMethod,
      account
    };
    if (!purchase.paidInstallments.includes(info.key)) purchase.paidInstallments.push(info.key);
    syncPaidInstallmentTransactions(purchase);
  });
  try {
    await Promise.all(pending.map(({ purchase }) => savePurchaseToSupabase(purchase)));
    const installmentTransactions = (db.transactions[session] || []).filter(item => pending.some(({ purchase }) => item.sourcePurchaseId === purchase.id));
    await Promise.all(installmentTransactions.map(item => saveTransactionToSupabase(item)));
    await refreshUserFinancialData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  const paidCard = userCards().find(card => card.id === cardId);
  logActivity(`Pagou fatura do cartão ${paidCard?.name || "Cartão"}. Valor: ${money(total)}`);
  showToast("Operação realizada com sucesso.");
  render();
}

async function closePurchase(purchaseId) {
  if (isMaster() || !await confirmAction()) return;
  const purchase = userCardPurchases().find(item => item.id === purchaseId);
  if (!purchase || !allInstallmentsPaid(purchase)) return showToast("Não foi possível concluir a operação.");
  purchase.closed = true;
  try {
    await savePurchaseToSupabase(purchase);
    await refreshUserFinancialData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  showToast("Operação realizada com sucesso.");
  render();
}

async function changePassword(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const user = currentUser();
  if (data.get("currentPassword") !== user.password || data.get("newPassword") !== data.get("confirmPassword")) {
    return showToast("Não foi possível concluir a operação.");
  }
  if (!await confirmAction()) return;
  user.password = data.get("newPassword");
  saveDatabase();
  event.currentTarget.reset();
  showToast("Operação realizada com sucesso.");
}

function parseMoney(value) {
  return Number(String(value).replace(/\./g, "").replace(",", "."));
}

function nowParts() {
  const now = new Date();
  return {
    date: localDateKey(now),
    time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  };
}

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?$/.test(String(value).trim());
}

document.querySelector("[data-close-list]").addEventListener("click", () => document.querySelector("#list-dialog").close());
document.querySelector("#list-form").addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name").trim();
  if (!name) return;
  const list = activeListType === "categories" ? db.categories[session] : db.accounts[session];
  const duplicate = list.some(item => item.toLowerCase() === name.toLowerCase() && item !== editingListItem);
  if (duplicate) return showToast("Não foi possível concluir a operação.");
  if (!await confirmAction()) return;
  if (editingListItem) {
    const index = list.indexOf(editingListItem);
    if (index >= 0) list[index] = name;
    updateTransactionsListValue(activeListType, editingListItem, name);
  } else {
    list.push(name);
  }
  try {
    await saveListItemToSupabase(activeListType, name);
    await refreshUserFinancialData();
  } catch (error) {
    return showToast("Não foi possível salvar no Supabase.");
  }
  if (activeListType === "categories") preferredCategory = name;
  else preferredAccount = name;
  editingListItem = null;
  event.currentTarget.reset();
  renderListManager();
  refreshTransactionLists();
  refreshPurchaseLists();
  preferredCategory = "";
  preferredAccount = "";
  showToast("Operação realizada com sucesso.");
});

function openListManager(type) {
  activeListType = type;
  editingListItem = null;
  document.querySelector("#list-form").reset();
  document.querySelector("#list-dialog").showModal();
  renderListManager();
}

function renderListManager() {
  const title = activeListType === "categories" ? "Categorias" : "Tipos de conta";
  const list = activeListType === "categories" ? userCategories() : userAccounts();
  document.querySelector("#list-title").textContent = title;
  document.querySelector("#list-eyebrow").textContent = "Gerenciar";
  document.querySelector("#list-items").innerHTML = list.map(item => `
    <article class="manage-row">
      <strong>${escapeHtml(item)}</strong>
      <div>
        <button type="button" data-edit-list="${escapeAttribute(item)}">Editar</button>
        <button type="button" class="danger" data-delete-list="${escapeAttribute(item)}">Excluir</button>
      </div>
    </article>
  `).join("");
  document.querySelectorAll("[data-edit-list]").forEach(button => button.addEventListener("click", () => {
    editingListItem = button.dataset.editList;
    document.querySelector("#list-form").elements.name.value = editingListItem;
  }));
  document.querySelectorAll("[data-delete-list]").forEach(button => button.addEventListener("click", () => deleteListItem(button.dataset.deleteList)));
}

async function deleteListItem(item) {
  const list = activeListType === "categories" ? db.categories[session] : db.accounts[session];
  if (list.length <= 1 || !await confirmAction()) return;
  const replacement = list.find(value => value !== item) || "Outros";
  const table = activeListType === "categories" ? "categorias" : "tipos_conta";
  try {
    await deleteRows(table, supabaseAnd(supabaseEq("usuario_id", session), supabaseEq("nome", item)));
  } catch (error) {
    return showDeleteError(error);
  }
  if (activeListType === "categories") db.categories[session] = list.filter(value => value !== item);
  else db.accounts[session] = list.filter(value => value !== item);
  updateTransactionsListValue(activeListType, item, replacement);
  try {
    await saveDatabase();
    await refreshUserFinancialData();
  } catch (error) {
    return showDeleteError(error);
  }
  renderListManager();
  refreshTransactionLists();
  refreshPurchaseLists();
  showToast("Operação realizada com sucesso.");
}

function updateTransactionsListValue(type, oldValue, newValue) {
  (db.transactions[session] || []).forEach(item => {
    if (type === "categories" && item.category === oldValue) item.category = newValue;
    if (type === "accounts" && item.account === oldValue) item.account = newValue;
  });
  (db.cardPurchases[session] || []).forEach(item => {
    if (type === "categories" && item.category === oldValue) item.category = newValue;
  });
}

function setQuickValidity(months) {
  const input = document.querySelector("[name='accessExpiresAt']");
  if (!input) return;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  input.value = localDateKey(date);
  document.querySelectorAll("[data-validity-months]").forEach(button => button.classList.toggle("active", Number(button.dataset.validityMonths) === months));
}

function resetUserFilters() {
  userSearch = "";
  userStatusFilter = "all";
  userExpiryFilter = "";
  userPeriodFilter = "all";
}

function exportPdf() {
  if (!isMaster()) return;
  ensureIndividualReportUser();
  const items = filteredReportTransactions();
  const summary = totals(items);
  const owner = regularUsers().find(user => user.id === reportUserId)?.name;
  const rows = items.map(item => `<tr><td>${escapeHtml(item.ownerName || owner)}</td><td>${formatDate(item.dueDate, true)}</td><td>${escapeHtml(item.name)}</td><td>${typeLabel(item.type)}</td><td>${escapeHtml(item.category)}</td><td>${item.status === "paid" ? "Pago" : "Não pago"}</td><td>${money(item.amount)}</td></tr>`).join("");
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) return showToast("Permita pop-ups para exportar o PDF.");
  reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório financeiro</title><style>body{font:14px Arial;color:#17221f;padding:32px}h1{margin-bottom:4px}p{color:#667}section{display:flex;gap:12px;margin:24px 0}section div{padding:14px;background:#f3f6f4;border-radius:8px}strong{display:block;font-size:18px;margin-top:5px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd;font-size:11px}th{background:#173c32;color:white}@media print{body{padding:0}}</style></head><body><h1>Relatório financeiro</h1><p>${escapeHtml(owner)} · ${escapeHtml(reportLabel())}</p><section><div>Receitas<strong>${money(summary.income)}</strong></div><div>Despesas<strong>${money(summary.expense)}</strong></div><div>Resultado<strong>${money(summary.income - summary.expense)}</strong></div></section><table><thead><tr><th>Usuário</th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows || `<tr><td colspan="7">Sem movimentações no período.</td></tr>`}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
  reportWindow.document.close();
}

function exportExcel() {
  if (!isMaster()) return;
  ensureIndividualReportUser();
  const items = filteredReportTransactions();
  const owner = regularUsers().find(user => user.id === reportUserId)?.name;
  const rows = items.map(item => `<tr><td>${escapeHtml(item.ownerName || owner)}</td><td>${formatDate(item.dueDate, true)}</td><td>${escapeHtml(item.name)}</td><td>${typeLabel(item.type)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.account)}</td><td>${item.status === "paid" ? "Pago" : "Não pago"}</td><td>${item.amount.toFixed(2).replace(".", ",")}</td></tr>`).join("");
  const content = `\ufeff<html><head><meta charset="utf-8"></head><body><table><tr><th colspan="8">Relatório financeiro - ${escapeHtml(reportLabel())}</th></tr><tr><th>Usuário</th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Conta</th><th>Status</th><th>Valor</th></tr>${rows}</table></body></html>`;
  downloadBlob(new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8" }), `relatorio-financeiro-${reportPeriod === "monthly" ? reportMonth : reportYear}.xls`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Arquivo gerado com sucesso.");
}

function typeLabel(type) {
  return ({ income: "Receita", expense: "Despesa", card: "Cartão" })[type] || type;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function confirmAction() {
  const dialog = document.querySelector("#confirm-dialog");
  const yesButton = dialog.querySelector("[data-confirm-yes]");
  const noButton = dialog.querySelector("[data-confirm-no]");
  dialog.showModal();
  return new Promise(resolve => {
    const finish = confirmed => {
      yesButton.removeEventListener("click", onYes);
      noButton.removeEventListener("click", onNo);
      dialog.removeEventListener("cancel", onCancel);
      dialog.close();
      if (!confirmed) showToast("Operação cancelada.");
      resolve(confirmed);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    const onCancel = event => {
      event.preventDefault();
      finish(false);
    };
    yesButton.addEventListener("click", onYes);
    noButton.addEventListener("click", onNo);
    dialog.addEventListener("cancel", onCancel);
  });
}

async function initializeApp() {
  isBooting = true;
  lastSyncError = "";
  render();
  try {
    if (session) {
      const user = await loadUserById(session);
      if (user) {
        if (isAccessBlocked(user)) {
          clearSession();
          db = await loadDatabase();
          authView = "login";
          return;
        }
        saveSession(user);
        if (user.role === "master") {
          db = await loadScopedDatabase(user);
        } else {
          db = normalizeDatabase(fromSupabaseRows({ usuarios: [userToSupabaseLike(user)], receitas: [], despesas: [], cartoes: [], compras: [], parcelas: [], suporte: [], renovacoes: [], categorias: [], tiposConta: [] }));
          await refreshUserFinancialData();
        }
      } else {
        clearSession();
        db = await loadDatabase();
      }
    } else {
      db = await loadDatabase();
    }
    if (session && !currentUser()) {
      clearSession();
    }
  } catch (error) {
    const cached = loadCachedDatabase();
    if (session && isNetworkError(error) && cached) {
      db = cached;
      isOfflineMode = true;
      await ensureMonthlyOccurrences(session);
      lastSyncError = "";
      showToast("Você está offline. As alterações serão sincronizadas quando a internet voltar.");
    } else {
      lastSyncError = error.message;
    }
  } finally {
    isBooting = false;
    render();
  }
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  if (isStandaloneApp()) return;
  deferredInstallPrompt = event;
  render();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  showToast("Aplicativo instalado com sucesso.");
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (serviceWorkerReloading) return;
    serviceWorkerReloading = true;
    window.location.reload();
  });
}

window.addEventListener("load", () => autoCheckAppUpdates());
window.addEventListener("online", async () => {
  isOfflineMode = false;
  await syncOfflineQueue();
  autoCheckAppUpdates();
});
window.addEventListener("offline", () => {
  isOfflineMode = true;
  render();
  showToast("Você está offline. As alterações serão sincronizadas quando a internet voltar.");
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) autoCheckAppUpdates();
});

initializeApp();
