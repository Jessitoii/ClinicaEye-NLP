"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getHistory } from "@/services/api";
import { Activity, ArrowLeft, User, ShieldCheck, Database, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { user } = useAuth();
    const [totalAnalyses, setTotalAnalyses] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        getHistory()
            .then((history) => setTotalAnalyses(history.length))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <main className="flex min-h-screen flex-col bg-background text-foreground font-sans">
            <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 bg-card">
                <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="hover:bg-primary/10 mr-2">
                        <ArrowLeft className="h-5 w-5 text-primary" />
                    </Button>
                    <User className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold font-mono tracking-wider text-white">
                        CLINICIAN_PROFILE <span className="text-muted-foreground font-light">| SYSTEM_STATS</span>
                    </h1>
                </div>
            </header>

            <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8">
                {/* Profile Card */}
                <Card className="rounded-none border-border bg-card shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-scan pointer-events-none" />
                    <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                        <div className="p-4 border border-primary/50 bg-primary/5">
                            <User className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold font-mono tracking-tight">{user?.name || "Dr. Ophthalmo"}</CardTitle>
                            <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest">{user?.email}</p>
                        </div>
                        <div className="ml-auto flex items-center space-x-2 text-green-400 bg-green-400/10 px-3 py-1 border border-green-400/20">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] font-mono font-bold tracking-tighter">AUTHENTICATED_ACCESS</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 border border-border/50 bg-muted/20">
                                <div className="flex items-center space-x-2">
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-mono uppercase text-muted-foreground">Clinician ID</span>
                                </div>
                                <span className="text-xs font-mono font-bold">{user?.id?.substring(0, 12)}...</span>
                            </div>
                            <div className="flex items-center justify-between p-3 border border-border/50 bg-muted/20">
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-mono uppercase text-muted-foreground">Account Status</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-primary">PERSISTENT_ACTIVE</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {/* Stats Placeholder */}
                            <div className="flex items-center justify-between p-3 border border-border/50 bg-primary/5 border-primary/20">
                                <div className="flex items-center space-x-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-mono uppercase text-primary">Analyses Completed</span>
                                </div>
                                <span className="text-xl font-mono font-bold text-primary">
                                    {isLoading ? "..." : totalAnalyses.toString().padStart(3, '0')}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Stats / Tech Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-none border-border bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em]">Inference Engine</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold font-mono">NLP_CORE_V1</div>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-tighter opacity-70">
                                BioBERT_MultiLabel_Architecture
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-none border-border bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em]">Processing Latency</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold font-mono text-green-400">&lt; 2.0s</div>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-tighter opacity-70">
                                Real-time Analysis Throughput
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-none border-border bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em]">Security Protocol</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold font-mono">HIPAA_OAUTH2</div>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-tighter opacity-70">
                                End-to-End Encryption [JWT]
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
