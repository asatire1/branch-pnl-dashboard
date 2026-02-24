/**
 * App - Orchestrator, global state, upload flow, column picker
 */

// ===== GLOBAL STATE =====
const AppState = {
  currentQuarterId: null,
  currentQuarter: null,     // { label, branches[], lineItemLabels[], lineItemKeys[], lineItemMeta[] }
  quarters: [],             // [{ id, label, uploadedAt }]
  branchStates: {},         // { branchName: { notes, archived, exportCol } }
  groups: [],               // [{ id, name, companies[], branches[], color }]
  visibleColumns: null,     // string[] of line item keys, null = default
  companyMap: {},            // { branchName: companyName }
  branchIds: {}             // { branchName: idString }
};

// ===== PRE-POPULATED COMPANY MAP & BRANCH IDS =====
// Extracted from the original 110-branch hardcoded dashboard
const DEFAULT_COMPANY_MAP = {
  "Port Talbot": "Sharief Healthcare Limited",
  "St Blazey (Sharief)": "Sharief Healthcare Limited",
  "Cainscross Pharmacy": "Sharief Healthcare Limited",
  "Waterfront (Sharief)": "Sharief Healthcare Limited",
  "North Park": "Sharief Healthcare Limited",
  "Trentham Road Pharmacy": "Sharief Healthcare Limited",
  "Borsdane Avenue": "Sharief Healthcare Limited",
  "Fairfield": "Sharief Healthcare Limited",
  "Old Swan": "Sharief Healthcare Limited",
  "Supercompany (Sharief)": "Sharief Healthcare Limited",
  "Ormesby Pharmacy": "Sharief Healthcare Limited",
  "Ystrad Mynach": "Sharief Healthcare Limited",
  "zIpharm Ho Pharmacy": "Sharief Healthcare Limited",
  "Huyton": "Sharief Healthcare Limited",
  "Elmer Road": "Sharief Healthcare Limited",
  "Upton Rocks": "Sharief Healthcare Limited",
  "Acklam Road Pharmacy": "Sharief Healthcare Limited",
  "Ebbw Vale": "Sharief Healthcare Limited",
  "Cholsey Pharmacy": "Cholsey Healthcare Limited",
  "Earlham West": "Sharief Healthcare Limited",
  "Newtown": "Sharief Healthcare Limited",
  "Callington": "Sharief Healthcare Limited",
  "Higgins Pharmacy": "Sharief Healthcare Limited",
  "Whitby": "Sharief Healthcare 2 Limited",
  "Torrington": "Sharief Healthcare Limited",
  "Thornton Medical Centre (Fleetwood Rd)": "LP SD Forty Six Limited",
  "Perranporth": "Sharief Healthcare Limited",
  "Bloomfield Road": "Bloomfield Road Healthcare Limited",
  "Merthyr Road": "Sharief Healthcare Limited",
  "Morrison Road": "Sharief Healthcare Limited",
  "Allied Pharmacy Fleetwood Road North": "Sharief Healthcare Limited",
  "Par Pharmacy": "Sharief Healthcare Limited",
  "Marsh Street": "Sharief Healthcare Limited",
  "Caerphilly": "Sharief Healthcare Limited",
  "West Derby Road Pharmacy Green Lane": "Sharief Healthcare Limited",
  "Balls Road": "Sharief Healthcare Limited",
  "Fratton Road": "Sharief Healthcare Limited",
  "Chain Lane": "Sharief Healthcare Limited",
  "Sandy Lane": "Sharief Healthcare Limited",
  "Ynysybwl": "Sharief Healthcare Limited",
  "z.Knowsley Road Pharmacy": "Sharief Healthcare Limited",
  "Frome": "LP SD Seventy Two Limited",
  "Penzance": "Sharief Healthcare Limited",
  "Loftus": "Sharief Healthcare Limited",
  "Teanlowe Centre": "LP SD Forty Six Limited",
  "Holton Road (Barry)": "Barry Pharma Limited",
  "Highbridge": "Sharief Healthcare Limited",
  "Abergele": "Sharief Healthcare Limited",
  "Thornton Victoria Road": "LP SD Forty Six Limited",
  "Mountain Ash": "Sharief Healthcare Limited",
  "RHIWBINA": "Sharief Healthcare Limited",
  "Durrington": "Sharief Healthcare Limited",
  "Union Square": "Sharief Healthcare Limited",
  "Park South": "Sharief Healthcare 2 Limited",
  "Pikes Lane Pharmacy": "Sharief Healthcare Limited",
  "Yarm Lane": "Sharief Healthcare Limited",
  "Chapel Lane": "Sharief Healthcare Limited",
  "Crossways": "Sharief Healthcare 2 Limited",
  "Shepway": "Sharief Healthcare 2 Limited",
  "Alsager Pharmacy": "Sharief Healthcare Limited",
  "Langley Close": "LP SD Forty Six Limited",
  "ZKingscote Drive": "Layton Healthcare Limited",
  "ZLeamington Spa": "Sharief Healthcare 2 Limited",
  "Elm Park": "Sharief Healthcare 2 Limited",
  "Westward Road": "Sharief Healthcare Limited",
  "Bentalls Centre": "Sharief Healthcare 2 Limited",
  "Allied Pharmacy Thornton": "Sharief Healthcare Limited",
  "Birchgrove": "Sharief Healthcare Limited",
  "z.Waterfront": "Barry Pharma Limited",
  "Whitmore Way": "Sharief Healthcare 2 Limited",
  "Tuebrook Pharmacy": "Sharief Healthcare Limited",
  "Pilch Lane (LPSD 46)": "LP SD Forty Six Limited",
  "Prestatyn": "Sharief Healthcare Limited",
  "North Cornelly": "Sharief Healthcare Limited",
  "Dalton": "Sharief Healthcare Limited",
  "Holton Road (Sharief)": "Sharief Healthcare Limited",
  "Davyhulme Medical Centre": "LP SD Forty Six Limited",
  "Moore Street (was Knowsley Road)": "Sharief Healthcare Limited",
  "Buckly (Alltami Road)": "LP SD Forty Two Limited",
  "St Johns Road": "Sharief Healthcare 2 Limited",
  "Worthing": "Sharief Healthcare Limited",
  "Melton Mowbray": "Sharief Healthcare 2 Limited",
  "Tennant Street": "Tennant Healthcare",
  "Pontardulais": "Sharief Healthcare Limited",
  "Clacton": "Sharief Healthcare 2 Limited",
  "Varo Terrace": "Sharief Healthcare Limited",
  "Ashburton": "Sharief Healthcare Limited",
  "Kippax": "Sharief Healthcare Limited",
  "Millstream Pharmacy": "Millstream Pharma Limited",
  "Cop Lane": "Cop Lane Healthcare Ltd",
  "Whitegate Drive": "Layton Healthcare Limited",
  "Crookhorn Lane": "Portsdown Group Healthcare Limited",
  "Common Edge": "Common Edge Healthcare Limited",
  "Ferndown": "Ferndown Healthcare Limited",
  "Charles Street": "Layton Healthcare Limited",
  "Lavender Road": "Portsdown Group Healthcare Limited",
  "Buckfastleigh": "Sharief Healthcare Limited",
  "Norwood Avenue": "Norwood Healthcare Limited",
  "Bromborough Pharmacy": "Bromborough Healthcare Limited",
  "Stonepit Lane (SHC)": "Sharief Healthcare Limited",
  "Ribbleton": "Ribbleton Healthcare Limited",
  "Management (Sharief Healthcare)": "Sharief Healthcare Limited",
  "Allied Pharmacy Knowsley Road": "Sharief Healthcare Limited",
  "Waterloo Road": "Common Edge Healthcare Limited",
  "Layton Pharmacy": "Layton Healthcare Limited",
  "Kirkham": "Kirkham Pharma Limited",
  "Tintagel": "Sharief Healthcare Limited",
  "iPharm Pharmacy": "Sharief Healthcare Limited",
  "Field Team": "Sharief Healthcare Limited",
  "Ipharm Stock Warehouse": "Sharief Healthcare Limited",
  "Fazakerley": "Sharief Healthcare Limited",
  "Heavitree": "Sharief Healthcare Limited",
  "Liphook": "Sharief Healthcare Limited",
  "New Romney": "Sharief Healthcare Limited",
  "Pontycymmer": "Sharief Healthcare Limited",
  "Rhyl": "Sharief Healthcare Limited",
  "Stevenage": "Sharief Healthcare Limited"
};

const DEFAULT_BRANCH_IDS = {
  "Port Talbot": "176",
  "St Blazey (Sharief)": "20002",
  "Cainscross Pharmacy": "14",
  "Waterfront (Sharief)": "94",
  "Trentham Road Pharmacy": "40",
  "Borsdane Avenue": "13",
  "Fairfield": "18",
  "Old Swan": "90",
  "Ormesby Pharmacy": "6",
  "Ystrad Mynach": "84",
  "Huyton": "140",
  "Elmer Road": "79",
  "Upton Rocks": "8",
  "Acklam Road Pharmacy": "2",
  "Ebbw Vale": "86",
  "Cholsey Pharmacy": "20003",
  "Earlham West": "71",
  "Newtown": "88",
  "Callington": "69",
  "Whitby": "20011",
  "Torrington": "70",
  "Perranporth": "20025",
  "Bloomfield Road": "20049",
  "Merthyr Road": "92",
  "Morrison Road": "177",
  "Allied Pharmacy Fleetwood Road North": "146",
  "Par Pharmacy": "20027",
  "Marsh Street": "179",
  "Caerphilly": "83",
  "West Derby Road Pharmacy Green Lane": "4",
  "Balls Road": "178",
  "Fratton Road": "20062",
  "Chain Lane": "16",
  "Sandy Lane": "20061",
  "Ynysybwl": "91",
  "z.Knowsley Road Pharmacy": "56",
  "Frome": "206",
  "Penzance": "20024",
  "Loftus": "66",
  "Teanlowe Centre": "147",
  "Holton Road (Barry)": "116",
  "Highbridge": "55",
  "Abergele": "81",
  "Mountain Ash": "85",
  "RHIWBINA": "115",
  "Durrington": "74",
  "Union Square": "20028",
  "Park South": "170",
  "Pikes Lane Pharmacy": "33",
  "Chapel Lane": "139",
  "Shepway": "167",
  "Alsager Pharmacy": "9",
  "Birchgrove": "182",
  "Tuebrook Pharmacy": "41",
  "Pilch Lane (LPSD 46)": "149",
  "North Cornelly": "87",
  "Dalton": "80",
  "Holton Road (Sharief)": "116",
  "Davyhulme Medical Centre": "148",
  "Moore Street (was Knowsley Road)": "20022",
  "Melton Mowbray": "153",
  "Tennant Street": "20046",
  "Varo Terrace": "20023",
  "Kippax": "20021",
  "Millstream Pharmacy": "20018",
  "Cop Lane": "213",
  "Whitegate Drive": "20033",
  "Norwood Avenue": "20039",
  "Bromborough Pharmacy": "20057",
  "Ribbleton": "20042",
  "Allied Pharmacy Knowsley Road": "56",
  "Waterloo Road": "20040",
  "Layton Pharmacy": "20045",
  "Kirkham": "20048",
  "Tintagel": "20035",
  "iPharm Pharmacy": "25",
  "Allied Pharmacy Thornton": "145",
  "Ferndown": "20053",
  "Charles Street": "20034"
};

const DEFAULT_GROUPS = [
  {
    name: "Sharief HC",
    color: "#2563eb",
    companies: [],
    branches: [
      "Abergele",
      "Acklam Road Pharmacy",
      "Alsager Pharmacy",
      "Balls Road",
      "Birchgrove",
      "Bloomfield Road",
      "Borsdane Avenue",
      "Bromborough Pharmacy",
      "Buckly (Alltami Road)",
      "Caerphilly",
      "Cainscross Pharmacy",
      "Callington",
      "Chain Lane",
      "Chapel Lane",
      "Charles Street",
      "Cholsey Pharmacy",
      "Cop Lane",
      "Higgins Pharmacy",
      "Dalton",
      "Davyhulme Medical Centre",
      "Durrington",
      "Earlham West",
      "Ebbw Vale",
      "Elmer Road",
      "Fairfield",
      "Fazakerley",
      "Ferndown",
      "Allied Pharmacy Fleetwood Road North",
      "Frome",
      "West Derby Road Pharmacy Green Lane",
      "ZFore Street - Heavitree",
      "ZHeavitree Health Centre",
      "Highbridge",
      "Holton Road (Sharief)",
      "Holton Road (Barry)",
      "Huyton",
      "Kirkham",
      "Allied Pharmacy Knowsley Road",
      "Layton Pharmacy",
      "Liphook",
      "Loftus",
      "Marsh Street",
      "Merthyr Road",
      "Millstream Pharmacy",
      "Moore Street (was Knowsley Road)",
      "Morrison Road",
      "Mountain Ash",
      "New Romney",
      "Newtown",
      "North Cornelly",
      "Norwood Avenue",
      "Old Swan",
      "Ormesby Pharmacy",
      "Par Pharmacy",
      "Park South",
      "Penzance",
      "Perranporth",
      "Pikes Lane Pharmacy",
      "Pontycymmer",
      "Port Talbot",
      "RHIWBINA",
      "Rhyl",
      "Ribbleton",
      "Sandy Lane",
      "Shepway",
      "St Blazey (Sharief)",
      "Stevenage Pharmacy",
      "Teanlowe Centre",
      "Tennant Street",
      "Allied Pharmacy Thornton",
      "Thornton Medical Centre (Fleetwood Rd)",
      "Thornton Victoria Road",
      "Torrington",
      "Trentham Road Pharmacy",
      "Tuebrook Pharmacy",
      "Union Square",
      "Upton Rocks",
      "Varo Terrace",
      "Waterfront (Sharief)",
      "Waterloo Road",
      "Whitby",
      "Whitegate Drive",
      "Yarm Lane",
      "Ynysybwl",
      "Ystrad Mynach"
    ]
  },
  {
    name: "Oakfield",
    color: "#16a34a",
    companies: [],
    branches: [
      "Seven Hills Pharmacy",
      "Woodhouse/Market Square",
      "Blackthorn Pharmacy",
      "Upwell Street Pharmacy",
      "Parson Cross Pharmacy",
      "Newgate Street Pharmacy (Oakfield)",
      "Celtic Point",
      "Gleadless Road Pharmacy",
      "Burngreave Road Pharmacy",
      "Queensway Pharmacy",
      "Skelton Lane Pharmacy",
      "Aberrhondda Road",
      "Hannah Street",
      "Llanrumney",
      "Bridge Street",
      "Llandysul",
      "Aberaeron",
      "67 Sway Road",
      "50 Sway Road",
      "Firth Park Road Pharmacy",
      "Ellesmere Road",
      "Handsworth Road Pharmacy",
      "Scotter Road Pharmacy",
      "Stocksbridge",
      "Church Street Pharmacy (Oakfield)",
      "Goole",
      "Kenfig Hill Pharmacy",
      "Canton - Landsdowne Health Centre",
      "Aston (Oakfield)",
      "Allied Pharmacy Aberystwyth",
      "Allied Pharmacy Strawberry Place",
      "Allied Pharmacy Fairwater",
      "Allied Pharmacy Riversdale",
      "Allied Pharmacy Padarn (Qam) (Wales)",
      "Allied Pharmacy Riversdale (Qam) (Wales)",
      "Allied Pharmacy Strawberry Place (Qam) (Wales)",
      "Allied Pharmacy Fairwater (Qam) (Wales)"
    ]
  }
];

// ===== APP MODULE =====
const App = (() => {

  async function init() {
    // Load config from Firestore (company map, branch IDs, column visibility)
    const [companyMap, branchIds, colVis, quarters, groups] = await Promise.all([
      DataStore.loadCompanyMap(),
      DataStore.loadBranchIds(),
      DataStore.loadColumnVisibility(),
      DataStore.listQuarters(),
      DataStore.loadGroups()
    ]);

    // Merge defaults with Firestore overrides (Firestore values take precedence)
    AppState.companyMap = { ...DEFAULT_COMPANY_MAP, ...companyMap };
    AppState.branchIds = { ...DEFAULT_BRANCH_IDS, ...branchIds };
    AppState.visibleColumns = colVis;
    AppState.quarters = quarters;
    AppState.groups = groups;

    // Ensure default groups exist and have correct branches
    for (const dg of DEFAULT_GROUPS) {
      const existing = AppState.groups.find(g => g.name === dg.name);
      if (existing) {
        // Update existing group's branches to match defaults
        existing.branches = dg.branches;
        existing.companies = dg.companies || [];
        await DataStore.saveGroup(existing);
      } else {
        const savedId = await DataStore.saveGroup({ ...dg });
        AppState.groups.push({ ...dg, id: savedId });
      }
    }

    // Merge defaults into Firestore (ensures new entries are added)
    const mergedCompanyMap = { ...DEFAULT_COMPANY_MAP, ...companyMap };
    if (Object.keys(mergedCompanyMap).length > Object.keys(companyMap).length) {
      AppState.companyMap = mergedCompanyMap;
      DataStore.saveCompanyMap(mergedCompanyMap);
    }
    const mergedBranchIds = { ...DEFAULT_BRANCH_IDS, ...branchIds };
    if (Object.keys(mergedBranchIds).length > Object.keys(branchIds).length) {
      AppState.branchIds = mergedBranchIds;
      DataStore.saveBranchIds(mergedBranchIds);
    }

    // Init all modules
    Dashboard.init();
    Groups.init();
    Export.init();
    initUploadModal();
    initColumnPicker();
    initBulkArchive();
    initQuarterPicker();

    // Load most recent quarter if available
    if (AppState.quarters.length > 0) {
      await switchQuarter(AppState.quarters[0].id);
    } else {
      Dashboard.render();
    }
  }

  // ===== QUARTER PICKER =====
  function initQuarterPicker() {
    const picker = document.getElementById('quarterPicker');
    updateQuarterPicker();
    picker.addEventListener('change', async (e) => {
      if (e.target.value) {
        await switchQuarter(e.target.value);
      }
    });
  }

  function updateQuarterPicker() {
    const picker = document.getElementById('quarterPicker');
    picker.innerHTML = '';

    if (AppState.quarters.length === 0) {
      picker.innerHTML = '<option value="">No quarters uploaded</option>';
      return;
    }

    AppState.quarters.forEach(q => {
      const o = document.createElement('option');
      o.value = q.id;
      o.textContent = q.label || q.id;
      if (q.id === AppState.currentQuarterId) o.selected = true;
      picker.appendChild(o);
    });
  }

  async function switchQuarter(quarterId) {
    AppState.currentQuarterId = quarterId;

    // Load quarter data and branch states
    const [quarterData, branchStates] = await Promise.all([
      DataStore.loadQuarter(quarterId),
      DataStore.loadBranchStates(quarterId)
    ]);

    if (!quarterData) {
      console.error('Quarter not found:', quarterId);
      return;
    }

    AppState.currentQuarter = quarterData;
    AppState.branchStates = branchStates;

    updateQuarterPicker();
    Dashboard.updateFilters();
    Dashboard.render();
  }

  // ===== BULK ARCHIVE =====
  function initBulkArchive() {
    document.getElementById('bulkArchiveBtn').addEventListener('click', openBulkArchive);
    document.getElementById('bulkArchiveClose').addEventListener('click', closeBulkArchive);
    document.getElementById('bulkArchiveCancelBtn').addEventListener('click', closeBulkArchive);
    document.getElementById('bulkArchiveConfirmBtn').addEventListener('click', confirmBulkArchive);
    document.getElementById('bulkArchiveSelectUnknown').addEventListener('click', selectUnknownCompanies);
    document.getElementById('bulkArchiveSelectNone').addEventListener('click', deselectAllBulk);

    document.getElementById('bulkArchiveModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('bulkArchiveModal')) closeBulkArchive();
    });
  }

  function openBulkArchive() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.branches) return;
    renderBulkArchiveList();
    document.getElementById('bulkArchiveModal').style.display = 'flex';
  }

  function closeBulkArchive() {
    document.getElementById('bulkArchiveModal').style.display = 'none';
  }

  function renderBulkArchiveList() {
    const branches = AppState.currentQuarter.branches;
    // Group by company
    const byCompany = {};
    for (const b of branches) {
      const co = b.company || 'Unknown';
      if (!byCompany[co]) byCompany[co] = [];
      byCompany[co].push(b);
    }

    const companies = Object.keys(byCompany).sort();
    const list = document.getElementById('bulkArchiveList');

    list.innerHTML = companies.map(co => {
      const coBranches = byCompany[co];
      const coId = co.replace(/[^a-zA-Z0-9]/g, '_');
      return `
        <div class="bulk-archive-company">
          <div class="bulk-archive-company-header">
            <input type="checkbox" id="ba_co_${coId}" data-company="${escapeAttr(co)}" class="ba-company-cb">
            <label for="ba_co_${coId}">${escapeHtml(co)}</label>
            <span class="count">(${coBranches.length} branches)</span>
          </div>
          <div class="bulk-archive-branches">
            ${coBranches.map(b => {
              const bId = b.branchName.replace(/[^a-zA-Z0-9]/g, '_');
              const isArchived = (AppState.branchStates[b.branchName] || {}).archived;
              return `
                <div class="bulk-archive-branch${isArchived ? ' already-archived' : ''}">
                  <input type="checkbox" id="ba_br_${bId}" data-branch="${escapeAttr(b.branchName)}" class="ba-branch-cb" data-company="${escapeAttr(co)}" ${isArchived ? 'checked disabled' : ''}>
                  <label for="ba_br_${bId}">${escapeHtml(b.branchName)}${isArchived ? ' (archived)' : ''}</label>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Wire up company checkboxes to toggle their branches
    list.querySelectorAll('.ba-company-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const company = e.target.dataset.company;
        const checked = e.target.checked;
        list.querySelectorAll(`.ba-branch-cb[data-company="${CSS.escape(company)}"]:not(:disabled)`).forEach(brCb => {
          brCb.checked = checked;
        });
        updateBulkSummary();
      });
    });

    list.querySelectorAll('.ba-branch-cb').forEach(cb => {
      cb.addEventListener('change', updateBulkSummary);
    });

    updateBulkSummary();
  }

  function updateBulkSummary() {
    const checked = document.querySelectorAll('#bulkArchiveList .ba-branch-cb:checked:not(:disabled)');
    const count = checked.length;
    document.getElementById('bulkArchiveSummary').textContent =
      count > 0 ? `${count} branch${count !== 1 ? 'es' : ''} selected for archiving` : 'Select branches to archive';
  }

  function selectUnknownCompanies() {
    const list = document.getElementById('bulkArchiveList');
    // Check the "Unknown" company checkbox
    list.querySelectorAll('.ba-company-cb').forEach(cb => {
      if (cb.dataset.company === 'Unknown') {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      }
    });
  }

  function deselectAllBulk() {
    document.querySelectorAll('#bulkArchiveList .ba-company-cb').forEach(cb => {
      cb.checked = false;
    });
    document.querySelectorAll('#bulkArchiveList .ba-branch-cb:not(:disabled)').forEach(cb => {
      cb.checked = false;
    });
    updateBulkSummary();
  }

  async function confirmBulkArchive() {
    const toArchive = [];
    document.querySelectorAll('#bulkArchiveList .ba-branch-cb:checked:not(:disabled)').forEach(cb => {
      toArchive.push(cb.dataset.branch);
    });

    if (toArchive.length === 0) {
      alert('No branches selected.');
      return;
    }

    if (!confirm(`Archive ${toArchive.length} branch${toArchive.length !== 1 ? 'es' : ''}?`)) return;

    const btn = document.getElementById('bulkArchiveConfirmBtn');
    btn.disabled = true;
    btn.textContent = `Archiving ${toArchive.length}...`;

    // Archive in batches
    for (const branchName of toArchive) {
      if (!AppState.branchStates[branchName]) AppState.branchStates[branchName] = {};
      AppState.branchStates[branchName].archived = true;
      if (AppState.currentQuarterId) {
        await DataStore.saveBranchState(AppState.currentQuarterId, branchName, AppState.branchStates[branchName]);
      }
    }

    btn.disabled = false;
    btn.textContent = 'Archive Selected';
    closeBulkArchive();
    Dashboard.render();
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  // ===== UPLOAD MODAL =====
  function initUploadModal() {
    document.getElementById('uploadQuarterBtn').addEventListener('click', openUploadModal);
    document.getElementById('uploadModalClose').addEventListener('click', closeUploadModal);
    document.getElementById('uploadCancelBtn').addEventListener('click', closeUploadModal);
    document.getElementById('uploadConfirmBtn').addEventListener('click', handleUpload);

    document.getElementById('uploadModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('uploadModal')) closeUploadModal();
    });
  }

  function openUploadModal() {
    document.getElementById('uploadFile').value = '';
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('uploadStatus').className = 'upload-status';
    document.getElementById('uploadModal').style.display = 'flex';
  }

  function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
  }

  async function handleUpload() {
    const year = document.getElementById('uploadYear').value;
    const quarter = document.getElementById('uploadQuarter').value;
    const fileInput = document.getElementById('uploadFile');
    const statusEl = document.getElementById('uploadStatus');

    if (!fileInput.files || fileInput.files.length === 0) {
      statusEl.textContent = 'Please select an Excel file.';
      statusEl.className = 'upload-status error';
      return;
    }

    const file = fileInput.files[0];
    if (!file.name.match(/\.xlsx?$/i)) {
      statusEl.textContent = 'Please select an .xlsx or .xls file.';
      statusEl.className = 'upload-status error';
      return;
    }

    const quarterId = `${year}-${quarter}`;
    const label = `${quarter} ${year}`;

    statusEl.textContent = 'Parsing Excel file...';
    statusEl.className = 'upload-status loading';

    try {
      const data = await file.arrayBuffer();
      const parsed = ExcelParser.parse(new Uint8Array(data));

      statusEl.textContent = `Parsed ${parsed.locationCount} branches. Saving to Firestore...`;

      // Save to Firestore
      await DataStore.saveQuarter(quarterId, {
        label,
        dateRange: `${quarter} ${year}`,
        lineItemLabels: parsed.lineItemLabels,
        lineItemKeys: parsed.lineItemKeys,
        lineItemMeta: parsed.lineItemMeta,
        branches: parsed.branches
      });

      // Update local state
      const existing = AppState.quarters.findIndex(q => q.id === quarterId);
      if (existing >= 0) {
        AppState.quarters[existing].label = label;
      } else {
        AppState.quarters.unshift({ id: quarterId, label });
      }

      statusEl.textContent = `Success! ${parsed.locationCount} branches uploaded for ${label}.`;
      statusEl.className = 'upload-status success';

      // Switch to newly uploaded quarter
      await switchQuarter(quarterId);

      // Close modal after a brief pause
      setTimeout(closeUploadModal, 1000);

    } catch (err) {
      console.error('Upload error:', err);
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'upload-status error';
    }
  }

  // ===== COLUMN PICKER =====
  function initColumnPicker() {
    document.getElementById('columnPickerBtn').addEventListener('click', openColumnPicker);
    document.getElementById('columnPickerClose').addEventListener('click', closeColumnPicker);
    document.getElementById('columnPickerCancelBtn').addEventListener('click', closeColumnPicker);
    document.getElementById('columnPickerSaveBtn').addEventListener('click', saveColumnPicker);
    document.getElementById('colSelectAll').addEventListener('click', () => toggleAllColumns(true));
    document.getElementById('colDeselectAll').addEventListener('click', () => toggleAllColumns(false));

    document.getElementById('columnPickerModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('columnPickerModal')) closeColumnPicker();
    });
  }

  function openColumnPicker() {
    renderColumnPickerList();
    document.getElementById('columnPickerModal').style.display = 'flex';
  }

  function closeColumnPicker() {
    document.getElementById('columnPickerModal').style.display = 'none';
  }

  function renderColumnPickerList() {
    const list = document.getElementById('columnPickerList');
    const dynamic = Dashboard.getDynamicColumns();
    const visible = new Set(AppState.visibleColumns || dynamic.map(c => c.key));

    list.innerHTML = dynamic.map(col => `
      <div class="column-picker-item${col.indent > 0 ? ' indent' : ''}">
        <input type="checkbox" id="col_${col.key}" value="${col.key}" ${visible.has(col.key) ? 'checked' : ''}>
        <label for="col_${col.key}">${col.label}</label>
      </div>
    `).join('');
  }

  function toggleAllColumns(checked) {
    document.querySelectorAll('#columnPickerList input[type="checkbox"]').forEach(cb => {
      cb.checked = checked;
    });
  }

  async function saveColumnPicker() {
    const selected = [];
    document.querySelectorAll('#columnPickerList input[type="checkbox"]:checked').forEach(cb => {
      selected.push(cb.value);
    });

    AppState.visibleColumns = selected;
    await DataStore.saveColumnVisibility(selected);
    closeColumnPicker();
    Dashboard.render();
  }

  return { init, switchQuarter, updateQuarterPicker };
})();

// ===== BOOTSTRAP =====
document.addEventListener('DOMContentLoaded', () => {
  const alreadyAuth = Auth.init();
  if (alreadyAuth) {
    App.init();
  }
});
