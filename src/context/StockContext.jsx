import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { useNotification } from './NotificationContext'; // Importar el hook de notificaciones
import { useAppContext } from './AppProvider'; // Para obtener el usuario actual
import { db } from '../firebase'; // Importar la instancia de la base de datos
import { 
    collection, 
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    writeBatch,
    serverTimestamp,
    query,
    where,
    getDocs,
    getDoc
} from 'firebase/firestore'; // Importar funciones de Firestore

const StockContext = createContext();

export const useStock = () => {
    const context = useContext(StockContext);
    if (!context) {
        throw new Error('useStock debe usarse dentro de un StockProvider');
    }
    return context;
};

export const StockProvider = ({ children }) => {
    const { user } = useAppContext(); // Obtener el usuario
    const { t } = useLanguage();
    const { showNotification } = useNotification(); // Obtener la función de notificación
    // Estados principales, ahora inicializados como arrays vacíos
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [stockMovements, setStockMovements] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true); // Estado para la carga inicial

    // Efecto para cargar todos los datos del usuario actual desde Firestore
    useEffect(() => {
        if (!user) {
            // Si no hay usuario, vaciamos los estados
            setProducts([]);
            setInventory([]);
            setOrders([]);
            setSuppliers([]);
            setActivities([]);
            setStockMovements([]);
            return;
        }

        setLoading(true);

        const collectionsToFetch = {
            products: setProducts,
            inventory: setInventory,
            orders: setOrders,
            suppliers: setSuppliers,
            activities: setActivities,
            stockMovements: setStockMovements,
        };

        const unsubscribes = Object.entries(collectionsToFetch).map(([col, setter]) => {
            // Creamos una consulta que filtra por el userId del usuario actual
            const q = query(collection(db, col), where("userId", "==", user.uid));
            
            return onSnapshot(q, (querySnapshot) => {
                const items = [];
                querySnapshot.forEach((doc) => {
                    // El id del documento de Firestore debe tener prioridad sobre cualquier campo 'id' en los datos.
                    items.push({ ...doc.data(), id: doc.id });
                });
                setter(items);
            });
        });

        setLoading(false);

        // Limpiar todos los listeners al desmontar el componente
        return () => unsubscribes.forEach(unsub => unsub());
    }, [user]); // El efecto se ejecuta de nuevo si el usuario cambia

    // Función para agregar actividad, ahora escribe en Firestore
    const addActivity = async (type, messageKey, data = {}) => {
        if (!user) return; // No hacer nada si no hay usuario
        
        // Mostrar notificación en tiempo real
        showNotification(messageKey, data, type);

        await addDoc(collection(db, "activities"), {
            userId: user.uid, // <-- AÑADIR ID DE USUARIO
            type,
            messageKey,
            data,
            timestamp: serverTimestamp(),
            read: false
        });
    };

    // ===== FUNCIONES PARA PRODUCTOS =====
    const addProduct = async (productData) => {
        if (!user) return;
        const batch = writeBatch(db);

        // 1. Crear el nuevo producto
        const newProductRef = doc(collection(db, "products"));
        const productDataForDb = { ...productData };
        delete productDataForDb.location; // Eliminar location del producto

        batch.set(newProductRef, {
            ...productDataForDb,
            userId: user.uid, // <-- AÑADIR ID DE USUARIO
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 2. Crear el inventario inicial para ese producto
        const newInventoryRef = doc(collection(db, "inventory"));
        batch.set(newInventoryRef, {
            productId: newProductRef.id,
            userId: user.uid, // <-- AÑADIR ID DE USUARIO
            currentStock: productData.initialStock || 0,
            minStock: productData.minStock || 5,
            maxStock: productData.maxStock || 100,
            location: productData.location || 'A1-001',
            lastMovement: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            availableStock: productData.initialStock || 0,
            reservedStock: 0
        });
        
        // 3. Crear actividad
        addActivity('product', 'activity.product.added', { productName: productData.name });

        await batch.commit();
    };

    const updateProduct = async (productId, updatedData) => {
        if (!user) return;

        const batch = writeBatch(db);

        // 1. Actualizar el producto
        const productRef = doc(db, "products", String(productId)); // Asegurarse de que el ID sea una cadena
        const productDataToUpdate = { ...updatedData };
        delete productDataToUpdate.id; // No sobreescribir el ID
        delete productDataToUpdate.userId; // No sobreescribir el userId
        delete productDataToUpdate.location; // Eliminar location de la actualización del producto
        
        batch.update(productRef, {
            ...productDataToUpdate,
            updatedAt: serverTimestamp()
        });

        // 2. Actualizar el inventario asociado
        const inventoryQuery = query(
            collection(db, "inventory"),
            where("productId", "==", String(productId)), // Asegurarse de que la consulta también use una cadena
            where("userId", "==", user.uid)
        );
        const inventorySnapshot = await getDocs(inventoryQuery);

        if (!inventorySnapshot.empty) {
            const inventoryDoc = inventorySnapshot.docs[0];
            const inventoryRef = doc(db, "inventory", inventoryDoc.id);
            const inventoryDataToUpdate = {
                minStock: updatedData.minStock,
                maxStock: updatedData.maxStock,
                location: updatedData.location, // Location solo se actualiza aquí
                lastUpdated: serverTimestamp()
            };
            batch.update(inventoryRef, inventoryDataToUpdate);
        }

        // 3. Crear actividad
        addActivity('product', 'activity.product.updated', { productName: updatedData.name });

        // 4. Ejecutar el batch
        await batch.commit();
    };

    const deleteProduct = async (productId) => {
        if (!user) return;
    
        const batch = writeBatch(db);
    
        // 1. Referencia al producto y obtener sus datos ANTES de borrarlo
        const productRef = doc(db, "products", productId);
        const productDoc = await getDoc(productRef); // Usar getDoc aquí
    
        if (!productDoc.exists()) {
            console.error("El producto que intentas eliminar no existe.");
            return; // Salir si el producto no existe
        }
    
        const productName = productDoc.data().name; // Guardar el nombre para la actividad
    
        // 2. Encontrar y referenciar el inventario asociado
        const inventorySnapshot = await getDocs(query(collection(db, "inventory"), where("productId", "==", productId), where("userId", "==", user.uid)));
    
        if (!inventorySnapshot.empty) {
            const inventoryDoc = inventorySnapshot.docs[0];
            const inventoryRef = doc(db, "inventory", inventoryDoc.id);
            batch.delete(inventoryRef);
        }
    
        // 3. Borrar el producto
        batch.delete(productRef);
    
        // 4. Crear actividad (usando el nombre que guardamos)
        addActivity('product', 'activity.product.deleted', { productName: productName });
    
        // 5. Ejecutar el batch
        await batch.commit();
    };

    // ===== FUNCIONES PARA PEDIDOS =====
    const addOrder = async (orderData) => {
        if (!user) return;
        const batch = writeBatch(db);
    
        // 1. Crear la referencia para el nuevo pedido
        const newOrderRef = doc(collection(db, "orders"));
        batch.set(newOrderRef, {
            ...orderData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    
        // 2. Solo ajustar el stock si el pedido se crea como 'completado'
        if (orderData.status === 'completed') {
            for (const item of orderData.items) {
                const inventoryQuery = query(
                    collection(db, "inventory"),
                    where("productId", "==", item.productId),
                    where("userId", "==", user.uid)
                );
                
                const inventorySnapshot = await getDocs(inventoryQuery);
    
                if (!inventorySnapshot.empty) {
                    const inventoryDoc = inventorySnapshot.docs[0];
                    const inventoryRef = doc(db, "inventory", inventoryDoc.id);
                    const inventoryData = inventoryDoc.data();
                    const currentStock = inventoryData.currentStock;
    
                    // Validar stock para pedidos de salida
                    if (orderData.type === 'outbound' && currentStock < item.quantity) {
                        throw new Error(`Stock insuficiente para ${item.productId}. Stock: ${currentStock}, Pedido: ${item.quantity}`);
                    }
    
                    const stockChange = orderData.type === 'outbound' ? -item.quantity : item.quantity;
                    const newStock = currentStock + stockChange;
                    const newAvailableStock = newStock - (inventoryData.reservedStock || 0);
    
                    batch.update(inventoryRef, { 
                        currentStock: newStock,
                        availableStock: newAvailableStock,
                        lastMovement: serverTimestamp()
                    });
                } else {
                    throw new Error(`No se encontró inventario para el producto con ID: ${item.productId}`);
                }
            }
        }
        // Si el estado es 'pending' o 'cancelled', no se hace nada con el stock al crear.
    
        // 3. Crear actividad
        addActivity('order', orderData.type === 'inbound' ? 'activity.order.inbound' : 'activity.order.outbound', { count: orderData.items.length, status: orderData.status });
    
        // 4. Ejecutar todas las operaciones en el batch
        await batch.commit();
    };

    const updateOrder = async (orderId, updatedFields) => {
        if (!user) return;
    
        const batch = writeBatch(db);
        const orderRef = doc(db, "orders", orderId);
    
        try {
            const orderDoc = await getDoc(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("El pedido no existe.");
            }
    
            const orderData = orderDoc.data();
            const prevStatus = orderData.status;
            const newStatus = updatedFields.status;
    
            // Si el estado no cambia, solo actualizamos los campos y salimos.
            if (prevStatus === newStatus) {
                batch.update(orderRef, {
                    ...updatedFields,
                    updatedAt: serverTimestamp(),
                });
                await batch.commit();
                return;
            }
    
            const type = orderData.type;
            const orderItems = orderData.items || [];
    
            // Lógica para ajustar el stock
            for (const item of orderItems) {
                const inventoryQuery = query(
                    collection(db, "inventory"),
                    where("productId", "==", item.productId),
                    where("userId", "==", user.uid)
                );
                const inventorySnapshot = await getDocs(inventoryQuery);
    
                if (inventorySnapshot.empty) {
                    console.warn(`No se encontró inventario para el producto ${item.productId}`);
                    continue; // Opcional: podrías lanzar un error si el inventario es crucial
                }
    
                const inventoryDoc = inventorySnapshot.docs[0];
                const inventoryRef = doc(db, "inventory", inventoryDoc.id);
                const inventoryData = inventoryDoc.data();
                let stockChange = 0;
    
                // CASO 1: El pedido se marca como 'completado'
                if (newStatus === 'completed' && prevStatus !== 'completed') {
                    stockChange = type === 'outbound' ? -item.quantity : item.quantity;
                }
                // CASO 2: Un pedido 'completado' se cancela o vuelve a pendiente
                else if (prevStatus === 'completed' && (newStatus === 'cancelled' || newStatus === 'pending')) {
                    stockChange = type === 'outbound' ? item.quantity : -item.quantity;
                }
    
                if (stockChange !== 0) {
                    const newStock = (inventoryData.currentStock || 0) + stockChange;
                    const newAvailableStock = newStock - (inventoryData.reservedStock || 0);
    
                    batch.update(inventoryRef, {
                        currentStock: newStock,
                        availableStock: newAvailableStock,
                        lastMovement: serverTimestamp(),
                    });
                }
            }
    
            // Actualizar el pedido con los nuevos campos
            batch.update(orderRef, {
                ...updatedFields,
                updatedAt: serverTimestamp(),
            });
    
            addActivity("order", "activity.order.statusChanged", {
                orderId: orderId,
                status: newStatus,
            });
    
            await batch.commit();
    
        } catch (error) {
            console.error("Error al actualizar el pedido:", error);
            // Opcional: notificar al usuario del error
            throw error; // Relanzar el error para que el componente que llama pueda manejarlo
        }
    };


   const deleteOrder = async (orderId) => {
    if (!user) return;

    const orderRef = doc(db, "orders", orderId);

    // Opcional: obtener datos del pedido para la actividad antes de borrar
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) {
        console.error("El pedido que intentas eliminar no existe.");
        return;
    }
    const orderIdForActivity = orderDoc.id; // Guardar ID para la actividad

    // Simplemente borra el pedido sin revertir el stock
    await deleteDoc(orderRef);

    addActivity('order', 'activity.order.deleted', { orderId: orderIdForActivity });
};



    // ===== FUNCIONES PARA PROVEEDORES =====
    const addSupplier = async (supplierData) => {
        if (!user) return;
        await addDoc(collection(db, "suppliers"), {
            ...supplierData,
            userId: user.uid, // <-- AÑADIR ID DE USUARIO
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        addActivity('supplier', 'activity.supplier.added', { supplierName: supplierData.name });
    };

    const updateSupplier = async (supplierId, updatedData) => {
        const supplierRef = doc(db, "suppliers", supplierId);
        await updateDoc(supplierRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        addActivity('supplier', 'activity.supplier.updated', { supplierName: updatedData.name });
    };

    const deleteSupplier = async (supplierId) => {
        const supplierRef = doc(db, "suppliers", supplierId);
        const supplierDoc = await getDoc(supplierRef);
        if (supplierDoc.exists()) {
            addActivity('supplier', 'activity.supplier.deleted', { supplierName: supplierDoc.data().name });
        }
        await deleteDoc(supplierRef);
    };

    // ===== FUNCIONES PARA INVENTARIO =====
    const updateStock = async (productId, updatedData, adjustmentDetails = {}) => {
        if (!user) return;

        const inventoryQuery = query(
            collection(db, "inventory"),
            where("productId", "==", productId),
            where("userId", "==", user.uid)
        );
        const inventorySnapshot = await getDocs(inventoryQuery);

        const product = getProductById(productId);
        const productName = product ? product.name : 'Producto Desconocido';

        if (inventorySnapshot.empty) {
            console.warn(`No se encontró inventario para el producto ${productId}. Creando uno nuevo.`);
            const newInventoryRef = doc(collection(db, "inventory"));
            
            const newStock = updatedData.currentStock !== undefined ? updatedData.currentStock : 0;
            const reservedStock = 0;
            const availableStock = newStock - reservedStock;

            const newInventoryData = {
                productId: productId,
                userId: user.uid,
                currentStock: newStock,
                minStock: 5,
                maxStock: 100,
                location: 'N/A',
                reservedStock: reservedStock,
                availableStock: availableStock,
                lastMovement: serverTimestamp(),
                lastUpdated: serverTimestamp(),
            };

            await setDoc(newInventoryRef, newInventoryData);
            addActivity('stock', 'activity.stock.created', { productName: productName });

            // Registrar movimiento de stock
            await addDoc(collection(db, "stockMovements"), {
                userId: user.uid,
                productId: productId,
                productName: productName,
                type: adjustmentDetails.type || 'initial',
                change: newStock, // En este caso, el cambio es el stock inicial
                newStock: newStock,
                reason: adjustmentDetails.reason || 'Creación inicial de inventario',
                timestamp: serverTimestamp()
            });

        } else {
            const inventoryDoc = inventorySnapshot.docs[0];
            const inventoryRef = doc(db, "inventory", inventoryDoc.id);
            const currentInventoryData = inventoryDoc.data();

            const dataToUpdate = { ...updatedData };
            const oldStock = currentInventoryData.currentStock;
            const newStock = dataToUpdate.currentStock;
            const stockChange = newStock - oldStock;

            if (dataToUpdate.currentStock !== undefined) {
                const reservedStock = currentInventoryData.reservedStock || 0;
                dataToUpdate.availableStock = dataToUpdate.currentStock - reservedStock;
            }

            await updateDoc(inventoryRef, {
                ...dataToUpdate,
                lastUpdated: serverTimestamp(),
            });
            addActivity('stock', 'activity.stock.updated', { productName: productName });

            // Registrar movimiento de stock
            await addDoc(collection(db, "stockMovements"), {
                userId: user.uid,
                productId: productId,
                productName: productName,
                type: adjustmentDetails.type || 'manual_adjustment',
                change: stockChange,
                oldStock: oldStock,
                newStock: newStock,
                reason: adjustmentDetails.reason || 'Ajuste manual',
                timestamp: serverTimestamp()
            });
        }
    };

    // FUNCIÓN PARA OBTENER ACTIVIDADES RECIENTES
    const getRecentActivities = (limit = 10) => {
        return activities
            .sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return timeB - timeA;
            })
            .slice(0, limit);
    };

    // FUNCIÓN PARA FORMATEAR TIEMPO RELATIVO (CON TRADUCCIÓN)
    const getRelativeTime = (timestamp) => {
        if (!timestamp) return '';
        // Los timestamps de Firestore tienen un método toDate()
        const activityTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - activityTime) / 1000);
        
        if (diffInSeconds < 60) return t('time.justNow');
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return t('time.minutesAgo', { count: diffInMinutes });
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('time.hoursAgo', { count: diffInHours });
        
        const diffInDays = Math.floor(diffInHours / 24);
        return t('time.daysAgo', { count: diffInDays });
    };

    // ===== FUNCIONES AUXILIARES FALTANTES =====
    
    const getProductById = (productId) => {
        return products.find(product => product.id === productId);
    };

    const getInventoryByProductId = (productId) => {
        return inventory.find(inv => inv.productId === productId);
    };

    const productsWithInventory = useMemo(() => {
        return products.map(product => {
            const inventoryData = inventory.find(inv => inv.productId === product.id);
            return {
                ...product,
                inventory: inventoryData || {
                    currentStock: 0,
                    minStock: 0,
                    maxStock: 0,
                    availableStock: 0,
                    reservedStock: 0,
                    location: 'N/A',
                    lastUpdated: new Date().toISOString()
                }
            };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [products, inventory]);

    const dashboardStats = useMemo(() => {
        const totalProducts = products.length;
        const lowStockCount = productsWithInventory.filter(p =>
            p.inventory.currentStock <= p.inventory.minStock && p.inventory.currentStock > 0
        ).length;
        const outOfStockCount = productsWithInventory.filter(p =>
            p.inventory.currentStock === 0
        ).length;
        const totalInventoryValue = productsWithInventory.reduce((total, product) =>
            total + (product.inventory.currentStock * product.price), 0
        );

        return {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            totalInventoryValue
        };
    }, [products, productsWithInventory]);

    const lowStockProducts = useMemo(() => {
        return productsWithInventory.filter(product =>
            product.inventory.currentStock <= product.inventory.minStock &&
            product.inventory.currentStock > 0
        );
    }, [productsWithInventory]);

    const outOfStockProducts = useMemo(() => {
        return productsWithInventory.filter(product =>
            product.inventory.currentStock === 0
        );
    }, [productsWithInventory]);

    // ACTUALIZAR EL OBJETO VALUE - REEMPLAZAR COMPLETAMENTE:
    const value = {
        // Estados
        products,
        inventory,
        orders,
        suppliers,
        stockMovements,
        activities,
        loading, // Exponer el estado de carga
        
        // Funciones para productos
        addProduct,
        updateProduct,
        deleteProduct,
        
        // Funciones para pedidos
        addOrder,
        updateOrder,
        deleteOrder,
        
        // Funciones para proveedores
        addSupplier,
        updateSupplier,
        deleteSupplier,
        
        // Funciones para inventario
        updateStock,
        
        // Funciones y valores auxiliares
        getProductById,
        getInventoryByProductId,
        productsWithInventory,
        dashboardStats,
        lowStockProducts,
        outOfStockProducts,
        
        // Funciones de actividades
        addActivity,
        getRecentActivities,
        getRelativeTime
    };

    return (
        <StockContext.Provider value={value}>
            {children}
        </StockContext.Provider>
    );
};

export default StockContext;
