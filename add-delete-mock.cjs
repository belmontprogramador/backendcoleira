// add-delete-mock.cjs — adiciona `delete`/`deleteByBatch` aos mocks dos ports
// de NFC, para os specs compilarem após a adição dos métodos nos ports.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'src');

function fixFile(p) {
  const c = fs.readFileSync(p, 'utf8');
  const batchVar = (c.match(/\b(\w+)\s*:\s*jest\.Mocked<BatchRepositoryPort>/) || [])[1];
  const tagVar = (c.match(/\b(\w+)\s*:\s*jest\.Mocked<NfcTagRepositoryPort>/) || [])[1];
  if (!batchVar && !tagVar) return false;

  const lines = c.split('\n');
  let changed = false;

  function insert(varName, method) {
    const openRe = new RegExp('^\\s*(?:const\\s+)?' + varName + '\\b[^\\n]*=\\s*\\{\\s*$');
    let openIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (openRe.test(lines[i])) { openIdx = i; break; }
    }
    if (openIdx < 0) {
      console.log('  !! não achou abertura para ' + varName + ' em ' + p);
      return false;
    }
    const indent = lines[openIdx].match(/^\s*/)[0];
    const esc = indent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const closeRe = new RegExp('^' + esc + '\\}\\s*,?\\s*$');
    for (let i = openIdx + 1; i < lines.length; i++) {
      if (closeRe.test(lines[i])) {
        lines.splice(i, 0, indent + '  ' + method);
        return true;
      }
    }
    console.log('  !! não achou fechamento para ' + varName + ' em ' + p);
    return false;
  }

  if (batchVar && insert(batchVar, 'delete: jest.fn(),')) changed = true;
  if (tagVar && insert(tagVar, 'deleteByBatch: jest.fn(),')) changed = true;

  if (changed) fs.writeFileSync(p, lines.join('\n'));
  return changed;
}

let count = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.spec.ts')) {
      if (fixFile(p)) { count++; console.log('fixed: ' + p.replace(root + path.sep, '')); }
    }
  }
}
walk(root);
console.log('total fixed: ' + count);
