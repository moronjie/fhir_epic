"use client";

import { useState } from "react";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPatientModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    givenName: "",
    familyName: "",
    gender: "unknown",
    birthDate: "",
    phone: "",
    addressLine: "",
    city: "",
    state: "",
    postalCode: "",
    ssn: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/epic/create-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create patient");
      }

      setForm({
        givenName: "",
        familyName: "",
        gender: "unknown",
        birthDate: "",
        phone: "",
        addressLine: "",
        city: "",
        state: "",
        postalCode: "",
        ssn: "",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="modal-content w-full max-w-lg rounded-2xl bg-[var(--color-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Add New Patient
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create a new FHIR Patient resource
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Given Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="givenName"
                  value={form.givenName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Family Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="familyName"
                  value={form.familyName}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>

            {/* Gender + DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Gender
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Birth Date
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={form.birthDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>

            {/* Phone & SSN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  SSN <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="ssn"
                  value={form.ssn}
                  onChange={handleChange}
                  required
                  placeholder="000-00-0000"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Address Line
              </label>
              <input
                type="text"
                name="addressLine"
                value={form.addressLine}
                onChange={handleChange}
                placeholder="123 Main St"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="New York"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="NY"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  ZIP
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={handleChange}
                  placeholder="10001"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              id="submit-patient-btn"
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-light)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating…
                </span>
              ) : (
                "Create Patient"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
