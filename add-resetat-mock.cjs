// Adds `resetAt: null,` after `deactivatedAt: ...` lines in NfcTag.reconstitute specs.
const fs = require('fs');
const path = require('path');

const files = [
  'src/modules/contact/application/use-cases/__tests__/send-contact-message.use-case.spec.ts',
  'src/modules/nfc/infrastructure/repositories/__tests__/nfc-repositories.spec.ts',
  'src/modules/ownership/application/policies/__tests__/tag-ownership.policy.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/activate-tag.use-case.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/associate-disassociate-pet.use-case.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/unlink-replace.use-case.spec.ts',
  'src/modules/public-profile/application/use-cases/__tests__/get-public-profile.use-case.spec.ts',
  'src/modules/public-profile/infrastructure/__tests__/redis-public-profile-invalidation.spec.ts',
];

let changed = 0;
for (const rel of files) {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) {
    console.log('SKIP (missing):', rel);
    continue;
  }
  const src = fs.readFileSync(p, 'utf8');
  if (/resetAt:\s*null,/.test(src)) {
    console.log('SKIP (already has resetAt):', rel);
    continue;
  }
  const out = src.replace(
    /(\n(\s*)deactivatedAt:\s*[^\n]+,)/,
    `$1\n$2resetAt: null,`,
  );
  if (out === src) {
    console.log('NO MATCH:', rel);
    continue;
  }
  fs.writeFileSync(p, out, 'utf8');
  changed++;
  console.log('OK:', rel);
}
console.log(`\nChanged ${changed} files.`);
