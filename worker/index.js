export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        runtime: 'cloudflare-worker',
        database: {
          connected: false,
          path: 'Local SQLite database is used by the Node/Express backend.',
        },
        counts: {
          modules: 24,
          lessons: 576,
          scenarios: 187,
          questions: 470,
          drugs: 10,
          skills: 11,
          ecg: 12,
          foundations: 20,
          media: 5,
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
