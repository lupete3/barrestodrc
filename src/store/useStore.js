import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbOrders, authenticateUser } from '../lib/db';

const useStore = create(
  persist(
    (set, get) => ({
  config: {
    restaurantName: 'RestoBKV',
    phone: '+243 999 999 999',
    rccm: 'CD/BKV/RCCM/2026',
    idNat: '01-123-N12345M',
    footerMessage: 'Merci de votre visite !\n** Logiciel RestoBKV POS **',
    currency: '$',
    taxRate: 0.16,
    printEnabled: true,
    apiUrl: 'https://api.votre-resto.com',
    apiToken: 'secret_token_123'
  },
  
  // Auth & Session
  currentUser: null,
  loginError: null,
  theme: 'dark',
  toggleTheme: () => set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  
  login: async (pin) => {
    const user = await authenticateUser(pin);
    if (user) {
      set({ currentUser: user, loginError: null });
      return true;
    } else {
      set({ loginError: 'Code PIN incorrect' });
      return false;
    }
  },

  logout: () => set({ currentUser: null, cart: [] }),

  // POS State
  cart: [],
  currentCategory: 'boissons',
  lastOrder: null,

  setConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } })),
  setCategory: (category) => set({ currentCategory: category }),

  addToCart: (item) => set((state) => {
    const existing = state.cart.find(cartItem => cartItem.id === item.id);
    if (existing) {
      return { cart: state.cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c) };
    }
    return { cart: [...state.cart, { ...item, quantity: 1 }] };
  }),

  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(item => item.id !== itemId)
  })),

  updateQuantity: (itemId, delta) => set((state) => ({
    cart: state.cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0)
  })),

  clearCart: () => set({ cart: [] }),
  clearLastOrder: () => set({ lastOrder: null }),

  checkout: async () => {
    const state = get();
    if (state.cart.length === 0 || !state.currentUser) return null;

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * state.config.taxRate;
    const order = {
      id: 'ORD-' + Math.floor(Math.random() * 10000) + '-' + Date.now().toString().slice(-4),
      server: state.currentUser.name,
      items: [...state.cart],
      subtotal: subtotal,
      tax: tax,
      total: subtotal + tax,
      timestamp: new Date().toISOString(),
      is_paid: true, // Default to paid
      synced: false
    };

    try {
      await dbOrders.setItem(order.id, order);
      
      // Store last order for the Printer component and clear cart
      set({ lastOrder: order, cart: [] });

      return order;
    } catch (error) {
      console.error("Failed to save order offline:", error);
      return null;
    }
  },

  setLastOrder: (order) => set({ lastOrder: order }),

  toggleOrderPaymentStatus: async (orderId) => {
    try {
      const order = await dbOrders.getItem(orderId);
      if (order) {
        order.is_paid = !order.is_paid;
        order.synced = false; // Mark for sync
        await dbOrders.setItem(orderId, order);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to toggle payment status:", error);
      return false;
    }
  }
}),
    {
      name: 'restobkv-storage',
      partialize: (state) => ({ 
        currentUser: state.currentUser, 
        config: state.config, 
        currentCategory: state.currentCategory,
        cart: state.cart
      }),
    }
  )
);

export default useStore;
