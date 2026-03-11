"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import api from "@/services/api";

export default function RegisterPage() {
    const { login } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            console.log("REGISTER_ATTEMPT: Requesting provisioning for", email);
            const response = await api.post("/auth/register", {
                name,
                email,
                password,
            });

            console.log("REGISTER_RESPONSE_RECEIVED:", response.data);

            if (response.data.status === "success") {
                const { token, doctor } = response.data.data;
                console.log("PROVISIONING_COMPLETE: Initializing local state for", doctor.email);

                // Automatically login after registration
                login(token, {
                    id: doctor.id,
                    email: doctor.email,
                    name: doctor.name
                });
            } else {
                console.warn("REGISTRATION_DENIED: Backend returned non-success status", response.data);
                setError(response.data.message || "ERR_REGISTRATION_FAILED: Could not create profile.");
            }
        } catch (err: any) {
            console.error("REGISTER_CRITICAL_ERROR:", err);
            setError(err.response?.data?.message || err.message || "ERR_REGISTRATION_FAILED: Could not create profile.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground font-mono p-4">
            <div className="w-full max-w-md bg-card border border-border p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-scan pointer-events-none" />

                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 border border-primary/50 mb-4">
                        <Activity className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter">CREDENTIAL_PROVISIONING</h1>
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Entry Registration Protocols</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 flex items-start space-x-3 text-destructive animate-in fade-in slide-in-from-top-2">
                        <ShieldAlert className="h-5 w-5 shrink-0" />
                        <span className="text-xs leading-relaxed uppercase">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Full Name [Display]</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Dr. John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-none border-border bg-background focus:border-primary transition-colors font-mono"
                            required
                        />
                    </div>

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
                        <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Generate Secret [Password]</Label>
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
                                Provisioning...
                            </>
                        ) : (
                            "Initialize Profile"
                        )}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">
                        Already registered on this node?
                    </p>
                    <Link
                        href="/login"
                        className="text-xs text-primary hover:underline underline-offset-4 tracking-tighter font-bold"
                    >
                        RETURN_TO_AUTH_GATE
                    </Link>
                </div>
            </div>
        </div>
    );
}
