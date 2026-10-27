const rawBaseUrl = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/**
 * Checks backend health and configuration
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend health check error:', err);
    return null;
  }
}

/**
 * Sends a list of emails to the verification backend
 * @param {string[]} emails
 * @returns {Promise<{results: Array, summary: Object}>}
 */
export async function verifyEmails(emails) {
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    throw new Error('Please enter at least one email address to verify.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
    });
  } catch (networkErr) {
    console.error('Network fetch error:', networkErr);
    throw new Error(
      'Could not connect to the verification engine. On Render free tier, the backend takes ~50 seconds to spin up on first request, or check that VITE_API_URL is configured.'
    );
  }

  if (!response.ok) {
    let errorDetail = 'Failed to verify emails.';
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      errorDetail = `Server returned status ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}
