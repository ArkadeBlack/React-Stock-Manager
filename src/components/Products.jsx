import { useState, useEffect } from 'react';
import './Products.css';
import { useStock } from '../context/StockContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { useAppContext } from '../context/AppProvider.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';

const Products = () => {
    const { user, settings } = useAppContext(); // Obtener el usuario y settings directamente del contexto
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

    const predefinedCategories = Object.keys(t('products.categories', { returnObjects: true }));

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        price: '',
        cost: '',
        sku: '',
        barcode: '',
        supplier: '',
        minStock: '',
        location: 'Almacén A'
    });

    // Usar el contexto global
    const {
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        productsWithInventory,
        suppliers
    } = useStock();

    // Efecto para generar el SKU automáticamente basado en el nombre y la categoría
    useEffect(() => {
        const { name, category } = formData;

        // Generar SKU solo si no ha sido editado manualmente y no estamos en modo de edición.
        if (skuManuallyEdited || editingProduct) {
            return;
        }

        if (name && category) {
            const namePart = name.substring(0, 3).toUpperCase();
            const categoryPart = category.substring(0, 3).toUpperCase();
            const uniquePart = Math.floor(100 + Math.random() * 900);
            const newSku = `${categoryPart}-${namePart}-${uniquePart}`;
            
            setFormData(prev => ({ ...prev, sku: newSku }));
        }
    }, [formData.name, formData.category, editingProduct, skuManuallyEdited]);

    // Filtrar y ordenar productos
    const filteredProducts = productsWithInventory
        .filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                product.sku.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'price':
                    return b.price - a.price;
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return 0;
            }
        });

    // Manejar cambios en el formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'sku') {
            setSkuManuallyEdited(true); // Marcar que el SKU fue editado manualmente
        }
        
        // Si el nombre o la categoría cambian en modo de creación, se resetea el flag para permitir la regeneración.
        if ((name === 'name' || name === 'category') && !editingProduct) {
            setSkuManuallyEdited(false);
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Agregar nuevo producto
    const handleAddProduct = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const newProduct = {
            ...formData,
            price: parseFloat(formData.price),
            cost: parseFloat(formData.cost),
            minStock: parseInt(formData.minStock),
            maxStock: parseInt(formData.minStock) * 5, // Valor por defecto
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0]
        };
        
        try {
            await addProduct(newProduct);
            showNotification(t('products.productAdded'), 'success');
            resetForm();
            setShowAddForm(false);
            setSkuManuallyEdited(false);
        } catch (error) {
            console.error("Error adding product:", error);
            showNotification(t('products.errorAdd'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Editar producto
    const handleEditProduct = (product) => {
        setEditingProduct(product.id);
        setSkuManuallyEdited(true); // Al editar, el SKU se considera "manual" para evitar que se regenere.
        setFormData({
            name: product.name,
            category: product.category,
            description: product.description,
            price: product.price.toString(),
            cost: product.cost.toString(),
            sku: product.sku,
            barcode: product.barcode,
            supplier: product.supplier,
            minStock: product.minStock.toString(),
            location: product.inventory?.location || product.location || 'Almacén A' // Compatible con datos antiguos y nuevos
        });
        setShowAddForm(true);
    };

    // Guardar cambios de edición
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const updatedProduct = {
            id: editingProduct,
            ...formData,
            price: parseFloat(formData.price),
            cost: parseFloat(formData.cost),
            minStock: parseInt(formData.minStock),
            maxStock: parseInt(formData.minStock) * 5, // Asegurarse de que maxStock se actualice
            userId: user.uid
        };
        
        try {
            await updateProduct(editingProduct, updatedProduct);
            showNotification(t('products.productUpdated'), 'success');
            resetForm();
            setShowAddForm(false);
            setEditingProduct(null);
            setSkuManuallyEdited(false);
        } catch (error) {
            console.error("Error updating product:", error);
            showNotification(t('products.errorEdit'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Abrir modal de confirmación para eliminar
    const handleDeleteProduct = (id) => {
        setProductToDelete(id);
        setShowConfirmModal(true);
    };

    // Confirmar y eliminar producto
    const confirmDeleteProduct = async () => {
        if (productToDelete) {
            setDeletingId(productToDelete);
            try {
                await deleteProduct(productToDelete);
                showNotification(t('products.productDeleted'), 'success');
            } catch (error) {
                console.error("Error deleting product:", error);
                showNotification(t('products.errorDelete'), 'error');
            } finally {
                setDeletingId(null);
                setShowConfirmModal(false);
                setProductToDelete(null);
            }
        }
    };

    // Cerrar formulario
    const handleCloseForm = () => {
        setShowAddForm(false);
        setEditingProduct(null);
        resetForm();
        setSkuManuallyEdited(false); // Resetear el flag al cerrar
    };

    // Limpiar formulario
    const resetForm = () => {
        setFormData({
            name: '',
            category: '',
            description: '',
            price: '',
            cost: '',
            sku: '',
            barcode: '',
            supplier: '',
            minStock: '',
            location: 'Almacén A'
        });
    };

    // Calcular margen de ganancia
    const calculateMargin = (price, cost) => {
        if (!price || !cost) return 0;
        return (((price - cost) / price) * 100).toFixed(1);
    };

    // Obtener categorías únicas para el filtro
    const getUniqueCategories = () => {
        const categories = [...new Set(products.map(p => p.category))];
        return categories.filter(Boolean);
    };

    // Calcular estadísticas
    const stats = {
        totalProducts: products.length,
        totalCategories: getUniqueCategories().length,
        totalValue: products.reduce((sum, p) => sum + p.price, 0),
        averageMargin: products.length > 0 
            ? (products.reduce((sum, p) => sum + parseFloat(calculateMargin(p.price, p.cost)), 0) / products.length).toFixed(1)
            : 0
    };

    return (
        <div className="products-container">
            {/* Header */}
            <div className="products-header">
                <div className="header-info">
                    <h2>{t('products.title')}</h2>
                    <p>{t('products.description')}</p>
                </div>
                <button 
                    className="btn-add-product"
                    onClick={() => setShowAddForm(true)}
                >
                    + {t('products.addProduct')}
                </button>
            </div>

            {/* Controles de búsqueda y filtros */}
            <div className="products-controls">
                <div className="search-section">
                    <input
                        type="text"
                        placeholder={t('products.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-section">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">{t('products.allCategories')}</option>
                        {getUniqueCategories().map(category => (
                            <option key={category} value={category}>{t(`products.categories.${category.toLowerCase()}`)}</option>
                        ))}
                    </select>
                    
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="name">{t('products.sortByName')}</option>
                        <option value="price">{t('products.sortByPrice')}</option>
                        <option value="category">{t('products.sortByCategory')}</option>
                        <option value="created">{t('products.sortByLatest')}</option>
                    </select>
                </div>
            </div>

            {/* Estadísticas actualizadas con datos reales */}
            <div className="stats-grid">
    <div className="stat-card primary">
        <div className="stat-header">
            <h3 className="stat-title">{t('products.stats.total')}</h3>
            <span className="stat-icon">📦</span>
        </div>
        <p className="stat-value">{stats.totalProducts}</p>
        <p className="stat-change neutral">{t('products.stats.registered')}</p>
    </div>

    <div className="stat-card success">
        <div className="stat-header">
            <h3 className="stat-title">{t('products.stats.categories')}</h3>
            <span className="stat-icon">📂</span>
        </div>
        <p className="stat-value">{stats.totalCategories}</p>
        <p className="stat-change neutral">{t('products.stats.differentCategories')}</p>
    </div>

    <div className="stat-card warning">
        <div className="stat-header">
            <h3 className="stat-title">{t('products.stats.totalValue')}</h3>
            <span className="stat-icon">💰</span>
        </div>
        <p className="stat-value">{settings.general.currency} {stats.totalValue.toLocaleString()}</p>
        <p className="stat-change positive">{t('products.stats.fullInventory')}</p>
    </div>

    <div className="stat-card info">
        <div className="stat-header">
            <h3 className="stat-title">{t('products.stats.averageMargin')}</h3>
            <span className="stat-icon">📈</span>
        </div>
        <p className="stat-value">{stats.averageMargin}%</p>
        <p className="stat-change positive">{t('products.stats.profitability')}</p>
    </div>
</div>

            {/* Lista de productos */}
            <div className="products-list">
                <div className="products-table-container">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>{t('products.table.product')}</th>
                                <th>{t('products.table.sku')}</th>
                                <th>{t('products.table.category')}</th>
                                <th>{t('products.table.price')}</th>
                                <th>{t('products.table.cost')}</th>
                                <th>{t('products.table.margin')}</th>
                                <th>{t('products.table.currentStock')}</th>
                                <th>{t('products.table.minStock')}</th>
                                <th>{t('products.table.location')}</th>
                                <th>{t('products.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="product-info">
                                            <div className="product-name">{product.name}</div>
                                            <div className="product-description">{product.description}</div>
                                        </div>
                                    </td>
                                    <td className="sku-cell">{product.sku}</td>
                                    <td>{product.category}</td>
                                    <td className="price-cell">{settings.general.currency} {product.price.toFixed(2)}</td>
                                    <td className="cost-cell">{settings.general.currency} {product.cost.toFixed(2)}</td>
                                    <td className="margin-cell">
                                        <span className={`margin ${parseFloat(calculateMargin(product.price, product.cost)) > 30 ? 'good' : 'low'}`}>
                                            {calculateMargin(product.price, product.cost)}%
                                        </span>
                                    </td>
                                    <td className="stock-cell">{product.inventory.currentStock}</td>
                                    <td className="stock-cell">{product.minStock}</td>
                                    <td>{product.inventory?.location || product.location}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-edit"
                                                onClick={() => handleEditProduct(product)}
                                                title={t('general.edit')}
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDeleteProduct(product.id)}
                                                title={t('general.delete')}
                                                disabled={deletingId === product.id}
                                            >
                                                {deletingId === product.id ? '⏳' : '🗑️'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal/Formulario para agregar/editar producto */}
            {showAddForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingProduct ? t('products.editTitle') : t('products.addTitle')}</h3>
                            <button className="modal-close" onClick={handleCloseForm}>×</button>
                        </div>
                        
                        <form onSubmit={editingProduct ? handleSaveEdit : handleAddProduct} className="product-form">
                            <div className="form-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('products.form.nameLabel')} *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder={t('products.form.namePlaceholder')}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>{t('products.form.skuLabel')} *</label>
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku}
                                        onChange={handleInputChange}
                                        required
                                        placeholder={t('products.form.skuPlaceholder')}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('products.form.categoryLabel')} *</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">{t('products.form.selectCategory')}</option>
                                        {predefinedCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>{t('products.form.barcodeLabel')}</label>
                                    <input
                                        type="text"
                                        name="barcode"
                                        value={formData.barcode}
                                        onChange={handleInputChange}
                                        placeholder={t('products.form.barcodePlaceholder')}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t('products.form.descriptionLabel')}</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder={t('products.form.descriptionPlaceholder')}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('products.form.priceLabel')} *</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        required
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>{t('products.form.costLabel')} *</label>
                                    <input
                                        type="number"
                                        name="cost"
                                        value={formData.cost}
                                        onChange={handleInputChange}
                                        required
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('products.form.supplierLabel')}</label>
                                    <select
                                        name="supplier"
                                        value={formData.supplier}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">{t('products.form.selectSupplier')}</option>
                                        {suppliers.map(supplier => (
                                            <option key={supplier.id} value={supplier.name}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>{t('products.form.minStockLabel')} *</label>
                                    <input
                                        type="number"
                                        name="minStock"
                                        value={formData.minStock}
                                        onChange={handleInputChange}
                                        required
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t('products.form.locationLabel')} *</label>
                                <select
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="Almacén A">{t('products.locations.warehouseA')}</option>
                                    <option value="Almacén B">{t('products.locations.warehouseB')}</option>
                                    <option value="Almacén C">{t('products.locations.warehouseC')}</option>
                                    <option value="Tienda Principal">{t('products.locations.mainStore')}</option>
                                </select>
                            </div>

                            {formData.price && formData.cost && (
                                <div className="margin-preview">
                                    <strong>{t('products.form.marginPreview')}: {calculateMargin(formData.price, formData.cost)}%</strong>
                                </div>
                            )}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseForm} disabled={isSubmitting}>
                                    {t('general.cancel')}
                                </button>
                                <button type="submit" className="btn-save" disabled={isSubmitting}>
                                    {isSubmitting 
                                        ? (editingProduct ? t('general.saving') : t('general.add'))
                                        : (editingProduct ? t('orders.form.saveChanges') : t('products.addProduct'))
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmDeleteProduct}
                title={t('products.deleteProduct')}
                message={t('products.confirmDelete')}
                isSubmitting={deletingId !== null}
            />
        </div>
    );
};

export default Products;
