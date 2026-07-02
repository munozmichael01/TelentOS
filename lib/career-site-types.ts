export type CSMetric      = { label: string; value: string };
export type CSGalleryItem = { url: string; type: "image" | "video" };
export type CSBrand       = { name: string; logoUrl?: string; website?: string };
export type CSCultureValue = { name: string; icon: string };
export type CSBenefit     = { name: string; icon: string };
export type CSTeamProfile = { name: string; position: string; photoUrl?: string; linkedinUrl?: string };
export type CSTestimonial = { name: string; position: string; text: string; photoUrl?: string };
export type CSFAQ         = { question: string; answer: string };
export type CSSocialLink  = {
  platform: "facebook" | "instagram" | "linkedin" | "twitter" | "youtube" | "tiktok";
  url: string;
};

export interface CareerSiteContent {
  // Hero
  headline?: string;
  heroImageUrl?: string;

  // Sobre nosotros
  aboutTitle?: string;
  aboutDescription?: string;
  aboutMetrics?: CSMetric[];
  aboutGallery?: CSGalleryItem[];

  // Marcas / Partners
  brandsTitle?: string;
  brands?: CSBrand[];

  // Cultura y valores
  cultureTitle?: string;
  cultureDescription?: string;
  cultureValues?: CSCultureValue[];

  // Qué buscamos
  lookingForTitle?: string;
  lookingForDescription?: string;

  // Beneficios
  benefitsTitle?: string;
  benefits?: CSBenefit[];

  // Equipo
  teamTitle?: string;
  teamDescription?: string;
  teamProfiles?: CSTeamProfile[];

  // Testimonios
  testimonials?: CSTestimonial[];

  // FAQs
  faqsTitle?: string;
  faqs?: CSFAQ[];

  // Redes sociales
  socialLinks?: CSSocialLink[];

  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoOgImageUrl?: string;
}

/* ── Branding ─────────────────────────────────────────────────────────────── */

export interface CareerSiteBranding {
  primaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  customDomain?: string;
}

export const HEADING_FONTS = [
  { label: "Archivo (predeterminado)", value: "",                css: "'Archivo', sans-serif"        },
  { label: "Playfair Display",         value: "Playfair+Display",css: "'Playfair Display', serif"    },
  { label: "Montserrat",               value: "Montserrat",      css: "'Montserrat', sans-serif"     },
  { label: "Space Grotesk",            value: "Space+Grotesk",   css: "'Space Grotesk', sans-serif"  },
  { label: "DM Serif Display",         value: "DM+Serif+Display",css: "'DM Serif Display', serif"   },
  { label: "Raleway",                  value: "Raleway",         css: "'Raleway', sans-serif"        },
] as const;

export const BODY_FONTS = [
  { label: "Hanken Grotesk (predeterminado)", value: "",              css: "'Hanken Grotesk', sans-serif" },
  { label: "Inter",                           value: "Inter",         css: "'Inter', sans-serif"          },
  { label: "Nunito",                          value: "Nunito",        css: "'Nunito', sans-serif"         },
  { label: "Lato",                            value: "Lato",          css: "'Lato', sans-serif"           },
  { label: "Open Sans",                       value: "Open+Sans",     css: "'Open Sans', sans-serif"      },
  { label: "Source Sans 3",                   value: "Source+Sans+3", css: "'Source Sans 3', sans-serif"  },
] as const;

/* ── Page ─────────────────────────────────────────────────────────────────── */

export interface CareerSitePage {
  id: string;
  company_id: string;
  slug: string;
  is_published: boolean;
  published_at: string | null;
  draft_content: CareerSiteContent;
  published_content: CareerSiteContent | null;
  translations: Record<string, CareerSiteContent>;
  branding: CareerSiteBranding;
  created_at: string;
  updated_at: string;
}

/* ── Metrics ──────────────────────────────────────────────────────────────── */

export interface CareerSiteMetrics {
  pageViews: number;
  jobViews: number;
  applications: number;
  conversionRate: number;
  topJobs: Array<{ id: string; title: string; views: number }>;
}
