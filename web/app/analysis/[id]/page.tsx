"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InferenceResponse, getPredictionById } from "@/services/api";
import { HybridChart } from "@/components/charts/HybridChart";
import { ExportUtility } from "@/components/analysis/ExportUtility";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceHeatmap } from "@/components/analysis/EvidenceHeatmap";

export default function AnalysisView() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<InferenceResponse | null>(null);
    const [isNotFound, setIsNotFound] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem(`inference_${id}`);
        if (stored) {
            setData(JSON.parse(stored));
        } else if (typeof id === 'string') {
            getPredictionById(id)
                .then(setData)
                .catch((err) => {
                    console.error("ANALYSIS_FETCH_FAILED:", err);
                    setIsNotFound(true);
                });
        }
    }, [id]);

    if (isNotFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center font-mono bg-background text-foreground p-8 text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-6 animate-pulse" />
                <h2 className="text-xl font-bold mb-2">ERR_NOT_FOUND: Analysis Record Missing or Expired.</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                    The requested diagnostic node could not be retrieved from the central archive.
                    Authorization might have expired or the record ID is invalid.
                </p>
                <Button onClick={() => router.push('/')} variant="outline" className="rounded-none border-primary text-primary hover:bg-primary/10 font-bold uppercase tracking-widest">
                    Return to Mission Control
                </Button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center font-mono bg-background text-foreground">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs uppercase tracking-[0.3em] font-bold text-primary animate-pulse">Accessing Encrypted Sequence...</p>
                </div>
            </div>
        );
    }

    // Defensive mapping with default empty arrays
    const predictions = data?.predictions || [];
    const highlightZones = data?.highlight_zones || [];

    // Determine Critical Diagnoses (probability >= 80%)
    const criticalDiagnoses = predictions.filter((p) => p.probability >= 0.8);

    return (
        <main className="min-h-screen bg-background text-foreground font-sans p-4 md:p-6 lg:p-8" id="report-container">
            {/* Mission Control Navigation */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-border/50">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/')} className="rounded-none border-border hover:bg-primary/5 transition-colors">
                        <ArrowLeft className="w-4 h-4 text-primary" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold font-mono tracking-tighter uppercase">DIAGNOSTIC_LEDGER <span className="text-muted-foreground font-light text-sm">/ {data.id?.substring(0, 12)}</span></h1>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                            LATENCY_VECTOR: {data.latency_ms}ms • STATUS: {predictions.length > 0 ? "PATHOLOGY_DETECTED" : "NOMINAL"}
                        </p>
                    </div>
                </div>
                <ExportUtility targetElementId="report-container" patientId={data.id} />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto">

                {/* Left Column: XAI Text Mapping & Triage Warning */}
                <section className="col-span-1 lg:col-span-1 space-y-8">
                    {/* Multi-tier Warning Display */}
                    {criticalDiagnoses.length > 0 ? (
                        <div className="border border-destructive/50 bg-destructive/10 p-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center space-x-2 text-destructive font-bold font-mono mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="tracking-tighter">[ ! ] CRITICAL_COMORBIDITY_ALERT</span>
                            </div>
                            <p className="text-sm font-mono text-destructive/80 leading-relaxed uppercase">
                                {criticalDiagnoses.map((d) => d.class).join(" | ")}
                            </p>
                        </div>
                    ) : predictions.length === 0 ? (
                        <div className="border border-green-500/50 bg-green-500/5 p-4 animate-in fade-in duration-700">
                            <div className="flex items-center space-x-2 text-green-400 font-bold font-mono mb-2">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="tracking-tighter">NOMINAL_READING</span>
                            </div>
                            <p className="text-[11px] font-mono text-green-400/70 uppercase leading-relaxed font-bold">
                                ERROR_ZERO: No Significant Pathologies Detected in sequence.
                                Clinical correlation recommended for definitive clearance.
                            </p>
                        </div>
                    ) : (
                        <div className="border border-primary/30 bg-primary/5 p-4">
                            <p className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
                                Diagnostic Observation in Progress...
                            </p>
                        </div>
                    )}

                    <EvidenceHeatmap 
                        text={data.text || "NO_SEQUENCE_DATA_LOADED"} 
                        explanations={highlightZones} 
                    />
                </section>

                {/* Right Column: Visualization Spectrum */}
                <section className="col-span-1 lg:col-span-2 space-y-8">
                    <div className="bg-card border border-border/50 p-2 shadow-inner">
                        <HybridChart data={predictions} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-border/40 bg-muted/20">
                            <h4 className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Model Confidence</h4>
                            <div className="text-xl font-bold font-mono">
                                {predictions.length > 0 ? `${Math.round(Math.max(...predictions.map(p => p.probability)) * 100)}%` : "N/A"}
                            </div>
                        </div>
                        <div className="p-4 border border-border/40 bg-muted/20">
                            <h4 className="text-[10px] font-mono text-muted-foreground uppercase mb-2">System Throughput</h4>
                            <div className="text-xl font-bold font-mono text-green-400">STABLE</div>
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}

import { ShieldCheck } from "lucide-react";
