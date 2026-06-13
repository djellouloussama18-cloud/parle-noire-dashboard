import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

export async function getBackups() {
  const response = await fetch(API_BASE + '/api/backups', {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to fetch backups');
  }
  var data = await response.json();

  if (data && data.success && Array.isArray(data.backups)) {
    return data.backups;
  }
  if (Array.isArray(data)) {
    return data.map(function (b) {
      return {
        filename: b.filename || b.id,
        size: b.size || b.size_bytes,
        createdAt: b.createdAt || b.created_at
      };
    });
  }
  return [];
}

export async function createBackup() {
  var response = await fetch(API_BASE + '/api/backups', {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to create backup');
  }
  var data = await response.json();
  return data.filename || null;
}

export async function restoreBackup(filename) {
  var response = await fetch(API_BASE + '/api/backups/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: filename })
  });
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to restore backup');
  }
  return response.json();
}

export async function deleteBackup(filename) {
  var response = await fetch(API_BASE + '/api/backups/' + encodeURIComponent(filename), {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to delete backup');
  }
  return response.json();
}

export async function downloadBackup(filename) {
  var response = await fetch(API_BASE + '/api/backups/' + encodeURIComponent(filename) + '/download', {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to download backup');
  }
  var blob = await response.blob();
  return { data: blob };
}
