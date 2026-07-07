// Data models — MathNote Desktop billing system

export interface SaleItem {
    productId: string;
    productName: string;
    brand?: string;
    quantity: number;
    price: number;
    costPrice?: number;
    total: number;
    hsnCode?: string;
    discount?: number;
    discountType?: 'percent' | 'flat';
    taxableValue?: number;
    taxRate?: number;
    taxTotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
}

export interface Sale {
    id: string;
    companyId?: string;
    date: string;
    customerName: string;
    customerState?: string;
    customerAddress?: string;
    customerGSTIN?: string;
    customerPhone?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: 'Cash' | 'UPI';
    note: string;
    linkedCreditId?: string;
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
    returnIds?: string[];
}

export interface Expense {
    id: string;
    companyId?: string;
    date: string;
    category: string;
    amount: number;
    note: string;
    vendorName?: string;
    vendorId?: string;
    paymentMethod?: 'Cash' | 'UPI';
}

export interface CreditPayment {
    id: string;
    date: string;
    amount: number;
    note?: string;
    paymentMode?: 'Cash' | 'UPI';
}

export interface Credit {
    id: string;
    companyId?: string;
    party: string;
    type: 'given' | 'taken';
    amount: number;
    paidAmount: number;
    status: 'pending' | 'paid';
    date: string;
    dueDate?: string;
    note?: string;
    linkedSaleId?: string;
    linkedPurchaseId?: string;
    payments?: CreditPayment[];
}

export interface Contact {
    id: string;
    companyId?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    state?: string;
    gstin?: string;
    type: 'customer' | 'vendor' | 'both' | 'staff' | 'employee' | 'other';
    createdAt: string;
}

export interface Product {
    id: string;
    companyId?: string;
    name: string;
    brand?: string;
    sku?: string;
    barcode?: string;        // primary barcode (legacy)
    barcodes?: string[];     // multiple barcodes support
    hsnCode?: string;
    category?: string;
    price: number;
    costPrice?: number;
    stock: number;
    unit?: string;
    lowStockThreshold?: number;
    taxRate?: number;
    createdAt: string;
}

export interface SaleReturn {
    id: string;
    companyId?: string;
    saleId: string;
    date: string;
    party: string;
    amount: number;
    note: string;
    items?: SaleItem[];
    linkedCreditId?: string;
}

export interface Purchase {
    id: string;
    companyId?: string;
    date: string;
    vendorName: string;
    vendorState?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: 'Cash' | 'UPI';
    note?: string;
    items?: SaleItem[];
    linkedExpenseId?: string;
    linkedCreditId?: string;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstRate?: number;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'converted' | 'expired';

export interface Quotation {
    id: string;
    companyId?: string;
    date: string;
    quotationNumber: string;
    customerName: string;
    customerState?: string;
    customerAddress?: string;
    customerGSTIN?: string;
    customerPhone?: string;
    items: SaleItem[];
    subtotal: number;
    discountTotal: number;
    discountType?: 'percent' | 'flat';
    taxTotal: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstRate?: number;
    taxMode?: 'exclusive' | 'inclusive';
    grandTotal: number;
    validUntil?: string;
    terms?: string;
    status: QuotationStatus;
    convertedSaleId?: string;
    note?: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface PurchaseOrder {
    id: string;
    companyId?: string;
    date: string;
    poNumber: string;
    vendorName: string;
    vendorState?: string;
    items: SaleItem[];
    subtotal: number;
    taxTotal: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gstRate?: number;
    grandTotal: number;
    expectedDate?: string;
    status: PurchaseOrderStatus;
    convertedPurchaseId?: string;
    note?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'late' | 'leave';

export interface Attendance {
    id: string;
    companyId?: string;
    staffId: string;
    staffName: string;
    date: string;
    status: AttendanceStatus;
    note?: string;
}

export type UserRole = 'owner' | 'manager' | 'staff';

export interface UserPermissionActions {
    view: boolean;
    add: boolean;
    modify: boolean;
    delete: boolean;
}

export interface UserPermissions {
    sales: UserPermissionActions;
    purchases: UserPermissionActions;
    inventory: UserPermissionActions;
    expenses: UserPermissionActions;
    credits: UserPermissionActions;
    reports: UserPermissionActions;
    staff: UserPermissionActions;
    settings: UserPermissionActions;
}

export interface User {
    id: string;
    companyId?: string;
    name: string;
    username: string;
    password: string;
    role: UserRole;
    createdAt: string;
    permissions?: UserPermissions;
}

export type InvoiceTemplate = 'modern' | 'classic' | 'professional' | 'compact' | 'minimal';
export type InvoicePrintSize = 'A4' | 'A5' | '3inch';

export interface Settings {
    theme: 'light' | 'dark';
    currency: string;
    lock: boolean;
    biometricEnabled?: boolean;
    autoCloudBackup?: boolean;
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessGSTIN?: string;
    businessLogo?: string;
    taxType?: 'GST' | 'NON-GST' | 'Composition';
    bankName?: string;
    bankAccountNumber?: string;
    bankIFSC?: string;
    upiId?: string;
    autoBackupEnabled?: boolean;
    autoBackupPath?: string;
    remindersEnabled?: boolean;
    invoiceTemplate?: InvoiceTemplate;
    invoicePrintSize?: InvoicePrintSize;
    invoiceTerms?: string;
    invoicePrefix?: string;
    lastInvoiceNumber?: number;
    quotationPrefix?: string;
    lastQuotationNumber?: number;
    poPrefix?: string;
    lastPONumber?: number;
    users?: User[];
    gstEnabled?: boolean;
    gstRate?: number;
    gstType?: 'intra' | 'inter';
    taxMode?: 'exclusive' | 'inclusive';
}

export interface Company {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    gstin?: string;
    createdAt: string;
}

// Indian states list
export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Storage keys
const KEYS = {
    SALES: '@mathnote_sales',
    EXPENSES: '@mathnote_expenses',
    CREDITS: '@mathnote_credits',
    SETTINGS: '@mathnote_settings',
    CONTACTS: '@mathnote_contacts',
    PRODUCTS: '@mathnote_products',
    RETURNS: '@mathnote_returns',
    PURCHASES: '@mathnote_purchases',
    QUOTATIONS: '@mathnote_quotations',
    PURCHASE_ORDERS: '@mathnote_purchase_orders',
    ATTENDANCE: '@mathnote_attendance',
    COMPANIES: '@mathnote_companies',
};

// Storage adapter using localStorage
const storage = {
    onSet: null as ((key: string, value: any) => void) | null,

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch { return null; }
    },
    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            if (this.onSet) {
                this.onSet(key, value);
            }
            return true;
        } catch { return false; }
    },

    async getSales(): Promise<Sale[]> { return (await this.get<Sale[]>(KEYS.SALES)) || []; },
    async setSales(v: Sale[]) { return this.set(KEYS.SALES, v); },

    async getExpenses(): Promise<Expense[]> { return (await this.get<Expense[]>(KEYS.EXPENSES)) || []; },
    async setExpenses(v: Expense[]) { return this.set(KEYS.EXPENSES, v); },

    async getCredits(): Promise<Credit[]> { return (await this.get<Credit[]>(KEYS.CREDITS)) || []; },
    async setCredits(v: Credit[]) { return this.set(KEYS.CREDITS, v); },

    async getSettings(): Promise<Settings | null> { return this.get<Settings>(KEYS.SETTINGS); },
    async setSettings(v: Settings) { return this.set(KEYS.SETTINGS, v); },

    async getContacts(): Promise<Contact[]> { return (await this.get<Contact[]>(KEYS.CONTACTS)) || []; },
    async setContacts(v: Contact[]) { return this.set(KEYS.CONTACTS, v); },

    async getProducts(): Promise<Product[]> { return (await this.get<Product[]>(KEYS.PRODUCTS)) || []; },
    async setProducts(v: Product[]) { return this.set(KEYS.PRODUCTS, v); },

    async getReturns(): Promise<SaleReturn[]> { return (await this.get<SaleReturn[]>(KEYS.RETURNS)) || []; },
    async setReturns(v: SaleReturn[]) { return this.set(KEYS.RETURNS, v); },

    async getPurchases(): Promise<Purchase[]> { return (await this.get<Purchase[]>(KEYS.PURCHASES)) || []; },
    async setPurchases(v: Purchase[]) { return this.set(KEYS.PURCHASES, v); },

    async getQuotations(): Promise<Quotation[]> { return (await this.get<Quotation[]>(KEYS.QUOTATIONS)) || []; },
    async setQuotations(v: Quotation[]) { return this.set(KEYS.QUOTATIONS, v); },

    async getPurchaseOrders(): Promise<PurchaseOrder[]> { return (await this.get<PurchaseOrder[]>(KEYS.PURCHASE_ORDERS)) || []; },
    async setPurchaseOrders(v: PurchaseOrder[]) { return this.set(KEYS.PURCHASE_ORDERS, v); },

    async getAttendance(): Promise<Attendance[]> { return (await this.get<Attendance[]>(KEYS.ATTENDANCE)) || []; },
    async setAttendance(v: Attendance[]) { return this.set(KEYS.ATTENDANCE, v); },

    async getCompanies(): Promise<Company[]> { return (await this.get<Company[]>(KEYS.COMPANIES)) || []; },
    async setCompanies(v: Company[]) { return this.set(KEYS.COMPANIES, v); },

    async exportAllData() {
        return {
            sales: await this.getSales(),
            expenses: await this.getExpenses(),
            credits: await this.getCredits(),
            settings: await this.getSettings(),
            contacts: await this.getContacts(),
            products: await this.getProducts(),
            returns: await this.getReturns(),
            purchases: await this.getPurchases(),
            quotations: await this.getQuotations(),
            purchaseOrders: await this.getPurchaseOrders(),
            attendance: await this.getAttendance(),
            companies: await this.getCompanies(),
        };
    },

    async importAllData(data: Record<string, unknown>): Promise<boolean> {
        try {
            if (data.sales) await this.setSales(data.sales as Sale[]);
            if (data.expenses) await this.setExpenses(data.expenses as Expense[]);
            if (data.credits) await this.setCredits(data.credits as Credit[]);
            if (data.settings) await this.setSettings(data.settings as Settings);
            if (data.contacts) await this.setContacts(data.contacts as Contact[]);
            if (data.products) await this.setProducts(data.products as Product[]);
            if (data.returns) await this.setReturns(data.returns as SaleReturn[]);
            if (data.purchases) await this.setPurchases(data.purchases as Purchase[]);
            if (data.quotations) await this.setQuotations(data.quotations as Quotation[]);
            if (data.purchaseOrders) await this.setPurchaseOrders(data.purchaseOrders as PurchaseOrder[]);
            if (data.attendance) await this.setAttendance(data.attendance as Attendance[]);
            if (data.companies) await this.setCompanies(data.companies as Company[]);
            return true;
        } catch { return false; }
    },

    async clearAllData(): Promise<boolean> {
        try {
            Object.values(KEYS).forEach(k => localStorage.removeItem(k));
            localStorage.removeItem('@mathnote_auth');
            localStorage.removeItem('@mathnote_users');
            return true;
        } catch { return false; }
    },
};

export default storage;
