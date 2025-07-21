// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import { 
  getAuth, 
  deleteUser,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider
} from "firebase/auth";

// Your web app's Firebase configuration is now loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios de Firebase que usaremos
export const db = getFirestore(app);
export const auth = getAuth(app);

// Proveedores de autenticación
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Nueva función para eliminar la cuenta de usuario y sus datos
export const deleteUserAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No user is currently signed in.");
    }

    const userId = user.uid;

    try {
        // 1. Eliminar el documento del usuario en la colección 'users'
        const userDocRef = doc(db, 'users', userId);
        await deleteDoc(userDocRef);

        // 2. Eliminar el documento de configuración del usuario en la colección 'settings'
        const settingsDocRef = doc(db, 'settings', userId);
        await deleteDoc(settingsDocRef);

        // 3. Eliminar el usuario de Firebase Authentication
        await deleteUser(user);

        console.log(`User with UID ${userId} and all their data has been deleted.`);
    } catch (error) {
        console.error("Error deleting user account:", error);
        // Re-lanzar el error para que el componente que llama pueda manejarlo
        throw error;
    }
};
