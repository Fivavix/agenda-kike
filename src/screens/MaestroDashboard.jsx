import React, { useState, useEffect } from 'react';
import { fetchTicketStats, subscribeToTickets } from '../services/api';
import MaestroVelada from './MaestroVelada';
import MaestroTiktok from './MaestroTiktok';
import ReportesGlobal from './ReportesGlobal';
import SettingsModal from './SettingsModal';
import { useMobileBack } from '../hooks/useMobileBack';

function MaestroDashboard({ onLogout }) {
  const [activeView, setActiveView] = useState('home');
  const [showSettings, setShowSettings] = useState(false);

  const [stats, setStats] = useState({ pendings: 0, completed: 0, velada: 0, tiktok: 0 });

  useMobileBack(activeView !== 'home', () => setActiveView('home'));

  useEffect(() => {
    if (activeView === 'home') {
      const loadStats = () => fetchTicketStats().then(setStats);
      loadStats();
      const subscription = subscribeToTickets(loadStats);
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeView]);

  if (activeView === 'velada') {
    return <MaestroVelada onBack={() => setActiveView('home')} />;
  }

  if (activeView === 'tiktok') {
    return <MaestroTiktok onBack={() => setActiveView('home')} />;
  }

  if (activeView === 'reportes') {
    return <ReportesGlobal onBack={() => setActiveView('home')} />;
  }

  return (
    <div className="animate-fade-in" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #020617 0%, #0B1120 100%)',
      color: '#F8FAFC',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Mystical Background Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', top: '40%', right: '-20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(50px)', zIndex: 0 }}></div>

      <header style={{ 
        padding: '40px 24px 30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        position: 'relative',
        zIndex: 10
      }}>
        <div>
          <h1 className="MysticTitle" style={{ 
            fontSize: '2.2rem', 
            margin: 0, 
            background: 'linear-gradient(to right, #FDE68A, #D4AF37)', 
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.02em',
            fontWeight: '700'
          }}>
            Hola, Maestro Kike
          </h1>
          <p style={{ 
            color: '#94A3B8', 
            fontSize: '0.95rem', 
            marginTop: '6px', 
            letterSpacing: '0.05em',
            fontWeight: '300',
            textTransform: 'uppercase'
          }}>
            Tus pendientes de hoy
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setShowSettings(true)} style={{ 
            background: 'none', 
            color: '#64748B', 
            border: 'none', 
            padding: '8px 0', 
            fontSize: '0.85rem', 
            cursor: 'pointer',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.color = '#FFF'}
          onMouseOut={(e) => e.target.style.color = '#64748B'}>
            Ajustes
          </button>
          
          <button onClick={onLogout} style={{ 
            background: 'none', 
            color: '#64748B', 
            border: 'none', 
            padding: '8px 0', 
            fontSize: '0.85rem', 
            cursor: 'pointer',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.color = '#ef4444'}
          onMouseOut={(e) => e.target.style.color = '#64748B'}>
            Salir
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div style={{ padding: '10px 24px 40px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 10 }}>
        
        {/* Resumen */}
        <div style={{ marginBottom: '8px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '16px', color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Resumen General
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</p>
              <p style={{ fontSize: '2.2rem', fontWeight: '700', color: '#ef4444', textShadow: '0 2px 10px rgba(239, 68, 68, 0.2)' }}>{stats.pendings}</p>
            </div>
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completados</p>
              <p style={{ fontSize: '2.2rem', fontWeight: '700', color: '#10B981', textShadow: '0 2px 10px rgba(16, 185, 129, 0.2)' }}>{stats.completed}</p>
            </div>
          </div>
        </div>
        
        {/* Leyenda sutil superior (opcional para jerarquía) */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '16px', color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Módulos
          </h3>
        
        {/* Velada Card */}
        <div onClick={() => setActiveView('velada')} style={{ 
          cursor: 'pointer', 
          padding: '28px', 
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          animation: 'mysticGlow 4s infinite alternate',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          e.currentTarget.style.border = '1px solid rgba(212, 175, 55, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.border = '1px solid rgba(212, 175, 55, 0.15)';
        }}>
          <div>
            <h2 className="MysticTitle" style={{ fontSize: '1.8rem', color: '#FFF', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              La Velada
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500', letterSpacing: '0.05em' }}>
              <span style={{ marginRight: '8px', fontSize: '1rem' }}>✦</span> {stats.velada} pendientes
            </div>
          </div>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #DFB943, #B4942A)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#020617', 
            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
            fontSize: '1.2rem',
            transition: 'transform 0.3s'
          }}>
            →
          </div>
        </div>

        {/* TikTok Card */}
        <div onClick={() => setActiveView('tiktok')} style={{ 
          cursor: 'pointer', 
          padding: '28px', 
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(9, 9, 11, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          animation: 'purpleGlow 5s infinite alternate-reverse',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.15)';
        }}>
          <div>
            <h2 className="MysticTitle" style={{ fontSize: '1.8rem', color: '#FFF', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Consultas TikTok
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(139, 92, 246, 0.1)', color: '#A78BFA', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500', letterSpacing: '0.05em' }}>
              <span style={{ marginRight: '8px', fontSize: '1rem' }}>✦</span> {stats.tiktok} pendientes
            </div>
          </div>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#FFF', 
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            fontSize: '1.2rem',
            transition: 'transform 0.3s'
          }}>
            →
          </div>
        </div>

        {/* Reportes Card */}
        <div onClick={() => setActiveView('reportes')} style={{ 
          cursor: 'pointer', 
          padding: '28px', 
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(9, 9, 11, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.15)';
        }}>
          <div>
            <h2 className="MysticTitle" style={{ fontSize: '1.8rem', color: '#FFF', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Reportes e Historial
            </h2>
            <div style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
              Ingresos, métricas y datos CRM
            </div>
          </div>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #10B981, #059669)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#020617', 
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            fontSize: '1.2rem',
            transition: 'transform 0.3s'
          }}>
            →
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}

export default MaestroDashboard;
