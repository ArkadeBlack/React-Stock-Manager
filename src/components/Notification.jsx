import { useState, useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Esperar a que la animación de salida termine
      }, 5000); // La notificación se cierra después de 5 segundos

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className={`notification ${type} ${visible ? 'visible' : ''}`}>
      <p>{message}</p>
      <button className="close-btn" onClick={onClose}>×</button>
    </div>
  );
};

export default Notification;
