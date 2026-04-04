import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { formatPeruDate, getLast7DaysPeru, getPeruDateString } from '../utils/dateFormatter';
import { fetchVelaTickets, toggleVelaStatus, completeTicketStatus, fetchClientHistory, subscribeToTickets } from '../services/api';

function MaestroVelada() {
  const navigate = useNavigate();
  const location = useLocation();


  const historyMatch = location.pathname.match(/\/historial\/(.+)$/);
  const historyClientId = historyMatch ? historyMatch[1] : null;

  const [tickets, setTickets] = useState([]);
  const [completedTickets, setCompletedTickets] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const basePath = location.pathname.startsWith('/secretaria') ? '/secretaria/velada' : '/maestro/velada';
  const dashboardPath = location.pathname.startsWith('/secretaria') ? '/secretaria' : '/maestro';

  const onBack = () => navigate(dashboardPath);
  

  const openHistory = (id) => navigate(`${location.pathname}/historial/${id}`);
  
  // We can use navigate(-1) so physical back button is equivalent
  const closeHistory = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(location.pathname.replace(/\/historial\/.+$/, ''));
    }
  };

  const loadData = async () => {
    try {
      const data = await fetchVelaTickets();
      const sortedData = data.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
      
      setTickets(sortedData.filter(t => t.status !== 'Completado'));
      
      const last7Days = getLast7DaysPeru();
      setCompletedTickets(sortedData.filter(t => {
        if (t.status !== 'Completado') return false;
        const dbDate = new Date(t.completed_at || t.created_at);
        const dateStr = getPeruDateString(dbDate);
        return last7Days.includes(dateStr);
      }).sort((a,b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const subscription = subscribeToTickets(loadData);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (historyClientId) {
      setLoadingHistory(true);
      fetchClientHistory(historyClientId).then(data => {
        setHistoryData(data);
        setLoadingHistory(false);
      }).catch(err => {
        setLoadingHistory(false);
        console.error(err);
      });
    }
  }, [historyClientId]);

  const toggleVela = async (ticketId, velaId, isCompleted) => {
    const newStatus = !isCompleted;
    await toggleVelaStatus(velaId, newStatus);
    loadData();
  };

  const handleCompleteClick = (ticket) => {
    if (ticket.velas && ticket.velas.length > 0) {
      const allChecked = ticket.velas.every(v => v.is_completed);
      if (!allChecked) {
        alert('Debes marcar todas las velas antes de poder completar el ticket.');
        return;
      }
    }
    completeTicket(ticket.id);
  };

  const completeTicket = async (ticketId) => {
    await completeTicketStatus(ticketId);
    loadData();
  };

  const renderList = (isCompleted) => {
    const visibleTickets = isCompleted ? completedTickets : tickets;
    
    return (
      <div className="animate-fade-in" style={{ padding: '24px', paddingBottom: '80px' }}>
        <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-secondary" onClick={onBack} style={{ padding: '8px', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              ←
            </button>
            <h2 className="MysticTitle" style={{ marginBottom: 0, fontSize: '1.8rem' }}>La Velada</h2>
          </div>
          <button 
            className="btn-outline"
            onClick={() => {
              if (isCompleted) navigate(basePath);
              else navigate(`${basePath}/completados`);
            }} 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem', borderColor: 'var(--gold-light)', color: 'var(--gold-accent)' }}
          >
            {isCompleted ? 'Volver a Pendientes' : 'Ver Completados'}
          </button>
        </header>

        <div>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '20px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isCompleted ? 'Tickets Completados' : 'Tickets Pendientes'}
          </h3>
        
        {visibleTickets.length === 0 && (
          <div className="card text-center" style={{ padding: '40px 20px' }}>
            No hay tickets {isCompleted ? 'completados' : 'pendientes'}
          </div>
        )}

        {isCompleted ? (
          <div>
            {Object.entries(visibleTickets.reduce((acc, t) => {
              const dbDate = new Date(t.completed_at || t.created_at);
              const d = getPeruDateString(dbDate);
              if (!acc[d]) acc[d] = [];
              acc[d].push(t);
              return acc;
            }, {})).map(([date, tks]) => (
              <div key={date} style={{ marginBottom: '32px' }}>
                <h4 style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '1.1rem', paddingBottom: '8px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  {(() => {
                    const [y, m, d] = date.split('-');
                    return `${d}/${m}/${y}`;
                  })()}
                </h4>
                {tks.map(ticket => (
                  <div key={ticket.id} className="card ticket-card" style={{ opacity: 0.85, marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {formatPeruDate(ticket.completed_at || ticket.created_at || ticket.date)}
                        </div>
                        <h3 className="MysticTitle" style={{ fontSize: '1.6rem', marginBottom: '0px', wordBreak: 'break-word', lineHeight: '1.2' }}>{ticket.name}</h3>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right', marginTop: '8px' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--gold-accent)' }}>
                          {ticket.method === 'PayPal' || ticket.method === 'Western Union' ? '$' : 'S/. '}{ticket.price}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase' }}>{ticket.method}</div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '20px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '600' }}>Velas Colocadas</p>
                      {ticket.velas.map(vela => (
                        <div key={vela.id} style={{ 
                          display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', 
                          marginBottom: '8px', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.3)'
                        }}>
                          <span style={{ color: 'var(--success)', marginRight: '12px', fontSize: '1.2rem' }}>✔</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '1.05rem', textDecoration: 'line-through' }}>
                            {vela.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          visibleTickets.map(ticket => (
            <div key={ticket.id} className="card ticket-card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {formatPeruDate(ticket.completed_at || ticket.created_at || ticket.date)}
                  </div>
                  
                  {ticket.isAdditional && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--gold-accent)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>{ticket.isBeneficiary ? `Pedido Adicional: ${ticket.titular_name}` : 'Pedido Adicional'}</span>
                      <button onClick={() => {
                        if (historyClientId === ticket.client_id) {
                          closeHistory();
                        } else {
                          openHistory(ticket.client_id);
                        }
                      }} style={{ background: 'linear-gradient(135deg, var(--gold-accent), #cf9b13)', border: 'none', color: '#111', fontWeight: 'bold', borderRadius: '12px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)' }}>
                        {historyClientId === ticket.client_id ? 'Cerrar Historial' : 'Historial'}
                      </button>
                    </div>
                  )}
                  
                  <h3 className="MysticTitle" style={{ fontSize: '1.6rem', marginBottom: '0px', wordBreak: 'break-word', lineHeight: '1.2' }}>{ticket.name}</h3>
                  <a 
                    href={`https://wa.me/${ticket.phone?.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: 'var(--success)', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', marginTop: '6px', fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px' }}
                  >
                    <span style={{ marginRight: '6px' }}>📞</span> {ticket.phone}
                  </a>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', marginTop: '8px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--gold-accent)' }}>
                    {ticket.method === 'PayPal' || ticket.method === 'Western Union' ? '$' : 'S/. '}{ticket.price}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase' }}>{ticket.method}</div>
                </div>
              </div>

              <div className="note-block">
                <span style={{ color: 'var(--gold-accent)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Petitorio:</span>
                {ticket.notes || 'No hay petitorio'}
              </div>

              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '600' }}>Velas a encender</p>
                {ticket.velas.map(vela => (
                  <label key={vela.id} style={{ 
                    display: 'flex', alignItems: 'center', padding: '16px', borderRadius: 'var(--radius-md)', 
                    marginBottom: '8px', cursor: 'pointer', 
                    background: vela.is_completed ? 'rgba(212, 175, 55, 0.05)' : 'rgba(0,0,0,0.3)',
                    border: vela.is_completed ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                    transition: 'all 0.3s ease'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={vela.is_completed}
                      onChange={() => toggleVela(ticket.id, vela.id, vela.is_completed)}
                      style={{ width: '22px', height: '22px', marginRight: '16px', accentColor: 'var(--gold-accent)' }}
                    />
                    <span style={{ textDecoration: vela.is_completed ? 'line-through' : 'none', color: vela.is_completed ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '1.05rem' }}>
                      {vela.name}
                    </span>
                  </label>
                ))}
              </div>

              <button 
                onClick={() => handleCompleteClick(ticket)}
                className="btn" 
                style={{ marginTop: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))', color: '#020617', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)'}
              >
                ✔ Marcar como Completado
              </button>

              {historyClientId === ticket.client_id && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--gold-accent)' }}>Historial del Cliente</h4>
                  {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><div className="loader" style={{ display: 'inline-block' }}></div></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {historyData.filter(h => getLast7DaysPeru().includes(getPeruDateString(new Date(h.created_at)))).map(t => (
                        <div key={t.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {t.date} - {new Date(t.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: t.status === 'Completado' ? 'var(--success)' : 'var(--gold-accent)', textTransform: 'uppercase', fontWeight: '600' }}>{t.status}</span>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-main)' }}>
                            {t.name}
                          </div>
                          <div className="badge badge-gold" style={{ display: 'inline-block', marginBottom: '4px', fontSize: '0.75rem', padding: '2px 8px' }}>{t.module}</div>
                        </div>
                      ))}
                      
                      {historyData.length > historyData.filter(h => getLast7DaysPeru().includes(getPeruDateString(new Date(h.created_at)))).length && (
                        <button 
                          onClick={() => navigate(`/reportes/historial/${ticket.client_id}`)} 
                          className="btn-outline" 
                          style={{ marginTop: '8px', fontSize: '0.85rem', padding: '10px' }}
                        >
                          Ver historial completo en Reportes e Historial
                        </button>
                      )}
                      
                      {historyData.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay tickets en los últimos 7 días.</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
    );
  };

  return (
    <Routes>
      <Route index element={renderList(false)} />
      <Route path="completados" element={renderList(true)} />
      <Route path="historial/:id" element={renderList(false)} />
      <Route path="completados/historial/:id" element={renderList(true)} />
      <Route path="*" element={renderList(false)} />
    </Routes>
  );
}

export default MaestroVelada;
