import { Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from '../context/AppProvider';
import './ComponenteInicio.css';

const ComponenteInicio = () => {
    const { t } = useLanguage();
    const { isAuthenticated } = useAppContext();

    // Si el usuario está autenticado, redirigir al Dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className="homepage-container">
            {/* Header */}
            <header className="header">
                <div className="logo">
                    <img src="/src/assets/kitty.png" alt={t('inicio.logoAlt')} className="logo-icon" />
                    <h1>{t('inicio.mainTitle')}</h1>
                </div>
                <div className="header-right">
                    <Link to="/login" state={{ mode: 'register' }} className="btn-secondary">{t('inicio.register')}</Link>
                    <Link to="/login" state={{ mode: 'login' }} className="btn-secondary">{t('inicio.login')}</Link>
                </div>
            </header>

            {/* Main Banner / Hero Section */}
            <section className="hero-banner">
                <div className="hero-content">
                    <h1>{t('inicio.heroTitle')}</h1>
                    <p>{t('inicio.heroSubtitle')}</p>
                    <Link to="/login" className="btn-cta">{t('inicio.startNow')}</Link>
                </div>
            </section>

            {/* Promotion Section */}
            <section className="promotion-section">
                <h2>{t('inicio.promoTitle')}</h2>
                <div className="promotion-card">
                    <div className="promotion-content">
                        <h3>{t('inicio.promoSubtitle')}</h3>
                        <p>{t('inicio.promoText')}</p>
                        <p className="promotion-expiry">{t('inicio.promoExpiry')}</p>
                        <Link to="/login" className="btn-promotion">{t('inicio.promoButton')}</Link>
                    </div>
                    <div className="promotion-image">
                        <img src="/src/assets/kitty.png" alt={t('inicio.promoAlt')} className="promotion-img" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <h2>{t('inicio.featuresTitle')}</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>{t('inicio.feature1Title')}</h3>
                        <p>{t('inicio.feature1Text')}</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📱</div>
                        <h3>{t('inicio.feature2Title')}</h3>
                        <p>{t('inicio.feature2Text')}</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📈</div>
                        <h3>{t('inicio.feature3Title')}</h3>
                        <p>{t('inicio.feature3Text')}</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ComponenteInicio;
