import { useState, useEffect } from 'react';
import './Orders.css';
import { useStock } from '../context/StockContext.jsx';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext.jsx';
import { useAppContext } from '../context/AppProvider.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';

const Orders = () => {
    const { user, settings } = useAppContext(); // Obtener el usuario y settings directamente del contexto
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('created');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [formData, setFormData] = useState({
        type: 'outbound',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        notes: '',
        expectedDelivery: '',
        status: 'pending'
    });

    // Usar el contexto global
    const {
        orders,
        products,
        addOrder,
        updateOrder,
        deleteOrder,
        productsWithInventory, // <--- USAR EL VALOR MEMORIZADO
    } = useStock();

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

    // Filtrar y ordenar pedidos
    const filteredOrders = orders
        .filter(order => {
            const matchesSearch = order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                order.id.toString().includes(searchTerm);
            const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
            const matchesType = filterType === 'all' || order.type === filterType;
            return matchesSearch && matchesStatus && matchesType;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'customer':
                    return (a.customerName || '').localeCompare(b.customerName || '');
                case 'total':
                    return b.totalAmount - a.totalAmount;
                case 'status':
                    return a.status.localeCompare(b.status);
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

    // Agregar item al pedido
    const addOrderItem = () => {
        setOrderItems(prev => [...prev, {
            id: Date.now(),
            productId: '',
            quantity: 1,
            unitPrice: 0
        }]);
    };

    // Actualizar item del pedido
    const updateOrderItem = (itemId, field, value) => {
        setOrderItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };
                
                // Si cambia el producto, actualizar el precio
                if (field === 'productId') {
                    const productData = productsWithInventory.find(p => p.id === value);
                    updatedItem.unitPrice = productData ? productData.price : 0;
                }
                
                return updatedItem;
            }
            return item;
        }));
    };

    // Eliminar item del pedido
    const removeOrderItem = (itemId) => {
        setOrderItems(prev => prev.filter(item => item.id !== itemId));
    };

    // Calcular total del pedido
    const calculateOrderTotal = () => {
        return orderItems.reduce((total, item) => {
            return total + (item.quantity * item.unitPrice);
        }, 0);
    };

    // Agregar nuevo pedido
    const handleAddOrder = async (e) => {
        e.preventDefault();
        
        if (orderItems.length === 0) {
            showNotification(t('orders.addProductsError'), 'error');
            return;
        }

        // Validar stock disponible para pedidos de salida
        if (formData.type === 'outbound') {
            for (const item of orderItems) {
                const productData = productsWithInventory.find(p => p.id === item.productId);
                if (!productData || productData.inventory.availableStock < item.quantity) {
                    showNotification(`${t('orders.insufficientStockError')} ${productData?.name}. ${t('orders.availableStock')}: ${productData?.inventory.availableStock || 0}`, 'error');
                    return;
                }
            }
        }

        setIsSubmitting(true);
        const newOrder = {
            ...formData,
            items: orderItems.map(item => ({
                productId: item.productId, // No convertir a entero, es un string
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice)
            })),
            totalAmount: calculateOrderTotal(),
            createdBy: user.displayName || user.email // Usar displayName o email como fallback
        };
        
        try {
            await addOrder(newOrder);
            showNotification(t('orders.orderAdded'), 'success');
            resetForm();
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding order:", error);
            showNotification(t('orders.errorAdd'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Editar pedido
    const handleEditOrder = (order) => {
        setEditingOrder(order.id);
        setFormData({
            type: order.type,
            customerName: order.customerName || '',
            customerEmail: order.customerEmail || '',
            customerPhone: order.customerPhone || '',
            notes: order.notes || '',
            expectedDelivery: order.expectedDelivery || '',
            status: order.status
        });
        setOrderItems(order.items.map(item => ({
            id: Date.now() + Math.random(),
            productId: item.productId.toString(),
            quantity: item.quantity,
            unitPrice: item.unitPrice
        })));
        setShowAddForm(true);
    };

    // Guardar cambios de edición
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const updatedOrder = {
            id: editingOrder,
            ...formData,
            items: orderItems.map(item => ({
                productId: item.productId, // No convertir a entero, es un string
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice)
            })),
            totalAmount: calculateOrderTotal(),
            userId: user.uid
        };
        
        try {
            await updateOrder(editingOrder, updatedOrder);
            showNotification(t('orders.orderUpdated'), 'success');
            resetForm();
            setShowAddForm(false);
            setEditingOrder(null);
        } catch (error) {
            console.error("Error updating order:", error);
            showNotification(t('orders.errorEdit'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cambiar estado del pedido
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await updateOrder(orderId, { status: newStatus });
            showNotification(t('orders.orderUpdated'), 'success');
        } catch (error) {
            console.error("Error updating order status:", error);
            showNotification(t('orders.errorStatus'), 'error');
        }
    };

    // Abrir modal de confirmación para eliminar
    const handleDeleteOrder = (id) => {
        setOrderToDelete(id);
        setShowConfirmModal(true);
    };

    // Confirmar y eliminar pedido
    const confirmDeleteOrder = async () => {
        if (orderToDelete) {
            try {
                await deleteOrder(orderToDelete);
                showNotification(t('orders.orderDeleted'), 'success');
            } catch (error) {
                console.error("Error deleting order:", error);
                showNotification(t('orders.errorDelete'), 'error');
            } finally {
                setShowConfirmModal(false);
                setOrderToDelete(null);
            }
        }
    };

    // Cerrar formulario
    const handleCloseForm = () => {
        setShowAddForm(false);
        setEditingOrder(null);
        resetForm();
    };

    // Limpiar formulario
    const resetForm = () => {
        setFormData({
            type: 'outbound',
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            notes: '',
            expectedDelivery: '',
            status: 'pending'
        });
        setOrderItems([]);
    };

    // Obtener texto del estado
    const getStatusText = (status) => {
        const statusMap = {
            pending: t('orders.statuses.pending'),
            completed: t('orders.statuses.completed'),
            cancelled: t('orders.statuses.cancelled')
        };
        return statusMap[status] || status;
    };

    // Obtener clase CSS del estado
    const getStatusClass = (status) => {
        const classMap = {
            pending: 'pending',
            completed: 'completed',
            cancelled: 'cancelled'
        };
        return classMap[status] || 'pending';
    };

    // Calcular estadísticas
    const stats = {
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    };

    return (
        <div className="orders-container">
            {/* Header */}
            <div className="orders-header">
                <div className="header-info">
                    <h2>{t('orders.title')}</h2>
                    <p>{t('orders.description')}</p>
                </div>
                <button 
                    className="btn-add-order"
                    onClick={() => setShowAddForm(true)}
                >
                    + {t('orders.addOrder')}
                </button>
            </div>

            {/* Controles de búsqueda y filtros */}
            <div className="orders-controls">
                <div className="search-section">
                    <input
                        type="text"
                        placeholder={t('orders.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-section">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">{t('orders.allTypes')}</option>
                        <option value="inbound">{t('orders.inbound')}</option>
                        <option value="outbound">{t('orders.outbound')}</option>
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">{t('orders.allStatuses')}</option>
                        <option value="pending">{t('orders.statuses.pending')}</option>
                        <option value="completed">{t('orders.statuses.completed')}</option>
                        <option value="cancelled">{t('orders.statuses.cancelled')}</option>
                    </select>
                    
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="created">{t('orders.sortBy.latest')}</option>
                        <option value="customer">{t('orders.sortBy.customer')}</option>
                        <option value="total">{t('orders.sortBy.amount')}</option>
                        <option value="status">{t('orders.sortBy.status')}</option>
                    </select>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="stats-grid">
    <div className="stat-card warning">
        <div className="stat-header">
            <h3 className="stat-title">{t('orders.stats.pending')}</h3>
            <span className="stat-icon">⏳</span>
        </div>
        <p className="stat-value">{stats.pendingOrders}</p>
        <p className="stat-change negative">{t('orders.stats.needsAttention')}</p>
    </div>

    <div className="stat-card success">
        <div className="stat-header">
            <h3 className="stat-title">{t('orders.stats.completed')}</h3>
            <span className="stat-icon">✅</span>
        </div>
        <p className="stat-value">{stats.completedOrders}</p>
        <p className="stat-change positive">{t('orders.stats.thisMonth')}</p>
    </div>

    <div className="stat-card danger">
        <div className="stat-header">
            <h3 className="stat-title">{t('orders.statuses.cancelled')}</h3>
            <span className="stat-icon">❌</span>
        </div>
        <p className="stat-value">{stats.cancelledOrders}</p>
        <p className="stat-change neutral">{t('orders.stats.totalOrders')}</p>
    </div>
</div>

            {/* Lista de pedidos */}
            <div className="orders-list">
                <div className="orders-table-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>{t('orders.table.id')}</th>
                                <th>{t('orders.table.type')}</th>
                                <th>{t('orders.table.customer')}</th>
                                <th>{t('orders.table.products')}</th>
                                <th>{t('orders.table.total')}</th>
                                <th>{t('orders.table.status')}</th>
                                <th>{t('orders.table.date')}</th>
                                <th>{t('orders.table.delivery')}</th>
                                <th>{t('orders.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td data-label={t('orders.table.id')} className="order-id">#{order.id}</td>
                                    <td data-label={t('orders.table.type')}>
                                        <span className={`type-badge ${order.type}`}>
                                            {order.type === 'inbound' ? t('orders.inbound') : t('orders.outbound')}
                                        </span>
                                    </td>
                                    <td data-label={t('orders.table.customer')} className="customer-info">
                                        <div>{order.customerName || 'N/A'}</div>
                                        {order.customerEmail && (
                                            <div className="customer-email">{order.customerEmail}</div>
                                        )}
                                    </td>
                                    <td data-label={t('orders.table.products')} className="products-count">
                                        {order.items?.length || 0} {t('orders.table.productsCount')}
                                    </td>
                                    <td data-label={t('orders.table.total')} className="order-total">
                                        {settings.general.currency} {(order.totalAmount || 0).toFixed(2)}
                                    </td>
                                    <td data-label={t('orders.table.status')}>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            className={`status-select ${getStatusClass(order.status)}`}
                                        >
                                            <option value="pending">{t('orders.statuses.pending')}</option>
                                            <option value="completed">{t('orders.statuses.completed')}</option>
                                            <option value="cancelled">{t('orders.statuses.cancelled')}</option>
                                        </select>
                                    </td>
                                    <td data-label={t('orders.table.date')}>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td data-label={t('orders.table.delivery')}>
                                        {order.expectedDelivery 
                                            ? new Date(order.expectedDelivery).toLocaleDateString()
                                            : 'N/A'
                                        }
                                    </td>
                                    <td data-label={t('orders.table.actions')}>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-edit"
                                                onClick={() => handleEditOrder(order)}
                                                title={t('general.edit')}
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDeleteOrder(order.id)}
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

            {/* Modal/Formulario para agregar/editar pedido */}
            {showAddForm && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingOrder ? t('orders.editOrder') : t('orders.addOrder')}</h3>
                            <button className="modal-close" onClick={handleCloseForm}>×</button>
                        </div>
                        
                        <form onSubmit={editingOrder ? handleSaveEdit : handleAddOrder} className="order-form">
                            <div className="form-body">
                            {/* Información básica */}
                            <div className="form-section">
                                <h4>{t('orders.form.orderInfo')}</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('orders.form.orderType')} *</label>
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="outbound">{t('orders.form.outboundSale')}</option>
                                            <option value="inbound">{t('orders.form.inboundPurchase')}</option>
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('orders.form.status')}</label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                        >
                                            <option value="pending">{t('orders.statuses.pending')}</option>
                                            <option value="completed">{t('orders.statuses.completed')}</option>
                                            <option value="cancelled">{t('orders.statuses.cancelled')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            {formData.type === 'outbound' ? t('orders.form.customer') : t('orders.form.supplier')} *
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={formData.customerName}
                                            onChange={handleInputChange}
                                            required
                                            placeholder={formData.type === 'outbound' ? t('orders.form.customerNamePlaceholder') : t('orders.form.supplierNamePlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('orders.form.email')}</label>
                                        <input
                                            type="email"
                                            name="customerEmail"
                                            value={formData.customerEmail}
                                            onChange={handleInputChange}
                                            placeholder={t('orders.form.emailPlaceholder')}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('orders.form.phone')}</label>
                                        <input
                                            type="tel"
                                            name="customerPhone"
                                            value={formData.customerPhone}
                                            onChange={handleInputChange}
                                            placeholder={t('orders.form.phonePlaceholder')}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>{t('orders.form.expectedDelivery')}</label>
                                        <input
                                            type="date"
                                            name="expectedDelivery"
                                            value={formData.expectedDelivery}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t('orders.form.notes')}</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows="3"
                                        placeholder={t('orders.form.notesPlaceholder')}
                                    />
                                </div>
                            </div>

                            {/* Productos */}
                            <div className="form-section">
                                <div className="section-header">
                                    <h4>{t('orders.form.products')}</h4>
                                    <button 
                                        type="button" 
                                        className="btn-add-item"
                                        onClick={addOrderItem}
                                    >
                                        + {t('orders.form.addProduct')}
                                    </button>
                                </div>

                                <div className="order-items">
                                    {orderItems.map(item => (
                                        <div key={item.id} className="order-item">
                                            <div className="item-row">
                                                <div className="item-product" data-label={t('orders.form.product')}>
                                                    <select
                                                        value={item.productId}
                                                        onChange={(e) => updateOrderItem(item.id, 'productId', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">{t('orders.form.selectProduct')}</option>
                                                        {productsWithInventory.map(product => (
                                                            <option key={product.id} value={product.id}>
                                                                {product.name} - SKU: {product.sku}
                                                                {formData.type === 'outbound' && (
                                                                    ` (${t('products.stock')}: ${product.inventory.availableStock || 0})`
                                                                )}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div className="item-quantity" data-label={t('orders.form.quantityPlaceholder')}>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateOrderItem(item.id, 'quantity', e.target.value)}
                                                        min="1"
                                                        placeholder={t('orders.form.quantityPlaceholder')}
                                                        required
                                                    />
                                                </div>
                                                
                                                <div className="item-price" data-label={t('orders.form.pricePlaceholder')}>
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateOrderItem(item.id, 'unitPrice', e.target.value)}
                                                        step="0.01"
                                                        min="0"
                                                        placeholder={t('orders.form.pricePlaceholder')}
                                                        required
                                                    />
                                                </div>
                                                
                                                <div className="item-total" data-label={t('orders.form.total')}>
                                                    {settings.general.currency} {(item.quantity * item.unitPrice).toFixed(2)}
                                                </div>
                                                
                                                <button
                                                    type="button"
                                                    className="btn-remove-item"
                                                    onClick={() => removeOrderItem(item.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {orderItems.length > 0 && (
                                    <div className="order-summary">
                                        <div className="summary-row">
                                            <strong>{t('orders.form.total')}: {settings.general.currency} {calculateOrderTotal().toFixed(2)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseForm} disabled={isSubmitting}>
                                    {t('general.cancel')}
                                </button>
                                <button type="submit" className="btn-save" disabled={isSubmitting}>
                                    {isSubmitting
                                        ? (editingOrder ? t('general.saving') : t('general.add'))
                                        : (editingOrder ? t('orders.form.saveChanges') : t('orders.form.createOrder'))
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
                onConfirm={confirmDeleteOrder}
                title={t('orders.deleteOrder')}
                message={t('orders.confirmDelete')}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Orders;
