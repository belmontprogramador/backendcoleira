// Adds `count: jest.fn(),` after `list: jest.fn(),` in NfcTagRepositoryPort full mocks.
const fs = require('fs');
const path = require('path');

const files = [
  'src/modules/contact/application/use-cases/__tests__/send-contact-message.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/generate-batch-sheet.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/generate-tags.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/get-next-tag-to-write.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/mark-tag-available.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/report-nfc-write.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/reprint-code.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/reset-tag.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/verify-qr-list.use-case.spec.ts',
  'src/modules/nfc/application/use-cases/__tests__/write-nfc.use-case.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/activate-tag-by-code.use-case.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/activate-tag.use-case.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/associate-disassociate-pet.use-case.spec.ts',
  'src/modules/ownership/application/use-cases/__tests__/transfer.use-case.spec.ts',
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
  if (/count:\s*jest\.fn\(\)/.test(src)) {
    console.log('SKIP (already has count):', rel);
    continue;
  }
  // Insert `count` after the `list:` mock line (keeps indentation).
  const out = src.replace(/(\n(\s*)list:\s*jest\.fn\(\),)/, `$1\n$2count: jest.fn(),`);
  if (out === src) {
    console.log('NO MATCH:', rel);
    continue;
  }
  fs.writeFileSync(p, out, 'utf8');
  changed++;
  console.log('OK:', rel);
}
console.log(`\nChanged ${changed} files.`);
