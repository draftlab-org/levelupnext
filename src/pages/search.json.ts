import { getCollection } from 'astro:content';
import { getCurriculum, normalizePermalink } from '@utils/curriculum';
import type { APIRoute } from 'astro';
import { isVisible } from '@utils/content';

/** Rough plain-text extraction from markdown/HTML for full-text search. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/<[^>]+>/g, ' ') // html tags
    .replace(/[#>*_`~|-]+/g, ' ') // md symbols
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

// Map top-level path segment -> human section label
const SECTION_LABELS: Record<string, string> = {
  curriculum: "Trainers' Curriculum",
  'before-an-event': 'Before an Event',
  'after-an-event': 'After an Event',
  'you-the-trainer': 'You, The Trainer',
  community: 'Community',
  news: 'News & Updates',
};

export const GET: APIRoute = async () => {
  const entries = await getCurriculum();

  const curriculumDocs = entries.map((e) => {
    const url = normalizePermalink(e.data.permalink);
    const section = url.split('/').filter(Boolean)[0] ?? '';
    return {
      title: e.data.title,
      summary: e.data.summary ?? '',
      section: SECTION_LABELS[section] ?? '',
      url,
      body: toPlainText(e.body ?? ''),
    };
  });

  const articles = (await getCollection('articles'))
    .filter((a) => isVisible(a))
    .map((a) => ({
      title: a.data.title,
      summary: a.data.excerpt ?? '',
      section: 'News & Updates',
      url: a.data.permalink,
      body: toPlainText(a.body ?? ''),
    }));

  const docs = [...curriculumDocs, ...articles];

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json' },
  });
};
