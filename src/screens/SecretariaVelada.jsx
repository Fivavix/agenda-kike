import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { formatPeruDate, getLast7DaysPeru, getPeruDateString } from '../utils/dateFormatter';
import { fetchVelaTickets, createVelaTicket, fetchAllClients, deleteTicket, upsertClient, fetchClientHistory, subscribeToTickets } from '../services/api';

function SecretariaVelada() {
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith('/secretaria') ? '/secretaria/velada' : '/maestro/velada';
  const dashboardPath = location.pathname.startsWith('/secretaria') ? '/secretaria' : '/maestro';

  const historyMatch = location.pathname.match(/\/historial\/(.+)$/);
  const historyClientId = historyMatch ? historyMatch[1] : null;

  const [tickets, setTickets] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
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
      const data = await fetchVelaTickets();
      const sortedData = data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      setTickets(sortedData.filter(t => t.status !== 'Completado'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    fetchAllClients().then(setAllClients);
    const subscription = subscribeToTickets(loadData);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initFormData = { client_id: null, name: '', phone: '', price: '', method: 'Yape / Plin', notes: '', velas: [''] };
  const initAddVelaData = { clientSearch: '', newPhone: '', selectedClient: null, samePerson: true, otherName: '', price: '', method: 'Yape / Plin', velas: [''], notes: '' };

  const [formData, setFormData] = useState(initFormData);
  const [addVelaData, setAddVelaData] = useState(initAddVelaData);
  const [showAutoComplete, setShowAutoComplete] = useState(false);

  useEffect(() => {
    if (historyClientId) {
      setLoadingHistory(true);
      fetchClientHistory(historyClientId).then(data => {
        setHistoryData(data);
        setLoadingHistory(false);
      }).catch(err => {
        setLoadingHistory(false);
        alert("Error cargando historial: " + err.message);
      });
    }
  }, [historyClientId]);

  // Navigate functions
  const openNewTicket = () => {
    setFormData(initFormData);
    navigate(`${basePath}/nuevo-ticket`);
  };

  const openNewVela = () => {
    setAddVelaData(initAddVelaData);
    navigate(`${basePath}/nueva-vela`);
  };

  const goToList = () => {
    navigate(basePath);
  };

  const handleDelete = async (ticketId) => {
    if (window.confirm("¿Estás segura de que deseas eliminar el ticket?")) {
      try {
        await deleteTicket(ticketId);
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      } catch (err) {
        alert("Error al eliminar ticket: " + err.message);
      }
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name.trim()) throw new Error("Debes ingresar el nombre del cliente.");
      if (!formData.phone.trim()) throw new Error("Debes ingresar el teléfono del cliente.");
      if (isNaN(parseFloat(formData.price))) throw new Error("El precio debe ser un valor numérico.");
      
      const validVelas = formData.velas.filter(v => v.trim() !== '');
      if (validVelas.length === 0) throw new Error("Debes agregar al menos una vela.");

      let client_id = formData.client_id;
      if (!client_id) {
        client_id = await upsertClient(formData.name, formData.phone);
      }

      await createVelaTicket({
        client_id: client_id,
        titularName: formData.name,
        name: formData.name,
        phone: formData.phone,
        price: formData.price,
        method: formData.method,
        notes: formData.notes,
        velas: validVelas
      });
      goToList();
      loadData();
      fetchAllClients().then(setAllClients);
    } catch (err) {
      alert("Error al guardar ticket: " + err.message);
    }
  };

  const handleSumbitNewVela = async (e) => {
    e.preventDefault();
    try {
      let clientId = addVelaData.selectedClient?.id;
      let titularName = addVelaData.selectedClient?.full_name || addVelaData.clientSearch;
      let phone = addVelaData.selectedClient?.phone || addVelaData.newPhone;

      if (!clientId) {
        if (!titularName.trim()) throw new Error("Debes ingresar un nombre válido.");
        if (!phone.trim()) throw new Error("Debes ingresar el teléfono del nuevo cliente.");
        clientId = await upsertClient(titularName, phone);
      }

      if (isNaN(parseFloat(addVelaData.price))) throw new Error("El precio debe ser numérico.");
      if (!addVelaData.samePerson && !addVelaData.otherName.trim()) throw new Error("Debes ingresar el nombre del beneficiario.");

      const validVelas = addVelaData.velas.filter(v => v.trim() !== '');
      if (validVelas.length === 0) throw new Error("Debes agregar al menos una vela.");

      await createVelaTicket({
        client_id: clientId,
        titularName: titularName,
        beneficiaryName: addVelaData.samePerson ? null : addVelaData.otherName,
        phone: phone,
        price: addVelaData.price,
        method: addVelaData.method,
        notes: addVelaData.notes,
        velas: validVelas
      });
      goToList();
      loadData();
      fetchAllClients().then(setAllClients);
    } catch (err) {
      alert("Error al guardar vela extra: " + err.message);
    }
  };

  const filteredClientsNew = (formData.name.trim().length > 1 || formData.phone.trim().length > 2) && showAutoComplete
    ? allClients.filter(c => 
        (c.full_name && formData.name && c.full_name.toLowerCase().includes(formData.name.toLowerCase())) ||
        (c.phone && formData.phone && c.phone.includes(formData.phone))
      ).slice(0, 5)
    : [];

  const filteredClients = addVelaData.clientSearch.trim().length > 1 && !addVelaData.selectedClient
    ? allClients.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(addVelaData.clientSearch.toLowerCase())) ||
        (c.phone && c.phone.includes(addVelaData.clientSearch))
      ).slice(0, 5)
    : [];

  const renderNewTicket = () => (
      <div className="animate-fade-in p-6">
        <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={goToList} style={{ padding: '8px' }}>←</button>
          <h2 className="MysticTitle" style={{ fontSize: '1.8rem', marginBottom: 0 }}>Nuevo Ticket</h2>
        </header>
        <form onSubmit={handleCreateTicket} className="card">
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Nombre del cliente</label>
            <input type="text" className="input-field" required value={formData.name} onChange={e => {
              setFormData({ ...formData, name: e.target.value, client_id: null });
              setShowAutoComplete(true);
            }} placeholder="Ej. Ana Sosa" autoComplete="off" />
          </div>
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Número de Teléfono</label>
            <input type="tel" className="input-field" required value={formData.phone} onChange={e => {
              setFormData({ ...formData, phone: e.target.value, client_id: null });
              setShowAutoComplete(true);
            }} placeholder="Ej. +51 999 999 999" autoComplete="off" />
            
            {showAutoComplete && filteredClientsNew.length > 0 && !formData.client_id && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid var(--border-light)', borderRadius: '8px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                {filteredClientsNew.map(client => (
                  <div key={client.id} onClick={() => { 
                    setFormData({...formData, client_id: client.id, name: client.full_name, phone: client.phone}); 
                    setShowAutoComplete(false); 
                  }} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s', color: 'white' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: '500' }}>{client.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gold-accent)' }}>{client.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Precio</label>
              <input type="text" className="input-field" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="Ej. 15.00" />
            </div>
            <div className="input-group">
              <label className="input-label">Método de Pago</label>
              <select className="input-field" value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value })} style={{ appearance: 'none', paddingRight: '10px' }}>
                <option>Yape / Plin</option>
                <option>Transferencia</option>
                <option>PayPal</option>
                <option>Western Union</option>
                <option>Objetivo</option>
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Velas</label>
            {formData.velas.map((v, i) => (
              <input key={i} type="text" className="input-field mb-4" value={v} 
              onChange={e => {
                const newVelas = [...formData.velas];
                newVelas[i] = e.target.value;
                setFormData({ ...formData, velas: newVelas });
              }} 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setFormData({ ...formData, velas: [...formData.velas, ''] });
                }
              }}
              placeholder={`Nombre de la vela ${i + 1} (Presiona Enter para agregar otra)`} />
            ))}
            <button type="button" onClick={() => setFormData({ ...formData, velas: [...formData.velas, ''] })} className="btn-secondary" style={{ textAlign: 'left', padding: '8px 0', color: 'var(--gold-accent)' }}>
              + Añadir otra vela
            </button>
          </div>
          <div className="input-group">
            <label className="input-label">Notas</label>
            <textarea className="input-field" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Peticiones o detalles especiales" />
          </div>
          <button type="submit" className="btn mt-4">Guardar Ticket</button>
        </form>
      </div>
    );

  const renderNewVela = () => (
      <div className="animate-fade-in p-6">
        <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={goToList} style={{ padding: '8px' }}>←</button>
          <h2 className="MysticTitle" style={{ fontSize: '1.8rem', marginBottom: 0 }}>Añadir Vela a Cliente Titular</h2>
        </header>

        <form onSubmit={handleSumbitNewVela} className="card" style={{ position: 'relative' }}>
          
          {/* Bloque Autocompletado */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Buscar Titular Existente (Celular o Nombre)</label>
            {addVelaData.selectedClient ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '12px 16px', borderRadius: '8px' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '500' }}>{addVelaData.selectedClient.full_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{addVelaData.selectedClient.phone}</div>
                </div>
                <button type="button" onClick={() => setAddVelaData({...addVelaData, selectedClient: null, clientSearch: ''})} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
              </div>
            ) : (
              <input 
                type="text" 
                className="input-field" 
                value={addVelaData.clientSearch}
                onChange={e => {
                  setAddVelaData({ ...addVelaData, clientSearch: e.target.value });
                  setShowAutoComplete(true);
                }} 
                placeholder="Escribe el nombre o teléfono..." 
                autoComplete="off"
              />
            )}

            {showAutoComplete && filteredClients.length > 0 && !addVelaData.selectedClient && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid var(--border-light)', borderRadius: '8px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                {filteredClients.map(client => (
                  <div key={client.id} onClick={() => { setAddVelaData({...addVelaData, selectedClient: client, clientSearch: client.full_name}); setShowAutoComplete(false); }} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s', color: 'white' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: '500' }}>{client.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gold-accent)' }}>{client.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!addVelaData.selectedClient && (
            <div className="input-group animate-fade-in" style={{ marginTop: '12px' }}>
              <label className="input-label">Teléfono del Titular (Nuevo)</label>
              <input type="tel" className="input-field" required value={addVelaData.newPhone} onChange={e => setAddVelaData({...addVelaData, newPhone: e.target.value})} placeholder="Requerido para crear" />
            </div>
          )}

          <div style={{ marginBottom: '20px', marginTop: '16px' }}>
            <label className="input-label">¿Para quién son estas velas?</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: addVelaData.samePerson ? 'rgba(212,175,55,0.1)' : 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, border: addVelaData.samePerson ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
                <input type="radio" checked={addVelaData.samePerson} onChange={() => setAddVelaData({ ...addVelaData, samePerson: true })} style={{ accentColor: 'var(--gold-accent)' }} />
                Titular
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: !addVelaData.samePerson ? 'rgba(212,175,55,0.1)' : 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, border: !addVelaData.samePerson ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
                <input type="radio" checked={!addVelaData.samePerson} onChange={() => setAddVelaData({ ...addVelaData, samePerson: false })} style={{ accentColor: 'var(--gold-accent)' }} />
                Beneficiario (Familiar/Amigo)
              </label>
            </div>
          </div>

          {!addVelaData.samePerson && (
            <div className="input-group animate-fade-in">
              <label className="input-label">Nombre Visual del Beneficiario</label>
              <input type="text" className="input-field" required value={addVelaData.otherName} onChange={e => setAddVelaData({ ...addVelaData, otherName: e.target.value })} placeholder="Ej. Javier (Hermano)" />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '12px', opacity: addVelaData.selectedClient ? 1 : 0.5, pointerEvents: addVelaData.selectedClient ? 'auto' : 'none' }}>
            <div className="input-group">
              <label className="input-label">Monto cobrado al Titular</label>
              <input type="text" className="input-field" required value={addVelaData.price} onChange={e => setAddVelaData({ ...addVelaData, price: e.target.value })} placeholder="Ej. 10.00" />
            </div>
            <div className="input-group">
              <label className="input-label">Método de Pago</label>
              <select className="input-field" value={addVelaData.method} onChange={e => setAddVelaData({ ...addVelaData, method: e.target.value })} style={{ appearance: 'none', paddingRight: '10px' }}>
                <option>Yape / Plin</option>
                <option>Transferencia</option>
                <option>PayPal</option>
                <option>Western Union</option>
                <option>Otro</option>
              </select>
            </div>
          </div>
          
          <div className="input-group" style={{ opacity: addVelaData.selectedClient ? 1 : 0.5, pointerEvents: addVelaData.selectedClient ? 'auto' : 'none' }}>
            <label className="input-label">Velas a asignar a este ticket</label>
            {addVelaData.velas.map((v, i) => (
              <input key={i} type="text" className="input-field mb-4" value={v} 
              onChange={e => {
                const newVelas = [...addVelaData.velas];
                newVelas[i] = e.target.value;
                setAddVelaData({ ...addVelaData, velas: newVelas });
              }} 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setAddVelaData({ ...addVelaData, velas: [...addVelaData.velas, ''] });
                }
              }}
              placeholder={`Nombre de la vela ${i + 1} (Presiona Enter para agregar otra)`} />
            ))}
            <button type="button" onClick={() => setAddVelaData({ ...addVelaData, velas: [...addVelaData.velas, ''] })} className="btn-secondary" style={{ textAlign: 'left', padding: '8px 0', color: 'var(--gold-accent)' }}>
              + Añadir otra vela
            </button>
          </div>

          <div className="input-group" style={{ opacity: addVelaData.selectedClient ? 1 : 0.5, pointerEvents: addVelaData.selectedClient ? 'auto' : 'none' }}>
            <label className="input-label">Notas al Maestro</label>
            <textarea className="input-field" rows="2" value={addVelaData.notes} onChange={e => setAddVelaData({ ...addVelaData, notes: e.target.value })} placeholder="Detalles de la petición" />
          </div>

          <button type="submit" disabled={!addVelaData.selectedClient} className="btn mt-4" style={{ filter: !addVelaData.selectedClient ? 'grayscale(1)' : 'none' }}>Generar Ticket Vinculado</button>
        </form>
      </div>
    );

  const renderList = () => (
    <div className="animate-fade-in" style={{ padding: '24px', paddingBottom: '80px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={onBack} style={{ padding: '8px', fontSize: '1.2rem', color: 'var(--text-main)' }}>←</button>
          <h2 className="MysticTitle" style={{ marginBottom: 0, fontSize: '1.8rem' }}>La Velada</h2>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button className="btn" onClick={openNewTicket} style={{ fontSize: '0.95rem', padding: '14px', flex: 1, boxShadow: 'none' }}>
          + Cliente Nuevo
        </button>
        <button className="btn-outline" onClick={openNewVela} style={{ width: 'auto', flex: 1, padding: '14px', fontSize: '0.95rem' }}>
          + Titular Existente
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '20px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tickets Activos
        </h3>

        {tickets.map(ticket => (
          <div key={ticket.id} className="card ticket-card" style={{ position: 'relative' }}>
            <button onClick={() => handleDelete(ticket.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, padding: '4px' }}>✕</button>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px', paddingRight: '32px' }}>
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

                {!ticket.isAdditional && (
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={() => {
                        if (historyClientId === ticket.client_id) {
                          closeHistory();
                        } else {
                          openHistory(ticket.client_id);
                        }
                      }} style={{ background: 'linear-gradient(135deg, var(--gold-accent), #cf9b13)', border: 'none', color: '#111', fontWeight: 'bold', borderRadius: '12px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)' }}>
                      {historyClientId === ticket.client_id ? 'Cerrar Historial' : 'Ver Historial'}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right', marginTop: '8px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--gold-accent)' }}>
                  {ticket.method === 'PayPal' || ticket.method === 'Western Union' ? '$' : 'S/. '}{ticket.price}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase' }}>{ticket.method}</div>
              </div>
            </div>

            <div className="note-block">
              <span style={{ color: 'var(--gold-accent)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Notas al maestro / Petitorio:</span>
              {ticket.notes || 'Ninguna'}
            </div>

            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '600' }}>Velas Registradas</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ticket.velas?.map((vela, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', padding: '8px 14px', borderRadius: '16px', fontSize: '0.95rem', textDecoration: vela.is_completed ? 'line-through' : 'none', opacity: vela.is_completed ? 0.6 : 1 }}>
                    {vela.name}
                  </div>
                ))}
              </div>
            </div>

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
        ))}
      </div>

    </div>
  );

  return (
    <Routes>
      <Route index element={renderList()} />
      <Route path="nuevo-ticket" element={renderNewTicket()} />
      <Route path="nueva-vela" element={renderNewVela()} />
      <Route path="historial/:id" element={renderList()} />
      <Route path="*" element={renderList()} />
    </Routes>
  );
}

export default SecretariaVelada;
