import React, { useState, useEffect } from 'react';
import { formatPeruDate } from '../utils/dateFormatter';
import { fetchTiktokTickets, createTiktokTicket, fetchAllClients, deleteTicket, upsertClient, fetchClientHistory, subscribeToTickets } from '../services/api';

const TIKTOK_QUESTIONS = [
  'Pregunta corta',
  'Pregunta detallada',
  'Pregunta general',
  'Canalización'
];

function SecretariaTiktok({ onBack }) {
  const [view, setView] = useState('list');
  const [tickets, setTickets] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [historyClientId, setHistoryClientId] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const loadData = async () => {
    try {
      const data = await fetchTiktokTickets();
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

  const initNewFormData = { client_id: null, name: '', phone: '', type: TIKTOK_QUESTIONS[0], price: '', method: 'Yape / Plin', notes: '' };
  const initFastAddData = { clientSearch: '', newPhone: '', selectedClient: null, samePerson: true, otherName: '', type: TIKTOK_QUESTIONS[0], price: '', method: 'Yape / Plin', notes: '' };

  const [newFormData, setNewFormData] = useState(initNewFormData);
  const [fastAddData, setFastAddData] = useState(initFastAddData);
  const [showAutoComplete, setShowAutoComplete] = useState(false);

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

  const handleSetView = (newView) => {
    if (newView === 'new-ticket') setNewFormData(initNewFormData);
    if (newView === 'add-fast') setFastAddData(initFastAddData);
    setView(newView);
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
      if (!newFormData.name.trim()) throw new Error("Debes ingresar el nombre.");
      if (!newFormData.phone.trim()) throw new Error("Debes ingresar el teléfono.");
      if (!newFormData.type) throw new Error("Debes seleccionar un tipo de pregunta.");
      if (newFormData.price && newFormData.price.trim() !== '' && isNaN(parseFloat(newFormData.price))) throw new Error("El monto debe ser numérico.");

      let client_id = newFormData.client_id;
      if (!client_id) {
  // Helper omitted
        client_id = await upsertClient(newFormData.name, newFormData.phone);
      }

      await createTiktokTicket({
        client_id: client_id,
        titularName: newFormData.name,
        name: newFormData.name,
        phone: newFormData.phone,
        type: newFormData.type,
        price: newFormData.price,
        method: newFormData.method,
        notes: newFormData.notes
      });
      handleSetView('list');
      loadData();
      fetchAllClients().then(setAllClients);
    } catch (err) {
      alert("Error al guardar ticket: " + err.message);
    }
  };

  const handleFastAdd = async (e) => {
    e.preventDefault();
    try {
      let clientId = fastAddData.selectedClient?.id;
      let titularName = fastAddData.selectedClient?.full_name || fastAddData.clientSearch;
      let phone = fastAddData.selectedClient?.phone || fastAddData.newPhone;

      if (!clientId) {
        if (!titularName.trim()) throw new Error("Debes ingresar un nombre válido.");
        if (!phone.trim()) throw new Error("Debes ingresar el teléfono del nuevo cliente.");
        clientId = await upsertClient(titularName, phone);
      }

      if (!fastAddData.type) throw new Error("Debes seleccionar un tipo de pregunta.");
      if (fastAddData.price && fastAddData.price.trim() !== '' && isNaN(parseFloat(fastAddData.price))) throw new Error("El monto debe ser numérico.");
      if (!fastAddData.samePerson && !fastAddData.otherName.trim()) throw new Error("Debes ingresar el nombre del beneficiario.");

      await createTiktokTicket({
        client_id: clientId,
        titularName: titularName,
        beneficiaryName: fastAddData.samePerson ? null : fastAddData.otherName,
        phone: phone,
        type: fastAddData.type,
        price: fastAddData.price,
        method: fastAddData.method,
        notes: fastAddData.notes
      });
      handleSetView('list');
      loadData();
      fetchAllClients().then(setAllClients);
    } catch (err) {
      alert("Error al crear ticket rápido: " + err.message);
    }
  };

  const filteredClients = fastAddData.clientSearch.trim().length > 1 && !fastAddData.selectedClient
    ? allClients.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(fastAddData.clientSearch.toLowerCase())) ||
        (c.phone && c.phone.includes(fastAddData.clientSearch))
      ).slice(0, 5)
    : [];

  const filteredClientsNew = (newFormData.name.trim().length > 1 || newFormData.phone.trim().length > 2) && showAutoComplete
    ? allClients.filter(c => 
        (c.full_name && newFormData.name && c.full_name.toLowerCase().includes(newFormData.name.toLowerCase())) ||
        (c.phone && newFormData.phone && c.phone.includes(newFormData.phone))
      ).slice(0, 5)
    : [];

  if (view === 'new-ticket') {
    return (
      <div className="animate-fade-in p-6">
        <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => handleSetView('list')} style={{ padding: '8px', color: 'var(--text-main)' }}>←</button>
          <h2 className="MysticTitle" style={{ marginBottom: 0, fontSize: '1.8rem' }}>Nueva Pregunta</h2>
        </header>

        <form onSubmit={handleCreateTicket} className="card">
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Nombre del cliente</label>
            <input type="text" className="input-field" required value={newFormData.name} onChange={e => {
              setNewFormData({ ...newFormData, name: e.target.value, client_id: null });
              setShowAutoComplete(true);
            }} placeholder="Ej. Ana Sosa" autoComplete="off" />
          </div>
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Número de Teléfono</label>
            <input type="tel" className="input-field" required value={newFormData.phone} onChange={e => {
              setNewFormData({ ...newFormData, phone: e.target.value, client_id: null });
              setShowAutoComplete(true);
            }} placeholder="+51 999 999 999" autoComplete="off" />
            
            {showAutoComplete && filteredClientsNew.length > 0 && !newFormData.client_id && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid var(--border-light)', borderRadius: '8px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                {filteredClientsNew.map(client => (
                  <div key={client.id} onClick={() => { 
                    setNewFormData({...newFormData, client_id: client.id, name: client.full_name, phone: client.phone}); 
                    setShowAutoComplete(false); 
                  }} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s', color: 'white' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: '500' }}>{client.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--purple-accent)' }}>{client.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Tipo de Pregunta</label>
            <select className="input-field" value={newFormData.type} onChange={e => setNewFormData({ ...newFormData, type: e.target.value })} style={{ appearance: 'none', paddingRight: '10px' }}>
              {TIKTOK_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Monto cobrado (Opcional)</label>
              <input type="text" className="input-field" value={newFormData.price} onChange={e => setNewFormData({ ...newFormData, price: e.target.value })} placeholder="Ej. 15.00" />
            </div>
            <div className="input-group">
              <label className="input-label">Método de Pago</label>
              <select className="input-field" value={newFormData.method} onChange={e => setNewFormData({ ...newFormData, method: e.target.value })} style={{ appearance: 'none', paddingRight: '10px' }}>
                <option>Yape / Plin</option>
                <option>Transferencia</option>
                <option>PayPal</option>
                <option>Western Union</option>
                <option>Objetivo</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Notas</label>
            <textarea className="input-field" rows="3" value={newFormData.notes} onChange={e => setNewFormData({ ...newFormData, notes: e.target.value })} placeholder="Detalles de la pregunta" />
          </div>
          <button type="submit" className="btn mt-4" style={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.9), rgba(124, 58, 237, 0.9))', color: '#FFF' }}>
            Guardar Ticket
          </button>
        </form>
      </div>
    );
  }

  if (view === 'add-fast') {
    return (
      <div className="animate-fade-in p-6">
        <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => handleSetView('list')} style={{ padding: '8px', color: 'var(--text-main)' }}>←</button>
          <h2 className="MysticTitle" style={{ fontSize: '1.8rem', marginBottom: 0 }}>Agregar a Titular Existente</h2>
        </header>

        <form onSubmit={handleFastAdd} className="card" style={{ position: 'relative' }}>
          
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Buscar Titular Existente (Celular o Nombre)</label>
            {fastAddData.selectedClient ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid var(--purple-accent)', padding: '12px 16px', borderRadius: '8px' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '500' }}>{fastAddData.selectedClient.full_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{fastAddData.selectedClient.phone}</div>
                </div>
                <button type="button" onClick={() => setFastAddData({...fastAddData, selectedClient: null, clientSearch: ''})} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
              </div>
            ) : (
              <input 
                type="text" 
                className="input-field" 
                value={fastAddData.clientSearch}
                onChange={e => {
                  setFastAddData({ ...fastAddData, clientSearch: e.target.value });
                  setShowAutoComplete(true);
                }} 
                placeholder="Nombre o Teléfono del cliente" 
                autoComplete="off"
              />
            )}

            {showAutoComplete && filteredClients.length > 0 && !fastAddData.selectedClient && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid var(--border-light)', borderRadius: '8px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                {filteredClients.map(client => (
                  <div key={client.id} onClick={() => { setFastAddData({...fastAddData, selectedClient: client, clientSearch: client.full_name}); setShowAutoComplete(false); }} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s', color: 'white' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: '500' }}>{client.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--purple-accent)' }}>{client.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!fastAddData.selectedClient && (
            <div className="input-group animate-fade-in" style={{ marginTop: '12px' }}>
              <label className="input-label">Teléfono del Titular (Nuevo)</label>
              <input type="tel" className="input-field" required value={fastAddData.newPhone} onChange={e => setFastAddData({...fastAddData, newPhone: e.target.value})} placeholder="Requerido para crear" />
            </div>
          )}

          <div style={{ marginBottom: '20px', marginTop: '16px' }}>
            <label className="input-label">¿Para quién es la lectura?</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: fastAddData.samePerson ? 'rgba(167, 139, 250, 0.1)' : 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, border: fastAddData.samePerson ? '1px solid var(--purple-accent)' : '1px solid transparent' }}>
                <input type="radio" checked={fastAddData.samePerson} onChange={() => setFastAddData({ ...fastAddData, samePerson: true })} style={{ accentColor: 'var(--purple-accent)' }} />
                Titular
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: !fastAddData.samePerson ? 'rgba(167, 139, 250, 0.1)' : 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, border: !fastAddData.samePerson ? '1px solid var(--purple-accent)' : '1px solid transparent' }}>
                <input type="radio" checked={!fastAddData.samePerson} onChange={() => setFastAddData({ ...fastAddData, samePerson: false })} style={{ accentColor: 'var(--purple-accent)' }} />
                Otra Persona
              </label>
            </div>
          </div>

          {!fastAddData.samePerson && (
            <div className="input-group animate-fade-in">
              <label className="input-label">Nombre Visual</label>
              <input type="text" className="input-field" required value={fastAddData.otherName} onChange={e => setFastAddData({ ...fastAddData, otherName: e.target.value })} placeholder="Ej. Javier (Hermano)" />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Tipo de Pregunta</label>
            <select className="input-field" value={fastAddData.type} onChange={e => setFastAddData({ ...fastAddData, type: e.target.value })} style={{ appearance: 'none', paddingRight: '10px' }}>
              {TIKTOK_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Monto (Opcional)</label>
              <input type="text" className="input-field" value={fastAddData.price} onChange={e => setFastAddData({ ...fastAddData, price: e.target.value })} placeholder="Ej. 10.00" />
            </div>
            <div className="input-group">
              <label className="input-label">Método de Pago</label>
              <select className="input-field" value={fastAddData.method} onChange={e => setFastAddData({ ...fastAddData, method: e.target.value })} style={{ appearance: 'none', paddingRight: '10px' }}>
                <option>Yape / Plin</option>
                <option>Transferencia</option>
                <option>PayPal</option>
                <option>Western Union</option>
                <option>Objetivo</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Notas</label>
            <textarea className="input-field" rows="2" value={fastAddData.notes} onChange={e => setFastAddData({ ...fastAddData, notes: e.target.value })} placeholder="Detalles de la pregunta" />
          </div>

          <button type="submit" className="btn mt-4" style={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.9), rgba(124, 58, 237, 0.9))', color: '#FFF' }}>
            Crear Ticket Vinculado
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px', paddingBottom: '80px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" onClick={onBack} style={{ padding: '8px', fontSize: '1.2rem', color: 'var(--text-main)' }}>←</button>
          <h2 className="MysticTitle" style={{ marginBottom: 0, fontSize: '1.8rem' }}>Consultas TikTok</h2>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button className="btn" onClick={() => handleSetView('new-ticket')} style={{ fontSize: '0.95rem', padding: '14px', flex: 1, boxShadow: 'none', background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.9), rgba(124, 58, 237, 0.9))', color: '#FFF' }}>
          + Cliente Nuevo
        </button>
        <button className="btn-outline" onClick={() => handleSetView('add-fast')} style={{ width: 'auto', flex: 1, padding: '14px', fontSize: '0.95rem', borderColor: 'var(--purple-accent)', color: 'var(--purple-accent)', background: 'rgba(167, 139, 250, 0.1)' }}>
          + Titular Existente
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '20px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pendientes
        </h3>

        {tickets.map(ticket => (
          <div key={ticket.id} className="card ticket-card-tiktok" style={{ position: 'relative' }}>
            <button onClick={() => handleDelete(ticket.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, padding: '4px' }}>✕</button>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px', paddingRight: '32px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {formatPeruDate(ticket.completed_at || ticket.created_at || ticket.date)}
                </div>
                
                {ticket.isAdditional && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--purple-accent)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{ticket.isBeneficiary ? `Pedido Adicional: ${ticket.titular_name}` : 'Pedido Adicional'}</span>
                    <button onClick={() => setHistoryClientId(ticket.client_id)} style={{ background: 'linear-gradient(135deg, var(--purple-accent), #7c3aed)', border: 'none', color: '#FFF', fontWeight: 'bold', borderRadius: '12px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(167, 139, 250, 0.3)' }}>
                      Historial
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
                <div className="badge badge-purple" style={{ marginBottom: '8px', display: 'inline-block' }}>
                  {ticket.type}
                </div>
                {ticket.price && (
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                      {ticket.method === 'PayPal' || ticket.method === 'Western Union' ? '$' : 'S/. '}{ticket.price}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase' }}>{ticket.method}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="note-block" style={{ border: '1px solid rgba(167, 139, 250, 0.15)', marginBottom: '0' }}>
              <span style={{ color: 'var(--purple-accent)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Notas al maestro / Petitorio:</span>
              {ticket.notes || 'Ninguna'}
            </div>
          </div>
        ))}
      </div>

      {historyClientId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', flexDirection: 'column', color: 'white', overflowY: 'auto' }}>
          <div style={{ padding: '24px', flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="MysticTitle" style={{ fontSize: '1.8rem', margin: 0 }}>Historial del Cliente</h2>
              <button onClick={() => setHistoryClientId(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>✕</button>
            </header>
            
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader" style={{ display: 'inline-block' }}></div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {historyData.map(t => (
                  <div key={t.id} style={{ background: '#1a1a1a', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.date}</span>
                      <span style={{ fontSize: '0.85rem', color: t.status === 'Completado' ? 'var(--success)' : 'var(--purple-accent)', textTransform: 'uppercase', fontWeight: '600' }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
                      {t.name}
                      {t.isBeneficiary && <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--purple-accent)', fontWeight: 'normal', fontStyle: 'italic' }}>(Beneficiario)</span>}
                    </div>
                    <div className="badge badge-purple" style={{ display: 'inline-block', marginBottom: '8px' }}>{t.module}</div>
                    {t.velas && t.velas.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Velas: {t.velas.map(v => v.name).join(', ')}</div>
                    )}
                    {t.type && (
                      <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pregunta: {t.type}</div>
                    )}
                  </div>
                ))}
                {historyData.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No hay tickets para este cliente.</div>}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default SecretariaTiktok;
