import { useState, useEffect } from 'react'
import Login from './screens/Login'
import MaestroDashboard from './screens/MaestroDashboard'
import SecretariaDashboard from './screens/SecretariaDashboard'
import AppUpdater from './screens/AppUpdater'
import { supabase } from './supabaseClient'

function App() {
  const [user, setUser] = useState(null) // null | 'maestro' | 'secretaria'
  const [loading, setLoading] = useState(true)

  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let isMounted = true;
    console.log("App mounted, checking status...");
    
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Loading timeout reached. Forcing stop loading.");
        setLoading(false);
        setErrorMsg("El servidor de Supabase tarda demasiado. Verifica tu conexión.");
      }
    }, 10000);

    const checkUser = async (session) => {
      try {
        if (session?.user) {
          await fetchRole(session.user.id);
          if (isMounted) clearTimeout(timeout);
        } else {
          if (isMounted) {
            setUser(null);
            setLoading(false);
            clearTimeout(timeout);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Fallo de conexión o perfil incompleto:", err);
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    };

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session get error:", error);
      }
      checkUser(session);
    });

    // 2. Auth changes listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setLoading(false);
          clearTimeout(timeout);
        }
      } else if (session?.user) {
        // Handle SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION
        checkUser(session);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const fetchRole = async (userId) => {
    try {
      console.log("Fetching role for:", userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Profile DB error:", error);
        throw error;
      }
      
      console.log("Profile data:", profile);
      if (profile) {
        setUser(profile.role);
      } else {
        console.warn("No entry in profiles table for this user.");
        setErrorMsg("Usuario autenticado pero sin rol asignado en la base de datos.");
      }
    } catch (err) {
      console.error("Error in fetchRole:", err);
      setErrorMsg("Error al obtener perfil: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = (role) => {
    setUser(role)
  }

  const handleLogout = async () => {
    console.log("Starting logout process...");
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error during logout:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      // Redirigir a la URL del proyecto usando la base de Vite
      const basePath = import.meta.env.BASE_URL || '/agenda-kike/';
      window.location.replace(window.location.origin + basePath);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', flexDirection: 'column', gap: '20px' }}>
      <div className="loader"></div>
      <p>Cargando Sistema...</p>
      {/* Si tarda mucho, mostrar un botón para reintentar */}
      <button onClick={() => window.location.reload()} className="btn" style={{ background: '#111', color: 'var(--gold-accent)', padding: '10px', width: '100%', borderRadius: '12px', fontSize: '0.9rem' }}>Actualizar Sistema ahora</button>
    </div>;
  }

  if (errorMsg) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ef4444', flexDirection: 'column', padding: '20px', textAlign: 'center' }}>
      <h2 className="MysticTitle">Aviso del Sistema</h2>
      <p style={{ color: 'white', marginBottom: '20px' }}>{errorMsg}</p>
      <button onClick={() => window.location.reload()} className="btn" style={{ maxWidth: '200px' }}>Volver a Cargar</button>
    </div>;
  }

  return (
    <div className="app-container">
      <AppUpdater />
      {!user && <Login />}
      {user === 'maestro' && <MaestroDashboard onLogout={handleLogout} />}
      {user === 'secretaria' && <SecretariaDashboard onLogout={handleLogout} />}
    </div>
  )
}

export default App
