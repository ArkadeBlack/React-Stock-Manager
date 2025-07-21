import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from '../context/AppProvider.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { deleteUserAccount } from '../firebase.js'; // Importar la nueva función
import ConfirmationModal from './ConfirmationModal.jsx'; // Importar modal de confirmación
import './Settings.css';

const Settings = () => {
    const { user, updateUsername, settings, updateSettings } = useAppContext();
    const { language, changeLanguage, t } = useLanguage();
    const { toggleTheme } = useTheme();
    
    // Estados para las diferentes configuraciones
    const [generalSettings, setGeneralSettings] = useState({
        ...settings.general,
        language // Asegurarse de que el idioma esté sincronizado con el contexto
    });
    const [inventorySettings, setInventorySettings] = useState(settings.inventory);
    const [notificationSettings, setNotificationSettings] = useState(settings.notifications);
    const [userSettings, setUserSettings] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'admin',
        theme: settings.user.theme,
        showWelcomeScreen: settings.user.showWelcomeScreen,
        defaultView: settings.user.defaultView
    });

    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ show: false, type: '', text: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Sincronizar el estado del formulario con el usuario del contexto
    // Esto es crucial para que el nombre se actualice en el input cuando cambia globalmente
    useEffect(() => {
        if (user) {
            setUserSettings(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                role: user.role || 'admin'
            }));
        }
    }, [user]); // Se ejecuta cada vez que el objeto 'user' del contexto cambia

    // Función para eliminar la cuenta
    const handleDeleteAccount = async () => {
        setShowDeleteModal(false);
        setIsSaving(true);
        setSaveMessage({ show: false, type: '', text: '' });

        try {
            await deleteUserAccount();
            // Redirigir al usuario después de una eliminación exitosa
            alert(t('settings.user.accountDeleteSuccess'));
            // Forzar un refresco completo para limpiar el estado de la aplicación
            window.location.href = '/login'; 
        } catch (error) {
            console.error("Error deleting account:", error);
            setSaveMessage({
                show: true,
                type: 'error',
                text: t('settings.user.accountDeleteError')
            });
        } finally {
            setIsSaving(false);
            setTimeout(() => {
                setSaveMessage({ show: false, type: '', text: '' });
            }, 3000);
        }
    };

    // Función para guardar configuraciones
    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSaveMessage({ show: false, type: '', text: '' });

        try {
            // 1. Actualizar el nombre de usuario si ha cambiado
            if (userSettings.name.trim() && userSettings.name.trim() !== user?.name) {
                await updateUsername(userSettings.name);
            }

            // 2. Aplicar el cambio de idioma al guardar
            await changeLanguage(generalSettings.language);

            // 3. Guardar el resto de las configuraciones en el contexto
            await updateSettings('general', generalSettings);
            await updateSettings('inventory', inventorySettings);
            await updateSettings('notifications', notificationSettings);
            await updateSettings('user', {
                ...settings.user,
                theme: userSettings.theme,
                showWelcomeScreen: userSettings.showWelcomeScreen,
                defaultView: userSettings.defaultView
            });

            setSaveMessage({
                show: true,
                type: 'success',
                text: t('settings.saveSuccess')
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            setSaveMessage({
                show: true,
                type: 'error',
                text: t('settings.saveError')
            });
        } finally {
            setIsSaving(false);
            // Ocultar mensaje después de 3 segundos
            setTimeout(() => {
                setSaveMessage({ show: false, type: '', text: '' });
            }, 3000);
        }
    };

    // Manejadores de cambios para cada sección
    const handleGeneralChange = (e) => {
        const { name, value } = e.target;
        
        // Actualizar el estado local
        setGeneralSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleInventoryChange = (e) => {
        const { name, value, type, checked } = e.target;
        setInventorySettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleNotificationChange = (e) => {
        const { name, checked } = e.target;
        setNotificationSettings(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleUserChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setUserSettings(prev => ({
            ...prev,
            [name]: newValue
        }));

        if (name === 'theme') {
            toggleTheme(newValue);
        }
    };

    // Función para descartar los cambios
    const handleCancelChanges = () => {
        // Recargar las configuraciones desde el estado global
        setGeneralSettings({
            ...settings.general,
            language
        });
        setInventorySettings(settings.inventory);
        setNotificationSettings(settings.notifications);
        setUserSettings({
            name: user?.name || '',
            email: user?.email || '',
            role: user?.role || 'admin',
            theme: settings.user.theme,
            showWelcomeScreen: settings.user.showWelcomeScreen,
            defaultView: settings.user.defaultView
        });

        // Mostrar mensaje de que los cambios se han descartado
        setSaveMessage({
            show: true,
            type: 'info',
            text: t('settings.changesDiscarded')
        });

        // Ocultar el mensaje después de 3 segundos
        setTimeout(() => {
            setSaveMessage({ show: false, type: '', text: '' });
        }, 3000);
    };

    // Función para exportar configuraciones
    const handleExportSettings = () => {
        const allSettings = {
            general: generalSettings,
            inventory: inventorySettings,
            notifications: notificationSettings,
            user: userSettings,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(allSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `configuraciones-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    // Función para importar configuraciones
    const handleImportSettings = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const settings = JSON.parse(event.target.result);
                
                if (settings.general) setGeneralSettings(settings.general);
                if (settings.inventory) setInventorySettings(settings.inventory);
                if (settings.notifications) setNotificationSettings(settings.notifications);
                if (settings.user) {
                    // Preservar el nombre y rol del usuario actual
                    setUserSettings({
                        ...settings.user,
                        name: user?.name || settings.user.name,
                        role: user?.role || settings.user.role
                    });
                }
                
                setSaveMessage({
                    show: true,
                    type: 'success',
                    text: t('settings.importSuccess')
                });
                
                setTimeout(() => {
                    setSaveMessage({ show: false, type: '', text: '' });
                }, 3000);
                
            } catch (error) {
                setSaveMessage({
                    show: true,
                    type: 'error',
                    text: t('settings.importError')
                });
                
                setTimeout(() => {
                    setSaveMessage({ show: false, type: '', text: '' });
                }, 3000);
            }
        };
        
        reader.readAsText(file);
        // Limpiar el input de archivo
        e.target.value = null;
    };

    // Renderizar pestaña de configuraciones generales
    const renderGeneralSettings = () => (
        <div className="settings-section">
            <h2>{t('settings.general.title')}</h2>
            <p className="settings-description">
                {t('settings.general.description')}
            </p>

            <div className="settings-form">
                <div className="form-group">
                    <label htmlFor="companyName">{t('settings.general.companyName')}</label>
                    <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={generalSettings.companyName}
                        onChange={handleGeneralChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="currency">{t('settings.general.currency')}</label>
                    <select
                        id="currency"
                        name="currency"
                        value={generalSettings.currency}
                        onChange={handleGeneralChange}
                    >
                        <option value="USD">{t('settings.currencies.usd')}</option>
                        <option value="EUR">{t('settings.currencies.eur')}</option>
                        <option value="MXN">{t('settings.currencies.mxn')}</option>
                        <option value="COP">{t('settings.currencies.cop')}</option>
                        <option value="ARS">{t('settings.currencies.ars')}</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="language">{t('settings.general.language')}</label>
                    <select
                        id="language"
                        name="language"
                        value={generalSettings.language}
                        onChange={handleGeneralChange}
                    >
                        <option value="es">{t('settings.languages.es')}</option>
                        <option value="en">{t('settings.languages.en')}</option>
                        <option value="pt">{t('settings.languages.pt')}</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="timezone">{t('settings.general.timezone')}</label>
                    <select
                        id="timezone"
                        name="timezone"
                        value={generalSettings.timezone}
                        onChange={handleGeneralChange}
                    >
                        <option value="America/Mexico_City">{t('settings.timezones.mexico_city')}</option>
                        <option value="America/Bogota">{t('settings.timezones.bogota')}</option>
                        <option value="America/New_York">{t('settings.timezones.new_york')}</option>
                        <option value="America/Buenos_Aires">{t('settings.timezones.buenos_aires')}</option>
                        <option value="Europe/Madrid">{t('settings.timezones.madrid')}</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="dateFormat">{t('settings.general.dateFormat')}</label>
                    <select
                        id="dateFormat"
                        name="dateFormat"
                        value={generalSettings.dateFormat}
                        onChange={handleGeneralChange}
                    >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                </div>
            </div>
        </div>
    );

    // Renderizar pestaña de configuraciones de inventario
    const renderInventorySettings = () => (
        <div className="settings-section">
            <h2>{t('settings.inventory.title')}</h2>
            <p className="settings-description">
                {t('settings.inventory.description')}
            </p>

            <div className="settings-form">
                <div className="form-group">
                    <label htmlFor="lowStockThreshold">{t('settings.inventory.lowStockThreshold')}</label>
                    <input
                        type="number"
                        id="lowStockThreshold"
                        name="lowStockThreshold"
                        min="1"
                        max="50"
                        value={inventorySettings.lowStockThreshold}
                        onChange={handleInventoryChange}
                    />
                    <span className="form-help">
                        {t('settings.inventory.lowStockHelp')}
                    </span>
                </div>

                <div className="form-group checkbox-group">
                    <input
                        type="checkbox"
                        id="enableStockAlerts"
                        name="enableStockAlerts"
                        checked={inventorySettings.enableStockAlerts}
                        onChange={handleInventoryChange}
                    />
                    <label htmlFor="enableStockAlerts">{t('settings.inventory.enableStockAlerts')}</label>
                </div>

                <div className="form-group checkbox-group">
                    <input
                        type="checkbox"
                        id="autoUpdatePrices"
                        name="autoUpdatePrices"
                        checked={inventorySettings.autoUpdatePrices}
                        onChange={handleInventoryChange}
                    />
                    <label htmlFor="autoUpdatePrices">{t('settings.inventory.autoUpdatePrices')}</label>
                    <span className="form-help">
                        {t('settings.inventory.autoUpdatePricesHelp')}
                    </span>
                </div>

                <div className="form-group">
                    <label htmlFor="defaultCategory">{t('settings.inventory.defaultCategory')}</label>
                    <input
                        type="text"
                        id="defaultCategory"
                        name="defaultCategory"
                        value={inventorySettings.defaultCategory}
                        onChange={handleInventoryChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="barcodeFormat">{t('settings.inventory.barcodeFormat')}</label>
                    <select
                        id="barcodeFormat"
                        name="barcodeFormat"
                        value={inventorySettings.barcodeFormat}
                        onChange={handleInventoryChange}
                    >
                        <option value="CODE128">CODE128</option>
                        <option value="EAN13">EAN-13</option>
                        <option value="UPC">UPC</option>
                        <option value="QR">Código QR</option>
                    </select>
                </div>
            </div>
        </div>
    );
    // Renderizar pestaña de configuraciones de usuario
    const renderUserSettings = () => (
        <div className="settings-section">
            <h2>{t('settings.user.title')}</h2>
            <p className="settings-description">
                {t('settings.user.description')}
            </p>

            <div className="settings-form">
                <div className="form-group">
                    <label htmlFor="name">{t('settings.user.name')}</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={userSettings.name}
                        onChange={handleUserChange}
                    />
                    <span className="form-help">
                        {t('settings.user.nameHelp')}
                    </span>
                </div>

                <div className="form-group">
                    <label htmlFor="email">{t('settings.user.email')}</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={userSettings.email}
                        onChange={handleUserChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="role">Rol</label>
                    <input
                        type="text"
                        id="role"
                        name="role"
                        value={userSettings.role}
                        disabled={true}
                    />
                    <span className="form-help">
                        {t('settings.user.roleHelp')}
                    </span>
                </div>

                <div className="form-group">
                    <label htmlFor="theme">{t('settings.user.theme')}</label>
                    <select
                        id="theme"
                        name="theme"
                        value={userSettings.theme}
                        onChange={handleUserChange}
                    >
                        <option value="light">{t('settings.themes.light')}</option>
                        <option value="dark">{t('settings.themes.dark')}</option>
                        <option value="system">{t('settings.themes.system')}</option>
                    </select>
                </div>

                <div className="form-group checkbox-group">
                    <input
                        type="checkbox"
                        id="showWelcomeScreen"
                        name="showWelcomeScreen"
                        checked={userSettings.showWelcomeScreen}
                        onChange={handleUserChange}
                    />
                    <label htmlFor="showWelcomeScreen">{t('settings.user.showWelcomeScreen')}</label>
                </div>

                <div className="form-group">
                    <label htmlFor="defaultView">{t('settings.user.defaultView')}</label>
                    <select
                        id="defaultView"
                        name="defaultView"
                        value={userSettings.defaultView}
                        onChange={handleUserChange}
                    >
                        <option value="dashboard">{t('general.dashboard')}</option>
                        <option value="inventory">{t('general.inventory')}</option>
                        <option value="products">{t('general.products')}</option>
                        <option value="orders">{t('general.orders')}</option>
                    </select>
                </div>
            </div>

            {/* Zona de Peligro */}
            <div className="danger-zone">
                <h3>{t('settings.user.dangerZone')}</h3>
                <p>{t('settings.user.dangerZoneDescription')}</p>
                <button
                    className="btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                >
                    {t('settings.user.deleteAccount')}
                </button>
            </div>
        </div>
    );

    // Renderizar pestaña de importación/exportación
    const renderImportExport = () => (
        <div className="settings-section">
            <h2>{t('settings.importExport.title')}</h2>
            <p className="settings-description">
                {t('settings.importExport.description')}
            </p>

            <div className="import-export-container">
                <div className="export-section">
                    <h3>{t('settings.importExport.exportSettings')}</h3>
                    <p>
                        {t('settings.importExport.exportDescription')}
                    </p>
                    <button 
                        className="btn-export"
                        onClick={handleExportSettings}
                    >
                        {t('settings.importExport.exportSettings')}
                    </button>
                </div>

                <div className="import-section">
                    <h3>{t('settings.importExport.importSettings')}</h3>
                    <p>
                        {t('settings.importExport.importDescription')}
                    </p>
                    <label className="file-input-label">
                        {t('settings.importExport.selectFile')}
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportSettings}
                            className="file-input"
                        />
                    </label>
                    <p className="import-note">
                        {t('settings.importExport.importNote')}
                    </p>
                </div>
            </div>
        </div>
    );

    // Renderizar pestaña de configuraciones de notificaciones
    const renderNotificationSettings = () => {
        return (
            <div className="settings-section">
                <h2>{t('settings.notifications.title')}</h2>
                <p className="settings-description">
                    {t('settings.notifications.description')}
                </p>

                <div className="settings-form">
                    <div className="notification-group">
                        <h3>{t('settings.notifications.emailGroupTitle')}</h3>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="emailNotifications"
                                name="emailNotifications"
                                checked={notificationSettings.emailNotifications}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="emailNotifications">{t('settings.notifications.emailNotifications')}</label>
                        </div>
                    </div>

                    <div className="notification-group">
                        <h3>{t('settings.notifications.systemAlertsTitle')}</h3>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="stockAlerts"
                                name="stockAlerts"
                                checked={notificationSettings.stockAlerts}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="stockAlerts">{t('settings.notifications.stockAlerts')}</label>
                        </div>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="orderUpdates"
                                name="orderUpdates"
                                checked={notificationSettings.orderUpdates}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="orderUpdates">{t('settings.notifications.orderUpdates')}</label>
                        </div>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="priceChanges"
                                name="priceChanges"
                                checked={notificationSettings.priceChanges}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="priceChanges">{t('settings.notifications.priceChanges')}</label>
                        </div>
                    </div>

                    <div className="notification-group">
                        <h3>{t('settings.notifications.autoReportsTitle')}</h3>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="dailyReports"
                                name="dailyReports"
                                checked={notificationSettings.dailyReports}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="dailyReports">{t('settings.notifications.dailyReports')}</label>
                        </div>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="weeklyReports"
                                name="weeklyReports"
                                checked={notificationSettings.weeklyReports}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="weeklyReports">{t('settings.notifications.weeklyReports')}</label>
                        </div>
                        
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="monthlyReports"
                                name="monthlyReports"
                                checked={notificationSettings.monthlyReports}
                                onChange={handleNotificationChange}
                            />
                            <label htmlFor="monthlyReports">{t('settings.notifications.monthlyReports')}</label>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>{t('settings.title')}</h1>
                <p>{t('settings.description')}</p>
            </div>

            {/* Tabs de navegación */}
            <div className="settings-tabs">
                <button 
                    className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    {t('settings.tabs.general')}
                </button>
                <button 
                    className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    {t('settings.tabs.inventory')}
                </button>
                <button 
                    className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    {t('settings.tabs.notifications')}
                </button>
                <button 
                    className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}
                    onClick={() => setActiveTab('user')}
                >
                    {t('settings.tabs.user')}
                </button>
                <button 
                    className={`tab-button ${activeTab === 'import-export' ? 'active' : ''}`}
                    onClick={() => setActiveTab('import-export')}
                >
                    {t('settings.tabs.importExport')}
                </button>
            </div>

            {/* Contenido de la pestaña activa */}
            <div className="settings-content">
                {activeTab === 'general' && renderGeneralSettings()}
                {activeTab === 'inventory' && renderInventorySettings()}
                {activeTab === 'notifications' && renderNotificationSettings()}
                {activeTab === 'user' && renderUserSettings()}
                {activeTab === 'import-export' && renderImportExport()}
            </div>

            {/* Botones de acción */}
            <div className="settings-actions">
                <button 
                    className="btn-cancel"
                    onClick={handleCancelChanges}
                >
                    {t('general.cancel')}
                </button>
                <button 
                    className="btn-save"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                >
                    {isSaving ? t('settings.saving') : t('settings.saveSettings')}
                </button>
            </div>

            {/* Mensaje de guardado */}
            {saveMessage.show && (
                <div className={`save-message ${saveMessage.type}`}>
                    {saveMessage.text}
                </div>
            )}

            {/* Modal de confirmación para eliminar cuenta */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title={t('settings.user.deleteAccountConfirmTitle')}
                message={t('settings.user.deleteAccountConfirmMessage')}
                isSubmitting={isSaving}
            />
        </div>
    );
};

export default Settings;
