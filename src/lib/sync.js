import { dbOrders, dbExpenses, dbReconciliations, dbItems, dbCategories, dbUsers } from './db';
import useStore from '../store/useStore';

export const performSync = async () => {
  const state = useStore.getState();
  const { apiUrl, apiToken } = state.config;

  if (!apiUrl || !apiUrl.startsWith('http')) {
    throw new Error("L'URL de l'API n'est pas configurée correctement dans les paramètres.");
  }

  const stats = {
    pulled: { items: 0, users: 0, categories: 0, orders: 0, expenses: 0, reconciliations: 0, settings: 0 },
    pushed: { items: 0, users: 0, categories: 0, orders: 0, expenses: 0, reconciliations: 0, settings: 0 }
  };

  // 1. PHASE PULL: Receive updates from server
  let pullData = {};
  try {
    const pullResponse = await fetch(`${apiUrl}/sync/pull`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!pullResponse.ok) throw new Error('Erreur HTTP ' + pullResponse.status + ' lors du PULL');
    pullData = await pullResponse.json();
    
    // --- Categories ---
    if (pullData.categories && Array.isArray(pullData.categories)) {
       for (let cat of pullData.categories) {
          const local = await dbCategories.getItem(cat.id);
          if (!local || local.synced !== false) {
             await dbCategories.setItem(cat.id, { ...cat, synced: true });
             stats.pulled.categories++;
          }
       }
    }

    // --- Items ---
    if (pullData.items && Array.isArray(pullData.items)) {
       for (let item of pullData.items) {
          const local = await dbItems.getItem(item.id);
          if (!local || local.synced !== false) {
             const mappedItem = { ...item, price: Number(item.price || 0), stock: Number(item.stock || 0), synced: true };
             if (item.category_id) mappedItem.category = item.category_id;
             await dbItems.setItem(item.id, mappedItem);
             stats.pulled.items++;
          }
       }
    }

    // --- Users ---
    if (pullData.users && Array.isArray(pullData.users)) {
       for (let user of pullData.users) {
          const local = await dbUsers.getItem(user.id);
          if (!local || local.synced !== false) {
             const mappedUser = { ...user, synced: true };
             if (user.pin_code) mappedUser.pin = user.pin_code;
             await dbUsers.setItem(user.id, mappedUser);
             stats.pulled.users++;
          }
       }
    }

    // --- Orders ---
    if (pullData.orders && Array.isArray(pullData.orders)) {
       for (let order of pullData.orders) {
          const local = await dbOrders.getItem(order.id);
          // Only pull if not locally dirty
          if (!local || local.synced !== false) {
             order.total = Number(order.total || 0);
             order.tax = Number(order.tax || 0);
             if (Array.isArray(order.items)) {
                order.items = order.items.map(it => ({ ...it, price: Number(it.price || 0) }));
             }
             await dbOrders.setItem(order.id, { ...order, synced: true });
             stats.pulled.orders++;
          }
       }
    }

    // --- Expenses ---
    if (pullData.expenses && Array.isArray(pullData.expenses)) {
       for (let exp of pullData.expenses) {
          const local = await dbExpenses.getItem(exp.id);
          if (!local || local.synced !== false) {
             exp.amount = Number(exp.amount || 0);
             await dbExpenses.setItem(exp.id, { ...exp, synced: true });
             stats.pulled.expenses++;
          }
       }
    }

    // --- Reconciliations ---
    if (pullData.reconciliations && Array.isArray(pullData.reconciliations)) {
       for (let rec of pullData.reconciliations) {
          const local = await dbReconciliations.getItem(rec.id);
          if (!local || local.synced !== false) {
             rec.expectedAmount = Number(rec.expectedAmount || 0);
             rec.actualAmount = Number(rec.actualAmount || 0);
             rec.variance = Number(rec.variance || 0);
             await dbReconciliations.setItem(rec.id, { ...rec, synced: true });
             stats.pulled.reconciliations++;
          }
       }
    }

    // --- Settings ---
    if (pullData.settings && Object.keys(pullData.settings).length > 0) {
       const currentConfig = state.config;
       if (currentConfig.synced !== false) {
         state.setConfig({
            ...pullData.settings,
            apiUrl: currentConfig.apiUrl,
            apiToken: currentConfig.apiToken,
            synced: true
         });
         stats.pulled.settings++;
       }
    }
  } catch (err) {
    console.error("Sync PULL failed:", err);
    throw new Error("Impossible de recevoir les données du serveur : " + err.message);
  }

  // 2. PHASE PUSH: Send ONLY local modifications
  const ordersToPush = [];
  const expensesToPush = [];
  const recsToPush = [];
  const itemsToPush = [];
  const catsToPush = [];
  const usersToPush = [];

  const orderKeys = await dbOrders.keys();
  for (let key of orderKeys) { const o = await dbOrders.getItem(key); if (o && o.synced === false) ordersToPush.push(o); }

  const expKeys = await dbExpenses.keys();
  for (let key of expKeys) { const e = await dbExpenses.getItem(key); if (e && e.synced === false) expensesToPush.push(e); }

  const recKeys = await dbReconciliations.keys();
  for (let key of recKeys) { const r = await dbReconciliations.getItem(key); if (r && r.synced === false) recsToPush.push(r); }

  const itemKeys = await dbItems.keys();
  for (let key of itemKeys) { const i = await dbItems.getItem(key); if (i && i.synced === false) itemsToPush.push(i); }

  const catKeys = await dbCategories.keys();
  for (let key of catKeys) { const c = await dbCategories.getItem(key); if (c && c.synced === false) catsToPush.push(c); }

  const userKeys = await dbUsers.keys();
  for (let key of userKeys) { const u = await dbUsers.getItem(key); if (u && u.synced === false) usersToPush.push(u); }

  const currentConfig = useStore.getState().config;
  const settingsToPush = (currentConfig.synced === false) ? currentConfig : null;

  const hasDataToPush = ordersToPush.length > 0 || expensesToPush.length > 0 || recsToPush.length > 0 || 
                       itemsToPush.length > 0 || catsToPush.length > 0 || usersToPush.length > 0 || settingsToPush;

  if (hasDataToPush) {
    try {
      const response = await fetch(`${apiUrl}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiToken}` },
        body: JSON.stringify({
          orders: ordersToPush,
          expenses: expensesToPush,
          reconciliations: recsToPush,
          categories: catsToPush,
          items: itemsToPush,
          users: usersToPush,
          settings: settingsToPush
        })
      });
      
      if (!response.ok) throw new Error('Erreur HTTP ' + response.status + ' lors du PUSH');
      const responseData = await response.json();
      
      if (responseData.status === 'success') {
         for (let o of ordersToPush) { await dbOrders.setItem(o.id, { ...o, synced: true }); stats.pushed.orders++; }
         for (let e of expensesToPush) { await dbExpenses.setItem(e.id, { ...e, synced: true }); stats.pushed.expenses++; }
         for (let r of recsToPush) { await dbReconciliations.setItem(r.id, { ...r, synced: true }); stats.pushed.reconciliations++; }
         for (let i of itemsToPush) { await dbItems.setItem(i.id, { ...i, synced: true }); stats.pushed.items++; }
         for (let c of catsToPush) { await dbCategories.setItem(c.id, { ...c, synced: true }); stats.pushed.categories++; }
         for (let u of usersToPush) { await dbUsers.setItem(u.id, { ...u, synced: true }); stats.pushed.users++; }
         if (settingsToPush) { state.setConfig({ ...currentConfig, synced: true }); stats.pushed.settings++; }
      }
    } catch (err) {
      console.error("Sync PUSH failed:", err);
      throw new Error("Échec de l'envoi au serveur après réception. " + err.message);
    }
  }

  return { success: true, ...stats };
};
