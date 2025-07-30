import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import './Dashboard.css';
import { useStock } from '../context/StockContext.jsx';
import { useLanguage } from '../context/LanguageContext';
import kitty from '../assets/kitty.png';

// Importar los componentes
import Inventory from './Inventory';
import Products from './Products';
import Orders from './Orders';
import Suppliers from './Suppliers';
import Reports from './Reports';
import Settings from './Settings';

import { useAppContext } from '../context/AppProvider';

const Dashboard = () => {
    const { user, logout, settings } = useAppContext();
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Usar el contexto global
    const { 
        dashboardStats, 
        productsWithInventory, 
        getRecentActivities,
        getRelativeTime
    } = useStock();
    
    // Usar el contexto de idioma
    const { t } = useLanguage();
    
    const stats = dashboardStats;
    const recentProducts = productsWithInventory.slice(0, 5);
    const recentActivities = getRecentActivities(5);

    // Actualiza el saludo según la hora del día
    useEffect(() => {
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) {
                setGreeting(t('dashboard.greeting.morning'));
            } else if (hour >= 12 && hour < 18) {
                setGreeting(t('dashboard.greeting.afternoon'));
            } else {
                setGreeting(t('dashboard.greeting.evening'));
            }
        };

        updateGreeting();
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            updateGreeting();
        }, 60000);

        return () => clearInterval(timer);
    }, [t]);

    // Función para obtener el título de la sección
    const getSectionTitle = () => {
        const path = location.pathname.split('/').pop();
        const titles = {
            '': t('general.dashboard'),
            'inventory': t('general.inventory'),
            'products': t('general.products'), 
            'orders': t('general.orders'),
            'suppliers': t('general.suppliers'),
            'reports': t('general.reports'),
            'settings': t('general.settings')
        };
        return titles[path] || t('general.dashboard');
    };

    // Función para obtener el estado del stock
    const getStockStatus = (currentStock, minStock) => {
        if (currentStock === 0) return 'out-stock';
        if (currentStock <= minStock) return 'low-stock';
        return 'in-stock';
    };

    const getStockStatusText = (currentStock, minStock) => {
        if (currentStock === 0) return t('products.status.outOfStock');
        if (currentStock <= minStock) return t('products.status.lowStock');
        return t('products.status.inStock');
    };

    // FUNCIÓN PARA OBTENER ICONO DE ACTIVIDAD
    const getActivityIcon = (type) => {
        const icons = {
            product: '📦',
            order: '🛒',
            supplier: '🏢',
            stock: '📊',
            alert: '⚠️'
        };
        return icons[type] || '📝';
    };

    // FUNCIÓN PARA OBTENER COLOR DE ACTIVIDAD
    const getActivityColor = (type) => {
        const colors = {
            product: '#3b82f6',
            order: '#10b981',
            supplier: '#f59e0b',
            stock: '#6366f1',
            alert: '#ef4444'
        };
        return colors[type] || '#6b7280';
    };

    // Contenido del dashboard
    const renderDashboardContent = () => (
        <>
            {/* Saludo personalizado */}
            <div className="dashboard-greeting">
                <h1 className="greeting-title">
                    {greeting}, {user?.name || user?.email}!
                </h1>
                <p className="greeting-subtitle">
                    {t('dashboard.summary')}
                </p>
            </div>

            {/* Estadísticas principales */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.totalProducts')}</h3>
                        <span className="stat-icon">📦</span>
                    </div>
                    <p className="stat-value">{stats.totalProducts}</p>
                    <p className="stat-change neutral">{t('products.name')}</p>
                </div>

                <div className="stat-card warning">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.lowStock')}</h3>
                        <span className="stat-icon">⚠️</span>
                    </div>
                    <p className="stat-value">{stats.lowStockCount}</p>
                    <p className="stat-change negative">{t('products.status.lowStock')}</p>
                </div>

                <div className="stat-card danger">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.outOfStock')}</h3>
                        <span className="stat-icon">❌</span>
                    </div>
                    <p className="stat-value">{stats.outOfStockCount}</p>
                    <p className="stat-change negative">{t('products.status.outOfStock')}</p>
                </div>

                <div className="stat-card success">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.inventoryValue')}</h3>
                        <span className="stat-icon">💰</span>
                    </div>
                    <p className="stat-value">{settings.general.currency} {stats.totalInventoryValue.toLocaleString()}</p>
                    <p className="stat-change positive">{t('inventory.currentStock')}</p>
                </div>
            </div>

            {/* Secciones principales */}
            <div className="sections-grid">
                {/* Productos recientes */}
                <div className="section-card">
                    <div className="section-header">
                        <h3 className="section-title">{t('dashboard.recentProducts')}</h3>
                        <p className="section-subtitle">{t('products.name')}</p>
                    </div>
                    <div className="section-content">
                        <table className="recent-products-table">
                            <thead>
                                <tr>
                                    <th>{t('products.name')}</th>
                                    <th>{t('products.stock')}</th>
                                    <th>{t('general.status')}</th>
                                    <th>{t('products.price')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="product-name">{product.name}</div>
                                            <div className="product-sku">{product.sku}</div>
                                        </td>
                                        <td>{product.inventory.currentStock}</td>
                                        <td>
                                            <span className={`stock-badge ${getStockStatus(product.inventory.currentStock, product.inventory.minStock) === 'in-stock' ? 'high' : getStockStatus(product.inventory.currentStock, product.inventory.minStock) === 'low-stock' ? 'medium' : 'out'}`}>
                                                {getStockStatusText(product.inventory.currentStock, product.inventory.minStock)}
                                            </span>
                                        </td>
                                        <td>{settings.general.currency} {product.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Actividad reciente */}
                <div className="section-card">
                    <div className="section-header">
                        <h3 className="section-title">{t('dashboard.recentActivity')}</h3>
                        <p className="section-subtitle">{t('dashboard.recentActivity')}</p>
                    </div>
                    <div className="section-content">
                        <div className="activity-feed">
                            {recentActivities.length > 0 ? (
                                recentActivities.map(activity => (
                                    <div key={activity.id} className="activity-item">
                                        <div 
                                            className="activity-icon"
                                            style={{ 
                                                backgroundColor: getActivityColor(activity.type),
                                                color: 'white'
                                            }}
                                        >
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="activity-content">
                                            <p className="activity-text">{t(activity.messageKey, activity.data)}</p>
                                            <p className="activity-time">{getRelativeTime(activity.timestamp)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-activities">
                                    <p>{t('dashboard.noActivities')}</p>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                        {t('dashboard.activitiesWillAppear')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="dashboard-container">
            {/* Top Navbar */}
            <header className="top-navbar">
                <div className="navbar-left">
                    <div className="logo-section">
                        <img src={kitty} alt={t('inicio.logoAlt')} className="sidebar-logo" />
                        <div className="logo-text">
                            <h2>{t('inicio.mainTitle')}</h2>
                            <p>{settings.general.companyName}</p>
                        </div>
                    </div>
                </div>
                <div className="navbar-center">
                    <nav className="nav-menu">
                        <NavLink to="/dashboard" end className="nav-item">📊 {t('general.dashboard')}</NavLink>
                        <NavLink to="/dashboard/inventory" className="nav-item">📋 {t('general.inventory')}</NavLink>
                        <NavLink to="/dashboard/products" className="nav-item">📦 {t('general.products')}</NavLink>
                        <NavLink to="/dashboard/orders" className="nav-item">🛒 {t('general.orders')}</NavLink>
                        <NavLink to="/dashboard/suppliers" className="nav-item">🏢 {t('general.suppliers')}</NavLink>
                        <NavLink to="/dashboard/reports" className="nav-item">📈 {t('general.reports')}</NavLink>
                        <NavLink to="/dashboard/settings" className="nav-item">⚙️ {t('general.settings')}</NavLink>
                    </nav>
                </div>
                
                <div className="navbar-right">
                    <div className="user-section">
                        <div className="user-info">
                            <div className="user-avatar">
                                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                                <p className="user-name">{user?.name || user?.email}</p>
                                <p className="user-role">{t('general.guest')}</p>
                            </div>
                        </div>
                        <button className="logout-btn" onClick={async () => await logout()}>
                            {t('general.logout')}
                        </button>
                    </div>
                    <button 
                        className="menu-toggle"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        ☰
                    </button>
                </div>
            </header>

            {/* Sidebar for mobile */}
            <nav className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-section">
                        <img src={kitty} alt={t('inicio.logoAlt')} className="sidebar-logo" />
                        <div className="logo-text">
                            <h2>{t('inicio.mainTitle')}</h2>
                            <p>{settings.general.companyName}</p>
                        </div>
                    </div>
                </div>

                {/* Navegación para móvil */}
                <div className="nav-menu-mobile">
                    <NavLink to="/dashboard" end className="nav-item" onClick={() => setIsMenuOpen(false)}>📊 {t('general.dashboard')}</NavLink>
                    <NavLink to="/dashboard/inventory" className="nav-item" onClick={() => setIsMenuOpen(false)}>📋 {t('general.inventory')}</NavLink>
                    <NavLink to="/dashboard/products" className="nav-item" onClick={() => setIsMenuOpen(false)}>📦 {t('general.products')}</NavLink>
                    <NavLink to="/dashboard/orders" className="nav-item" onClick={() => setIsMenuOpen(false)}>🛒 {t('general.orders')}</NavLink>
                    <NavLink to="/dashboard/suppliers" className="nav-item" onClick={() => setIsMenuOpen(false)}>🏢 {t('general.suppliers')}</NavLink>
                    <NavLink to="/dashboard/reports" className="nav-item" onClick={() => setIsMenuOpen(false)}>📈 {t('general.reports')}</NavLink>
                    <NavLink to="/dashboard/settings" className="nav-item" onClick={() => setIsMenuOpen(false)}>⚙️ {t('general.settings')}</NavLink>
                </div>

                <div className="sidebar-footer">
                    <div className="user-section">
                        <div className="user-info">
                            <div className="user-avatar">
                                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                                <p className="user-name">{user?.name || user?.email}</p>
                                <p className="user-role">{t('general.guest')}</p>
                            </div>
                        </div>
                        <button className="logout-btn" onClick={async () => {
                            await logout();
                            setIsMenuOpen(false);
                        }}>
                            {t('general.logout')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Contenido principal */}
            <main className="main-content">
                <header className="content-header">
                    <h1 className="page-title">{getSectionTitle()}</h1>
                </header>
                <div className="dashboard-content">
                    <Routes>
                        <Route index element={renderDashboardContent()} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="products" element={<Products />} />
                        <Route path="orders" element={<Orders />} />
                        <Route path="suppliers" element={<Suppliers />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="settings" element={<Settings />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
