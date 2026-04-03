import React, { useState } from 'react';
import fotoLogin from '../assets/foto_login.webp';
import { supabase } from '../supabaseClient';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const [isRecovering, setIsRecovering] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (isRecovering) {
      if (!username) {
        setErrorMsg('Por favor ingresa tu correo');
        return;
      }
      const basePath = import.meta.env.BASE_URL || '/agenda-kike/';
      const { error } = await supabase.auth.resetPasswordForEmail(username, {
        redirectTo: window.location.origin + (basePath.startsWith('/') ? '' : '/') + basePath,
      });
      if (error) {
        setErrorMsg('Error al enviar correo de recuperación: ' + error.message);
      } else {
        setSuccessMsg('Revisa tu bandeja para el enlace de recuperación.');
        setIsRecovering(false);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password
    });

    if (error) {
      setErrorMsg('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="animate-fade-in" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      paddingBottom: '40px',
      position: 'relative'
    }}>

      {/* Premium Image Header */}
      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
        <div style={{
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.2), 0 0 0 2px rgba(212, 175, 55, 0.4)',
          marginBottom: '24px',
          background: 'var(--bg-panel)'
        }}>
          <img src={fotoLogin} alt="Maestro" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 className="MysticTitle" style={{ fontSize: '2.5rem', margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>LOGIN</h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: '400', marginTop: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
          AGENDA PRIVADA
        </p>
      </div>

      {/* Form Container */}
      <div style={{ padding: '40px 24px', zIndex: 10 }}>
        <form onSubmit={handleSubmit} className="card" style={{ padding: '32px 24px', animation: 'mysticGlow 6s infinite alternate' }}>
          <div className="input-group">
            <label className="input-label">Usuario o Correo</label>
            <input
              type="text"
              className="input-field"
              placeholder=""
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {!isRecovering && (
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label className="input-label">Contraseña</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isRecovering}
              />
            </div>
          )}

          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</div>}
          {successMsg && <div style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{successMsg}</div>}

          <button type="submit" className="btn" style={{ marginBottom: '12px' }}>
            {isRecovering ? 'Enviar Recuperación' : 'Acceder al Sistema'}
          </button>
          
          <button 
            type="button" 
            onClick={() => { setIsRecovering(!isRecovering); setErrorMsg(''); setSuccessMsg(''); }} 
            className="btn-outline" 
            style={{ width: '100%', padding: '12px', fontSize: '0.85rem', border: 'none', background: 'transparent' }}
          >
            {isRecovering ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
          </button>
        </form>
      </div>

    </div>
  );
}

export default Login;
