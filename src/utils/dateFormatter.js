export const formatPeruDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    // Intl.DateTimeFormat with es-PE locale and America/Lima timezone
    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return formatter.format(date).replace(',', '');
  } catch (error) {
    return '-';
  }
};

export const getPeruDateString = (dateObj = new Date()) => {
  const limaTime = new Date(dateObj.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const year = limaTime.getFullYear();
  const month = String(limaTime.getMonth() + 1).padStart(2, '0');
  const day = String(limaTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Devuelve un array de los últimos 7 días en YYYY-MM-DD (Perú)
export const getLast7DaysPeru = () => {
  const days = [];
  const base = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
  }
  return days;
};
