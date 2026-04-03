import React, { useEffect, useState } from 'react';

export default function AppUpdater() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    let currentScripts = '';
    const checkUpdate = async () => {
      try {
        const res = await fetch('/?t=' + new Date().getTime());
        const html = await res.text();
        // Extract script sources to avoid false positives with other small dynamic elements
        const scriptsMatch = html.match(/<script.+?src="(.+?)".*?>/g)?.join('') || html;
        
        if (!currentScripts) {
          currentScripts = scriptsMatch;
        } else if (scriptsMatch !== currentScripts) {
          setHasUpdate(true);
        }
      } catch (err) {
        console.error('Error checking update', err);
      }
    };
    
    checkUpdate(); // initial baseline
    const interval = setInterval(checkUpdate, 60000 * 2); // 2 minutos
    return () => clearInterval(interval);
  }, []);

  if (!hasUpdate) return null;

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.95), rgba(180, 148, 42, 0.95))', padding: '16px 20px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', border: '1px solid var(--gold-light)' }}>
      <p style={{ color: '#111', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', fontSize: '0.85rem' }}>Hay una nueva versión disponible</p>
      <button onClick={() => window.location.reload(true)} className="btn" style={{ background: '#111', color: 'var(--gold-accent)', padding: '10px', width: '100%', borderRadius: '12px', fontSize: '0.9rem' }}>Actualizar Sistema</button>
    </div>
  );
}
