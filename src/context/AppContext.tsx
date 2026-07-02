import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import storage, { Sale, Expense, Credit, Settings, CreditPayment, Contact, Product, SaleItem, SaleReturn, Purchase, Quotation, PurchaseOrder, Attendance, Company } from '../utils/storage';
import { syncService } from '../services/syncService';
import { resetSupabaseClient } from '../services/supabaseClient';
import { getFinancialYear, getAvailableFYs } from '../utils/fyHelpers';

interface AppState {
    sales: Sale[];
    expenses: Expense[];
    credits: Credit[];
    settings: Settings;
    contacts: Contact[];
    products: Product[];
    returns: SaleReturn[];
    purchases: Purchase[];
    quotations: Quotation[];
    purchaseOrders: PurchaseOrder[];
    attendance: Attendance[];
    companies: Company[];
    isLoading: boolean;
}

const defaultSettings: Settings = {
    theme: 'light',
    currency: '₹',
    lock: false,
    taxType: 'GST',
    gstEnabled: false,
    gstRate: 18,
    gstType: 'intra',
    taxMode: 'exclusive',
    invoicePrefix: 'INV',
    lastInvoiceNumber: 0,
    quotationPrefix: 'QTN',
    lastQuotationNumber: 0,
    poPrefix: 'PO',
    lastPONumber: 0,
    invoiceTemplate: 'modern',
    invoicePrintSize: 'A4',
    invoiceTerms: '',
    users: [],
    bankName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    upiId: '',
    autoBackupEnabled: true,
};

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

interface AddSaleInput {
    customerName: string;
    customerState?: string;
    customerAddress?: string;
    customerGSTIN?: string;
    customerPhone?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI';
    note: string;
    items?: SaleItem[];
    invoiceNumber?: string;
    subtotal?: number;
    discountTotal?: number;
    discountType?: 'percent' | 'flat';
    taxTotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstRate?: number;
    taxMode?: 'exclusive' | 'inclusive';
}

interface AddReturnInput {
    saleId: string;
    note: string;
    items?: SaleItem[];
    amount?: number;
}

interface AppContextType {
    state: AppState;
    addSale: (sale: AddSaleInput) => Promise<void>;
    updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    addCredit: (credit: Omit<Credit, 'id' | 'paidAmount' | 'payments'>) => Promise<void>;
    updateCredit: (id: string, updates: Partial<Credit>) => Promise<void>;
    addCreditPayment: (creditId: string, payment: Omit<CreditPayment, 'id'>) => Promise<void>;
    deleteCredit: (id: string) => Promise<void>;
    addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Promise<void>;
    updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
    deleteContact: (id: string) => Promise<void>;
    addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    addReturn: (input: AddReturnInput) => Promise<void>;
    deleteReturn: (id: string) => Promise<void>;
    addPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<void>;
    updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
    deletePurchase: (id: string) => Promise<void>;
    addQuotation: (q: Omit<Quotation, 'id'>) => Promise<void>;
    updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<void>;
    deleteQuotation: (id: string) => Promise<void>;
    addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => Promise<void>;
    updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
    deletePurchaseOrder: (id: string) => Promise<void>;
    markAttendance: (records: Omit<Attendance, 'id'>[]) => Promise<void>;
    deleteAttendance: (id: string) => Promise<void>;
    updateSettings: (updates: Partial<Settings>) => Promise<void>;
    clearAllData: () => Promise<boolean>;
    restoreData: (data: Record<string, unknown>) => Promise<boolean>;
    selectedFY: string;
    setSelectedFY: (fy: string) => void;
    availableFYs: string[];
    selectedCompanyId: string;
    setSelectedCompanyId: (id: string) => void;
    addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<void>;
    updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;
    getTodaySales: () => number;
    getTodayExpenses: () => number;
    getTodayProfit: () => number;
    getBalance: () => number;
    getCashBalance: () => number;
    getUPIBalance: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>({
        sales: [],
        expenses: [],
        credits: [],
        settings: defaultSettings,
        contacts: [],
        products: [],
        returns: [],
        purchases: [],
        quotations: [],
        purchaseOrders: [],
        attendance: [],
        companies: [],
        isLoading: true,
    });

    const stateRef = useRef(state);
    stateRef.current = state;

    const [syncTrigger, setSyncTrigger] = useState(0);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('default');
    const [selectedFY, setSelectedFY] = useState<string>(getFinancialYear());
    const availableFYs = useMemo(() => {
        return getAvailableFYs(state.sales, state.purchases, state.expenses);
    }, [state.sales, state.purchases, state.expenses]);

    useEffect(() => {
        storage.onSet = (key, value) => {
            if (key === 'SUPABASE_URL' || key === 'SUPABASE_KEY') {
                resetSupabaseClient();
                setSyncTrigger(prev => prev + 1);
                syncService.pullAll().catch(err => console.error('[Sync] Post-config pull failed:', err));
            } else {
                syncService.push(key, value);
            }
        };

        const loadData = async () => {
            // First, load from local storage for immediate UI
            const [sales, expenses, credits, settings, contacts, products, returns, purchases, quotations, purchaseOrders, attendance, companies] = await Promise.all([
                storage.getSales(),
                storage.getExpenses(),
                storage.getCredits(),
                storage.getSettings(),
                storage.getContacts(),
                storage.getProducts(),
                storage.getReturns(),
                storage.getPurchases(),
                storage.getQuotations(),
                storage.getPurchaseOrders(),
                storage.getAttendance(),
                storage.getCompanies(),
            ]);

            const localData = {
                sales: sales || [],
                expenses: expenses || [],
                credits: credits || [],
                settings: settings ? { ...defaultSettings, ...settings } : defaultSettings,
                contacts: contacts || [],
                products: products || [],
                returns: returns || [],
                purchases: purchases || [],
                quotations: quotations || [],
                purchaseOrders: purchaseOrders || [],
                attendance: attendance || [],
                companies: companies || [],
                isLoading: false,
            };
            setState(localData);

            if (companies && companies.length > 0) {
                setSelectedCompanyId(companies[0].id);
            }

            // Then, try to sync from cloud if configured
            try {
                await syncService.pullAll();
                // If pull changed something, we need to reload. 
                // But pullAll calls storage.set which is fine, 
                // However, we should probably just re-load state here or rely on the observer below.
                const updatedSales = await storage.getSales();
                if (updatedSales.length > localData.sales.length) {
                    // Simple check if cloud had more data
                    window.location.reload(); // Simplest way to refresh all state after initial pull
                }
            } catch (err) {
                console.error('[Sync] Initial pull failed:', err);
            }
        };
        loadData();
    }, []);

    // Set up auto-backup on close listener (Desktop Electron)
    useEffect(() => {
        if (window.electronAPI) {
            const handleAppClosing = async () => {
                const currentSettings = stateRef.current.settings;
                if (currentSettings.autoBackupEnabled && currentSettings.autoBackupPath) {
                    try {
                        const backupData = {
                            sales: stateRef.current.sales,
                            expenses: stateRef.current.expenses,
                            credits: stateRef.current.credits,
                            settings: stateRef.current.settings,
                            contacts: stateRef.current.contacts,
                            products: stateRef.current.products,
                            returns: stateRef.current.returns,
                            purchases: stateRef.current.purchases,
                            quotations: stateRef.current.quotations,
                            purchaseOrders: stateRef.current.purchaseOrders,
                            attendance: stateRef.current.attendance,
                            companies: stateRef.current.companies
                        };
                        const payloadString = JSON.stringify(backupData, null, 2);
                        await window.electronAPI.saveBackupToPath(currentSettings.autoBackupPath, payloadString);
                    } catch (err) {
                        console.error('Failed to run auto backup on close:', err);
                    }
                }
                window.electronAPI.confirmClose();
            };

            const unsubscribe = window.electronAPI.onAppClosing(handleAppClosing);
            return () => {
                unsubscribe();
            };
        }
    }, []);

    // Set up real-time subscription
    useEffect(() => {
        const unsubscribe = syncService.subscribe(async () => {
            console.log('[Sync] Cloud update received, refreshing state...');
            // Reload all data from storage (which was updated by syncService)
            const [sales, expenses, credits, settings, contacts, products, returns, purchases, quotations, purchaseOrders, attendance] = await Promise.all([
                storage.getSales(),
                storage.getExpenses(),
                storage.getCredits(),
                storage.getSettings(),
                storage.getContacts(),
                storage.getProducts(),
                storage.getReturns(),
                storage.getPurchases(),
                storage.getQuotations(),
                storage.getPurchaseOrders(),
                storage.getAttendance(),
            ]);
            setState(prev => ({
                ...prev,
                sales, expenses, credits, contacts, products, returns, purchases, quotations, purchaseOrders, attendance
            }));
        });
        return () => unsubscribe();
    }, [syncTrigger]);

    // --- Sales ---
    const addSale = useCallback(async (saleInput: AddSaleInput) => {
        const saleId = generateId();
        let linkedCreditId: string | undefined;
        let newCredits = [...stateRef.current.credits];

        // Auto-add or update contact
        if (saleInput.customerName && saleInput.customerName !== 'Walk-in') {
            const existingContact = stateRef.current.contacts.find(c => c.name.toLowerCase() === saleInput.customerName.toLowerCase());
            if (existingContact) {
                // Update if phone or address provided
                if (saleInput.customerPhone || saleInput.customerAddress || saleInput.customerGSTIN) {
                    const updates: Partial<Contact> = {};
                    if (saleInput.customerPhone && !existingContact.phone) updates.phone = saleInput.customerPhone;
                    if (saleInput.customerAddress && !existingContact.address) updates.address = saleInput.customerAddress;
                    if (saleInput.customerGSTIN && !existingContact.gstin) updates.gstin = saleInput.customerGSTIN;
                    if (saleInput.customerState && !existingContact.state) updates.state = saleInput.customerState;

                    if (Object.keys(updates).length > 0) {
                        await updateContact(existingContact.id, updates);
                    }
                }
            } else {
                // Create new contact
                await addContact({
                    name: saleInput.customerName,
                    phone: saleInput.customerPhone || '',
                    address: saleInput.customerAddress || '',
                    gstin: saleInput.customerGSTIN || '',
                    state: saleInput.customerState || '',
                    type: 'customer',
                });
            }
        }

        const remainingAmount = saleInput.totalAmount - saleInput.paidAmount;
        if (remainingAmount > 0 && saleInput.customerName) {
            linkedCreditId = generateId();
            newCredits.push({
                id: linkedCreditId,
                companyId: selectedCompanyId,
                party: saleInput.customerName,
                type: 'given',
                amount: remainingAmount,
                paidAmount: 0,
                status: 'pending',
                date: getToday(),
                linkedSaleId: saleId,
                payments: [],
            });
            await storage.setCredits(newCredits);
        }

        const newSale: Sale = {
            id: saleId,
            companyId: selectedCompanyId,
            date: getToday(),
            customerName: saleInput.customerName,
            customerState: saleInput.customerState,
            customerAddress: saleInput.customerAddress,
            customerGSTIN: saleInput.customerGSTIN,
            customerPhone: saleInput.customerPhone,
            totalAmount: saleInput.totalAmount,
            paidAmount: saleInput.paidAmount,
            paymentMethod: saleInput.paymentMethod,
            note: saleInput.note,
            linkedCreditId,
            items: saleInput.items,
            invoiceNumber: saleInput.invoiceNumber,
            subtotal: saleInput.subtotal,
            discountTotal: saleInput.discountTotal,
            discountType: saleInput.discountType,
            taxTotal: saleInput.taxTotal,
            cgst: saleInput.cgst,
            sgst: saleInput.sgst,
            igst: saleInput.igst,
            gstRate: saleInput.gstRate,
            taxMode: saleInput.taxMode,
        };

        const newSales = [...stateRef.current.sales, newSale];
        await storage.setSales(newSales);

        let updatedProducts = [...stateRef.current.products];
        if (saleInput.items && saleInput.items.length > 0) {
            for (const item of saleInput.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
                );
            }
            await storage.setProducts(updatedProducts);
        }

        setState(prev => ({ ...prev, sales: newSales, credits: newCredits, products: updatedProducts }));
    }, [selectedCompanyId]);

    const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
        const newSales = stateRef.current.sales.map(s => (s.id === id ? { ...s, ...updates } : s));
        await storage.setSales(newSales);
        setState(prev => ({ ...prev, sales: newSales }));
    }, []);

    const deleteSale = useCallback(async (id: string) => {
        const sale = stateRef.current.sales.find(s => s.id === id);
        let newCredits = [...stateRef.current.credits];
        if (sale?.linkedCreditId) {
            newCredits = newCredits.filter(c => c.id !== sale.linkedCreditId);
            await storage.setCredits(newCredits);
            await syncService.delete('@mathnote_credits', sale.linkedCreditId).catch(err => console.error('[Sync] Credit delete failed:', err));
        }
        const newSales = stateRef.current.sales.filter(s => s.id !== id);
        await storage.setSales(newSales);
        setState(prev => ({ ...prev, sales: newSales, credits: newCredits }));
        await syncService.delete('@mathnote_sales', id).catch(err => console.error('[Sync] Sale delete failed:', err));
    }, []);

    // --- Expenses ---
    const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { ...expense, id: generateId(), companyId: selectedCompanyId, paymentMethod: expense.paymentMethod || 'Cash' };
        const newExpenses = [...stateRef.current.expenses, newExpense];
        await storage.setExpenses(newExpenses);
        setState(prev => ({ ...prev, expenses: newExpenses }));
    }, [selectedCompanyId]);

    const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
        const newExpenses = stateRef.current.expenses.map(e => (e.id === id ? { ...e, ...updates } : e));
        await storage.setExpenses(newExpenses);
        setState(prev => ({ ...prev, expenses: newExpenses }));
    }, []);

    const deleteExpense = useCallback(async (id: string) => {
        const newExpenses = stateRef.current.expenses.filter(e => e.id !== id);
        await storage.setExpenses(newExpenses);
        setState(prev => ({ ...prev, expenses: newExpenses }));
        await syncService.delete('@mathnote_expenses', id).catch(err => console.error('[Sync] Expense delete failed:', err));
    }, []);

    // --- Credits ---
    const addCredit = useCallback(async (credit: Omit<Credit, 'id' | 'paidAmount' | 'payments'>) => {
        const newCredit: Credit = { ...credit, id: generateId(), companyId: selectedCompanyId, paidAmount: 0, payments: [] };
        const newCredits = [...stateRef.current.credits, newCredit];
        await storage.setCredits(newCredits);
        setState(prev => ({ ...prev, credits: newCredits }));
    }, [selectedCompanyId]);

    const updateCredit = useCallback(async (id: string, updates: Partial<Credit>) => {
        const newCredits = stateRef.current.credits.map(c => {
            if (c.id === id) {
                const updated = { ...c, ...updates };
                if (updated.paidAmount >= updated.amount) updated.status = 'paid';
                return updated;
            }
            return c;
        });
        await storage.setCredits(newCredits);
        setState(prev => ({ ...prev, credits: newCredits }));
    }, []);

    const addCreditPayment = useCallback(async (creditId: string, payment: Omit<CreditPayment, 'id'>) => {
        const newCredits = stateRef.current.credits.map(c => {
            if (c.id === creditId) {
                const newPayment: CreditPayment = { ...payment, id: generateId() };
                const payments = [...(c.payments || []), newPayment];
                const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
                return { ...c, payments, paidAmount, status: (paidAmount >= c.amount ? 'paid' : 'pending') as Credit['status'] };
            }
            return c;
        });
        await storage.setCredits(newCredits);
        setState(prev => ({ ...prev, credits: newCredits }));
    }, []);

    const deleteCredit = useCallback(async (id: string) => {
        const newCredits = stateRef.current.credits.filter(c => c.id !== id);
        await storage.setCredits(newCredits);
        setState(prev => ({ ...prev, credits: newCredits }));
        await syncService.delete('@mathnote_credits', id).catch(err => console.error('[Sync] Credit delete failed:', err));
    }, []);

    // --- Contacts ---
    const addContact = useCallback(async (contactInput: Omit<Contact, 'id' | 'createdAt'>) => {
        const newContact: Contact = { ...contactInput, id: generateId(), companyId: selectedCompanyId, createdAt: new Date().toISOString() };
        const newContacts = [...stateRef.current.contacts, newContact];
        await storage.setContacts(newContacts);
        setState(prev => ({ ...prev, contacts: newContacts }));
    }, [selectedCompanyId]);

    const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
        const newContacts = stateRef.current.contacts.map(c => (c.id === id ? { ...c, ...updates } : c));
        await storage.setContacts(newContacts);
        setState(prev => ({ ...prev, contacts: newContacts }));
    }, []);

    const deleteContact = useCallback(async (id: string) => {
        const contact = stateRef.current.contacts.find(c => c.id === id);
        if (!contact) return;
        const hasSales = stateRef.current.sales.some(s => s.customerName === contact.name);
        const hasCredits = stateRef.current.credits.some(c => c.party === contact.name);
        if (hasSales || hasCredits) {
            alert('Cannot delete this contact — they have linked sales or credits.');
            return;
        }
        const newContacts = stateRef.current.contacts.filter(c => c.id !== id);
        await storage.setContacts(newContacts);
        setState(prev => ({ ...prev, contacts: newContacts }));
        await syncService.delete('@mathnote_contacts', id).catch(err => console.error('[Sync] Contact delete failed:', err));
    }, []);

    // --- Products ---
    const addProduct = useCallback(async (productInput: Omit<Product, 'id' | 'createdAt'>) => {
        const newProduct: Product = { ...productInput, id: generateId(), companyId: selectedCompanyId, createdAt: new Date().toISOString() };
        const newProducts = [...stateRef.current.products, newProduct];
        await storage.setProducts(newProducts);
        setState(prev => ({ ...prev, products: newProducts }));
    }, [selectedCompanyId]);

    const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
        const newProducts = stateRef.current.products.map(p => (p.id === id ? { ...p, ...updates } : p));
        await storage.setProducts(newProducts);
        setState(prev => ({ ...prev, products: newProducts }));
    }, []);

    const deleteProduct = useCallback(async (id: string) => {
        const hasSales = stateRef.current.sales.some(s => s.items?.some(item => item.productId === id));
        if (hasSales) {
            alert('Cannot delete this product — it has linked sales.');
            return;
        }
        const newProducts = stateRef.current.products.filter(p => p.id !== id);
        await storage.setProducts(newProducts);
        setState(prev => ({ ...prev, products: newProducts }));
        await syncService.delete('@mathnote_products', id).catch(err => console.error('[Sync] Product delete failed:', err));
    }, []);

    // --- Returns ---
    const addReturn = useCallback(async (input: AddReturnInput) => {
        const sale = stateRef.current.sales.find(s => s.id === input.saleId);
        if (!sale) return;

        const returnItems = input.items || sale.items || [];
        const returnAmount = input.amount ?? sale.totalAmount;

        // Create credit note for the refund
        let linkedCreditId: string | undefined;
        let newCredits = [...stateRef.current.credits];
        if (returnAmount > 0) {
            linkedCreditId = generateId();
            newCredits.push({
                id: linkedCreditId,
                companyId: selectedCompanyId,
                party: sale.customerName || 'Walk-in',
                type: 'taken',
                amount: returnAmount,
                paidAmount: 0,
                status: 'pending',
                date: getToday(),
                linkedSaleId: sale.id,
                payments: [],
            });
            await storage.setCredits(newCredits);
        }

        const newReturn: SaleReturn = {
            id: generateId(),
            companyId: selectedCompanyId,
            saleId: input.saleId,
            date: getToday(),
            party: sale.customerName,
            amount: returnAmount,
            note: input.note,
            items: returnItems,
            linkedCreditId,
        };
        const newReturns = [...stateRef.current.returns, newReturn];
        await storage.setReturns(newReturns);

        // Restore stock
        let updatedProducts = [...stateRef.current.products];
        if (returnItems.length > 0) {
            for (const item of returnItems) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p
                );
            }
            await storage.setProducts(updatedProducts);
        }

        // Mark sale as having a return
        const newSales = stateRef.current.sales.map(s =>
            s.id === input.saleId ? { ...s, returnIds: [...(s.returnIds || []), newReturn.id] } : s
        );
        await storage.setSales(newSales);

        setState(prev => ({ ...prev, returns: newReturns, products: updatedProducts, credits: newCredits, sales: newSales }));
    }, [selectedCompanyId]);

    const deleteReturn = useCallback(async (id: string) => {
        const ret = stateRef.current.returns.find(r => r.id === id);
        if (!ret) return;
        const newReturns = stateRef.current.returns.filter(r => r.id !== id);
        await storage.setReturns(newReturns);

        // Remove linked credit
        let newCredits = [...stateRef.current.credits];
        if (ret.linkedCreditId) {
            newCredits = newCredits.filter(c => c.id !== ret.linkedCreditId);
            await storage.setCredits(newCredits);
            await syncService.delete('@mathnote_credits', ret.linkedCreditId).catch(err => console.error('[Sync] Credit delete failed:', err));
        }

        // Reverse stock
        let updatedProducts = [...stateRef.current.products];
        if (ret.items && ret.items.length > 0) {
            for (const item of ret.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
                );
            }
            await storage.setProducts(updatedProducts);
        }
        setState(prev => ({ ...prev, returns: newReturns, products: updatedProducts, credits: newCredits }));
        await syncService.delete('@mathnote_returns', id).catch(err => console.error('[Sync] Return delete failed:', err));
    }, []);

    // --- Purchases (with credit for unpaid balance) ---
    const addPurchase = useCallback(async (purchaseInput: Omit<Purchase, 'id'>) => {
        const purchaseId = generateId();
        let linkedExpenseId: string | undefined;
        let linkedCreditId: string | undefined;
        let newExpenses = [...stateRef.current.expenses];
        let newCredits = [...stateRef.current.credits];

        // Create expense for paid amount
        if (purchaseInput.paidAmount > 0) {
            linkedExpenseId = generateId();
            newExpenses.push({
                id: linkedExpenseId,
                companyId: selectedCompanyId,
                date: getToday(),
                category: 'Purchase',
                amount: purchaseInput.paidAmount,
                note: `Payment for Purchase from ${purchaseInput.vendorName}`,
                vendorName: purchaseInput.vendorName,
                paymentMethod: purchaseInput.paymentMethod || 'Cash',
            });
            await storage.setExpenses(newExpenses);
        }

        // Create credit for unpaid balance
        const balance = purchaseInput.totalAmount - purchaseInput.paidAmount;
        if (balance > 0 && purchaseInput.vendorName) {
            linkedCreditId = generateId();
            newCredits.push({
                id: linkedCreditId,
                companyId: selectedCompanyId,
                party: purchaseInput.vendorName,
                type: 'taken',
                amount: balance,
                paidAmount: 0,
                status: 'pending',
                date: getToday(),
                linkedPurchaseId: purchaseId,
                payments: [],
            });
            await storage.setCredits(newCredits);
        }

        const newPurchase: Purchase = { ...purchaseInput, id: purchaseId, companyId: selectedCompanyId, linkedExpenseId, linkedCreditId };
        const newPurchases = [...stateRef.current.purchases, newPurchase];
        await storage.setPurchases(newPurchases);

        let updatedProducts = [...stateRef.current.products];
        if (purchaseInput.items && purchaseInput.items.length > 0) {
            for (const item of purchaseInput.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p
                );
            }
            await storage.setProducts(updatedProducts);
        }
        setState(prev => ({ ...prev, purchases: newPurchases, products: updatedProducts, expenses: newExpenses, credits: newCredits }));
    }, [selectedCompanyId]);

    const updatePurchase = useCallback(async (id: string, updates: Partial<Purchase>) => {
        const newPurchases = stateRef.current.purchases.map(p => (p.id === id ? { ...p, ...updates } : p));
        await storage.setPurchases(newPurchases);
        setState(prev => ({ ...prev, purchases: newPurchases }));
    }, []);

    const deletePurchase = useCallback(async (id: string) => {
        const purchase = stateRef.current.purchases.find(p => p.id === id);
        if (!purchase) return;
        let newExpenses = [...stateRef.current.expenses];
        let newCredits = [...stateRef.current.credits];

        if (purchase.linkedExpenseId) {
            newExpenses = newExpenses.filter(e => e.id !== purchase.linkedExpenseId);
            await storage.setExpenses(newExpenses);
            await syncService.delete('@mathnote_expenses', purchase.linkedExpenseId).catch(err => console.error('[Sync] Expense delete failed:', err));
        }
        if (purchase.linkedCreditId) {
            newCredits = newCredits.filter(c => c.id !== purchase.linkedCreditId);
            await storage.setCredits(newCredits);
            await syncService.delete('@mathnote_credits', purchase.linkedCreditId).catch(err => console.error('[Sync] Credit delete failed:', err));
        }

        const newPurchases = stateRef.current.purchases.filter(p => p.id !== id);
        await storage.setPurchases(newPurchases);

        let updatedProducts = [...stateRef.current.products];
        if (purchase.items && purchase.items.length > 0) {
            for (const item of purchase.items) {
                updatedProducts = updatedProducts.map(p =>
                    p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
                );
            }
            await storage.setProducts(updatedProducts);
        }
        setState(prev => ({ ...prev, purchases: newPurchases, products: updatedProducts, expenses: newExpenses, credits: newCredits }));
        await syncService.delete('@mathnote_purchases', id).catch(err => console.error('[Sync] Purchase delete failed:', err));
    }, []);

    // --- Quotations ---
    const addQuotation = useCallback(async (qInput: Omit<Quotation, 'id'>) => {
        const newQ: Quotation = { ...qInput, id: generateId(), companyId: selectedCompanyId };
        const newQs = [...stateRef.current.quotations, newQ];
        await storage.setQuotations(newQs);
        setState(prev => ({ ...prev, quotations: newQs }));
    }, [selectedCompanyId]);

    const updateQuotation = useCallback(async (id: string, updates: Partial<Quotation>) => {
        const newQs = stateRef.current.quotations.map(q => (q.id === id ? { ...q, ...updates } : q));
        await storage.setQuotations(newQs);
        setState(prev => ({ ...prev, quotations: newQs }));
    }, []);

    const deleteQuotation = useCallback(async (id: string) => {
        const newQs = stateRef.current.quotations.filter(q => q.id !== id);
        await storage.setQuotations(newQs);
        setState(prev => ({ ...prev, quotations: newQs }));
        await syncService.delete('@mathnote_quotations', id).catch(err => console.error('[Sync] Quotation delete failed:', err));
    }, []);

    // --- Purchase Orders ---
    const addPurchaseOrder = useCallback(async (poInput: Omit<PurchaseOrder, 'id'>) => {
        const newPO: PurchaseOrder = { ...poInput, id: generateId(), companyId: selectedCompanyId };
        const newPOs = [...stateRef.current.purchaseOrders, newPO];
        await storage.setPurchaseOrders(newPOs);
        setState(prev => ({ ...prev, purchaseOrders: newPOs }));
    }, [selectedCompanyId]);

    const updatePurchaseOrder = useCallback(async (id: string, updates: Partial<PurchaseOrder>) => {
        const newPOs = stateRef.current.purchaseOrders.map(po => (po.id === id ? { ...po, ...updates } : po));
        await storage.setPurchaseOrders(newPOs);
        setState(prev => ({ ...prev, purchaseOrders: newPOs }));
    }, []);

    const deletePurchaseOrder = useCallback(async (id: string) => {
        const newPOs = stateRef.current.purchaseOrders.filter(po => po.id !== id);
        await storage.setPurchaseOrders(newPOs);
        setState(prev => ({ ...prev, purchaseOrders: newPOs }));
        await syncService.delete('@mathnote_purchase_orders', id).catch(err => console.error('[Sync] PurchaseOrder delete failed:', err));
    }, []);

    // --- Attendance ---
    const markAttendance = useCallback(async (records: Omit<Attendance, 'id'>[]) => {
        let newAtt = [...stateRef.current.attendance];
        for (const rec of records) {
            const existing = newAtt.findIndex(a => a.staffId === rec.staffId && a.date === rec.date);
            if (existing >= 0) {
                newAtt[existing] = { ...newAtt[existing], status: rec.status, note: rec.note };
            } else {
                newAtt.push({ ...rec, id: generateId(), companyId: selectedCompanyId });
            }
        }
        await storage.setAttendance(newAtt);
        setState(prev => ({ ...prev, attendance: newAtt }));
    }, [selectedCompanyId]);

    const deleteAttendance = useCallback(async (id: string) => {
        const newAtt = stateRef.current.attendance.filter(a => a.id !== id);
        await storage.setAttendance(newAtt);
        setState(prev => ({ ...prev, attendance: newAtt }));
        await syncService.delete('@mathnote_attendance', id).catch(err => console.error('[Sync] Attendance delete failed:', err));
    }, []);

    // --- Companies ---
    const addCompany = useCallback(async (companyInput: Omit<Company, 'id' | 'createdAt'>) => {
        const companyId = generateId();
        const newCompany: Company = {
            ...companyInput,
            id: companyId,
            createdAt: new Date().toISOString(),
        };
        const newCompanies = [...stateRef.current.companies, newCompany];
        await storage.setCompanies(newCompanies);
        setState(prev => ({ ...prev, companies: newCompanies }));
        if (stateRef.current.companies.length === 0) {
            setSelectedCompanyId(companyId);
        }
    }, []);

    const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
        const newCompanies = stateRef.current.companies.map(c => (c.id === id ? { ...c, ...updates } : c));
        await storage.setCompanies(newCompanies);
        setState(prev => ({ ...prev, companies: newCompanies }));
    }, []);

    const deleteCompany = useCallback(async (id: string) => {
        const newCompanies = stateRef.current.companies.filter(c => c.id !== id);
        await storage.setCompanies(newCompanies);
        setState(prev => ({ ...prev, companies: newCompanies }));
        if (selectedCompanyId === id) {
            setSelectedCompanyId(newCompanies.length > 0 ? newCompanies[0].id : 'default');
        }
    }, [selectedCompanyId]);

    // --- Settings ---
    const updateSettings = useCallback(async (updates: Partial<Settings>) => {
        const newSettings = { ...stateRef.current.settings, ...updates };
        await storage.setSettings(newSettings);
        setState(prev => ({ ...prev, settings: newSettings }));
    }, []);

    const clearAllData = useCallback(async () => {
        const success = await storage.clearAllData();
        if (success) {
            setState({
                sales: [], expenses: [], credits: [], settings: defaultSettings,
                contacts: [], products: [], returns: [], purchases: [],
                quotations: [], purchaseOrders: [], attendance: [],
                companies: [], isLoading: false,
            });
        }
        return success;
    }, []);

    const restoreData = useCallback(async (data: Record<string, unknown>) => {
        const success = await storage.importAllData(data);
        if (success) {
            setState({
                sales: (data.sales as Sale[]) || [],
                expenses: (data.expenses as Expense[]) || [],
                credits: (data.credits as Credit[]) || [],
                settings: data.settings ? { ...defaultSettings, ...(data.settings as Settings) } : defaultSettings,
                contacts: (data.contacts as Contact[]) || [],
                products: (data.products as Product[]) || [],
                returns: (data.returns as SaleReturn[]) || [],
                purchases: (data.purchases as Purchase[]) || [],
                quotations: (data.quotations as Quotation[]) || [],
                purchaseOrders: (data.purchaseOrders as PurchaseOrder[]) || [],
                attendance: (data.attendance as Attendance[]) || [],
                companies: (data.companies as Company[]) || [],
                isLoading: false,
            });
        }
        return success;
    }, []);

    // --- Computed values ---
    const getTodaySales = useCallback(() => {
        const today = getToday();
        return state.sales.filter(s => (s.companyId || 'default') === selectedCompanyId && getFinancialYear(s.date) === selectedFY && s.date === today).reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
    }, [state.sales, selectedFY, selectedCompanyId]);

    const getTodayExpenses = useCallback(() => {
        const today = getToday();
        return state.expenses.filter(e => (e.companyId || 'default') === selectedCompanyId && getFinancialYear(e.date) === selectedFY && e.date === today).reduce((sum, e) => sum + (e.amount ?? 0), 0);
    }, [state.expenses, selectedFY, selectedCompanyId]);

    const getTodayProfit = useCallback(() => {
        const today = getToday();
        return state.sales.filter(s => (s.companyId || 'default') === selectedCompanyId && getFinancialYear(s.date) === selectedFY && s.date === today).reduce((totalProfit, sale) => {
            const subtotal = sale.subtotal || sale.totalAmount || 0;
            const discount = sale.discountTotal || 0;
            const cost = (sale.items || []).reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
            return totalProfit + (subtotal - discount - cost);
        }, 0);
    }, [state.sales, selectedFY, selectedCompanyId]);

    const getBalance = useCallback(() => {
        const totalSales = state.sales.filter(s => (s.companyId || 'default') === selectedCompanyId && getFinancialYear(s.date) === selectedFY).reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
        const totalExpenses = state.expenses.filter(e => (e.companyId || 'default') === selectedCompanyId && getFinancialYear(e.date) === selectedFY).reduce((sum, e) => sum + (e.amount ?? 0), 0);
        const creditReceived = state.credits.filter(c => (c.companyId || 'default') === selectedCompanyId && getFinancialYear(c.date) === selectedFY && c.type === 'given').reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
        const creditPaid = state.credits.filter(c => (c.companyId || 'default') === selectedCompanyId && getFinancialYear(c.date) === selectedFY && c.type === 'taken').reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
        const totalReturns = state.returns.filter(r => (r.companyId || 'default') === selectedCompanyId && getFinancialYear(r.date) === selectedFY).reduce((sum, r) => sum + (r.amount ?? 0), 0);
        const totalPurchases = state.purchases.filter(p => (p.companyId || 'default') === selectedCompanyId && getFinancialYear(p.date) === selectedFY).reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
        return totalSales + creditReceived - totalExpenses - creditPaid - totalReturns - totalPurchases;
    }, [state.sales, state.expenses, state.credits, state.returns, state.purchases, selectedFY, selectedCompanyId]);

    const getCashBalance = useCallback(() => {
        const salesCash = state.sales.filter(s => (s.companyId || 'default') === selectedCompanyId && getFinancialYear(s.date) === selectedFY && s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
        const expensesCash = state.expenses.filter(e => (e.companyId || 'default') === selectedCompanyId && getFinancialYear(e.date) === selectedFY && (e.paymentMethod === 'Cash' || !e.paymentMethod)).reduce((sum, e) => sum + (e.amount ?? 0), 0);
        const creditReceivedCash = state.credits.filter(c => (c.companyId || 'default') === selectedCompanyId && getFinancialYear(c.date) === selectedFY && c.type === 'given').reduce((sum, c) => {
            const cashPayments = c.payments?.filter(p => p.paymentMode === 'Cash') || [];
            return sum + cashPayments.reduce((pSum, p) => pSum + p.amount, 0);
        }, 0);
        return salesCash + creditReceivedCash - expensesCash;
    }, [state.sales, state.expenses, state.credits, selectedFY, selectedCompanyId]);

    const getUPIBalance = useCallback(() => {
        const salesUPI = state.sales.filter(s => (s.companyId || 'default') === selectedCompanyId && getFinancialYear(s.date) === selectedFY && s.paymentMethod === 'UPI').reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount ?? 0), 0);
        const expensesUPI = state.expenses.filter(e => (e.companyId || 'default') === selectedCompanyId && getFinancialYear(e.date) === selectedFY && e.paymentMethod === 'UPI').reduce((sum, e) => sum + (e.amount ?? 0), 0);
        const creditReceivedUPI = state.credits.filter(c => (c.companyId || 'default') === selectedCompanyId && getFinancialYear(c.date) === selectedFY && c.type === 'given').reduce((sum, c) => {
            const upiPayments = c.payments?.filter(p => p.paymentMode === 'UPI') || [];
            return sum + upiPayments.reduce((pSum, p) => pSum + p.amount, 0);
        }, 0);
        return salesUPI + creditReceivedUPI - expensesUPI;
    }, [state.sales, state.expenses, state.credits, selectedFY, selectedCompanyId]);

    return (
        <AppContext.Provider value={{
            state, addSale, updateSale, deleteSale,
            addExpense, updateExpense, deleteExpense,
            addCredit, updateCredit, addCreditPayment, deleteCredit,
            addContact, updateContact, deleteContact,
            addProduct, updateProduct, deleteProduct,
            addReturn, deleteReturn,
            addPurchase, updatePurchase, deletePurchase,
            addQuotation, updateQuotation, deleteQuotation,
            addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
            markAttendance, deleteAttendance,
            updateSettings, clearAllData, restoreData,
            getTodaySales, getTodayExpenses, getTodayProfit,
            getBalance, getCashBalance, getUPIBalance,
            selectedFY, setSelectedFY, availableFYs,
            selectedCompanyId, setSelectedCompanyId,
            addCompany, updateCompany, deleteCompany,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};
