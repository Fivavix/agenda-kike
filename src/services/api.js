import { supabase } from '../supabaseClient';
import { moduleToDB, methodToDB, statusToDB, ticketToUI, velaToUI, moduleToUI, methodToUI, statusToUI } from './adapter';

export const subscribeToTickets = (callback) => {
  return supabase
    .channel('tickets-all')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      () => {
        dLog('Realtime: Cambio en tickets detectado');
        callback();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ticket_velas' },
      () => {
        dLog('Realtime: Cambio en ticket_velas detectado');
        callback();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ticket_tiktok' },
      () => {
        dLog('Realtime: Cambio en ticket_tiktok detectado');
        callback();
      }
    )
    .subscribe();
};
import { getPeruDateString, getLast7DaysPeru } from '../utils/dateFormatter';

const DEBUG_MODE = true;
const dLog = (...args) => { if (DEBUG_MODE) console.log('[API DEBUG]', ...args); };
const dErr = (...args) => { if (DEBUG_MODE) console.error('[API ERROR]', ...args); };

export const fetchTicketStats = async () => {
  const { data, error } = await supabase.from('tickets').select('status, module, completed_at, created_at');
  if (error) return { pendings: 0, completed: 0, velada: 0, tiktok: 0 };

  let pendings = 0;
  let completed = 0;
  let velada = 0;
  let tiktok = 0;

  const last7Days = getLast7DaysPeru();
  for (const t of data) {
    const stat = (t.status || '').toLowerCase();
    const mod = (t.module || '').toLowerCase();

    if (stat === 'pendiente') {
      pendings++;
      if (mod === 'velada') velada++;
      if (mod === 'tiktok' || mod === 'consultas tiktok') tiktok++;
    } else if (stat === 'completado') {
      completed++;
    }
  }

  return { pendings, completed, velada, tiktok };
};

// Clients
export const upsertClient = async (name, phone) => {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (existingClient) {
    if (name && (!existingClient.full_name || existingClient.full_name.trim() === '')) {
      await supabase.from('clients').update({ full_name: name }).eq('id', existingClient.id);
    }
    return existingClient.id;
  }

  dLog('Upserting client:', { name, cleanPhone });
  const { data: newClient, error: clientInsertErr } = await supabase
    .from('clients')
    .insert({ full_name: name, phone: cleanPhone })
    .select('id')
    .single();

  if (clientInsertErr) {
    dErr('Client Insert Error', clientInsertErr);
    throw new Error('Error inserting client: ' + clientInsertErr.message);
  }
  return newClient?.id;
};

export const fetchAllClients = async () => {
  const { data, error } = await supabase.from('clients').select('id, full_name, phone').order('full_name');
  if (error) return [];
  return data;
};

export const fetchClientHistory = async (clientId) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, display_name, module, amount, payment_method, status, created_at, notes, ticket_velas(vela_name, is_completed), ticket_tiktok(question_type), clients(full_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return data.map(t => {
    const isBeneficiary = t.display_name && t.clients?.full_name && (t.display_name.trim().toLowerCase() !== t.clients.full_name.trim().toLowerCase());
    // Explicit mappings to avoid any reference errors with adapter
    const vMod = (t.module === 'velada' || t.module === 'La Velada') ? 'La Velada' : 'Consultas TikTok';
    const vStat = (t.status === 'pendiente' || t.status === 'Pendiente') ? 'Pendiente' : 'Completado';
    const vMeth = t.payment_method === 'yape_plin' ? 'Yape / Plin' : t.payment_method === 'transferencia' ? 'Transferencia' : t.payment_method === 'paypal' ? 'PayPal' : t.payment_method === 'western_union' ? 'Western Union' : t.payment_method === 'objetivo' ? 'Objetivo' : t.payment_method;

    return {
      id: t.id,
      name: t.display_name,
      isBeneficiary,
      titular_name: t.clients?.full_name,
      module: vMod,
      price: t.amount,
      method: vMeth,
      status: vStat,
      created_at: t.created_at,
      date: t.created_at ? getPeruDateString(new Date(t.created_at)) : '',
      notes: t.notes,
      velas: t.ticket_velas ? t.ticket_velas.map(v => ({ ...v, name: v.vela_name })) : [],
      type: t.ticket_tiktok?.[0]?.question_type || ''
    };
  });
};

export const deleteTicket = async (ticketId) => {
  dLog(`Deleting ticket ${ticketId}`);
  await supabase.from('ticket_velas').delete().eq('ticket_id', ticketId);
  await supabase.from('ticket_tiktok').delete().eq('ticket_id', ticketId);
  await supabase.from('tickets').delete().eq('id', ticketId);
};

// Vela Tickets
export const fetchVelaTickets = async () => {
  dLog('Fetching vela tickets...');
  const { data, error } = await supabase
    .from('tickets')
    .select('*, clients(id, full_name, phone, tickets(count)), ticket_velas(*)')
    .eq('module', 'velada')
    .order('created_at', { ascending: false });

  if (error) {
    dErr('Fetch Vela Error', error);
    throw error;
  }

  dLog(`Fetched ${data.length} vela tickets`);
  return data.map(ticketToUI);
};

export const createVelaTicket = async (ticketData) => {
  let client_id = ticketData.client_id;
  if (!client_id) {
    client_id = await upsertClient(ticketData.titularName || ticketData.name, ticketData.phone);
  }

  const displayName = ticketData.beneficiaryName || ticketData.titularName || ticketData.name;

  dLog('Inserting into tickets:', { client_id, module: moduleToDB('La Velada'), display_name: displayName, phone: ticketData.phone, amount: parseFloat(ticketData.price) || 0, method: ticketData.method });

  const { data: newTicket, error: ticketErr } = await supabase
    .from('tickets')
    .insert({
      client_id,
      module: moduleToDB('La Velada'),
      display_name: displayName,
      phone: ticketData.phone,
      amount: parseFloat(ticketData.price) || 0,
      payment_method: methodToDB(ticketData.method),
      notes: ticketData.notes,
      status: statusToDB('Pendiente')
    })
    .select('id')
    .single();

  if (ticketErr) {
    dErr('Ticket Insert Error', ticketErr);
    throw new Error('Error inserting ticket: ' + ticketErr.message);
  }
  dLog('Ticket insertado con ID:', newTicket?.id);

  const velasToInsert = ticketData.velas.filter(v => v.trim() !== '').map(v => ({
    ticket_id: newTicket?.id,
    vela_name: v,
    is_completed: false
  }));

  if (velasToInsert.length > 0) {
    dLog('Inserting into ticket_velas:', velasToInsert);
    const { error: velasErr } = await supabase.from('ticket_velas').insert(velasToInsert);
    if (velasErr) {
      dErr('Velas Insert Error', velasErr);
      throw new Error('Error inserting velas: ' + velasErr.message);
    }
  }
};

export const toggleVelaStatus = async (velaId, isCompleted) => {
  dLog(`Toggling vela ${velaId} to ${isCompleted}`);
  await supabase
    .from('ticket_velas')
    .update({ is_completed: isCompleted })
    .eq('id', velaId);
};

export const completeTicketStatus = async (ticketId) => {
  dLog(`Completing ticket ${ticketId}`);
  await supabase
    .from('tickets')
    .update({
      status: statusToDB('Completado'),
      completed_at: new Date().toISOString()
    })
    .eq('id', ticketId);
};

// TikTok Tickets
export const fetchTiktokTickets = async () => {
  dLog('Fetching tiktok tickets...');
  const { data, error } = await supabase
    .from('tickets')
    .select('*, clients(id, full_name, phone, tickets(count)), ticket_tiktok(*)')
    .eq('module', 'tiktok')
    .order('created_at', { ascending: false });

  if (error) {
    dErr('Fetch TikTok Error', error);
    throw error;
  }

  dLog(`Fetched ${data.length} tiktok tickets`);
  return data.map(ticketToUI);
};

export const createTiktokTicket = async (ticketData) => {
  let client_id = ticketData.client_id;
  if (!client_id) {
    client_id = await upsertClient(ticketData.titularName || ticketData.name, ticketData.phone);
  }

  const displayName = ticketData.beneficiaryName || ticketData.titularName || ticketData.name;

  dLog('Inserting into tickets (tiktok):', { client_id, module: moduleToDB('Consultas TikTok'), display_name: displayName, amount: parseFloat(ticketData.price) || 0 });

  const { data: newTicket, error: tiktokErr } = await supabase
    .from('tickets')
    .insert({
      client_id,
      module: moduleToDB('Consultas TikTok'),
      display_name: displayName,
      phone: ticketData.phone,
      amount: ticketData.price && ticketData.price.toString().trim() !== '' ? parseFloat(ticketData.price) : 0,
      payment_method: methodToDB(ticketData.method),
      notes: ticketData.notes,
      status: statusToDB('Pendiente')
    })
    .select('id')
    .single();

  if (tiktokErr) {
    dErr('Tiktok Insert Error', tiktokErr);
    throw new Error('Error inserting tiktok ticket: ' + tiktokErr.message);
  }
  dLog('Tiktok ticket insertado con ID:', newTicket?.id);

  if (ticketData.type) {
    const detailPayload = { ticket_id: newTicket?.id, question_type: ticketData.type };
    dLog('Inserting into ticket_tiktok:', detailPayload);
    const { error: typeErr } = await supabase.from('ticket_tiktok').insert(detailPayload);
    if (typeErr) {
      dErr('Ticket TikTok Detail Error', typeErr);
      throw new Error('Error inserting tiktok question type: ' + typeErr.message);
    }
  }
};
