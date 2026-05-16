"use client";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ExportUtilityProps {
    targetElementId: string;
    patientId: string;
}

export function ExportUtility({ patientId }: ExportUtilityProps) {
    const [copied, setCopied] = useState(false);

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
                >
                    {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                    {copied ? 'ÖZET KOPYALANDI' : 'ÖZETİ KOPYALA'}
                </Button>
            </div>
        </div>
    );
}
