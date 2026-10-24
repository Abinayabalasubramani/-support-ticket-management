import { Code, Lightbulb, MessageSquare, Receipt, ShieldCheck, Tag } from 'lucide-react';

const ICONS = {
  Billing: Receipt,
  Technical: Code,
  Account: ShieldCheck,
  'Feature Request': Lightbulb,
  General: MessageSquare,
};

// Falls back to a tag icon for any category added later.
export default function CategoryIcon({ name, className = 'h-4 w-4' }) {
  const Icon = ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}
