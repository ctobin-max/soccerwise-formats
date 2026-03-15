export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;
  const DB_ID = '3171bd3d-e5f3-8068-8ca7-000b26222438';

  const SYSTEM = `You are a Notion API assistant. Use the Notion MCP tool to perform database operations on the Recurring Formats database (data source ID: ${DB_ID}). Always respond with ONLY a raw JSON object — no markdown, no explanation.`;

  let userMessage;

  if (action === 'list') {
    userMessage = `Query all pages in the Recurring Formats data source (ID: ${DB_ID}). Return a JSON array of all non-archived pages. For each page include: id, name (Format Name title), status (Status select), day (Day of Week select), time (Post Time text), frequency (Frequency select), platforms (Platform multi-select as string array), goal (Goal select). Exclude any page whose name contains "TEMPLATE". Return format: {"formats": [...]}`;
  } else if (action === 'create') {
    const { name, day, time, frequency, platforms, goal, status } = payload;
    userMessage = `Create a new page in the Recurring Formats data source (ID: ${DB_ID}) with these properties: Format Name = "${name}", Status = "${status || 'Active'}", Day of Week = "${day}", Post Time = "${time}", Frequency = "${frequency}", Platform = [${platforms.map(p => `"${p}"`).join(',')}], Goal = "${goal}". Return: {"success": true, "id": "<page_id>"}`;
  } else if (action === 'update') {
    const { id, name, day, time, frequency, platforms, goal, status } = payload;
    userMessage = `Update the Notion page with ID "${id}". Set: Format Name = "${name}", Status = "${status}", Day of Week = "${day}", Post Time = "${time}", Frequency = "${frequency}", Platform = [${platforms.map(p => `"${p}"`).join(',')}], Goal = "${goal}". Return: {"success": true}`;
  } else if (action === 'delete') {
    const { id } = payload;
    userMessage = `Archive (delete) the Notion page with ID "${id}". Return: {"success": true}`;
  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
        mcp_servers: [{ type: 'url', url: 'https://mcp.notion.com/mcp', name: 'notion-mcp' }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(200).json({ error: `API error: ${data.error?.message || JSON.stringify(data)}` });

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) return res.status(200).json({ error: 'No JSON in response', raw: text });

    const result = JSON.parse(match[1]);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ error: `Server error: ${err.message}` });
  }
}
