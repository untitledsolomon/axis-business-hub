import { Purchases, type CustomerInfo, type PurchasesError } from '@revenuecat/purchases-js';

const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY!;

// ---------------------------------------------------------------------------  
// Initialization  
// ---------------------------------------------------------------------------

/**  
 * Call this once when the user authenticates.  
 * Pass the Supabase user ID so purchases are tied to their account across  
 * platforms (web + mobile).  
 */  
export function initRevenueCat(userId: string): Purchases {  
 // configure() is idempotent – safe to call multiple times  
 return Purchases.configure(API_KEY, userId);  
}

/**  
 * Get the shared Purchases instance (must call initRevenueCat first).  
 * Throws if not yet configured.  
 */  
export function getPurchases(): Purchases {  
 return Purchases.getSharedInstance();  
}

// ---------------------------------------------------------------------------  
// Entitlement check  
// ---------------------------------------------------------------------------

const ENTITLEMENT_ID = 'axis_pro';

export function hasAxisPro(customerInfo: CustomerInfo): boolean {  
 return customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive === true;  
}

// ---------------------------------------------------------------------------  
// Customer info  
// ---------------------------------------------------------------------------

export async function getCustomerInfo(): Promise<CustomerInfo> {  
 const purchases = getPurchases();  
 return purchases.getCustomerInfo();  
}

// ---------------------------------------------------------------------------  
// Offerings  
// ---------------------------------------------------------------------------

export async function getOfferings() {  
 const purchases = getPurchases();  
 return purchases.getOfferings();  
}

// ---------------------------------------------------------------------------  
// Error helpers  
// ---------------------------------------------------------------------------

export function isUserCancelledError(error: PurchasesError): boolean {  
 return error.errorCode === 'USER_CANCELLED';  
}  