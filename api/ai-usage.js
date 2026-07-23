const DEFAULT_OPENCODE_WORKSPACE_ID = 'wrk_01KWYHQ06WTW00CA0RFP7AK07Q';

function parseOpenCodeUsage(text) {
  const match = text.match(/rollingUsage:[^{]*({[^}]+}),weeklyUsage:[^{]*({[^}]+}),monthlyUsage:[^{]*({[^}]+})/);
  if (!match) {
    throw new Error('OpenCode response did not contain usage blocks');
  }

  const parseProps = (str) => {
    const status = str.match(/status:"([^"]+)"/)?.[1] || 'ok';
    const resetInSec = Number.parseInt(str.match(/resetInSec:(\d+)/)?.[1] || '0', 10);
    const usagePercent = Number.parseInt(str.match(/usagePercent:(\d+)/)?.[1] || '0', 10);
    return { status, resetInSec, usagePercent };
  };

  return {
    rollingUsage: parseProps(match[1]),
    weeklyUsage: parseProps(match[2]),
    monthlyUsage: parseProps(match[3]),
  };
}

async function fetchOpenCodeUsage() {
  const cookie = process.env.OPENCODE_COOKIE;
  if (!cookie) {
    throw new Error('Missing OPENCODE_COOKIE');
  }

  const workspaceId = process.env.OPENCODE_WORKSPACE_ID || DEFAULT_OPENCODE_WORKSPACE_ID;
  const response = await fetch(`https://opencode.ai/workspace/${workspaceId}/go`, {
    headers: {
      Cookie: cookie,
      Referer: process.env.OPENCODE_REFERER || 'https://accounts.google.com/',
      'User-Agent': process.env.OPENCODE_USER_AGENT || 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenCode ${response.status}: ${text.slice(0, 200)}`);
  }

  const text = await response.text();
  return parseOpenCodeUsage(text);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const payload = {};
  const errors = [];

  try {
    Object.assign(payload, await fetchOpenCodeUsage());
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'OpenCode request failed');
  }

  if (Object.keys(payload).length === 0) {
    return res.status(502).json({
      error: 'Could not load any usage data',
      errors,
    });
  }

  return res.status(errors.length ? 207 : 200).json({
    ...payload,
    errors,
  });
}
