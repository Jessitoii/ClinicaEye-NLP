"use client";

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { PredictionResult } from "@/services/api";
import { useMemo } from "react";

interface DualRadarChartProps {
    nlpData: PredictionResult[];
    visionData?: PredictionResult[];
}

export function DualRadarChart({ nlpData = [], visionData = [] }: DualRadarChartProps) {
    
    const radarData = useMemo(() => {
        // Data provided by page.tsx is already aligned. nlpData and visionData have identical classes.
        return nlpData.map((nlpItem, index) => {
            const visionItem = visionData?.[index];
            return {
                subject: nlpItem.class.toUpperCase(),
                NLP: Math.round(nlpItem.probability * 100),
                Vision: visionItem ? Math.round(visionItem.probability * 100) : 0,
                fullMark: 100,
            };
        });
    }, [nlpData, visionData]);

    if (radarData.length === 0) return null;

    return (
        <div className="w-full h-[450px] relative bg-card border border-border/50 p-6 flex flex-col">
            <header className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    DUAL_MODEL_SPECTRUM
                </h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">NLP_CONFIDENCE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#FFB020]" />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">VISION_CONFIDENCE</span>
                    </div>
                </div>
            </header>
            
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#333333" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "monospace", width: 120 }}
                    />
                    <Radar
                        name="NLP Analysis"
                        dataKey="NLP"
                        stroke="#00F0FF"
                        fill="#00F0FF"
                        fillOpacity={0.2}
                    />
                    <Radar
                        name="Vision Analysis"
                        dataKey="Vision"
                        stroke="#FFB020"
                        fill="#FFB020"
                        fillOpacity={0.2}
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: "rgba(10, 10, 10, 0.9)", 
                            borderColor: "#333333", 
                            color: "#FFFFFF",
                            borderRadius: "0px",
                            fontFamily: "monospace"
                        }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
