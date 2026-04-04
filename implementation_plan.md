# Migración a Sistema de Enrutamiento 100% React Router

## User Review Required

> [!IMPORTANT]
> El objetivo de este plan es eliminar la dependencia de `window.location.href`, los `location.pathname.includes()` y los redireccionamientos infinitos (o cierres) con el botón Atrás del celular. **NO modificaré estilos, lógica de base de datos ni interfaz**. Todo será puro componente de enrutamiento y cambios en cómo se intercalan las vistas. Por favor revisa y aprueba para comenzar la ejecución.

## Proposed Changes

### Vite & Entorno

#### [MODIFY] `vite.config.js`
- Cambiar `base: "/agenda-kike"` por `base: "/agenda-kike/"`.

#### [MODIFY] `src/main.jsx`
- Configurar `<HashRouter basename={import.meta.env.BASE_URL}>` para envolver la app, reemplazando el `<HashRouter>` sin parámetros.

---

### Enrutamiento Core

#### [MODIFY] `src/App.jsx`
- Eliminar por completo el uso de `window.location.href = ...` en el `handleLogout`.
- Ahora usaremos `await supabase.auth.signOut();` y dejaremos que el `onAuthStateChange` detecte el `SIGNED_OUT` y actúe consecuentemente devolviéndonos al `Login` a través del router de React.
- Simplificar las rutas de validación de autenticación, retirando trucos innecesarios con props `replace={...}` que confunden al historial.

---

### Dashboards (Rutas Relativas)

#### [MODIFY] `src/screens/MaestroDashboard.jsx` & `src/screens/SecretariaDashboard.jsx`
- Reemplazar `<Route path="/velada/*">` por `<Route path="velada/*">` (quitando el slash inicial) para asegurar el comportamiento correcto en rutas anidadas de React Router v6.
- Reemplazar `<Route path="/">` manual por `<Route index element={...} />`.

---

### Módulos Principales (Sustituir Includes por `<Routes>`)

En estos componentes, el renderizado de (TicketList, NuevoTicket, NuevaVela, Completados, etc.) se manejaba con una variable `const view = ...` que espiaba `location.pathname.includes()`. Se eliminará por completo y se envolverá el retorno del componente principal con un bloque `<Routes>`, donde cada sub-flujo existirá como elemento independiente. 

#### [MODIFY] `src/screens/SecretariaVelada.jsx`
- Se estructurará el return así:
  ```jsx
  <Routes>
     <Route index element={<ListadoTicketsActivos />} />
     <Route path="nuevo-ticket" element={<NuevoTicketForm />} />
     <Route path="nueva-vela" element={<NuevaVelaForm />} />
     <Route path="historial/:id" element={<ListadoTicketsActivosConHistorialModal />} />
  </Routes>
  ```

#### [MODIFY] `src/screens/SecretariaTiktok.jsx`
- Mismo enfoque:
  ```jsx
  <Routes>
     <Route index element={<ListadoTiktok />} />
     <Route path="nueva-pregunta" element={<NuevaPreguntaForm />} />
     <Route path="agregar-rapido" element={<AgregarRapidoForm />} />
     <Route path="historial/:id" element={<ListadoTiktokConHistorialModal />} />
  </Routes>
  ```

#### [MODIFY] `src/screens/MaestroVelada.jsx`
- Eliminaremos el booleano `viewCompleted` calculado en base al URL, y usaremos las rutas:
  ```jsx
  <Routes>
    <Route index element={<ListadoPendientes />} />
    <Route path="historial/:id" element={<ListadoPendientesConHistorialModal />} />
    <Route path="completados" element={<ListadoCompletados />} />
    <Route path="completados/historial/:id" element={<ListadoCompletadosConHistorialModal />} />
  </Routes>
  ```

#### [MODIFY] `src/screens/MaestroTiktok.jsx`
- Idéntico a Maestro Velada.

#### [MODIFY] `src/screens/ReportesGlobal.jsx`
- Cambiar la asignación activa condicional del navbar por un bloque con `<Routes>` que alterne el `<div className="card">` de Reportes Analíticos con el módulo paramétrico de Búsqueda de Historial.

## Open Questions

Ninguna. La instrucción es muy clara y específica, solo espero confirmación para evitar que queden resabios de `window.location`.

## Verification Plan

### Manual Verification
1. Navegar al dashboard y entrar a Secretaria > La Velada.
2. Hacer click en "Nuevo Ticket" (la URL cambiará a `.../nuevo-ticket`).
3. Presionar el botón ATRÁS *del navegador* (o celular) -> Debería volver a La Velada transparente, sin sacar de la app ni hacer refetch completo de Windows.
4. Finalizar con el Logout, observando que vuelve a Login limpiamente y si se presiona "Adelante" del navegador, rebota en login.
