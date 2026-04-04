import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AppUpdater() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    let currentVersion = null;

    const checkUpdate = async () => {
      if (document.hidden) return; // Evitar disparar si la pestaña no está visible
      try {
        const basePath = import.meta.env.BASE_URL || '/agenda-kike/';
        const res = await fetch(`${basePath}version.json?t=${new Date().getTime()}`);
        if (!res.ok) return;

        const data = await res.json();

        if (!currentVersion) {
          // Fijar la versión que cargó inicialmente
          currentVersion = data.version;
        } else if (data.version && currentVersion !== data.version) {
          // Detecta un cambio en el version.json del servidor
          setHasUpdate(true);
        }
      } catch (err) {
        console.error('Error comprobando versión:', err);
      }
    };
    
    // Validar inmediatamente al montar
    checkUpdate(); 

    // Chequeo periódico cada 5 minutos exactos
    const interval = setInterval(checkUpdate, 300000);

    // Chequeo activo justo cuando el usuario regresa a la pestaña (focus o cambia visibilidad)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate();
      }
    };
    
    window.addEventListener('focus', checkUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      // Destruir sesión y estado local
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
    } catch(err) {
      console.error(err);
    } finally {
      // Recargar completamente cortando el caché
      window.location.reload(true);
    }
  };

  if (!hasUpdate) return null;

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.95), rgba(180, 148, 42, 0.95))', padding: '16px 20px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', border: '1px solid var(--gold-light)' }}>
      <p style={{ color: '#111', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', fontSize: '0.85rem' }}>Nueva actualización disponible</p>
      <button onClick={handleUpdate} className="btn" style={{ background: '#111', color: 'var(--gold-accent)', padding: '10px', width: '100%', borderRadius: '12px', fontSize: '0.9rem' }}>
        Actualizar ahora
      </button>
    </div>
  );
}
