"use client";

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import { PredictionResult } from "@/services/api";

interface HybridChartProps {
    data?: PredictionResult[];
}

export function HybridChart({ data = [] }: HybridChartProps) {
    // Safety check for empty or undefined data
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center border border-border/50 bg-muted/5 p-8 text-center">
                <div className="p-4 rounded-full bg-muted/20 mb-4">
                    <BarChart className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                    Telemetry Inactive
                </h3>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase font-mono tracking-tighter">
                    Waiting for pathology mapping vectors...
                </p>
            </div>
        );
    }

    // Radar data requires specific formatting
    const radarData = data.map((d) => ({
        subject: d.class,
        A: Math.round(d.probability * 100),
        fullMark: 100,
    }));

    // Top 3 for the bar chart
    const top3Data = [...data]
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3)
        .map((d) => ({
            name: d.class,
            prob: Math.round(d.probability * 100),
            fill: d.probability > 0.8 ? "#FF3333" : d.probability > 0.4 ? "#FFB020" : "#00F0FF",
        }));

    return (
        <div className="flex flex-col xl:flex-row gap-8 w-full h-[400px]">
            {/* Radar Chart Section */}
            <div className="flex-1 bg-card border border-border/50 p-4 relative">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest absolute top-4 left-4 z-10">
                    Probability Matrix
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#333333" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "monospace" }}
                        />
                        <Radar
                            name="Probability"
                            dataKey="A"
                            stroke="#00F0FF"
                            fill="#00F0FF"
                            fillOpacity={0.3}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#111111", borderColor: "#333333", color: "#00F0FF" }}
                            itemStyle={{ color: "#ffffff" }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Top 3 Bar Chart Section */}
            <div className="w-full xl:w-96 bg-card border border-border/50 p-4 relative flex flex-col justify-center">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest absolute top-4 left-4 z-10">
                    Top 3 Diagnoses
                </h3>
                <div className="mt-8 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={top3Data}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#FFFFFF", fontSize: 12, width: 120 }}
                                width={120}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: "#1A1A1A", borderColor: "#333333", color: "#FFFFFF" }}
                            />
                            <Bar
                                dataKey="prob"
                                radius={[0, 4, 4, 0]}
                                barSize={30}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
