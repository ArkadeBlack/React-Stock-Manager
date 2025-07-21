// Versión sin dependencias externas

/**
 * Formatea una fecha según la configuración proporcionada
 * @param {Date|string|number} date - La fecha a formatear
 * @param {Object} settings - Configuración de formato
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date, settings = {}) => {
  const { dateFormat = 'DD/MM/YYYY' } = settings;
  const d = new Date(date);
  
  // Implementación simple de formateo de fecha
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

/**
 * Obtiene una representación de tiempo relativo
 * @param {Date|string|number} date - La fecha para calcular el tiempo relativo
 * @param {Object} settings - Configuración
 * @returns {string} - Texto de tiempo relativo
 */
export const getRelativeTime = (date, settings = {}) => {
  const { language = 'es' } = settings;
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  // Textos según el idioma
  const texts = {
    es: {
      now: 'ahora mismo',
      seconds: 'hace {n} segundos',
      minute: 'hace 1 minuto',
      minutes: 'hace {n} minutos',
      hour: 'hace 1 hora',
      hours: 'hace {n} horas',
      day: 'hace 1 día',
      days: 'hace {n} días'
    },
    en: {
      now: 'just now',
      seconds: '{n} seconds ago',
      minute: '1 minute ago',
      minutes: '{n} minutes ago',
      hour: '1 hour ago',
      hours: '{n} hours ago',
      day: '1 day ago',
      days: '{n} days ago'
    },
    pt: {
      now: 'agora mesmo',
      seconds: 'há {n} segundos',
      minute: 'há 1 minuto',
      minutes: 'há {n} minutos',
      hour: 'há 1 hora',
      hours: 'há {n} horas',
      day: 'há 1 dia',
      days: 'há {n} dias'
    }
  };
  
  const t = texts[language] || texts.es;
  
  if (diffSec < 5) return t.now;
  if (diffSec < 60) return t.seconds.replace('{n}', diffSec);
  if (diffMin === 1) return t.minute;
  if (diffMin < 60) return t.minutes.replace('{n}', diffMin);
  if (diffHour === 1) return t.hour;
  if (diffHour < 24) return t.hours.replace('{n}', diffHour);
  if (diffDay === 1) return t.day;
  return t.days.replace('{n}', diffDay);
};