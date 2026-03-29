import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { seedInitialData } from '../lib/db';
import { performSync } from '../lib/sync';

function Login() {
  const [pin, setPin] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const { login, loginError } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Seed offline database to ensure initial users/items exist before login
    seedInitialData();
  }, []);

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setStoreErrorNull(); // Clear error on typing
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setStoreErrorNull();
  };

  const setStoreErrorNull = () => {
    useStore.setState({ loginError: null });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await performSync();
      setSyncStatus('success');
      // Re-seed if needed after sync pull
      await seedInitialData();
      alert("Synchronisation réussie ! Les codes d'accès ont été mis à jour.");
    } catch (error) {
      console.error(error);
      setSyncStatus('error');
      alert("Erreur de synchronisation. Vérifiez l'URL de votre API.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length === 4) {
      const success = await login(pin);
      if (success) {
        navigate('/');
      } else {
        setPin('');
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-app)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass" style={{ width: '400px', padding: '3rem 2rem', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-primary)', borderRadius: '20px', margin: '0 auto 2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
           RB
        </div>
        <h1 style={{ marginBottom: '0.5rem' }}>Connexion</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Entrez votre code confidentiel (PIN)</p>

        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-secondary"
          style={{ marginBottom: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <span style={{ display: 'inline-block', animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
          {isSyncing ? 'Synchronisation...' : 'Synchroniser les accès'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
           {[0, 1, 2, 3].map(i => (
             <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: pin.length > i ? 'var(--color-primary)' : 'var(--bg-surface-elevated)', transition: 'background-color 0.2s' }}></div>
           ))}
        </div>

        {loginError && (
          <div style={{ color: 'var(--color-danger)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--border-radius-sm)' }}>
             {loginError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button 
              key={num} 
              onClick={() => handleKeyPress(num.toString())}
              style={{ height: '70px', fontSize: '1.5rem', fontWeight: '500', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--border-radius-md)' }}
            >
              {num}
            </button>
          ))}
          <button 
             onClick={handleBackspace}
             style={{ height: '70px', fontSize: '1.5rem', backgroundColor: 'transparent', color: 'var(--color-danger)' }}
          >
             ⌫
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            style={{ height: '70px', fontSize: '1.5rem', fontWeight: '500', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--border-radius-md)' }}
          >
            0
          </button>
          <button 
             onClick={() => handleSubmit()}
             style={{ height: '70px', fontSize: '1.5rem', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: 'var(--border-radius-md)' }}
          >
             ✓
          </button>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Codes test: 1234 (Admin), 0000 (Serveur), 1111 (Serveur)
        </div>
      </div>
    </div>
  );
}

export default Login;
