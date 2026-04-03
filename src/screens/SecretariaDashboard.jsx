import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { fetchTicketStats, subscribeToTickets } from '../services/api';
import SecretariaVelada from './SecretariaVelada';
import SecretariaTiktok from './SecretariaTiktok';
import ReportesGlobal from './ReportesGlobal';
import SettingsModal from './SettingsModal';

function SecretariaDashboard({ onLogout }) {
  return (
    <Routes>
      <Route path="/" element={<SecretariaHome onLogout={onLogout} />} />
      <Route path="/velada/*" element={<SecretariaVelada />} />
      <Route path="/tiktok/*" element={<SecretariaTiktok />} />
      <Route path="/reportes/*" element={<ReportesGlobal />} />
    </Routes>
  );
}

function SecretariaHome({ onLogout }) {
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState({ pendings: 0, completed: 0, velada: 0, tiktok: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = () => fetchTicketStats().then(setStats);
    loadStats();
    const subscription = subscribeToTickets(loadStats);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* BG Effects */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>

      <header style={{ padding: '40px 24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
        <div>
          <h1 className="MysticTitle" style={{ fontSize: '2rem', margin: 0 }}>Panel Administrativo</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Secretaria Jorhiña
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setShowSettings(true)} className="btn-outline" style={{ border: 'none', padding: '8px', fontSize: '0.9rem' }}>Ajustes</button>
          <button onClick={onLogout} className="btn-secondary">Salir</button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div style={{ padding: '0 24px 40px', zIndex: 10 }}>

        {/* Resumen */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '16px', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Resumen General
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</p>
              <p style={{ fontSize: '2.2rem', fontWeight: '700', color: '#ef4444', textShadow: '0 2px 10px rgba(239, 68, 68, 0.2)' }}>{stats.pendings}</p>
            </div>
            <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completados</p>
              <p style={{ fontSize: '2.2rem', fontWeight: '700', color: 'var(--success)', textShadow: '0 2px 10px rgba(16, 185, 129, 0.2)' }}>{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Módulos */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '16px', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Gestión de Módulos
          </h3>

          <div className="card" onClick={() => navigate('/secretaria/velada')} style={{ cursor: 'pointer', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 className="MysticTitle" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>La Velada</h4>
              <div className="badge badge-gold"><span style={{ marginRight: '6px' }}>✦</span> {stats.velada} pendientes</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--gold-accent)' }}>→</div>
          </div>

          <div className="card" onClick={() => navigate('/secretaria/tiktok')} style={{ cursor: 'pointer', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h4 className="MysticTitle" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Consultas TikTok</h4>
              <div className="badge badge-purple"><span style={{ marginRight: '6px' }}>✦</span> {stats.tiktok} pendientes</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--purple-accent)' }}>→</div>
          </div>
          
          <div className="card" onClick={() => navigate('/secretaria/reportes')} style={{ cursor: 'pointer', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 className="MysticTitle" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Reportes e Historial</h4>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresos, métricas y datos CRM</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--success)' }}>→</div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SecretariaDashboard;
