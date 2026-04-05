"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanningInput } from "@/components/dashboard/ScanningInput";
import { submitClinicalNote } from "@/services/api";
import { Activity, Wifi, LogOut, History, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const handleSubmit = async (text: string, file: File | null) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      // Ensure text is never truly empty to simplify AI logic
      const safeText = text.trim() || "System: Clinically Empty (Multimodal Only)";
      formData.append("text", safeText);
      
      // Only append if file exists to satisfy Multer boundaries (omit key entirely otherwise)
      if (file) {
        formData.append("image", file);
      }

      const response = await submitClinicalNote(formData);
      setLastLatency(response.latency_ms || null);

      // Stash response for the analysis view
      sessionStorage.setItem(`inference_${response.id}`, JSON.stringify(response));
      router.push(`/analysis/${response.id}`);
    } catch (error) {
      console.error("ANALYSIS_SUBMISSION_FAILED:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* Top Navigation / Mission Control Banner */}
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 bg-card">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-mono tracking-wider">CLINICA_EYE <span className="text-muted-foreground font-light">| SYS_DASHBOARD</span></h1>
        </div>
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/history" className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center space-x-1 transition-colors">
              <History className="h-3 w-3" />
              <span>ARCHIVE</span>
            </Link>
            <Link href="/profile" className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center space-x-1 transition-colors">
              <User className="h-3 w-3" />
              <span>PROFILE</span>
            </Link>
          </nav>
          <div className="h-4 w-[1px] bg-border/50 hidden md:block" />
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-muted-foreground uppercase">{user?.email}</span>
            <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Split Layout on Desktop/Tablet Landscape */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 max-w-[1600px] mx-auto w-full">

        {/* Left/Main Column - Input Vector */}
        <section className="flex-1 min-h-[500px] flex flex-col">
          <ScanningInput onSubmit={handleSubmit} isLoading={isLoading} />
        </section>

        {/* Right/Bottom Column - Telemetry & Status */}
        <aside className="w-full lg:w-80 flex flex-col space-y-4">
          <div className="border border-border p-4 bg-card h-full lg:min-h-[500px]">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2 mb-4">
              System Telemetry
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">API CONNECT</span>
                <div className="flex items-center space-x-2 text-primary">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs font-mono">SECURE</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">INFERENCE SLA</span>
                <span className="text-xs font-mono text-green-400">&lt; 2.0s</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">LAST LATENCY</span>
                <span className="text-xs font-mono text-foreground">
                  {lastLatency ? `${lastLatency}ms` : '---'}
                </span>
              </div>

              <div className="mt-8 pt-4 border-t border-border/50">
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                  Awaiting clinical input. Ensure PHI is de-identified before submission per security protocols.
                </p>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}
