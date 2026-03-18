import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 pt-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-semibold text-sm">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span className="font-bold text-slate-800">Terms of Service</span>
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
              Last Updated: March 2025
            </p>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By downloading, installing, or using the Blessing Community Roster application ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. These Terms apply to all users of the App including staff members and administrators.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of the App</h2>
              <p>
                Blessing Community Roster is a care services management platform designed for use by care providers operating under the NDIS (National Disability Insurance Scheme) and similar frameworks. The App provides tools for shift scheduling, staff rostering, clock-in/out verification, client management, progress note recording, incident reporting, and payroll summaries.
              </p>
              <p className="mt-3">
                Access to the App is granted exclusively to authorised employees and administrators of Blessing Community. The App is not available to the general public.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Eligibility</h2>
              <p>
                You must be at least 18 years of age and an authorised staff member or administrator of Blessing Community to use this App. By using the App, you confirm that you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. User Accounts and Security</h2>
              <p>
                Your account credentials (email and password) are personal to you. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must immediately notify your administrator of any unauthorised access to or use of your account.
              </p>
              <p className="mt-3">
                You must not share your account credentials with any other person. Each staff member must use their own individual account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Acceptable Use</h2>
              <p>You agree to use the App only for its intended purposes. You must not:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Use the App for any unlawful purpose or in violation of applicable laws or regulations.</li>
                <li>Enter false, inaccurate, or misleading information including clock-in/out times, locations, or client records.</li>
                <li>Attempt to gain unauthorised access to any part of the App or its underlying systems.</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code of the App.</li>
                <li>Use the App to transmit any harmful, offensive, or disruptive content.</li>
                <li>Misuse client health or personal data in violation of privacy laws or NDIS obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Device Permissions</h2>
              <p>
                The App requires access to your device's camera and location services to perform clock-in and clock-out functions. By granting these permissions, you consent to the App using them solely for attendance verification purposes as described in our Privacy Policy. You may revoke permissions at any time in your device settings, though this will affect certain App functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Client Data and Confidentiality</h2>
              <p>
                Staff members who access client records, progress notes, or incident reports through the App are bound by strict confidentiality obligations. All client data must be handled in accordance with applicable Australian privacy laws, the NDIS Act 2013, and Blessing Community's internal policies. Client data must not be accessed, shared, or used for any purpose other than providing authorised care services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Intellectual Property</h2>
              <p>
                All content, features, design, and functionality of the App are owned by Blessing Community and are protected by applicable copyright, trademark, and intellectual property laws. You may not copy, reproduce, distribute, or create derivative works based on the App without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Disclaimer of Warranties</h2>
              <p>
                The App is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components. We do not warrant the accuracy or completeness of any information provided through the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Blessing Community shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the App. Our total liability to you for any claims arising from these Terms or your use of the App shall not exceed the amount you paid, if any, to use the App in the twelve months prior to the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the App at any time, with or without notice, if you breach these Terms or your employment or engagement with Blessing Community ends. Upon termination, your right to use the App ceases immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">12. Governing Law</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of Australia. Any disputes arising from these Terms or your use of the App shall be subject to the exclusive jurisdiction of the courts of Australia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">13. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify users of material changes by updating the "Last Updated" date at the top of this page. Continued use of the App following any changes constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">14. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700">
                <p><strong>Blessing Community</strong></p>
                <p>Email: bonnynsabigaba@gmail.com </p>
                <p>Country: Australia</p>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}