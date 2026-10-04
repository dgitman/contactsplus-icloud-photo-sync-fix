// Pure conversion for Make Code. No network, filesystem, or credentials.
function convert(input) {
  const text = value => {
    if (value == null) return '';
    if (typeof value !== 'string' || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))
      throw new Error('Invalid text value');
    return value;
  };
  const escape = value => text(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const fold = line => {
    let out = '', width = 0;
    for (const ch of line) {
      const size = Buffer.byteLength(ch, 'utf8');
      if (width + size > 75) { out += '\r\n '; width = 1; }
      out += ch; width += size;
    }
    return out;
  };
  const uid = text(input.uid);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('A safe stable target UID is required');
  const data = typeof input.contactData === 'string' ? JSON.parse(input.contactData) : input.contactData;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('contactData must be an object');
  const nameLines = () => {
    const n = data.name;
    if (!n || typeof n !== 'object' || Array.isArray(n)) throw new Error('Structured name required');
    const keys = ['familyName','givenName','middleName','prefix','suffix'];
    if (Object.keys(n).some(k => !keys.includes(k) && n[k])) throw new Error('Unsupported name component');
    const fn = ['prefix','givenName','middleName','familyName','suffix'].map(k=>text(n[k])).filter(Boolean).join(' ');
    if (!fn.trim()) throw new Error('Nonempty name required');
    return ['N:' + keys.map(k=>escape(n[k])).join(';'), 'FN:' + escape(fn)];
  };
  if (input.mode === 'patch-name-notes') {
    const prior = text(input.existingVcard);
    if (/\r(?!\n)|(?<!\r)\n/.test(prior) || !prior.endsWith('\r\n')) throw new Error('Expected CRLF vCard');
    const physical = prior.slice(0,-2).split('\r\n');
    const records = [];
    for (const line of physical) {
      if (/^[ \t]/.test(line)) {
        if (!records.length) throw new Error('Invalid folding');
        records[records.length-1].raw += '\r\n' + line;
        records[records.length-1].logical += line.slice(1);
      } else records.push({raw:line,logical:line});
    }
    const logical = records.map(r=>r.logical);
    if (logical[0] !== 'BEGIN:VCARD' || logical.at(-1) !== 'END:VCARD' || logical.filter(l=>l==='BEGIN:VCARD').length !== 1 || logical.filter(l=>l==='END:VCARD').length !== 1 || logical.filter(l=>l==='VERSION:3.0').length !== 1)
      throw new Error('Expected one vCard 3.0');
    if (logical.filter(l=>/^UID[;:]/i.test(l)).length !== 1 || !logical.includes('UID:'+uid)) throw new Error('Target UID mismatch');
    const requested = Object.keys(data);
    if (!requested.length || requested.some(k=>!['name','notes'].includes(k))) throw new Error('Patch supports only explicit name and notes');
    const replace = new Set(requested.flatMap(k=>k==='name'?['N','FN']:['NOTE']));
    const kept = records.filter(r=> {
      const head = r.logical.split(':')[0];
      const prop = head.split(';')[0].split('.').at(-1).toUpperCase();
      if (replace.has(prop) && (head.includes(';') || head.includes('.'))) throw new Error('Qualified managed property needs manual handling');
      return !replace.has(prop);
    }).map(r=>r.raw);
    const additions = [...(requested.includes('name')?nameLines():[]), ...(requested.includes('notes')?['NOTE:'+escape(data.notes)]:[])];
    kept.splice(kept.length-1,0,...additions.map(fold));
    return {vcard:kept.join('\r\n')+'\r\n',uid,mode:input.mode};
  }
  if (input.mode !== 'create') throw new Error('Explicit create or patch-name-notes mode required');
  const allowed = ['name','notes','emails','phoneNumbers'];
  if (Object.keys(data).some(k=>!allowed.includes(k) && data[k] != null && data[k] !== '' && !(Array.isArray(data[k]) && !data[k].length)))
    throw new Error('Unsupported populated field; do not drop source data');
  const lines = ['BEGIN:VCARD','VERSION:3.0','UID:'+uid,...nameLines()];
  for (const [key,property,types] of [['emails','EMAIL',['HOME','WORK','INTERNET']],['phoneNumbers','TEL',['HOME','WORK','CELL','VOICE','FAX','PAGER']]]) {
    const entries = data[key] ?? [];
    if (!Array.isArray(entries)) throw new Error('Expected contact value array');
    for (const e of entries) {
      if (!e || Object.keys(e).some(k=>!['type','value'].includes(k))) throw new Error('Unsupported contact value field');
      const value = text(e.value);
      if (!value || /[\r\n]/.test(value)) throw new Error('Invalid email or phone');
      const label = text(e.type).toUpperCase();
      if (label && !types.includes(label)) throw new Error('Unsupported label');
      lines.push(property+(label?';TYPE='+label:'')+':'+escape(value));
    }
  }
  if (Object.hasOwn(data,'notes')) lines.push('NOTE:'+escape(data.notes));
  lines.push('END:VCARD');
  return {vcard:lines.map(fold).join('\r\n')+'\r\n',uid,mode:input.mode};
}
module.exports = convert;
