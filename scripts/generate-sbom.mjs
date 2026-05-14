#!/usr/bin/env node
/**
 * Generuje SBOM (Software Bill of Materials) v CycloneDX formáte.
 * Použitie pre due-diligence balíček — korporátni zákazníci to chcú.
 *
 * Spustenie: node scripts/generate-sbom.mjs
 * Output: docs/sbom.json
 *
 * Vyžaduje: npm i -g @cyclonedx/cyclonedx-npm  (alebo `npx`)
 */
import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'

if (!existsSync('docs')) mkdirSync('docs')

const sbomPath = 'docs/sbom.json'

try {
  console.log('Generujem SBOM (CycloneDX) cez npx...')
  const out = execSync('npx --yes @cyclonedx/cyclonedx-npm@latest --output-format JSON --output-file ' + sbomPath, {
    stdio: 'inherit',
    encoding: 'utf8',
  })
  console.log(`\nSBOM zapísaný do ${sbomPath}`)
  console.log('Pridaj do CI / release artefaktov.')
} catch (e) {
  console.error('SBOM generation failed:', e.message)
  // Fallback: jednoduchý plain-text inventory
  const pkg = JSON.parse(execSync('npm ls --all --json', { encoding: 'utf8' }))
  writeFileSync(sbomPath, JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: { type: 'application', name: pkg.name, version: pkg.version },
    },
    components: Object.entries(pkg.dependencies || {}).map(([name, info]) => ({
      type: 'library',
      'bom-ref': `${name}@${info.version}`,
      name,
      version: info.version,
    })),
  }, null, 2))
  console.log(`Fallback SBOM zapísaný do ${sbomPath}`)
}
