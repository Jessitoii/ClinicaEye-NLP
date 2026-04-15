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
                {/* Form header left side */}
            </div>

            <div className="flex flex-col md:flex-row gap-6 border-b border-border/50 pb-4 mb-4">
                
                {/* Left Column: Text input area + Submit Button */}
                <div className="flex-1 flex flex-col min-h-[250px]">
                    <div className="relative flex-1 flex flex-col">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 block">
                            Clinical Notes / Observations
                        </span>
                        <textarea
                            className="flex-1 w-full min-h-[160px] resize-none bg-black/30 border border-border/50 font-mono text-sm text-foreground/90 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary p-4"
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
                                    className="absolute left-0 top-[28px] w-full h-[2px] bg-primary shadow-[0_0_10px_2px_rgba(0,240,255,0.5)] z-10 pointer-events-none"
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-4 flex flex-row justify-end">
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

                {/* Right Column: Image Dropzone / Upload area */}
                <div className="md:w-1/3 flex flex-col space-y-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                        Fundus Scan (Ocular)
                    </span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />

                    {!selectedFile ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-primary/30 flex flex-col items-center justify-center h-48 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors text-primary/80"
                        >
                            <ImageIcon className="h-8 w-8 mb-2 opacity-80" />
                            <span className="font-mono text-sm uppercase font-bold tracking-widest text-center px-4">
                                Click to Upload<br />Fundus Image
                            </span>
                        </div>
                    ) : (
                        <div className="relative border border-primary/50 h-48 flex items-center justify-center bg-black overflow-hidden group">
                            <img
                                src={URL.createObjectURL(selectedFile)}
                                alt="Fundus Preview"
                                className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute top-0 right-0 bg-black/80 backdrop-blur pb-1 pl-1">
                                <button onClick={removeFile} className="p-2 text-destructive hover:text-white transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur p-1">
                                <span className="text-[10px] font-mono text-primary font-bold px-1 truncate block">
                                    {selectedFile.name.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}