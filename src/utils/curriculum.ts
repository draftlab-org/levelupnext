import { type CollectionEntry, getCollection } from 'astro:content';

export type CurriculumEntry = CollectionEntry<'curriculum'>;

export interface TreeNode {
  entry: CurriculumEntry;
  href: string;
  title: string;
  weight: number;
  hide: boolean;
  children: TreeNode[];
}

export interface Crumb {
  label: string;
  href: string;
  active: boolean;
}

/** Normalize a permalink to a leading+trailing-slashed path. */
export function normalizePermalink(permalink: string): string {
  let p = permalink.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p = `${p}/`;
  return p;
}

/** The URL of the parent page (one path segment up), or null for top level. */
function parentHref(href: string): string | null {
  const segs = href.split('/').filter(Boolean);
  if (segs.length <= 1) return null;
  return `/${segs.slice(0, -1).join('/')}/`;
}

const weightOf = (e: CurriculumEntry) =>
  typeof e.data.weight === 'number' ? e.data.weight : 999;

/** Load every curriculum page (published + archived; drafts only in dev). */
export async function getCurriculum(): Promise<CurriculumEntry[]> {
  const entries = await getCollection('curriculum');
  const isDev = import.meta.env.DEV || !!import.meta.env.PUBLIC_PREVIEW;
  return entries.filter((e) => {
    const status = e.data.status ?? 'published';
    if (status === 'draft') return isDev;
    return true;
  });
}

/** Map permalink -> entry, for fast lookups. */
export async function getPermalinkMap(): Promise<Map<string, CurriculumEntry>> {
  const entries = await getCurriculum();
  const map = new Map<string, CurriculumEntry>();
  for (const e of entries) map.set(normalizePermalink(e.data.permalink), e);
  return map;
}

/**
 * Build the navigation tree from URL structure (mirrors the original Jekyll
 * navigation include). A page is attached to the nearest ancestor page that
 * exists; ADIDS session pages (which have no intermediate index page) are not
 * part of the tree — they're reached from their module's session lists.
 */
export async function getNavTree(
  opts: { includeHidden?: boolean } = {}
): Promise<TreeNode[]> {
  const { includeHidden = false } = opts;
  const entries = await getCurriculum();

  const nodes = new Map<string, TreeNode>();
  for (const entry of entries) {
    const href = normalizePermalink(entry.data.permalink);
    nodes.set(href, {
      entry,
      href,
      title: entry.data.title,
      weight: weightOf(entry),
      hide: entry.data.hide ?? false,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    if (!includeHidden && node.hide) continue;
    const parent = parentHref(node.href);
    const parentNode = parent ? nodes.get(parent) : null;
    if (parentNode && (includeHidden || !parentNode.hide)) {
      parentNode.children.push(node);
    } else if (!parent) {
      roots.push(node);
    }
  }

  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.weight - b.weight || a.title.localeCompare(b.title));
    for (const n of list) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

/**
 * Direct children of a section-index page, matched by the child's `parent`
 * field equalling this page's title (mirrors the page-index / curriculum
 * Jekyll layouts). Returns entries sorted by weight then title.
 */
export async function getSectionChildren(
  parentTitle: string
): Promise<CurriculumEntry[]> {
  const entries = await getCurriculum();
  return entries
    .filter((e) => e.data.parent === parentTitle && !e.data.hide)
    .sort((a, b) => weightOf(a) - weightOf(b) || a.data.title.localeCompare(b.data.title));
}

/**
 * Breadcrumb trail for a page: Home + every ancestor page that exists + self.
 * Missing intermediate levels (e.g. ADIDS category folders) are skipped, as in
 * the original site.
 */
export async function getBreadcrumb(entry: CurriculumEntry): Promise<Crumb[]> {
  const map = await getPermalinkMap();
  const href = normalizePermalink(entry.data.permalink);
  const segs = href.split('/').filter(Boolean);

  const crumbs: Crumb[] = [{ label: 'Home', href: '/', active: false }];
  for (let i = 1; i <= segs.length; i++) {
    const prefix = `/${segs.slice(0, i).join('/')}/`;
    const found = map.get(prefix);
    if (!found) continue;
    crumbs.push({
      label: found.data.breadcrumb || found.data.title,
      href: prefix,
      active: prefix === href,
    });
  }
  return crumbs;
}
