import LegalShell from '@/components/marketing/LegalShell'
import { brand } from '@/lib/brand'

export const metadata = {
  title: 'Security Policy',
}

export default function SecurityPage() {
  return (
    <LegalShell title="Security Policy" updated="2026-05-13">
      <p>
        Bezpečnosť nášho systému berieme vážne. Ak objavíte zraniteľnosť, prosíme nahláste
        ju zodpovedne aby sme mohli reagovať pred verejným disclosure.
      </p>

      <h2>Reporting</h2>
      <ul>
        <li>Email: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a></li>
        <li>Prosíme uveďte: dotknutý URL / endpoint, kroky na reprodukciu, vaše meno (pre credit), a PoC ak je možný</li>
        <li>Dajte nám primeraný čas na investigáciu a patch pred verejným disclosure</li>
      </ul>

      <h2>Scope</h2>
      <ul>
        <li>Aplikácia: <code>{brand.domain}</code> a všetky sub-paths</li>
        <li>V scope: authentication bypass, IDOR, injection (SQL/NoSQL/XSS), CSRF, RCE, SSRF, privilege escalation, sensitive data exposure</li>
        <li>Mimo scope: phishing užívateľov, social engineering, DoS/volumetric útoky, automated scanner output bez proof-of-impact, chýbajúce best-practice headers bez exploitable consequence</li>
      </ul>

      <h2>Safe harbor</h2>
      <p>
        Výskumníci konajúci v dobrej viere, bez exfiltrácie užívateľských dát a bez degradovania
        služby pre ostatných užívateľov, nebudú čeliť právnym krokom od {brand.vendor} za svoje nálezy.
      </p>

      <h2>Disclosure timeline</h2>
      <ul>
        <li>Acknowledgement reportu do <strong>48 hodín</strong></li>
        <li>Initial triage do <strong>5 pracovných dní</strong></li>
        <li>Critical issues sú patchnuté do <strong>14 dní</strong>; nižšia severity podľa rizika</li>
      </ul>

      <h2>Bezpečnostné architektonické princípy</h2>
      <ul>
        <li><strong>Tenant izolácia</strong> — RLS politiky na DB úrovni, per-firma cache keys, scope guards</li>
        <li><strong>Immutable audit log</strong> — BEFORE UPDATE/DELETE trigger blokuje aj service_role</li>
        <li><strong>Encryption at-rest</strong> — IBAN cez pgcrypto + Supabase Vault (AES-256)</li>
        <li><strong>GDPR native</strong> — endpointy pre čl. 15 + 17, SECURITY DEFINER anonymize fn</li>
        <li><strong>2FA TOTP</strong> — povinné pre admin / it_admin / fin_manager role</li>
        <li><strong>Rate limit</strong> — Upstash Redis na PIN, login, write actions, GDPR endpointy</li>
        <li><strong>CI security gates</strong> — npm audit (fail-on-high), gitleaks, dependabot</li>
      </ul>

      <p className="mt-12 pt-8 border-t border-white/[0.06] text-sm text-slate-500">
        Pozri tiež strojovo čitateľnú verziu: <a href="/.well-known/security.txt">/.well-known/security.txt</a>
      </p>
    </LegalShell>
  )
}
