import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, ScanLine, Image as ImageIcon, X } from "lucide-react";

interface ScanningInputProps {
    onSubmit: (text: string, file: File | null) => Promise<void>;
    isLoading: boolean;
}

export function ScanningInput({ onSubmit, isLoading }: ScanningInputProps) {
    const [text, setText] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = () => {
        if (!text.trim() && !selectedFile) return;
        onSubmit(text, selectedFile);
    };

    return (
        <div className="relative flex flex-col h-full w-full rounded-none border border-border bg-background p-4 shadow-sm md:p-6 lg:p-8">
            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-mono font-semibold text-foreground">
                        Clinical Notes Input Vector
                    </h2>
                </div>
                
                {/* Image Upload Trigger */}
                <div className="flex items-center space-x-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-none font-mono text-[10px] border-primary/40 text-primary hover:bg-primary/10 transition-colors h-7 px-3"
                    >
                        <ImageIcon className="mr-1.5 h-3 w-3" />
                        UPLOAD_FUNDUS_IMG
                    </Button>
                </div>
            </div>

            <div className="relative flex-grow min-h-[250px]">
                <textarea
                    className="h-full w-full resize-none bg-transparent font-mono text-sm text-foreground/90 placeholder:text-muted-foreground outline-none border-none p-0 focus:ring-0"
                    placeholder="Paste unstructured clinical notes here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={isLoading}
                />

                {/* Selected File Badge */}
                <AnimatePresence>
                    {selectedFile && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-2 left-2 bg-primary/10 border border-primary/50 px-2 py-1 flex items-center space-x-2"
                        >
                            <span className="text-[10px] font-mono text-primary font-bold">
                                IMG: {selectedFile.name.toUpperCase()}
                            </span>
                            <button onClick={removeFile} className="text-primary hover:text-white transition-colors">
                                <X className="h-3 w-3" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                    disabled={(!text.trim() && !selectedFile) || isLoading}
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
