function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
  return parts.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function normalizeBaseUrl(url) {
  return (url || '').trim().replace(/\/$/, '');
}

function buildPublicUrl(settings, body) {
  const directUrl = getByPath(body, settings.responseUrlPath);
  if (typeof directUrl === 'string' && directUrl.trim()) {
    return directUrl.trim();
  }

  const responsePath = getByPath(body, settings.responsePathPath);
  if (typeof responsePath === 'string' && responsePath.trim() && settings.baseUrl) {
    const base = normalizeBaseUrl(settings.baseUrl);
    const cleanPath = responsePath.trim().replace(/^\//, '');
    return `${base}/${cleanPath}`;
  }

  return null;
}

/**
 * Универсальная HTTP-загрузка в CDN по настраиваемому контракту.
 */
export async function uploadToCdn(settings, file) {
  const endpoint = (settings.uploadEndpoint || '').trim();
  if (!endpoint) {
    throw new Error('CDN upload endpoint is not configured');
  }

  const method = settings.httpMethod || 'POST';
  let response;

  if (method === 'POST') {
    const payload = new FormData();
    const fileField = (settings.fileFieldName || 'file').trim();
    payload.append(fileField, new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    if (settings.pathFieldName) {
      payload.append(settings.pathFieldName, file.key);
    }

    response = await fetch(endpoint, { method: 'POST', body: payload });
  } else {
    response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'content-type': file.mimetype || 'application/octet-stream',
      },
      body: file.buffer,
    });
  }

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`CDN upload failed (${response.status}): ${text || response.statusText}`);
    }
    json = {};
  }

  if (!response.ok) {
    const detail = json?.error || json?.message || text || response.statusText;
    throw new Error(`CDN upload failed (${response.status}): ${detail}`);
  }

  const url = buildPublicUrl(settings, json);
  if (!url) {
    throw new Error('CDN upload succeeded but URL was not found in response');
  }

  return url;
}
