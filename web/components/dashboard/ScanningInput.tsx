"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, ScanLine } from "lucide-react";

interface ScanningInputProps {
    onSubmit: (text: string) => Promise<void>;
    isLoading: boolean;
}

export function ScanningInput({ onSubmit, isLoading }: ScanningInputProps) {
    const [text, setText] = useState("");

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit(text);
    };

    return (
        <div className="relative flex flex-col h-full w-full rounded-none border border-border bg-background p-4 shadow-sm md:p-6 lg:p-8">
            <div className="flex items-center space-x-2 border-b border-border/50 pb-4 mb-4">
                <ScanLine className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-mono font-semibold text-foreground">
                    Clinical Notes Input Vector
                </h2>
            </div>

            <div className="relative flex-grow">
                <textarea
                    className="h-full w-full resize-none bg-transparent font-mono text-sm text-foreground/90 placeholder:text-muted-foreground outline-none border-none p-0 focus:ring-0"
                    placeholder="Paste unstructured clinical notes here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={isLoading}
                />

                {/* Laser Scan Animation overlay */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ top: "0%" }}
                            animate={{ top: "100%" }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute left-0 w-full h-[2px] bg-primary shadow-[0_0_10px_2px_rgba(0,240,255,0.5)] z-10 pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 flex justify-end pt-4 border-t border-border/50">
                <Button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isLoading}
                    className="rounded-none bg-primary text-primary-foreground hover:bg-primary/80 font-mono font-bold w-full sm:w-auto min-w-[200px] transition-colors"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ANALYZING SEQUENCE...
                        </>
                    ) : (
                        "INITIATE ANALYSIS [ENTER]"
                    )}
                </Button>
            </div>
        </div>
    );
}
