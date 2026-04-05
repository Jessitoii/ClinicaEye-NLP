"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPredictionById } from "@/services/api";
import { ExportUtility } from "@/components/analysis/ExportUtility";
import { Button } from "@/components/ui/button";
import { EvidenceHeatmap } from "@/components/analysis/EvidenceHeatmap";
import { VisualDiagnosticFeed } from "@/components/analysis/VisualDiagnosticFeed";
import { DualRadarChart } from "@/components/charts/DualRadarChart";
import {
    ArrowLeft,
    AlertTriangle,
    ShieldCheck,
    Activity,
    Thermometer,
    BrainCircuit,
    ScanSearch,
} from "lucide-react";

export default function AnalysisView() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [isNotFound, setIsNotFound] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setData(null);
        setIsNotFound(false);
        setIsLoading(true);

        if (typeof id === "string") {
            getPredictionById(id)
                .then((res) => {
                    setData(res);
                    setIsLoading(false);
                })
                .catch((err) => {
                    console.error("ANALYSIS_FETCH_FAILED:", err);
                    setIsNotFound(true);
                    setIsLoading(false);
                });
        }
    }, [id]);

    if (isNotFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center font-mono bg-[#0A0A0A] text-foreground p-8 text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-6 animate-pulse" />
                <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter">
                    ERR_NOT_FOUND: Sequence Missing
                </h2>
                <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="rounded-none border-primary text-primary mt-8"
                >
                    Return to Control Center
                </Button>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center font-mono bg-[#0A0A0A] text-foreground">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-primary animate-pulse">
                        Synchronizing Multimodal Diagnostic Ledger...
                    </p>
                </div>
            </div>
        );
    }

    // ─── PAYLOAD ─────────────────────────────────────────────────────────────
    // Logdan doğrulanan gerçek yapı:
    // payload.id
    // payload.text
    // payload.latency_ms
    // payload.isMultimodal
    // payload.imageUrl
    // payload.predictions  = [{class, probability}]  ← top-1 NLP prediction
    // payload.highlight_zones = [{word, importance}] ← NLP word highlights
    // payload.visual = {
    //     status: "SUCCESS",
    //     predictions: [{class, probability}],        ← 8 class vision output
    //     highlight_zones: [{...}]                    ← visual heatmap
    // }
    const payload = data?.data?.id ? data.data : data;

    const predictionId = payload.id || payload.predictionId || "UNKNOWN";
    const latency = payload.latency_ms || payload.latency || 0;
    const isMultimodal = Boolean(payload.isMultimodal) || Boolean(payload.visual);

    // ─── NLP VERİSİ ───────────────────────────────────────────────────────────
    // predictions sadece top-1 döndürüyor: [{class: "Macular Degeneration", probability: 0.81}]
    const nlpDataArray: { class: string; probability: number }[] =
        Array.isArray(payload.predictions)
            ? payload.predictions.map((p: any) => ({
                class: p.class || p.predictedLabel || "",
                probability: p.probability ?? p.confidence ?? 0,
            }))
            : [];

    // ─── VİZYON VERİSİ ────────────────────────────────────────────────────────
    // payload.visual.predictions = 8 class [{class, probability}]
    const VISION_TO_NLP_MAP: Record<string, string> = {
        AMD: "Macular Degeneration",
        Diabetes: "Diabetic Retinopathy",
        Cataract: "Cataract",
        Glaucoma: "Glaucoma",
    };

    const rawVisionPredictions: any[] =
        Array.isArray(payload.visual?.predictions)
            ? payload.visual.predictions
            // Object ise entries'e çevir
            : Object.entries(payload.visual?.predictions || {}).map(([cls, prob]) => ({
                class: cls,
                probability: Number(prob),
            }));

    const visionDataArray = rawVisionPredictions.map((p: any) => {
        // probability bir obje mi yoksa number mı kontrol et
        const actualClass = typeof p.probability === "object" ? p.probability.class : p.class;
        const actualProb = typeof p.probability === "object" ? p.probability.probability : Number(p.probability);

        return {
            class: VISION_TO_NLP_MAP[actualClass] || actualClass,
            probability: Number(actualProb),
        };
    });

    // ─── RADAR CHART EKSENLERİ ────────────────────────────────────────────────
    const radarAxes = Array.from(
        new Set([
            ...nlpDataArray.map((d) => d.class),
            ...visionDataArray.map((d) => d.class),
        ])
    );

    const alignedNlpData = radarAxes.map((axis) => ({
        class: axis,
        probability: nlpDataArray.find((d) => d.class === axis)?.probability || 0,
    }));

    const alignedVisionData = radarAxes.map((axis) => ({
        class: axis,
        probability: visionDataArray.find((d) => d.class === axis)?.probability || 0,
    }));

    // ─── HEATMAP & GÖRSEL ─────────────────────────────────────────────────────
    const clinicalText = payload.text || "NO_SEQUENCE_DATA";
    const imageUrl = payload.imageUrl;

    // NLP word highlights → payload.highlight_zones [{word, importance}]
    const rawNlpHighlights: any[] = payload.highlight_zones || [];
    const nlpHighlightZones = rawNlpHighlights.map((e: any) => ({
        word: e.word || e.text || "",
        importance: e.importance ?? e.score ?? 0,
        text: e.word || e.text || "",
        score: e.importance ?? e.score ?? 0,
    }));

    // Visual highlights → payload.visual.highlight_zones
    const visualHighlightZones: any[] = payload.visual?.highlight_zones || [];

    // ─── CONSENSUS ENGINE ─────────────────────────────────────────────────────
    let consensusType: "SUCCESS" | "MEDIUM" | null = null;
    let consensusClass = "";

    if (isMultimodal) {
        const CRITICAL_DISEASES = [
            "Macular Degeneration",
            "Cataract",
            "Glaucoma",
            "Diabetic Retinopathy",
        ];

        for (const disease of CRITICAL_DISEASES) {
            const nlpVal =
                nlpDataArray.find((p) => p.class === disease)?.probability || 0;
            const visionVal =
                visionDataArray.find((p) => p.class === disease)?.probability || 0;

            if (nlpVal >= 0.5 && visionVal >= 0.5) {
                consensusType = "SUCCESS";
                consensusClass = disease;
                break;
            }
            if ((nlpVal >= 0.5 || visionVal >= 0.5) && !consensusType) {
                consensusType = "MEDIUM";
                consensusClass = disease;
            }
        }

        // NLP top prediction'dan da kontrol et (confidenceScores yoksa)
        if (!consensusType && nlpDataArray.length > 0) {
            const topNlp = nlpDataArray[0];
            if (topNlp.probability >= 0.5) {
                consensusType = "MEDIUM";
                consensusClass = topNlp.class;
            }
        }
    }

    // [DEBUG]
    console.log("payload", payload);
    console.log("nlpDataArray", nlpDataArray);
    console.log("visionDataArray", visionDataArray);
    console.log("nlpHighlightZones", nlpHighlightZones);
    console.log("visualHighlightZones", visualHighlightZones);
    console.log("consensusType", consensusType);
    console.log("consensusClass", consensusClass);
    console.log("visual raw:", JSON.stringify(payload.visual))

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <main
            className="min-h-screen bg-[#0A0A0A] text-foreground font-sans selection:bg-primary selection:text-black overflow-x-hidden"
            id="report-container"
        >
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-border/40 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/")}
                        className="hover:bg-primary/10 hover:text-primary transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-black font-mono tracking-tight uppercase leading-none">
                                DIAGNOSTIC_DECRYPT{" "}
                                <span className="text-muted-foreground ml-2">
                                    / {predictionId.substring(predictionId.length - 8)}
                                </span>
                            </h1>
                            {isMultimodal && (
                                <span className="px-2 py-0.5 text-[8px] font-black bg-primary text-black flex items-center gap-1 rounded-sm">
                                    <Activity className="w-2.5 h-2.5" /> MULTIMODAL_ACTIVE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <code className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">
                                LATENCY: {latency}ms
                            </code>
                            <code className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none underline decoration-primary/40 underline-offset-2">
                                SECURITY_CLEARANCE: LVL_4
                            </code>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {consensusType === "SUCCESS" && (
                        <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 font-mono text-[10px] font-bold animate-pulse flex items-center gap-2">
                            [ ! ] CROSS_MODEL_VALIDATION_SUCCESS:{" "}
                            {consensusClass.toUpperCase()}
                        </div>
                    )}
                    {consensusType === "MEDIUM" && (
                        <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-2">
                            [ ? ] MEDIUM_CONFIDENCE_CONSENSUS:{" "}
                            {consensusClass.toUpperCase()}
                        </div>
                    )}
                    <ExportUtility
                        targetElementId="report-container"
                        patientId={predictionId}
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-80px)] overflow-hidden">
                {/* ── SOL PANEL ── */}
                <section className="lg:col-span-8 h-full overflow-y-auto border-r border-border/30 p-6 space-y-8 custom-scrollbar">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* NLP Heatmap */}
                        <div className="space-y-4">
                            <header className="flex items-center gap-2 text-primary">
                                <BrainCircuit className="w-4 h-4" />
                                <h3 className="text-xs font-mono font-bold uppercase tracking-widest">
                                    Textual Evidence Mapping
                                </h3>
                            </header>
                            <EvidenceHeatmap
                                text={clinicalText}
                                explanations={nlpHighlightZones}
                            />
                        </div>

                        {/* Visual */}
                        <div className="space-y-4">
                            <header className="flex items-center gap-2 text-amber-400">
                                <ScanSearch className="w-4 h-4" />
                                <h3 className="text-xs font-mono font-bold uppercase tracking-widest">
                                    Retinal Landmark Visualization
                                </h3>
                            </header>
                            <VisualDiagnosticFeed
                                imageUrl={imageUrl}
                                highlights={visualHighlightZones}
                            />
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="pt-4 border-t border-border/20">
                        <header className="flex items-center gap-2 text-muted-foreground mb-6">
                            <Thermometer className="w-4 h-4" />
                            <h3 className="text-xs font-mono font-bold uppercase tracking-widest">
                                Cross-Correlation Matrix (NLP vs Vision)
                            </h3>
                        </header>
                        <DualRadarChart
                            nlpData={alignedNlpData}
                            visionData={alignedVisionData}
                        />
                    </div>
                </section>

                {/* ── SAĞ PANEL ── */}
                <aside className="lg:col-span-4 h-full bg-[#0F0F0F] p-6 space-y-6 overflow-y-auto custom-scrollbar shadow-2xl">
                    {/* Triage Level */}
                    <div className="space-y-2">
                        <header className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" /> System Triage Level
                        </header>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${consensusType === "SUCCESS"
                                    ? "bg-green-500 w-full"
                                    : consensusType === "MEDIUM"
                                        ? "bg-amber-500 w-2/3"
                                        : "bg-primary w-1/3"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Top Markers — vision data daha zengin olduğu için onu göster */}
                    <div className="bg-[#1A1A1A] border border-border/40 p-4">
                        <h4 className="text-[10px] font-mono text-muted-foreground uppercase mb-4 tracking-widest">
                            Top Aggregate Markers
                        </h4>
                        <div className="space-y-4">
                            {[...visionDataArray]
                                .sort((a, b) => b.probability - a.probability)
                                .slice(0, 4)
                                .map((p, idx) => (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-mono font-bold text-foreground">
                                                # {p.class.toUpperCase()}
                                            </span>
                                            <span className="text-[11px] font-mono text-primary">
                                                {Math.round(p.probability * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-1 bg-black rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary/40"
                                                style={{
                                                    width: `${p.probability * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Clinical Summary */}
                    <div className="p-4 border border-primary/20 bg-primary/5">
                        <h4 className="text-[10px] font-mono text-primary font-bold uppercase mb-2">
                            Automated Clinical Summary
                        </h4>
                        <p className="text-[11px] font-mono text-primary/80 leading-relaxed uppercase">
                            Analysis of sequence ID {predictionId.substring(0, 8)} indicates{" "}
                            {consensusType === "SUCCESS"
                                ? "Strong Validation"
                                : consensusType === "MEDIUM"
                                    ? "Moderate Correlation"
                                    : "Inconclusive Signal"}{" "}
                            across {isMultimodal ? "Dual" : "Single"} input vectors.
                            {consensusType === "SUCCESS" &&
                                ` High-certainty detection of ${consensusClass} confirmed.`}
                            {consensusType === "MEDIUM" &&
                                ` Probable detection of ${consensusClass}.`}
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}