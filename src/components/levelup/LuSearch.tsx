import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogPanel,
} from '@headlessui/react';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import MagnifyingGlassIcon from '~icons/heroicons/magnifying-glass-20-solid';

type Doc = {
  title: string;
  summary: string;
  section: string;
  url: string;
  body: string;
};

export default function LuSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const fetched = useRef(false);

  // Lazy-load the index the first time search opens
  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;
    fetch('/search.json')
      .then((r) => r.json())
      .then((data: Doc[]) => setDocs(data))
      .catch((err) => console.error('search index failed', err));
  }, [open]);

  // Global open triggers: custom event + "/" or Cmd/Ctrl-K
  useEffect(() => {
    const openSearch = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('lu-open-search', openSearch);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('lu-open-search', openSearch);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'summary', weight: 2 },
          { name: 'section', weight: 1 },
          { name: 'body', weight: 0.5 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [docs]
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return fuse.search(q, { limit: 20 }).map((r) => r.item);
  }, [query, fuse]);

  return (
    <Dialog
      className="relative z-100"
      open={open}
      onClose={() => {
        setOpen(false);
        setQuery('');
      }}
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel className="mx-auto max-w-xl overflow-hidden bg-white shadow-2xl ring-1 ring-black/10">
          <Combobox
            onChange={(item: Doc | null) => {
              if (item) window.location.href = item.url;
            }}
          >
            <div className="relative border-b border-gray-100">
              <MagnifyingGlassIcon
                class="pointer-events-none absolute top-3.5 left-4 size-5 text-gray-400"
                aria-hidden="true"
              />
              <ComboboxInput
                autoFocus
                className="h-12 w-full border-0 bg-white pr-4 pl-12 text-base text-gray-900 outline-hidden placeholder:text-gray-400 focus:ring-0"
                placeholder="Search LevelUp…"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {results.length > 0 && (
              <ComboboxOptions
                static
                as="ul"
                className="max-h-96 overflow-y-auto py-2"
              >
                {results.map((item) => (
                  <ComboboxOption
                    as="li"
                    key={item.url}
                    value={item}
                    className="cursor-pointer px-4 py-2 select-none data-focus:bg-secondary-50"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif font-bold text-secondary-600">
                        {item.title}
                      </span>
                      {item.section && (
                        <span className="shrink-0 text-xs text-primary-500">
                          {item.section}
                        </span>
                      )}
                    </div>
                    {item.summary && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                        {item.summary}
                      </p>
                    )}
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            )}

            {query.trim().length >= 2 && results.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No results for “{query}”.
              </p>
            )}

            {query.trim().length < 2 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                Search the curriculum, guides, and news. Press{' '}
                <kbd className="border border-gray-300 px-1">/</kbd> any
                time to search.
              </p>
            )}
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
