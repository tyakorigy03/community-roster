import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-semibold text-sm">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Shield size={18} className="text-emerald-600" />
              <span className="font-bold text-slate-800">Privacy Policy</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm">
          <div className="mb-10 text-center border-b border-slate-100 pb-8">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-500 font-medium">
              Effective Date: March 2025
            </p>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p>
                Blessing Community ("we", "our", or "us") operates the Blessing Community Roster mobile application ("the App"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and share your information when you use our App, and describes your rights in relation to that information.
              </p>
              <p className="mt-3">
                By using the App, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Identity Data:</strong> Full name, role, profile picture.</li>
                <li><strong>Contact Data:</strong> Email address, phone number.</li>
                <li><strong>Location Data:</strong> GPS coordinates captured at the time of clock-in and clock-out to verify attendance at the correct work site. Location is only collected when you actively perform a clock-in or clock-out action.</li>
                <li><strong>Photo Data:</strong> Photos taken via your device camera during clock-in verification. Photos are uploaded to secure storage and used solely for attendance verification purposes.</li>
                <li><strong>Health and Sensitive Data:</strong> Client health information, NDIS plan details, progress notes, and incident reports. This data is entered by authorised staff and relates to clients receiving care services.</li>
                <li><strong>Usage Data:</strong> Shift schedules, attendance records, payroll data, and clock-in/out timestamps.</li>
                <li><strong>Device Data:</strong> Device type and operating system version, used for technical support purposes only.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Provide and operate the care rostering and shift management services.</li>
                <li>Verify staff attendance via GPS location and photo capture during clock-in/out.</li>
                <li>Manage client records, care plans, progress notes, and incident reports in compliance with NDIS requirements.</li>
                <li>Calculate and display payroll summaries.</li>
                <li>Communicate shift schedules and updates to staff.</li>
                <li>Maintain the security and integrity of the platform.</li>
                <li>Comply with applicable legal and regulatory obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Camera and Location Access</h2>
              <p>
                The App requests access to your device's <strong>camera</strong> and <strong>location</strong> for the following purposes:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Camera:</strong> Used only when you initiate a clock-in to capture a verification photo. Photos are not accessed without your direct action.</li>
                <li><strong>Location:</strong> Used only at the moment of clock-in or clock-out to confirm you are at the correct care site. Location is not tracked continuously or in the background.</li>
              </ul>
              <p className="mt-3">
                You may revoke these permissions at any time in your device Settings. Revoking permissions will limit your ability to perform clock-in and clock-out functions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Sharing</h2>
              <p>We do not sell your personal data. We may share your data with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Supabase:</strong> Our secure database and authentication provider. Data is stored on encrypted servers.</li>
                <li><strong>Authorised Personnel:</strong> Administrators within your organisation who need access to manage rosters, payroll, and compliance records.</li>
                <li><strong>Regulatory Bodies:</strong> Where required by law, such as the NDIS Quality and Safeguards Commission.</li>
              </ul>
              <p className="mt-3">We do not share your data with third parties for marketing or advertising purposes.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Data Security</h2>
              <p>
                All data transmitted through the App is encrypted using HTTPS/TLS. Data at rest is stored in encrypted, enterprise-grade databases. Access to personal data is strictly limited to authorised personnel who require it to perform their duties. We regularly review our security practices to protect against unauthorised access, disclosure, or destruction of data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Data Retention</h2>
              <p>
                We retain personal data only for as long as necessary to provide the services and comply with legal obligations. Staff records are retained for the duration of employment plus any legally required period thereafter. Client records are retained in accordance with NDIS and applicable Australian health record keeping requirements. When data is no longer required, it is securely deleted or anonymised.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Children's Privacy</h2>
              <p>
                The App is intended for use by adults aged 18 and over. We do not knowingly collect personal information from individuals under 18. If you believe a minor has provided personal data to us, please contact us immediately and we will take steps to remove it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Request correction of inaccurate or incomplete data.</li>
                <li>Request deletion of your personal data, subject to legal obligations.</li>
                <li>Object to or restrict the processing of your data.</li>
                <li>Withdraw consent where processing is based on consent.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, please contact your organisation's administrator or reach out to us directly at the contact details below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify users of any significant changes by updating the effective date at the top of this page. Continued use of the App after changes are posted constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or how we handle your data, please contact us:
              </p>
              <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700">
                <p><strong>Blessing Community</strong></p>
                <p>Email: bonnynsabigaba@gmail.com</p>
                <p>Country: Australia</p>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}