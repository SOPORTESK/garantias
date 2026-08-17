import fs from 'fs';

const OLD_URL = 'https://jwlavcjwuhdydmusqskx.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bGF2Y2p3dWhkeWRtdXNxc2t4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA4MzY5NywiZXhwIjoyMDkwNjU5Njk3fQ.241B55K2t9WssEBBCVcLN_VdU15SXV9Gs9sBrM71d3U';

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
  return "'" + String(v).replace(/'/g, "''").replace(/\n/g, ' ') + "'";
}

async function fetchAll(table) {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${OLD_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=1000`, {
      headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` },
    });
    const rows = await res.json();
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  const dir = 'C:\\Users\\Taller SK\\Documents\\PROYECTOS\\garantias\\respaldo';

  // Auth users
  const authRes = await fetch(`${OLD_URL}/auth/v1/admin/users`, {
    headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` },
  });
  const authData = await authRes.json();
  const users = authData.users || [];
  let authSql = '-- Auth users backup\n';
  for (const u of users) {
    authSql += `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud, instance_id, raw_user_meta_data) VALUES\n`;
    authSql += `  ('${u.id}', '${u.email}', '${u.encrypted_password}', '${u.email_confirmed_at}', '${u.created_at}', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '${JSON.stringify(u.user_metadata).replace(/'/g, "''")}'::jsonb);\n`;
  }
  fs.writeFileSync(`${dir}\\backup_auth_users.sql`, authSql);
  console.log(`Auth users: ${users.length} saved`);

  // Perfiles
  const perfiles = await fetchAll('perfiles');
  const pCols = Object.keys(perfiles[0]);
  let pSql = `DELETE FROM perfiles;\nINSERT INTO perfiles (${pCols.join(', ')}) VALUES\n`;
  pSql += perfiles.map(row => `  (${pCols.map(c => esc(row[c])).join(', ')})`).join(',\n') + ';\n';
  fs.writeFileSync(`${dir}\\backup_perfiles.sql`, pSql);
  console.log(`Perfiles: ${perfiles.length} saved`);

  // Garantias
  const garantias = await fetchAll('garantias');
  const gCols = Object.keys(garantias[0]);
  let gSql = `DELETE FROM garantias;\nINSERT INTO garantias (${gCols.join(', ')}) VALUES\n`;
  gSql += garantias.map(row => `  (${gCols.map(c => esc(row[c])).join(', ')})`).join(',\n') + ';\n';
  fs.writeFileSync(`${dir}\\backup_garantias.sql`, gSql);
  console.log(`Garantias: ${garantias.length} saved`);

  // Garantias historial
  const hist = await fetchAll('garantias_historial');
  const hCols = Object.keys(hist[0]);
  let hSql = `DELETE FROM garantias_historial;\nINSERT INTO garantias_historial (${hCols.join(', ')}) VALUES\n`;
  hSql += hist.map(row => `  (${hCols.map(c => esc(row[c])).join(', ')})`).join(',\n') + ';\n';
  fs.writeFileSync(`${dir}\\backup_garantias_historial.sql`, hSql);
  console.log(`Garantias historial: ${hist.length} saved`);

  // Inventario
  const inv = await fetchAll('inventario');
  const iCols = Object.keys(inv[0]);
  const partSize = 1000;
  for (let i = 0; i < inv.length; i += partSize) {
    const part = inv.slice(i, i + partSize);
    let iSql = `INSERT INTO inventario (${iCols.join(', ')}) VALUES\n`;
    iSql += part.map(row => `  (${iCols.map(c => esc(row[c])).join(', ')})`).join(',\n') + ';\n';
    const partNum = Math.floor(i / partSize) + 1;
    fs.writeFileSync(`${dir}\\backup_inventario_part${partNum}.sql`, iSql);
    console.log(`Inventario part ${partNum}: ${part.length} saved`);
  }

  console.log('Respaldo completo.');
}

main().catch(e => console.error('Fatal:', e.message));
