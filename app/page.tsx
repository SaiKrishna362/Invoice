import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/LandingNav";
import { NavLink } from "@/components/NavLink";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-20 pb-24 text-center">
        <span className="inline-block bg-[#e8f5ee] text-[#1a6b4a] text-xs font-semibold
                         px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          GST-ready · Made for India
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-[#1a1a1a]
                       tracking-tight leading-tight max-w-3xl mx-auto">
          Invoicing that works as fast as{" "}
          <span className="text-[#2d9b6f]">you do</span>
        </h1>

        <p className="mt-6 text-lg text-[#6b6b6b] max-w-xl mx-auto leading-relaxed">
          Create professional GST invoices in under a minute, track payments,
          and manage clients — all in one clean dashboard built for Indian freelancers.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NavLink
            href="/signup"
            className="w-full sm:w-auto text-center bg-[#1a6b4a] text-white font-medium
                       px-8 py-3 rounded-xl hover:bg-[#2d9b6f] transition-colors text-sm"
          >
            Create free account
          </NavLink>
          <NavLink
            href="/login"
            className="w-full sm:w-auto text-center border border-[#e0ddd6] bg-white text-[#1a1a1a]
                       font-medium px-8 py-3 rounded-xl hover:bg-[#f5f4f0] transition-colors text-sm"
          >
            Sign in
          </NavLink>
        </div>

        <p className="mt-4 text-xs text-[#aaa]">No credit card required · Free forever</p>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <section className="bg-white border-y border-[#e0ddd6]">
        <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "60 sec",  label: "to create an invoice" },
            { value: "18% GST", label: "auto-calculated"       },
            { value: "PDF",     label: "ready to send"         },
            { value: "100%",    label: "free to use"           },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-semibold text-[#1a6b4a]">{value}</p>
              <p className="text-sm text-[#6b6b6b] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-semibold text-[#1a1a1a]">Everything you need, nothing you don&apos;t</h2>
          <p className="text-[#6b6b6b] mt-3 max-w-lg mx-auto">
            Built specifically for Indian freelancers who need to invoice fast and get paid faster.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              ),
              title: "Professional invoices",
              body:  "Generate clean, branded invoices with your business details, line items, and auto-calculated GST — ready to send in seconds.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              ),
              title: "One-click email delivery",
              body:  "Send the invoice PDF directly to your client's inbox with a single click. No downloading, attaching, or switching apps.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              ),
              title: "Payment tracking",
              body:  "Track every invoice through Draft → Sent → Paid → Overdue. See your revenue, pending, and overdue amounts at a glance on the dashboard.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              ),
              title: "Client management",
              body:  "Store client details — name, email, phone, address, and GSTIN. Auto-fill them on every new invoice so you never retype the same info.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              ),
              title: "Import invoices",
              body:  "Already have invoices in a spreadsheet or CSV? Import them in bulk and get everything into the system without re-entering data manually.",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              ),
              title: "Secure & private",
              body:  "Your data is yours. Every account is protected with email OTP verification, and all invoice data is scoped strictly to your account.",
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="bg-white border border-[#e0ddd6] rounded-2xl p-6 hover:shadow-sm transition-shadow"
            >
              <div className="w-9 h-9 bg-[#e8f5ee] text-[#1a6b4a] rounded-xl flex items-center justify-center mb-4">
                {icon}
              </div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2">{title}</h3>
              <p className="text-sm text-[#6b6b6b] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white border-y border-[#e0ddd6]">
        <div className="max-w-6xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-[#1a1a1a]">From zero to sent in three steps</h2>
            <p className="text-[#6b6b6b] mt-3">No learning curve. No setup fees. Just invoices.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* connector line on desktop */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-[#e0ddd6]" />

            {[
              {
                step: "01",
                title: "Add your client",
                body:  "Enter the client's name, email, and GSTIN once. Tulluri remembers them for every future invoice.",
              },
              {
                step: "02",
                title: "Build your invoice",
                body:  "Add line items with descriptions, quantities, and rates. GST is calculated automatically.",
              },
              {
                step: "03",
                title: "Send & get paid",
                body:  "Hit Send — the PDF lands in your client's inbox instantly. Mark it Paid when the money arrives.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="text-center relative">
                <div className="w-16 h-16 bg-[#e8f5ee] text-[#1a6b4a] rounded-2xl flex items-center
                                justify-center mx-auto mb-5 text-lg font-semibold">
                  {step}
                </div>
                <h3 className="text-base font-semibold text-[#1a1a1a] mb-2">{title}</h3>
                <p className="text-sm text-[#6b6b6b] leading-relaxed max-w-xs mx-auto">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-24 text-center">
        <div className="bg-[#1a6b4a] rounded-3xl px-8 py-16">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Start invoicing in 60 seconds
          </h2>
          <p className="text-[#c8ead8] mb-8 max-w-md mx-auto">
            Free forever. No credit card. Just sign up and send your first invoice today.
          </p>
          <NavLink
            href="/signup"
            className="inline-block bg-white text-[#1a6b4a] font-semibold px-8 py-3
                       rounded-xl hover:bg-[#f0faf5] transition-colors text-sm"
          >
            Create free account
          </NavLink>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e0ddd6] bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center
                        justify-between gap-4 text-sm text-[#aaa]">
          <span>
            tulluri<span className="text-[#2d9b6f]">.</span>
            {" "}— GST invoicing for Indian freelancers
          </span>
          <div className="flex items-center gap-5">
            <NavLink href="/login" className="hover:text-[#1a1a1a] transition-colors">Log in</NavLink>
            <NavLink href="/signup" className="hover:text-[#1a1a1a] transition-colors">Sign up</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
