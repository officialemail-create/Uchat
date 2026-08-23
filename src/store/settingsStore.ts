import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'small' | 'medium' | 'large';
export type BubbleStyle = 'rounded' | 'square' | 'minimal';
export type AnimationLevel = 'full' | 'reduced' | 'none';

export interface AppSettings {
  // Appearance
  themeMode: 'dark' | 'light';
  accentColor: string;
  fontSize: FontSize;
  compactMode: boolean;
  bubbleStyle: BubbleStyle;
  animationLevel: AnimationLevel;
  // Notifications
  soundEnabled: boolean;
  desktopNotifications: boolean;
  notificationPreviews: boolean;
  // Chat
  enterToSend: boolean;
  showTypingIndicators: boolean;
  dataSaverMode: boolean;
  // Accessibility
  highContrast: boolean;
}

/** Hex accent → tailwind-style HSL string for CSS variable override */
export const ACCENT_PRESETS = [
  { hex: '#8B5CF6', hsl: '258 90% 66%', label: 'Purple'   },
  { hex: '#3B82F6', hsl: '217 91% 60%', label: 'Blue'     },
  { hex: '#8B5CF6', hsl: '258 90% 66%', label: 'Violet'   },
  { hex: '#F59E0B', hsl: '38 93% 51%',  label: 'Amber'    },
  { hex: '#EF4444', hsl: '0 84% 60%',   label: 'Red'      },
  { hex: '#06B6D4', hsl: '189 94% 43%', label: 'Cyan'     },
  { hex: '#EC4899', hsl: '330 81% 60%', label: 'Pink'     },
];

export function applySettingsToDom(s: AppSettings): void {
  const root = document.documentElement;

  // Accent color → update CSS HSL variables used by Tailwind theme
  const preset = ACCENT_PRESETS.find((p) => p.hex === s.accentColor) ?? ACCENT_PRESETS[0];
  root.style.setProperty('--primary', preset.hsl);
  root.style.setProperty('--accent', preset.hsl);
  root.style.setProperty('--ring', preset.hsl);
  root.style.setProperty('--app-accent', s.accentColor);

  // Font size
  const sizeMap: Record<FontSize, string> = { small: '13px', medium: '14px', large: '16px' };
  root.style.setProperty('--app-text-base', sizeMap[s.fontSize]);

  // Theme mode
  root.classList.toggle('dark', s.themeMode === 'dark');
  root.classList.toggle('light', s.themeMode === 'light');
  root.setAttribute('data-theme', s.themeMode);

  // Body-level CSS class flags
  root.classList.toggle('compact-mode', s.compactMode);
  root.classList.toggle('high-contrast', s.highContrast);
  root.classList.toggle('reduced-motion', s.animationLevel === 'reduced');
  root.classList.toggle('no-motion', s.animationLevel === 'none');
}

export const SETTINGS_DEFAULTS: AppSettings = {
  themeMode: 'dark',
  accentColor: '#8B5CF6',
  fontSize: 'medium',
  compactMode: false,
  bubbleStyle: 'rounded',
  animationLevel: 'full',
  soundEnabled: true,
  desktopNotifications: true,
  notificationPreviews: true,
  enterToSend: true,
  showTypingIndicators: true,
  dataSaverMode: typeof localStorage !== 'undefined'
    ? localStorage.getItem('uchat_data_saver') === '1'
    : false,
  highContrast: false,
};

interface SettingsStore extends AppSettings {
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...SETTINGS_DEFAULTS,

      update(patch) {
        set(patch);
        const next = { ...get(), ...patch };
        applySettingsToDom(next);
        // Keep legacy localStorage key in sync for dataSaverMode
        if (patch.dataSaverMode !== undefined) {
          localStorage.setItem('uchat_data_saver', patch.dataSaverMode ? '1' : '0');
        }
      },

      reset() {
        set(SETTINGS_DEFAULTS);
        applySettingsToDom(SETTINGS_DEFAULTS);
      },
    }),
    { name: 'uchat_settings' },
  ),
);
