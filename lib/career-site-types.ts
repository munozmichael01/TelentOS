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

  // Métricas
  aboutMetrics?: CSMetric[];

  // Galería
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
}

export interface CareerSitePage {
  id: string;
  company_id: string;
  slug: string;
  is_published: boolean;
  published_at: string | null;
  draft_content: CareerSiteContent;
  published_content: CareerSiteContent | null;
  translations: Record<string, CareerSiteContent>;
  created_at: string;
  updated_at: string;
}
