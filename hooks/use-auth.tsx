"use client";  
import React, { createContext, useContext, useState, useEffect, useRef } from "react";  
import { useRouter } from "next/navigation";  
import { createClient } from "@/lib/supabase/client";  
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";  
import posthog from "posthog-js";  

interface AuthContextType {  
 user: User | null;  
 isLoading: boolean;  
 signOut: () => Promise<void>;  
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {  
 const [user, setUser] = useState<User | null>(null);  
 const [isLoading, setIsLoading] = useState(true);  
 const identifiedUserId = useRef<string | null>(null);  
 const router = useRouter();  
 const supabase = typeof window === "undefined" ? null : createClient();

 const identifyUser = (authenticatedUser: User) => {  
 if (identifiedUserId.current === authenticatedUser.id) {  
 return;  
 }

 if (identifiedUserId.current) {  
 posthog.reset();  
 }

 posthog.identify(authenticatedUser.id, {  
 email: authenticatedUser.email,  
 name:  
 typeof authenticatedUser.user_metadata.full_name === "string"  
 ? authenticatedUser.user_metadata.full_name  
 : undefined,  
 });

 // Note: unlike RevenueCat, Paddle has no client-side "configure with  
 // user ID" step — the user ID is instead passed as custom_data when  
 // opening checkout (see lib/paddle.ts openCheckout), and the webhook  
 // uses it to link the resulting Paddle subscription back to this  
 // Supabase user.  

 identifiedUserId.current = authenticatedUser.id;  
 };

 useEffect(() => {  
 if (!supabase) {  
 setUser(null);  
 setIsLoading(false);  
 return;  
 }

 const getUser = async () => {  
 const {  
 data: { user },  
 } = await supabase.auth.getUser();  
 setUser(user);  
 if (user) {  
 identifyUser(user);  
 }  
 setIsLoading(false);  
 };

 getUser();

 const {  
 data: { subscription },  
 } = supabase.auth.onAuthStateChange(  
 (event: AuthChangeEvent, session: Session | null) => {  
 const authenticatedUser = session?.user ?? null;  
 setUser(authenticatedUser);  
 if (authenticatedUser) {  
 identifyUser(authenticatedUser);  
 }  
 setIsLoading(false);  
 if (event === "SIGNED_IN") {  
 posthog.capture("user_signed_in");  
 router.refresh();  
 }  
 if (event === "SIGNED_OUT") {  
 identifiedUserId.current = null;  
 router.push("/login");  
 router.refresh();  
 }  
 }  
 );

 return () => {  
 subscription.unsubscribe();  
 };  
 }, [router, supabase]);

 const signOut = async () => {  
 if (!supabase) return;  
 posthog.reset();  
 identifiedUserId.current = null;  
 await supabase.auth.signOut();  
 };

 return (  
 <AuthContext.Provider value={{ user, isLoading, signOut }}>  
 {children}  
 </AuthContext.Provider>  
 );  
}

export function useAuth() {  
 const context = useContext(AuthContext);  
 if (context === undefined) {  
 throw new Error("useAuth must be used within an AuthProvider");  
 }  
 return context;  
}  