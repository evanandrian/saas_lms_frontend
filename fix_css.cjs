const fs = require('fs');
let content = fs.readFileSync('src/lib/features/payments/PaymentConsole.svelte', 'utf8');

const mapping = {
  'var(--card)': 'var(--color-lms-surface)',
  'var(--card2)': 'var(--color-lms-surface-muted)',
  'var(--soft)': 'var(--color-lms-surface-muted)',
  'var(--line)': 'var(--color-lms-border)',
  'var(--line2)': 'var(--color-lms-border-strong)',
  'var(--ink)': 'var(--color-lms-foreground)',
  'var(--muted)': 'var(--color-lms-muted)',
  'var(--faint)': 'var(--color-lms-muted)',
  '#4169E1': 'var(--color-lms-interactive)'
};

for (const [k, v] of Object.entries(mapping)) {
  content = content.split(k).join(v);
}

fs.writeFileSync('src/lib/features/payments/PaymentConsole.svelte', content);
console.log('Done replacing CSS vars');
