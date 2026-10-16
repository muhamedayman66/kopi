// ==========================================================
// KOPI MONEY - Smart Financial Management App Logic
// Full Automation & Interconnected Accounting System
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

// ---------- Modern SVG Icons Dictionary ----------
const ICONS = {
  capital: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
  expense: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M10 16h-2"/></svg>`,
  vault: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
  custody: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  note: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  pin: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  cross: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  zap: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

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
  if (!dot || !t) return;
  dot.className = 'status-dot ' + (state === 'ok' ? 'ok' : state === 'err' ? 'err' : '');
  t.textContent = text;
}

function showToast(msg, type) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'toast-msg ' + (type || '');
  el.innerHTML = `<span>${type === 'error' ? ICONS.cross : ICONS.check}</span> <span>${msg}</span>`;
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
    document.getElementById('setupBanner')?.classList.remove('hidden');
    document.getElementById('loadingState')?.classList.add('hidden');
    setStatus('err', 'غير متصل بالشيت');
    return;
  }

  if (!silent) document.getElementById('loadingState')?.classList.remove('hidden');

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    STATE = data;

    if (!STATE.lists) {
      STATE.lists = {
        partners: ["محمد ايمن", "جمال محمد", "محمد زكريا", "محمد خالد"],
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
    document.getElementById('loadingState')?.classList.add('hidden');
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => loadData(true), AUTO_REFRESH_MS || 20000);
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
  const custodyList = STATE.custody || [];

  // Extract unique list of partners from lists or contributions
  let partnerNames = [...((STATE.lists && STATE.lists.partners) || [])];
  contribs.forEach(c => {
    if (c.partner && !partnerNames.includes(c.partner)) partnerNames.push(c.partner);
  });
  custodyList.forEach(c => {
    if (c.partner && !partnerNames.includes(c.partner)) partnerNames.push(c.partner);
  });

  // Calculate total paid by each partner in contributions
  const partnerPaidMap = {};
  partnerNames.forEach(name => partnerPaidMap[name] = 0);

  contribs.forEach(c => {
    if (c.partner && c.amount) {
      partnerPaidMap[c.partner] = (partnerPaidMap[c.partner] || 0) + Number(c.amount);
    }
  });

  const activePartners = partnerNames;
  
  // Total paid by ALL partners (رأس المال المدفوع)
  const sumPartnersPaid = activePartners.reduce((acc, name) => acc + (partnerPaidMap[name] || 0), 0);

  // Total Expenses (إجمالي المصروفات)
  const totalExpenses = exps.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Active Custody held with partners (العهد المعلقة)
  const custodyHeld = custodyList.reduce((acc, item) => {
    const st = (item.status || '').toLowerCase();
    const isHeld = st.includes('لا') || st.includes('معاه');
    return isHeld ? acc + Number(item.amount || 0) : acc;
  }, 0);

  // Total Custody Given (إجمالي كل العهد المسلمة)
  const totalCustodyGiven = custodyList.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  // Real Available Net Liquidity = Total Contributed Capital - Total Expenses
  // هذا هو الرصيد المتاح الحقيقي للمشروع ويخصم منه تلقائياً أي مصروف
  const availableBalance = sumPartnersPaid - totalExpenses;

  // Safe / Vault Net Cash = Available Balance - Custody currently in partners' hands
  const vaultCash = Math.max(0, availableBalance - custodyHeld);

  // Calculate individual partner share % dynamically based on paid amount
  const partnersSummary = activePartners.map(name => {
    const paid = partnerPaidMap[name] || 0;
    const sharePct = sumPartnersPaid > 0 ? (paid / sumPartnersPaid) : (1 / (activePartners.length || 1));
    const shareOfExp = totalExpenses * sharePct;
    const balance = paid - shareOfExp; // > 0 means partner paid more than fair share (له), < 0 means partner owes (عليه)

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
      totalContributions: sumPartnersPaid,
      totalExpenses,
      custodyHeld,
      totalCustodyGiven,
      availableBalance,
      vaultCash,
      sumPartnersPaid
    }
  };
}

// 1. Dashboard Render
function renderDashboard() {
  const computed = calculatePartnersSummary();
  const t = computed.totals;
  const partners = computed.partnersSummary;

  // Render the 4 Top KPI Cards
  const cardsEl = document.getElementById('statCards');
  if (cardsEl) {
    const isBalancePositive = t.availableBalance >= 0;
    cardsEl.innerHTML = `
      <div class="metric-card emerald">
        <div class="metric-header">
          <span class="metric-title">إجمالي رأس المال المدفوع</span>
          <span class="metric-icon">${ICONS.capital}</span>
        </div>
        <div class="metric-value">${fmtMoney(t.sumPartnersPaid)}</div>
        <div class="metric-subtitle">مجموع ما ضخه الشركاء (${partners.length} شركاء)</div>
      </div>

      <div class="metric-card rose">
        <div class="metric-header">
          <span class="metric-title">إجمالي المصروفات</span>
          <span class="metric-icon">${ICONS.expense}</span>
        </div>
        <div class="metric-value">${fmtMoney(t.totalExpenses)}</div>
        <div class="metric-subtitle">المصروفات والتجهيزات الكلية (${(STATE.expenses || []).length} بند)</div>
      </div>

      <div class="metric-card ${isBalancePositive ? '' : 'rose'}">
        <div class="metric-header">
          <span class="metric-title">الرصيد المتاح بالخزنة</span>
          <span class="metric-icon">${ICONS.vault}</span>
        </div>
        <div class="metric-value" style="color: ${isBalancePositive ? 'var(--brand-blue)' : 'var(--brand-rose)'}">
          ${fmtMoney(t.availableBalance)}
        </div>
        <div class="metric-subtitle" style="display:flex; align-items:center; gap:5px;">${ICONS.zap} يُخصم تلقائياً مع تسجيل أي مصروف</div>
      </div>

      <div class="metric-card amber">
        <div class="metric-header">
          <span class="metric-title">العهد النقدية مع الشركاء</span>
          <span class="metric-icon">${ICONS.custody}</span>
        </div>
        <div class="metric-value" style="color: var(--brand-amber)">
          ${fmtMoney(t.custodyHeld)}
        </div>
        <div class="metric-subtitle">مبالغ تحت الشراء والتسوية طرف الشركاء</div>
      </div>
    `;
  }

  // Partners Summary Table with 3 Columns:
  // اسم الشريك | ما تم دفعه | نسبة الشراكة
  const body = document.getElementById('partnersTableBody');
  const mobileList = document.getElementById('partnersCardsMobile');

  let rowsHtml = partners.map(p => {
    const pctVal = (p.sharePercent || 0) * 100;
    const pctFormatted = Number.isInteger(pctVal) ? pctVal + '%' : pctVal.toFixed(1) + '%';

    return `
      <tr>
        <td style="font-weight:800;">${p.name}</td>
        <td class="amount-display">${fmtMoney(p.totalPaid)}</td>
        <td><span class="badge-pill blue">${pctFormatted}</span></td>
      </tr>
    `;
  }).join('');

  // Total Summary Row
  rowsHtml += `
    <tr style="font-weight:900; background:#f1f5f9;">
      <td>الإجمالي</td>
      <td class="amount-display">${fmtMoney(t.sumPartnersPaid)}</td>
      <td><span class="badge-pill blue">100%</span></td>
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
            <span class="badge-pill blue">${pctFormatted}</span>
          </div>
          <div class="mobile-card-row mobile-card-meta">
            <span>إجمالي ما دفعه: <b style="color:var(--brand-emerald);">${fmtMoney(p.totalPaid)}</b></span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Recent Activity Feed
  renderRecentActivity();
}

// Render Recent Activity Feed on Dashboard
function renderRecentActivity() {
  const container = document.getElementById('recentActivityList');
  if (!container) return;

  const contribs = (STATE.contributions || []).map(c => ({
    type: 'contrib',
    title: `مساهمة رأس مال: ${c.partner}`,
    subtitle: c.notes ? `${c.notes} • ${c.method || 'كاش'}` : (c.method || 'كاش'),
    date: c.date || '',
    amount: c.amount,
    isPos: true,
    _row: c._row || 0
  }));

  const exps = (STATE.expenses || []).map(e => ({
    type: 'expense',
    title: `مصروف: ${e.item || 'بند غير محدد'}`,
    subtitle: `مصدر الصرف: ${e.paidFrom || 'الخزنة'} ${e.notes ? '• ' + e.notes : ''}`,
    date: e.date || '',
    amount: e.amount,
    isPos: false,
    _row: e._row || 0
  }));

  // Combine and sort by date or row descending
  const combined = [...contribs, ...exps].sort((a, b) => {
    if (b.date && a.date && b.date !== a.date) return b.date.localeCompare(a.date);
    return (b._row || 0) - (a._row || 0);
  }).slice(0, 7);

  if (combined.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 24px;">لا توجد حركات مسجلة حتى الآن</div>';
    return;
  }

  container.innerHTML = combined.map(item => `
    <div class="activity-item">
      <div class="activity-right">
        <div class="activity-icon-badge ${item.isPos ? 'green' : 'red'}">
          ${item.isPos ? ICONS.capital : ICONS.expense}
        </div>
        <div>
          <div class="activity-title">${item.title}</div>
          <div class="activity-meta">
            <span style="display:inline-flex; align-items:center; gap:3px;">${ICONS.calendar} ${item.date || 'اليوم'}</span>
            <span>${item.subtitle}</span>
          </div>
        </div>
      </div>
      <div class="activity-amount amount-display ${item.isPos ? 'pos' : 'neg'}">
        ${item.isPos ? '+' : '-'}${fmtMoney(item.amount)}
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
          <span style="display:inline-flex; align-items:center; gap:4px;">${ICONS.calendar} ${r.date || ''}</span>
          <span class="badge-pill blue">${r.method || 'كاش'}</span>
        </div>
        ${r.notes ? `<div class="mobile-card-meta" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.note} ${r.notes}</div>` : ''}
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
    body.innerHTML = rows.map(r => {
      // Determine badge style for paidFrom
      const pf = r.paidFrom || 'الخزنة / الصندوق';
      let badgeStyle = 'blue';
      if (pf.includes('عهدة')) badgeStyle = 'amber';
      else if (STATE.lists && STATE.lists.partners && STATE.lists.partners.includes(pf)) badgeStyle = 'green';

      return `
        <tr>
          <td>#${r.id ?? ''}</td>
          <td>${r.date || ''}</td>
          <td style="font-weight:800;">${r.item || ''}</td>
          <td class="amount-display neg">${fmtMoney(r.amount)}</td>
          <td><span class="badge-pill ${badgeStyle}">${pf}</span></td>
          <td>${r.notes || '—'}</td>
          <td>
            <div class="action-row">
              <button class="btn btn-outline btn-sm" onclick="openEdit('expenses', ${r._row})">تعديل</button>
              <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('expenses', ${r._row})">حذف</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (mobileList) {
    mobileList.innerHTML = rows.map(r => {
      const pf = r.paidFrom || 'الخزنة / الصندوق';
      let badgeStyle = 'blue';
      if (pf.includes('عهدة')) badgeStyle = 'amber';
      else if (STATE.lists && STATE.lists.partners && STATE.lists.partners.includes(pf)) badgeStyle = 'green';

      return `
        <div class="mobile-data-card">
          <div class="mobile-card-row">
            <span class="mobile-card-title">${r.item || 'مصروف'}</span>
            <span class="amount-display neg">${fmtMoney(r.amount)}</span>
          </div>
          <div class="mobile-card-row mobile-card-meta">
            <span style="display:inline-flex; align-items:center; gap:4px;">${ICONS.calendar} ${r.date || ''}</span>
            <span class="badge-pill ${badgeStyle}">${pf}</span>
          </div>
          ${r.notes ? `<div class="mobile-card-meta" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.note} ${r.notes}</div>` : ''}
          <div class="mobile-card-actions">
            <button class="btn btn-outline btn-sm" onclick="openEdit('expenses', ${r._row})">تعديل</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('expenses', ${r._row})">حذف</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 4. Custody Render (Table + Mobile Cards + Custody Stats)
function renderCustody() {
  const body = document.getElementById('custodyTableBody');
  const mobileList = document.getElementById('custodyCardsMobile');
  const empty = document.getElementById('custodyEmpty');
  const statsEl = document.getElementById('custodyStatsGrid');

  let rows = STATE.custody || [];

  // Compute custody statistics
  const totalGiven = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const stillHeld = rows.reduce((acc, r) => {
    const isHeld = (r.status || '').includes('لا') || (r.status || '').includes('معاه');
    return isHeld ? acc + (Number(r.amount) || 0) : acc;
  }, 0);
  const settled = Math.max(0, totalGiven - stillHeld);

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="custody-stat-box">
        <span class="stat-lbl">إجمالي مبالغ العهد المسلمة</span>
        <span class="stat-num">${fmtMoney(totalGiven)}</span>
      </div>
      <div class="custody-stat-box">
        <span class="stat-lbl">العهد المعلقة طرف الشركاء (جاري الصرف)</span>
        <span class="stat-num" style="color: var(--brand-amber);">${fmtMoney(stillHeld)}</span>
      </div>
      <div class="custody-stat-box">
        <span class="stat-lbl">العهد التي تمت تسويتها بالكامل</span>
        <span class="stat-num" style="color: var(--brand-emerald);">${fmtMoney(settled)}</span>
      </div>
    `;
  }

  const q = FILTER_STATE.custody.query.toLowerCase();
  rows = rows.filter(r => {
    return !q || (r.partner && r.partner.toLowerCase().includes(q)) || (r.reason && r.reason.toLowerCase().includes(q));
  });

  if (empty) empty.classList.toggle('hidden', rows.length > 0);

  if (body) {
    body.innerHTML = rows.map(r => {
      const isHeld = (r.status || '').includes('لا') || (r.status || '').includes('معاه');
      const badgeClass = isHeld ? 'amber' : 'green';

      const quickExpenseBtn = isHeld ? `
        <button class="btn btn-outline btn-sm" onclick="openExpenseFromCustody('${r.partner}')" title="تسجيل مصروف يخصم من عهدة ${r.partner} تلقائياً">
          + صرف من العهدة
        </button>
      ` : '';

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
            ${quickExpenseBtn}
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

      const quickExpenseBtn = isHeld ? `
        <button class="btn btn-outline btn-sm" onclick="openExpenseFromCustody('${r.partner}')">
          + صرف من العهدة
        </button>
      ` : '';

      return `
      <div class="mobile-data-card">
        <div class="mobile-card-row">
          <span class="mobile-card-title">${r.partner || 'شريك'}</span>
          <span class="amount-display">${fmtMoney(r.amount)}</span>
        </div>
        <div class="mobile-card-row mobile-card-meta">
          <span style="display:inline-flex; align-items:center; gap:4px;">${ICONS.calendar} ${r.date || ''}</span>
          <span class="badge-pill ${badgeClass}">${r.status || ''}</span>
        </div>
        ${r.reason ? `<div class="mobile-card-meta" style="display:inline-flex; align-items:center; gap:4px;">${ICONS.pin} ${r.reason}</div>` : ''}
        <div class="mobile-card-actions">
          ${quickExpenseBtn}
          <button class="btn btn-outline btn-sm" onclick="openEdit('custody', ${r._row})">تعديل</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteRow('custody', ${r._row})">حذف</button>
        </div>
      </div>`;
    }).join('');
  }
}

// Quick action: Open expense modal pre-filled with partner custody
function openExpenseFromCustody(partnerName) {
  openAdd('expenses', { preferredSource: 'custody', custodyPartner: partnerName });
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
    title: 'إضافة مساهمة رأس مال جديدة',
    badge: 'مساهمة',
    fields: [
      { key: 'date', label: 'تاريخ المساهمة', type: 'date', required: true, default: formatDateISO() },
      { key: 'partner', label: 'اسم الشريك', type: 'select', options: () => (STATE.lists && STATE.lists.partners) || [], required: true },
      { key: 'amount', label: 'المبلغ المدفوع (جنيه)', type: 'number', required: true, presets: [10000, 30000, 50000, 100000] },
      { key: 'method', label: 'طريقة الدفع', type: 'select', options: () => (STATE.lists && STATE.lists.paymentMethods) || ['كاش', 'تحويل بانكي', 'إنستا باي'], required: true },
      { key: 'notes', label: 'ملاحظات إضافية', type: 'text' }
    ]
  },
  custody: {
    title: 'تسليم عهدة نقدية لشريك',
    badge: 'عهدة',
    fields: [
      { key: 'date', label: 'تاريخ تسليم العهدة', type: 'date', required: true, default: formatDateISO() },
      { key: 'partner', label: 'الشريك المستلم للعهدة', type: 'select', options: () => (STATE.lists && STATE.lists.partners) || [], required: true },
      { key: 'amount', label: 'مبلغ العهدة (جنيه)', type: 'number', required: true, presets: [5000, 10000, 20000, 50000] },
      { key: 'reason', label: 'سبب وجود الفلوس معه / الغرض', type: 'text' },
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

function openAdd(sheetKey, prefilled = {}) {
  currentSheet = sheetKey;
  currentRow = null;

  if (sheetKey === 'expenses') {
    modalTitle.textContent = 'تسجيل مصروف جديد';
    modalBadge.textContent = 'مصروف ذكي';
    buildSmartExpenseForm(prefilled);
  } else {
    const def = FORM_DEFS[sheetKey];
    modalTitle.textContent = def.title;
    modalBadge.textContent = 'إضافة';
    buildForm(def, prefilled);
  }

  modalOverlay?.classList.remove('hidden');
}

function openEdit(sheetKey, row) {
  currentSheet = sheetKey;
  currentRow = row;
  const record = (STATE[sheetKey] || []).find(r => r._row === row) || {};

  if (sheetKey === 'expenses') {
    modalTitle.textContent = 'تعديل المصروف';
    modalBadge.textContent = 'تعديل';
    buildSmartExpenseForm(record);
  } else {
    const def = FORM_DEFS[sheetKey];
    modalTitle.textContent = 'تعديل ' + def.badge;
    modalBadge.textContent = 'تعديل';
    buildForm(def, record);
  }

  modalOverlay?.classList.remove('hidden');
}

// Build Standard Forms for Contributions and Custody
function buildForm(def, values) {
  modalBody.innerHTML = def.fields.map(f => {
    const val = values[f.key] ?? f.default ?? '';

    let presetsHtml = '';
    if (f.presets) {
      presetsHtml = `<div class="preset-chips-group">
        ${f.presets.map(p => `<button type="button" class="preset-chip" onclick="setPresetValue('field_${f.key}', ${p})">+${p.toLocaleString('ar-EG')} ج</button>`).join('')}
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

// Build Smart Expense Form with Interactive Payment Source Cards
function buildSmartExpenseForm(record = {}) {
  const partners = (STATE.lists && STATE.lists.partners) || [];
  const custodies = (STATE.custody || []).filter(c => {
    const isHeld = (c.status || '').includes('لا') || (c.status || '').includes('معاه');
    return isHeld && Number(c.amount) > 0;
  });

  const dateVal = record.date || formatDateISO();
  const itemVal = record.item || '';
  const amountVal = record.amount || '';
  const notesVal = record.notes || '';
  const paidFromVal = record.paidFrom || '';

  // Determine initial payment source selection
  let selectedSource = 'vault';
  let selectedPartner = partners[0] || '';
  let selectedCustodyPartner = custodies.length > 0 ? custodies[0].partner : (partners[0] || '');

  if (record.preferredSource) {
    selectedSource = record.preferredSource;
    if (record.custodyPartner) selectedCustodyPartner = record.custodyPartner;
  } else if (paidFromVal) {
    if (paidFromVal.includes('عهدة')) {
      selectedSource = 'custody';
      const matched = partners.find(p => paidFromVal.includes(p));
      if (matched) selectedCustodyPartner = matched;
    } else if (partners.includes(paidFromVal)) {
      selectedSource = 'partner';
      selectedPartner = paidFromVal;
    } else {
      selectedSource = 'vault';
    }
  }

  const itemPresets = [
    'تجهيزات وديكور',
    'إيجار الكافيه',
    'مستلزمات وبضاعة',
    'رواتب وعمالة',
    'صيانة ومعدات',
    'مرافق وفواتير كهرباء',
    'كراسي وطاولات',
    'تكييفات'
  ];

  modalBody.innerHTML = `
    <!-- Date Field -->
    <div class="form-group">
      <label>تاريخ الصرف *</label>
      <input id="exp_date" class="form-input" type="date" value="${dateVal}" />
      <div class="preset-chips-group">
        <button type="button" class="preset-chip" onclick="setPresetDate('exp_date', 0)">اليوم</button>
        <button type="button" class="preset-chip" onclick="setPresetDate('exp_date', -1)">أمس</button>
      </div>
    </div>

    <!-- Expense Item / Description -->
    <div class="form-group">
      <label>البند / بيان المصروف *</label>
      <input id="exp_item" class="form-input" type="text" placeholder="مثال: دفعة تحت الحساب للحداد" value="${itemVal}" />
      <div class="preset-chips-group">
        ${itemPresets.map(it => `<button type="button" class="preset-chip" onclick="setPresetText('exp_item', '${it}')">${it}</button>`).join('')}
      </div>
    </div>

    <!-- Amount Field -->
    <div class="form-group">
      <label>المبلغ المصروف (جنيه) *</label>
      <input id="exp_amount" class="form-input" type="number" placeholder="أدخل المبلغ..." value="${amountVal}" />
      <div class="preset-chips-group">
        <button type="button" class="preset-chip" onclick="setPresetValue('exp_amount', 500)">+500 ج</button>
        <button type="button" class="preset-chip" onclick="setPresetValue('exp_amount', 1000)">+1,000 ج</button>
        <button type="button" class="preset-chip" onclick="setPresetValue('exp_amount', 5000)">+5,000 ج</button>
        <button type="button" class="preset-chip" onclick="setPresetValue('exp_amount', 10000)">+10,000 ج</button>
        <button type="button" class="preset-chip" onclick="setPresetValue('exp_amount', 50000)">+50,000 ج</button>
      </div>
    </div>

    <!-- Payment Source Selection (The Core Solution) -->
    <div class="form-group">
      <label>مصدر تمويل المصروف (اتصرف منين؟) *</label>
      <div class="payment-source-grid">
        
        <!-- Option 1: From Vault -->
        <label class="payment-source-card ${selectedSource === 'vault' ? 'selected' : ''}" id="sourceCard_vault">
          <input type="radio" name="expenseSource" value="vault" ${selectedSource === 'vault' ? 'checked' : ''} onchange="onSourceChange('vault')" />
          <div class="source-content">
            <div class="source-header">
              <span class="source-title" style="display:inline-flex; align-items:center; gap:6px;">${ICONS.vault} من الخزنة / الصندوق (صندوق المشروع)</span>
              <span class="source-badge vault">خصم تلقائي</span>
            </div>
            <div class="source-desc">يُخصم المبلغ تلقائياً من الرصيد المتاح بالخزنة فور الحفظ.</div>
          </div>
        </label>

        <!-- Option 2: Paid by Partner out of pocket -->
        <label class="payment-source-card ${selectedSource === 'partner' ? 'selected' : ''}" id="sourceCard_partner">
          <input type="radio" name="expenseSource" value="partner" ${selectedSource === 'partner' ? 'checked' : ''} onchange="onSourceChange('partner')" />
          <div class="source-content">
            <div class="source-header">
              <span class="source-title" style="display:inline-flex; align-items:center; gap:6px;">${ICONS.user} دفع مباشر من جيب شريك (زيادة رأس مال)</span>
              <span class="source-badge capital">زيادة رأس مال</span>
            </div>
            <div class="source-desc">يزيد رأس المال المدفوع للشريك تلقائياً وتُعاد نسبة الشراكة دون المساس برصيد الخزنة.</div>
            
            <div class="source-subfield ${selectedSource === 'partner' ? '' : 'hidden'}" id="subfield_partner">
              <label style="font-size:12px; font-weight:800; color:var(--brand-emerald); margin-bottom:4px; display:block;">اختر الشريك الذي دفع من حسابه الشخصي:</label>
              <select id="exp_partner_select" class="form-select">
                ${partners.map(p => `<option value="${p}" ${p === selectedPartner ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>
        </label>

        <!-- Option 3: From existing custody held with partner -->
        <label class="payment-source-card ${selectedSource === 'custody' ? 'selected' : ''}" id="sourceCard_custody">
          <input type="radio" name="expenseSource" value="custody" ${selectedSource === 'custody' ? 'checked' : ''} onchange="onSourceChange('custody')" />
          <div class="source-content">
            <div class="source-header">
              <span class="source-title" style="display:inline-flex; align-items:center; gap:6px;">${ICONS.custody} خصم من عهدة سابقة طرف شريك</span>
              <span class="source-badge custody">تحديث عهدة</span>
            </div>
            <div class="source-desc">يُخصم المصروف من رصيد عهدة الشريك تلقائياً دون الحاجة لتحديثها يدوياً.</div>
            
            <div class="source-subfield ${selectedSource === 'custody' ? '' : 'hidden'}" id="subfield_custody">
              <label style="font-size:12px; font-weight:800; color:var(--brand-amber); margin-bottom:4px; display:block;">اختر الشريك صاحب العهدة المنصرف منها:</label>
              <select id="exp_custody_select" class="form-select">
                ${custodies.map(c => `<option value="${c.partner}" ${c.partner === selectedCustodyPartner ? 'selected' : ''}>${c.partner} (المتبقي معه: ${fmtMoney(c.amount)})</option>`).join('')}
                ${custodies.length === 0 ? partners.map(p => `<option value="${p}">${p}</option>`).join('') : ''}
              </select>
            </div>
          </div>
        </label>

      </div>
    </div>

    <!-- Notes Field -->
    <div class="form-group">
      <label>ملاحظات إضافية</label>
      <input id="exp_notes" class="form-input" type="text" placeholder="أي تفاصيل أو أرقام فواتير..." value="${notesVal}" />
    </div>
  `;
}

// Switcher for payment source cards in Expense modal
function onSourceChange(source) {
  ['vault', 'partner', 'custody'].forEach(s => {
    const card = document.getElementById('sourceCard_' + s);
    const subfield = document.getElementById('subfield_' + s);
    if (card) card.classList.toggle('selected', s === source);
    if (subfield) subfield.classList.toggle('hidden', s !== source);
  });
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
  modalOverlay?.classList.add('hidden');
  currentSheet = null;
  currentRow = null;
}

document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// ---------- Save Handler (Fully Automated) ----------
document.getElementById('modalSaveBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('modalSaveBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>جاري المعالجة والحفظ...</span>';

  try {
    if (currentSheet === 'expenses') {
      await handleSaveExpense();
    } else {
      await handleSaveStandard();
    }

    closeModal();
    await loadData(true);
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء الحفظ: ' + (err.message || 'حاول مجدداً'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>حفظ البيانات</span>';
  }
});

// Smart Expense Save Execution
async function handleSaveExpense() {
  const date = document.getElementById('exp_date')?.value;
  const item = document.getElementById('exp_item')?.value?.trim();
  const amountStr = document.getElementById('exp_amount')?.value;
  const amount = Number(amountStr);
  const notes = document.getElementById('exp_notes')?.value?.trim() || '';

  if (!date || !item || !amountStr || amount <= 0) {
    showToast('يرجى كتابة التاريخ، البند، والمبلغ بشكل صحيح', 'error');
    throw new Error('بيانات غير مكتملة');
  }

  const selectedRadio = document.querySelector('input[name="expenseSource"]:checked');
  const source = selectedRadio ? selectedRadio.value : 'vault';

  let paidFromText = 'الخزنة / الصندوق';
  let partnerToCredit = null;
  let custodyPartnerToDeduct = null;

  if (source === 'vault') {
    paidFromText = 'الخزنة / الصندوق';
  } else if (source === 'partner') {
    const pSelect = document.getElementById('exp_partner_select');
    partnerToCredit = pSelect ? pSelect.value : '';
    paidFromText = partnerToCredit || 'شريك دفع من جيبه';
  } else if (source === 'custody') {
    const cSelect = document.getElementById('exp_custody_select');
    custodyPartnerToDeduct = cSelect ? cSelect.value : '';
    paidFromText = 'عهدة مع ' + (custodyPartnerToDeduct || 'شريك');
  }

  // 1. Save the expense to Google Sheets
  const expenseData = {
    date: date,
    item: item,
    amount: amount,
    paidFrom: paidFromText,
    notes: notes
  };

  const payload = {
    action: currentRow ? 'update' : 'add',
    sheet: 'expenses',
    data: expenseData
  };
  if (currentRow) payload.row = currentRow;

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const out = await res.json();
  if (!out.success) throw new Error(out.error || 'فشل حفظ المصروف');

  // 2. If paid by partner personally: Automatically record matching contribution to increase capital!
  if (source === 'partner' && partnerToCredit && !currentRow) {
    try {
      const contribPayload = {
        action: 'add',
        sheet: 'contributions',
        data: {
          date: date,
          partner: partnerToCredit,
          amount: amount,
          method: 'دفع مباشر لمصروف: ' + item,
          notes: notes ? `سداد مصروف "${item}" (${notes})` : `سداد مباشر لمصروف "${item}" من حسابه الشخصي`
        }
      };

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(contribPayload)
      });
    } catch (e) {
      console.warn('Could not auto-create contribution:', e);
    }
  }

  // 3. If paid from custody: Automatically deduct from that partner's open custody row!
  if (source === 'custody' && custodyPartnerToDeduct && !currentRow) {
    try {
      const activeCustody = (STATE.custody || []).find(c => {
        const isHeld = (c.status || '').includes('لا') || (c.status || '').includes('معاه');
        return isHeld && c.partner === custodyPartnerToDeduct;
      });

      if (activeCustody && activeCustody._row) {
        const currentCustodyAmount = Number(activeCustody.amount) || 0;
        const newCustodyAmount = Math.max(0, currentCustodyAmount - amount);
        const isFullySettled = newCustodyAmount <= 0;

        const updateCustodyPayload = {
          action: 'update',
          sheet: 'custody',
          row: activeCustody._row,
          data: {
            date: activeCustody.date || date,
            partner: activeCustody.partner,
            amount: newCustodyAmount,
            reason: activeCustody.reason || '',
            status: isFullySettled ? 'نعم - اتصرفت/اتوردت' : 'لا - لسه معاه',
            notes: (activeCustody.notes ? activeCustody.notes + ' | ' : '') + `خصم مصروف: ${item} (${fmtMoney(amount)})`
          }
        };

        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(updateCustodyPayload)
        });
      }
    } catch (e) {
      console.warn('Could not auto-update custody:', e);
    }
  }

  showToast('تم تسجيل المصروف وتحديث الحسابات تلقائياً', 'success');
}

// Standard Save for Contributions & Custody
async function handleSaveStandard() {
  const def = FORM_DEFS[currentSheet];
  const data = {};

  for (const f of def.fields) {
    const el = document.getElementById('field_' + f.key);
    const val = el ? el.value.trim() : '';

    if (f.required && !val) {
      showToast('يرجى ملء حقل: ' + f.label, 'error');
      if (el) el.focus();
      throw new Error('حقل مطلوب');
    }
    data[f.key] = f.type === 'number' ? Number(val) : val;
  }

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

  showToast('تم الحفظ بنجاح', 'success');
}

// Delete Action
async function deleteRow(sheetKey, row) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟')) return;

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
