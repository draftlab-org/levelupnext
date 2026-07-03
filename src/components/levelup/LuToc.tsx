import { useEffect, useState } from 'react';

// Same shape as Scaffold's TocEntry (@utils/renderMarkdown).
export interface TocEntry {
  id: string;
  value: string;
  depth: number;
  children?: TocEntry[];
}

// Flatten for the intersection observer (plumbing reused from Scaffold's TOC.tsx)
function flattenEntries(entries: TocEntry[]): TocEntry[] {
  const flattened: TocEntry[] = [];
  for (const entry of entries) {
    flattened.push(entry);
    if (entry.children) flattened.push(...flattenEntries(entry.children));
  }
  return flattened;
}

function TOCEntries({
  entries,
  activeId,
  depth = 0,
  onEntryClick,
}: {
  entries: TocEntry[];
  activeId: string | null;
  depth?: number;
  onEntryClick: (id: string) => void;
}) {
  return (
    <ul className={depth > 0 ? 'mt-1 ml-3' : 'space-y-1'}>
      {entries.map((entry) => {
        const isActive = activeId === entry.id;
        return (
          <li key={entry.id} className="mt-1">
            <button
              type="button"
              onClick={() => onEntryClick(entry.id)}
              className={[
                'block w-full cursor-pointer border-l-2 py-0.5 pl-3 text-left text-sm leading-snug transition-colors',
                isActive
                  ? 'border-primary-500 font-semibold text-primary-600'
                  : 'border-transparent text-secondary-700/80 hover:border-secondary-300 hover:text-secondary-800',
              ].join(' ')}
            >
              {entry.value}
            </button>
            {entry.children && entry.children.length > 0 && (
              <TOCEntries
                entries={entry.children}
                activeId={activeId}
                depth={depth + 1}
                onEntryClick={onEntryClick}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function LuToc({
  entries,
  title = 'On this page',
}: {
  entries: TocEntry[];
  title?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const flat = flattenEntries(entries);
    const ids = flat.map((e) => e.id);

    const observer = new IntersectionObserver(
      (observed) => {
        for (const o of observed) {
          if (o.isIntersecting) {
            setActiveId(o.target.id);
            break;
          }
        }
      },
      { rootMargin: '-18px 0px -70% 0px', threshold: 0 }
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  const handleEntryClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveId(id);
      history.replaceState(null, '', `#${id}`);
    }
  };

  if (entries.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto bg-white px-5 py-10"
    >
      <p className="mb-3 font-serif text-xs font-bold tracking-widest text-secondary-600 uppercase">
        {title}
      </p>
      <TOCEntries
        entries={entries}
        activeId={activeId}
        onEntryClick={handleEntryClick}
      />
    </nav>
  );
}
