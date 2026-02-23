/**
 * Dashboard - Table rendering, filters, sorting, summaries
 */
const Dashboard = (() => {
  let sortCol = 'pnl5';
  let sortDir = 'desc';
  let noteTimers = {};

  // ===== FORMATTING =====
  function fmt(v) {
    if (v === null || v === undefined) return '<span class="dash">-</span>';
    const neg = v < 0;
    const abs = Math.abs(v);
    const s = abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (neg) return `<span class="negative">(${s})</span>`;
    if (v === 0) return '<span class="dash">-</span>';
    return s;
  }

  function fmtPositive(v) {
    if (v === null || v === undefined) return '<span class="dash">-</span>';
    const neg = v < 0;
    const abs = Math.abs(v);
    const s = abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (neg) return `<span class="negative">(${s})</span>`;
    if (v === 0) return '<span class="dash">-</span>';
    return `<span class="positive">${s}</span>`;
  }

  function fmtPill(v) {
    if (v === null || v === undefined) return '<span class="dash">-</span>';
    const neg = v < 0;
    const abs = Math.abs(v);
    const s = abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return neg ? `<span class="pill neg">(${s})</span>` : `<span class="pill pos">${s}</span>`;
  }

  function fmtCurrency(v) {
    if (v === null || v === undefined) return '-';
    return '\u00A3' + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ===== COLUMNS =====
  function getFixedColumns() {
    return [
      { key: 'id', label: 'ID', type: 'text', alwaysVisible: true },
      { key: 'branchName', label: 'Branch', type: 'text', alwaysVisible: true },
      { key: 'company', label: 'Company', type: 'text', alwaysVisible: true }
    ];
  }

  function getEndColumns() {
    return [
      { key: 'pnl3', label: '3%', type: 'num', alwaysVisible: true },
      { key: 'pnl5', label: '5%', type: 'num', alwaysVisible: true },
      { key: '_notes', label: 'Notes', type: 'action', alwaysVisible: true },
      { key: '_export', label: 'Export', type: 'action', alwaysVisible: true },
      { key: '_archive', label: '', type: 'action', alwaysVisible: true }
    ];
  }

  function getDynamicColumns() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.lineItemMeta) return [];
    return AppState.currentQuarter.lineItemMeta.map(li => ({
      key: li.key,
      label: li.label,
      type: 'num',
      indent: li.indent
    }));
  }

  function getVisibleColumns() {
    const fixed = getFixedColumns();
    const dynamic = getDynamicColumns();
    const end = getEndColumns();

    const visible = AppState.visibleColumns;
    let filteredDynamic;

    if (visible && visible.length > 0) {
      filteredDynamic = dynamic.filter(c => visible.includes(c.key));
    } else {
      // Default: show key financial columns
      const defaults = [
        'pharmacy_services_income', 'payroll_and_related_expenses',
        'total_revenue', 'total_cost_of_revenue', 'gross_profit',
        'total_operating_expenses', 'net_income_loss'
      ];
      filteredDynamic = dynamic.filter(c => defaults.includes(c.key));
      // If no defaults match, show first 5
      if (filteredDynamic.length === 0) {
        filteredDynamic = dynamic.slice(0, 5);
      }
    }

    return [...fixed, ...filteredDynamic, ...end];
  }

  // ===== RENDERING =====
  function buildTableHeaders(containerId) {
    const columns = getVisibleColumns();
    const headerRow = document.querySelector(`#${containerId} tr`);
    headerRow.innerHTML = '';

    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;

      if (col.type === 'num' || col.type === 'text') {
        th.dataset.col = col.key;
        th.dataset.type = col.type;
        if (col.key === sortCol) {
          th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
      } else {
        th.classList.add('no-sort');
        if (col.key === '_archive') th.style.width = '40px';
        if (col.key === '_export') th.style.whiteSpace = 'nowrap';
      }

      headerRow.appendChild(th);
    });
  }

  function getCellValue(branch, col) {
    if (col.key === 'id' || col.key === 'branchName' || col.key === 'company') {
      return branch[col.key];
    }
    if (col.key === 'pnl3') return branch.pnl3;
    if (col.key === 'pnl5') return branch.pnl5;
    if (col.key === 'netIncome') return branch.netIncome;
    // Dynamic line item
    return branch.lineItems ? branch.lineItems[col.key] : null;
  }

  function getSortValue(branch, colKey) {
    if (colKey === 'id') return branch.id;
    if (colKey === 'branchName') return branch.branchName;
    if (colKey === 'company') return branch.company;
    if (colKey === 'pnl3') return branch.pnl3;
    if (colKey === 'pnl5') return branch.pnl5;
    if (colKey === 'netIncome') return branch.netIncome;
    return branch.lineItems ? branch.lineItems[colKey] : null;
  }

  function renderRow(branch, isArchived) {
    const columns = getVisibleColumns();
    const state = AppState.branchStates[branch.branchName] || {};
    const notes = state.notes || '';
    const ec = state.exportCol || '5';
    const escaped = branch.branchName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const hasNegCogs = branch.lineItems &&
      (branch.lineItems['cost_of_goods_sold'] < 0 || branch.lineItems['cogs'] < 0);

    let html = `<tr class="${hasNegCogs ? 'negative-cogs' : ''}">`;

    for (const col of columns) {
      if (col.key === 'id') {
        html += `<td>${branch.id}</td>`;
      } else if (col.key === 'branchName') {
        html += `<td><strong>${escapeHtml(branch.branchName)}</strong></td>`;
      } else if (col.key === 'company') {
        html += `<td style="color:#666;font-size:12px">${escapeHtml(branch.company)}</td>`;
      } else if (col.key === 'pnl3') {
        html += `<td class="num">${fmtPill(branch.pnl3)}</td>`;
      } else if (col.key === 'pnl5') {
        html += `<td class="num">${fmtPill(branch.pnl5)}</td>`;
      } else if (col.key === '_notes') {
        const noteVal = notes.replace(/"/g, '&quot;');
        html += `<td><input class="my-notes-input" value="${noteVal}" data-branch="${escaped}" placeholder="Add note..."></td>`;
      } else if (col.key === '_export') {
        html += `<td><select class="export-pick" data-branch="${escaped}">
          <option value="3"${ec === '3' ? ' selected' : ''}>3%</option>
          <option value="5"${ec === '5' ? ' selected' : ''}>5%</option>
        </select></td>`;
      } else if (col.key === '_archive') {
        if (isArchived) {
          html += `<td><button class="unarchive-btn" data-branch="${escaped}">Restore</button></td>`;
        } else {
          html += `<td><button class="archive-btn" data-branch="${escaped}" title="Archive branch">\u2716</button></td>`;
        }
      } else {
        // Dynamic numeric column
        const val = getCellValue(branch, col);
        html += `<td class="num">${fmt(val)}</td>`;
      }
    }

    html += '</tr>';
    return html;
  }

  // ===== FILTERING =====
  function getFiltered() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.branches) return [];

    const co = document.getElementById('companyFilter').value;
    const br = document.getElementById('branchFilter').value;
    const gr = document.getElementById('groupFilter').value;
    const q = document.getElementById('searchInput').value.toLowerCase();
    const sh = document.getElementById('showFilter').value;

    let groupBranches = null;
    if (gr) {
      groupBranches = Groups.getBranchesInGroup(gr);
    }

    return AppState.currentQuarter.branches.filter(d => {
      const state = AppState.branchStates[d.branchName] || {};
      if (state.archived) return false;
      if (co && d.company !== co) return false;
      if (br && d.branchName !== br) return false;
      if (groupBranches && !groupBranches.has(d.branchName)) return false;
      if (q && !d.branchName.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
      if (sh === 'profitable' && (d.pnl5 === null || d.pnl5 < 0)) return false;
      if (sh === 'loss' && (d.pnl5 === null || d.pnl5 >= 0)) return false;
      return true;
    });
  }

  function getArchived() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.branches) return [];
    return AppState.currentQuarter.branches.filter(d => {
      const state = AppState.branchStates[d.branchName] || {};
      return state.archived === true;
    });
  }

  // ===== MAIN RENDER =====
  function render() {
    if (!AppState.currentQuarter) {
      document.getElementById('emptyState').style.display = 'block';
      document.querySelector('.table-wrap').style.display = 'none';
      document.querySelector('.filters').style.display = 'none';
      document.querySelector('.summary').style.display = 'none';
      document.querySelector('.footer-note').style.display = 'none';
      document.querySelector('.archived-section').style.display = 'none';
      return;
    }

    document.getElementById('emptyState').style.display = 'none';
    document.querySelector('.table-wrap').style.display = 'block';
    document.querySelector('.filters').style.display = 'flex';
    document.querySelector('.summary').style.display = 'flex';
    document.querySelector('.footer-note').style.display = 'block';
    document.querySelector('.archived-section').style.display = 'block';

    buildTableHeaders('mainTableHead');
    buildTableHeaders('archivedTableHead');

    let filtered = getFiltered();

    // Sort
    filtered.sort((a, b) => {
      let va = getSortValue(a, sortCol);
      let vb = getSortValue(b, sortCol);

      if (typeof va === 'string' && typeof vb === 'string') {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }

      if (va === null || va === undefined) va = -Infinity;
      if (vb === null || vb === undefined) vb = -Infinity;
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    // Summary
    const incomeKey = findKey(['pharmacy_services_income', 'pharmacy_income', 'total_revenue']);
    const payrollKey = findKey(['payroll_and_related_expenses', 'payroll', 'payroll_expense']);

    const ti = filtered.reduce((s, d) => {
      const val = incomeKey && d.lineItems ? (d.lineItems[incomeKey] || 0) : 0;
      return s + val;
    }, 0);
    const tp = filtered.reduce((s, d) => {
      const val = payrollKey && d.lineItems ? (d.lineItems[payrollKey] || 0) : 0;
      return s + val;
    }, 0);
    const pct = ti > 0 ? ((tp / ti) * 100).toFixed(1) : '0.0';
    const totalBranches = AppState.currentQuarter.branches.length;
    const activeBranches = AppState.currentQuarter.branches.filter(b => {
      const st = AppState.branchStates[b.branchName] || {};
      return !st.archived;
    }).length;

    document.getElementById('totalIncome').textContent = '\u00A3' + ti.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('totalIncomeSub').textContent = `across ${filtered.length} branches`;
    document.getElementById('totalPayroll').textContent = '\u00A3' + tp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('totalPayrollSub').textContent = `${pct}% of services income`;
    document.getElementById('branchCount').textContent = filtered.length;
    document.getElementById('branchCountSub').textContent = `of ${activeBranches} active (${totalBranches} total)`;

    // Table body
    document.getElementById('tableBody').innerHTML = filtered.map(d => renderRow(d, false)).join('');

    // Archived
    renderArchived();

    // Re-attach event listeners
    attachTableEvents();
  }

  function renderArchived() {
    const archivedData = getArchived();
    const toggle = document.getElementById('archivedToggle');
    const content = document.getElementById('archivedContent');

    if (archivedData.length === 0) {
      toggle.style.display = 'none';
      content.classList.remove('open');
      return;
    }

    toggle.style.display = 'block';
    const isOpen = content.classList.contains('open');
    toggle.textContent = (isOpen ? '\u25BC ' : '\u25B6 ') + `Archived Branches (${archivedData.length})`;

    document.getElementById('archivedBody').innerHTML = archivedData.map(d => renderRow(d, true)).join('');
  }

  function findKey(candidates) {
    if (!AppState.currentQuarter || !AppState.currentQuarter.lineItemKeys) return null;
    for (const k of candidates) {
      if (AppState.currentQuarter.lineItemKeys.includes(k)) return k;
    }
    return null;
  }

  // ===== EVENT HANDLING =====
  function attachTableEvents() {
    // Note inputs
    document.querySelectorAll('.my-notes-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const branch = e.target.dataset.branch;
        if (!AppState.branchStates[branch]) AppState.branchStates[branch] = {};
        AppState.branchStates[branch].notes = e.target.value;

        // Debounced save
        clearTimeout(noteTimers[branch]);
        noteTimers[branch] = setTimeout(() => {
          if (AppState.currentQuarterId) {
            DataStore.saveBranchState(AppState.currentQuarterId, branch, AppState.branchStates[branch]);
          }
        }, 500);
      });
    });

    // Export col pickers
    document.querySelectorAll('.export-pick').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const branch = e.target.dataset.branch;
        if (!AppState.branchStates[branch]) AppState.branchStates[branch] = {};
        AppState.branchStates[branch].exportCol = e.target.value;
        if (AppState.currentQuarterId) {
          DataStore.saveBranchState(AppState.currentQuarterId, branch, AppState.branchStates[branch]);
        }
      });
    });

    // Archive buttons
    document.querySelectorAll('.archive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const branch = e.target.dataset.branch;
        if (!AppState.branchStates[branch]) AppState.branchStates[branch] = {};
        AppState.branchStates[branch].archived = true;
        if (AppState.currentQuarterId) {
          DataStore.saveBranchState(AppState.currentQuarterId, branch, AppState.branchStates[branch]);
        }
        render();
      });
    });

    // Unarchive buttons
    document.querySelectorAll('.unarchive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const branch = e.target.dataset.branch;
        if (!AppState.branchStates[branch]) AppState.branchStates[branch] = {};
        AppState.branchStates[branch].archived = false;
        if (AppState.currentQuarterId) {
          DataStore.saveBranchState(AppState.currentQuarterId, branch, AppState.branchStates[branch]);
        }
        render();
      });
    });
  }

  function initSortHandlers() {
    document.getElementById('mainTableHead').addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th || !th.dataset.col) return;
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = th.dataset.type === 'num' ? 'desc' : 'asc';
      }
      render();
    });
  }

  function initFilterHandlers() {
    ['companyFilter', 'branchFilter', 'groupFilter', 'showFilter'].forEach(id => {
      document.getElementById(id).addEventListener('change', render);
    });
    document.getElementById('searchInput').addEventListener('input', render);
  }

  function initArchivedToggle() {
    document.getElementById('archivedToggle').addEventListener('click', () => {
      const c = document.getElementById('archivedContent');
      c.classList.toggle('open');
      renderArchived();
    });
  }

  // ===== FILTER POPULATION =====
  function updateFilters() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.branches) return;

    const branches = AppState.currentQuarter.branches;

    // Company filter
    const compSel = document.getElementById('companyFilter');
    const currentComp = compSel.value;
    compSel.innerHTML = '<option value="">All Companies</option>';
    [...new Set(branches.map(b => b.company))].sort().forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      compSel.appendChild(o);
    });
    compSel.value = currentComp;

    // Branch filter
    const brSel = document.getElementById('branchFilter');
    const currentBr = brSel.value;
    brSel.innerHTML = '<option value="">All Branches</option>';
    [...new Set(branches.map(b => b.branchName))].sort().forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      brSel.appendChild(o);
    });
    brSel.value = currentBr;

    updateGroupFilter();
  }

  function updateGroupFilter() {
    const grSel = document.getElementById('groupFilter');
    const current = grSel.value;
    grSel.innerHTML = '<option value="">All Groups</option>';
    AppState.groups.forEach(g => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.name;
      grSel.appendChild(o);
    });
    grSel.value = current;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    initSortHandlers();
    initFilterHandlers();
    initArchivedToggle();
  }

  return {
    init,
    render,
    updateFilters,
    updateGroupFilter,
    getFiltered,
    getVisibleColumns,
    getDynamicColumns,
    getFixedColumns,
    getEndColumns,
    getCellValue,
    fmt,
    fmtPill,
    fmtCurrency
  };
})();
