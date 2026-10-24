import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const DELAY_MS = 400;

// Typing updates the box instantly, but the search is only sent to the API
// after the user pauses, so we don't fire a request per keystroke.
export default function SearchInput({ value: committed, onCommit }) {
  const [text, setText] = useState(committed);

  // The store value changed from outside (the top-bar search, or "Clear all"): show it here.
  // Our own commits are trimmed copies of what was typed, so they are left alone mid-typing.
  useEffect(() => {
    setText((current) => (current.trim() === committed ? current : committed));
  }, [committed]);

  useEffect(() => {
    if (text.trim() === committed) return undefined;
    const timer = setTimeout(() => onCommit(text.trim()), DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, committed, onCommit]);

  return (
    <div className="relative min-w-[14rem] flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={text}
        maxLength={100}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search tickets…"
        aria-label="Search tickets"
        className="input h-12 pl-10 [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}
