"use client";

import { useState } from "react";

interface AddDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
}

export default function AddDiagnosisModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
}: AddDiagnosisModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [codeText, setCodeText] = useState("");
  const [sctCode, setSctCode] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/epic/create-condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          codeText,
          sctCode: sctCode || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create diagnosis");
      }

      // Success
      setCodeText("");
      setSctCode("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-sm transition-all duration-300">
      <div 
        className="relative w-full max-w-md animate-[scaleIn_0.2s_ease-out] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Diagnosis</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50/50 px-6 py-3">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <form id="add-diagnosis-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Condition Name (Text) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                placeholder="e.g., Essential hypertension"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                SNOMED CT Code (Optional)
              </label>
              <input
                type="text"
                value={sctCode}
                onChange={(e) => setSctCode(e.target.value)}
                placeholder="e.g., 59621000"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-mono text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                If omitted, the condition will be created as text-only without a formal code system attached.
              </p>
            </div>
            
            <input type="hidden" value={patientId} />
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-diagnosis-form"
            disabled={loading || !codeText}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-light)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                Saving...
              </>
            ) : (
              "Save Diagnosis"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
