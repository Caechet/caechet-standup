// Live data from Notion — queries all 7 brand calendars
// Called by the frontend on every page load

const BRANDS = [
  { id: "upful-blends",          name: "Upful Blends",          contact: "Chantel",       since: "Aug 2025", slack: "External-UpfulBlends",            dbId: "2e172853cd8c8084bf14d0d85d0d0d84" },
  { id: "les-belles",            name: "Les Belles",             contact: "Cecile",        since: "Aug 2025", slack: "#external-lesbelles",             dbId: "2e172853cd8c80608b2dc0de10b01b31" },
  { id: "love-your-melon",       name: "Love Your Melon",        contact: "Zach",          since: "Jan 2026", slack: "External-loveyourmelon",           dbId: "2e272853cd8c81008bcbdd6e4aa3cb00" },
  { id: "hoodville",             name: "Hoodville",              contact: "Ome",           since: "Apr 2026", slack: "#internal-hoodville",             dbId: "34472853cd8c81e0b865e6de91d43739" },
  { id: "sweet-honey-farm",      name: "Sweet Honey Farm",       contact: "—",             since: "Sep 2025", slack: "—",                               dbId: "2e272853cd8c8047ab8ce79b4766f592" },
  { id: "natural-blessings",     name: "Natural Blessings",      contact: "Shashicka",     since: "Mar 2026", slack: "#external-lff-caechet-retention", dbId: "33b72853cd8c81bab71ac6e1282d395a" },
  { id: "legacy-funded-futures", name: "Legacy Funded Futures",  contact: "Andrew Pires",  since: "Mar 2026", slack: "#external-lff-caechet-retention", dbId: "32c72853cd8c813c8526d31f2a0f82d5" },
];

function getWeekRange() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    today,
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
    todayStr: today.toISOString().split('T')[0],
  };
}

function mapStatus(notionStatus, sendDate, todayStr) {
  const isSent = notionStatus === 'Sent' || notionStatus === 'Archived';
  const isScheduled = notionStatus === 'Scheduled';
  const isReadyToSend = notionStatus === 'Ready to Send';
  const isOnHold = notionStatus === 'On Hold';
  const isPast = sendDate && sendDate < todayStr;
  const isToday = sendDate === todayStr;

  if (isSent) return 'done';
  if (isOnHold) return 'blocked';
  if (isScheduled && isToday) return 'deploy';
  if (isScheduled) return 'prep';
  if (isReadyToSend && isToday) return 'deploy';
  if (isReadyToSend) return 'deploy';
  if (notionStatus === 'In Draft' && isPast) return 'blocked';
  return 'prep';
}

function formatDay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  return `${days[d.getDay()]} ${months[d.getMonth()]}/${d.getDate()}`;
}

async function queryBrandCalendar(brand, headers, weekStart, weekEnd) {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${brand.dbId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          and: [
            { property: 'Send Date', date: { on_or_after: weekStart } },
            { property: 'Send Date', date: { on_or_before: weekEnd } },
          ]
        },
        sorts: [{ property: 'Send Date', direction: 'ascending' }],
        page_size: 20,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();

    return data.results.map(page => ({
      name: page.properties['Email Name']?.title?.[0]?.plain_text || 'Untitled',
      sendDate: page.properties['Send Date']?.date?.start || null,
      status: page.properties['Status']?.status?.name || 'Planned',
      phase: page.properties['Phase']?.select?.name || null,
      subject: page.properties['Subject Line']?.rich_text?.[0]?.plain_text || null,
      tool: page.properties['Tool Used']?.select?.name || null,
      brand: brand.name,
      brandId: brand.id,
    }));
  } catch {
    return [];
  }
}

function determineBrandStatus(campaigns, todayStr) {
  const today = campaigns.filter(c => c.sendDate === todayStr);
  const deploying = today.filter(c => c.appStatus === 'deploy');
  const blocked = campaigns.filter(c => c.appStatus === 'blocked');
  const sent = campaigns.filter(c => c.appStatus === 'done');

  if (deploying.length > 0) return 'deploy';
  if (blocked.length > 0 && blocked.some(c => c.sendDate && c.sendDate <= todayStr)) return 'critical';
  if (blocked.length > 0) return 'high';
  if (today.length > 0) return 'deploy';
  if (sent.length > 0 && campaigns.filter(c => c.appStatus !== 'done').length === 0) return 'done';
  if (campaigns.length === 0) return 'monitor';
  return 'watch';
}

function getBrandFocus(brand, campaigns, todayStr) {
  const todayCampaigns = campaigns.filter(c => c.sendDate === todayStr);
  const blockedCampaigns = campaigns.filter(c => c.appStatus === 'blocked');
  const upcomingCampaigns = campaigns.filter(c => c.appStatus !== 'done' && c.sendDate > todayStr);

  if (blockedCampaigns.length > 0) {
    const names = blockedCampaigns.map(c => c.name).join(', ');
    return `${blockedCampaigns.length} campaign${blockedCampaigns.length > 1 ? 's' : ''} blocked: ${names}. Action required.`;
  }
  if (todayCampaigns.length > 0) {
    const names = todayCampaigns.map(c => c.name).join(' · ');
    return `Deploying today: ${names}. Confirm QA + schedule.`;
  }
  if (upcomingCampaigns.length > 0) {
    const next = upcomingCampaigns[0];
    return `Next: ${next.name} on ${formatDay(next.sendDate)}. Phase: ${next.phase || 'In progress'}.`;
  }
  if (campaigns.length === 0) {
    return 'No campaigns scheduled this week. Verify production status.';
  }
  return `${campaigns.filter(c => c.appStatus === 'done').length} campaign${campaigns.filter(c => c.appStatus === 'done').length !== 1 ? 's' : ''} sent this week. On track.`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) return res.status(500).json({ error: 'NOTION_TOKEN not configured' });

  const headers = {
    'Authorization': `Bearer ${notionToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const { today, weekStart, weekEnd, todayStr } = getWeekRange();

  // Query all 7 brand calendars in parallel
  const allResults = await Promise.all(
    BRANDS.map(brand => queryBrandCalendar(brand, headers, weekStart, weekEnd))
  );

  // Build weekly campaign list
  const weekly = [];
  const brandData = [];

  BRANDS.forEach((brand, idx) => {
    const campaigns = allResults[idx].map(c => ({
      ...c,
      appStatus: mapStatus(c.status, c.sendDate, todayStr),
    }));

    // Add to weekly list
    campaigns.forEach(c => {
      weekly.push({
        day: formatDay(c.sendDate),
        brand: brand.name,
        sub: '',
        name: c.name,
        type: c.tool === 'Attentive' ? 'SMS' : 'EMAIL',
        s: c.appStatus,
        note: c.phase || c.status || '',
      });
    });

    // Brand card data
    const brandStatus = determineBrandStatus(campaigns, todayStr);
    const focus = getBrandFocus(brand, campaigns, todayStr);

    brandData.push({
      id: brand.id,
      name: brand.name,
      notionId: brand.dbId,
      contact: brand.contact,
      since: brand.since,
      slack: brand.slack,
      todayStatus: brandStatus,
      focus,
    });
  });

  // Sort weekly by send date
  weekly.sort((a, b) => {
    const dateA = allResults.flat().find(c => c.name === a.name)?.sendDate || '';
    const dateB = allResults.flat().find(c => c.name === b.name)?.sendDate || '';
    return dateA.localeCompare(dateB);
  });

  // Build blockers from blocked campaigns
  const blockers = [];
  BRANDS.forEach((brand, idx) => {
    const campaigns = allResults[idx].map(c => ({
      ...c,
      appStatus: mapStatus(c.status, c.sendDate, todayStr),
    }));
    campaigns.filter(c => c.appStatus === 'blocked').forEach(c => {
      const daysPast = c.sendDate
        ? Math.floor((today.getTime() - new Date(c.sendDate + 'T12:00:00').getTime()) / 86400000)
        : 0;
      const severity = daysPast > 3 ? 'critical' : 'high';
      blockers.push({
        u: severity,
        t: `${brand.name} — ${c.name}: ${c.status}${daysPast > 0 ? ` (${daysPast} day${daysPast !== 1 ? 's' : ''} overdue)` : ''}. Action needed.`,
      });
    });
  });

  // Build must-wins from today's deploying + blocked
  const mustWins = [];
  BRANDS.forEach((brand, idx) => {
    const campaigns = allResults[idx].map(c => ({
      ...c,
      appStatus: mapStatus(c.status, c.sendDate, todayStr),
    }));
    campaigns.filter(c => c.appStatus === 'deploy' && c.sendDate === todayStr).forEach(c => {
      mustWins.push(`Deploy ${c.name} — confirm QA, code, and schedule before noon.`);
    });
  });
  BRANDS.forEach((brand, idx) => {
    const campaigns = allResults[idx].map(c => ({
      ...c,
      appStatus: mapStatus(c.status, c.sendDate, todayStr),
    }));
    campaigns.filter(c => c.appStatus === 'blocked').slice(0, 1).forEach(c => {
      mustWins.push(`Resolve blocked campaign: ${brand.name} — ${c.name}.`);
    });
  });

  if (mustWins.length === 0) {
    mustWins.push('Review upcoming campaigns and confirm all are on track for the week.');
  }

  return res.status(200).json({
    brands: brandData,
    weekly,
    blockers: blockers.length > 0 ? blockers : [{ u: 'watch', t: 'No critical blockers this week. Review upcoming campaigns.' }],
    mustWins: mustWins.slice(0, 5),
    generatedAt: new Date().toISOString(),
    weekStart,
    weekEnd,
  });
}
