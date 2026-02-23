/**
 * Export - Excel, CSV, PDF with column picker dialog
 */
const Export = (() => {
  let pendingExportType = null;
  let selectedExportColumns = [];

  function init() {
    document.getElementById('exportExcelBtn').addEventListener('click', () => showExportDialog('excel'));
    document.getElementById('exportCsvBtn').addEventListener('click', () => showExportDialog('csv'));
    document.getElementById('exportPdfBtn').addEventListener('click', () => showExportDialog('pdf'));

    // Export column picker modal
    document.getElementById('exportColModalClose').addEventListener('click', closeExportDialog);
    document.getElementById('exportColCancelBtn').addEventListener('click', closeExportDialog);
    document.getElementById('exportColConfirmBtn').addEventListener('click', confirmExport);
    document.getElementById('exportColSelectAll').addEventListener('click', () => toggleAllExportCols(true));
    document.getElementById('exportColDeselectAll').addEventListener('click', () => toggleAllExportCols(false));

    document.getElementById('exportColModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('exportColModal')) closeExportDialog();
    });
  }

  function showExportDialog(type) {
    pendingExportType = type;
    renderExportColumnPicker();
    document.getElementById('exportColModal').style.display = 'flex';
  }

  function closeExportDialog() {
    document.getElementById('exportColModal').style.display = 'none';
    pendingExportType = null;
  }

  function renderExportColumnPicker() {
    const list = document.getElementById('exportColList');
    const allCols = getAllExportableColumns();
    const visibleKeys = new Set((AppState.visibleColumns || []).length > 0
      ? AppState.visibleColumns
      : allCols.map(c => c.key));

    // Always include fixed columns
    const fixed = new Set(['id', 'branchName', 'company', 'pnl3', 'pnl5']);

    list.innerHTML = allCols.map(col => {
      const checked = fixed.has(col.key) || visibleKeys.has(col.key);
      const disabled = fixed.has(col.key);
      return `
        <div class="column-picker-item${col.indent > 0 ? ' indent' : ''}">
          <input type="checkbox" id="exp_${col.key}" value="${col.key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <label for="exp_${col.key}">${col.label}</label>
        </div>
      `;
    }).join('');
  }

  function toggleAllExportCols(checked) {
    document.querySelectorAll('#exportColList input[type="checkbox"]:not(:disabled)').forEach(cb => {
      cb.checked = checked;
    });
  }

  function getSelectedExportColumns() {
    const selected = [];
    document.querySelectorAll('#exportColList input[type="checkbox"]:checked').forEach(cb => {
      selected.push(cb.value);
    });
    return selected;
  }

  function getAllExportableColumns() {
    const fixed = [
      { key: 'id', label: 'ID', indent: 0 },
      { key: 'branchName', label: 'Branch', indent: 0 },
      { key: 'company', label: 'Company', indent: 0 }
    ];

    const dynamic = Dashboard.getDynamicColumns().map(c => ({
      key: c.key,
      label: c.label,
      indent: c.indent || 0
    }));

    const end = [
      { key: 'pnl3', label: '3%', indent: 0 },
      { key: 'pnl5', label: '5%', indent: 0 },
      { key: 'notes', label: 'Notes', indent: 0 }
    ];

    return [...fixed, ...dynamic, ...end];
  }

  function confirmExport() {
    selectedExportColumns = getSelectedExportColumns();
    closeExportDialog();

    if (pendingExportType === 'excel') doExportExcel();
    else if (pendingExportType === 'csv') doExportCSV();
    else if (pendingExportType === 'pdf') doExportPDF();
  }

  function getExportData() {
    const filtered = Dashboard.getFiltered();
    const columns = selectedExportColumns;
    const allCols = getAllExportableColumns();
    const colMap = {};
    allCols.forEach(c => { colMap[c.key] = c; });

    return filtered.map(d => {
      const row = {};
      const state = AppState.branchStates[d.branchName] || {};

      for (const key of columns) {
        const col = colMap[key];
        if (!col) continue;

        if (key === 'id') row['ID'] = d.id;
        else if (key === 'branchName') row['Branch'] = d.branchName;
        else if (key === 'company') row['Company'] = d.company;
        else if (key === 'pnl3') row['3%'] = d.pnl3;
        else if (key === 'pnl5') row['5%'] = d.pnl5;
        else if (key === 'notes') row['Notes'] = state.notes || '';
        else {
          row[col.label] = d.lineItems ? d.lineItems[key] : null;
        }
      }

      return row;
    });
  }

  function getQuarterLabel() {
    if (!AppState.currentQuarter) return '';
    return AppState.currentQuarterId || 'Export';
  }

  function doExportCSV() {
    const rows = getExportData();
    if (!rows.length) { alert('No data to export.'); return; }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        let v = r[h];
        if (v === null || v === undefined) v = '';
        v = String(v).replace(/"/g, '""');
        return `"${v}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `Branch_PnL_${getQuarterLabel()}_Export.csv`);
  }

  function doExportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('SheetJS library not loaded. Check internet connection.');
      return;
    }
    const rows = getExportData();
    if (!rows.length) { alert('No data to export.'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const headers = Object.keys(rows[0]);
    ws['!cols'] = headers.map(h => ({
      wch: Math.max(h.length + 2, 12)
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branch P&L');
    XLSX.writeFile(wb, `Branch_PnL_${getQuarterLabel()}_Export.xlsx`);
  }

  function doExportPDF() {
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      alert('PDF libraries not loaded. Check internet connection.');
      return;
    }

    const tableEl = document.getElementById('mainTable');
    html2canvas(tableEl, { scale: 1.5, useCORS: true, logging: false }).then(canvas => {
      const { jsPDF } = jspdf;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdfW = imgW * 0.264583;
      const pdfH = imgH * 0.264583;
      const pdf = new jsPDF({
        orientation: pdfW > pdfH ? 'l' : 'p',
        unit: 'mm',
        format: [pdfW + 20, pdfH + 30]
      });
      pdf.setFontSize(14);
      pdf.text('Allied Pharmacies - Branch P&L Dashboard', 10, 12);
      pdf.setFontSize(9);
      pdf.text(getQuarterLabel(), 10, 18);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 24, pdfW, pdfH);
      pdf.save(`Branch_PnL_${getQuarterLabel()}_Export.pdf`);
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return { init };
})();
