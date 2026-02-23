/**
 * Data Store - All Firestore CRUD operations
 */
const DataStore = (() => {

  // ===== CONFIG =====
  async function loadCompanyMap() {
    try {
      const doc = await configRef.doc('companyMap').get();
      return doc.exists ? doc.data() : {};
    } catch (err) {
      console.error('Error loading company map:', err);
      return {};
    }
  }

  async function saveCompanyMap(map) {
    await configRef.doc('companyMap').set(map);
  }

  async function loadBranchIds() {
    try {
      const doc = await configRef.doc('branchIds').get();
      return doc.exists ? doc.data() : {};
    } catch (err) {
      console.error('Error loading branch IDs:', err);
      return {};
    }
  }

  async function saveBranchIds(ids) {
    await configRef.doc('branchIds').set(ids);
  }

  async function loadColumnVisibility() {
    try {
      const doc = await configRef.doc('columnVisibility').get();
      return doc.exists ? doc.data().visibleColumns : null;
    } catch (err) {
      console.error('Error loading column visibility:', err);
      return null;
    }
  }

  async function saveColumnVisibility(columns) {
    await configRef.doc('columnVisibility').set({ visibleColumns: columns });
  }

  // ===== QUARTERS =====
  async function listQuarters() {
    try {
      const snapshot = await quartersRef.orderBy('uploadedAt', 'desc').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('Error listing quarters:', err);
      return [];
    }
  }

  async function loadQuarter(quarterId) {
    try {
      const doc = await quartersRef.doc(quarterId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.error('Error loading quarter:', err);
      return null;
    }
  }

  async function saveQuarter(quarterId, data) {
    await quartersRef.doc(quarterId).set({
      ...data,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function deleteQuarter(quarterId) {
    // Delete state subcollection docs first
    const stateSnap = await quartersRef.doc(quarterId).collection('state').get();
    const batch = db.batch();
    stateSnap.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(quartersRef.doc(quarterId));
    await batch.commit();
  }

  // ===== BRANCH STATE (notes, archived, exportCol) =====
  async function loadBranchStates(quarterId) {
    try {
      const snapshot = await quartersRef.doc(quarterId).collection('state').get();
      const states = {};
      snapshot.docs.forEach(doc => {
        states[doc.id] = doc.data();
      });
      return states;
    } catch (err) {
      console.error('Error loading branch states:', err);
      return {};
    }
  }

  async function saveBranchState(quarterId, branchName, state) {
    const docId = branchName.replace(/\//g, '_');
    await quartersRef.doc(quarterId).collection('state').doc(docId).set(state, { merge: true });
  }

  // ===== GROUPS =====
  async function loadGroups() {
    try {
      const snapshot = await groupsRef.orderBy('createdAt', 'asc').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('Error loading groups:', err);
      return [];
    }
  }

  async function saveGroup(group) {
    const { id, ...data } = group;
    if (id) {
      await groupsRef.doc(id).set(data, { merge: true });
      return id;
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await groupsRef.add(data);
      return ref.id;
    }
  }

  async function deleteGroup(groupId) {
    await groupsRef.doc(groupId).delete();
  }

  return {
    loadCompanyMap,
    saveCompanyMap,
    loadBranchIds,
    saveBranchIds,
    loadColumnVisibility,
    saveColumnVisibility,
    listQuarters,
    loadQuarter,
    saveQuarter,
    deleteQuarter,
    loadBranchStates,
    saveBranchState,
    loadGroups,
    saveGroup,
    deleteGroup
  };
})();
