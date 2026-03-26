"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import AddDiagnosisModal from "@/app/components/AddDiagnosisModal";

interface PatientEntry {
  resourceType: string;
  id: string;
  name?: Array<{ family?: string; given?: string[]; text?: string }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system?: string; value?: string }>;
  address?: Array<{ line?: string[]; city?: string; state?: string; postalCode?: string }>;
}

export default function PatientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const patientId = unwrappedParams.id;
  
  const [patient, setPatient] = useState<PatientEntry | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const fetchPatientData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Patient Details
      const pRes = await fetch(`/api/v1/epic/get-patient?id=${patientId}`);
      if (pRes.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!pRes.ok) throw new Error("Failed to load patient details");
      const pData = await pRes.json();
      setPatient(pData);

      // Fetch Clinical Data in parallel
      const [aptRes, condRes, repRes] = await Promise.all([
        fetch(`/api/v1/epic/get-appointments?patient=${patientId}`),
        fetch(`/api/v1/epic/get-conditions?patient=${patientId}&category=problem-list-item`),
        fetch(`/api/v1/epic/get-reports?patient=${patientId}`)
      ]);

      if (aptRes.ok) {
        const aptData = await aptRes.json();
        setAppointments((aptData.entry || []).map((e: any) => e.resource));
      }
      if (condRes.ok) {
        const condData = await condRes.json();
        setConditions((condData.entry || []).map((e: any) => e.resource));
      }
      if (repRes.ok) {
        const repData = await repRes.json();
        setReports((repData.entry || []).map((e: any) => e.resource));
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  const handleDiagnosisSuccess = () => {
    setSuccessToast("Diagnosis added successfully!");
    fetchPatientData();
    setTimeout(() => setSuccessToast(""), 3000);
  };

  const getPatientName = (p: PatientEntry | null) => {
    if (!p) return "Unknown";
    const name = p.name?.[0];
    if (!name) return "Unknown";
    if (name.text) return name.text;
    const given = name.given?.join(" ") || "";
    const family = name.family || "";
    return `${given} ${family}`.trim() || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
        <p className="text-lg font-semibold text-red-700">Failed to load patient data</p>
        <p className="mt-1 text-sm text-red-500">{error || "Patient not found"}</p>
        <Link href="/dashboard/patients" className="mt-4 text-sm font-medium text-[var(--color-primary)] hover:underline">
          &larr; Back to Patients
        </Link>
      </div>
    );
  }

  const name = getPatientName(patient);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {successToast && (
        <div className="toast-enter fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successToast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="font-mono text-xs opacity-70">ID: {patient.id}</span>
              <span>&bull;</span>
              <span className="capitalize">{patient.gender || "Unknown"}</span>
              <span>&bull;</span>
              <span>DOB: {patient.birthDate || "—"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-[var(--color-border)]">
        <nav className="-mb-px flex space-x-8">
          {["overview", "appointments", "diagnoses", "reports"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Contact Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Phone</p>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                  {patient.telecom?.find(t => t.system === "phone")?.value || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Address</p>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                  {patient.address?.[0]?.line?.[0] || "—"}
                  {patient.address?.[0]?.city ? `, ${patient.address[0].city}` : ""}
                  {patient.address?.[0]?.state ? `, ${patient.address[0].state}` : ""}
                  {patient.address?.[0]?.postalCode ? ` ${patient.address[0].postalCode}` : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === "appointments" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Appointments</h3>
            </div>
            {appointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No appointments found.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {appointments.map((apt, i) => (
                  <div key={i} className="py-4">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {apt.description || apt.appointmentType?.text || "General Appointment"}
                    </p>
                    <div className="mt-1 flex gap-4 text-sm text-[var(--color-text-secondary)]">
                      <span>Status: <strong className="capitalize font-medium text-[var(--color-text-primary)]">{apt.status}</strong></span>
                      {apt.start && <span>Date: {new Date(apt.start).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DIAGNOSES TAB */}
        {activeTab === "diagnoses" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Documented Conditions</h3>
              <button
                onClick={() => setDiagnosisModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm transition-all hover:bg-[var(--color-border)] active:scale-[0.97]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Diagnosis
              </button>
            </div>
            {conditions.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No diagnoses found on file.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {conditions.map((cond, i) => (
                  <div key={i} className="py-4 flex justify-between items-start">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {cond.code?.text || cond.code?.coding?.[0]?.display || "Unknown Condition"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)] font-mono opacity-75">
                        {cond.code?.coding?.[0]?.code ? `SCT: ${cond.code.coding[0].code}` : "No code"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <span className={`rounded-full px-2.5 py-0.5 font-medium capitalize ${
                        cond.clinicalStatus?.coding?.[0]?.code === "active" ? "bg-amber-100 text-amber-800" : "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
                      }`}>
                        {cond.clinicalStatus?.coding?.[0]?.code || "Unknown Status"}
                      </span>
                      <span className="text-[var(--color-text-secondary)] capitalize">
                        {cond.verificationStatus?.coding?.[0]?.code || ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Diagnostic Reports</h3>
            </div>
            {reports.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No diagnostic reports found.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {reports.map((rep, i) => (
                  <div key={i} className="py-4">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {rep.code?.text || rep.code?.coding?.[0]?.display || "Diagnostic Report"}
                    </p>
                    <div className="mt-1 flex gap-4 text-sm text-[var(--color-text-secondary)]">
                      <span>Status: <strong className="capitalize font-medium text-[var(--color-text-primary)]">{rep.status}</strong></span>
                      {rep.effectiveDateTime && <span>Date: {new Date(rep.effectiveDateTime).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Diagnosis Modal */}
      <AddDiagnosisModal
        isOpen={diagnosisModalOpen}
        onClose={() => setDiagnosisModalOpen(false)}
        onSuccess={handleDiagnosisSuccess}
        patientId={patientId}
      />
    </>
  );
}
