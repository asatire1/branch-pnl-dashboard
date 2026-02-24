/**
 * Groups - Named groups of companies/branches for filtering
 */
const Groups = (() => {
  let editingGroupId = null;
  let selectedBranches = new Set();

  function init() {
    document.getElementById('manageGroupsBtn').addEventListener('click', openModal);
    document.getElementById('groupsModalClose').addEventListener('click', closeModal);
    document.getElementById('groupsModalDoneBtn').addEventListener('click', closeModal);
    document.getElementById('addGroupBtn').addEventListener('click', () => startEdit(null));
    document.getElementById('groupEditorCancel').addEventListener('click', cancelEdit);
    document.getElementById('groupEditorSave').addEventListener('click', saveCurrentGroup);

    // Close on overlay click
    document.getElementById('groupsModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('groupsModal')) closeModal();
    });

    // Branch search filter
    document.getElementById('groupBranchSearch').addEventListener('input', renderBranchCheckboxes);
  }

  function openModal() {
    renderGroupsList();
    cancelEdit();
    document.getElementById('groupsModal').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('groupsModal').style.display = 'none';
    cancelEdit();
    Dashboard.updateGroupFilter();
  }

  function renderGroupsList() {
    const list = document.getElementById('groupsList');
    const groups = AppState.groups;

    if (groups.length === 0) {
      list.innerHTML = '<p style="color:#888;font-size:13px">No groups created yet.</p>';
      return;
    }

    list.innerHTML = groups.map(g => {
      const memberCount = (g.companies || []).length + (g.branches || []).length;
      return `
        <div class="group-item">
          <div class="group-item-left">
            <span class="group-color-dot" style="background:${g.color || '#2563eb'}"></span>
            <span class="group-item-name">${escapeHtml(g.name)}</span>
            <span class="group-item-count">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="group-item-actions">
            <button class="btn btn-sm" onclick="Groups.startEdit('${g.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="Groups.deleteGroupConfirm('${g.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function populateEditorSelects() {
    const companies = getAvailableCompanies();
    const compSel = document.getElementById('groupCompanies');
    compSel.innerHTML = companies.map(c =>
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join('');
  }

  function renderBranchCheckboxes() {
    const branches = getAvailableBranches();
    const search = document.getElementById('groupBranchSearch').value.toLowerCase();
    const listEl = document.getElementById('groupBranchList');

    // Sort: selected first, then alphabetical
    const sorted = [...branches].sort((a, b) => {
      const aSelected = selectedBranches.has(a);
      const bSelected = selectedBranches.has(b);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.localeCompare(b);
    });

    const filtered = sorted.filter(b => !search || b.toLowerCase().includes(search));

    listEl.innerHTML = filtered.map(b => {
      const checked = selectedBranches.has(b) ? 'checked' : '';
      const id = 'gb_' + b.replace(/[^a-zA-Z0-9]/g, '_');
      return `
        <div class="group-branch-item">
          <input type="checkbox" id="${id}" value="${escapeHtml(b)}" ${checked}>
          <label for="${id}">${escapeHtml(b)}</label>
        </div>
      `;
    }).join('');

    if (filtered.length === 0) {
      listEl.innerHTML = '<p style="color:#888;font-size:12px;padding:8px">No branches match.</p>';
    }

    // Wire up checkbox events
    listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedBranches.add(e.target.value);
        } else {
          selectedBranches.delete(e.target.value);
        }
        updateBranchCount();
      });
    });

    updateBranchCount();
  }

  function updateBranchCount() {
    document.getElementById('groupBranchCount').textContent = selectedBranches.size;
  }

  function getAvailableCompanies() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.branches) return [];
    return [...new Set(AppState.currentQuarter.branches.map(b => b.company))].sort();
  }

  function getAvailableBranches() {
    if (!AppState.currentQuarter || !AppState.currentQuarter.branches) return [];
    return [...new Set(AppState.currentQuarter.branches.map(b => b.branchName))].sort();
  }

  function startEdit(groupId) {
    editingGroupId = groupId;
    const editor = document.getElementById('groupEditor');
    editor.style.display = 'block';
    populateEditorSelects();

    if (groupId) {
      const group = AppState.groups.find(g => g.id === groupId);
      if (!group) return;
      document.getElementById('groupEditorTitle').textContent = 'Edit Group';
      document.getElementById('groupName').value = group.name;
      document.getElementById('groupColor').value = group.color || '#2563eb';

      // Select companies
      const compSel = document.getElementById('groupCompanies');
      Array.from(compSel.options).forEach(opt => {
        opt.selected = (group.companies || []).includes(opt.value);
      });

      // Set selected branches
      selectedBranches = new Set(group.branches || []);
    } else {
      document.getElementById('groupEditorTitle').textContent = 'New Group';
      document.getElementById('groupName').value = '';
      document.getElementById('groupColor').value = '#2563eb';
      document.getElementById('groupCompanies').selectedIndex = -1;
      selectedBranches = new Set();
    }

    document.getElementById('groupBranchSearch').value = '';
    renderBranchCheckboxes();
  }

  function cancelEdit() {
    editingGroupId = null;
    selectedBranches = new Set();
    document.getElementById('groupEditor').style.display = 'none';
  }

  async function saveCurrentGroup() {
    const name = document.getElementById('groupName').value.trim();
    if (!name) {
      alert('Please enter a group name.');
      return;
    }

    const color = document.getElementById('groupColor').value;
    const companies = Array.from(document.getElementById('groupCompanies').selectedOptions).map(o => o.value);
    const branches = [...selectedBranches];

    const group = {
      id: editingGroupId,
      name,
      color,
      companies,
      branches
    };

    try {
      const savedId = await DataStore.saveGroup(group);
      if (!editingGroupId) {
        group.id = savedId;
      }

      // Update local state
      if (editingGroupId) {
        const idx = AppState.groups.findIndex(g => g.id === editingGroupId);
        if (idx >= 0) AppState.groups[idx] = { ...AppState.groups[idx], ...group };
      } else {
        AppState.groups.push(group);
      }

      cancelEdit();
      renderGroupsList();
    } catch (err) {
      console.error('Error saving group:', err);
      alert('Error saving group. Check console.');
    }
  }

  async function deleteGroupConfirm(groupId) {
    if (!confirm('Delete this group?')) return;
    try {
      await DataStore.deleteGroup(groupId);
      AppState.groups = AppState.groups.filter(g => g.id !== groupId);
      renderGroupsList();
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  }

  function getBranchesInGroup(groupId) {
    const group = AppState.groups.find(g => g.id === groupId);
    if (!group) return new Set();

    const branchNames = new Set(group.branches || []);

    // Add all branches belonging to selected companies
    if (AppState.currentQuarter && AppState.currentQuarter.branches) {
      for (const b of AppState.currentQuarter.branches) {
        if ((group.companies || []).includes(b.company)) {
          branchNames.add(b.branchName);
        }
      }
    }

    return branchNames;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    openModal,
    closeModal,
    startEdit,
    cancelEdit,
    deleteGroupConfirm,
    getBranchesInGroup,
    getAvailableCompanies,
    getAvailableBranches
  };
})();
