import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { dbItems, dbUsers, dbOrders, dbCategories, dbReconciliations, dbExpenses, getAllItems, getAllUsers, getAllOrders, getAllCategories, getAllReconciliations, getAllExpenses } from '../lib/db';
import { performSync } from '../lib/sync';

function Admin() {
  const navigate = useNavigate();
  const { config, setConfig, logout, currentUser, theme, toggleTheme } = useStore();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const showDialog = (type, title, message, onConfirm = null) => {
    setDialog({ isOpen: true, type, title, message, onConfirm });
  };

  const loadData = async () => {
    setItems(await getAllItems());
    setUsers(await getAllUsers());
    setOrders(await getAllOrders());
    setCategories(await getAllCategories());
    setReconciliations(await getAllReconciliations());
    setExpenses(await getAllExpenses());
  };

  const handleForcePush = async () => {
    showDialog('confirm', 'Confirmation de Renvoi Global', "Voulez-vous vraiment marquer TOUTES les données (ventes, dépenses) comme 'non-synchronisées' pour les renvoyer au serveur ? Utile après un reset du serveur.", async () => {
      setIsSyncing(true);
      try {
        await dbOrders.iterate(async (val, key) => { await dbOrders.setItem(key, { ...val, synced: false }); });
        await dbExpenses.iterate(async (val, key) => { await dbExpenses.setItem(key, { ...val, synced: false }); });
        await dbReconciliations.iterate(async (val, key) => { await dbReconciliations.setItem(key, { ...val, synced: false }); });
        await dbCategories.iterate(async (val, key) => { await dbCategories.setItem(key, { ...val, synced: false }); });
        await dbItems.iterate(async (val, key) => { await dbItems.setItem(key, { ...val, synced: false }); });
        await dbUsers.iterate(async (val, key) => { await dbUsers.setItem(key, { ...val, synced: false }); });
        
        showDialog('alert', 'Préparation Terminée', "Toutes les données (Menu, Ventes, Dépenses) ont été marquées pour renvoi. Début de la synchronisation...");
        await handleSync();
      } catch (err) {
        showDialog('alert', 'Erreur', "Erreur lors de la préparation du renvoi: " + err.message);
      } finally {
        setIsSyncing(false);
      }
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await performSync();
      showDialog('alert', 'Synchronisation Réussie', `Commandes envoyées: ${result.pushed.orders}\nDépenses envoyées: ${result.pushed.expenses}\nProduits reçus: ${result.pulled.items}\nUtilisateurs reçus: ${result.pulled.users}`);
      await loadData();
    } catch (err) {
      showDialog('alert', 'Échec Sync', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container admin-mobile-fix" style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Sidebar */}
      <aside className="sidebar admin-sidebar" style={{ width: '80px', backgroundColor: 'var(--bg-surface-elevated)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0', flexShrink: 0, zIndex: 10 }}>
         <div className="logo-box" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-warning)', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
           AD
         </div>
         <button className="btn-icon-only" style={{ marginBottom: '1rem' }} onClick={() => navigate('/')} title="Retour au POS">
            <span style={{ fontSize: '1.5rem' }}>🏠</span>
         </button>
          <button className="btn-icon-only" style={{ marginBottom: '1rem' }} onClick={handleSync} title="Synchronisation Globale" disabled={isSyncing}>
             <span style={{ fontSize: '1.5rem', opacity: isSyncing ? 0.5 : 1 }}>{isSyncing ? '⏳' : '🔄'}</span>
          </button>
          <button className="btn-icon-only" style={{ marginBottom: '1rem', color: 'var(--color-warning)' }} onClick={handleForcePush} title="TOUT Renvoyer au Serveur (Force Push)" disabled={isSyncing}>
             <span style={{ fontSize: '1.5rem', opacity: isSyncing ? 0.5 : 1 }}>📤</span>
          </button>

         <button className="btn-icon-only" style={{ marginBottom: '1rem' }} onClick={toggleTheme} title={theme === 'dark' ? 'Passer au mode Clair' : 'Passer au mode Sombre'}>
            <span style={{ fontSize: '1.5rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
         </button>
         <div className="admin-logout-container" style={{ marginTop: 'auto' }}>
            <button className="btn-icon-only" onClick={handleLogout} title="Déconnexion" style={{ color: 'var(--color-danger)', marginBottom: 0 }}>
               <span style={{ fontSize: '1.5rem' }}>📴</span>
            </button>
         </div>
      </aside>

      {/* Main Admin Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)', minWidth: 0 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
           <div>
             <h1 style={{ fontSize: '2rem', margin: 0 }}>Backoffice Gérant</h1>
             <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>Gestion et Configuration</p>
           </div>
           
           {/* Navigation Tabs */}
           <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '0.5rem', borderRadius: 'var(--border-radius-lg)', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
             {[
               { id: 'dashboard', label: '📊 Dashboard' },
               { id: 'settings', label: '⚙️ Paramètres' },
               { id: 'finance', label: '💰 Caisse & Clôture' },
               { id: 'expenses', label: '💸 Dépenses' },
               { id: 'report', label: '📉 Bilan P&L' },
               { id: 'menu', label: '🍔 Carte & Menu' },
               { id: 'categories', label: '🏷️ Catégories' },
               { id: 'users', label: '👥 Utilisateurs' }
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 style={{ 
                   whiteSpace: 'nowrap',
                   flexShrink: 0,
                   padding: '0.75rem 1.25rem', 
                   borderRadius: 'var(--border-radius-md)',
                   backgroundColor: activeTab === tab.id ? 'var(--color-warning)' : 'transparent',
                   color: activeTab === tab.id ? '#000' : 'var(--text-primary)',
                   fontWeight: activeTab === tab.id ? '600' : '400',
                   transition: 'all 0.2s'
                 }}
               >
                 {tab.label}
               </button>
             ))}
           </div>
        </header>

         <div style={{ flex: 1, padding: window.innerWidth < 768 ? '0.75rem' : '1.5rem', overflowY: 'auto' }}>
           {activeTab === 'dashboard' && <DashboardView orders={orders} config={config} refreshData={loadData} />}
           {activeTab === 'settings' && <SettingsView config={config} setConfig={setConfig} onSync={handleSync} showDialog={showDialog} />}
           {activeTab === 'finance' && <FinanceView orders={orders} users={users} reconciliations={reconciliations} refreshData={loadData} config={config} currentUser={currentUser} showDialog={showDialog} />}
           {activeTab === 'expenses' && <ExpensesView expenses={expenses} refreshData={loadData} config={config} onSync={handleSync} showDialog={showDialog} />}
           {activeTab === 'report' && <ReportView orders={orders} expenses={expenses} reconciliations={reconciliations} config={config} />}
           {activeTab === 'menu' && <MenuView items={items} categories={categories} refreshData={loadData} config={config} onSync={handleSync} showDialog={showDialog} />}
           {activeTab === 'categories' && <CategoriesView categories={categories} refreshData={loadData} onSync={handleSync} showDialog={showDialog} />}
           {activeTab === 'users' && <UsersView users={users} refreshData={loadData} onSync={handleSync} showDialog={showDialog} />}
        </div>

        {dialog.isOpen && (
           <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div className="glass" style={{ width: '90%', maxWidth: '400px', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', textAlign: 'center', animation: 'modalIn 0.3s ease-out' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{dialog.type === 'confirm' ? '❓' : (dialog.title.toLowerCase().includes('erreur') || dialog.title.toLowerCase().includes('échec') ? '❌' : '✅')}</div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{dialog.title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{dialog.message}</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {dialog.type === 'confirm' && (
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDialog({ ...dialog, isOpen: false })}>Annuler</button>
                  )}
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                    if (dialog.onConfirm) dialog.onConfirm();
                    setDialog({ ...dialog, isOpen: false });
                  }}>
                    {dialog.type === 'confirm' ? 'Confirmer' : 'OK'}
                  </button>
                </div>
             </div>
           </div>
        )}
      </main>
    </div>
  )
}

function DashboardView({ orders, config, refreshData }) {
  const { toggleOrderPaymentStatus } = useStore();
  const [filterWaiter, setFilterWaiter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  
  // Get unique servers for filter
  const waiters = ['all', ...new Set(orders.map(o => o.server))];

  const filteredOrders = orders.filter(o => {
    const matchesWaiter = filterWaiter === 'all' || o.server === filterWaiter;
    const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (o.total && o.total.toString().includes(searchQuery));
    
    // Date Filtering
    let matchesDate = true;
    if (o.timestamp) {
      const orderDate = new Date(o.timestamp);
      orderDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) matchesDate = false;
      }
    }

    return matchesWaiter && matchesSearch && matchesDate;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalTaxes = orders.reduce((sum, o) => sum + (Number(o.tax) || 0), 0);
  
  const todayLocal = new Date().toLocaleDateString();
  const todaysOrders = orders.filter(o => new Date(o.timestamp).toLocaleDateString() === todayLocal);
  const todayRevenue = todaysOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const handleReprint = (order) => {
    // We use the global ReceiptPrinter by setting lastOrder in the store
    // This is more reliable on mobile than window.open in this component
    useStore.getState().setLastOrder(order);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input 
              type="text" 
              placeholder="🔍 Chercher par ID ou Montant..." 
              className="glass" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select 
              className="glass" 
              value={filterWaiter}
              onChange={(e) => setFilterWaiter(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {waiters.map(w => <option key={w} value={w}>{w === 'all' ? 'Tous les serveurs' : w}</option>)}
            </select>
          </div>
        </div>

        <div className="glass" style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: 'var(--border-radius-md)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>De:</span>
            <input 
              type="date" 
              className="glass" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>À:</span>
            <input 
              type="date" 
              className="glass" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
            >Aujourd'hui</button>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                setStartDate(firstDay);
                setEndDate(lastDay);
              }}
            >Ce Mois</button>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => {
                const year = new Date().getFullYear();
                setStartDate(`${year}-01-01`);
                setEndDate(`${year}-12-31`);
              }}
            >Cette Année</button>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >Tout</button>
          </div>
        </div>
      </div>
      
      <h3 style={{ marginBottom: '1rem' }}>Dernières Commandes ({filteredOrders.length})</h3>
      <div className="glass" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>ID</th>
              <th style={{ padding: '1rem' }}>Heure</th>
              <th style={{ padding: '1rem' }}>Serveur</th>
              <th style={{ padding: '1rem' }}>Montant</th>
              <th style={{ padding: '1rem' }}>Paiement</th>
              <th style={{ padding: '1rem' }}>Sinc.</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.slice(0, 50).map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: o.is_paid === false ? 0.8 : 1 }}>
                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{o.id}</td>
                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{o.timestamp ? new Date(o.timestamp).toLocaleString() : 'N/A'}</td>
                <td style={{ padding: '1rem' }}>{o.server}</td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{Number(o.total || 0).toFixed(2)}{config.currency}</td>
                <td style={{ padding: '1rem' }}>
                   <button 
                     onClick={() => { toggleOrderPaymentStatus(o.id); refreshData(); }}
                     style={{ 
                       padding: '0.25rem 0.6rem', 
                       borderRadius: '4px', 
                       fontSize: '0.8rem',
                       border: 'none',
                       cursor: 'pointer',
                       backgroundColor: o.is_paid !== false ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                       color: o.is_paid !== false ? '#4caf50' : '#f44336'
                     }}
                   >
                     {o.is_paid !== false ? '✅ Payé' : '❌ Impayé'}
                   </button>
                </td>
                <td style={{ padding: '1rem' }}>{o.synced ? '☁️' : '📲'}</td>
                <td style={{ padding: '1rem' }}>
                   <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleReprint(o)}>🖨️ Ticket</button>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune commande trouvée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SettingsView({ config, setConfig, onSync, showDialog }) {
  const [formData, setFormData] = useState({
    restaurantName: config.restaurantName,
    phone: config.phone,
    rccm: config.rccm,
    idNat: config.idNat,
    footerMessage: config.footerMessage,
    currency: config.currency,
    taxRate: (config.taxRate * 100).toString(),
    printEnabled: config.printEnabled,
    apiUrl: config.apiUrl || '',
    apiToken: config.apiToken || ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = () => {
    setConfig({
      ...formData,
      taxRate: parseFloat(formData.taxRate) / 100,
      synced: false // Mark settings as dirty for next sync
    });
    showDialog('alert', 'Configuration Sauvée', "Configuration sauvegardée ! Lancement de la synchronisation...");
    if (onSync) onSync();
  };

  return (
    <div className="glass" style={{ maxWidth: '800px', padding: '1.25rem', borderRadius: 'var(--border-radius-lg)' }}>
       <h2 style={{ marginBottom: '1.25rem', color: 'var(--color-warning)' }}>Coordonnées & Informations Légales</h2>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nom de l'établissement</label>
             <input type="text" name="restaurantName" value={formData.restaurantName} onChange={handleChange} />
           </div>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Téléphone</label>
             <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
           </div>
         </div>
         <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>N° RCCM</label>
             <input type="text" name="rccm" value={formData.rccm} onChange={handleChange} />
           </div>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>ID NAT</label>
             <input type="text" name="idNat" value={formData.idNat} onChange={handleChange} />
           </div>
         </div>
         <div>
           <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Message de bas de facture</label>
           <textarea name="footerMessage" value={formData.footerMessage} onChange={handleChange} rows="3" style={{ height: 'auto', paddingTop: '1rem' }} />
         </div>
         <h2 style={{ marginTop: '1rem', color: 'var(--color-warning)' }}>Facturation & Finance</h2>
         <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Devise (ex: FC, $, €)</label>
             <input type="text" name="currency" value={formData.currency} onChange={handleChange} />
           </div>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Taux de TVA (%)</label>
             <input type="number" name="taxRate" value={formData.taxRate} onChange={handleChange} />
           </div>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
           <input type="checkbox" id="printEnabled" name="printEnabled" checked={formData.printEnabled} onChange={handleChange} style={{ width: '24px', height: '24px' }} />
           <label htmlFor="printEnabled" style={{ fontSize: '1.1rem', cursor: 'pointer' }}>Activer l'impression automatique</label>
         </div>
         
         <h2 style={{ marginTop: '2rem', color: 'var(--color-warning)' }}>Serveur distant & Synchronisation (API)</h2>
         <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>URL Endpoint (ex: https://api.monsite.com)</label>
             <input type="text" name="apiUrl" placeholder="URL de l'API Laravel" value={formData.apiUrl} onChange={handleChange} />
           </div>
           <div style={{ flex: '1 1 300px' }}>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Clé Sécurité API (Bearer Token)</label>
             <input type="password" name="apiToken" placeholder="Votre clé secrète" value={formData.apiToken} onChange={handleChange} />
           </div>
         </div>

         <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
           <button className="btn btn-primary" onClick={handleSave} style={{ backgroundColor: 'var(--color-warning)', color: '#000' }}>Enregistrer Configuration</button>
         </div>
       </div>
    </div>
  );
}

function CategoriesView({ categories, refreshData, onSync, showDialog }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setNewCatName('');
    setNewCatIcon('📌');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cat) => {
    setNewCatName(cat.name);
    setNewCatIcon(cat.icon);
    setEditingId(cat.id);
    setIsModalOpen(true);
  };

  const handleSaveCat = async () => {
    if (!newCatName) return;
    const cat = {
      id: editingId ? editingId : newCatName.toLowerCase().replace(/\s+/g, '-'),
      name: newCatName,
      icon: newCatIcon,
      synced: false // Mark as local change
    };
    await dbCategories.setItem(cat.id, cat);
    refreshData();
    setNewCatName('');
    setNewCatIcon('📌');
    setEditingId(null);
    setIsModalOpen(false);
    if (onSync) onSync();
  };

  const cancelEdit = () => {
    setNewCatName('');
    setNewCatIcon('📌');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    showDialog('confirm', 'Supprimer Catégorie', "Vos produits liés à cette catégorie risquent de disparaitre de l'affichage. Continuer ?", async () => {
      await dbCategories.removeItem(id);
      refreshData();
      if (onSync) onSync();
    });
  };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-warning)' }}>Gestion des Catégories de Menu</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
         <button className="btn btn-primary" onClick={handleOpenModal} style={{ backgroundColor: 'var(--color-warning)', color: '#000' }}>
           ➕ Nouvelle Catégorie
         </button>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass" style={{ width: '95%', maxWidth: '500px', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ margin: 0, color: 'var(--color-warning)', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              {editingId ? 'Modifier la Catégorie' : 'Ajouter une Catégorie'}
            </h3>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nom Catégorie</label>
              <input type="text" placeholder="Ex: Chichas, Vins, Entrées..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Icône (Emoji)</label>
              <input type="text" placeholder="🍾" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelEdit}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, backgroundColor: editingId ? 'var(--color-primary)' : 'var(--color-warning)', color: editingId ? '#fff' : '#000' }} onClick={handleSaveCat}>
                {editingId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto', maxWidth: '800px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Icône</th>
              <th style={{ padding: '1rem' }}>Nom / ID</th>
              <th style={{ padding: '1rem', width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontSize: '1.5rem' }}>{c.icon}</td>
                <td style={{ padding: '1rem' }}>{c.name} <br/><small style={{color:'var(--text-muted)'}}>({c.id})</small></td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button className="btn-icon-only" style={{ color: 'var(--text-primary)' }} onClick={() => handleEdit(c)}>✏️</button>
                     <button className="btn-icon-only" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(c.id)}>🗑️</button>
                   </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune catégorie</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MenuView({ items, categories, config, refreshData, onSync, showDialog }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCat, setNewItemCat] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);


  const handleOpenModal = () => {
    setNewItemName('');
    setNewItemPrice('');
    setEditingId(null);
    if(categories.length > 0) setNewItemCat(categories[0].id);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setNewItemName(item.name);
    setNewItemPrice(item.price);
    setNewItemCat(item.category);
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!newItemName || !newItemPrice || !newItemCat) return;
    const item = {
      id: editingId ? editingId : Date.now().toString(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      category: newItemCat,
      stock: 999,
      synced: false // Mark as local change
    };
    await dbItems.setItem(item.id, item);
    refreshData();
    setNewItemName('');
    setNewItemPrice('');
    setEditingId(null);
    setIsModalOpen(false);
    if (onSync) onSync();
  };

  const cancelEdit = () => {
    setNewItemName('');
    setNewItemPrice('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    showDialog('confirm', 'Supprimer Produit', "Supprimer cet article ?", async () => {
      await dbItems.removeItem(id);
      refreshData();
      if (onSync) onSync();
    });
  };

  const displayedItems = searchQuery.trim() !== ''
     ? items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
     : items;

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-warning)' }}>Gestion Menu & Produits</h2>
      
      {/* Toolbar: Add Button & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
         <button className="btn btn-primary" onClick={handleOpenModal} style={{ backgroundColor: 'var(--color-warning)', color: '#000' }}>
           ➕ Nouveau Produit
         </button>

         <input 
           type="text" 
           placeholder="🔍 Chercher un produit existant..." 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           style={{ 
             width: '100%', 
             maxWidth: '400px', 
             borderRadius: 'var(--border-radius-md)', 
             backgroundColor: 'var(--bg-surface-elevated)',
             border: '1px solid var(--border-color)',
             padding: '0.75rem 1rem',
             color: 'white',
             fontSize: '1rem'
           }}
         />
      </div>

      {/* Full Screen Modal Overlay */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass" style={{ width: '95%', maxWidth: '500px', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ margin: 0, color: 'var(--color-warning)', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              {editingId ? 'Modifier le Produit' : 'Ajouter un Produit'}
            </h3>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nom du produit</label>
              <input type="text" placeholder="Ex: Bouteille d'eau, Ntaba..." value={newItemName} onChange={e => setNewItemName(e.target.value)} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Prix unitaire ({config.currency})</label>
              <input type="number" placeholder="Ex: 5" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Catégorie</label>
              <select 
                value={newItemCat} 
                onChange={e => setNewItemCat(e.target.value)}
                style={{ width: '100%', height: 'var(--touch-target)', backgroundColor: 'var(--bg-surface)', color: 'white', border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '0 1rem', fontSize: '1.1rem' }}
              >
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelEdit}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, backgroundColor: editingId ? 'var(--color-primary)' : 'var(--color-warning)', color: editingId ? '#fff' : '#000' }} onClick={handleSaveItem}>
                {editingId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Nom</th>
              <th style={{ padding: '1rem' }}>Catégorie</th>
              <th style={{ padding: '1rem' }}>Prix</th>
              <th style={{ padding: '1rem', width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{i.name}</td>
                <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                  {categories.find(c => c.id === i.category)?.name || i.category}
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{Number(i.price || 0).toFixed(2)}{config.currency}</td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button className="btn-icon-only" style={{ color: 'var(--text-primary)' }} onClick={() => handleEdit(i)}>✏️</button>
                     <button className="btn-icon-only" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(i.id)}>🗑️</button>
                   </div>
                </td>
              </tr>
            ))}
            {displayedItems.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun produit trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsersView({ users, refreshData, onSync, showDialog }) {
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('waiter');
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setNewName('');
    setNewPin('');
    setNewRole('waiter');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setNewName(user.name);
    setNewPin(user.pin);
    setNewRole(user.role);
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!newName || !newPin || newPin.toString().length !== 4) {
      alert("Saisissez un nom et un PIN à 4 chiffres.");
      return;
    }

    // Check if the PIN is already mapped to another user
    const pinExists = users.some(u => u.pin === newPin.toString() && u.id !== editingId);
    if (pinExists) {
      alert("Ce code PIN est déjà utilisé par un autre serveur ou gérant. Veuillez en choisir un unique !");
      return;
    }

    const user = {
      id: editingId ? editingId : Date.now().toString(),
      name: newName,
      pin: newPin.toString(),
      role: newRole,
      synced: false // Mark as local change
    };
    await dbUsers.setItem(user.id, user);
    refreshData();
    setNewName(''); setNewPin(''); setEditingId(null);
    setIsModalOpen(false);
    if (onSync) onSync();
  };

  const cancelEdit = () => {
    setNewName(''); setNewPin(''); setEditingId(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    showDialog('confirm', 'Suppression Utilisateur', "Supprimer cet utilisateur ?", async () => {
      await dbUsers.removeItem(id);
      refreshData();
      if (onSync) onSync();
    });
  };

  const displayedUsers = searchQuery.trim() !== ''
     ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
     : users;

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-warning)' }}>Gestion Utilisateurs (Serveurs / Gérants)</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
         <button className="btn btn-primary" onClick={handleOpenModal} style={{ backgroundColor: 'var(--color-warning)', color: '#000' }}>
           ➕ Nouvel Utilisateur
         </button>

         <input 
           type="text" 
           placeholder="🔍 Chercher un utilisateur..." 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           style={{ 
             width: '100%', 
             maxWidth: '400px', 
             borderRadius: 'var(--border-radius-md)', 
             backgroundColor: 'var(--bg-surface-elevated)',
             border: '1px solid var(--border-color)',
             padding: '0.75rem 1rem',
             color: 'white',
             fontSize: '1rem'
           }}
         />
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass" style={{ width: '95%', maxWidth: '500px', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ margin: 0, color: 'var(--color-warning)', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              {editingId ? "Modifier l'Utilisateur" : 'Ajouter un Utilisateur'}
            </h3>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nom</label>
              <input type="text" placeholder="Ex: Michel" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>PIN (4 chif.)</label>
              <input type="number" placeholder="Ex: 5555" value={newPin} onChange={e => setNewPin(e.target.value)} maxLength="4" />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Rôle</label>
              <select 
                value={newRole} 
                onChange={e => setNewRole(e.target.value)}
                style={{ width: '100%', height: 'var(--touch-target)', backgroundColor: 'var(--bg-surface)', color: 'white', border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '0 1rem', fontSize: '1.1rem' }}
              >
                <option value="waiter">Serveur</option>
                <option value="admin">Gérant</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelEdit}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, backgroundColor: editingId ? 'var(--color-primary)' : 'var(--color-warning)', color: editingId ? '#fff' : '#000' }} onClick={handleSaveUser}>
                {editingId ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Nom</th>
              <th style={{ padding: '1rem' }}>Rôle</th>
              <th style={{ padding: '1rem' }}>Code PIN</th>
              <th style={{ padding: '1rem', width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{u.name}</td>
                <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{u.role === 'admin' ? '⭐ Gérant' : 'Serveur'}</td>
                <td style={{ padding: '1rem', fontFamily: 'monospace', letterSpacing: '2px' }}>{u.pin}</td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button className="btn-icon-only" style={{ color: 'var(--text-primary)' }} onClick={() => handleEdit(u)}>✏️</button>
                     <button className="btn-icon-only" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(u.id)}>🗑️</button>
                   </div>
                </td>
              </tr>
            ))}
            {displayedUsers.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun utilisateur trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FinanceView({ orders, users, reconciliations, refreshData, config, currentUser, showDialog }) {
  const staff = users; // Include all users (admins and waiters)
  const todayISO = new Date().toISOString().split('T')[0];

  const [selectedServer, setSelectedServer] = useState(staff.length > 0 ? staff[0].name : '');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [actualCash, setActualCash] = useState('');

  // Fetch orders matching Server & Date that haven't been reconciled yet
  const dateOrders = orders.filter(o => {
    const d = new Date(o.timestamp);
    const orderDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    return o.server === selectedServer && orderDate === selectedDate && !o.reconciliationId;
  });

  const expectedAmount = dateOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const actual = parseFloat(actualCash) || 0;
  const variance = actual - expectedAmount;

  const handleReconcile = async () => {
    showDialog('confirm', 'Valider la Clôture', `Confirmer la clôture partielle/définitive de ${selectedServer} pour la date du ${selectedDate} ?\n\n- ${dateOrders.length} nouvelles factures à clôturer\n- Ventes Système : ${expectedAmount.toFixed(2)}${config.currency}\n- Fonds Remis : ${actual.toFixed(2)}${config.currency}\n- Écart : ${variance.toFixed(2)}${config.currency}`, async () => {
      const rec = {
        id: `REC-${Math.random().toString(36).substr(2, 9)}`,
        date: selectedDate,
        serverName: selectedServer,
        expectedAmount,
        actualAmount: actual,
        variance,
        managerName: currentUser?.name || 'Admin',
        timestamp: new Date().toISOString(),
        synced: false
      };

      // Flag all matched orders as reconciled to prevent double counting
      for (let o of dateOrders) {
        await dbOrders.setItem(o.id, { ...o, reconciliationId: rec.id });
      }

      await dbReconciliations.setItem(rec.id, rec);
      refreshData();
      setActualCash('');
    });
  };

  const handlePrint = (rec) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    const html = `
      <html>
        <head>
          <title>Clôture Ticket</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              text-align: center; 
              margin: 0; 
              padding: 10px; 
              font-size: 13px; 
              color: #000;
              background-color: #fff;
            }
            .content-wrapper {
              width: 72mm;
              max-width: 100%;
              margin: 0 auto;
              box-sizing: border-box;
            }
            .left { text-align: left; }
            .right { text-align: right; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            hr { border-top: 1px dashed black; border-bottom: none; border-left: none; border-right: none; margin: 8px 0; }
            h2 { margin: 5px 0; text-transform: uppercase; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            <h2>${config.restaurantName}</h2>
            <p style="margin-top:5px; font-weight:bold;">RAPPORT DE CLÔTURE CAISSE</p>
            <p style="margin-top:0px; font-size:10px;">ID: ${rec.id}</p>
            <hr/>
            <div class="left">
            <p><b>Date du service :</b> ${rec.date}</p>
            <p><b>Serveur :</b> ${rec.serverName}</p>
            <p><b>Contrôleur :</b> ${rec.managerName}</p>
          </div>
          <hr/>
          <div class="row">
            <span>CA Attendu :</span>
            <span>${Number(rec.expectedAmount || 0).toFixed(2)} ${config.currency}</span>
          </div>
          <div class="row">
            <span>Fonds remis :</span>
            <span>${Number(rec.actualAmount || 0).toFixed(2)} ${config.currency}</span>
          </div>
          <hr/>
          <div class="row" style="font-size: 16px; font-weight: bold;">
            <span>ÉCART (Bénéf./Perte) :</span>
            <span>${Number(rec.variance || 0) > 0 ? '+' : ''}${Number(rec.variance || 0).toFixed(2)} ${config.currency}</span>
          </div>
          <hr/>
          <p style="font-size: 11px; color: gray;">Imprimé le : ${new Date().toLocaleString()}</p>
          <div style="height: 40px;"></div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const deleteRecon = async (id) => {
    showDialog('confirm', 'Annuler la Clôture', "Êtes-vous sûr de vouloir supprimer ce rapport de clôture ? Les factures qui y étaient liées redeviendront non-clôturées.", async () => {
       // Find and unflag associated orders
       const affectedOrders = orders.filter(o => o.reconciliationId === id);
       for(let o of affectedOrders) {
          const updated = {...o};
          delete updated.reconciliationId;
          await dbOrders.setItem(o.id, updated);
       }
       // Remove reconciliation
       await dbReconciliations.removeItem(id);
       refreshData();
    });
  }

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-warning)' }}>Gestion Inventaire et Clôture</h2>
      
      {/* Reconciliation Form */}
      <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--border-radius-lg)', marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Clôture de Service en Cours</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
           <div>
             <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Date de Service</label>
             <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '1.1rem', width: '100%' }} />
           </div>
           <div>
             <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Serveur/Vendeur</label>
             <select 
               value={selectedServer} 
               onChange={e => setSelectedServer(e.target.value)}
               style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '1.1rem', width: '100%' }}
             >
               {staff.length === 0 && <option value="">Aucun personnel enregistré</option>}
               {staff.map(w => <option key={w.id} value={w.name}>{w.name} {w.role === 'admin' ? '(Gérant)' : ''}</option>)}
             </select>
           </div>
        </div>

        {selectedServer && dateOrders.length === 0 && (
           <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>
             Toutes les ventes de ce serveur pour cette date ont déjà été clôturées (ou aucune n'existe).
           </div>
        )}

        {selectedServer && dateOrders.length > 0 && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: '12px' }}>
                 <h4 style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📋 Détail des Ventes à Clôturer</h4>
                 <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                       <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)' }}>
                          <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                             <th style={{ padding: '0.5rem' }}>Heure</th>
                             <th style={{ padding: '0.5rem' }}>ID Ticket</th>
                             <th style={{ padding: '0.5rem', textAlign: 'right' }}>Montant</th>
                          </tr>
                       </thead>
                       <tbody>
                          {dateOrders.map(o => (
                             <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{new Date(o.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{o.id.substring(0, 8)}...</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{Number(o.total).toFixed(2)} {config.currency}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '1.5rem', borderRadius: '12px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mouvement système total :</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{Number(expectedAmount || 0).toFixed(2)} {config.currency}</span>
                 </div>
              
              <div>
                <label style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fonds Physiquement Remis par le Serveur :</label>
                <input 
                  type="number" 
                  value={actualCash} 
                  onChange={e => setActualCash(e.target.value)} 
                  placeholder="Ex: 50.00" 
                  style={{ width: '100%', maxWidth: '300px', fontSize: '1.5rem', padding: '1rem', borderColor: 'var(--color-primary)' }} 
                />
              </div>

              {actualCash !== '' && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                    <span style={{ fontSize: '1.2rem' }}>Écart / Variance :</span>
                    <span style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 'bold', 
                      color: (parseFloat(actualCash) - expectedAmount) < 0 ? 'var(--color-danger)' : ((parseFloat(actualCash) - expectedAmount) > 0 ? 'var(--color-primary)' : 'white') 
                    }}>
                       {(parseFloat(actualCash) - expectedAmount) > 0 ? '+' : ''}{(parseFloat(actualCash) - expectedAmount).toFixed(2)} {config.currency}
                    </span>
                 </div>
              )}

              <button className="btn btn-primary" onClick={handleReconcile} disabled={actualCash === ''}>
                 ✅ Valider la Clôture et Sécuriser ces factures
              </button>
            </div>
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: '1.5rem' }}>Historique des Clôtures (Écarts d'Inventaire)</h3>
      <div className="glass" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>ID & Heure</th>
              <th style={{ padding: '1rem' }}>Date Opération</th>
              <th style={{ padding: '1rem' }}>Serveur</th>
              <th style={{ padding: '1rem' }}>Attendu</th>
              <th style={{ padding: '1rem' }}>Remis</th>
              <th style={{ padding: '1rem' }}>Écart</th>
              <th style={{ padding: '1rem', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reconciliations.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{r.id.substring(0, 10)}... <br/><span style={{ color: 'var(--text-muted)' }}>{new Date(r.timestamp).toLocaleTimeString()}</span></td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{r.date}</td>
                <td style={{ padding: '1rem' }}>{r.serverName}</td>
                <td style={{ padding: '1rem' }}>{Number(r.expectedAmount || 0).toFixed(2)}{config.currency}</td>
                <td style={{ padding: '1rem' }}>{Number(r.actualAmount || 0).toFixed(2)}{config.currency}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: Number(r.variance || 0) < 0 ? 'var(--color-danger)' : (Number(r.variance || 0) > 0 ? 'var(--color-primary)' : 'inherit') }}>
                  {Number(r.variance || 0) > 0 ? '+' : ''}{Number(r.variance || 0).toFixed(2)}{config.currency}
                </td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button className="btn-icon-only" style={{ color: 'var(--color-primary)' }} onClick={() => handlePrint(r)} title="Imprimer">🖨️</button>
                     <button className="btn-icon-only" style={{ color: 'var(--color-danger)' }} onClick={() => deleteRecon(r.id)} title="Supprimer">🗑️</button>
                   </div>
                </td>
              </tr>
            ))}
            {reconciliations.length === 0 && (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun rapport de clôture généré.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpensesView({ expenses, refreshData, config, onSync, showDialog }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], category: 'Achats', amount: '', description: '' });

  const categories = ['Loyer', 'Personnel', 'Transport', 'Achats', 'Énergie', 'Taxes', 'Autre'];

  const handleOpen = (exp) => {
    if(exp) { setEditingId(exp.id); setFormData(exp); }
    else { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], category: 'Achats', amount: '', description: '' }); }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if(!formData.amount || !formData.description) { showDialog('alert', 'Données Incomplètes', 'Veuillez remplir le montant et la description de la charge.'); return; }
    const exp = {
      id: editingId || `EXP-${Date.now()}`,
      ...formData,
      amount: parseFloat(formData.amount),
      timestamp: editingId ? formData.timestamp : new Date().toISOString(),
      synced: false
    };
    await dbExpenses.setItem(exp.id, exp);
    refreshData();
    setIsModalOpen(false);
    if (onSync) onSync();
  };

  const handleDelete = async (id) => {
    showDialog('confirm', 'Suppression Dépense', 'Supprimer cette dépense de la comptabilité ?', async () => {
      await dbExpenses.removeItem(id);
      refreshData();
      if (onSync) onSync();
    });
  };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-danger)' }}>Gestion des Dépenses (Sorties de caisse)</h2>
      <button className="btn btn-primary" onClick={() => handleOpen()} style={{ marginBottom: '2rem', backgroundColor: 'var(--color-danger)' }}>➕ Enregistrer une Charge</button>
      
      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass" style={{ width: '90%', maxWidth: '500px', padding: '2rem', borderRadius: 'var(--border-radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{color:'var(--color-danger)'}}>{editingId ? 'Modifier la charge' : 'Ajouter une charge'}</h3>
            
            <label style={{ color: 'var(--text-muted)' }}>Date d'exécution</label>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            
            <label style={{ color: 'var(--text-muted)' }}>Catégorie de dépense</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '0.75rem', backgroundColor:'var(--bg-app)', color:'var(--text-primary)', border:'1px solid var(--border-color)', borderRadius:'8px' }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            
            <label style={{ color: 'var(--text-muted)' }}>Montant d'argent décaissé</label>
            <input type="number" placeholder="Ex: 25.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            
            <label style={{ color: 'var(--text-muted)' }}>Description ou Motif</label>
            <input type="text" placeholder="Ex: Achat de 5 casiers de sucré..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--color-danger)' }} onClick={handleSave}>Valider Dépense</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
            <tr><th style={{padding:'1rem'}}>Date</th><th style={{padding:'1rem'}}>Catégorie</th><th style={{padding:'1rem'}}>Motif</th><th style={{padding:'1rem'}}>Montant</th><th style={{padding:'1rem', width:'120px'}}>Actions</th></tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{padding:'1rem'}}>{exp.date}</td>
                <td style={{padding:'1rem'}}><b>{exp.category}</b></td>
                <td style={{padding:'1rem'}}>{exp.description}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '1.2rem' }}>{Number(exp.amount || 0).toFixed(2)}{config.currency}</td>
                <td style={{padding:'1rem'}}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button className="btn-icon-only" onClick={() => handleOpen(exp)}>✏️</button> 
                     <button className="btn-icon-only" onClick={() => handleDelete(exp.id)} style={{color:'var(--color-danger)'}}>🗑️</button>
                   </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune dépense enregistrée dans l'inventaire.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportView({ orders, expenses, reconciliations, config }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const [startDate, setStartDate] = useState(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // General Filter
  const filterByDate = (arr, dateField) => arr.filter(item => {
    let d = item[dateField];
    if (!d) return false;
    if (d.includes('T')) {
       // Convert ISO string back to local date correctly to match inputs
       try {
         const dt = new Date(d);
         if (isNaN(dt.getTime())) return false;
         d = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
       } catch (e) { return false; }
    } else {
       // Support 'Y-m-d H:i:s' from server (lexicographical fix)
       d = d.split(' ')[0];
    }
    return d >= startDate && d <= endDate;
  });

  const periodOrders = filterByDate(orders, 'timestamp');
  const periodExpenses = filterByDate(expenses, 'date');
  const periodRecs = filterByDate(reconciliations, 'date');

  const totalSales = periodOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalExpenses = periodExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalVariance = periodRecs.reduce((s, r) => s + (Number(r.variance) || 0), 0);

  const netResult = totalSales + totalVariance - totalExpenses;
  const isProfit = netResult >= 0;

  const formatMoney = (val) => Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportXLS = () => {
    const tableHtml = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <h2 style="color: #4f46e5;">RAPPORT FINANCIER (${config.restaurantName})</h2>
          <p><b>Période analytique du:</b> ${startDate} <b>au:</b> ${endDate}</p>
          
          <h3>RÉSUMÉ DU BILAN</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th align="left" bgcolor="#f3f4f6">Ventes Brutes POS</th><td align="right">${totalSales}</td></tr>
            <tr><th align="left" bgcolor="#fee2e2">Dépenses (Sorties)</th><td align="right">-${totalExpenses}</td></tr>
            <tr><th align="left" bgcolor="#fef08a">Écarts de Caisse</th><td align="right">${totalVariance}</td></tr>
            <tr><th align="left" bgcolor="${isProfit ? '#dcfce7' : '#fee2e2'}"><b>RÉSULTAT NET</b></th><td align="right"><b>${netResult}</b></td></tr>
          </table>
          <br/>
          
          <h3>DÉTAILS DES DÉPENSES (SORTIES CAISSE)</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr bgcolor="#f3f4f6"><th>Date</th><th>Catégorie</th><th>Motif</th><th>Montant Mouvement</th></tr>
            </thead>
            <tbody>
              ${periodExpenses.map(e => `<tr><td>${e.date}</td><td><b>${e.category}</b></td><td>${e.description}</td><td align="right">${e.amount}</td></tr>`).join('')}
            </tbody>
          </table>
          <br/>
          
          <h3>DÉTAILS DES CLÔTURES DE SERVICE (ÉCARTS)</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr bgcolor="#f3f4f6"><th>Date</th><th>Serveur / Agent</th><th>Chiffre d'Affaires Attendu</th><th>Fonds Réellement Remis</th><th>Écart Constaté</th></tr>
            </thead>
            <tbody>
              ${periodRecs.map(r => `<tr><td>${r.date}</td><td><b>${r.serverName}</b></td><td align="right">${r.expectedAmount}</td><td align="right">${r.actualAmount}</td><td align="right" style="color:${r.variance<0?'red':(r.variance>0?'green':'black')}">${r.variance}</td></tr>`).join('')}
            </tbody>
          </table>
          <br/>
          <p><i>Généré par RestoBKV POS le : ${new Date().toLocaleString()}</i></p>
        </body>
      </html>
    `;
    
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, `Bilan_Financier_${startDate}_au_${endDate}.xls`);
    } else {
      link.href = URL.createObjectURL(blob);
      link.download = `Bilan_Financier_${startDate}_au_${endDate}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    const html = `
      <html>
        <head>
          <title>Bilan Financier</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 10px; }
            .card { border: 1px solid #ccc; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
            .profit { color: green; font-weight: bold; }
            .loss { color: red; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${config.restaurantName} - Bilan Financier</h2>
            <p>Période analytique du <b>${startDate}</b> au <b>${endDate}</b></p>
          </div>
          
          <div class="summary">
             <div class="card">
                <h3>Ventes POS</h3>
                <p>${formatMoney(totalSales)} ${config.currency}</p>
             </div>
             <div class="card">
                <h3>Dépenses</h3>
                <p class="loss">-${formatMoney(totalExpenses)} ${config.currency}</p>
             </div>
             <div class="card">
                <h3>Écarts (Caisse)</h3>
                <p class="${totalVariance<0?'loss':(totalVariance>0?'profit':'')}">${totalVariance>0?'+':''}${formatMoney(totalVariance)} ${config.currency}</p>
             </div>
             <div class="card" style="border-width: 2px; border-color: ${isProfit?'green':'red'}">
                <h3>RÉSULTAT NET</h3>
                <p class="${isProfit?'profit':'loss'}">${isProfit?'+':''}${formatMoney(netResult)} ${config.currency}</p>
             </div>
          </div>

          <h3>Détail des Dépenses (Sorties)</h3>
          <table>
            <thead><tr><th>Date</th><th>Catégorie</th><th>Motif</th><th style="text-align:right">Montant</th></tr></thead>
            <tbody>
              ${periodExpenses.map(e => `<tr><td>${e.date}</td><td><b>${e.category}</b></td><td>${e.description}</td><td style="text-align:right">${formatMoney(e.amount)} ${config.currency}</td></tr>`).join('')}
              ${periodExpenses.length === 0 ? '<tr><td colspan="4" style="text-align:center">Aucune dépense enregistrée</td></tr>' : ''}
            </tbody>
          </table>

          <h3>Détail des Clôtures de Service (Écarts)</h3>
          <table>
            <thead><tr><th>Date</th><th>Serveur</th><th style="text-align:right">C.A. Attendu</th><th style="text-align:right">Fonds Remis</th><th style="text-align:right">Écart Constaté</th></tr></thead>
            <tbody>
              ${periodRecs.map(r => `<tr><td>${r.date}</td><td>${r.serverName}</td><td style="text-align:right">${formatMoney(r.expectedAmount)} ${config.currency}</td><td style="text-align:right">${formatMoney(r.actualAmount)} ${config.currency}</td><td style="text-align:right" class="${r.variance<0?'loss':(r.variance>0?'profit':'')}">${formatMoney(r.variance)} ${config.currency}</td></tr>`).join('')}
              ${periodRecs.length === 0 ? '<tr><td colspan="5" style="text-align:center">Aucune clôture validée</td></tr>' : ''}
            </tbody>
          </table>
          <p style="text-align:center; font-size:12px; margin-top:40px; color:gray;">Généré par RestoBKV POS le : ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>📈 Bilan Fonctionnel & Résultat Net (P&L)</h2>
      
      <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)', marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
         <div>
            <label style={{ display:'block', color:'var(--text-muted)' }}>Du (Date de début)</label>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{ padding:'0.75rem', borderRadius:'8px', backgroundColor:'var(--bg-app)', color:'var(--text-primary)', border:'1px solid var(--border-color)', fontSize:'1.1rem'}} />
         </div>
         <div style={{ alignSelf: 'center', fontSize: '1.5rem', color: 'var(--text-muted)' }}>⟶</div>
         <div>
            <label style={{ display:'block', color:'var(--text-muted)' }}>Au (Date de fin)</label>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{ padding:'0.75rem', borderRadius:'8px', backgroundColor:'var(--bg-app)', color:'var(--text-primary)', border:'1px solid var(--border-color)', fontSize:'1.1rem'}} />
         </div>
         <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={printReport}>🖨️ Imprimer / PDF</button>
            <button className="btn btn-primary" style={{ backgroundColor: '#107c41', color: 'white', border: 'none' }} onClick={exportXLS}>📊 Télécharger Bilan Excel (.xls)</button>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>💼 Ventes Brutes POS</p>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', wordBreak: 'break-all', lineHeight: '1.2' }}>{formatMoney(totalSales)} <span style={{fontSize:'1rem'}}>{config.currency}</span></div>
          <p style={{ color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>+ Entrée ({periodOrders.length} tickets)</p>
        </div>

        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>💸 Achats & Dépenses</p>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--color-danger)', wordBreak: 'break-all', lineHeight: '1.2' }}>-{formatMoney(totalExpenses)} <span style={{fontSize:'1rem'}}>{config.currency}</span></div>
          <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.5rem' }}>- Sortie ({periodExpenses.length} charges)</p>
        </div>

        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>⚠️ Écarts de Caisse Validés</p>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: totalVariance < 0 ? 'var(--color-danger)' : 'var(--color-warning)', wordBreak: 'break-all', lineHeight: '1.2' }}>
             {totalVariance > 0 ? '+' : ''}{formatMoney(totalVariance)} <span style={{fontSize:'1rem'}}>{config.currency}</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{(totalVariance >= 0 ? '+ Surprise/Surplus' : '- Manquant/Perte')} ({periodRecs.length} clôtures)</p>
        </div>
        
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: `2px solid ${isProfit ? 'var(--color-primary)' : 'var(--color-danger)'}`, backgroundColor: isProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>💳 RÉSULTAT NET (Cash-Flow)</p>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: isProfit ? 'var(--color-primary)' : 'var(--color-danger)', wordBreak: 'break-all', lineHeight: '1.1' }}>
             {isProfit ? '+' : ''}{formatMoney(netResult)} <span style={{fontSize:'1.2rem'}}>{config.currency}</span>
          </div>
          <p style={{ color: 'var(--text-primary)', marginTop: '0.5rem', fontWeight:'bold' }}>{isProfit ? '🎉 Marge Positive (Bénéfice)' : '📉 Marge Négative (Déficit)'}</p>
        </div>
      </div>
    </div>
  );
}

export default Admin;
