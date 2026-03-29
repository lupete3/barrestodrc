import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { seedInitialData, dbOrders, getAllCategories, getAllItems } from '../lib/db';
import { performSync } from '../lib/sync';

function POS() {
  const navigate = useNavigate();
  const { cart, config, currentUser, logout, currentCategory, setCategory, addToCart, removeFromCart, updateQuantity, checkout, clearCart, theme, toggleTheme } = useStore();
  
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const init = async () => {
      await seedInitialData();
      
      const cats = await getAllCategories();
      setCategories(cats);
      
      const activeCat = (cats.find(c => c.id === currentCategory)) ? currentCategory : cats[0]?.id;
      if (activeCat && activeCat !== currentCategory) setCategory(activeCat);
      
      const itemsDb = await getAllItems();
      setAllItems(itemsDb);

      await checkUnsyncedOrders();
      setLoading(false);
    };
    init();
  }, []);

  const checkUnsyncedOrders = async () => {
    let count = 0;
    await dbOrders.iterate((o) => {
      if (!o.synced) count++;
    });
    setUnsyncedCount(count);
  };

  const handleCheckout = async () => {
    const order = await checkout();
    if (order) {
       console.log("Printing receipt for order:", order.id);
       checkUnsyncedOrders();
       if (isMobileCartOpen) setIsMobileCartOpen(false);
       setSearchQuery('');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await performSync();
      alert(`Synchronisation réussie !\n\nEnvoyé: ${result.pushed.orders} commandes, ${result.pushed.expenses} dépenses, ${result.pushed.reconciliations} clôtures.\nReçu: ${result.pulled.items} produits, ${result.pulled.users} utilisateurs.`);
      
      // Refresh local view after pull override
      const cats = await getAllCategories();
      setCategories(cats);
      
      const activeCat = (cats.find(c => c.id === currentCategory)) ? currentCategory : cats[0]?.id;
      if (activeCat && activeCat !== currentCategory) setCategory(activeCat);
      
      setAllItems(await getAllItems());
      await checkUnsyncedOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    if(window.confirm("Êtes-vous sûr de vouloir fermer votre session ?")) {
      logout();
      navigate('/login');
    }
  };

  const handleAdminClick = () => {
    if (currentUser?.role !== 'admin') {
      alert("Accès refusé. Réservé aux gérants.");
    } else {
      navigate('/admin');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * item.quantity), 0);
  const tax = subtotal * config.taxRate;
  const total = subtotal + tax;

  const displayedItems = searchQuery.trim() !== '' 
     ? allItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
     : allItems.filter(i => i.category === currentCategory);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem', color: 'var(--color-primary)' }}>Chargement POS...</div>;

  return (
    <div className="app-container" style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
      
      {/* Mobile Cart Floating Action Button */}
      <button className="fab-cart" onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}>
        🛒
        {cart.length > 0 && (
          <span className="fab-badge">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        )}
      </button>

      {/* Overlay when mobile cart is open */}
      {isMobileCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', zIndex: 95 }} onClick={() => setIsMobileCartOpen(false)}></div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar" style={{ width: '80px', backgroundColor: 'var(--bg-surface-elevated)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
         <div className="logo-box" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-primary)', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
           RB
         </div>
         <button className="btn-icon-only" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
            <span style={{ fontSize: '1.5rem' }}>🏠</span>
         </button>
         <button className="btn-icon-only" style={{ marginBottom: '1rem' }} onClick={handleAdminClick} title="Gérant">
            <span style={{ fontSize: '1.5rem', filter: currentUser?.role !== 'admin' ? 'grayscale(1) opacity(0.3)' : 'none' }}>⚙️</span>
         </button>
         <button className="btn-icon-only" style={{ marginBottom: '1rem' }} onClick={handleSync} title="Synchroniser l'app" disabled={isSyncing}>
            <span style={{ fontSize: '1.5rem', opacity: isSyncing ? 0.5 : 1 }}>{isSyncing ? '⏳' : '🔄'}</span>
         </button>

         <button className="btn-icon-only" style={{ marginBottom: '1rem' }} onClick={toggleTheme} title={theme === 'dark' ? 'Passer au mode Clair' : 'Passer au mode Sombre'}>
            <span style={{ fontSize: '1.5rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
         </button>
         
         <div className="logout-container">
            <button className="btn-icon-only" onClick={handleLogout} title="Déconnexion" style={{ color: 'var(--color-danger)' }}>
               <span style={{ fontSize: '1.5rem' }}>📴</span>
            </button>
         </div>
      </aside>

      {/* Main POS Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
           <div>
             <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{config.restaurantName} POS</h1>
             <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>Serveur: <strong style={{color: 'var(--text-primary)'}}>{currentUser?.name || 'Inconnu'}</strong></p>
           </div>
           
           <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}>
             <input 
               type="text" 
               placeholder="🔍 Rechercher un produit..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{ 
                 width: '100%', 
                 maxWidth: '500px', 
                 borderRadius: '50px', 
                 backgroundColor: 'var(--bg-surface-elevated)',
                 border: '2px solid transparent'
               }}
             />
           </div>

           <button 
             onClick={handleSync}
             disabled={isSyncing}
             className={`btn btn-outline ${unsyncedCount > 0 ? 'btn-warning' : ''}`} 
             style={{ minHeight: '3rem', height: '3rem', padding: '0 1rem' }}
           >
              {isSyncing ? '⏳ Sync...' : (unsyncedCount > 0 ? `⚠️ ${unsyncedCount} à Sync` : '✅ Synchro à jour')}
           </button>
        </header>

        {/* Dynamic Categories Tab */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
           {categories.map(cat => (
             <h3 
               key={cat.id}
               onClick={() => { setCategory(cat.id); setSearchQuery(''); }}
               style={{ 
                 color: (currentCategory === cat.id && !searchQuery) ? 'var(--color-primary)' : 'var(--text-muted)', 
                 borderBottom: (currentCategory === cat.id && !searchQuery) ? '4px solid var(--color-primary)' : 'none', 
                 paddingBottom: '0.5rem', 
                 marginBottom: '-0.7rem', 
                 cursor: 'pointer',
                 transition: 'all 0.2s',
                 fontSize: '1.2rem'
               }}
             >
               {cat.icon} {cat.name}
             </h3>
           ))}
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem', paddingBottom: '2rem', alignContent: 'start' }}>
           {displayedItems.map(item => (
             <div 
               key={item.id} 
               className="glass animate-fade-in" 
               style={{ borderRadius: 'var(--border-radius-md)', padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '130px' }}
               onClick={(e) => { 
                 const el = e.currentTarget;
                 el.style.transform = 'scale(0.95)'; 
                 setTimeout(()=> el.style.transform = 'none', 100);
                 addToCart(item);
                 setSearchQuery(''); // Optional: clear search after picking? Better to keep it if they want multiple
               }}
             >
               <div style={{ fontSize: '1.1rem', fontWeight: '500', flex: 1 }}>{item.name}</div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                 <span style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.2rem' }}>{Number(item.price || 0).toFixed(2)}{config.currency}</span>
                 {searchQuery && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{categories.find(c => c.id === item.category)?.name || item.category}</span>}
               </div>
             </div>
           ))}
           {displayedItems.length === 0 && (
             <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
               {searchQuery ? "Aucun produit ne correspond à votre recherche." : "Aucun produit dans cette catégorie."}
             </div>
           )}
        </div>
      </main>

      {/* Order Cart */}
      <aside className={`order-cart glass ${isMobileCartOpen ? 'cart-open' : ''}`} style={{ backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
             <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Commande Active</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button className="btn-icon-only text-danger" onClick={() => { clearCart(); setIsMobileCartOpen(false); }} title="Vider" style={{ color: 'var(--color-danger)' }}>🗑️</button>
             <button className="btn-icon-only" onClick={() => setIsMobileCartOpen(false)} style={{ display: window.innerWidth <= 900 ? 'block' : 'none' }}>⬇️</button>
          </div>
        </div>
        
        <div style={{ flex: 1, padding: '1rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {cart.length === 0 && (
             <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
               Panier vide.
             </div>
          )}
          {cart.map(item => (
            <div key={item.id} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--bg-surface-elevated)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>{item.name}</div>
                 <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{(Number(item.price || 0) * item.quantity).toFixed(2)}{config.currency}</div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                 <span>{Number(item.price || 0).toFixed(2)}{config.currency} / u</span>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--border-radius-sm)', padding: '0.25rem' }}>
                    <button onClick={() => updateQuantity(item.id, -1)} style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px' }}>-</button>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '4px' }}>+</button>
                 </div>
               </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface-elevated)', borderTop: '1px solid var(--border-color)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sous-total</span>
              <span>{Number(subtotal || 0).toFixed(2)}{config.currency}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>TVA ({(config.taxRate*100).toFixed(0)}%)</span>
              <span>{Number(tax || 0).toFixed(2)}{config.currency}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0 1rem 0', padding: '0.5rem 0', borderTop: '1px dashed var(--border-color)', fontSize: '1.5rem', fontWeight: '700' }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>{Number(total || 0).toFixed(2)}{config.currency}</span>
           </div>
           <div style={{ display: 'flex', gap: '1rem' }}>
             <button className="btn btn-primary" style={{ flex: 1, fontSize: '1.25rem' }} onClick={handleCheckout} disabled={cart.length === 0}>Payer {Number(total || 0).toFixed(2)}{config.currency}</button>
           </div>
        </div>
      </aside>
    </div>
  )
}

export default POS;
