import localforage from 'localforage';

localforage.config({
  name: 'RestoBKV_POS',
  version: 1.0,
  storeName: 'pos_data',
  description: 'Offline database for RestoBKV POS'
});

export const dbItems = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'items' });
export const dbOrders = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'orders' });
export const dbSessions = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'sessions' });
export const dbUsers = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'users' });
export const dbCategories = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'categories' });
export const dbReconciliations = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'reconciliations' });
export const dbExpenses = localforage.createInstance({ name: 'RestoBKV_POS', storeName: 'expenses' });

// Seed some initial data for Bukavu context if empty
export const seedInitialData = async () => {
  try {
    const catsCount = await dbCategories.length();
    if (catsCount === 0) {
      const defaultCats = [
        { id: 'boissons', name: 'Boissons', icon: '🍻' },
        { id: 'nourritures', name: 'Nourritures', icon: '🍖' },
        { id: 'extras', name: 'Extras', icon: '⭐' }
      ];
      for (const cat of defaultCats) await dbCategories.setItem(cat.id, cat);
    }

    const itemsCount = await dbItems.length();
    if (itemsCount === 0) {
      const defaultItems = [
        { id: '1', name: 'Primus 72cl', price: 3.0, category: 'boissons', stock: 150 },
        { id: '2', name: 'Primus 50cl', price: 2.5, category: 'boissons', stock: 100 },
        { id: '3', name: 'Skol 72cl', price: 3.0, category: 'boissons', stock: 80 },
        { id: '4', name: 'Mutzig 72cl', price: 3.5, category: 'boissons', stock: 60 },
        { id: '5', name: 'Bavaria 50cl', price: 2.5, category: 'boissons', stock: 40 },
        { id: '6', name: 'Jus d\'Ananas (Local)', price: 1.5, category: 'boissons', stock: 30 },
        { id: '7', name: 'Fufu et Sombe avec Poisson', price: 8.0, category: 'nourritures', stock: 20 },
        { id: '8', name: 'Poulet Mayo (complet)', price: 15.0, category: 'nourritures', stock: 15 },
        { id: '9', name: 'Frites + Brochettes (3)', price: 5.0, category: 'nourritures', stock: 50 },
        { id: '10', name: 'Chicha (Menthe)', price: 10.0, category: 'extras', stock: 10 }
      ];
      for (const item of defaultItems) await dbItems.setItem(item.id, item);
    }

    const usersCount = await dbUsers.length();
    if (usersCount === 0) {
      const defaultUsers = [
        { id: 'admin1', name: 'Gérant Principal', pin: '1234', role: 'admin' },
        { id: 'serveur1', name: 'Jean-Baptiste', pin: '0000', role: 'waiter' },
        { id: 'serveur2', name: 'Aline', pin: '1111', role: 'waiter' }
      ];
      for (const user of defaultUsers) await dbUsers.setItem(user.id, user);
    }

  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
};

export const getAllCategories = async () => {
  const cats = [];
  await dbCategories.iterate((value) => { cats.push(value); });
  return cats;
};

export const getItemsByCategory = async (category) => {
  const items = [];
  await dbItems.iterate((value) => {
    if (value.category === category) items.push(value);
  });
  return items;
};

export const getAllItems = async () => {
  const items = [];
  await dbItems.iterate((value) => { items.push(value); });
  return items;
};

export const authenticateUser = async (pin) => {
  let authenticatedUser = null;
  await dbUsers.iterate((user) => {
    if (user.pin === pin) {
      authenticatedUser = user;
    }
  });
  return authenticatedUser;
};

export const getAllUsers = async () => {
  const users = [];
  await dbUsers.iterate((value) => { users.push(value); });
  return users;
};

export const getAllOrders = async () => {
  const orders = [];
  await dbOrders.iterate((value) => { orders.push(value); });
  return orders.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const getAllReconciliations = async () => {
  const records = [];
  await dbReconciliations.iterate((value) => { records.push(value); });
  return records.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const getAllExpenses = async () => {
  const records = [];
  await dbExpenses.iterate((value) => { records.push(value); });
  return records.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
};
