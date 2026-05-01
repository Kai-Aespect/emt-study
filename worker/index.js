export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const counts = {
      modules: 24,
      lessons: 576,
      scenarios: 187,
      questions: 470,
      drugs: 10,
      skills: 11,
      ecg: 12,
      foundations: 20,
      media: 5,
      references: 15,
    };
    const routeTables = {
      modules: 'modules',
      lessons: 'lessons',
      scenarios: 'scenarios',
      questions: 'questions',
      drugs: 'drugs',
      skills: 'skills',
      ecg: 'ecg_bank',
      foundations: 'foundations',
      media: 'media_manifest',
      references: 'references',
    };

    if (url.pathname === '/api/health' || url.pathname === '/api/stats') {
      return Response.json({
        ok: true,
        runtime: 'cloudflare-worker',
        database: {
          connected: false,
          path: 'Local SQLite database is used by the Node/Express backend.',
        },
        counts,
        totals: {
          studyRecords: Object.values(counts).reduce((total, count) => total + count, 0),
        },
      });
    }

    const apiMatch = url.pathname.match(/^\/api\/([^/]+)$/);
    if (apiMatch && routeTables[apiMatch[1]]) {
      const route = apiMatch[1];
      return Response.json({
        table: routeTables[route],
        columns: [],
        count: counts[route] ?? 0,
        limit: Number(url.searchParams.get('limit') || 100),
        offset: Number(url.searchParams.get('offset') || 0),
        data: [],
        filters: Object.fromEntries(url.searchParams.entries()),
        note: 'Cloudflare Worker build serves static API metadata only. Run the Node/Express backend for SQLite-backed records.',
      });
    }

    return env.ASSETS.fetch(request);
  },
};
