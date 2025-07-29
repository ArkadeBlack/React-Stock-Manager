import { useState, useEffect } from 'react';
import { useStock } from '../context/StockContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { addDays, subDays, isWithinInterval, parseISO } from 'date-fns';
import './Reports.css';

const Reports = ({ user }) => {
    const { t } = useLanguage();
    const {
        products,
        inventory,
        orders,
        suppliers,
        stockMovements,
        dashboardStats,
        productsWithInventory,
        lowStockProducts,
        outOfStockProducts
    } = useStock();

    const [activeReport, setActiveReport] = useState('overview');
    const [dateRange, setDateRange] = useState('30');
    const [exportFormat, setExportFormat] = useState('csv'); // Cambiado a 'csv' por defecto

    // Calcular métricas avanzadas
    const calculateAdvancedMetrics = () => {
        const today = new Date();
        const startDate = subDays(today, parseInt(dateRange));
        const endDate = addDays(today, 1); // Para incluir el día actual completo

        // Filtrar órdenes por rango de fechas
        const filteredOrders = orders.filter(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : parseISO(order.createdAt);
            return isWithinInterval(orderDate, { start: startDate, end: endDate });
        });

        // Recalcular dashboardStats para el rango de fechas (si aplica)
        // Para este reporte, usaremos los productos e inventario completos,
        // pero las órdenes y movimientos de stock sí se filtrarán.
        const stats = dashboardStats; // Mantener stats generales para overview

        // Valor total del inventario por categoría (siempre sobre el inventario actual)
        const inventoryByCategory = productsWithInventory.reduce((acc, product) => {
            const category = product.category || t('products.noCategory');
            const value = product.inventory.currentStock * product.price;
            acc[category] = (acc[category] || 0) + value;
            return acc;
        }, {});

        // Productos más vendidos (basado en pedidos de salida dentro del rango de fechas)
        const productSales = filteredOrders
            .filter(order => order.type === 'outbound')
            .reduce((acc, order) => {
                order.items.forEach(item => {
                    acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
                });
                return acc;
            }, {});

        const topProducts = Object.entries(productSales)
            .map(([productId, totalQuantitySold]) => {
                const product = productsWithInventory.find(p => p.id === productId);
                return product ? { ...product, totalQuantitySold } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
            .slice(0, 5);

        // Análisis de proveedores (siempre sobre todos los proveedores, pero se podría filtrar por actividad)
        const supplierAnalysis = suppliers.map(supplier => {
            const supplierProducts = products.filter(p => p.supplier === supplier.name);
            const totalValue = supplierProducts.reduce((sum, product) => {
                const inv = inventory.find(i => i.productId === product.id);
                return sum + (inv ? inv.currentStock * product.price : 0);
            }, 0);
            
            return {
                ...supplier,
                productCount: supplierProducts.length,
                totalValue
            };
        }).sort((a, b) => b.totalValue - a.totalValue);

        return {
            ...stats, // Mantener stats generales para overview
            inventoryByCategory,
            topProducts,
            supplierAnalysis,
            totalSuppliers: suppliers.length,
            totalOrders: filteredOrders.length, // Total de órdenes en el rango de fechas
            averageOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0) / filteredOrders.length : 0
        };
    };

    const metrics = calculateAdvancedMetrics();

    // Función para exportar reportes
    const handleExport = (format) => {
        const reportData = {
            generatedAt: new Date().toISOString(),
            user: user.name,
            reportType: activeReport,
            dateRange,
            data: metrics
        };

        if (format === 'json') {
            const dataStr = JSON.stringify(reportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte-${activeReport}-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
        } else if (format === 'csv') {
            const csvData = productsWithInventory.map(product => ({
                Nombre: product.name,
                SKU: product.sku,
                Categoría: product.category,
                'Stock Actual': product.inventory.currentStock,
                'Stock Mínimo': product.inventory.minStock,
                'Stock Máximo': product.inventory.maxStock,
                Precio: product.price,
                'Valor Total': product.inventory.currentStock * product.price,
                Ubicación: product.inventory.location,
                Estado: product.inventory.currentStock === 0 ? 'Sin Stock' : 
                       product.inventory.currentStock <= product.inventory.minStock ? 'Stock Bajo' : 'En Stock'
            }));

            const csvHeaders = Object.keys(csvData[0] || {}).join(',');
            const csvRows = csvData.map(row => Object.values(row).join(','));
            const csvContent = [csvHeaders, ...csvRows].join('\n');
            
            const dataBlob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `inventario-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }
    };

    const renderOverviewReport = () => (
        <div className="report-content">
            <div className="report-header">
                <h2>{t('reports.overview.title')}</h2>
                <p>{t('reports.overview.description')}</p>
            </div>

            {/* Métricas principales */}
            <div className="metrics-grid">
                <div className="metric-card primary">
                    <div className="metric-icon">📦</div>
                    <div className="metric-info">
                        <h3>{metrics.totalProducts}</h3>
                        <p>{t('reports.overview.totalProducts')}</p>
                    </div>
                </div>
                <div className="metric-card success">
                    <div className="metric-icon">💰</div>
                    <div className="metric-info">
                        <h3>${metrics.totalInventoryValue.toLocaleString()}</h3>
                        <p>{t('reports.overview.inventoryValue')}</p>
                    </div>
                </div>
                <div className="metric-card warning">
                    <div className="metric-icon">⚠️</div>
                    <div className="metric-info">
                        <h3>{metrics.lowStockCount}</h3>
                        <p>{t('reports.overview.lowStock')}</p>
                    </div>
                </div>
                <div className="metric-card danger">
                    <div className="metric-icon">❌</div>
                    <div className="metric-info">
                        <h3>{metrics.outOfStockCount}</h3>
                        <p>{t('reports.overview.outOfStock')}</p>
                    </div>
                </div>
            </div>

            {/* Gráficos y análisis */}
            <div className="charts-grid">
                {/* Inventario por categoría */}
                <div className="chart-card">
                    <h3>{t('reports.overview.inventoryByCategory')}</h3>
                    <div className="category-chart">
                        {Object.entries(metrics.inventoryByCategory).map(([category, value]) => (
                            <div key={category} className="category-item">
                                <div className="category-info">
                                    <span className="category-name">{category}</span>
                                    <span className="category-value">${value.toLocaleString()}</span>
                                </div>
                                <div className="category-bar">
                                    <div 
                                        className="category-fill"
                                        style={{ 
                                            width: `${(value / Math.max(...Object.values(metrics.inventoryByCategory))) * 100}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top productos */}
                <div className="chart-card">
                    <h3>{t('reports.overview.topMovingProducts')}</h3>
                    <div className="top-products">
                        {metrics.topProducts.map((product, index) => (
                            <div key={product.id} className="top-product-item">
                                <div className="product-rank">#{index + 1}</div>
                                <div className="product-details">
                                    <div className="product-name">{product.name}</div>
                                    <div className="product-stats">
                                        {t('reports.overview.stock')}: {product.inventory.currentStock} | 
                                        {t('reports.overview.value')}: ${(product.inventory.currentStock * product.price).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderInventoryReport = () => (
        <div className="report-content">
            <div className="report-header">
                <h2>{t('reports.inventory.title')}</h2>
                <p>{t('reports.inventory.description')}</p>
            </div>

            {/* Alertas de inventario */}
            <div className="inventory-alerts">
                {metrics.outOfStockCount > 0 && (
                    <div className="alert alert-danger">
                        <div className="alert-icon">❌</div>
                        <div className="alert-content">
                            <h4>{t('reports.inventory.outOfStockTitle')}</h4>
                            <p>{t('reports.inventory.outOfStockText', { count: metrics.outOfStockCount })}</p>
                        </div>
                    </div>
                )}
                {metrics.lowStockCount > 0 && (
                    <div className="alert alert-warning">
                        <div className="alert-icon">⚠️</div>
                        <div className="alert-content">
                            <h4>{t('reports.inventory.lowStockTitle')}</h4>
                            <p>{t('reports.inventory.lowStockText', { count: metrics.lowStockCount })}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de inventario */}
            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>{t('reports.inventory.table.product')}</th>
                            <th>{t('reports.inventory.table.sku')}</th>
                            <th>{t('reports.inventory.table.category')}</th>
                            <th>{t('reports.inventory.table.currentStock')}</th>
                            <th>{t('reports.inventory.table.minStock')}</th>
                            <th>{t('reports.inventory.table.totalValue')}</th>
                            <th>{t('reports.inventory.table.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productsWithInventory.map(product => (
                            <tr key={product.id}>
                                <td data-label={t('reports.inventory.table.product')}>{product.name}</td>
                                <td data-label={t('reports.inventory.table.sku')}>{product.sku}</td>
                                <td data-label={t('reports.inventory.table.category')}>{product.category || t('products.noCategory')}</td>
                                <td data-label={t('reports.inventory.table.currentStock')}>{product.inventory.currentStock}</td>
                                <td data-label={t('reports.inventory.table.minStock')}>{product.inventory.minStock}</td>
                                <td data-label={t('reports.inventory.table.totalValue')}>${(product.inventory.currentStock * product.price).toLocaleString()}</td>
                                <td data-label={t('reports.inventory.table.status')}>
                                    <span className={`status-badge ${
                                        product.inventory.currentStock === 0 ? 'danger' :
                                        product.inventory.currentStock <= product.inventory.minStock ? 'warning' : 'success'
                                    }`}>
                                        {product.inventory.currentStock === 0 ? t('reports.inventory.table.statuses.noStock') :
                                         product.inventory.currentStock <= product.inventory.minStock ? t('reports.inventory.table.statuses.lowStock') : t('reports.inventory.table.statuses.inStock')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSuppliersReport = () => (
        <div className="report-content">
            <div className="report-header">
                <h2>{t('reports.suppliers.title')}</h2>
                <p>{t('reports.suppliers.description')}</p>
            </div>

            <div className="suppliers-grid">
                {metrics.supplierAnalysis.map(supplier => (
                    <div key={supplier.id} className="supplier-card">
                        <div className="supplier-header">
                            <h3>{supplier.name}</h3>
                            <span className={`supplier-status ${supplier.status}`}>
                                {supplier.status === 'active' ? t('reports.suppliers.statuses.active') : t('reports.suppliers.statuses.inactive')}
                            </span>
                        </div>
                        <div className="supplier-metrics">
                            <div className="supplier-metric">
                                <span className="metric-label">{t('reports.suppliers.products')}</span>
                                <span className="metric-value">{supplier.productCount}</span>
                            </div>
                            <div className="supplier-metric">
                                <span className="metric-label">{t('reports.suppliers.totalValue')}</span>
                                <span className="metric-value">${supplier.totalValue.toLocaleString()}</span>
                            </div>
                            <div className="supplier-metric">
                                <span className="metric-label">{t('reports.suppliers.paymentTerms')}</span>
                                <span className="metric-value">{t('reports.suppliers.days', { count: supplier.paymentTerms })}</span>
                            </div>
                        </div>
                        <div className="supplier-contact">
                            <p><strong>{t('reports.suppliers.contact')}:</strong> {supplier.contact}</p>
                            <p><strong>{t('reports.suppliers.email')}:</strong> {supplier.email}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeReport) {
            case 'inventory':
                return renderInventoryReport();
            case 'suppliers':
                return renderSuppliersReport();
            default:
                return renderOverviewReport();
        }
    };

    return (
        <div className="reports-container">
            {/* Header con controles */}
            <div className="reports-header">
                <div className="reports-nav">
                    <button
                        className={`report-tab ${activeReport === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveReport('overview')}
                    >
                        📊 {t('reports.tabs.overview')}
                    </button>
                    <button
                        className={`report-tab ${activeReport === 'inventory' ? 'active' : ''}`}
                        onClick={() => setActiveReport('inventory')}
                    >
                        📦 {t('reports.tabs.inventory')}
                    </button>
                    <button
                        className={`report-tab ${activeReport === 'suppliers' ? 'active' : ''}`}
                        onClick={() => setActiveReport('suppliers')}
                    >
                        🏢 {t('reports.tabs.suppliers')}
                    </button>
                </div>

                <div className="reports-actions">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="date-range-select"
                    >
                        <option value="7">{t('reports.dateRanges.last7Days')}</option>
                        <option value="30">{t('reports.dateRanges.last30Days')}</option>
                        <option value="90">{t('reports.dateRanges.last3Months')}</option>
                        <option value="365">{t('reports.dateRanges.lastYear')}</option>
                    </select>

                    <div className="export-controls">
                        <select
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value)}
                            className="export-format-select"
                        >
                            <option value="csv">{t('reports.formats.csv')}</option>
                            <option value="json">{t('reports.formats.json')}</option>
                        </select>
                        <button
                            onClick={() => handleExport(exportFormat)}
                            className="export-btn"
                        >
                            📥 {t('reports.export')}
                        </button>
                    </div>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default Reports;
