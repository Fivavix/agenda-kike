import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function SettingsModal({ onClose }) {

  const [activeTab, setActiveTab] = useState('password'); // 'password' or 'email'
  
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      if (activeTab === 'password') {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMsg({ text: 'Contraseña actualizada con éxito', type: 'success' });
        setPassword('');
      } else {
        if (!email.includes('@')) throw new Error('Correo inválido');
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        setMsg({ text: 'Revisa tu nuevo correo para confirmar el cambio', type: 'success' });
        setEmail('');
      }
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '24px', margin: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="MysticTitle" style={{ fontSize: '1.5rem', margin: 0 }}>Preferencias</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </header>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-xl)', padding: '6px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('password')}
            style={{ flex: 1, padding: '10px 0', border: 'none', background: activeTab === 'password' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(180, 148, 42, 0.9))' : 'transparent', color: activeTab === 'password' ? '#020617' : 'var(--text-muted)', borderRadius: '24px', fontWeight: '600', transition: 'all 0.3s ease', cursor: 'pointer' }}
          >
            Contraseña
          </button>
          <button
            onClick={() => setActiveTab('email')}
            style={{ flex: 1, padding: '10px 0', border: 'none', background: activeTab === 'email' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(180, 148, 42, 0.9))' : 'transparent', color: activeTab === 'email' ? '#020617' : 'var(--text-muted)', borderRadius: '24px', fontWeight: '600', transition: 'all 0.3s ease', cursor: 'pointer' }}
          >
            Correo
          </button>
        </div>

        <form onSubmit={handleUpdate}>
          {activeTab === 'password' ? (
            <div className="input-group">
              <label className="input-label">Nueva Contraseña</label>
              <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Nuevo Correo Electrónico</label>
              <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="nuevo@correo.com" />
            </div>
          )}

          {msg.text && (
            <div style={{ color: msg.type === 'error' ? '#ef4444' : 'var(--success)', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', marginTop: '8px' }}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
