// ==========================================================
// KOPI - منطق الموقع
// ==========================================================

document.getElementById('year').textContent = new Date().getFullYear();

let STATE = {
  contributions: [],
  expenses: [],
  custody: [],
  summary: null,
  lists: null
};

let pollTimer = null;

// ---------- أدوات مساعدة ----------
function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  return num.toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' جنيه';
}

function setStatus(state, text) {
  const dot = document.getElementById('statusDot');
  const t = document.getElementById('statusText');
  dot.className = 'status-dot ' + (state === 'ok' ? 'ok' : state === 'err' ? 'err' : '');
  t.textContent = text;
}

function showToast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function isConfigured() {
  return typeof APPS_SCRIPT_URL === 'string' &&
    APPS_SCRIPT_URL.startsWith('http') &&
    !APPS_SCRIPT_URL.includes('PASTE_YOUR');
}

// ---------- تبويبات ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
  });
});

// ---------- تحميل البيانات ----------
async function loadData(silent) {
  if (!isConfigured()) {
    document.getElementById('setupBanner').classList.remove('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    setStatus('err', 'مش متوصل');
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
    setStatus('ok', 'متصل ومحدّث لحظيًا');
  } catch (err) {
    console.error(err);
    setStatus('err', 'مشكلة في الاتصال بالسكريبت');
    if (!silent) {
      const errMsg = err.message || 'حصلت مشكلة في تحميل البيانات';
      showToast('خطأ: ' + errMsg, 'error');
    }
  } finally {
    document.getElementById('loadingState').classList.add('hidden');
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => loadData(true), (typeof AUTO_REFRESH_MS === 'number' ? AUTO_REFRESH_MS : 20000));
}

// ---------- الرسم ----------
function renderAll() {
  renderDashboard();
  renderContributions();
  renderExpenses();
  renderCustody();
}

function renderDashboard() {
  const s = STATE.summary;
  const cardsEl = document.getElementById('statCards');
  if (!s) { cardsEl.innerHTML = ''; return; }
  const t = s.totals || {};
  cardsEl.innerHTML = `
    <div class="stat-card">
      <div class="label">إجمالي المساهمات</div>
      <div class="value">${fmtMoney(t.totalContributions)}</div>
    </div>
    <div class="stat-card red">
      <div class="label">إجمالي المصروفات</div>
      <div class="value">${fmtMoney(t.totalExpenses)}</div>
    </div>
    <div class="stat-card gray">
      <div class="label">عهدة لسه متشالة مع شركاء</div>
      <div class="value">${fmtMoney(t.custodyStillHeld)}</div>
    </div>
    <div class="stat-card green">
      <div class="label">الرصيد المتاح في الصندوق</div>
      <div class="value">${fmtMoney(t.availableBalance)}</div>
    </div>
  `;

  const body = document.getElementById('partnersTableBody');
  const partners = (s.partners || []).filter(p => p.name && p.name !== 'الإجمالي');
  const totalRow = (s.partners || []).find(p => p.name === 'الإجمالي');
  let rows = partners.map(p => `
    <tr>
      <td>${p.name}</td>
      <td class="amount">${fmtMoney(p.totalPaid)}</td>
      <td><span class="badge blue">${Math.round((p.sharePercent || 0) * 100)}%</span></td>
      <td>${fmtMoney(p.shareOfExpenses)}</td>
      <td class="amount ${p.balance < 0 ? 'neg' : 'pos'}">${p.balance < 0 ? 'عليه' : 'له'} ${fmtMoney(Math.abs(p.balance))}</td>
    </tr>
  `).join('');
  if (totalRow) {
    rows += `
      <tr style="font-weight:800;background:var(--blue-50);">
        <td>الإجمالي</td>
        <td class="amount">${fmtMoney(totalRow.totalPaid)}</td>
        <td>${Math.round((totalRow.sharePercent || 0) * 100)}%</td>
        <td>${fmtMoney(totalRow.shareOfExpenses)}</td>
        <td class="amount ${totalRow.balance < 0 ? 'neg' : 'pos'}">${fmtMoney(totalRow.balance)}</td>
      </tr>`;
  }
  body.innerHTML = rows || '<tr><td colspan="5" class="empty-state">لسه مفيش بيانات</td></tr>';
}

function renderContributions() {
  const body = document.getElementById('contributionsTableBody');
  const empty = document.getElementById('contributionsEmpty');
  const rows = STATE.contributions || [];
  empty.classList.toggle('hidden', rows.length > 0);
  body.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id ?? ''}</td>
      <td>${r.date || ''}</td>
      <td>${r.partner || ''}</td>
      <td class="amount">${fmtMoney(r.amount)}</td>
      <td><span class="badge">${r.method || ''}</span></td>
      <td>${r.notes || ''}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" onclick="openEdit('contributions', ${r._row})">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow('contributions', ${r._row})">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderExpenses() {
  const body = document.getElementById('expensesTableBody');
  const empty = document.getElementById('expensesEmpty');
  const rows = STATE.expenses || [];
  empty.classList.toggle('hidden', rows.length > 0);
  body.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id ?? ''}</td>
      <td>${r.date || ''}</td>
      <td>${r.item || ''}</td>
      <td class="amount">${fmtMoney(r.amount)}</td>
      <td><span class="badge blue">${r.paidFrom || ''}</span></td>
      <td>${r.notes || ''}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" onclick="openEdit('expenses', ${r._row})">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow('expenses', ${r._row})">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCustody() {
  const body = document.getElementById('custodyTableBody');
  const empty = document.getElementById('custodyEmpty');
  const rows = STATE.custody || [];
  empty.classList.toggle('hidden', rows.length > 0);
  body.innerHTML = rows.map(r => {
    const statusClass = r.status === 'لا - لسه معاه' ? 'red' : 'green';
    return `
    <tr>
      <td>${r.id ?? ''}</td>
      <td>${r.date || ''}</td>
      <td>${r.partner || ''}</td>
      <td class="amount">${fmtMoney(r.amount)}</td>
      <td>${r.reason || ''}</td>
      <td><span class="badge ${statusClass}">${r.status || ''}</span></td>
      <td>${r.notes || ''}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" onclick="openEdit('custody', ${r._row})">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow('custody', ${r._row})">حذف</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ---------- تعريف الحقول لكل نوع ----------
const FORM_DEFS = {
  contributions: {
    title: 'مساهمة',
    fields: [
      { key: 'date', label: 'التاريخ', type: 'date', required: true },
      { key: 'partner', label: 'اسم الشريك', type: 'select', options: () => (STATE.lists && STATE.lists.partners) || [], required: true },
      { key: 'amount', label: 'المبلغ المدفوع', type: 'number', required: true },
      { key: 'method', label: 'طريقة الدفع', type: 'select', options: () => (STATE.lists && STATE.lists.paymentMethods) || ['كاش', 'تحويل بانكي'], required: true },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ]
  },
  expenses: {
    title: 'مصروف',
    fields: [
      { key: 'date', label: 'التاريخ', type: 'date', required: true },
      { key: 'item', label: 'البند / بيان المصروف', type: 'text', required: true },
      { key: 'amount', label: 'المبلغ', type: 'number', required: true },
      { key: 'paidFrom', label: 'اتصرف من فلوس', type: 'select', options: () => (STATE.lists && STATE.lists.expensePaidFrom) || ['الخزنة / الصندوق'], required: true },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ]
  },
  custody: {
    title: 'عهدة',
    fields: [
      { key: 'date', label: 'التاريخ', type: 'date', required: true },
      { key: 'partner', label: 'اسم الشريك الماسك للمبلغ', type: 'select', options: () => (STATE.lists && STATE.lists.partners) || [], required: true },
      { key: 'amount', label: 'المبلغ', type: 'number', required: true },
      { key: 'reason', label: 'سبب وجود الفلوس معاه', type: 'text' },
      { key: 'status', label: 'هل تم توريدها/صرفها؟', type: 'select', options: () => (STATE.lists && STATE.lists.custodyStatus) || ['لا - لسه معاه', 'نعم - اتصرفت/اتوردت'], required: true },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ]
  }
};

// ---------- المودال ----------
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');
let currentSheet = null;
let currentRow = null; // null = إضافة, رقم = تعديل

function openAdd(sheetKey) {
  currentSheet = sheetKey;
  currentRow = null;
  const def = FORM_DEFS[sheetKey];
  modalTitle.textContent = 'إضافة ' + def.title;
  buildForm(def, {});
  modalOverlay.classList.remove('hidden');
}

function openEdit(sheetKey, row) {
  currentSheet = sheetKey;
  currentRow = row;
  const def = FORM_DEFS[sheetKey];
  const record = STATE[sheetKey].find(r => r._row === row);
  modalTitle.textContent = 'تعديل ' + def.title;
  buildForm(def, record || {});
  modalOverlay.classList.remove('hidden');
}

function buildForm(def, values) {
  modalBody.innerHTML = def.fields.map(f => {
    const val = values[f.key] ?? '';
    if (f.type === 'select') {
      const opts = f.options().map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('');
      return `<div class="field"><label>${f.label}${f.required ? ' *' : ''}</label>
        <select id="field_${f.key}"><option value="">-- اختر --</option>${opts}</select></div>`;
    }
    return `<div class="field"><label>${f.label}${f.required ? ' *' : ''}</label>
      <input id="field_${f.key}" type="${f.type}" value="${val}" />
    </div>`;
  }).join('');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  currentSheet = null;
  currentRow = null;
}

document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

document.getElementById('addContributionBtn').addEventListener('click', () => openAdd('contributions'));
document.getElementById('addExpenseBtn').addEventListener('click', () => openAdd('expenses'));
document.getElementById('addCustodyBtn').addEventListener('click', () => openAdd('custody'));

document.getElementById('modalSaveBtn').addEventListener('click', async () => {
  const def = FORM_DEFS[currentSheet];
  const data = {};
  for (const f of def.fields) {
    const el = document.getElementById('field_' + f.key);
    const val = el.value.trim();
    if (f.required && !val) {
      showToast('من فضلك املأ: ' + f.label, 'error');
      el.focus();
      return;
    }
    data[f.key] = f.type === 'number' ? Number(val) : val;
  }

  const btn = document.getElementById('modalSaveBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  try {
    const payload = {
      action: currentRow ? 'update' : 'add',
      sheet: currentSheet,
      data: data
    };
    if (currentRow) payload.row = currentRow;

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // لتفادي مشاكل CORS مع Apps Script
      body: JSON.stringify(payload)
    });
    const out = await res.json();
    if (!out.success) throw new Error(out.error || 'فشل الحفظ');

    showToast('تم الحفظ بنجاح ✅', 'success');
    closeModal();
    await loadData(true);
  } catch (err) {
    console.error(err);
    showToast('حصل خطأ أثناء الحفظ، جرب تاني', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ';
  }
});

// ---------- حذف ----------
async function deleteRow(sheetKey, row) {
  if (!confirm('متأكد إنك عايز تحذف السطر ده؟')) return;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', sheet: sheetKey, row: row })
    });
    const out = await res.json();
    if (!out.success) throw new Error(out.error || 'فشل الحذف');
    showToast('تم الحذف', 'success');
    await loadData(true);
  } catch (err) {
    console.error(err);
    showToast('حصل خطأ أثناء الحذف', 'error');
  }
}

// ---------- بداية التشغيل ----------
loadData(false);
startPolling();
