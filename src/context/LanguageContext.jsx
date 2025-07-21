import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAppContext } from './AppProvider';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Importar traducciones
import es from '../translations/es';
import en from '../translations/en';
import pt from '../translations/pt';

const translations = {
  es,
  en,
  pt
};

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const { user, settings, updateSettings } = useAppContext();
    const [language, setLanguage] = useState('es'); // Idioma por defecto

  // Cargar el idioma del usuario cuando se autentica
  useEffect(() => {
    const fetchLanguage = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().language) {
          setLanguage(userSnap.data().language);
        } else {
          // Si el usuario no tiene idioma, se usa el por defecto 'es'
          // y se podría guardar en su perfil si se desea.
          setLanguage('es');
        }
      } else {
        // Si no hay usuario, se puede usar un idioma por defecto o de localStorage
        const savedLanguage = localStorage.getItem('appLanguage_guest') || 'es';
        setLanguage(savedLanguage);
      }
    };

    fetchLanguage();
  }, [user]);

  // Función para cambiar el idioma
  const changeLanguage = useCallback(async (newLanguage) => {
    if (user) {
      // Si hay un usuario, guardar en Firestore
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { language: newLanguage }, { merge: true });
        setLanguage(newLanguage);
      } catch (error) {
        console.error("Error updating language in Firestore:", error);
      }
    } else {
      // Si no hay usuario, guardar en localStorage
      localStorage.setItem('appLanguage_guest', newLanguage);
      setLanguage(newLanguage);
    }
  }, [user]);

  // Función para traducir textos (MEJORADA CON INTERPOLACIÓN Y PLURALIZACIÓN)
  const t = (key, options = {}) => {
    const keys = key.split('.');
    let translation = translations[language] || translations.es;
    
    for (const k of keys) {
      if (translation && typeof translation === 'object' && translation[k]) {
        translation = translation[k];
      } else {
        return key; // Devuelve la clave si no se encuentra la traducción
      }
    }

    // Manejo de pluralización
    if (typeof translation === 'object' && options.count !== undefined) {
      if (options.count === 1 && translation.one) {
        translation = translation.one;
      } else if (translation.other) {
        translation = translation.other;
      } else {
        // Fallback si no hay 'one' o 'other'
        return key;
      }
    }

    // Manejo de interpolación (reemplazar placeholders)
    if (typeof translation === 'string') {
      return translation.replace(/\{(\w+)\}/g, (match, placeholder) => {
        return options[placeholder] !== undefined ? options[placeholder] : match;
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
