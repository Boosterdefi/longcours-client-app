/* Pages Function : GET /api/turn-credentials
   Génère des identifiants TURN Cloudflare Calls de courte durée (TTL) côté
   serveur, pour que la clé TURN longue durée (TURN_KEY_ID / TURN_KEY_API_TOKEN)
   ne soit jamais exposée au client. Se déploie automatiquement avec le reste
   du site Cloudflare Pages (aucune configuration Wrangler séparée requise) —
   il suffit que ce fichier existe sous functions/api/turn-credentials.js.

   CONFIGURATION REQUISE (dashboard Cloudflare Pages du projet) :
   Settings → Environment variables → ajouter en tant que "Secret" :
     - TURN_KEY_ID          (Token ID de la TURN key créée sous Calls)
     - TURN_KEY_API_TOKEN   (API token de cette même TURN key)
   À faire pour les environnements "Production" ET "Preview" si utilisés. */

const TTL_SECONDS = 7200; // 2h : marge large au-dessus de la durée d'un appel normal

export async function onRequestGet(context) {
  const { env } = context;
  const keyId = env.TURN_KEY_ID;
  const apiToken = env.TURN_KEY_API_TOKEN;

  if (!keyId || !apiToken) {
    return json({ error: 'turn_not_configured' }, 500);
  }

  try {
    const resp = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttl: TTL_SECONDS })
      }
    );

    if (!resp.ok) {
      return json({ error: 'turn_generate_failed', status: resp.status }, 502);
    }

    const data = await resp.json();
    return json(data, 200);
  } catch (e) {
    return json({ error: 'turn_generate_exception' }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // jamais mis en cache : chaque appel doit obtenir des identifiants frais
      'Cache-Control': 'no-store'
    }
  });
}
