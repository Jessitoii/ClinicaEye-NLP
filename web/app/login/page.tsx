"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import api from "@/services/api";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            console.log("LOGIN_ATTEMPT: Initiating request for", email);
            const response = await api.post("auth/login", {
                email,
                password,
            });

            console.log("LOGIN_RESPONSE_RECEIVED:", response.data);

            if (response.data.status === "success") {
                const { token, doctor } = response.data.data;
                console.log("AUTH_SUCCESS: Extracting tokens for doctor", doctor.email);

                // Ensure field names match what AuthContext expects
                login(token, {
                    id: doctor.id,
                    email: doctor.email,
                    name: doctor.name
                });
                console.log("AUTH_CONTEXT_UPDATED: Triggering redirect...");
            } else {
                console.warn("AUTH_FAILED: Backend returned non-success status", response.data);
                setError(response.data.message || "ERR_AUTH_FAILED: Access Denied.");
            }
        } catch (err: any) {
            console.error("AUTH_CRITICAL_ERROR:", err);
            setError(err.response?.data?.message || err.message || "ERR_AUTH_FAILED: Access Denied.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground font-mono p-4">
            <div className="w-full max-w-md bg-card border border-border p-8 shadow-2xl relative overflow-hidden">
                {/* Aesthetic scanline overlay */}
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-scan pointer-events-none" />

                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 border border-primary/50 mb-4">
                        <Activity className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter">AUTHENTICATION_GATE</h1>
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Authorized Personnel Only</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 flex items-start space-x-3 text-destructive animate-in fade-in slide-in-from-top-2">
                        <ShieldAlert className="h-5 w-5 shrink-0" />
                        <span className="text-xs leading-relaxed uppercase">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">User Descriptor [Email]</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@clinica.eye"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-none border-border bg-background focus:border-primary transition-colors font-mono"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Access Key [Password]</Label>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-none border-border bg-background focus:border-primary transition-colors font-mono"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest transition-all"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Validating...
                            </>
                        ) : (
                            "Authorize Access"
                        )}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">
                        New node in the cluster?
                    </p>
                    <Link
                        href="/register"
                        className="text-xs text-primary hover:underline underline-offset-4 tracking-tighter font-bold"
                    >
                        REGISTER_NEW_CREDENTIALS
                    </Link>
                </div>
            </div>

            <p className="mt-8 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono opacity-50">
                ClinicaEye Secure Tunnel // Protocol V1.0
            </p>
        </div>
    );
}
