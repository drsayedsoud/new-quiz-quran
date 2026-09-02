// Build step (runs on Vercel via `npm run build` and locally): splits quran.zip into one small zip per category
// under data/, plus data/manifest.json with a version hash so clients only re-download what changed.
// No dependencies: minimal zip reader/writer on top of Node's zlib.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const src = path.join(root, 'quran.zip');
const outDir = path.join(root, 'data');

// ---------- minimal zip reader (first entry, deflate or stored) ----------
function readFirstEntry(buf) {
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error('not a zip file');
    const cdOffset = buf.readUInt32LE(eocd + 16);
    const method = buf.readUInt16LE(cdOffset + 10);
    const compSize = buf.readUInt32LE(cdOffset + 20);
    const nameLen = buf.readUInt16LE(cdOffset + 28);
    const extraLen = buf.readUInt16LE(cdOffset + 30);
    const commentLen = buf.readUInt16LE(cdOffset + 32);
    const localOffset = buf.readUInt32LE(cdOffset + 42);
    const name = buf.slice(cdOffset + 46, cdOffset + 46 + nameLen).toString();
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    void extraLen; void commentLen;
    return { name, data: method === 8 ? zlib.inflateRawSync(data) : data };
}

// ---------- minimal zip writer (single deflated entry) ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function writeZip(entryName, content) {
    const nameBuf = Buffer.from(entryName);
    const deflated = zlib.deflateRawSync(content, { level: 9 });
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(content.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34); central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38); central.writeUInt32LE(0, 42);
    const cdOffset = local.length + nameBuf.length + deflated.length;
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(central.length + nameBuf.length, 12); eocd.writeUInt32LE(cdOffset, 16); eocd.writeUInt16LE(0, 20);
    return Buffer.concat([local, nameBuf, deflated, central, nameBuf, eocd]);
}

// ---------- split ----------
const zipBuf = fs.readFileSync(src);
const version = crypto.createHash('sha1').update(zipBuf).digest('hex').slice(0, 10);
const bank = JSON.parse(readFirstEntry(zipBuf).data.toString('utf8'));
fs.mkdirSync(outDir, { recursive: true });
const manifest = { version, builtAt: new Date().toISOString(), categories: {} };
for (const [cat, items] of Object.entries(bank)) {
    if (!Array.isArray(items)) continue;
    const json = Buffer.from(JSON.stringify(items));
    const zip = writeZip(cat + '.json', json);
    fs.writeFileSync(path.join(outDir, cat + '.zip'), zip);
    manifest.categories[cat] = { count: items.length, bytes: zip.length };
    console.log(`${cat}: ${items.length} questions -> ${(zip.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest));
console.log('manifest version', version);
