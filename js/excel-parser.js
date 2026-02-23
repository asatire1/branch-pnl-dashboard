/**
 * Excel Parser - Parses quarterly P&L Excel files using SheetJS
 *
 * Expected file structure:
 *   Rows 1-6: metadata
 *   Row 7: location names in columns B onward
 *   Rows 11-42: financial line items (label in column A, values in B onward)
 */
const ExcelParser = (() => {

  function normalizeKey(label) {
    return label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }

  function cellValue(sheet, row, col) {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[addr];
    if (!cell) return null;
    if (cell.t === 'n') return cell.v;
    if (cell.t === 's') return cell.v;
    return cell.v;
  }

  function parse(data) {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);

    // Extract location names from row 7 (index 6), columns B onward (col 1+)
    const locations = [];
    for (let col = 1; col <= range.e.c; col++) {
      const name = cellValue(sheet, 6, col);
      if (name && typeof name === 'string' && name.trim()) {
        locations.push({ col, name: name.trim() });
      }
    }

    if (locations.length === 0) {
      throw new Error('No location names found in row 7. Check file format.');
    }

    // Extract line item labels from column A (rows 11-42, indices 10-41)
    // Also scan a broader range in case rows differ
    const lineItems = [];
    const startRow = 10;
    const endRow = Math.min(range.e.r, 60); // scan up to row 61

    let netIncomeRowIdx = -1;

    for (let row = startRow; row <= endRow; row++) {
      const raw = cellValue(sheet, row, 0);
      if (raw === null || raw === undefined) continue;
      const label = String(raw);
      if (!label.trim()) continue;

      const trimmed = label.trim();
      const indent = label.length - label.trimStart().length;
      const key = normalizeKey(trimmed);

      if (!key) continue;

      lineItems.push({
        row,
        label: trimmed,
        key,
        indent,
        isHeader: indent === 0
      });

      // Detect Net Income row
      if (trimmed.toLowerCase() === 'net income' || trimmed.toLowerCase() === 'net income (loss)') {
        netIncomeRowIdx = row;
      }
    }

    if (lineItems.length === 0) {
      throw new Error('No financial line items found. Check file format.');
    }

    // Build branch data
    const branches = [];
    const companyMap = AppState ? AppState.companyMap : {};
    const branchIds = AppState ? AppState.branchIds : {};

    for (const loc of locations) {
      const branchName = loc.name;
      const items = {};

      for (const li of lineItems) {
        const val = cellValue(sheet, li.row, loc.col);
        items[li.key] = (typeof val === 'number') ? val : null;
      }

      // Find net income
      let netIncome = null;
      if (netIncomeRowIdx >= 0) {
        const val = cellValue(sheet, netIncomeRowIdx, loc.col);
        netIncome = (typeof val === 'number') ? val : null;
      } else {
        // Fallback: look for net_income key
        netIncome = items['net_income'] || items['net_income_loss'] || null;
      }

      const pnl3 = netIncome !== null ? netIncome * 0.03 : null;
      const pnl5 = netIncome !== null ? netIncome * 0.05 : null;

      branches.push({
        branchName,
        company: companyMap[branchName] || 'Unknown',
        id: branchIds[branchName] || '-',
        lineItems: items,
        netIncome,
        pnl3,
        pnl5
      });
    }

    return {
      lineItemLabels: lineItems.map(li => li.label),
      lineItemKeys: lineItems.map(li => li.key),
      lineItemMeta: lineItems.map(li => ({ label: li.label, key: li.key, indent: li.indent })),
      branches,
      locationCount: locations.length
    };
  }

  return { parse, normalizeKey };
})();
