import { supabase } from '../supabaseClient';
import { ticketToUI } from './adapter';

export const fetchAllTickets = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, clients(full_name, phone)')
    .order('created_at', { ascending: false });
  
  if (error) return [];
  
  return data.map(ticketToUI);
};

export const fetchClientHistory = async () => {
  const { data, error } = await supabase
    .from('v_client_history')
    .select('*')
    .order('last_ticket_date', { ascending: false });
  
  if (error) return [];
  return data;
};

export const fetchDailyIncome = async () => {
  const { data, error } = await supabase
    .from('v_daily_income')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) return [];
  return data;
};
