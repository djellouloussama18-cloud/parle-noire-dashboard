export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function checkPasswordStrength(password) {
  let score = 0;
  if (!password) return { score, label: 'فارغ', color: 'bg-status-danger' };

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'ضعيفة';
  let color = 'bg-status-danger';

  if (score === 2) {
    label = 'متوسطة';
    color = 'bg-status-warning';
  } else if (score === 3) {
    label = 'قوية';
    color = 'bg-accent-secondary';
  } else if (score === 4) {
    label = 'قوية جداً';
    color = 'bg-accent-primary';
  }

  return {
    score,
    label,
    color,
    rules: {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }
  };
}
