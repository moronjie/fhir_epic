"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AddPatientModal from "@/app/components/AddPatientModal";

interface PatientEntry {
  resource: {
    id: string;
    name?: Array<{
      family?: string;
      given?: string[];
      text?: string;
    }>;
    gender?: string;
    birthDate?: string;
    telecom?: Array<{
      system?: string;
      value?: string;
    }>;
  };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/epic/patients`);
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch patients");
      }
      const bundle = await res.json();
      const entries: PatientEntry[] = (bundle.entry || []).filter(
        (e: any) => e.resource?.resourceType === "Patient",
      );
      setPatients(entries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleCreateSuccess = () => {
    setSuccessToast(true);
    fetchPatients();
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const getPatientName = (entry: PatientEntry) => {
    const name = entry.resource.name?.[0];
    if (!name) return "Unknown";
    if (name.text) return name.text;
    const given = name.given?.join(" ") || "";
    const family = name.family || "";
    return `${given} ${family}`.trim() || "Unknown";
  };

  const getPatientPhone = (entry: PatientEntry) => {
    const phone = entry.resource.telecom?.find((t) => t.system === "phone");
    return phone?.value || "—";
  };

  // Client-side filter
  const filtered = patients.filter((p) => {
    if (!searchQuery) return true;
    const name = getPatientName(p).toLowerCase();
    const id = p.resource.id?.toLowerCase() || "";
    const q = searchQuery.toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  return (
    <>
      {/* Success toast */}
      {successToast && (
        <div className="toast-enter fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Patient created successfully
        </div>
      )}

      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Patients
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Browse and manage patient records from Epic FHIR
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          id="add-patient-btn"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-light)] hover:shadow-md active:scale-[0.97]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Patient
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID…"
            id="patient-search-input"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <div className="skeleton h-4 w-32" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-[var(--color-border)] px-6 py-4 last:border-b-0"
            >
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-lg font-semibold text-red-700">
            Failed to load patients
          </p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
          <button
            onClick={() => fetchPatients()}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 opacity-40"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="17" y1="11" x2="23" y2="11" />
          </svg>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">
            No patients found
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {searchQuery
              ? "Try adjusting your search query"
              : "Create your first patient to get started"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Table header */}
          <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-hover)] px-6 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
            <span className="col-span-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Patient
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Gender
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Birth Date
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Phone
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              FHIR ID
            </span>
          </div>

          {/* Rows */}
          {filtered.map((entry) => {
            const name = getPatientName(entry);
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const colors = [
              "bg-indigo-100 text-indigo-700",
              "bg-cyan-100 text-cyan-700",
              "bg-emerald-100 text-emerald-700",
              "bg-amber-100 text-amber-700",
              "bg-rose-100 text-rose-700",
              "bg-violet-100 text-violet-700",
            ];
            const colorIndex =
              (entry.resource.id?.charCodeAt(0) || 0) % colors.length;

            return (
              <Link
                href={`/dashboard/patients/${entry.resource.id}`}
                key={entry.resource.id}
                className="group flex flex-col gap-2 border-b border-[var(--color-border)] px-6 py-4 transition-colors last:border-b-0 hover:bg-[var(--color-surface-hover)] sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 block"
              >
                {/* Patient name + avatar */}
                <div className="col-span-4 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colors[colorIndex]}`}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {name}
                    </p>
                  </div>
                </div>

                {/* Gender */}
                <div className="col-span-2">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-surface-hover)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--color-text-secondary)]">
                    {entry.resource.gender || "Unknown"}
                  </span>
                </div>

                {/* Birth Date */}
                <div className="col-span-2">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {entry.resource.birthDate || "—"}
                  </span>
                </div>

                {/* Phone */}
                <div className="col-span-2">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {getPatientPhone(entry)}
                  </span>
                </div>

                {/* FHIR ID */}
                <div className="col-span-2">
                  <span className="font-mono text-xs text-[var(--color-text-secondary)] opacity-60 transition-opacity group-hover:opacity-100">
                    {entry.resource.id}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Footer */}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-hover)] px-6 py-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Showing {filtered.length} of {patients.length} patients
            </p>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
