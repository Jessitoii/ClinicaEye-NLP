"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface DoctorUser {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextType {
    token: string | null;
    user: DoctorUser | null;
    isAuthenticated: boolean;
    login: (token: string, user: DoctorUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<DoctorUser | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Hydrate state from localStorage
        const storedToken = localStorage.getItem("jwt");
        const storedUser = localStorage.getItem("user");

        console.log("AUTH_HYDRATION: Checking credentials...", { hasToken: !!storedToken });

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.log("AUTH_HYDRATION_SUCCESS: Session restored for", parsedUser.email);
            } catch (e) {
                console.error("AUTH_HYDRATION_ERROR: Failed to parse user object", e);
                setUser(null);
            }
        } else {
            // If no token and trying to access protected route
            if (pathname !== "/login" && pathname !== "/register") {
                console.warn("AUTH_REDIRECT: Unauthenticated access attempt to", pathname, ". Redirecting to /login");
                router.push("/login");
            }
        }
    }, [pathname, router]);

    const login = (newToken: string, newUser: DoctorUser) => {
        console.log("AUTH_CONTEXT_LOGIN: Writing credentials to local storage...");
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem("jwt", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));
        console.log("AUTH_CONTEXT_LOGIN: Redirecting to dashboard...");
        router.push("/");
    };

    const logout = () => {
        console.log("AUTH_CONTEXT_LOGOUT: Purging credentials...");
        setToken(null);
        setUser(null);
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        router.push("/login");
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
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
