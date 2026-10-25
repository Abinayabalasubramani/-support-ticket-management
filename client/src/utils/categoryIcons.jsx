import { Bug, BookOpen, GitPullRequest, ListChecks, Tag } from 'lucide-react';

const ICONS = {
  'Change Request': GitPullRequest,
  Bug,
  Task: ListChecks,
  Story: BookOpen,
};

// Falls back to a tag icon for any category added later.
export default function CategoryIcon({ name, className = 'h-4 w-4' }) {
  const Icon = ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}
