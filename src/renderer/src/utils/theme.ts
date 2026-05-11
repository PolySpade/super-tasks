import { ThemeColors, Theme } from '../types'

export const CAMEL_TO_CSS: Record<keyof ThemeColors, string> = {
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  bgTertiary: '--bg-tertiary',
  bgHover: '--bg-hover',
  bgSurface: '--bg-surface',
  bgInput: '--bg-input',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textTertiary: '--text-tertiary',
  accent: '--accent',
  accentHover: '--accent-hover',
  accentSecondary: '--accent-secondary',
  accentDim: '--accent-dim',
  success: '--success',
  successDim: '--success-dim',
  danger: '--danger',
  dangerHover: '--danger-hover',
  dangerDim: '--danger-dim',
  warning: '--warning',
  warningDim: '--warning-dim',
  errorBg: '--error-bg',
  errorText: '--error-text',
  glass1: '--glass-1',
  glass2: '--glass-2',
  glass3: '--glass-3',
  glass4: '--glass-4',
  border: '--border',
  borderLight: '--border-light',
  glassBorder: '--glass-border',
  glassBorderStrong: '--glass-border-strong',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  shadowGlowAccent: '--shadow-glow-accent',
  shadowGlowSuccess: '--shadow-glow-success',
  meshGradient: '--mesh-gradient'
}

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    builtIn: true,
    colors: {
      bgPrimary: '#0c0c1a',
      bgSecondary: '#10102a',
      bgTertiary: 'rgba(255, 255, 255, 0.06)',
      bgHover: 'rgba(255, 255, 255, 0.04)',
      bgSurface: 'rgba(255, 255, 255, 0.04)',
      bgInput: '#1a1a32',
      textPrimary: '#e8e8f0',
      textSecondary: '#9898b8',
      textTertiary: '#6a6a88',
      accent: '#5b8aff',
      accentHover: '#7ba0ff',
      accentSecondary: '#7c5cff',
      accentDim: 'rgba(91, 138, 255, 0.15)',
      success: '#34d399',
      successDim: 'rgba(52, 211, 153, 0.15)',
      danger: '#ef4444',
      dangerHover: '#f87171',
      dangerDim: 'rgba(239, 68, 68, 0.1)',
      warning: '#f59e0b',
      warningDim: 'rgba(245, 158, 11, 0.15)',
      errorBg: 'rgba(239, 68, 68, 0.08)',
      errorText: '#fca5a5',
      glass1: '#111128',
      glass2: '#141432',
      glass3: '#17173a',
      glass4: '#101c3e',
      border: 'rgba(255, 255, 255, 0.08)',
      borderLight: 'rgba(255, 255, 255, 0.08)',
      glassBorder: 'rgba(255, 255, 255, 0.08)',
      glassBorderStrong: 'rgba(255, 255, 255, 0.08)',
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      shadowMd: '0 2px 8px rgba(0, 0, 0, 0.15)',
      shadowLg: '0 4px 12px rgba(0, 0, 0, 0.2)',
      shadowGlowAccent: 'none',
      shadowGlowSuccess: 'none',
      meshGradient: 'none'
    }
  },
  {
    id: 'ember',
    name: 'Ember',
    builtIn: true,
    colors: {
      bgPrimary: '#141010',
      bgSecondary: '#1a1412',
      bgTertiary: 'rgba(255, 200, 150, 0.06)',
      bgHover: 'rgba(255, 200, 150, 0.04)',
      bgSurface: 'rgba(255, 200, 150, 0.04)',
      bgInput: '#201816',
      textPrimary: '#f0e8e0',
      textSecondary: '#b8a898',
      textTertiary: '#887868',
      accent: '#f0963a',
      accentHover: '#f5ad5e',
      accentSecondary: '#e07028',
      accentDim: 'rgba(240, 150, 58, 0.15)',
      success: '#34d399',
      successDim: 'rgba(52, 211, 153, 0.15)',
      danger: '#ef4444',
      dangerHover: '#f87171',
      dangerDim: 'rgba(239, 68, 68, 0.1)',
      warning: '#f5c842',
      warningDim: 'rgba(245, 200, 66, 0.15)',
      errorBg: 'rgba(239, 68, 68, 0.08)',
      errorText: '#fca5a5',
      glass1: '#181210',
      glass2: '#1c1614',
      glass3: '#201a18',
      glass4: '#2a1c14',
      border: 'rgba(255, 200, 150, 0.08)',
      borderLight: 'rgba(255, 200, 150, 0.06)',
      glassBorder: 'rgba(255, 200, 150, 0.08)',
      glassBorderStrong: 'rgba(255, 200, 150, 0.12)',
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      shadowMd: '0 2px 8px rgba(0, 0, 0, 0.15)',
      shadowLg: '0 4px 12px rgba(0, 0, 0, 0.2)',
      shadowGlowAccent: 'none',
      shadowGlowSuccess: 'none',
      meshGradient: 'none'
    }
  },
  {
    id: 'slate',
    name: 'Slate',
    builtIn: true,
    colors: {
      bgPrimary: '#111113',
      bgSecondary: '#161618',
      bgTertiary: 'rgba(255, 255, 255, 0.06)',
      bgHover: 'rgba(255, 255, 255, 0.04)',
      bgSurface: 'rgba(255, 255, 255, 0.04)',
      bgInput: '#1c1c1e',
      textPrimary: '#e8e8ea',
      textSecondary: '#9898a0',
      textTertiary: '#6a6a72',
      accent: '#8b8bf5',
      accentHover: '#a5a5f8',
      accentSecondary: '#6e6edb',
      accentDim: 'rgba(139, 139, 245, 0.15)',
      success: '#34d399',
      successDim: 'rgba(52, 211, 153, 0.15)',
      danger: '#ef4444',
      dangerHover: '#f87171',
      dangerDim: 'rgba(239, 68, 68, 0.1)',
      warning: '#f59e0b',
      warningDim: 'rgba(245, 158, 11, 0.15)',
      errorBg: 'rgba(239, 68, 68, 0.08)',
      errorText: '#fca5a5',
      glass1: '#141416',
      glass2: '#18181a',
      glass3: '#1c1c1e',
      glass4: '#202024',
      border: 'rgba(255, 255, 255, 0.08)',
      borderLight: 'rgba(255, 255, 255, 0.06)',
      glassBorder: 'rgba(255, 255, 255, 0.08)',
      glassBorderStrong: 'rgba(255, 255, 255, 0.10)',
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      shadowMd: '0 2px 8px rgba(0, 0, 0, 0.15)',
      shadowLg: '0 4px 12px rgba(0, 0, 0, 0.2)',
      shadowGlowAccent: 'none',
      shadowGlowSuccess: 'none',
      meshGradient: 'none'
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    builtIn: true,
    colors: {
      bgPrimary: '#0a120e',
      bgSecondary: '#0e1812',
      bgTertiary: 'rgba(150, 255, 200, 0.06)',
      bgHover: 'rgba(150, 255, 200, 0.04)',
      bgSurface: 'rgba(150, 255, 200, 0.04)',
      bgInput: '#142018',
      textPrimary: '#e0f0e8',
      textSecondary: '#98b8a8',
      textTertiary: '#688878',
      accent: '#3dbf7a',
      accentHover: '#5cd494',
      accentSecondary: '#2a9e60',
      accentDim: 'rgba(61, 191, 122, 0.15)',
      success: '#3dbf7a',
      successDim: 'rgba(61, 191, 122, 0.15)',
      danger: '#ef4444',
      dangerHover: '#f87171',
      dangerDim: 'rgba(239, 68, 68, 0.1)',
      warning: '#f5c842',
      warningDim: 'rgba(245, 200, 66, 0.15)',
      errorBg: 'rgba(239, 68, 68, 0.08)',
      errorText: '#fca5a5',
      glass1: '#0c1610',
      glass2: '#101c14',
      glass3: '#142018',
      glass4: '#10261a',
      border: 'rgba(150, 255, 200, 0.08)',
      borderLight: 'rgba(150, 255, 200, 0.06)',
      glassBorder: 'rgba(150, 255, 200, 0.08)',
      glassBorderStrong: 'rgba(150, 255, 200, 0.12)',
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      shadowMd: '0 2px 8px rgba(0, 0, 0, 0.15)',
      shadowLg: '0 4px 12px rgba(0, 0, 0, 0.2)',
      shadowGlowAccent: 'none',
      shadowGlowSuccess: 'none',
      meshGradient: 'none'
    }
  },
  {
    id: 'rose',
    name: 'Rose',
    builtIn: true,
    colors: {
      bgPrimary: '#130c10',
      bgSecondary: '#1a1016',
      bgTertiary: 'rgba(255, 150, 200, 0.06)',
      bgHover: 'rgba(255, 150, 200, 0.04)',
      bgSurface: 'rgba(255, 150, 200, 0.04)',
      bgInput: '#20141a',
      textPrimary: '#f0e0e8',
      textSecondary: '#b898a8',
      textTertiary: '#886878',
      accent: '#f06090',
      accentHover: '#f580a8',
      accentSecondary: '#d04878',
      accentDim: 'rgba(240, 96, 144, 0.15)',
      success: '#34d399',
      successDim: 'rgba(52, 211, 153, 0.15)',
      danger: '#ef4444',
      dangerHover: '#f87171',
      dangerDim: 'rgba(239, 68, 68, 0.1)',
      warning: '#f59e0b',
      warningDim: 'rgba(245, 158, 11, 0.15)',
      errorBg: 'rgba(239, 68, 68, 0.08)',
      errorText: '#fca5a5',
      glass1: '#161012',
      glass2: '#1c1418',
      glass3: '#20181c',
      glass4: '#2a1420',
      border: 'rgba(255, 150, 200, 0.08)',
      borderLight: 'rgba(255, 150, 200, 0.06)',
      glassBorder: 'rgba(255, 150, 200, 0.08)',
      glassBorderStrong: 'rgba(255, 150, 200, 0.12)',
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      shadowMd: '0 2px 8px rgba(0, 0, 0, 0.15)',
      shadowLg: '0 4px 12px rgba(0, 0, 0, 0.2)',
      shadowGlowAccent: 'none',
      shadowGlowSuccess: 'none',
      meshGradient: 'none'
    }
  },
  {
    id: 'dawn',
    name: 'Dawn',
    builtIn: true,
    colors: {
      bgPrimary: '#f8f8fa',
      bgSecondary: '#f0f0f4',
      bgTertiary: 'rgba(0, 0, 0, 0.04)',
      bgHover: 'rgba(0, 0, 0, 0.03)',
      bgSurface: 'rgba(0, 0, 0, 0.03)',
      bgInput: '#e8e8ee',
      textPrimary: '#1a1a2e',
      textSecondary: '#5a5a72',
      textTertiary: '#8a8a9e',
      accent: '#4a70e0',
      accentHover: '#6088f0',
      accentSecondary: '#5c4cd4',
      accentDim: 'rgba(74, 112, 224, 0.12)',
      success: '#16a34a',
      successDim: 'rgba(22, 163, 74, 0.12)',
      danger: '#dc2626',
      dangerHover: '#ef4444',
      dangerDim: 'rgba(220, 38, 38, 0.08)',
      warning: '#d97706',
      warningDim: 'rgba(217, 119, 6, 0.12)',
      errorBg: 'rgba(220, 38, 38, 0.06)',
      errorText: '#dc2626',
      glass1: '#f4f4f8',
      glass2: '#eeeeF4',
      glass3: '#e8e8f0',
      glass4: '#e0e0ec',
      border: 'rgba(0, 0, 0, 0.08)',
      borderLight: 'rgba(0, 0, 0, 0.06)',
      glassBorder: 'rgba(0, 0, 0, 0.08)',
      glassBorderStrong: 'rgba(0, 0, 0, 0.12)',
      shadowSm: '0 1px 3px rgba(0, 0, 0, 0.06)',
      shadowMd: '0 2px 8px rgba(0, 0, 0, 0.08)',
      shadowLg: '0 4px 12px rgba(0, 0, 0, 0.10)',
      shadowGlowAccent: 'none',
      shadowGlowSuccess: 'none',
      meshGradient: 'none'
    }
  }
]

export function applyTheme(colors: ThemeColors): void {
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(CAMEL_TO_CSS)) {
    const value = colors[key as keyof ThemeColors]
    if (value !== undefined) {
      root.style.setProperty(cssVar, value)
    }
  }
}

export function resolveTheme(id: string, customThemes: Theme[]): Theme | undefined {
  return BUILT_IN_THEMES.find((t) => t.id === id) || customThemes.find((t) => t.id === id)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9a-f]{6})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16)
  }
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.min(255, rgb.r + Math.round(amount * 255))
  const g = Math.min(255, rgb.g + Math.round(amount * 255))
  const b = Math.min(255, rgb.b + Math.round(amount * 255))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.max(0, rgb.r - Math.round(amount * 255))
  const g = Math.max(0, rgb.g - Math.round(amount * 255))
  const b = Math.max(0, rgb.b - Math.round(amount * 255))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function isLight(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 128
}

export function deriveFullTheme(keyColors: {
  background: string
  text: string
  accent: string
  surface: string
  border: string
  success: string
  danger: string
  warning: string
}): ThemeColors {
  const light = isLight(keyColors.background)
  const overlayBase = light ? '0, 0, 0' : '255, 255, 255'

  return {
    bgPrimary: keyColors.background,
    bgSecondary: light ? darken(keyColors.background, 0.03) : lighten(keyColors.background, 0.02),
    bgTertiary: `rgba(${overlayBase}, 0.06)`,
    bgHover: `rgba(${overlayBase}, 0.04)`,
    bgSurface: keyColors.surface,
    bgInput: light ? darken(keyColors.background, 0.06) : lighten(keyColors.background, 0.05),
    textPrimary: keyColors.text,
    textSecondary: light ? lighten(keyColors.text, 0.25) : darken(keyColors.text, 0.2),
    textTertiary: light ? lighten(keyColors.text, 0.4) : darken(keyColors.text, 0.35),
    accent: keyColors.accent,
    accentHover: light ? darken(keyColors.accent, 0.08) : lighten(keyColors.accent, 0.1),
    accentSecondary: light ? darken(keyColors.accent, 0.12) : darken(keyColors.accent, 0.08),
    accentDim: (() => {
      const rgb = hexToRgb(keyColors.accent)
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgba(100, 100, 255, 0.15)'
    })(),
    success: keyColors.success,
    successDim: (() => {
      const rgb = hexToRgb(keyColors.success)
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgba(52, 211, 153, 0.15)'
    })(),
    danger: keyColors.danger,
    dangerHover: lighten(keyColors.danger, 0.1),
    dangerDim: (() => {
      const rgb = hexToRgb(keyColors.danger)
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` : 'rgba(239, 68, 68, 0.1)'
    })(),
    warning: keyColors.warning,
    warningDim: (() => {
      const rgb = hexToRgb(keyColors.warning)
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgba(245, 158, 11, 0.15)'
    })(),
    errorBg: (() => {
      const rgb = hexToRgb(keyColors.danger)
      return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)` : 'rgba(239, 68, 68, 0.08)'
    })(),
    errorText: light ? keyColors.danger : lighten(keyColors.danger, 0.2),
    glass1: light ? darken(keyColors.background, 0.015) : lighten(keyColors.background, 0.015),
    glass2: light ? darken(keyColors.background, 0.03) : lighten(keyColors.background, 0.03),
    glass3: light ? darken(keyColors.background, 0.045) : lighten(keyColors.background, 0.045),
    glass4: light ? darken(keyColors.background, 0.06) : lighten(keyColors.background, 0.06),
    border: keyColors.border,
    borderLight: `rgba(${overlayBase}, 0.06)`,
    glassBorder: `rgba(${overlayBase}, 0.08)`,
    glassBorderStrong: `rgba(${overlayBase}, 0.12)`,
    shadowSm: light ? '0 1px 3px rgba(0, 0, 0, 0.06)' : '0 1px 3px rgba(0, 0, 0, 0.12)',
    shadowMd: light ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
    shadowLg: light ? '0 4px 12px rgba(0, 0, 0, 0.10)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
    shadowGlowAccent: 'none',
    shadowGlowSuccess: 'none',
    meshGradient: 'none'
  }
}
