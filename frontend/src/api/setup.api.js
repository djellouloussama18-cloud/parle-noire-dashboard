import { API_BASE } from './config';

export async function getSetupStatus() {
  var response = await fetch(API_BASE + '/api/setup/status');
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to fetch setup status');
  }
  return response.json();
}

export async function initializeSetup(config) {
  var response = await fetch(API_BASE + '/api/setup/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to initialize setup');
  }
  return response.json();
}
