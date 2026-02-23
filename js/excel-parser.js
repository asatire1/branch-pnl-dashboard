/**
 * Excel Parser - Parses quarterly P&L Excel files using SheetJS
 *
 * Dynamically detects file layout:
 *   - Finds the "Quarter Ending" row, then location names are the row above it
 *   - Scans column A for all financial line items through "Net Income (Loss)"
 *   - Handles varying row counts across different quarterly files
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

  /**
   * Find the row containing "Quarter Ending" in column B.
   * Location names are in the row directly above.
   */
  function findLocationRow(sheet, range) {
    for (let row = 0; row <= Math.min(range.e.r, 20); row++) {
      const val = cellValue(sheet, row, 1); // column B
      if (val && typeof val === 'string' && val.trim().toLowerCase() === 'quarter ending') {
        console.log(`[Parser] Found "Quarter Ending" at row ${row + 1}. Location names at row ${row}.`);
        return row - 1; // location names are one row above
      }
    }
    return -1;
  }

  function parse(data) {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);

    console.log(`[Parser] Sheet: "${sheetName}", Range: ${sheet['!ref']}, Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);

    // --- Step 1: Find location names row dynamically ---
    const locationRowIdx = findLocationRow(sheet, range);
    if (locationRowIdx < 0) {
      throw new Error('Could not find "Quarter Ending" row. Check file format.');
    }

    // Extract location names from that row, columns B onward
    const locations = [];
    for (let col = 1; col <= range.e.c; col++) {
      const name = cellValue(sheet, locationRowIdx, col);
      if (name && typeof name === 'string' && name.trim() && name.trim() !== ' ') {
        locations.push({ col, name: name.trim() });
      }
    }

    if (locations.length === 0) {
      throw new Error('No location names found. Check file format.');
    }
    console.log(`[Parser] Found ${locations.length} location columns.`);

    // --- Step 2: Find all line item rows in column A ---
    // Scan from after the header rows down to the end of the sheet
    const scanStart = locationRowIdx + 3; // skip location row, "Quarter Ending" row, date row
    const lineItems = [];
    let netIncomeRowIdx = -1;

    for (let row = scanStart; row <= range.e.r; row++) {
      const raw = cellValue(sheet, row, 0);
      if (raw === null || raw === undefined) continue;
      const label = String(raw);
      if (!label.trim()) continue;

      const trimmed = label.trim();

      // Skip metadata/footer rows
      if (trimmed.toLowerCase().startsWith('created on')) continue;

      const indent = label.length - label.trimStart().length;
      const key = normalizeKey(trimmed);
      if (!key) continue;

      // Check for "Total" prefix rows that are section subtotals
      const isTotal = trimmed.toLowerCase().startsWith('total ');

      lineItems.push({
        row,
        label: trimmed,
        key,
        indent,
        isTotal
      });

      // Detect Net Income row (the final bottom-line figure)
      const lower = trimmed.toLowerCase();
      if (lower === 'net income' || lower === 'net income (loss)') {
        netIncomeRowIdx = row;
      }
    }

    if (lineItems.length === 0) {
      throw new Error('No financial line items found. Check file format.');
    }
    console.log(`[Parser] Found ${lineItems.length} line items. Net Income at row ${netIncomeRowIdx + 1}.`);

    // --- Step 3: Build branch data ---
    const companyMap = (typeof AppState !== 'undefined') ? AppState.companyMap : {};
    const branchIds = (typeof AppState !== 'undefined') ? AppState.branchIds : {};
    const branches = [];

    for (const loc of locations) {
      const branchName = loc.name;
      const items = {};

      for (const li of lineItems) {
        const val = cellValue(sheet, li.row, loc.col);
        items[li.key] = (typeof val === 'number') ? val : null;
      }

      // Get net income
      let netIncome = null;
      if (netIncomeRowIdx >= 0) {
        const val = cellValue(sheet, netIncomeRowIdx, loc.col);
        netIncome = (typeof val === 'number') ? val : null;
      } else {
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

    console.log(`[Parser] Built ${branches.length} branches. Sample:`, branches[0]?.branchName, 'Net Income:', branches[0]?.netIncome);

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
