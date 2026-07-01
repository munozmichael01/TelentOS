-- ── Career Site Demo Content ───────────────────────────────────────────────
-- Rellena (o crea) la entrada career_site_pages con datos profesionales de ejemplo.
-- Ejecuta desde el SQL Editor de Supabase.
-- ──────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_company_id uuid;
  v_slug       text;
  v_content    jsonb;
BEGIN
  SELECT id, slug INTO v_company_id, v_slug FROM companies LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No existe ninguna empresa. Abortando.';
    RETURN;
  END IF;

  v_content := $json${
    "headline": "Únete al equipo que reimagina los recursos humanos",
    "heroImageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80",

    "aboutTitle": "Quiénes somos",
    "aboutDescription": "Somos una empresa de tecnología centrada en las personas. Desde 2015 ayudamos a los equipos de RRHH a trabajar de forma más inteligente con herramientas que combinan automatización, datos y un diseño pensado para las personas. Hoy somos más de 180 profesionales repartidos entre Barcelona, Madrid y Ciudad de México.",

    "aboutMetrics": [
      { "value": "180+",  "label": "personas en el equipo" },
      { "value": "9 años","label": "de trayectoria"       },
      { "value": "300+",  "label": "clientes activos"     },
      { "value": "4.8★",  "label": "valoración Glassdoor" }
    ],

    "aboutGallery": [
      { "url": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80", "type": "image" },
      { "url": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80", "type": "image" },
      { "url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80", "type": "image" },
      { "url": "https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=800&q=80", "type": "image" }
    ],

    "brandsTitle": "Nuestros productos",
    "brands": [
      { "name": "TalentOS Core",    "website": "#" },
      { "name": "TalentOS Recruit", "website": "#" },
      { "name": "TalentOS Academy", "website": "#" }
    ],

    "cultureTitle": "Nuestra cultura",
    "cultureDescription": "Creemos en un ambiente donde cada persona puede dar lo mejor de sí misma. Autonomía real, feedback continuo y espacio para crecer y equivocarse.",
    "cultureValues": [
      { "icon": "🚀", "name": "Ambición con propósito"       },
      { "icon": "🤝", "name": "Colaboración sin jerarquías"  },
      { "icon": "🌱", "name": "Aprendizaje continuo"         },
      { "icon": "💡", "name": "Autonomía real"               },
      { "icon": "💎", "name": "Excelencia en lo que hacemos" },
      { "icon": "🌍", "name": "Impacto global"               }
    ],

    "lookingForTitle": "El perfil que buscamos",
    "lookingForDescription": "Buscamos personas con curiosidad intelectual y ganas de construir algo que importe. No nos importa tanto el CV como la manera en que piensas, te adaptas y resuelves problemas. Si te apasiona la tecnología y crees que los entornos de trabajo pueden ser mejores, queremos conocerte.",

    "benefitsTitle": "Qué te ofrecemos",
    "benefits": [
      { "icon": "🏥", "name": "Seguro médico privado"          },
      { "icon": "🏠", "name": "Full remote opcional"            },
      { "icon": "📚", "name": "Presupuesto formación 1.500 €/año" },
      { "icon": "💰", "name": "Bonus anual por objetivos"       },
      { "icon": "⏰", "name": "Horario flexible"                },
      { "icon": "✈️", "name": "Team offsite anual"             },
      { "icon": "🍔", "name": "Ticket restaurante"              },
      { "icon": "🧠", "name": "Apoyo salud mental"              }
    ],

    "teamTitle": "El equipo de liderazgo",
    "teamDescription": "Diversidad de perfiles, un mismo norte: construir tecnología que transforme la forma en que trabajamos.",
    "teamProfiles": [
      { "name": "Sara Vidal",   "position": "CEO & Co-founder", "photoUrl": "https://i.pravatar.cc/200?img=47", "linkedinUrl": "https://linkedin.com" },
      { "name": "Carlos Mora",  "position": "CTO & Co-founder", "photoUrl": "https://i.pravatar.cc/200?img=68", "linkedinUrl": "https://linkedin.com" },
      { "name": "Marta Puig",   "position": "Head of Product",  "photoUrl": "https://i.pravatar.cc/200?img=5",  "linkedinUrl": "https://linkedin.com" },
      { "name": "Andrés Gil",   "position": "VP Engineering",   "photoUrl": "https://i.pravatar.cc/200?img=33", "linkedinUrl": "https://linkedin.com" },
      { "name": "Lucía Ferrer", "position": "Head of People",   "photoUrl": "https://i.pravatar.cc/200?img=9",  "linkedinUrl": "https://linkedin.com" },
      { "name": "Iñigo Ruiz",   "position": "Head of Sales",    "photoUrl": "https://i.pravatar.cc/200?img=56", "linkedinUrl": "https://linkedin.com" }
    ],

    "testimonials": [
      {
        "name": "Noa Blasco",
        "position": "Senior Engineer · 3 años en el equipo",
        "text": "Entré como junior y hoy lidero un equipo de cinco personas. La empresa invierte de verdad en que crezcas, no solo lo dice en la página de empleo.",
        "photoUrl": "https://i.pravatar.cc/200?img=49"
      },
      {
        "name": "Pau Esteve",
        "position": "Product Designer · 2 años en el equipo",
        "text": "El nivel del equipo es altísimo, pero nadie tiene ego. Aprendes constantemente y se nota que hay una cultura real de feedback y mejora.",
        "photoUrl": "https://i.pravatar.cc/200?img=39"
      },
      {
        "name": "Elena Bravo",
        "position": "Customer Success · 4 años en el equipo",
        "text": "He rechazado otras ofertas para quedarme aquí. La flexibilidad, el proyecto y el equipo hacen que valga la pena cada día.",
        "photoUrl": "https://i.pravatar.cc/200?img=23"
      }
    ],

    "faqsTitle": "Preguntas frecuentes",
    "faqs": [
      {
        "question": "¿Cuál es el proceso de selección?",
        "answer": "Normalmente son 3 pasos: entrevista inicial con People (30 min), prueba técnica o de caso (compensada si es extensa) y entrevista final con el hiring manager y un miembro del equipo."
      },
      {
        "question": "¿Tenéis política de trabajo en remoto?",
        "answer": "Sí. Trabajamos en remoto por defecto. Tenemos oficinas en Barcelona y Madrid para quien quiera ir, y hacemos un offsite de equipo completo una vez al año."
      },
      {
        "question": "¿Cuánto tarda el proceso de selección?",
        "answer": "Intentamos resolverlo en menos de 3 semanas desde la primera entrevista. Si hay algún retraso, siempre te avisamos y explicamos el motivo."
      },
      {
        "question": "¿Qué tecnologías usáis?",
        "answer": "React, Next.js, TypeScript, Go y PostgreSQL son el core. También trabajamos con Kubernetes, Terraform y un stack de datos basado en dbt y BigQuery."
      },
      {
        "question": "¿Tenéis programas de mentoring o formación interna?",
        "answer": "Sí. Cada persona tiene un presupuesto de 1.500 € anuales para formación. También organizamos tech talks internas, hackathons trimestrales y un programa de mentoring cruzado."
      }
    ],

    "socialLinks": [
      { "platform": "linkedin",  "url": "https://linkedin.com"  },
      { "platform": "instagram", "url": "https://instagram.com" },
      { "platform": "twitter",   "url": "https://twitter.com"   }
    ]
  }$json$;

  INSERT INTO career_site_pages
    (company_id, slug, draft_content, published_content, is_published, published_at)
  VALUES
    (v_company_id, v_slug, v_content, v_content, true, now())
  ON CONFLICT (company_id) DO UPDATE SET
    draft_content     = EXCLUDED.draft_content,
    published_content = EXCLUDED.published_content,
    is_published      = true,
    published_at      = now(),
    updated_at        = now();

  RAISE NOTICE 'Career site demo cargado para company_id=%', v_company_id;
END;
$$;
