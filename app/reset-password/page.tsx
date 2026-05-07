// ============================================================
// app/reset-password/page.tsx — Reset Password Redirect
//
// /reset-password is a common URL that email clients may try
// to link to. We redirect it to /forgot-password (the actual
// password reset entry point) so those links don't 404.
// ============================================================

import { redirect } from "next/navigation";

export default function ResetPasswordPage() {
  // Redirect legacy or external links to the correct reset flow entry point
  redirect("/forgot-password");
}
