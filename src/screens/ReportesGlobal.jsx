import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatPeruDate, getPeruDateString } from '../utils/dateFormatter';
import { fetchAllTickets } from '../services/reportes';
import { subscribeToTickets } from '../services/api';

function ReportesGlobal() {
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith('/secretaria') ? '/secretaria/reportes' : '/maestro/reportes';
  const dashboardPath = location.pathname.startsWith('/secretaria') ? '/secretaria' : '/maestro';

  const onBack = () => navigate(dashboardPath);

  const activeTab = location.pathname.includes('/historial') ? 'historial' : 'reportes';
  const idMatch = location.pathname.match(/\/historial\/(.+)$/);
  const selectedClientIdFromUrl = activeTab === 'historial' && idMatch ? idMatch[1] : null;

  const [allTickets, setAllTickets] = useState([]);
  
  useEffect(() => {
    const loadTickets = async () => {
      const dbTickets = await fetchAllTickets();
      setAllTickets(dbTickets);
    };
    loadTickets();
    const subscription = subscribeToTickets(loadTickets);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Paginación
  const [limitTickets, setLimitTickets] = useState(20);

  // Filtros Reportes
  const [filterModule, setFilterModule] = useState('Todos');
  const [filterMethod, setFilterMethod] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [quickDateFilter, setQuickDateFilter] = useState('');

  // Filtros rápidos
  const applyQuickDate = (type) => {
    setQuickDateFilter(type);
    
    const now = new Date();
    // Obtener la fecha base en formato local
    const limaNowString = new Date().toLocaleString("en-US", { timeZone: "America/Lima" });
    const limaDate = new Date(limaNowString); 

    if (type === 'hoy') {
      const d = getPeruDateString(now);
      setDateFrom(d);
      setDateTo(d);
    } else if (type === '7dias') {
      const past = new Date(now);
      past.setDate(now.getDate() - 7);
      setDateFrom(getPeruDateString(past));
      setDateTo(getPeruDateString(now));
    } else if (type === 'mes') {
      const y = limaDate.getFullYear();
      const m = limaDate.getMonth();
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      
      const formatLocal = (d) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      };
      
      setDateFrom(formatLocal(start));
      setDateTo(formatLocal(end));
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Historial Search
  const [searchQuery, setSearchQuery] = useState('');

  // Derived selectedClient from URL params
  const selectedClient = useMemo(() => {
    if (!selectedClientIdFromUrl) return null;
    
    // Group allTickets specifically for this client ID
    const decodedId = decodeURIComponent(selectedClientIdFromUrl);
    const ticketsForClient = allTickets.filter(t => t.client_id === decodedId || (t.titular_name || t.name) === decodedId);
    
    if (ticketsForClient.length > 0) {
      const first = ticketsForClient[0];
      const titularName = first.titular_name || first.name;
      return { client_id: first.client_id, name: titularName, phone: first.phone, tickets: ticketsForClient };
    }
    return null;
  }, [selectedClientIdFromUrl, allTickets]);

  // Derivations para Reportes
  const filteredTickets = useMemo(() => {
    return allTickets.filter(t => {
      if (filterModule !== 'Todos' && t.module !== filterModule) return false;
      if (filterMethod !== 'Todos' && t.method !== filterMethod) return false;
      if (filterStatus !== 'Todos' && t.status !== filterStatus) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [filterModule, filterMethod, filterStatus, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let soles = 0;
    let dolares = 0;
    let pending = 0;
    let completed = 0;
    const clients = new Set();

    filteredTickets.forEach(t => {
      clients.add(t.name);
      if (t.status === 'Pendiente') pending++;
      if (t.status === 'Completado') completed++;

      const val = parseFloat(t.price) || 0;
      if (t.method === 'Yape / Plin' || t.method === 'Transferencia') {
        soles += val;
      } else if (t.method === 'PayPal' || t.method === 'Western Union') {
        dolares += val;
      }
    });

    return { soles, dolares, pending, completed, uniqueClients: clients.size, total: filteredTickets.length };
  }, [filteredTickets]);

  const chartData = useMemo(() => {
    const days = {};
    filteredTickets.forEach(t => {
      const val = parseFloat(t.price) || 0;
      if (t.method === 'Objetivo') return; // no suma
      if (!days[t.date]) days[t.date] = 0;
      days[t.date] += val; // sumamos un ratio crudo para graficar el volumen
    });

    const sortedDates = Object.keys(days).sort();
    if (sortedDates.length === 0) return [];

    const maxVal = Math.max(...Object.values(days), 1);

    // Limitar a los ultimos 10 items por espaciado en movil
    const recent = sortedDates.slice(-10);

    return recent.map(date => ({
      date: date.substring(5), // mm-dd
      value: days[date],
      height: (days[date] / maxVal) * 100
    }));
  }, [filteredTickets]);

  // Derivaciones para Historial
  const clientResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQ = searchQuery.toLowerCase();

    // Agrupar por titular
    const map = {};
    allTickets.forEach(t => {
      const titularName = t.titular_name || t.name;
      const matchName = titularName.toLowerCase().includes(lowerQ);
      const matchPhone = t.phone && t.phone.includes(lowerQ);
      const matchBen = t.isBeneficiary && t.name.toLowerCase().includes(lowerQ);
      
      if (matchName || matchPhone || matchBen) {
        const key = t.client_id || titularName;
        if (!map[key]) {
          map[key] = { client_id: t.client_id, name: titularName, phone: t.phone, tickets: [] };
        }
        map[key].tickets.push(t);
      }
    });

    return Object.values(map);
  }, [searchQuery, allTickets]);

  const renderReportes = () => (
    <div className="animate-fade-in">
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 className="MysticTitle" style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--gold-accent)' }}>Filtros</h3>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', WebkitOverflowScrolling: 'touch' }}>
          <button className={`badge ${quickDateFilter === 'hoy' ? 'badge-gold' : 'badge-purple'}`} onClick={() => applyQuickDate('hoy')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Hoy</button>
          <button className={`badge ${quickDateFilter === '7dias' ? 'badge-gold' : 'badge-purple'}`} onClick={() => applyQuickDate('7dias')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>7 Días</button>
          <button className={`badge ${quickDateFilter === 'mes' ? 'badge-gold' : 'badge-purple'}`} onClick={() => applyQuickDate('mes')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Este Mes</button>
          <button className="badge" onClick={() => applyQuickDate('todos')} style={{ cursor: 'pointer', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>Restablecer</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>Desde</label>
            <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>Hasta</label>
            <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }} />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: '12px' }}>
          <select className="input-field" value={filterModule} onChange={e => setFilterModule(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }}>
            <option value="Todos">Todos los Módulos</option>
            <option value="La Velada">La Velada</option>
            <option value="Consultas TikTok">Consultas TikTok</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <select className="input-field" value={filterMethod} onChange={e => setFilterMethod(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }}>
              <option value="Todos">Todos los Métodos</option>
              <option value="Yape / Plin">Yape / Plin</option>
              <option value="Transferencia">Transferencia</option>
              <option value="PayPal">PayPal</option>
              <option value="Western Union">Western Union</option>
              <option value="Objetivo">Objetivo</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }}>
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Completado">Completados</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '24px', margin: 0, gridColumn: 'span 2', animation: 'mysticGlow 6s infinite alternate' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--gold-accent)', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingresos Registrados</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Soles (S/)</p>
              <p className="MysticTitle" style={{ fontSize: '2.2rem', fontWeight: '700', margin: 0, color: '#F8FAFC' }}>
                {stats.soles.toFixed(0)}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontFamily: 'Outfit' }}>.{(stats.soles % 1).toFixed(2).substring(2)}</span>
              </p>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'rgba(212, 175, 55, 0.3)' }}></div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dólares ($)</p>
              <p className="MysticTitle" style={{ fontSize: '2.2rem', fontWeight: '700', margin: 0, color: '#FDE047' }}>
                {stats.dolares.toFixed(0)}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontFamily: 'Outfit' }}>.{(stats.dolares % 1).toFixed(2).substring(2)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tickets Totales</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{stats.total}</p>
        </div>
        <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clientes Totales</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--purple-accent)' }}>{stats.uniqueClients}</p>
        </div>
        <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ef4444' }}>{stats.pending}</p>
        </div>
        <div className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completados</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--success)' }}>{stats.completed}</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 className="MysticTitle" style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-main)' }}>Ingresos por Día</h3>
        <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '12px', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', position: 'relative' }}>
          {chartData.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', alignSelf: 'center' }}>Sin datos para graficar</div>
          ) : (
            chartData.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                <div style={{ paddingBottom: '4px', opacity: 0 }} className="chart-tooltip tooltip-overlay">{d.value}</div>
                <div style={{
                  width: '100%',
                  background: 'linear-gradient(180deg, var(--gold-accent), transparent)',
                  height: `${Math.max(d.height, 5)}%`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '2px',
                  display: 'flex',
                  justifyContent: 'center',
                  transition: 'height 0.4s ease'
                }}></div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', position: 'absolute', bottom: '-20px', whiteSpace: 'nowrap' }}>{d.date}</span>
              </div>
            ))
          )}
        </div>
        <div style={{ height: '16px' }}></div>
      </div>

      <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tickets Filtrados ({filteredTickets.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredTickets.slice(0, limitTickets).map(t => (
          <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', borderLeft: `2px solid ${t.module === 'La Velada' ? 'var(--gold-accent)' : 'var(--purple-accent)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600' }}>{t.name}</span>
              <span style={{ color: t.status === 'Completado' ? 'var(--success)' : '#ef4444', fontSize: '0.85rem' }}>{t.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>{formatPeruDate(t.created_at || t.completed_at || t.date)} • <span className={`badge ${t.module === 'La Velada' ? 'badge-gold' : 'badge-purple'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-block', margin: '0 4px', verticalAlign: 'middle' }}>{t.module}</span></span>
              <span style={{ color: t.method === 'Objetivo' ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: '600' }}>{t.method === 'PayPal' || t.method === 'Western Union' ? '$' : 'S/.'}{t.price}</span>
            </div>
          </div>
        ))}
        {filteredTickets.length > limitTickets && (
          <button
            className="btn-outline"
            onClick={() => setLimitTickets(limitTickets + 20)}
            style={{ width: '100%', padding: '12px', fontSize: '0.9rem', marginTop: '8px', borderColor: 'rgba(212, 175, 55, 0.3)', color: 'var(--gold-accent)' }}
          >
            Ver Más ({filteredTickets.length - limitTickets} restantes)
          </button>
        )}
      </div>
    </div>
  );

  const renderFicha = () => {
    if (!selectedClient) return null;
    const clientTickets = selectedClient.tickets;
    let soles = 0; let dolares = 0;
    let vcount = 0; let tcount = 0;

    clientTickets.forEach(t => {
      if (t.module === 'La Velada') vcount++;
      if (t.module === 'Consultas TikTok') tcount++;
      const val = parseFloat(t.price) || 0;
      if (t.method === 'Yape / Plin' || t.method === 'Transferencia') soles += val;
      if (t.method === 'PayPal' || t.method === 'Western Union') dolares += val;
    });

    return (
      <div className="animate-fade-in card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
        <div style={{ background: 'var(--bg-panel)', padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="MysticTitle" style={{ fontSize: '1.6rem', margin: 0 }}>{selectedClient.name}</h2>
              <p style={{ color: 'var(--gold-accent)', fontSize: '0.9rem', marginTop: '4px', letterSpacing: '0.05em' }}>📞 {selectedClient.phone}</p>
            </div>
            <button onClick={() => navigate(`${basePath}/historial`)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Tickets</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{clientTickets.length}</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inversión (S/ & $)</p>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--success)' }}>
                S/ {soles.toFixed(0)} <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span> ${dolares.toFixed(0)}
              </p>
            </div>
            <div style={{ background: 'rgba(212, 175, 55, 0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--gold-accent)', textTransform: 'uppercase' }}>La Velada</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gold-accent)' }}>{vcount}</p>
            </div>
            <div style={{ background: 'rgba(167, 139, 250, 0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--purple-accent)', textTransform: 'uppercase' }}>TikTok</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--purple-accent)' }}>{tcount}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cronología</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {clientTickets.map((t, idx) => (
              <div key={idx} style={{ paddingLeft: '16px', borderLeft: `2px solid ${t.module === 'La Velada' ? 'var(--gold-accent)' : 'var(--purple-accent)'}`, position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: t.module === 'La Velada' ? 'var(--gold-accent)' : 'var(--purple-accent)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatPeruDate(t.created_at || t.completed_at || t.date)}</span>
                  <span className={`badge ${t.module === 'La Velada' ? 'badge-gold' : 'badge-purple'}`} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>{t.module}</span>
                </div>
                {t.isBeneficiary && <div style={{ margin: '8px 0', fontSize: '0.95rem', color: t.module === 'La Velada' ? 'var(--gold-accent)' : 'var(--purple-accent)' }}>Servicio para beneficiario: <strong>{t.name}</strong></div>}
                <div style={{ margin: '8px 0', fontSize: '0.95rem' }}>{t.notes}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: t.status === 'Completado' ? 'var(--success)' : '#ef4444' }}>Estado: {t.status}</span>
                  <span style={{ color: t.method === 'Objetivo' ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: '600' }}>{t.method === 'PayPal' || t.method === 'Western Union' ? '$' : 'S/.'}{t.price} ({t.method})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHistorial = () => (
    <div className="animate-fade-in">
      {!selectedClient ? (
        <>
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: '1.05rem', padding: '18px 24px', borderRadius: 'var(--radius-xl)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', borderColor: 'var(--gold-light)' }}
            />
          </div>

          <div style={{ marginTop: '24px' }}>
            {searchQuery.trim() === '' ? (
              <div className="text-center" style={{ color: 'var(--text-muted)', marginTop: '40px' }}>Escribe un nombre o teléfono para buscar en el historial.</div>
            ) : clientResults.length === 0 ? (
              <div className="text-center" style={{ color: 'var(--text-muted)', marginTop: '40px' }}>No se encontraron clientes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Resultados ({clientResults.length})</h3>
                {clientResults.map((client, idx) => (
                  <div key={idx} onClick={() => navigate(`${basePath}/historial/${encodeURIComponent(client.client_id || client.name)}`)} className="card" style={{ padding: '20px', cursor: 'pointer', marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 className="MysticTitle" style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{client.name}</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📞 {client.phone} • {client.tickets.length} tickets registrados</div>
                    </div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--gold-accent)' }}>→</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        renderFicha()
      )}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* BG Effects */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>

      <header style={{ padding: '40px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={onBack} style={{ padding: '8px', fontSize: '1.2rem', color: 'var(--text-main)' }}>←</button>
          <div>
            <h1 className="MysticTitle" style={{ fontSize: '2rem', margin: 0 }}>Gestión y Data</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Reportes e Historial</p>
          </div>
        </div>
      </header>

      <div style={{ padding: '0 24px 12px', zIndex: 10 }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-xl)', padding: '6px', position: 'relative' }}>
          <button
            onClick={() => navigate(basePath)}
            style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'reportes' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(180, 148, 42, 0.9))' : 'transparent', color: activeTab === 'reportes' ? '#020617' : 'var(--text-muted)', borderRadius: '24px', fontWeight: '600', transition: 'all 0.3s ease', cursor: 'pointer' }}
          >
            Reportes
          </button>
          <button
            onClick={() => navigate(`${basePath}/historial`)}
            style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'historial' ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(180, 148, 42, 0.9))' : 'transparent', color: activeTab === 'historial' ? '#020617' : 'var(--text-muted)', borderRadius: '24px', fontWeight: '600', transition: 'all 0.3s ease', cursor: 'pointer' }}
          >
            Historial de Cliente
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 24px 40px', zIndex: 10 }}>
        {activeTab === 'reportes' ? renderReportes() : renderHistorial()}
      </div>
    </div>
  );
}

export default ReportesGlobal;
