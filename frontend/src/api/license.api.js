import { API_BASE } from './config';

export async function getLicenseInfo() {
  var response = await fetch(API_BASE + '/api/license');
  if (!response.ok) {
    var err = await response.json();
    throw new Error(err.error || 'Failed to fetch license info');
  }
  return response.json();
}
