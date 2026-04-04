import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { formatPeruDate, getLast7DaysPeru, getPeruDateString } from '../utils/dateFormatter';
import { fetchTiktokTickets, completeTicketStatus, fetchClientHistory, subscribeToTickets } from '../services/api';

function MaestroTiktok() {
  const navigate = useNavigate();
  const location = useLocation();


  const historyMatch = location.pathname.match(/\/historial\/(.+)$/);
  const historyClientId = historyMatch ? historyMatch[1] : null;

  const [tickets, setTickets] = useState([]);
  const [completedTickets, setCompletedTickets] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const basePath = location.pathname.startsWith('/secretaria') ? '/secretaria/tiktok' : '/maestro/tiktok';
  const dashboardPath = location.pathname.startsWith('/secretaria') ? '/secretaria' : '/maestro';

  const onBack = () => navigate(dashboardPath);


  const openHistory = (id) => navigate(`${location.pathname}/historial/${id}`);
  
  const closeHistory = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(location.pathname.replace(/\/historial\/.+$/, ''));
    }
  };

  const loadData = async () => {
    try {
      const data = await fetchTiktokTickets();
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
            <h2 className="MysticTitle" style={{ marginBottom: 0, fontSize: '1.8rem' }}>Consultas TikTok</h2>
          </div>
          <button 
            className="btn-outline"
            onClick={() => {
              if (isCompleted) navigate(basePath);
              else navigate(`${basePath}/completados`);
            }} 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem', borderColor: 'var(--purple-light)', color: 'var(--purple-accent)', background: 'rgba(167, 139, 250, 0.05)' }}
          >
            {isCompleted ? 'Volver a Pendientes' : 'Ver Completados'}
          </button>
        </header>

        <div>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '20px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isCompleted ? 'Consultas Completadas' : 'Consultas Pendientes'}
          </h3>
        
        {visibleTickets.length === 0 && (
          <div className="card text-center" style={{ padding: '40px 20px' }}>
            No hay consultas {isCompleted ? 'completadas' : 'pendientes'}
          </div>
        )}

        {isCompleted ? (
          <div>
            {Object.entries(completedTickets.reduce((acc, t) => {
              const dbDate = new Date(t.completed_at || t.created_at);
              const d = getPeruDateString(dbDate);
              if (!acc[d]) acc[d] = [];
              acc[d].push(t);
              return acc;
            }, {})).map(([date, tks]) => (
              <div key={date} style={{ marginBottom: '32px' }}>
                <h4 style={{ color: 'var(--purple-accent)', marginBottom: '16px', fontSize: '1.1rem', paddingBottom: '8px', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  {(() => {
                    const [y, m, d] = date.split('-');
                    return `${d}/${m}/${y}`;
                  })()}
                </h4>
                {tks.map(ticket => (
                  <div key={ticket.id} className="card ticket-card-tiktok" style={{ opacity: 0.85 }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {formatPeruDate(ticket.completed_at || ticket.created_at || ticket.date)}
                        </div>
                        <h3 className="MysticTitle" style={{ fontSize: '1.6rem', marginBottom: '0px', wordBreak: 'break-word', lineHeight: '1.2' }}>{ticket.name}</h3>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div className="badge badge-purple" style={{ marginBottom: '4px' }}>
                          {ticket.type}
                        </div>
                      </div>
                    </div>
                    {historyClientId === ticket.client_id && (
                      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--purple-accent)' }}>Historial del Cliente</h4>
                        {loadingHistory ? (
                          <div style={{ textAlign: 'center', padding: '20px' }}><div className="loader" style={{ display: 'inline-block' }}></div></div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {historyData.map(t => (
                              <div key={t.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.date}</span>
                                  <span style={{ fontSize: '0.8rem', color: t.status === 'Completado' ? 'var(--success)' : 'var(--purple-accent)', textTransform: 'uppercase', fontWeight: '600' }}>{t.status}</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-main)' }}>
                                  {t.name}
                                </div>
                                <div className="badge badge-purple" style={{ display: 'inline-block', marginBottom: '4px', fontSize: '0.75rem', padding: '2px 8px' }}>{t.module}</div>
                              </div>
                            ))}
                            {historyData.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay tickets para este cliente.</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="card ticket-card-tiktok">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {formatPeruDate(ticket.completed_at || ticket.created_at || ticket.date)}
                  </div>
                  
                  {ticket.isAdditional && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--purple-accent)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>{ticket.isBeneficiary ? `Pedido Adicional: ${ticket.titular_name}` : 'Pedido Adicional'}</span>
                      <button onClick={() => {
                        if (historyClientId === ticket.client_id) {
                          closeHistory();
                        } else {
                          openHistory(ticket.client_id);
                        }
                      }} style={{ background: 'linear-gradient(135deg, var(--purple-accent), #7c3aed)', border: 'none', color: '#FFF', fontWeight: 'bold', borderRadius: '12px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(167, 139, 250, 0.3)' }}>
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

                  {!ticket.isAdditional && (
                    <div style={{ marginTop: '10px' }}>
                      <button onClick={() => {
                        if (historyClientId === ticket.client_id) {
                          closeHistory();
                        } else {
                          openHistory(ticket.client_id);
                        }
                      }} style={{ background: 'linear-gradient(135deg, var(--purple-accent), #7c3aed)', border: 'none', color: '#FFF', fontWeight: 'bold', borderRadius: '12px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(167, 139, 250, 0.3)' }}>
                        {historyClientId === ticket.client_id ? 'Cerrar Historial' : 'Ver Historial'}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div className="badge badge-purple" style={{ marginBottom: '4px' }}>
                    {ticket.type}
                  </div>
                </div>
              </div>

            <div className="note-block" style={{ border: '1px solid rgba(167, 139, 250, 0.15)' }}>
              <span style={{ color: 'var(--purple-accent)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Notas:</span>
              {ticket.notes}
            </div>

              {!isCompleted && (
                <button 
                  onClick={() => completeTicket(ticket.id)}
                  className="btn" 
                  style={{ marginTop: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))', color: '#020617', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)'}
                >
                  ✔ Marcar como Completado
                </button>
              )}
              {historyClientId === ticket.client_id && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--purple-accent)' }}>Historial del Cliente</h4>
                  {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><div className="loader" style={{ display: 'inline-block' }}></div></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {historyData.map(t => (
                        <div key={t.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.date}</span>
                            <span style={{ fontSize: '0.8rem', color: t.status === 'Completado' ? 'var(--success)' : 'var(--purple-accent)', textTransform: 'uppercase', fontWeight: '600' }}>{t.status}</span>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-main)' }}>
                            {t.name}
                          </div>
                          <div className="badge badge-purple" style={{ display: 'inline-block', marginBottom: '4px', fontSize: '0.75rem', padding: '2px 8px' }}>{t.module}</div>
                        </div>
                      ))}
                      {historyData.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay tickets para este cliente.</div>}
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

export default MaestroTiktok;
