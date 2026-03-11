"use client";

import { Button } from "@/components/ui/button";
import { Download, Copy, Check, Activity, ShieldCheck, FileText, BarChart3, Info, ShieldAlert } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { exportPdfServerSide } from "@/services/api";

interface ExportUtilityProps {
    targetElementId: string;
    patientId: string;
}

export function ExportUtility({ patientId }: ExportUtilityProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [exportStatus, setExportStatus] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportData, setExportData] = useState<any>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Force hex-only colors for PDF capture (html2canvas compat with Shadcn/Tailwind)
    const COLORS = {
        BG_DEEP: "#0A0A0A",
        PRIMARY: "#00F0FF",
        BORDER: "#333333",
        TEXT_DIM: "#A1A1AA",
        TEXT_BRIGHT: "#FFFFFF",
        BAR_BG: "#1A1A1A",
        SUCCESS: "#4ADE80"
    };

    useEffect(() => {
        if (exportError) {
            const timer = setTimeout(() => setExportError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [exportError]);

    const handleExportPDF = async () => {
        setIsExporting(true);
        setExportError(null);
        setExportStatus("FETCHING_SECURE_DATA...");

        if (!patientId || patientId === "undefined") {
            setExportError("ERR_PROTOCOL: Analysis Sequence ID Missing.");
            setIsExporting(false);
            return;
        }

        try {
            setExportStatus("Authenticating PDF Engine...");
            const token = localStorage.getItem("jwt") || '';
            const blob = await exportPdfServerSide(patientId, token);

            // Construct Download Link from Blob Sequence
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ClinicaEye_Diagnostics_${patientId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setExportStatus("EXPORT_SUCCESS_READY");
        } catch (error: any) {
            console.error("ANALYSIS_EXPORT_FAILED:", error);
            setExportError(error.message || "ERR_EXPORT_FAILURE: Check connection/auth.");
        } finally {
            setTimeout(() => {
                setIsExporting(false);
                setExportData(null);
                setExportStatus(null);
            }, 500);
        }
    };

    const handleCopyClipboard = () => {
        const summaryText = `CLINICAEYE_NLP_REPORT\nID: ${patientId}\nSTATUS: VERIFIED_EXPORT\nDATE: ${new Date().toISOString()}`;
        navigator.clipboard.writeText(summaryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-4">
                <Button
                    variant="outline"
                    className="font-mono text-[10px] rounded-none border-border hover:bg-primary/5 h-9"
                    onClick={handleCopyClipboard}
                    disabled={isExporting}
                >
                    {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                    {copied ? 'COPIED_HASH' : 'COPY_SUMMARY'}
                </Button>

                <Button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="font-mono text-[10px] rounded-none bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-6 font-bold tracking-widest"
                >
                    {isExporting ? (
                        <>
                            <Activity className="w-3.5 h-3.5 mr-2 animate-spin" />
                            {exportStatus || "GENERATING_OFFICIAL_REPORT..."}
                        </>
                    ) : (
                        <>
                            <Download className="w-3.5 h-3.5 mr-2" />
                            EXPORT_OFFICIAL_REPORT
                        </>
                    )}
                </Button>
            </div>

            {exportError && (
                <div className="bg-destructive/10 border border-destructive/50 p-2 flex items-center space-x-2 animate-in fade-in slide-in-from-top-1">
                    <ShieldAlert className="h-3 w-3 text-destructive" />
                    <span className="text-[9px] font-mono text-destructive uppercase font-bold">{exportError}</span>
                </div>
            )}

            {/* Hard-Mounted Export Template Wrapper */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', visibility: 'hidden' }}>
                <div
                    ref={reportRef}
                    data-report-template="true"
                    style={{
                        backgroundColor: COLORS.BG_DEEP,
                        color: COLORS.TEXT_BRIGHT,
                        width: '800px',
                        padding: '48px',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        boxSizing: 'border-box'
                    }}
                >
                    {exportData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            {/* Branded Header */}
                            <div style={{ borderColor: COLORS.PRIMARY, borderBottomWidth: '2px', borderBottomStyle: 'solid', paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ borderColor: COLORS.PRIMARY, backgroundColor: "#1A1A1A", borderStyle: 'solid', borderWidth: '1px', padding: '12px' }}>
                                        <Activity style={{ color: COLORS.PRIMARY, height: '32px', width: '32px' }} />
                                    </div>
                                    <div>
                                        <h1 style={{ color: COLORS.TEXT_BRIGHT, margin: 0, fontSize: '30px', fontWeight: 'bold', letterSpacing: '-0.05em' }}>CLINICA_EYE NLP</h1>
                                        <p style={{ color: COLORS.PRIMARY, margin: 0, fontSize: '12px', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 'bold' }}>Official Analysis Report</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: COLORS.TEXT_DIM, margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Authenticity Key</p>
                                    <p style={{ color: COLORS.PRIMARY, margin: 0, fontSize: '12px', fontWeight: 'bold' }}>{exportData.authenticityKey}</p>
                                </div>
                            </div>

                            {/* Section 1: Session Metadata */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div style={{ borderColor: COLORS.BORDER, backgroundColor: "#111111", borderStyle: 'solid', borderWidth: '1px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ color: COLORS.PRIMARY, borderColor: COLORS.PRIMARY, borderBottomWidth: '1px', borderBottomStyle: 'solid', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShieldCheck style={{ width: '16px', height: '16px' }} />
                                        <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Clinician Context</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p style={{ color: COLORS.TEXT_DIM, margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Authorized Doctor ID</p>
                                        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{exportData.doctorId}</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p style={{ color: COLORS.TEXT_DIM, margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Generation Time</p>
                                        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{new Date(exportData.generatedAt).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div style={{ borderColor: COLORS.BORDER, backgroundColor: "#111111", borderStyle: 'solid', borderWidth: '1px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ color: COLORS.PRIMARY, borderColor: COLORS.PRIMARY, borderBottomWidth: '1px', borderBottomStyle: 'solid', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText style={{ width: '16px', height: '16px' }} />
                                        <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Patient Ledger</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p style={{ color: COLORS.TEXT_DIM, margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Note ID</p>
                                        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{exportData.id}</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <p style={{ color: COLORS.TEXT_DIM, margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Data Source</p>
                                        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>{exportData.source || "SECURE_DIRECT_INPUT"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Clinical Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ color: COLORS.PRIMARY, borderColor: COLORS.PRIMARY, borderBottomWidth: '1px', borderBottomStyle: 'solid', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', width: 'max-content' }}>
                                    <Info style={{ width: '16px', height: '16px' }} />
                                    <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Clinical Input Analysis</h2>
                                </div>
                                <div style={{ borderColor: COLORS.BORDER, borderLeftColor: COLORS.PRIMARY, borderLeftWidth: '4px', borderLeftStyle: 'solid', backgroundColor: "#050505", padding: '24px', borderTopWidth: '1px', borderTopStyle: 'solid', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderRightWidth: '1px', borderRightStyle: 'solid', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                                    {exportData.rawText}
                                </div>
                            </div>

                            {/* Section 3: AI Results */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ color: COLORS.PRIMARY, borderColor: COLORS.PRIMARY, borderBottomWidth: '1px', borderBottomStyle: 'solid', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', width: 'max-content' }}>
                                    <BarChart3 style={{ width: '16px', height: '16px' }} />
                                    <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>AI Inference Diagnostics</h2>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {exportData.predictions?.map((pred: any, i: number) => (
                                        <div key={i} style={{ borderColor: COLORS.BORDER, backgroundColor: COLORS.BAR_BG, borderStyle: 'solid', borderWidth: '1px', padding: '16px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div
                                                style={{ backgroundColor: `${COLORS.PRIMARY}33`, width: `${Math.round((Object.values(exportData.confidenceScores || {})[i] as number || 0) * 100)}%`, position: 'absolute', left: 0, top: 0, height: '100%', transition: 'none' }}
                                            />
                                            <div style={{ position: 'relative', zIndex: 10, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>{pred.class}</div>
                                            <div style={{ color: COLORS.PRIMARY, position: 'relative', zIndex: 10, fontWeight: 'bold' }}>
                                                {Math.round((Object.values(exportData.confidenceScores || {})[i] as number || 0) * 100)}%
                                            </div>
                                        </div>
                                    ))}
                                    {(!exportData.predictions || exportData.predictions.length === 0) && (
                                        <div style={{ borderColor: "#22C55E", backgroundColor: "#06200A", color: "#4ADE80", borderStyle: 'solid', borderWidth: '1px', padding: '16px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                            NOMINAL_STATUS: No Pathologies Above Threshold Detected
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ borderTopColor: COLORS.BORDER, borderTopWidth: '1px', borderTopStyle: 'solid', marginTop: 'auto', paddingTop: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ color: COLORS.TEXT_DIM, margin: 0, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                                    Verified AI Clinical Report • ClinicaEye BioBERT-V1 Engine
                                </p>
                                <p style={{ color: COLORS.TEXT_DIM, opacity: 0.5, margin: 0, fontSize: '8px' }}>
                                    SHA256_INTEGRITY: {exportData.authenticityKey}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ color: COLORS.PRIMARY, margin: 0 }}>PRINTER_STANDBY_CONNECTED</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
