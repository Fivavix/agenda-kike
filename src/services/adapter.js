import { getPeruDateString } from '../utils/dateFormatter';

export const moduleToDB = (moduleKey) => {
  if (moduleKey === 'La Velada') return 'velada';
  if (moduleKey === 'Consultas TikTok' || moduleKey === 'TikTok' || moduleKey === 'tiktok') return 'tiktok';
  return moduleKey;
};

export const moduleToUI = (moduleKey) => {
  if (moduleKey === 'velada') return 'La Velada';
  if (moduleKey === 'tiktok') return 'Consultas TikTok';
  return moduleKey;
};

export const velaToUI = (v) => ({
  ...v,
  name: v.vela_name
});

export const methodToDB = (method) => {
  if (method === 'Yape / Plin') return 'yape_plin';
  if (method === 'Transferencia') return 'transferencia';
  if (method === 'PayPal') return 'paypal';
  if (method === 'Western Union') return 'western_union';
  if (method === 'Objetivo') return 'objetivo';
  return method;
};

export const methodToUI = (method) => {
  if (method === 'yape_plin') return 'Yape / Plin';
  if (method === 'transferencia') return 'Transferencia';
  if (method === 'paypal') return 'PayPal';
  if (method === 'western_union') return 'Western Union';
  if (method === 'objetivo') return 'Objetivo';
  return method;
};

export const statusToDB = (status) => {
  if (status === 'Pendiente') return 'pendiente';
  if (status === 'Completado') return 'completado';
  return status;
};

export const statusToUI = (status) => {
  if (status === 'pendiente') return 'Pendiente';
  if (status === 'completado') return 'Completado';
  return status;
};

export const ticketToUI = (t) => {
  const ticketsCount = t.clients?.tickets?.[0]?.count || 0;
  const isAdditional = ticketsCount > 1;
  const isBeneficiary = t.display_name && t.clients?.full_name && (t.display_name.trim().toLowerCase() !== t.clients.full_name.trim().toLowerCase());

  return {
    id: t.id,
    client_id: t.client_id,
    name: t.display_name || t.clients?.full_name,
    titular_name: t.clients?.full_name,
    isAdditional,
    isBeneficiary,
    ticketsCount,
    phone: t.phone || t.clients?.phone,
    module: moduleToUI(t.module),
    price: t.amount,
    method: methodToUI(t.payment_method),
    notes: t.notes,
    status: statusToUI(t.status),
    created_at: t.created_at,
    completed_at: t.completed_at,
    date: t.created_at ? getPeruDateString(new Date(t.created_at)) : '',
    velas: t.ticket_velas ? t.ticket_velas.map(v => velaToUI(v)) : [],
    type: t.ticket_tiktok?.[0]?.question_type || ''
  };
};
