"use client";

import { useState, useEffect } from "react";
import { VisualHighlight } from "@/services/api";
import { AlertCircle, Image as ImageIcon, Layers } from "lucide-react";

interface VisualDiagnosticFeedProps {
    imageUrl: string | null;
    highlights: VisualHighlight[];
    className?: string;
}

export function VisualDiagnosticFeed({ imageUrl, highlights, className = "" }: VisualDiagnosticFeedProps) {
    const [opacity, setOpacity] = useState(0.6);
    const [imgError, setImgError] = useState(false);
    const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:5000";
    const fullImageUrl = imageUrl ? (imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`) : null;

    useEffect(() => {
        // [GRAD_CAM_INTEGRITY_CHECK]
        if (highlights && highlights.length > 0) {
            highlights.forEach((h, idx) => {
                const b64 = h.heatmap_base64;
                if (!b64 || !b64.startsWith("data:image")) {
                    console.warn(`[GRAD_CAM_INTEGRITY_CHECK] Malformed Base64 detected at index ${idx} for class ${h.disease_class}`);
                } else {
                    console.log(`[GRAD_CAM_INTEGRITY_CHECK] Valid heatmap found for ${h.disease_class}`);
                }
            });
        }
    }, [highlights]);

    if (!imageUrl || imgError) {
        return (
            <div className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border/40 bg-muted/10 ${className}`}>
                <AlertCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                    {imgError ? "ASSET_ROUTING_FAILURE: Check Server Logs" : "NO_IMAGE_DATA_AVAILABLE"}
                </p>
            </div>
        );
    }

    const currentHighlight = highlights[activeHighlightIndex];

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="relative aspect-square bg-black border border-border/50 overflow-hidden group">
                {/* Base Fundus Image */}
                <img
                    src={fullImageUrl!}
                    alt="Patient Fundus"
                    className="absolute inset-0 w-full h-full object-contain"
                    onError={() => {
                        console.error(`[ASSET_ROUTING_VALIDATION] Failed to load image from: ${fullImageUrl}`);
                        setImgError(true);
                    }}
                    onLoad={() => console.log(`[ASSET_ROUTING_VALIDATION] successfully loaded: ${fullImageUrl}`)}
                />

                {/* Grad-CAM Heatmap Overlay */}
                {currentHighlight && (
                    <img
                        src={currentHighlight.heatmap_base64.startsWith("data:image")
                            ? currentHighlight.heatmap_base64
                            : `data:image/jpeg;base64,${currentHighlight.heatmap_base64}`}
                        alt={`Grad-CAM ${currentHighlight.disease_class}`}
                        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 pointer-events-none"
                        style={{ opacity: opacity }}
                    />
                )}

                {/* Overlays / UI */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/80 backdrop-blur-md border border-primary/30 p-2 text-[10px] font-mono text-primary uppercase">
                        MODE: {currentHighlight ? `XAI_OVERLAY (${currentHighlight.disease_class})` : "NATIVE_VIEW"}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-card border border-border/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Heatmap Intensity
                    </label>
                    <span className="text-xs font-mono text-primary font-bold">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />

                {highlights.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-border/30">
                        <p className="text-[9px] font-mono text-muted-foreground uppercase">Diagnostic Layers</p>
                        <div className="flex flex-wrap gap-2">
                            {highlights.map((h, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveHighlightIndex(idx)}
                                    className={`px-2 py-1 text-[9px] font-mono border transition-all ${activeHighlightIndex === idx
                                        ? "bg-primary/20 border-primary text-primary"
                                        : "border-border hover:border-primary/50 text-muted-foreground"
                                        }`}
                                >
                                    {h.disease_class}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
