import { describe, it, expect } from "vitest";
import { getJobJsonLd } from "../job-jsonld";

describe("getJobJsonLd", () => {
  const mockCompany = {
    name: "Acme Corp",
    logo_url: "https://acme.corp/logo.png",
  };

  const mockJob = {
    title: "Software Engineer",
    description: "Build awesome software",
    created_at: "2026-07-18T12:00:00Z",
    employment_type: "full_time",
    city: "Caracas",
    country_code: "VE",
    modality: "remoto",
    salary_min: 2000,
    salary_max: 3000,
    salary_currency: "USD",
  };

  it("should generate a complete JobPosting JSON-LD with remote settings and salary", () => {
    const result = getJobJsonLd(mockJob, mockCompany);

    expect(result).toEqual({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: "Software Engineer",
      description: "Build awesome software",
      datePosted: "2026-07-18T12:00:00Z",
      employmentType: "FULL_TIME",
      hiringOrganization: {
        "@type": "Organization",
        name: "Acme Corp",
        logo: "https://acme.corp/logo.png",
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Caracas",
          addressCountry: "VE",
        },
      },
      jobLocationType: "TELECOMMUTE",
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: {
          "@type": "QuantitativeValue",
          minValue: 2000,
          maxValue: 3000,
          unitText: "MONTH",
        },
      },
    });
  });

  it("should handle minimal job details without location, salary, or company logo", () => {
    const result = getJobJsonLd(
      {
        title: "Minimal Job",
        created_at: "2026-07-18T12:00:00Z",
      },
      {
        name: "Minimal Company",
      }
    );

    expect(result).toEqual({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: "Minimal Job",
      description: "Minimal Job",
      datePosted: "2026-07-18T12:00:00Z",
      hiringOrganization: {
        "@type": "Organization",
        name: "Minimal Company",
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
        },
      },
    });
  });

  it("should format validThrough if closing date is present", () => {
    const result = getJobJsonLd(
      {
        title: "Job with deadline",
        created_at: "2026-07-18T12:00:00Z",
        valid_through: "2026-08-18T12:00:00Z",
      },
      {
        name: "Acme Corp",
      }
    );

    expect(result.validThrough).toBe("2026-08-18T12:00:00Z");
  });

  it("should format validThrough if closes_at is present", () => {
    const result = getJobJsonLd(
      {
        title: "Job with deadline",
        created_at: "2026-07-18T12:00:00Z",
        closes_at: "2026-08-18T12:00:00Z",
      },
      {
        name: "Acme Corp",
      }
    );

    expect(result.validThrough).toBe("2026-08-18T12:00:00Z");
  });

  it("should map employment type to standard values", () => {
    const types = ["full_time", "part_time", "contract", "internship", "unknown_type"];
    const expected = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN", "unknown_type"];

    types.forEach((type, idx) => {
      const result = getJobJsonLd(
        {
          title: "Job",
          created_at: "2026-07-18T12:00:00Z",
          employment_type: type,
        },
        {
          name: "Acme Corp",
        }
      );
      expect(result.employmentType).toBe(expected[idx]);
    });
  });

  it("should fall back to title when description is null or empty", () => {
    const resultNull = getJobJsonLd(
      {
        title: "Job Title",
        description: null,
        created_at: "2026-07-18T12:00:00Z",
      },
      {
        name: "Acme Corp",
      }
    );
    expect(resultNull.description).toBe("Job Title");

    const resultEmpty = getJobJsonLd(
      {
        title: "Job Title",
        description: "",
        created_at: "2026-07-18T12:00:00Z",
      },
      {
        name: "Acme Corp",
      }
    );
    expect(resultEmpty.description).toBe("Job Title");
  });
});
