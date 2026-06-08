import type { Config } from 'tailwindcss'

const preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--np-brand)',
          hover: 'var(--np-brand-hover)',
          soft: 'var(--np-brand-soft)'
        },
        np: {
          bg: 'var(--np-bg)',
          surface: 'var(--np-bg-surface)',
          sidebar: 'var(--np-bg-sidebar)',
          card: 'var(--np-bg-card)',
          'code-block': 'var(--np-bg-code-block)',
          'code-inline': 'var(--np-bg-code-inline)',
          text: 'var(--np-text-primary)',
          secondary: 'var(--np-text-secondary)',
          muted: 'var(--np-text-muted)',
          faint: 'var(--np-text-faint)',
          border: 'var(--np-border)',
          'border-strong': 'var(--np-border-strong)',
          divider: 'var(--np-divider)',
          tip: 'var(--np-tip)',
          note: 'var(--np-note)',
          warning: 'var(--np-warning)',
          info: 'var(--np-info)',
          check: 'var(--np-check)',
          danger: 'var(--np-danger)',
          'method-get': 'var(--np-method-get)',
          'method-post': 'var(--np-method-post)',
          'method-put': 'var(--np-method-put)',
          'method-patch': 'var(--np-method-patch)',
          'method-delete': 'var(--np-method-delete)'
        }
      },
      fontFamily: {
        sans: ['var(--np-font-sans)'],
        mono: ['var(--np-font-mono)']
      },
      borderRadius: {
        np: 'var(--np-radius-md)',
        'np-sm': 'var(--np-radius-sm)',
        'np-lg': 'var(--np-radius-lg)',
        'np-pill': 'var(--np-radius-pill)'
      },
      boxShadow: {
        'np-card': 'var(--np-shadow-card)',
        'np-modal': 'var(--np-shadow-modal)'
      },
      maxWidth: {
        'np-content': 'var(--np-content-max)'
      },
      width: {
        'np-sidebar': 'var(--np-sidebar-width)',
        'np-toc': 'var(--np-toc-width)'
      },
      height: {
        'np-header': 'var(--np-header-height)'
      }
    }
  }
}

export default preset
