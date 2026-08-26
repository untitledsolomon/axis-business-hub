// hooks/useAxisPro.ts  
'use client';

import { useState, useEffect } from 'react';  
import { getCustomerInfo, hasAxisPro } from '@/lib/revenuecat';  
import type { CustomerInfo } from '@revenuecat/purchases-js';

interface UseAxisProResult {  
 isProUser: boolean;  
 customerInfo: CustomerInfo | null;  
 isLoading: boolean;  
 error: Error | null;  
 refresh: () => Promise<void>;  
}

export function useAxisPro(): UseAxisProResult {  
 const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);  
 const [isLoading, setIsLoading] = useState(true);  
 const [error, setError] = useState<Error | null>(null);

 const fetchCustomerInfo = async () => {  
 setIsLoading(true);  
 setError(null);  
 try {  
 const info = await getCustomerInfo();  
 setCustomerInfo(info);  
 } catch (err) {  
 setError(err instanceof Error ? err : new Error('Failed to load subscription info'));  
 } finally {  
 setIsLoading(false);  
 }  
 };

 useEffect(() => {  
 fetchCustomerInfo();  
 }, []);

 return {  
 isProUser: customerInfo ? hasAxisPro(customerInfo) : false,  
 customerInfo,  
 isLoading,  
 error,  
 refresh: fetchCustomerInfo,  
 };  
}  