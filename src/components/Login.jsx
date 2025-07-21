import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from '../context/AppProvider';
import { auth } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { googleProvider, githubProvider, microsoftProvider } from '../firebase';
import './Login.css';

const Login = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const { login, signup } = useAppContext();
    const [mode, setMode] = useState(location.state?.mode || 'login');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        setError('');
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    }, [mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                await login(formData.email, formData.password);
            } else { // 'register'
                if (formData.password !== formData.confirmPassword) {
                    throw new Error(t('login.passwordMismatchError'));
                }
                await signup(formData.email, formData.password, formData.name);
                // Firebase auto-loguea al usuario después del registro,
                // el cambio de estado de auth se encargará de la redirección.
            }
        } catch (err) {
            // Traducir errores de Firebase a mensajes amigables
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError(t('login.invalidCredentials', 'Credenciales inválidas.'));
                    break;
                case 'auth/email-already-in-use':
                    setError(t('login.emailInUseError', 'El correo electrónico ya está en uso.'));
                    break;
                case 'auth/weak-password':
                    setError(t('login.weakPasswordError', 'La contraseña debe tener al menos 6 caracteres.'));
                    break;
                default:
                    setError(t('login.genericError', 'Ocurrió un error. Por favor, inténtalo de nuevo.'));
                    console.error("Error de Firebase:", err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const stopPropagation = (e) => e.stopPropagation();

    const handleSocialLogin = async (provider) => {
        setIsLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, provider);
            // El observer de onAuthStateChanged en AppProvider se encargará de la redirección
        } catch (err) {
            setError(t('login.socialLoginError', 'Error al iniciar sesión. Inténtalo de nuevo.'));
            console.error("Error de inicio de sesión social:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-modal" onClick={stopPropagation}>
                <button className="close-button" onClick={() => navigate('/inicio')}>×</button>
                
                <header className="login-header">
                    <img src="/src/assets/kitty.png" alt={t('login.logoAlt')} className="login-logo" />
                    <h1>{t('login.mainTitle')}</h1>
                </header>

                <div className="auth-tabs">
                    <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
                        {t('login.loginTab')}
                    </button>
                    <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
                        {t('login.registerTab')}
                    </button>
                    <div className="glider" style={{ transform: `translateX(${mode === 'login' ? '0%' : '100%'})` }} />
                </div>

                {error && <div className="login-error">{error}</div>}

                <div className="login-form-container">
                    <form onSubmit={handleSubmit} className="login-form" key={mode}>
                        {mode === 'register' && (
                            <div className="form-group">
                            <label htmlFor="name">{t('login.fullNameLabel')}</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('login.fullNamePlaceholder')} required />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">{t('login.emailLabel')}</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder={t('login.emailPlaceholder')} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">{t('login.passwordLabel')}</label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder={t('login.passwordPlaceholder')}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>
                    {mode === 'register' && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">{t('login.confirmPasswordLabel')}</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder={t('login.passwordPlaceholder')} required />
                        </div>
                    )}
                        <button type="submit" className="btn-login" disabled={isLoading}>
                            {isLoading ? <span className="loader"></span> : (mode === 'login' ? t('login.loginButton') : t('login.registerButton'))}
                        </button>
                    </form>
                </div>

                {mode === 'login' && (
                    <>
                        <div className="login-divider"><span>{t('login.continueWith')}</span></div>
                        <div className="social-login">
                            <button type="button" className="social-btn google" title={t('login.googleButton')} onClick={() => handleSocialLogin(googleProvider)}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.655-3.449-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,35.846,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                            </button>
                            <button type="button" className="social-btn microsoft" title={t('login.microsoftButton')} onClick={() => handleSocialLogin(microsoftProvider)}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#F35325" d="M2 2H24V24H2z"/><path fill="#81BC06" d="M26 2H48V24H26z"/><path fill="#05A6F0" d="M2 26H24V48H2z"/><path fill="#FFBA08" d="M26 26H48V48H26z"/></svg>
                            </button>
                            <button type="button" className="social-btn github" title="GitHub" onClick={() => handleSocialLogin(githubProvider)}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#333" d="M24,4C12.95,4,4,12.95,4,24c0,8.84,5.73,16.34,13.68,19.01c1,0.19,1.37-0.43,1.37-0.97c0-0.48-0.02-1.75-0.03-3.43c-5.56,1.21-6.73-2.68-6.73-2.68c-0.91-2.31-2.22-2.93-2.22-2.93c-1.82-1.24,0.14-1.22,0.14-1.22c2.01,0.14,3.07,2.06,3.07,2.06c1.79,3.06,4.69,2.18,5.83,1.67c0.18-1.3,0.7-2.18,1.27-2.68c-4.45-0.5-9.13-2.22-9.13-9.9c0-2.2,0.78-3.99,2.07-5.4c-0.21-0.51-0.89-2.55,0.2-5.32c0,0,1.68-0.54,5.5,2.05c1.6-0.44,3.31-0.67,5.02-0.67c1.71,0,3.42,0.22,5.02,0.67c3.82-2.59,5.5-2.05,5.5-2.05c1.09,2.77,0.41,4.81,0.2,5.32c1.29,1.41,2.07,3.2,2.07,5.4c0,7.69-4.68,9.39-9.15,9.88c0.72,0.62,1.36,1.85,1.36,3.73c0,2.7-0.02,4.87-0.02,5.53c0,0.54,0.37,1.17,1.38,0.97C38.27,40.34,44,32.84,44,24C44,12.95,35.05,4,24,4z"/></svg>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
