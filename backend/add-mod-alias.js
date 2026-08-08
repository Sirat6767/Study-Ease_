/**
 * Add mod@studyease.com convenience alias for demo login
 * Run ONCE: node add-mod-alias.js
 * This creates a new user mod@studyease.com that maps to SSTU university moderator role.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const EMAIL    = 'mod@studyease.com';
  const PASSWORD = 'Mod@12345';

  // 1. Create in auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log(`✅ ${EMAIL} already exists — no action needed.`);
      return;
    }
    throw authError;
  }

  const userId = authData.user.id;

  // 2. Insert into users table
  await supabase.from('users').insert({ id: userId, email: EMAIL, role: 'university_moderator' });

  // 3. Personal info
  await supabase.from('personal_info').insert({ user_id: userId, name: 'Demo Moderator (SSTU)' });

  // 4. Get SSTU university_id
  const { data: uni } = await supabase.from('universities').select('id, university_code').eq('university_code', 'SSTU').single();
  if (!uni) { console.error('SSTU university not found. Run seed.js first.'); return; }

  // 5. Link to SSTU
  await supabase.from('university_moderators').insert({ user_id: userId, university_id: uni.id });

  console.log(`✅ Created ${EMAIL} / ${PASSWORD} as SSTU university moderator.`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
