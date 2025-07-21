import { useState, useEffect } from 'react';
import './Suppliers.css';
import { useStock } from '../context/StockContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAppContext } from '../context/AppProvider.jsx'; // Importar useAppContext

const Suppliers = () => { // Quitar user de las props
    const { user } = useAppContext(); // Obtener el usuario del contexto
    const { t } = useLanguage();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('table');
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        website: '',
        notes: '',
        taxId: '',
        paymentTerms: '30',
        category: '',
        status: 'active'
    });

    // Usar el contexto global
    const { 
        suppliers, 
        addSupplier, 
        updateSupplier, 
        deleteSupplier,
        products
    } = useStock();

    // Filtrar y ordenar proveedores
    const filteredSuppliers = suppliers
        .filter(supplier => {
            const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                supplier.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'contact':
                    return (a.contact || '').localeCompare(b.contact || '');
                case 'city':
                    return (a.city || '').localeCompare(b.city || '');
                case 'created':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                default:
                    return 0;
            }
        });

    // Manejar cambios en el formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Agregar nuevo proveedor
    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!user) return; // Seguridad extra

        try {
            const newSupplierData = {
                ...formData,
                paymentTerms: parseInt(formData.paymentTerms),
            };
            await addSupplier(newSupplierData);
            resetForm();
            setShowAddForm(false);
        } catch (error) {
            console.error("Error al agregar proveedor:", error);
            // Aquí podrías mostrar un mensaje de error al usuario
        }
    };

    // Editar proveedor
    const handleEditSupplier = (supplier) => {
        setEditingSupplier(supplier.id);
        setFormData({
            name: supplier.name || '',
            contact: supplier.contact || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            country: supplier.country || '',
            website: supplier.website || '',
            notes: supplier.notes || '',
            taxId: supplier.taxId || '',
            paymentTerms: supplier.paymentTerms?.toString() || '30',
            category: supplier.category || '',
            status: supplier.status || 'active'
        });
        setShowAddForm(true);
    };

    // Guardar cambios de edición
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        
        try {
            const updatedSupplierData = {
                ...formData,
                paymentTerms: parseInt(formData.paymentTerms),
            };
            await updateSupplier(editingSupplier, updatedSupplierData);
            resetForm();
            setShowAddForm(false);
            setEditingSupplier(null);
        } catch (error) {
            console.error("Error al actualizar proveedor:", error);
        }
    };

    // Eliminar proveedor
    const handleDeleteSupplier = async (id) => {
        // La lógica de productos asociados sigue siendo válida
        const supplierName = suppliers.find(s => s.id === id)?.name;
        const associatedProducts = products.filter(p => p.supplier === supplierName);
        
        if (associatedProducts.length > 0) {
            if (!window.confirm(t('suppliers.confirmDeleteWithProducts', { count: associatedProducts.length }))) {
                return;
            }
        }
        
        if (window.confirm(t('suppliers.confirmDelete'))) {
            try {
                await deleteSupplier(id);
            } catch (error) {
                console.error("Error al eliminar proveedor:", error);
            }
        }
    };

    // Cerrar modal con tecla Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showAddForm) {
                handleCloseForm();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showAddForm]);

    // Cambiar estado del proveedor
    const handleStatusChange = async (supplierId, newStatus) => {
        try {
            await updateSupplier(supplierId, { status: newStatus });
        } catch (error) {
            console.error("Error al cambiar estado del proveedor:", error);
        }
    };

    // Cerrar formulario
    const handleCloseForm = () => {
        setShowAddForm(false);
        setEditingSupplier(null);
        resetForm();
    };

    // Limpiar formulario
    const resetForm = () => {
        setFormData({
            name: '',
            contact: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            country: '',
            website: '',
            notes: '',
            taxId: '',
            paymentTerms: '30',
            category: '',
            status: 'active'
        });
    };

    // Obtener productos por proveedor
    const getProductsBySupplier = (supplierName) => {
        return products.filter(p => p.supplier === supplierName);
    };

    // Obtener categorías únicas de productos
    const getUniqueCategories = () => {
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        return categories;
    };

    // Calcular estadísticas
    const stats = {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.status === 'active').length,
        inactiveSuppliers: suppliers.filter(s => s.status === 'inactive').length,
        totalProducts: suppliers.reduce((total, supplier) => {
            return total + getProductsBySupplier(supplier.name).length;
        }, 0)
    };

    return (
        <div className="suppliers-container">
            {/* Header */}
            <div className="suppliers-header">
                <div className="header-info">
                    <h2>{t('suppliers.title')}</h2>
                    <p>{t('suppliers.description')}</p>
                </div>
                <button 
                    className="btn-add-supplier"
                    onClick={() => setShowAddForm(true)}
                >
                    + {t('suppliers.addSupplier')}
                </button>
            </div>

            {/* Controles de búsqueda y filtros */}
            <div className="suppliers-controls">
                <div className="search-section">
                    <input
                        type="text"
                        placeholder={t('suppliers.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-section">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="name">{t('suppliers.sortByName')}</option>
                        <option value="contact">{t('suppliers.sortByContact')}</option>
                        <option value="city">{t('suppliers.sortByCity')}</option>
                        <option value="created">{t('suppliers.sortByLatest')}</option>
                    </select>
                    
                    <div className="view-controls">
                        <button
                            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title={t('suppliers.tableView')}
                        >
                            📋
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title={t('suppliers.cardView')}
                        >
                            📱
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="stats-grid">
    <div className="stat-card primary">
        <div className="stat-header">
            <h3 className="stat-title">{t('suppliers.stats.total')}</h3>
            <span className="stat-icon">🏢</span>
        </div>
        <p className="stat-value">{stats.totalSuppliers}</p>
        <p className="stat-change neutral">{t('suppliers.stats.registered')}</p>
    </div>

    <div className="stat-card success">
        <div className="stat-header">
            <h3 className="stat-title">{t('suppliers.stats.active')}</h3>
            <span className="stat-icon">✅</span>
        </div>
        <p className="stat-value">{stats.activeSuppliers}</p>
        <p className="stat-change positive">{t('suppliers.stats.activeSuppliers')}</p>
    </div>

    <div className="stat-card warning">
        <div className="stat-header">
            <h3 className="stat-title">{t('suppliers.stats.inactive')}</h3>
            <span className="stat-icon">⚠️</span>
        </div>
        <p className="stat-value">{stats.inactiveSuppliers}</p>
        <p className="stat-change negative">{t('suppliers.stats.needsAttention')}</p>
    </div>

    <div className="stat-card info">
        <div className="stat-header">
            <h3 className="stat-title">{t('suppliers.stats.associatedProducts')}</h3>
            <span className="stat-icon">📦</span>
        </div>
        <p className="stat-value">{stats.totalProducts}</p>
        <p className="stat-change neutral">{t('suppliers.stats.totalProducts')}</p>
    </div>
</div>

            {/* Vista de tabla */}
            {viewMode === 'table' && (
                <div className="suppliers-list">
                    <div className="suppliers-table-container">
                        <table className="suppliers-table">
                            <thead>
                                <tr>
                                    <th>{t('suppliers.table.supplier')}</th>
                                    <th>{t('suppliers.table.contact')}</th>
                                    <th>{t('suppliers.table.email')}</th>
                                    <th>{t('suppliers.table.phone')}</th>
                                    <th>{t('suppliers.table.location')}</th>
                                    <th>{t('suppliers.table.products')}</th>
                                    <th>{t('suppliers.table.terms')}</th>
                                    <th>{t('suppliers.table.status')}</th>
                                    <th>{t('suppliers.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id}>
                                        <td>
                                            <div className="supplier-info">
                                                <div className="supplier-name">{supplier.name}</div>
                                                {supplier.category && (
                                                    <div className="supplier-category">{supplier.category}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td>{supplier.contact || 'N/A'}</td>
                                        <td>
                                            {supplier.email ? (
                                                <a href={`mailto:${supplier.email}`} className="email-link">
                                                    {supplier.email}
                                                </a>
                                            ) : 'N/A'}
                                        </td>
                                        <td>
                                            {supplier.phone ? (
                                                <a href={`tel:${supplier.phone}`} className="phone-link">
                                                    {supplier.phone}
                                                </a>
                                            ) : 'N/A'}
                                        </td>
                                        <td>
                                            <div className="location-info">
                                                {supplier.city && <div>{supplier.city}</div>}
                                                {supplier.country && (
                                                    <div className="country">{supplier.country}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="products-count">
                                            {getProductsBySupplier(supplier.name).length}
                                        </td>
                                        <td>{t('suppliers.days', { count: supplier.paymentTerms || 30 })}</td>
                                        <td>
                                            <select
                                                value={supplier.status || 'active'}
                                                onChange={(e) => handleStatusChange(supplier.id, e.target.value)}
                                                className={`status-select ${supplier.status || 'active'}`}
                                            >
                                                <option value="active">{t('suppliers.statuses.active')}</option>
                                                <option value="inactive">{t('suppliers.statuses.inactive')}</option>
                                                <option value="pending">{t('suppliers.statuses.pending')}</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-edit"
                                                    onClick={() => handleEditSupplier(supplier)}
                                                    title={t('general.edit')}
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    className="btn-delete"
                                                    onClick={() => handleDeleteSupplier(supplier.id)}
                                                    title={t('general.delete')}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Vista de tarjetas */}
            {viewMode === 'cards' && (
                <div className="suppliers-cards">
                    {filteredSuppliers.map(supplier => (
                        <div key={supplier.id} className="supplier-card">
                            <div className="card-header">
                                <div className="supplier-name-section">
                                    <h3>{supplier.name}</h3>
                                    {supplier.category && (
                                        <span className="category-badge">{supplier.category}</span>
                                    )}
                                </div>
                                <span className={`status-badge ${supplier.status || 'active'}`}>
                                    {t(`suppliers.statuses.${supplier.status || 'active'}`)}
                                </span>
                            </div>
                            
                            <div className="card-body">
                                <div className="contact-info">
                                    <div className="info-row">
                                        <strong>{t('suppliers.contact')}:</strong> {supplier.contact || 'N/A'}
                                    </div>
                                    <div className="info-row">
                                        <strong>{t('suppliers.email')}:</strong> 
                                        {supplier.email ? (
                                            <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                                        ) : 'N/A'}
                                    </div>
                                    <div className="info-row">
                                        <strong>{t('suppliers.phone')}:</strong> 
                                        {supplier.phone ? (
                                            <a href={`tel:${supplier.phone}`}>{supplier.phone}</a>
                                        ) : 'N/A'}
                                    </div>
                                    <div className="info-row">
                                        <strong>{t('suppliers.location')}:</strong> 
                                        {supplier.city || supplier.country ? 
                                            `${supplier.city || ''} ${supplier.country || ''}`.trim() : 'N/A'
                                        }
                                    </div>
                                    <div className="info-row">
                                        <strong>{t('suppliers.products')}:</strong> {getProductsBySupplier(supplier.name).length}
                                    </div>
                                    <div className="info-row">
                                        <strong>{t('suppliers.paymentTerms')}:</strong> {t('suppliers.days', { count: supplier.paymentTerms || 30 })}
                                    </div>
                                    {supplier.website && (
                                        <div className="info-row">
                                            <strong>{t('suppliers.website')}:</strong> 
                                            <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                                                {supplier.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                
                                {supplier.notes && (
                                    <div className="notes-section">
                                        <strong>{t('suppliers.notes')}:</strong>
                                        <p>{supplier.notes}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="card-actions">
                                <button 
                                    className="btn-edit"
                                    onClick={() => handleEditSupplier(supplier)}
                                >
                                    {t('general.edit')}
                                </button>
                                <button 
                                    className="btn-delete"
                                    onClick={() => handleDeleteSupplier(supplier.id)}
                                >
                                    {t('general.delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal/Formulario para agregar/editar proveedor */}
            {showAddForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}</h3>
                            <button className="modal-close" onClick={handleCloseForm}>×</button>
                        </div>
                        
                        <form onSubmit={editingSupplier ? handleSaveEdit : handleAddSupplier} className="supplier-form">
                            <div className="form-body">
                            {/* Información básica */}
                            <div className="form-section">
                                <h4>{t('suppliers.form.basicInfo')}</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('suppliers.form.nameLabel')} *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            placeholder={t('suppliers.form.namePlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('suppliers.form.categoryLabel')}</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">{t('suppliers.form.selectCategory')}</option>
                                            {getUniqueCategories().map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('suppliers.form.contactLabel')}</label>
                                        <input
                                            type="text"
                                            name="contact"
                                            value={formData.contact}
                                            onChange={handleInputChange}
                                            placeholder={t('suppliers.form.contactPlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('suppliers.form.statusLabel')}</label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                        >
                                            <option value="active">{t('suppliers.statuses.active')}</option>
                                            <option value="inactive">{t('suppliers.statuses.inactive')}</option>
                                            <option value="pending">{t('suppliers.statuses.pending')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Información de contacto */}
                            <div className="form-section">
                                <h4>{t('suppliers.form.contactInfo')}</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('suppliers.form.emailLabel')}</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder={t('suppliers.form.emailPlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('suppliers.form.phoneLabel')}</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder={t('suppliers.form.phonePlaceholder')}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t('suppliers.form.addressLabel')}</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder={t('suppliers.form.addressPlaceholder')}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('suppliers.form.cityLabel')}</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            placeholder={t('suppliers.form.cityPlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('suppliers.form.countryLabel')}</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            placeholder={t('suppliers.form.countryPlaceholder')}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t('suppliers.form.websiteLabel')}</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        placeholder={t('suppliers.form.websitePlaceholder')}
                                    />
                                </div>
                            </div>

                            {/* Información comercial */}
                            <div className="form-section">
                                <h4>{t('suppliers.form.businessInfo')}</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('suppliers.form.taxIdLabel')}</label>
                                        <input
                                            type="text"
                                            name="taxId"
                                            value={formData.taxId}
                                            onChange={handleInputChange}
                                            placeholder={t('suppliers.form.taxIdPlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('suppliers.form.paymentTermsLabel')}</label>
                                        <select
                                            name="paymentTerms"
                                            value={formData.paymentTerms}
                                            onChange={handleInputChange}
                                        >
                                            <option value="0">{t('suppliers.paymentTermsOptions.immediate')}</option>
                                            <option value="15">{t('suppliers.paymentTermsOptions.15days')}</option>
                                            <option value="30">{t('suppliers.paymentTermsOptions.30days')}</option>
                                            <option value="45">{t('suppliers.paymentTermsOptions.45days')}</option>
                                            <option value="60">{t('suppliers.paymentTermsOptions.60days')}</option>
                                            <option value="90">{t('suppliers.paymentTermsOptions.90days')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t('suppliers.form.notesLabel')}</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows="4"
                                        placeholder={t('suppliers.form.notesPlaceholder')}
                                    />
                                </div>
                            </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseForm}>
                                    {t('general.cancel')}
                                </button>
                                <button type="submit" className="btn-save">
                                    {editingSupplier ? t('general.saveChanges') : t('suppliers.addSupplier')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
