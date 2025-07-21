import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const defaultSettings = {
    general: { companyName: 'Mi Empresa', currency: 'USD', language: 'es', timezone: 'America/Mexico_City', dateFormat: 'DD/MM/YYYY' },
    inventory: { lowStockThreshold: 15, enableStockAlerts: true, autoUpdatePrices: false, defaultCategory: 'General', barcodeFormat: 'CODE128' },
    notifications: { emailNotifications: true, stockAlerts: true, orderUpdates: true, priceChanges: false, dailyReports: false, weeklyReports: true, monthlyReports: true },
    user: { theme: 'light', showWelcomeScreen: true, defaultView: 'dashboard' }
};

export const AppProvider = ({ children }) => {
    // Estado de Autenticación
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Estado de Configuraciones
    const [settings, setSettings] = useState(defaultSettings);

    // Listener unificado para Auth y Datos
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid);
                const settingsRef = doc(db, 'settings', currentUser.uid);

                const userDoc = await getDoc(userRef);

                if (!userDoc.exists()) {
                    // Usuario nuevo (probablemente de social login)
                    const userData = {
                        email: currentUser.email,
                        name: currentUser.displayName || 'Usuario',
                        role: 'user',
                        createdAt: serverTimestamp(),
                        provider: currentUser.providerData[0].providerId,
                    };
                    await setDoc(userRef, userData);
                    await setDoc(settingsRef, defaultSettings);
                }

                // Listener para datos del usuario
                const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
                    setUser({ uid: currentUser.uid, ...docSnap.data() });
                    setIsAuthenticated(true);
                });

                // Listener para configuraciones
                const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setSettings(docSnap.data());
                    }
                });
                
                setLoading(false);

                // Cleanup de listeners de datos
                return () => {
                    unsubscribeUser();
                    unsubscribeSettings();
                };
            } else {
                setUser(null);
                setIsAuthenticated(false);
                setSettings(defaultSettings);
                setLoading(false);
            }
        });

        // Cleanup del listener de auth
        return () => unsubscribeAuth();
    }, []);

    // --- Funciones de Autenticación ---
    const login = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), []);
    
    const signup = useCallback(async (email, password, name) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // La lógica de creación de perfil ahora está en onAuthStateChanged
        // para unificarla con el social login.
        // Solo necesitamos actualizar el `displayName` que no se establece automáticamente.
        await updateProfile(cred.user, { displayName: name });
    }, []);

    const logout = useCallback(() => signOut(auth), []);

    const updateUsername = useCallback(async (newName) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const trimmedName = newName.trim();
        await updateProfile(currentUser, { displayName: trimmedName });
        await updateDoc(doc(db, 'users', currentUser.uid), { name: trimmedName });
    }, []);

    // --- Funciones de Configuración ---
    const updateSettings = useCallback(async (section, newValues) => {
        if (!user) return;
        const settingsRef = doc(db, 'settings', user.uid);
        const updates = {};
        for (const key in newValues) {
            updates[`${section}.${key}`] = newValues[key];
        }
        await updateDoc(settingsRef, updates);
    }, [user]);

    // Valor del contexto memoizado
    const value = useMemo(() => ({
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
        updateUsername,
        settings,
        updateSettings
    }), [user, isAuthenticated, loading, login, signup, logout, updateUsername, settings, updateSettings]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
