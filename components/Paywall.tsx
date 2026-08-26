// components/Paywall.tsx  
'use client';

import { useRef, useState } from 'react';  
import { getPurchases, hasAxisPro, isUserCancelledError } from '@/lib/revenuecat';

interface PaywallProps {  
 onSuccess?: () => void;  
 onCancel?: () => void;  
}

export function Paywall({ onSuccess, onCancel }: PaywallProps) {  
 const containerRef = useRef<HTMLDivElement>(null);  
 const [isLoading, setIsLoading] = useState(false);  
 const [error, setError] = useState<string | null>(null);

 const handlePresentPaywall = async () => {  
 if (!containerRef.current) return;

 setIsLoading(true);  
 setError(null);

 try {  
 const purchases = getPurchases();

 const result = await purchases.presentPaywall({  
 htmlTarget: containerRef.current,  
 // Optionally pass a specific offering:  
 // offering: await purchases.getOfferings().then(o => o.current ?? undefined),  
 });

 if (result && hasAxisPro(result.customerInfo)) {  
 onSuccess?.();  
 }  
 } catch (err: unknown) {  
 if (err && typeof err === 'object' && 'errorCode' in err) {  
 const rcError = err as { errorCode: string; message: string };  
 if (isUserCancelledError(rcError as any)) {  
 onCancel?.();  
 return;  
 }  
 setError(rcError.message ?? 'Something went wrong. Please try again.');  
 } else {  
 setError('Something went wrong. Please try again.');  
 }  
 } finally {  
 setIsLoading(false);  
 }  
 };

 return (  
 <div className="paywall-wrapper">  
 <div  
 ref={containerRef}  
 id="rc-paywall-container"  
 className="w-full min-h-[600px]"  
 />

 {!isLoading && (  
 <button onClick={handlePresentPaywall} className="btn-primary">  
 View Plans  
 </button>  
 )}

 {isLoading && <p className="text-sm text-muted">Loading paywall…</p>}  
 {error && <p className="text-sm text-red-500 mt-2">{error}</p>}  
 </div>  
 );  
}  