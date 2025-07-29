import { useState } from 'react';
import './Inventory.css';
import { useStock } from '../context/StockContext.jsx';
import { useLanguage } from '../context/LanguageContext';
import { useAppContext } from '../context/AppProvider.jsx';
import { useNotification } from '../context/NotificationContext.jsx';

const Inventory = () => {
    const { user } = useAppContext();
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('table');
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockAdjustment, setStockAdjustment] = useState({
        newStock: '',
        reason: '',
        type: 'adjustment'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Estado para modal rápido
    const [showQuickModal, setShowQuickModal] = useState(false);
    const [quickStockData, setQuickStockData] = useState({
        productId: null,
        productName: '',
        currentStock: 0,
        newStock: ''
    });

    // Usar el contexto global
    const {
        productsWithInventory,
        updateStock,
        lowStockProducts,
        outOfStockProducts,
        products
    } = useStock();

    const inventoryData = productsWithInventory;

    // Filtrar y ordenar datos
    const filteredData = inventoryData
        .filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'stock':
                    return b.inventory.currentStock - a.inventory.currentStock;
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });

    // Obtener estado del stock
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

    // Abrir modal de ajuste de stock
    const openStockModal = (product) => {
        setSelectedProduct(product);
        setStockAdjustment({
            newStock: product.inventory.currentStock.toString(),
            reason: '',
            type: 'adjustment'
        });
        setShowStockModal(true);
    };

    // Manejar ajuste de stock
    const handleStockAdjustment = async (e) => {
        e.preventDefault();
        
        if (!selectedProduct || !stockAdjustment.newStock || !stockAdjustment.reason) {
            showNotification(t('inventory.fillAllFields'), 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const newStock = parseInt(stockAdjustment.newStock);
            await updateStock(selectedProduct.id, 
                { currentStock: newStock }, 
                { type: stockAdjustment.type, reason: stockAdjustment.reason }
            );
            
            showNotification(t('inventory.stockUpdated'), 'success');
            setShowStockModal(false);
            setSelectedProduct(null);
            setStockAdjustment({ newStock: '', reason: '', type: 'adjustment' });
        } catch (error) {
            console.error("Error al ajustar el stock:", error);
            showNotification(t('inventory.errorAdjustingStock'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Función para ajuste rápido
    const handleQuickStockAdjustment = (product) => {
        setQuickStockData({
            productId: product.id,
            productName: product.name,
            currentStock: product.inventory.currentStock,
            newStock: product.inventory.currentStock.toString()
        });
        setShowQuickModal(true);
    };

    // Confirmar ajuste rápido
    const confirmQuickAdjustment = async (e) => {
        e.preventDefault();
        
        if (!quickStockData.newStock || isNaN(quickStockData.newStock)) {
            showNotification(t('inventory.enterValidStock'), 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const newStock = parseInt(quickStockData.newStock);
            await updateStock(quickStockData.productId, 
                { currentStock: newStock }, 
                { type: 'quick_adjustment', reason: t('inventory.quickAdjustmentReason') }
            );

            showNotification(t('inventory.stockUpdated'), 'success');
            setShowQuickModal(false);
            setQuickStockData({ productId: null, productName: '', currentStock: 0, newStock: '' });
        } catch (error) {
            console.error("Error en el ajuste rápido de stock:", error);
            showNotification(t('inventory.errorAdjustingStock'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Obtener categorías únicas
    const getUniqueCategories = () => {
        return [...new Set(products.map(p => p.category))].filter(Boolean);
    };

    return (
        <div className="inventory-container">
            {/* Header con controles */}
            <div className="inventory-header">
                <div className="header-controls">
                    <div className="search-control">
                        <input
                            type="text"
                            placeholder={t('general.search') + ' ' + t('general.products').toLowerCase() + '...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    
                    <div className="filter-controls">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">{t('products.allCategories')}</option>
                            {getUniqueCategories().map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                        >
                            <option value="name">{t('products.sortByName')}</option>
                            <option value="stock">{t('products.sortByStock')}</option>
                            <option value="category">{t('products.sortByCategory')}</option>
                        </select>
                    </div>
                    
                    <div className="view-controls">
                        <button
                            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title={t('inventory.tableView')}
                        >
                            📋
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title={t('inventory.cardView')}
                        >
                            📱
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadísticas actualizadas con datos reales */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.totalProducts')}</h3>
                        <span className="stat-icon">📦</span>
                    </div>
                    <p className="stat-value">{inventoryData.length}</p>
                    <p className="stat-change neutral">{t('inventory.productsInInventory')}</p>
                </div>

                <div className="stat-card warning">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.lowStock')}</h3>
                        <span className="stat-icon">⚠️</span>
                    </div>
                    <p className="stat-value">{lowStockProducts.length}</p>
                    <p className="stat-change negative">{t('inventory.needsRestock')}</p>
                </div>

                <div className="stat-card danger">
                    <div className="stat-header">
                        <h3 className="stat-title">{t('dashboard.outOfStock')}</h3>
                        <span className="stat-icon">❌</span>
                    </div>
                    <p className="stat-value">{outOfStockProducts.length}</p>
                    <p className="stat-change negative">{t('inventory.outOfStockProducts')}</p>
                </div>

            </div>

            {/* Vista de tabla */}
            {viewMode === 'table' && (
                <div className="inventory-table-container">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>{t('products.name')}</th>
                                <th>{t('products.category')}</th>
                                <th>{t('inventory.currentStock')}</th>
                                <th>{t('inventory.minStock')}</th>
                                <th>{t('products.location')}</th>
                                <th>{t('general.status')}</th>
                                <th>{t('inventory.lastUpdated')}</th>
                                <th>{t('general.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.id}>
                                    <td data-label={t('products.name')} className="product-name">{item.name}</td>
                                    <td data-label={t('products.category')}>{item.category}</td>
                                    <td data-label={t('inventory.currentStock')} className="stock-number">{item.inventory.currentStock}</td>
                                    <td data-label={t('inventory.minStock')} className="min-stock-number">{item.inventory.minStock}</td>
                                    <td data-label={t('products.location')}>{item.inventory.location}</td>
                                    <td data-label={t('general.status')}>
                                        <span className={`status ${getStockStatus(item.inventory.currentStock, item.inventory.minStock)}`}>
                                            {getStockStatusText(item.inventory.currentStock, item.inventory.minStock)}
                                        </span>
                                    </td>
                                    <td data-label={t('inventory.lastUpdated')}>
                                        {item.inventory.lastUpdated && new Date(item.inventory.lastUpdated.seconds ? item.inventory.lastUpdated.toDate() : item.inventory.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td data-label={t('general.actions')}>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action btn-adjust" 
                                                title={t('inventory.adjustStock')}
                                                onClick={() => openStockModal(item)}
                                            >
                                                📊
                                            </button>
                                            <button 
                                                className="btn-action btn-quick" 
                                                title={t('inventory.quickAdjustment')}
                                                onClick={() => handleQuickStockAdjustment(item)}
                                            >
                                                ⚡
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Vista de tarjetas */}
            {viewMode === 'cards' && (
                <div className="inventory-cards">
                    {filteredData.map(item => (
                        <div key={item.id} className="inventory-card">
                            <div className="card-header">
                                <h3>{item.name}</h3>
                                <span className={`status ${getStockStatus(item.inventory.currentStock, item.inventory.minStock)}`}>
                                    {getStockStatusText(item.inventory.currentStock, item.inventory.minStock)}
                                </span>
                            </div>
                            <div className="card-body">
                                <p><strong>{t('products.category')}:</strong> {item.category}</p>
                                <p><strong>{t('products.stock')}:</strong> {item.inventory.currentStock} / {item.inventory.minStock} ({t('inventory.min')})</p>
                                <p><strong>{t('products.location')}:</strong> {item.inventory.location}</p>
                                <p><strong>{t('inventory.updated')}:</strong> {item.inventory.lastUpdated && new Date(item.inventory.lastUpdated.seconds ? item.inventory.lastUpdated.toDate() : item.inventory.lastUpdated).toLocaleDateString()}</p>
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="btn-action btn-adjust"
                                    onClick={() => openStockModal(item)}
                                >
                                    {t('inventory.adjustStock')}
                                </button>
                                <button 
                                    className="btn-action btn-quick"
                                    onClick={() => handleQuickStockAdjustment(item)}
                                >
                                    {t('inventory.quickAdjustment')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para ajuste de stock */}
            {showStockModal && selectedProduct && (
                <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('inventory.adjustStock')} - {selectedProduct.name}</h3>
                            <button 
                                className="modal-close" 
                                onClick={() => setShowStockModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleStockAdjustment} className="stock-form">
                            <div className="form-body">
                                                        <div className="form-group">
                                <label htmlFor="stockType">{t('inventory.adjustmentType')}</label>
                                <select
                                    id="stockType"
                                    value={stockAdjustment.type}
                                    onChange={(e) => setStockAdjustment({...stockAdjustment, type: e.target.value})}
                                    className="form-control"
                                >
                                    <option value="adjustment">{t('inventory.manualAdjustment')}</option>
                                    <option value="restock">{t('inventory.restock')}</option>
                                    <option value="sale">{t('inventory.sale')}</option>
                                    <option value="return">{t('inventory.return')}</option>
                                    <option value="damaged">{t('inventory.damaged')}</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="currentStock">{t('inventory.currentStock')}</label>
                                <input
                                    type="text"
                                    id="currentStock"
                                    value={selectedProduct.inventory.currentStock}
                                    disabled
                                    className="form-control"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="newStock">{t('inventory.newStock')}</label>
                                <input
                                    type="number"
                                    id="newStock"
                                    value={stockAdjustment.newStock}
                                    onChange={(e) => setStockAdjustment({...stockAdjustment, newStock: e.target.value})}
                                    min="0"
                                    className="form-control"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="reason">{t('inventory.reason')}</label>
                                <textarea
                                    id="reason"
                                    value={stockAdjustment.reason}
                                    onChange={(e) => setStockAdjustment({...stockAdjustment, reason: e.target.value})}
                                    className="form-control"
                                    placeholder={t('inventory.reasonPlaceholder')}
                                    required
                                ></textarea>
                            </div>
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => setShowStockModal(false)}
                                    disabled={isSubmitting}
                                >
                                    {t('general.cancel')}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-save"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? t('general.saving') : t('general.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal para ajuste rápido */}
            {showQuickModal && (
                <div className="modal-overlay" onClick={() => setShowQuickModal(false)}>
                    <div className="modal-content quick-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('inventory.quickAdjustment')}</h3>
                            <button 
                                className="modal-close" 
                                onClick={() => setShowQuickModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={confirmQuickAdjustment} className="quick-form">
                            <div className="form-body">
                            <div className="product-info">
                                <p className="product-name">{quickStockData.productName}</p>
                                <p className="current-stock">
                                    {t('inventory.currentStock')}: <strong>{quickStockData.currentStock}</strong>
                                </p>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="quickNewStock">{t('inventory.newStock')}</label>
                                <input
                                    type="number"
                                    id="quickNewStock"
                                    value={quickStockData.newStock}
                                    onChange={(e) => setQuickStockData({...quickStockData, newStock: e.target.value})}
                                    min="0"
                                    className="form-control"
                                    required
                                />
                            </div>
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => setShowQuickModal(false)}
                                    disabled={isSubmitting}
                                >
                                    {t('general.cancel')}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-save"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? t('general.saving') : t('general.confirm')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
