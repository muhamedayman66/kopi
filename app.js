// ==========================================================
// KOPI MONEY - Smart Financial Management App Logic
// ==========================================================

document.getElementById('year').textContent = new Date().getFullYear();

let STATE = {
  contributions: [],
  expenses: [],
  custody: [],
  summary: null,
  lists: null
};

let FILTER_STATE = {
  contributions: { query: '', partner: 'ALL' },
  expenses: { query: '', category: 'ALL' },
  custody: { query: '' }
};

let pollTimer = null;

// ---------- Helper Tools ----------
function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '0 ج';
  const num = Number(n);
  return num.toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج';
}

function formatDateISO(d) {
  const date = d ? new Date(d) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setStatus(state, text) {
  const dot = document.getElementById('statusDot');
  const t = document.getElementById('statusText');
  dot.className = 'status-dot ' + (state === 'ok' ? 'ok' : state === 'err' ? 'err' : '');
  t.textContent = text;
}

function showToast(msg, type) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'toast-msg ' + (type || '');
  el.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span> <span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function isConfigured() {
  return typeof APPS_SCRIPT_URL === 'string' &&
    APPS_SCRIPT_URL.startsWith('http') &&
    !APPS_SCRIPT_URL.includes('PASTE_YOUR');
}

// ---------- Tab Switchers (Desktop + Mobile Sync) ----------
function switchTab(pageId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  document.querySelectorAll('.page-view').forEach(p => p.classList.toggle('active', p.id === 'page-' + pageId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.page));
});

// Quick Action Buttons on Dashboard
document.getElementById('quickAddContrib')?.addEventListener('click', () => openAdd('contributions'));
document.getElementById('quickAddExpense')?.addEventListener('click', () => openAdd('expenses'));
document.getElementById('quickAddCustody')?.addEventListener('click', () => openAdd('custody'));
document.getElementById('refreshBtn')?.addEventListener('click', () => loadData(false));

// ---------- Load Data from Google Apps Script ----------
async function loadData(silent) {
  if (!isConfigured()) {
    document.getElementById('setupBanner').classList.remove('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    setStatus('err', 'غير متصل بالشيت');
    return;
  }

  if (!silent) document.getElementById('loadingState').classList.remove('hidden');

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    STATE = data;

    if (!STATE.lists) {
      STATE.lists = {
        partners: [],
        paymentMethods: ["كاش", "تحويل بانكي", "فودافون كاش", "إنستا باي"],
        expensePaidFrom: ["الخزنة / الصندوق", "عهدة مع شريك"],
        custodyStatus: ["لا - لسه معاه", "نعم - اتصرفت/اتوردت"]
      };
    }

    renderAll();
    setStatus('ok', 'محدث لحظياً');
  } catch (err) {
    console.error(err);
    setStatus('err', 'خطأ بالاتصال');
    if (!silent) {
      showToast('خطأ في تحميل البيانات: ' + (err.message || 'حاول مجدداً'), 'error');
    }
  } finally {
    document.getElementById('loadingState').classList.add('hidden');
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => loadData(true), 25000);
}

// ---------- Main Render Pipeline ----------
function renderAll() {
  renderDashboard();
  renderContributions();
  renderExpenses();
  renderCustody();
}

// 1. Dashboard Render & Smart Calculations
function renderDashboard() {
  const s = STATE.summary;
  const cardsEl = document.getElementById('statCards');
  if (!s) { cardsEl.innerHTML = ''; return; }
  const t = s.totals || {};

  cardsEl.innerHTML = `
    <div class="metric-card emerald">
      <div class="metric-header">
        <span class="metric-title">إجمالي المساهمات المدفوعة</span>
        <span class="metric-icon">💰</span>
      </div>
      <div class="metric-value">${fmtMoney(t.totalContributions)}</div>
      <div class="metric-subtitle">رأس المال الضخ من الشركاء</div>
    </div>

    <div class="metric-card rose">
      <div class="metric-header">
        <span class="metric-title">إجمالي المصروفات</span>
        <span class="metric-icon">🧾</span>
      </div>
      <div class="metric-value">${fmtMoney(t.totalExpenses)}</div>
      <div class="metric-subtitle">مشاريع وتجهيزات وتشغيل</div>
    </div>

    <div class="metric-card amber">
      <div class="metric-header">
        <span class="metric-title">عهد معلقة مع الشركاء</span>
        <span class="metric-icon">🤝</span>
      </div>
      <div class="metric-value">${fmtMoney(t.custodyStillHeld)}</div>
      <div class="metric-subtitle">لم يتم تسويتها بعد</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">الرصيد الصافي المتاح بالخزينة</span>
        <span class="metric-icon">🏦</span>
      </div>
      <div class="metric-value" style="color: ${t.availableBalance < 0 ? 'var(--brand-rose)' : 'var(--brand-blue)'}">
        ${fmtMoney(t.availableBalance)}
      </div>
      <div class="metric-subtitle">${t.availableBalance < 0 ? 'عجز في الخزينة' : 'فائض جاهز للاستخدام'}</div>
    </div>
  `;

  // Partners Summary Table
  const body = document.getElementById('partnersTableBody');
  const partners = (s.partners || []).filter(p => p.name && p.name !== 'الإجمالي');
  const totalRow = (s.partners || []).find(p => p.name === 'الإجمالي');

  let rowsHtml = partners.map(p => `
    <tr>
      <td style="font-weight:800;">${p.name}</td>
      <td class="amount-display">${fmtMoney(p.totalPaid)}</td>
      <td><span class="badge-pill blue">${Math.round((p.sharePercent || 0) * 100)}%</span></td>
      <td>${fmtMoney(p.shareOfExpenses)}</td>
      <td>
        <span class="badge-pill ${p.balance < 0 ? 'rose' : 'green'}">
          ${p.balance < 0 ? 'عليه للمشروع' : 'له لدى المشروع'} ${fmtMoney(Math.abs(p.balance))}
        </span>
      </td>
    </tr>
  `).join('');

  if (totalRow) {
    rowsHtml += `
      <tr style="font-weight:900; background:#f1f5f9;">
        <td>الإجمالي</td>
        <td class="amount-display">${fmtMoney(totalRow.totalPaid)}</td>
        <td><span class="badge-pill blue">100%</span></td>
        <td>${fmtMoney(totalRow.shareOfExpenses)}</td>
        <td>
          <span class="badge-pill ${totalRow.balance < 0 ? 'rose' : 'green'}">
            ${fmtMoney(totalRow.balance)}
          </span>
        </td>
      </tr>`;
  }
  body.innerHTML = rowsHtml || '<tr><td colspan="5" class="empty-state">لا يوجد بيانات مسجلة</td></tr>';

  // Smart Settlement Assistant Calculation
  renderSettlementAssistant(partners);

  // Expense Category Analytics
  renderCategoryAnalytics();
}

// Smart Settlement Algorithm
function renderSettlementAssistant(partners) {
  const container = document.getElementById('settlementBox');
  if (!partners || partners.length === 0) {
    container.innerHTML = '<div class="settlement-balanced">لا يوجد شركاء كافية لحساب التسوية</div>';
    return;
  }

  // Clone balances
  let creditors = []; // له فلوس (> 0)
  let debtors = [];   // عليه فلوس (< 0)

  partners.forEach(p => {
    const bal = Math.round(p.balance || 0);
    if (bal > 10) creditors.push({ name: p.name, amount: bal });
    else if (bal < -10) debtors.push({ name: p.name, amount: Math.abs(bal) });
  });

  if (creditors.length === 0 && debtors.length === 0) {
    container.innerHTML = '<div class="settlement-balanced">🎉 جميع الحسابات متوازنة تماماً بين الشركاء! لا توجد مبالغ مستحقة.</div>';
    return;
  }

  let settlements = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    let creditor = creditors[cIdx];
    let debtor = debtors[dIdx];

    let payAmount = Math.min(creditor.amount, debtor.amount);

    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: payAmount
    });

    creditor.amount -= payAmount;
    debtor.amount -= payAmount;

    if (creditor.amount <= 10) cIdx++;
    if (debtor.amount <= 10) dIdx++;
  }

  container.innerHTML = settlements.map(s => `
    <div class="settlement-card">
      <div class="settlement-details">
        <span style="color:var(--brand-rose);">${s.from}</span>
        <span class="settlement-arrow">⬅️ يدفع إلى</span>
        <span style="color:var(--brand-emerald);">${s.to}</span>
      </div>
      <div class="settlement-amount">${fmtMoney(s.amount)}</div>
    </div>
  `).join('');
}

// Expense Category Analytics Breakdown
function renderCategoryAnalytics() {
  const container = document.getElementById('expenseCategoryList');
  const expenses = STATE.expenses || [];

  if (expenses.length === 0) {
    container.innerHTML = '<div class="empty-state">لا يوجد مصروفات مسجلة بعد</div>';
    return;
  }

  const categoryTotals = {};
  let grandTotal = 0;

  expenses.forEach(e => {
    const item = (e.item || 'عام').trim();
    // Guess category from keywords
    let cat = 'مصاريف عامة';
    if (/إيجار|مرافق|كهرباء|مياه|غاز|نت/i.test(item)) cat = 'إيجار ومرافق';
    else if (/تجهيز|ديكور|معدات|أثاث|شاشة|ماكينة/i.test(item)) cat = 'تجهيزات ومعدات';
    else if (/بضاعة|قهوة|لبن|سكر|مستلزمات|خامات/i.test(item)) cat = 'بضائع ومواد خام';
    else if (/راتب|مرتب|عامل|عمالة|يومية/i.test(item)) cat = 'رواتب وعمالة';
    else if (/صيانة|تصليح|سباكة|كهربائي/i.test(item)) cat = 'صيانة وتصليح';

    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
    grandTotal += e.amount;
  });

  const categories = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    amount: categoryTotals[cat],
    percent: grandTotal > 0 ? Math.round((categoryTotals[cat] / grandTotal) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  container.innerHTML = categories.map(c => `
    <div class="category-item">
      <div class="category-info">
        <span>${c.name}</span>
        <span>${fmtMoney(c.amount)} (${c.percent}%)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${c.percent}%;"></div>
      </div>
    </div>
  `).join('');
}

// 2. Contributions Render (Table + Mobile Cards)
function renderContributions() {
  const body = document.getElementById('contributionsTableBody');
  const mobileList = document.getElementById('contributionsCardsMobile');
  const empty = document.getElementById('contributionsEmpty');

  let rows = STATE.contributions || [];

  // Filtering
  const q = FILTER_STATE.contributions.query.toLowerCase();
  const p = FILTER_STATE.contributions.partner;

  rows = rows.filter(r => {
    const matchQuery = !q || (r.partner && r.partner.toLowerCase().includes(q)) || (r.notes && r.notes.toLowerCase().includes(q));
    const matchPartner = p === 'ALL' || r.partner === p;
    return matchQuery && matchPartner;
  });

  empty.classList.toggle('hidden', rows.length > 0);

  // Desktop Table
  body.innerHTML = rows.map(r => `
    <tr>
      <td>#${r.id ?? ''}</td>
      <td>${r.date || ''}</td>
      <td style="font-weight:800;">${r.partner || ''}</td>
      <td class="amount-display pos">${fmtMoney(r.amount)}</td>
      <td><span class="badge-pill blue">${r.method || 'كاش'}</span></td>
      <td>${r.notes || '—'}</td>
      <td>
        <div class="action-row">
          <button class="btn btn-outline btn-sm" onclick="openEdit('contributions', ${r._row})">تعديل</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('contributions', ${r._row})">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Mobile Cards List
  mobileList.innerHTML = rows.map(r => `
    <div class="mobile-data-card">
      <div class="mobile-card-row">
        <span class="mobile-card-title">${r.partner || 'شريك'}</span>
        <span class="amount-display pos">${fmtMoney(r.amount)}</span>
      </div>
      <div class="mobile-card-row mobile-card-meta">
        <span>📅 ${r.date || ''}</span>
        <span class="badge-pill blue">${r.method || 'كاش'}</span>
      </div>
      ${r.notes ? `<div class="mobile-card-meta">📝 ${r.notes}</div>` : ''}
      <div class="mobile-card-actions">
        <button class="btn btn-outline btn-sm" onclick="openEdit('contributions', ${r._row})">تعديل</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('contributions', ${r._row})">حذف</button>
      </div>
    </div>
  `).join('');

  renderPartnerFilterPills();
}

function renderPartnerFilterPills() {
  const container = document.getElementById('filterContribPartner');
  if (!container) return;
  const partners = (STATE.lists && STATE.lists.partners) || [];
  const curr = FILTER_STATE.contributions.partner;

  let html = `<button class="chip-btn ${curr === 'ALL' ? 'active' : ''}" onclick="setContribFilterPartner('ALL')">الكل</button>`;
  partners.forEach(p => {
    html += `<button class="chip-btn ${curr === p ? 'active' : ''}" onclick="setContribFilterPartner('${p}')">${p}</button>`;
  });
  container.innerHTML = html;
}

function setContribFilterPartner(p) {
  FILTER_STATE.contributions.partner = p;
  renderContributions();
}

// 3. Expenses Render (Table + Mobile Cards)
function renderExpenses() {
  const body = document.getElementById('expensesTableBody');
  const mobileList = document.getElementById('expensesCardsMobile');
  const empty = document.getElementById('expensesEmpty');

  let rows = STATE.expenses || [];

  // Filtering
  const q = FILTER_STATE.expenses.query.toLowerCase();
  rows = rows.filter(r => {
    return !q || (r.item && r.item.toLowerCase().includes(q)) || (r.notes && r.notes.toLowerCase().includes(q)) || (r.paidFrom && r.paidFrom.toLowerCase().includes(q));
  });

  empty.classList.toggle('hidden', rows.length > 0);

  // Desktop Table
  body.innerHTML = rows.map(r => `
    <tr>
      <td>#${r.id ?? ''}</td>
      <td>${r.date || ''}</td>
      <td style="font-weight:800;">${r.item || ''}</td>
      <td class="amount-display neg">${fmtMoney(r.amount)}</td>
      <td><span class="badge-pill blue">${r.paidFrom || 'الخزنة'}</span></td>
      <td>${r.notes || '—'}</td>
      <td>
        <div class="action-row">
          <button class="btn btn-outline btn-sm" onclick="openEdit('expenses', ${r._row})">تعديل</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('expenses', ${r._row})">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Mobile Cards List
  mobileList.innerHTML = rows.map(r => `
    <div class="mobile-data-card">
      <div class="mobile-card-row">
        <span class="mobile-card-title">${r.item || 'مصروف'}</span>
        <span class="amount-display neg">${fmtMoney(r.amount)}</span>
      </div>
      <div class="mobile-card-row mobile-card-meta">
        <span>📅 ${r.date || ''}</span>
        <span class="badge-pill blue">من: ${r.paidFrom || 'الخزنة'}</span>
      </div>
      ${r.notes ? `<div class="mobile-card-meta">📝 ${r.notes}</div>` : ''}
      <div class="mobile-card-actions">
        <button class="btn btn-outline btn-sm" onclick="openEdit('expenses', ${r._row})">تعديل</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('expenses', ${r._row})">حذف</button>
      </div>
    </div>
  `).join('');
}

// 4. Custody Render (Table + Mobile Cards)
function renderCustody() {
  const body = document.getElementById('custodyTableBody');
  const mobileList = document.getElementById('custodyCardsMobile');
  const empty = document.getElementById('custodyEmpty');

  let rows = STATE.custody || [];

  // Filtering
  const q = FILTER_STATE.custody.query.toLowerCase();
  rows = rows.filter(r => {
    return !q || (r.partner && r.partner.toLowerCase().includes(q)) || (r.reason && r.reason.toLowerCase().includes(q));
  });

  empty.classList.toggle('hidden', rows.length > 0);

  body.innerHTML = rows.map(r => {
    const isHeld = (r.status || '').includes('لا') || (r.status || '').includes('معاه');
    const badgeClass = isHeld ? 'amber' : 'green';

    return `
    <tr>
      <td>#${r.id ?? ''}</td>
      <td>${r.date || ''}</td>
      <td style="font-weight:800;">${r.partner || ''}</td>
      <td class="amount-display">${fmtMoney(r.amount)}</td>
      <td>${r.reason || '—'}</td>
      <td><span class="badge-pill ${badgeClass}">${r.status || ''}</span></td>
      <td>${r.notes || '—'}</td>
      <td>
        <div class="action-row">
          <button class="btn btn-outline btn-sm" onclick="openEdit('custody', ${r._row})">تعديل</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('custody', ${r._row})">حذف</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  mobileList.innerHTML = rows.map(r => {
    const isHeld = (r.status || '').includes('لا') || (r.status || '').includes('معاه');
    const badgeClass = isHeld ? 'amber' : 'green';

    return `
    <div class="mobile-data-card">
      <div class="mobile-card-row">
        <span class="mobile-card-title">${r.partner || 'شريك'}</span>
        <span class="amount-display">${fmtMoney(r.amount)}</span>
      </div>
      <div class="mobile-card-row mobile-card-meta">
        <span>📅 ${r.date || ''}</span>
        <span class="badge-pill ${badgeClass}">${r.status || ''}</span>
      </div>
      ${r.reason ? `<div class="mobile-card-meta">📌 ${r.reason}</div>` : ''}
      <div class="mobile-card-actions">
        <button class="btn btn-outline btn-sm" onclick="openEdit('custody', ${r._row})">تعديل</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('custody', ${r._row})">حذف</button>
      </div>
    </div>`;
  }).join('');
}

// Search Filter Handler
function filterTable(type) {
  if (type === 'contributions') {
    FILTER_STATE.contributions.query = document.getElementById('searchContributions').value;
    renderContributions();
  } else if (type === 'expenses') {
    FILTER_STATE.expenses.query = document.getElementById('searchExpenses').value;
    renderExpenses();
  } else if (type === 'custody') {
    FILTER_STATE.custody.query = document.getElementById('searchCustody').value;
    renderCustody();
  }
}

// ---------- Smart Form Definitions & Modal Logic ----------
const FORM_DEFS = {
  contributions: {
    title: 'مساهمة جديدة',
    badge: 'مساهمة',
    fields: [
      { key: 'date', label: 'تاريخ المساهمة', type: 'date', required: true, default: formatDateISO() },
      { key: 'partner', label: 'اسم الشريك', type: 'select', options: () => (STATE.lists && STATE.lists.partners) || [], required: true },
      { key: 'amount', label: 'المبلغ المدفوع (جنيه)', type: 'number', required: true, presets: [500, 1000, 5000, 10000] },
      { key: 'method', label: 'طريقة الدفع', type: 'select', options: () => (STATE.lists && STATE.lists.paymentMethods) || ['كاش', 'تحويل بانكي', 'إنستا باي'], required: true },
      { key: 'notes', label: 'ملاحظات إضافية', type: 'text' }
    ]
  },
  expenses: {
    title: 'تسجيل مصروف جديد',
    badge: 'مصروف',
    fields: [
      { key: 'date', label: 'تاريخ الصرف', type: 'date', required: true, default: formatDateISO() },
      { key: 'item', label: 'البند / بيان المصروف', type: 'text', required: true, itemPresets: ['تجهيزات وديكور', 'إيجار الكافيه', 'مستلزمات وبضاعة', 'رواتب وعمالة', 'صيانة ومعدات', 'مرافق وفواتير'] },
      { key: 'amount', label: 'المبلغ المصروف (جنيه)', type: 'number', required: true, presets: [100, 250, 500, 1000, 2500] },
      { key: 'paidFrom', label: 'مصدر الفلوس (اتصرف منين؟)', type: 'select', options: () => (STATE.lists && STATE.lists.expensePaidFrom) || ['الخزنة / الصندوق'], required: true },
      { key: 'notes', label: 'ملاحظات إضافية', type: 'text' }
    ]
  },
  custody: {
    title: 'تسليم عهدة جديدة',
    badge: 'عهدة',
    fields: [
      { key: 'date', label: 'تاريخ الاستلام', type: 'date', required: true, default: formatDateISO() },
      { key: 'partner', label: 'الشريك المستلم للعهدة', type: 'select', options: () => (STATE.lists && STATE.lists.partners) || [], required: true },
      { key: 'amount', label: 'مبلغ العهدة (جنيه)', type: 'number', required: true, presets: [500, 1000, 2000, 5000] },
      { key: 'reason', label: 'سبب وجود الفلوس معاه / الغرض', type: 'text' },
      { key: 'status', label: 'موقف العهدة الحالي', type: 'select', options: () => (STATE.lists && STATE.lists.custodyStatus) || ['لا - لسه معاه', 'نعم - اتصرفت/اتوردت'], required: true },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ]
  }
};

const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');
const modalBadge = document.getElementById('modalBadge');

let currentSheet = null;
let currentRow = null;

function openAdd(sheetKey) {
  currentSheet = sheetKey;
  currentRow = null;
  const def = FORM_DEFS[sheetKey];
  modalTitle.textContent = def.title;
  modalBadge.textContent = 'إضافة';
  buildForm(def, {});
  modalOverlay.classList.remove('hidden');
}

function openEdit(sheetKey, row) {
  currentSheet = sheetKey;
  currentRow = row;
  const def = FORM_DEFS[sheetKey];
  const record = (STATE[sheetKey] || []).find(r => r._row === row);
  modalTitle.textContent = 'تعديل ' + def.badge;
  modalBadge.textContent = 'تعديل';
  buildForm(def, record || {});
  modalOverlay.classList.remove('hidden');
}

function buildForm(def, values) {
  modalBody.innerHTML = def.fields.map(f => {
    const val = values[f.key] ?? f.default ?? '';

    let presetsHtml = '';
    if (f.presets) {
      presetsHtml = `<div class="preset-chips-group">
        ${f.presets.map(p => `<button type="button" class="preset-chip" onclick="setPresetValue('field_${f.key}', ${p})">+${p} ج</button>`).join('')}
      </div>`;
    } else if (f.itemPresets) {
      presetsHtml = `<div class="preset-chips-group">
        ${f.itemPresets.map(p => `<button type="button" class="preset-chip" onclick="setPresetText('field_${f.key}', '${p}')">${p}</button>`).join('')}
      </div>`;
    } else if (f.type === 'date') {
      presetsHtml = `<div class="preset-chips-group">
        <button type="button" class="preset-chip" onclick="setPresetDate('field_${f.key}', 0)">اليوم</button>
        <button type="button" class="preset-chip" onclick="setPresetDate('field_${f.key}', -1)">أمس</button>
      </div>`;
    }

    if (f.type === 'select') {
      const opts = f.options().map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('');
      return `
        <div class="form-group">
          <label>${f.label}${f.required ? ' *' : ''}</label>
          <select id="field_${f.key}" class="form-select">
            <option value="">-- اختر --</option>
            ${opts}
          </select>
        </div>`;
    }

    return `
      <div class="form-group">
        <label>${f.label}${f.required ? ' *' : ''}</label>
        <input id="field_${f.key}" class="form-input" type="${f.type}" value="${val}" />
        ${presetsHtml}
      </div>`;
  }).join('');
}

function setPresetValue(id, val) {
  const el = document.getElementById(id);
  if (el) {
    const current = Number(el.value) || 0;
    el.value = current + val;
  }
}

function setPresetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.value = text;
}

function setPresetDate(id, offsetDays) {
  const el = document.getElementById(id);
  if (el) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    el.value = formatDateISO(d);
  }
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  currentSheet = null;
  currentRow = null;
}

document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// Save Action
document.getElementById('modalSaveBtn')?.addEventListener('click', async () => {
  const def = FORM_DEFS[currentSheet];
  const data = {};

  for (const f of def.fields) {
    const el = document.getElementById('field_' + f.key);
    const val = el.value.trim();

    if (f.required && !val) {
      showToast('يرجى ملء حقل: ' + f.label, 'error');
      el.focus();
      return;
    }
    data[f.key] = f.type === 'number' ? Number(val) : val;
  }

  const btn = document.getElementById('modalSaveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>جاري الحفظ...</span>';

  try {
    const payload = {
      action: currentRow ? 'update' : 'add',
      sheet: currentSheet,
      data: data
    };
    if (currentRow) payload.row = currentRow;

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const out = await res.json();
    if (!out.success) throw new Error(out.error || 'فشل الحفظ');

    showToast('تم الحفظ بنجاح 🚀', 'success');
    closeModal();
    await loadData(true);
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>حفظ البيانات</span>';
  }
});

// Delete Action
async function deleteRow(sheetKey, row) {
  if (!confirm('هل أنت تأكد من رغبتك في حذف هذا السجل؟')) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', sheet: sheetKey, row: row })
    });
    const out = await res.json();
    if (!out.success) throw new Error(out.error || 'فشل الحذف');

    showToast('تم الحذف بنجاح', 'success');
    await loadData(true);
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء الحذف', 'error');
  }
}

// Initial Boot
loadData(false);
startPolling();
