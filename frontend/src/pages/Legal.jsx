import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Legal() {
  const [message, setMessage] = useState('');
  const [optionalEmail, setOptionalEmail] = useState('');
  const [sending, setSending] = useState(false);
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please include a short message');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${window.location.origin}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          from_email: optionalEmail || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success('Message sent!');
      setMessage('');
      setOptionalEmail('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Scroll to section on hash change and on initial load (e.g., /legal#privacy)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.hash]);

  return (
    <div className="bg-white dark:bg-slate-900">
      <div className="container-page py-12">
        <header className="mb-8" id="top">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Legal</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Last updated: {today}
          </p>
          <nav className="mt-4 flex flex-wrap gap-4 text-sm">
            <a href="#terms" className="text-primary-600 dark:text-primary-400">Terms of Service</a>
            <a href="#privacy" className="text-primary-600 dark:text-primary-400">Privacy Policy</a>
            <a href="#contact" className="text-primary-600 dark:text-primary-400">Contact</a>
          </nav>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Company Details</h2>
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <p><span className="font-medium">Company:</span> Acktrail FZE</p>
            <p><span className="font-medium">Registered address:</span> Business Centre, Sharjah Publishing City Free Zone, Sharjah, United Arab Emirates</p>
            <p><span className="font-medium">Formation number:</span> 4424773</p>
            <p><span className="font-medium">License number:</span> 4424773.01</p>
          </div>
        </section>

        <section id="terms" className="scroll-mt-24 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service</h2>
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <p>Acktrail FZE ("Acktrail", "we", "our") provides software and IT services, including software-as-a-service solutions for policy acknowledgments and related tooling (the "Services"). By using the Services, you agree to these Terms.</p>
            <p className="font-semibold">Accounts & Access</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>You must provide accurate information and keep credentials secure.</li>
              <li>Administrators may invite end users to acknowledge policies; you are responsible for your organization’s use.</li>
              <li>We may suspend access for security, abuse, or legal reasons.</li>
            </ul>
            <p className="font-semibold">Acceptable Use</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>No unlawful, infringing, or harmful content; no reverse engineering or bypassing security.</li>
              <li>No sending spam or interfering with Service integrity.</li>
            </ul>
            <p className="font-semibold">Subscriptions & Billing</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Paid features are billed per selected plan and staff counts; charges handled by PCI-compliant processors (e.g., Stripe). We do not store full card numbers.</li>
              <li>Fees are non-refundable except where required by law or expressly stated.</li>
              <li>We may change pricing with reasonable notice for recurring terms.</li>
            </ul>
            <p className="font-semibold">Intellectual Property</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>We retain all rights in the Services. You retain rights in your content (e.g., policy PDFs), granting us a limited license to operate the Services.</li>
            </ul>
            <p className="font-semibold">Confidentiality</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Each party will protect the other’s confidential information and use it only as needed to provide or receive the Services.</li>
            </ul>
            <p className="font-semibold">Warranties & Disclaimers</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Services are provided on an “as is” and “as available” basis.</li>
              <li>We disclaim warranties to the maximum extent permitted by law.</li>
            </ul>
            <p className="font-semibold">Limitation of Liability</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>To the extent permitted by law, neither party is liable for indirect or consequential losses. Our aggregate liability under these Terms is limited to fees paid in the 12 months before the claim.</li>
            </ul>
            <p className="font-semibold">Termination</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>You may stop using the Services at any time. We may suspend or terminate for breach, legal compliance, or risk.</li>
            </ul>
            <p className="font-semibold">Changes</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>We may update these Terms; material changes will be notified via the Service. Continued use after changes indicates acceptance.</li>
            </ul>
            <p className="font-semibold">Governing Law & Venue</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>These Terms are governed by the laws of the United Arab Emirates. Courts of Sharjah, UAE have exclusive jurisdiction.</li>
            </ul>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-24 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h2>
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <p>We describe how we collect, use, disclose, and protect personal data when you use acktrail.com and our Services.</p>
            <p className="font-semibold">Scope</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Visitors, trial/paying customers, invited end users, and prospective customers.</li>
            </ul>
            <p className="font-semibold">Information We Collect</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Account & contact: name, email, organization, role, credentials.</li>
              <li>Billing: company name, billing address, tax IDs; payments processed by PCI-compliant processors (e.g., Stripe).</li>
              <li>Usage & diagnostics: app events, logs, device identifiers, IP address, user agent, pages viewed, timestamps, referral/UTM.</li>
              <li>Support content: messages and attachments you send us.</li>
              <li>Cookies: essential for auth; analytics/performance cookies; optional marketing where required by law.</li>
            </ul>
            <p className="font-semibold">How We Use Data</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Provide, operate, secure, and improve the Services.</li>
              <li>Authenticate users, prevent fraud/abuse, and provide support.</li>
              <li>Process transactions, invoices, and account notices.</li>
              <li>Run analytics and meet legal obligations.</li>
            </ul>
            <p className="font-semibold">Legal Bases (where applicable)</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Contract, legitimate interests, consent (where required), and legal obligations.</li>
            </ul>
            <p className="font-semibold">Sharing & Disclosure</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Processors for hosting, analytics, email, storage, and payments (e.g., Supabase/Postgres, Brevo, Backblaze B2, Stripe) under appropriate agreements.</li>
              <li>Advisers under confidentiality; authorities where required; business transfers with safeguards.</li>
              <li>We do not sell personal data.</li>
            </ul>
            <p className="font-semibold">International Transfers</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Data may be processed inside and outside the UAE with contractual and technical safeguards.</li>
            </ul>
            <p className="font-semibold">Data Retention</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>We retain data as needed to provide the Services and meet legal requirements, applying shorter windows for logs/analytics where feasible.</li>
            </ul>
            <p className="font-semibold">Security</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Role-based access, encryption in transit, secure key management, audit logging, regular backups. No method is 100% secure.</li>
            </ul>
            <p className="font-semibold">Your Rights</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Depending on jurisdiction: access, correction, deletion, restriction, objection, and portability. Use the contact section below to exercise rights.</li>
            </ul>
            <p className="font-semibold">Children</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Services are not directed to children under 16. We delete data collected without appropriate consent if discovered.</li>
            </ul>
            <p className="font-semibold">Third‑Party Links</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Third‑party sites/services are governed by their own policies.</li>
            </ul>
            <p className="font-semibold">Changes</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>We may update this Policy and will revise the last updated date above; material changes will be communicated via the Service.</li>
            </ul>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Use this form to contact support. Messages are delivered securely to our team.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <textarea
                rows={5}
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (optional)</label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="you@example.com"
                value={optionalEmail}
                onChange={(e) => setOptionalEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
              <a href="#top" className="text-sm text-primary-600 dark:text-primary-400">Back to top</a>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}


