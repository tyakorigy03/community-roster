import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-semibold text-sm">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Shield size={18} className="text-emerald-600" />
              <span className="font-bold text-slate-800">Legal Documents</span>
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
              Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p>
                Blessing Community ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy informs you how we look after your personal data when you visit our application and tells you about your privacy rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Data We Collect</h2>
              <p>
                We may collect, use, store and transfer different kinds of personal data about you, including:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Identity Data:</strong> first name, last name, username or similar identifier.</li>
                <li><strong>Contact Data:</strong> email address and telephone numbers.</li>
                <li><strong>Health/Sensitive Data:</strong> relevant medical history, NDIS details, and incident reports (for clients).</li>
                <li><strong>Technical Data:</strong> IP address, browser type and version, time zone setting.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Data</h2>
              <p>
                We will only use your personal data when the law allows us to. Most commonly, we use your data to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Provide care scheduling and rostering services.</li>
                <li>Ensure compliance with NDIS reporting requirements (e.g., Incident Reports).</li>
                <li>Communicate vital roster and client updates to staff.</li>
                <li>Manage our relationship with you.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Security</h2>
              <p>
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know. All data is securely stored within enterprise-grade encrypted databases.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Retention</h2>
              <p>
                We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting, or reporting requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Your Rights</h2>
              <p>
                Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, or restriction of processing.
              </p>
              <p className="mt-4 font-medium text-slate-800">
                To exercise any of these rights, please contact the Blessing Community administration office.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
