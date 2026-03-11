"use client";

import React, { useState } from "react";
import { HighlightZone } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";

interface EvidenceHeatmapProps {
    text: string;
    explanations: HighlightZone[];
}

/**
 * EvidenceHeatmap Component
 * Implements a high-fidelity visualization of AI decision-making.
 * Uses a primary Teal/Cyan color scale for word-level importance scoring.
 */
export const EvidenceHeatmap: React.FC<EvidenceHeatmapProps> = ({ text, explanations }) => {
    // Diagnostic Audit: Ensure XAI vectors are crossing the bridge from backend to UI
    console.log("XAI_EVIDENCE_PAYLOAD_AUDIT:", { 
        tokenCount: explanations.length, 
        hasHighValue: explanations.some(e => e.importance > 0.5),
        sample: explanations.slice(0, 3) 
    });

    if (!text) {
        return (
            <div className="h-48 flex items-center justify-center border border-dashed border-primary/20 bg-muted/5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                ERR_NO_DATA: Input sequence empty.
            </div>
        );
    }

    // Split text into tokens, capturing whitespace to preserve original formatting
    // This prevents the common "string collapsing" issue by rendering spaces as explicit spans
    const tokens = text.split(/(\s+)/);

    // Subword aware importance retriever
    const getImportance = (token: string) => {
        const clean = token.trim().toLowerCase().replace(/[.,!?;:]/g, "");
        if (!clean) return 0;
        
        // Exact token mapping from AI Service
        const match = explanations.find(e => {
            const expWord = e.word.toLowerCase();
            return clean === expWord || expWord.replace("##", "") === clean;
        });
        
        return match ? match.importance : 0;
    };

    return (
        <section className="bg-[#050505] border border-border/40 p-6 shadow-2xl relative overflow-hidden group">
            {/* Mission Control Scanning Aesthetic */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/30 animate-scan pointer-events-none z-10" />
            
            <header className="flex justify-between items-center mb-6 border-b border-primary/10 pb-2">
                <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                    <h3 className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.25em]">
                        Evidence_Attribution_Heatmap
                    </h3>
                </div>
                <div className="text-[8px] font-mono text-muted-foreground uppercase opacity-50">
                    Neural_Response: Validated
                </div>
            </header>

            {/* Core Visualization Container */}
            <div className="relative font-mono text-sm leading-[1.8] whitespace-pre-wrap min-h-[200px] text-foreground/90 selection:bg-primary/30 z-20">
                {tokens.map((token, idx) => {
                    const rawImportance = getImportance(token);
                    return (
                        <HeatmapToken 
                            key={idx} 
                            token={token} 
                            importance={rawImportance} 
                        />
                    );
                })}
            </div>

            {/* Bottom Info Bar */}
            <footer className="mt-8 pt-4 border-t border-border/20 flex justify-between items-center">
                <div className="flex space-x-4 text-[8px] font-mono uppercase text-muted-foreground">
                    <span>Alpha: BioBERT_XAI</span>
                    <span>Tokens: {tokens.length}</span>
                </div>
                <div className="text-[8px] font-mono text-primary/60">
                    {explanations.length > 0 ? "STREAM_SYNCHRONIZED" : "ATTRIBUTIONS_MISSING"}
                </div>
            </footer>
        </section>
    );
};

interface HeatmapTokenProps {
    token: string;
    importance: number;
}

const HeatmapToken: React.FC<HeatmapTokenProps> = ({ token, importance }) => {
    const [isHovered, setIsHovered] = useState(false);

    // If no importance score, render plain text
    if (importance < 0.005) {
        return <span className="inline">{token}</span>;
    }

    // Phase 3 Scaling: Use Non-Linear Scaling to ensure visibility of medical evidence
    // We use power scaling to pull lower scores into a more visible range
    const amplifiedScore = Math.min(1, Math.pow(importance, 0.4));
    
    // Readability Logic
    const textColorClass = amplifiedScore > 0.4 ? "text-black" : "text-white";
    
    return (
        <span 
            className="relative inline-block z-30"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.span
                whileHover={{ scale: 1.05 }}
                className={`px-0.5 rounded-none font-bold transition-all cursor-help border border-transparent hover:border-primary/50 ${textColorClass}`}
                style={{ 
                    backgroundColor: `rgba(0, 240, 255, ${amplifiedScore})`,
                    boxShadow: amplifiedScore > 0.7 ? `0 0 10px rgba(0, 240, 255, 0.3)` : 'none'
                }}
            >
                {token}
            </motion.span>

            {/* Interactive Tooltip using Framer Motion */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 2 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 pointer-events-none"
                    >
                        <div className="bg-[#000000] border border-primary text-[10px] px-3 py-1.5 min-w-[140px] shadow-[0_0_20px_rgba(0,240,255,0.4)] relative">
                            {/* Little tooltip arrow */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-primary" />
                            
                            <div className="flex flex-col space-y-1">
                                <div className="flex justify-between items-center border-b border-primary/20 pb-1">
                                    <span className="text-primary font-bold uppercase tracking-widest text-[7px]">Attribution</span>
                                    <span className="text-white/[0.5] font-mono text-[7px]">VECTOR</span>
                                </div>
                                <div className="text-white font-mono text-[9px] leading-tight">
                                    <p>Raw: {importance.toFixed(4)}</p>
                                    <p className="text-primary font-bold">Heat: {amplifiedScore.toFixed(3)}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
};
