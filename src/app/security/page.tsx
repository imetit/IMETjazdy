export const metadata = {
  title: 'Security Policy — IMET Jazdy',
}

export default function SecurityPage() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4 prose">
      <h1>Security Policy</h1>
      <p>
        We take the security of our system seriously. If you discover a vulnerability, please
        report it responsibly so we can address it before disclosure.
      </p>

      <h2>Reporting a vulnerability</h2>
      <ul>
        <li>Email: <a href="mailto:security@imet.sk">security@imet.sk</a> (or <a href="mailto:it@imet.sk">it@imet.sk</a>)</li>
        <li>Please include: affected URL or endpoint, steps to reproduce, your name (for credit), and a PoC if possible.</li>
        <li>Allow us reasonable time to investigate and patch before public disclosure.</li>
      </ul>

      <h2>Scope</h2>
      <ul>
        <li>Application: <code>imetjazdy.vercel.app</code> and any sub-paths</li>
        <li>In scope: authentication bypass, IDOR, injection (SQL/NoSQL/XSS), CSRF, RCE, SSRF, privilege escalation, sensitive data exposure</li>
        <li>Out of scope: phishing of users, social engineering, DoS/volumetric attacks, automated scanner output without proof-of-impact, missing best-practice headers without exploitable consequence</li>
      </ul>

      <h2>Safe harbor</h2>
      <p>
        Researchers acting in good faith, without exfiltrating user data and without
        degrading service for other users, will not face legal action from IMET for
        their findings.
      </p>

      <h2>Disclosure timeline</h2>
      <ul>
        <li>We aim to acknowledge reports within 48 hours.</li>
        <li>We target initial triage within 5 business days.</li>
        <li>Critical issues are patched within 14 days; lower severity according to risk.</li>
      </ul>

      <p className="text-sm text-gray-500 mt-12">
        See also: <a href="/.well-known/security.txt">/.well-known/security.txt</a>
      </p>
    </main>
  )
}
