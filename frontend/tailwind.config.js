module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          card:      'var(--color-bg-card)',
        },
        accent: {
          primary:   'var(--color-accent-primary)',
          secondary: '#00CC66',
          hover:     '#00E86B',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled:  'var(--color-text-disabled)',
        },
        status: {
          danger:  '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        }
      },
      boxShadow: {
        'accent': '0 0 15px var(--color-shadow-accent)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
    }
  },
  plugins: []
}
