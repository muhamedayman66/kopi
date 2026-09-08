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

// ---------- Tab Switchers ----------
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

// Dynamic Accounting & Partner Share Recalculation
function calculatePartnersSummary() {
  const contribs = STATE.contributions || [];
  const exps = STATE.expenses || [];

  // Extract unique list of partners from lists or contributions
  let partnerNames = (STATE.lists && STATE.lists.partners) || [];
  contribs.forEach(c => {
    if (c.partner && !partnerNames.includes(c.partner)) partnerNames.push(c.partner);
  });

  // Calculate total paid by each partner
  const partnerPaidMap = {};
  partnerNames.forEach(name => partnerPaidMap[name] = 0);

  contribs.forEach(c => {
    if (c.partner && c.amount) {
      partnerPaidMap[c.partner] = (partnerPaidMap[c.partner] || 0) + Number(c.amount);
    }
  });

  // Filter out partners with 0 paid if they have no entries and not in list
  const activePartners = Object.keys(partnerPaidMap);
  
  // Total paid by ALL partners
  const sumPartnersPaid = activePartners.reduce((acc, name) => acc + partnerPaidMap[name], 0);

  // Total Expenses
  const totalExpenses = exps.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Total Contributions Overall
  const totalContribs = contribs.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  // Calculate individual partner share % dynamically based on paid amount
  const partnersSummary = activePartners.map(name => {
    const paid = partnerPaidMap[name] || 0;

    // Share Percentage:
    // If sum of partners paid > 0, share % = paid / sumPartnersPaid
    // Else equal share = 1 / activePartners.length
    let sharePct = 0;
    if (sumPartnersPaid > 0) {
      sharePct = paid / sumPartnersPaid;
    } else if (activePartners.length > 0) {
      sharePct = 1 / activePartners.length;
    }

    const shareOfExp = totalExpenses * sharePct;
    const balance = paid - shareOfExp;

    return {
      name,
      totalPaid: paid,
      sharePercent: sharePct,
      shareOfExpenses: shareOfExp,
      balance
    };
  });

  return {
    partnersSummary,
    totals: {
      totalContributions: totalContribs,
      totalExpenses,
      sumPartnersPaid,
      availableBalance: totalContribs - totalExpenses
    }
  };
}

// 1. Dashboard Render
function renderDashboard() {
  const computed = calculatePartnersSummary();
  const s = STATE.summary || {};
  const t = computed.totals;
  const custodyList = STATE.custody || [];

  const custodyHeld = custodyList.reduce((acc, item) => {
    const st = (item.status || '').toLowerCase();
    const isHeld = st.includes('لا') || st.includes('معاه');
    return isHeld ? acc + Number(item.amount || 0) : acc;
  }, 0);

  const cardsEl = document.getElementById('statCards');
  if (cardsEl) {
    cardsEl.innerHTML = `
      <div class="metric-card emerald">
        <div class="metric-header">
          <span class="metric-title">إجمالي المساهمات المدفوعة</span>
          <span class="metric-icon">💰</span>
        </div>
        <div class="metric-value">${fmtMoney(t.totalContributions)}</div>
        <div class="metric-subtitle">رأس المال المجمع من الشركاء</div>
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
          <span class="metric-title">عهد وخزنة المشروع مع الشركاء</span>
          <span class="metric-icon">🤝</span>
        </div>
        <div class="metric-value">${fmtMoney(custodyHeld)}</div>
        <div class="metric-subtitle">خزنة وسيولة متوفرة مع الشركاء</div>
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
  }

  // Partners Summary Table
  const body = document.getElementById('partnersTableBody');
  const mobileList = document.getElementById('partnersCardsMobile');
  const partners = computed.partnersSummary;

  let rowsHtml = partners.map(p => {
    const pctVal = (p.sharePercent || 0) * 100;
    const pctFormatted = Number.isInteger(pctVal) ? pctVal + '%' : pctVal.toFixed(1) + '%';

    return `
      <tr>
        <td style="font-weight:800;">${p.name}</td>
        <td class="amount-display">${fmtMoney(p.totalPaid)}</td>
        <td><span class="badge-pill blue">${pctFormatted}</span></td>
        <td>${fmtMoney(p.shareOfExpenses)}</td>
      </tr>
    `;
  }).join('');

  // Total Summary Row
  const totalPaidSum = t.sumPartnersPaid;
  const totalExpSum = t.totalExpenses;

  rowsHtml += `
    <tr style="font-weight:900; background:#f1f5f9;">
      <td>الإجمالي</td>
      <td class="amount-display">${fmtMoney(totalPaidSum)}</td>
      <td><span class="badge-pill blue">100%</span></td>
      <td>${fmtMoney(totalExpSum)}</td>
    </tr>`;

  if (body) body.innerHTML = rowsHtml;

  // Mobile Cards List for Partners Summary
  if (mobileList) {
    mobileList.innerHTML = partners.map(p => {
      const pctVal = (p.sharePercent || 0) * 100;
      const pctFormatted = Number.isInteger(pctVal) ? pctVal + '%' : pctVal.toFixed(1) + '%';

      return `
        <div class="mobile-data-card">
          <div class="mobile-card-row">
            <span class="mobile-card-title">${p.name}</span>
            <span class="badge-pill blue">نسبة الشراكة: ${pctFormatted}</span>
          </div>
          <div class="mobile-card-row mobile-card-meta">
            <span>ما تم دفعه: <b>${fmtMoney(p.totalPaid)}</b></span>
            <span>الحصة من المصروفات: <b>${fmtMoney(p.shareOfExpenses)}</b></span>
          </div>
        </div>
      `;
    }).join('');
  }
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

  if (empty) empty.classList.toggle('hidden', rows.length > 0);

  // Desktop Table
  if (body) {
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
  }

  // Mobile Cards List
  if (mobileList) {
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
  }

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

  const q = FILTER_STATE.expenses.query.toLowerCase();
  rows = rows.filter(r => {
    return !q || (r.item && r.item.toLowerCase().includes(q)) || (r.notes && r.notes.toLowerCase().includes(q)) || (r.paidFrom && r.paidFrom.toLowerCase().includes(q));
  });

  if (empty) empty.classList.toggle('hidden', rows.length > 0);

  if (body) {
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
  }

  if (mobileList) {
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
}

// 4. Custody Render (Table + Mobile Cards)
function renderCustody() {
  const body = document.getElementById('custodyTableBody');
  const mobileList = document.getElementById('custodyCardsMobile');
  const empty = document.getElementById('custodyEmpty');

  let rows = STATE.custody || [];

  const q = FILTER_STATE.custody.query.toLowerCase();
  rows = rows.filter(r => {
    return !q || (r.partner && r.partner.toLowerCase().includes(q)) || (r.reason && r.reason.toLowerCase().includes(q));
  });

  if (empty) empty.classList.toggle('hidden', rows.length > 0);

  if (body) {
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
  }

  if (mobileList) {
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
