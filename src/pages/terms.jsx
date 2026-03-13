import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-semibold text-sm">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span className="font-bold text-slate-800">Legal Documents</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm">
          <div className="mb-10 text-center border-b border-slate-100 pb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-slate-500 font-medium">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Blessing Community App ("the Application"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
              <p>
                The Application provides a platform for managing care services, staff rosters, incident reporting, and progress notes within the context of NDIS compliance and general care provision.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Responsibilities</h2>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials (Email and PIN). You agree to immediately notify administration of any unauthorized use of your account. You must ensure that all data entered, particularly health and personal information regarding clients, is accurate and handled securely according to the applicable Privacy laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Application are owned by Blessing Community Support Services and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Limitation of Liability</h2>
              <p>
                Blessing Community shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Application.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
