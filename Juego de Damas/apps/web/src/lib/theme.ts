import type { Appearance } from "@stripe/stripe-js";
import { esES } from "@clerk/localizations";
import type { ThemeMode } from "@damas/shared-types";

export const appThemes = {
  light: {
    accent: "#d97706",
    accentSoft: "#fde7c0",
    surface: "#fffaf2",
    surfaceStrong: "#ffffff",
    text: "#2d1f12",
    textMuted: "#74604f",
    border: "#e6c9a5",
  },
  dark: {
    accent: "#f59e0b",
    accentSoft: "#4c3312",
    surface: "#17110b",
    surfaceStrong: "#241a12",
    text: "#fff5e6",
    textMuted: "#c9b59a",
    border: "#5a4226",
  },
} as const;

export const clerkLocalization = esES;

export const clerkProviderAppearance = {
  options: {
    shimmer: false,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
    unsafe_disableDevelopmentModeWarnings: true,
  },
};

export function getClerkPanelAppearance(theme: ThemeMode) {
  const colors = appThemes[theme];
  return {
    variables: {
      colorPrimary: colors.accent,
      colorBackground: "transparent",
      colorInputBackground: colors.surface,
      colorInputText: colors.text,
      colorText: colors.text,
      colorTextSecondary: colors.textMuted,
      colorNeutral: colors.border,
      borderRadius: "18px",
      fontFamily: "\"Trebuchet MS\", \"Segoe UI\", sans-serif",
    },
    elements: {
      rootBox: {
        width: "100%",
      },
      cardBox: {
        width: "100%",
      },
      card: {
        boxShadow: "none",
        background: "transparent",
        border: "0",
      },
      headerTitle: {
        color: colors.text,
      },
      headerSubtitle: {
        color: colors.textMuted,
      },
      formButtonPrimary: {
        background: colors.accent,
        color: theme === "dark" ? "#17110b" : "#ffffff",
        boxShadow: "none",
      },
      formFieldInput: {
        background: colors.surface,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      },
      footer: {
        background: "transparent",
      },
      footerAction: {
        background: "transparent",
      },
      footerActionText: {
        color: colors.textMuted,
      },
      footerActionLink: {
        color: colors.accent,
      },
      identityPreviewText: {
        color: colors.textMuted,
      },
      socialButtonsBlockButton: {
        background: colors.surfaceStrong,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      },
      socialButtonsBlockButtonText: {
        color: colors.text,
      },
      dividerText: {
        color: colors.textMuted,
      },
    },
  };
}

export function getStripeAppearance(theme: ThemeMode) {
  const colors = appThemes[theme];
  return {
    theme: theme === "dark" ? "night" : "stripe",
    labels: "above" as const,
    variables: {
      colorPrimary: colors.accent,
      colorText: colors.text,
      colorTextPlaceholder: colors.textMuted,
      colorBackground: colors.surfaceStrong,
      borderRadius: "16px",
      fontFamily: "\"Trebuchet MS\", \"Segoe UI\", sans-serif",
    },
  } satisfies Appearance;
}
