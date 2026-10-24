import { useEffect, useState } from 'react';

const DELAY_MS = 400;

// Typing updates the box instantly, but the search is only sent to the API
// after the user pauses, so we don't fire a request per keystroke.
export default function SearchInput({ value: committed, onCommit }) {
  const [text, setText] = useState(committed);

  // "Clear filters" empties the store value: clear the box too.
  // (Other store changes come from our own commit, so don't overwrite what's being typed.)
  useEffect(() => {
    if (committed === '') setText('');
  }, [committed]);

  useEffect(() => {
    if (text.trim() === committed) return undefined;
    const timer = setTimeout(() => onCommit(text.trim()), DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, committed, onCommit]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={text}
        maxLength={100}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search title or description"
        aria-label="Search tickets"
        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}
