import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lubgbnmrpwlhgtpvuqjs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_47xIXHU0czlGHtepYWSjBw_H1QQWH7O';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, parent_id, active, display_order')
      .eq('active', true)
      .order('display_order');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('CATEGORIES IN YOUR DATABASE');
    console.log('═══════════════════════════════════════════════════\n');

    const parents = data.filter(c => !c.parent_id);
    const subs = data.filter(c => c.parent_id);

    parents.forEach(parent => {
      console.log(`📁 ${parent.name.toUpperCase()}`);
      console.log(`   ID: ${parent.id}`);

      const children = subs.filter(s => s.parent_id === parent.id);
      if (children.length > 0) {
        children.forEach(child => {
          console.log(`   └─ ${child.name}`);
          console.log(`      ID: ${child.id}`);
        });
      }
      console.log();
    });

    console.log('═══════════════════════════════════════════════════');
    console.log(`Total: ${data.length} categories (${parents.length} main, ${subs.length} sub)\n`);

  } catch (error) {
    console.error('Connection error:', error);
  }
}

getCategories();
