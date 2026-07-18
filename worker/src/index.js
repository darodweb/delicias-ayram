const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'noreply@darodriguez.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Token',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: CORS_HEADERS });
    }

    const token = request.headers.get('X-Worker-Token');
    if (!token || token !== env.WORKER_SECRET_TOKEN) {
      return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
    }

    const { tipo, ...data } = body;

    switch (tipo) {
      case 'reset':
        return handleReset(data.email, data.adminUrl, env);
      case 'nuevo_admin':
        return handleNuevoAdmin(data.email, data.password, data.storeName, data.adminUrl, env);
      case 'cambio_whatsapp':
        return handleCambioWhatsapp(data.numero_nuevo, data.numero_anterior, data.tienda, env);
      default:
        return new Response('Tipo desconocido', { status: 400, headers: CORS_HEADERS });
    }
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }, apiKey) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    return new Response(`Resend error: ${err}`, { status: 502, headers: CORS_HEADERS });
  }
  return new Response('OK', { status: 200, headers: CORS_HEADERS });
}

// Crea un JWT firmado con la Service Account y lo canjea por un Google access token.
// Necesario para llamar a la Identity Toolkit API con privilegios de admin.
async function getGoogleAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const b64url = obj =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const payload = b64url({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/identitytoolkit',
  });

  const signingInput = `${header}.${payload}`;
  const keyData = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await tokenRes.json();
  return access_token;
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleReset(email, adminUrl, env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const token = await getGoogleAccessToken(sa);

  const resetRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:sendOobCode`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
        returnOobLink: true,
      }),
    },
  );
  const { oobLink, oobCode, error } = await resetRes.json();
  if (error) return new Response(`Firebase error: ${error.message}`, { status: 502, headers: CORS_HEADERS });

  const resetUrl = oobLink
    ?? (oobCode
      ? `https://${env.FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`
      : null);

  if (!resetUrl) return new Response('Firebase no devolvió oobLink ni oobCode', { status: 502, headers: CORS_HEADERS });

  return sendEmail(
    {
      to: email,
      subject: 'Restablecer tu contraseña de administrador',
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111">Restablecer contraseña</h2>
          <p style="margin:0 0 24px;color:#555;line-height:1.6">
            Recibiste este email porque alguien solicitó restablecer la contraseña de tu cuenta de administrador.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
            Restablecer contraseña
          </a>
          ${adminUrl ? `<p style="margin:20px 0 0;color:#555;font-size:13px;line-height:1.6">
            Una vez que reestablezcas tu contraseña, podés ingresar al panel desde acá:
          </p>
          <a href="${adminUrl}"
             style="display:inline-block;margin-top:8px;color:#111;font-size:13px;text-decoration:underline;word-break:break-all">
            ${adminUrl}
          </a>` : ''}
          <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.6">
            Si no solicitaste esto, podés ignorar este email. El link expira en 1 hora.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    },
    env.RESEND_API_KEY,
  );
}

async function handleNuevoAdmin(email, password, storeName, adminUrl, env) {
  return sendEmail(
    {
      to: email,
      subject: `Tu cuenta de administrador en ${storeName || 'la tienda'} fue creada`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111">Bienvenido al panel de administración</h2>
          <p style="margin:0 0 24px;color:#555;line-height:1.6">
            Se creó una cuenta de administrador para <strong>${storeName || 'la tienda'}</strong> con los siguientes datos:
          </p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
            <tr>
              <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;color:#888;font-size:13px;width:40%">Email</td>
              <td style="padding:10px 12px;border:1px solid #e5e5e5;font-size:13px;font-weight:600;color:#111">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;border-top:0;color:#888;font-size:13px">Contraseña temporal</td>
              <td style="padding:10px 12px;border:1px solid #e5e5e5;border-top:0;font-size:13px;font-weight:600;color:#111;font-family:monospace">${password}</td>
            </tr>
          </table>
          ${adminUrl ? `<a href="${adminUrl}"
             style="display:inline-block;margin:0 0 20px;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
            Ir al panel de administración
          </a>` : ''}
          <p style="margin:0;color:#999;font-size:12px;line-height:1.6">
            Por seguridad, cambiá tu contraseña la primera vez que inicies sesión usando la opción "Resetear contraseña" en el panel.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    },
    env.RESEND_API_KEY,
  );
}

async function handleCambioWhatsapp(numero_nuevo, numero_anterior, tienda, env) {
  return sendEmail(
    {
      to: 'darodweb@gmail.com',
      subject: `[Alerta] Cambio de WhatsApp en ${tienda || 'una tienda'}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:8px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111">Cambio de número de WhatsApp</h2>
          <p style="margin:0 0 24px;color:#555;line-height:1.6">
            Se modificó el número de WhatsApp en el panel de configuración.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
            <tr>
              <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;color:#888;font-size:13px;width:40%">Tienda</td>
              <td style="padding:10px 12px;border:1px solid #e5e5e5;font-size:13px;color:#111">${tienda || '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;border-top:0;color:#888;font-size:13px">Número anterior</td>
              <td style="padding:10px 12px;border:1px solid #e5e5e5;border-top:0;font-size:13px;color:#111">${numero_anterior || '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;border-top:0;color:#888;font-size:13px">Número nuevo</td>
              <td style="padding:10px 12px;border:1px solid #e5e5e5;border-top:0;font-size:13px;font-weight:600;color:#111">${numero_nuevo}</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    },
    env.RESEND_API_KEY,
  );
}
