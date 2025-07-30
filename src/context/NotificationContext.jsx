import { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/Notification';
import { useLanguage } from './LanguageContext'; // Importar el hook de idioma

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({ message: '', type: '' });
  const { t } = useLanguage(); // Obtener la función de traducción

  // Modificar showNotification para aceptar 'options' para la interpolación
  const showNotification = useCallback((messageKey, options = {}, type = 'info') => {
    const message = t(messageKey, options); // Traducir y formatear el mensaje
    setNotification({ message, type });
  }, [t]);

  const closeNotification = () => {
    setNotification({ message: '', type: '' });
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
      />
    </NotificationContext.Provider>
  );
};
