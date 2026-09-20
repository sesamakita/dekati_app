// constants/Typography.ts
// Sistem tipografi resmi Nunito untuk aplikasi Desa "Dekati"
// Karakter: Membulat, ramah, modern, bernafas lega (airy)

export const Fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

export const Typography = {
  // Headings
  display: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 24,
  },
  h4: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },

  // Body text - lega, line-height luas agar tidak sesak
  bodyLarge: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },

  // Bold body variations
  bodyMediumBold: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 20,
  },
  bodySmallSemiBold: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
  },

  // Interactive & UI
  button: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  buttonSmall: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
};
