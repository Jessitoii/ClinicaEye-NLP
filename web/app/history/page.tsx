"use client";

import { useEffect, useState } from "react";
import { getHistory, HistoryItem } from "@/services/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowLeft, History, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        getHistory()
            .then(setHistory)
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
                    <History className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold font-mono tracking-wider text-white">
                        PATIENT_ARCHIVE <span className="text-muted-foreground font-light">| ANALYSIS_HISTORY</span>
                    </h1>
                </div>
            </header>

            <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
                <div className="bg-card border border-border overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex justify-between items-center">
                        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                            Ledger of Diagnostic Records
                        </h3>
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1">
                            {history.length} ENTRIES_DETECTED
                        </span>
                    </div>

                    <div className="relative overflow-x-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Accessing Secure Vault...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-sm font-mono text-muted-foreground">ARCHIVE_EMPTY: No previous records found.</p>
                                <Link href="/">
                                    <Button className="mt-4 rounded-none bg-primary text-primary-foreground hover:bg-primary/80">
                                        START_NEW_ANALYSIS
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="font-mono text-xs uppercase text-muted-foreground">Record ID</TableHead>
                                        <TableHead className="font-mono text-xs uppercase text-muted-foreground">Timestamp</TableHead>
                                        <TableHead className="font-mono text-xs uppercase text-muted-foreground">Top Indicators</TableHead>
                                        <TableHead className="text-right font-mono text-xs uppercase text-muted-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((item) => (
                                        <TableRow key={item.id} className="border-border hover:bg-primary/5 transition-colors">
                                            <TableCell className="font-mono text-xs font-bold text-foreground">
                                                {item.id.substring(0, 8)}...
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.predictions?.slice(0, 2).map((pred, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                            className={`rounded-none font-mono text-[10px] ${pred.probability >= 0.7
                                                                    ? "border-destructive text-destructive bg-destructive/5"
                                                                    : pred.probability >= 0.4
                                                                        ? "border-amber-500 text-amber-500 bg-amber-500/5"
                                                                        : "border-primary text-primary bg-primary/5"
                                                                }`}
                                                        >
                                                            {pred.class} ({Math.round(pred.probability * 100)}%)
                                                        </Badge>
                                                    ))}
                                                    {item.predictions?.length > 2 && (
                                                        <span className="text-[10px] text-muted-foreground font-mono">+{item.predictions.length - 2} MORE</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/analysis/${item.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="rounded-none font-mono text-[10px] text-primary hover:text-white hover:bg-primary transition-colors"
                                                    >
                                                        <ExternalLink className="h-3 w-3 mr-2" />
                                                        VIEW_FULL_INTEL
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
