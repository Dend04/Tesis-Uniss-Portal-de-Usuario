// next-seo.config.js
export default {
    titleTemplate: "%s | Universidad José Martí de Sancti Spíritus",
    defaultTitle: "Portal Estudiantil - Universidad José Martí de Sancti Spíritus",
    description: "Accede a tu estado de cuenta, cambia tu contraseña y gestiona tu perfil académico en la Universidad José Martí de Sancti Spíritus.",
    openGraph: {
      type: "website",
      locale: "es_ES",
      url: "https://portal.uniss.edu.cu",
      siteName: "Universidad José Martí de Sancti Spíritus",
      images: [
        {
          url: "https://portal.uniss.edu.cu/og-image.jpg", // Imagen institucional
          width: 1200,
          height: 630,
          alt: "Campus Universitario José Martí",
        },
      ],
    },
    twitter: {
      cardType: "summary_large_image",
    },
  };