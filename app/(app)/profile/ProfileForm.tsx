// ============================================================
// app/(app)/profile/ProfileForm.tsx — Profile Settings UI
//
// Client component for the full /profile page. Composed of:
//
//   ContactChangeSection  — Reusable two-step widget (input new value → enter OTP)
//                           used for both Email Address and Mobile Number changes.
//
//   ProfileForm           — Main form with:
//     • Avatar + identity card
//     • Edit Details section (name, GSTIN, address) — simple save
//     • Email Address change (ContactChangeSection)
//     • Mobile Number change / add / remove (ContactChangeSection)
//     • Danger Zone: delete account (3-step: confirm → send OTPs → verify + delete)
//
// All mutations go through server actions in app/actions/profile.ts.
// Email and phone changes are OTP-verified in the server actions.
// Account deletion requires both email AND phone OTP when phone is set.
// ============================================================

"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { OtpInput, EMPTY_OTP } from "@/components/OtpInput";
import {
  updateProfileAction,
  sendEmailChangeOtpAction,
  updateEmailWithOtpAction,
  sendPhoneChangeOtpAction,
  updatePhoneWithOtpAction,
  removePhoneAction,
  sendDeleteOtpAction,
  deleteAccountAction,
  logoutAfterDeleteAction,
} from "@/app/actions/profile";

interface User {
  name: string;
  email: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  createdAt: Date;
}

// ────────────────────────────────────────────────────────────────────────────
// ContactChangeSection — reusable OTP-verified change widget
// ────────────────────────────────────────────────────────────────────────────

type ContactStep = "idle" | "inputValue" | "inputOtp" | "done";

/**
 * Two-step change widget for email or phone:
 *   idle       → shows current value + "Change" / "Add" / "Remove" buttons
 *   inputValue → text input for the new value + "Send Code" button
 *   inputOtp   → OtpInput for the verification code + "Verify & Update" button
 *   done       → green success banner (auto-reverts to idle after 4 s)
 *
 * @param onSendOtp  Called with the new value to trigger the OTP delivery
 * @param onVerify   Called with (value, otp) to commit the change
 * @param onResend   Called to resend the OTP to the same value
 * @param onRemove   Optional — shown when currentValue is set (phone remove button)
 */
function ContactChangeSection({
  label,
  currentValue,
  inputType,
  placeholder,
  hint,
  onSendOtp,
  onVerify,
  onResend,
  onRemove,
}: {
  label: string;
  currentValue: string | null;
  inputType: "email" | "tel";
  placeholder: string;
  hint?: string;
  onSendOtp: (val: string) => Promise<{ error: string; success: boolean }>;
  onVerify: (val: string, otp: string) => Promise<{ error: string; success: boolean }>;
  onResend: (val: string) => Promise<{ error: string; success: boolean }>;
  onRemove?: () => void;
}) {
  const [step,    setStep]    = useState<ContactStep>("idle");
  const [value,   setValue]   = useState("");
  const [otp,     setOtp]     = useState<string[]>(EMPTY_OTP());
  const [errMsg,  setErrMsg]  = useState("");
  const [pending, start]      = useTransition();

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrMsg("");
    start(async () => {
      const res = await onSendOtp(value);
      if (res.error) { setErrMsg(res.error); return; }
      setOtp(EMPTY_OTP());
      setStep("inputOtp");
    });
  }

  function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrMsg("");
    const code = otp.join("");
    if (code.length < 6) { setErrMsg("Please enter the full 6-digit code."); return; }
    start(async () => {
      const res = await onVerify(value, code);
      if (res.error) { setErrMsg(res.error); return; }
      setStep("done");
      setTimeout(() => setStep("idle"), 4000);
    });
  }

  function handleResend() {
    setErrMsg("");
    setOtp(EMPTY_OTP());
    start(async () => {
      const res = await onResend(value);
      if (res.error) setErrMsg(res.error);
    });
  }

  return (
    <div className="bg-white border border-[#e0ddd6] rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#1a1a1a]">{label}</h2>
          <p className="text-sm text-[#6b6b6b] mt-0.5 break-all">
            {currentValue ?? <span className="italic text-[#aaa]">Not set</span>}
          </p>
        </div>
        {step === "idle" && (
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => { setStep("inputValue"); setValue(""); setErrMsg(""); }}
              className="text-sm text-[#2d9b6f] font-medium hover:underline"
            >
              {currentValue ? "Change" : "Add"}
            </button>
            {currentValue && onRemove && (
              <button
                onClick={onRemove}
                className="text-sm text-red-400 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {step === "done" && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {label} updated successfully.
        </div>
      )}

      {(step === "inputValue" || step === "inputOtp") && (
        <div className="mt-5 pt-5 border-t border-[#e0ddd6]">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {errMsg}
            </div>
          )}

          {step === "inputValue" && (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                  New {label.toLowerCase()}
                </label>
                <input
                  type={inputType}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={placeholder}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
                />
                {hint && <p className="text-xs text-[#aaa] mt-1">{hint}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("idle"); setErrMsg(""); }}
                  className="flex-1 border border-[#e0ddd6] text-sm text-[#6b6b6b] py-2.5 rounded-lg
                             hover:bg-[#f5f4f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 bg-[#1a6b4a] text-white text-sm py-2.5 rounded-lg
                             hover:bg-[#2d9b6f] transition-colors disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send Code"}
                </button>
              </div>
            </form>
          )}

          {step === "inputOtp" && (
            <>
              <p className="text-sm text-[#6b6b6b] mb-1">We sent a code to</p>
              <p className="text-sm font-medium text-[#1a1a1a] mb-4 break-all">{value}</p>

              <form onSubmit={handleVerify} className="space-y-4">
                <OtpInput otp={otp} onChange={setOtp} autoFocus />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep("inputValue"); setErrMsg(""); setOtp(EMPTY_OTP()); }}
                    className="flex-1 border border-[#e0ddd6] text-sm text-[#6b6b6b] py-2.5 rounded-lg
                               hover:bg-[#f5f4f0] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={pending || otp.join("").length < 6}
                    className="flex-1 bg-[#1a6b4a] text-white text-sm py-2.5 rounded-lg
                               hover:bg-[#2d9b6f] transition-colors disabled:opacity-60"
                  >
                    {pending ? "Verifying…" : "Verify & Update"}
                  </button>
                </div>
              </form>

              <div className="text-right mt-3">
                <button
                  onClick={handleResend}
                  disabled={pending}
                  className="text-sm text-[#2d9b6f] hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ProfileForm — main page component
// ────────────────────────────────────────────────────────────────────────────

/**
 * Main profile settings form.
 * Holds optimistic local user state that is updated immediately after
 * email / phone changes succeed so the UI reflects the new value without
 * needing a full page reload.
 *
 * @param user  Current user data fetched server-side in page.tsx
 */
export function ProfileForm({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser);

  // ---- Basic profile save ----
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }, [state]);

  // ---- Delete account ----
  type DeleteStep = "idle" | "confirm" | "inputOtp";
  const [deleteStep,    setDeleteStep]    = useState<DeleteStep>("idle");
  const [deleteHasPhone, setDeleteHasPhone] = useState(false);
  const [delEmailOtp,   setDelEmailOtp]   = useState<string[]>(EMPTY_OTP());
  const [delPhoneOtp,   setDelPhoneOtp]   = useState<string[]>(EMPTY_OTP());
  const [deleteError,   setDeleteError]   = useState("");
  const [deletePending, startDelete]      = useTransition();

  function handleSendDeleteOtp() {
    setDeleteError("");
    startDelete(async () => {
      const res = await sendDeleteOtpAction();
      if (res.error) { setDeleteError(res.error); return; }
      setDeleteHasPhone(res.hasPhone);
      setDelEmailOtp(EMPTY_OTP());
      setDelPhoneOtp(EMPTY_OTP());
      setDeleteStep("inputOtp");
    });
  }

  function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeleteError("");
    const emailCode = delEmailOtp.join("");
    const phoneCode = delPhoneOtp.join("");
    if (emailCode.length < 6) { setDeleteError("Please enter the full email confirmation code."); return; }
    if (deleteHasPhone && phoneCode.length < 6) { setDeleteError("Please enter the full phone confirmation code."); return; }
    startDelete(async () => {
      const res = await deleteAccountAction(
        emailCode,
        deleteHasPhone ? phoneCode : undefined
      );
      if (res.error) { setDeleteError(res.error); return; }
      await logoutAfterDeleteAction();
    });
  }

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Profile</h1>
        <p className="text-sm text-[#6b6b6b] mt-1">
          Your details appear on every invoice you generate.
        </p>
      </div>

      {/* Avatar + identity */}
      <div className="bg-white border border-[#e0ddd6] rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#1a6b4a] flex items-center justify-center shrink-0">
          <span className="text-white text-xl font-semibold">{initials}</span>
        </div>
        <div>
          <p className="font-semibold text-[#1a1a1a]">{user.name}</p>
          <p className="text-sm text-[#6b6b6b] break-all">{user.email}</p>
          {user.phone && <p className="text-xs text-[#aaa] mt-0.5">{user.phone}</p>}
          <p className="text-xs text-[#aaa] mt-0.5">
            Member since{" "}
            {new Date(user.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ---- Edit basic details (name, GSTIN, address) ---- */}
      <div className="bg-white border border-[#e0ddd6] rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#1a1a1a] mb-5">Edit Details</h2>

        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
            {state.error}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
            Profile updated successfully.
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Full name *</label>
            <input
              name="name"
              defaultValue={user.name}
              required
              className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                GSTIN
                <span className="text-[#aaa] font-normal ml-1">(appears on invoices)</span>
              </label>
              <input
                name="gstin"
                defaultValue={user.gstin ?? ""}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                Address
                <span className="text-[#aaa] font-normal ml-1">(appears on invoices)</span>
              </label>
              <textarea
                name="address"
                defaultValue={user.address ?? ""}
                rows={3}
                placeholder="Street, City, State, PIN"
                className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="bg-[#1a6b4a] text-white px-6 py-2.5 rounded-lg text-sm font-medium
                       hover:bg-[#2d9b6f] transition-colors disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* ---- Email Address (OTP verified change) ---- */}
      <ContactChangeSection
        label="Email Address"
        currentValue={user.email}
        inputType="email"
        placeholder="new@example.com"
        onSendOtp={sendEmailChangeOtpAction}
        onVerify={async (val, otp) => {
          const res = await updateEmailWithOtpAction(val, otp);
          if (res.success) setUser(prev => ({ ...prev, email: val }));
          return res;
        }}
        onResend={sendEmailChangeOtpAction}
      />

      {/* ---- Mobile Number (OTP verified change) ---- */}
      <ContactChangeSection
        label="Mobile Number"
        currentValue={user.phone}
        inputType="tel"
        placeholder="+91 98765 43210"
        hint="Include country code, e.g. +91 for India. An OTP will be sent to this number."
        onSendOtp={sendPhoneChangeOtpAction}
        onVerify={async (val, otp) => {
          const res = await updatePhoneWithOtpAction(val, otp);
          if (res.success) setUser(prev => ({ ...prev, phone: val }));
          return res;
        }}
        onResend={sendPhoneChangeOtpAction}
        onRemove={async () => {
          const res = await removePhoneAction();
          if (res.success) setUser(prev => ({ ...prev, phone: null }));
        }}
      />

      {/* ---- Danger Zone: Delete Account ---- */}
      <div className="bg-white border border-red-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-[#6b6b6b] mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>

        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {deleteError}
          </div>
        )}

        {deleteStep === "idle" && (
          <button
            onClick={() => { setDeleteStep("confirm"); setDeleteError(""); }}
            className="border border-red-200 text-red-500 text-sm px-4 py-2.5 rounded-lg
                       hover:bg-red-50 transition-colors"
          >
            Delete my account
          </button>
        )}

        {deleteStep === "confirm" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Are you absolutely sure?</p>
              <p>
                All invoices, clients, and data will be permanently deleted.
                {user.phone
                  ? ` We'll send confirmation codes to ${user.email} and ${user.phone}.`
                  : ` We'll send a confirmation code to ${user.email}.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteStep("idle"); setDeleteError(""); }}
                className="flex-1 border border-[#e0ddd6] text-sm text-[#6b6b6b] py-2.5 rounded-lg
                           hover:bg-[#f5f4f0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDeleteOtp}
                disabled={deletePending}
                className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-lg
                           hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deletePending ? "Sending…" : "Send confirmation code"}
              </button>
            </div>
          </div>
        )}

        {deleteStep === "inputOtp" && (
          <form onSubmit={handleDeleteAccount} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                📧 Email confirmation code
                <span className="font-normal text-[#6b6b6b] ml-1 text-xs break-all">({user.email})</span>
              </label>
              <OtpInput otp={delEmailOtp} onChange={setDelEmailOtp} autoFocus />
            </div>

            {deleteHasPhone && (
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                  📱 Phone confirmation code
                  <span className="font-normal text-[#6b6b6b] ml-1 text-xs">({user.phone})</span>
                </label>
                <OtpInput otp={delPhoneOtp} onChange={setDelPhoneOtp} />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteStep("idle"); setDeleteError(""); setDelEmailOtp(EMPTY_OTP()); setDelPhoneOtp(EMPTY_OTP()); }}
                className="flex-1 border border-[#e0ddd6] text-sm text-[#6b6b6b] py-2.5 rounded-lg
                           hover:bg-[#f5f4f0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  deletePending ||
                  delEmailOtp.join("").length < 6 ||
                  (deleteHasPhone && delPhoneOtp.join("").length < 6)
                }
                className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-lg
                           hover:bg-red-700 transition-colors disabled:opacity-60 font-medium"
              >
                {deletePending ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setDeleteStep("confirm"); setDeleteError(""); setDelEmailOtp(EMPTY_OTP()); setDelPhoneOtp(EMPTY_OTP()); }}
                disabled={deletePending}
                className="text-sm text-red-500 hover:underline disabled:opacity-60"
              >
                Resend codes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
