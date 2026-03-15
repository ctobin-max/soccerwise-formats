export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const NOTION_TOKEN = 'secret_ntn_G74699176835ZT1zcg9YuAepDAnMA0SSDuZjTtX1Wo93CH';
  const DB_ID = '3171bd3de5f380eca9ddf62c894e12e8';

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const { action, payload } = req.body;

  try {
    if (action === 'list') {
      const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ page_size: 100 }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(200).json({ error: `Notion ${r.status}: ${d.message || d.code}` });

      const formats = (d.results || [])
        .filter(p => !p.archived && !p.in_trash)
        .map(p => ({
          id: p.id,
          name: p.properties['Format Name']?.title?.[0]?.plain_text || '',
          status: p.properties['Status']?.select?.name || '',
          day: p.properties['Day of Week']?.select?.name || '',
          time: p.properties['Post Time']?.rich_text?.[0]?.plain_text || '',
          frequency: p.properties['Frequency']?.select?.name || '',
          platforms: p.properties['Platform']?.multi_select?.map(s => s.name) || [],
          goal: p.properties['Goal']?.select?.name || '',
        }))
        .filter(f => f.name && !f.name.includes('TEMPLATE'));

      return res.status(200).json({ formats });
    }

    if (action === 'create') {
      const { name, day, time, frequency, platforms, goal, status } = payload;
      const r = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: DB_ID },
          properties: {
            'Format Name': { title: [{ text: { content: name } }] },
            'Status': { select: { name: status || 'Active' } },
            'Day of Week': { select: { name: day } },
            'Post Time': { rich_text: [{ text: { content: time } }] },
            'Frequency': { select: { name: frequency } },
            'Platform': { multi_select: platforms.map(p => ({ name: p })) },
            'Goal': { select: { name: goal } },
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(200).json({ error: `Notion ${r.status}: ${d.message || d.code}` });
      return res.status(200).json({ success: true, id: d.id });
    }

    if (action === 'update') {
      const { id, name, day, time, frequency, platforms, goal, status } = payload;
      const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: {
            'Format Name': { title: [{ text: { content: name } }] },
            'Status': { select: { name: status } },
            'Day of Week': { select: { name: day } },
            'Post Time': { rich_text: [{ text: { content: time } }] },
            'Frequency': { select: { name: frequency } },
            'Platform': { multi_select: platforms.map(p => ({ name: p })) },
            'Goal': { select: { name: goal } },
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(200).json({ error: `Notion ${r.status}: ${d.message || d.code}` });
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const { id } = payload;
      const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ archived: true }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(200).json({ error: `Notion ${r.status}: ${d.message || d.code}` });
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    return res.status(200).json({ error: `Server error: ${err.message}` });
  }
}
