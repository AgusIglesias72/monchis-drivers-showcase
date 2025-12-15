// components/SEOStructuredData.tsx
// Datos estructurados Schema.org para SEO
// Ayuda a Google a entender mejor el contenido y aparecer en resultados enriquecidos

export function SEOStructuredData() {
  // Datos de la organización
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Monchis",
    "url": "https://monchis.com.py",
    "logo": "https://drivers.monchis.com.py/monchis-logo-red.png",
    "description": "Plataforma líder de delivery en Paraguay",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Asunción",
      "addressCountry": "PY"
    },
    "sameAs": [
      "https://www.facebook.com/monchisparaguay",
      "https://www.instagram.com/monchis.py",
      // Agregar más redes sociales si existen
    ]
  }

  // Datos del negocio local
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Monchis",
    "image": "https://drivers.monchis.com.py/monchis-logo-red.png",
    "url": "https://drivers.monchis.com.py",
    "telephone": "+595-XXX-XXXXXX", // Reemplazar con número real
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Dirección de Monchis", // Reemplazar con dirección real
      "addressLocality": "Asunción",
      "addressRegion": "Asunción",
      "postalCode": "XXXX", // Reemplazar con código postal real
      "addressCountry": "PY"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -25.2637, // Coordenadas de Asunción, ajustar si se conoce la ubicación exacta
      "longitude": -57.5759
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "00:00",
        "closes": "23:59"
      }
    ]
  }

  // Oferta de trabajo para drivers
  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "Driver de Delivery - Monchis",
    "description": "Únete a Monchis como driver de delivery. Gana dinero haciendo entregas con horarios flexibles. Beneficios: pagos semanales, bonos por desempeño, seguro, y más. Trabaja en Asunción y Gran Asunción.",
    "identifier": {
      "@type": "PropertyValue",
      "name": "Monchis",
      "value": "DRIVER-2025"
    },
    "datePosted": "2025-01-01", // Actualizar con fecha real
    "validThrough": "2025-12-31", // La oferta está vigente todo el año
    "employmentType": ["CONTRACTOR", "PART_TIME", "FULL_TIME"],
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Monchis",
      "sameAs": "https://monchis.com.py",
      "logo": "https://drivers.monchis.com.py/monchis-logo-red.png"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Varias zonas",
        "addressLocality": "Asunción",
        "addressRegion": "Gran Asunción",
        "addressCountry": "PY"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "PYG",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": 2000000,
        "maxValue": 5000000,
        "unitText": "MONTH"
      }
    },
    "qualifications": "Licencia de conducir vigente, vehículo propio (moto, auto o bicicleta), smartphone con internet",
    "responsibilities": "Realizar entregas de productos en tiempo y forma, brindar excelente servicio al cliente, mantener comunicación con el equipo",
    "skills": "Conocimiento de rutas en Asunción y Gran Asunción, orientación al cliente, responsabilidad, puntualidad",
    "benefits": "Horarios flexibles, pagos semanales, bonos por desempeño, seguro, acceso a préstamos de equipamiento",
    "applicationContact": {
      "@type": "ContactPoint",
      "contactType": "Recruitment",
      "url": "https://drivers.monchis.com.py"
    },
    "jobLocationType": "FIELD_WORK",
    "applicantLocationRequirements": {
      "@type": "Country",
      "name": "PY"
    }
  }

  // WebSite schema para habilitar sitelinks search box
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Monchis Drivers",
    "url": "https://drivers.monchis.com.py",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://drivers.monchis.com.py?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <>
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema)
        }}
      />

      {/* Local Business Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema)
        }}
      />

      {/* Job Posting Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jobPostingSchema)
        }}
      />

      {/* WebSite Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema)
        }}
      />
    </>
  )
}
