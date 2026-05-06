import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function getRichText(richText) {
  return richText?.map(t => t.plain_text).join('') || '';
}

function parseBlocks(blocks) {
  const lines = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading_1':
        lines.push({ type: 'h1', text: getRichText(block.heading_1.rich_text) });
        break;
      case 'heading_2':
        lines.push({ type: 'h2', text: getRichText(block.heading_2.rich_text) });
        break;
      case 'heading_3':
        lines.push({ type: 'h3', text: getRichText(block.heading_3.rich_text) });
        break;
      case 'paragraph':
        const text = getRichText(block.paragraph.rich_text);
        if (text) lines.push({ type: 'p', text });
        break;
      case 'bulleted_list_item':
        lines.push({ type: 'bullet', text: getRichText(block.bulleted_list_item.rich_text) });
        break;
      case 'numbered_list_item':
        lines.push({ type: 'num', text: getRichText(block.numbered_list_item.rich_text) });
        break;
      case 'divider':
        lines.push({ type: 'divider' });
        break;
      case 'quote':
        lines.push({ type: 'quote', text: getRichText(block.quote.rich_text) });
        break;
      case 'callout':
        lines.push({ type: 'callout', text: getRichText(block.callout.rich_text) });
        break;
      default:
        break;
    }
  }
  return lines;
}

async function findStandupPage(dateStr) {
  const query = `STANDUP ${dateStr}`;
  const res = await notion.search({
    query,
    filter: { property: 'object', value: 'page' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size: 5,
  });
  return res.results.find(p =>
    p.properties?.title?.title?.[0]?.plain_text?.startsWith('STANDUP')
  ) || res.results[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try today first, then fall back to most recent
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let page = await findStandupPage(todayStr);
    let isFallback = false;

    if (!page) {
      // Search broadly for any recent standup
      const fallback = await notion.search({
        query: 'STANDUP',
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 1,
      });
      page = fallback.results[0] || null;
      isFallback = !!page;
    }

    if (!page) {
      return res.status(404).json({
        error: 'No standup found',
        message: 'The standup has not been generated yet. Check back after 9am.'
      });
    }

    // Fetch blocks
    const blocksRes = await notion.blocks.children.list({
      block_id: page.id,
      page_size: 100,
    });

    const blocks = parseBlocks(blocksRes.results);
    const title = page.properties?.title?.title?.[0]?.plain_text || `STANDUP ${todayStr}`;
    const lastEdited = page.last_edited_time;

    return res.status(200).json({
      title,
      blocks,
      lastEdited,
      pageId: page.id,
      isFallback,
      isToday: title.includes(todayStr),
    });

  } catch (err) {
    console.error('Notion error:', err);
    return res.status(500).json({ error: 'Failed to fetch standup', detail: err.message });
  }
}
