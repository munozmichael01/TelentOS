import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { buildJobsFeed, type FeedJob, type JobsFeedFormat } from "../jobs-feed";

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
});

const jobs: FeedJob[] = [
  {
    id: "1234567890abcdef1234567890abcdef12345678",
    title: "Senior Frontend Engineer",
    description: "<p>Build marketplace UI with React and TypeScript.</p>",
    company: {
      name: "Acme Retail",
      logoUrl: "https://www.example.com/logo.png",
      linkedinCompanyId: "12345",
    },
    url: "https://www.example.com/empleos/oferta/senior-frontend-engineer-acme-123",
    city: "Caracas",
    countryCode: "VE",
    location: "Caracas, Venezuela",
    salaryMin: 2000,
    salaryMax: 3500,
    salaryCurrency: "USD",
    modality: "remoto",
    employmentType: "full_time",
    category: "IT",
    createdAt: "2026-07-18T12:00:00Z",
    updatedAt: "2026-07-19T12:00:00Z",
    expiresAt: "2026-08-18T12:00:00Z",
    posterEmail: "jobs@example.com",
  },
];

function parse(format: JobsFeedFormat) {
  return parser.parse(buildJobsFeed(jobs, format));
}

describe("buildJobsFeed", () => {
  it("builds canonical schema.org JobPosting XML", () => {
    const xml = buildJobsFeed(jobs, "schemaorg");
    const doc = parser.parse(xml);
    const jobPosting = doc.jobs.job.JobPosting;

    expect(xml).toContain('xmlns:schema="https://schema.org/"');
    expect(jobPosting.title).toBe("Senior Frontend Engineer");
    expect(jobPosting.description).toContain("React and TypeScript");
    expect(jobPosting.datePosted).toBe("2026-07-18T12:00:00.000Z");
    expect(jobPosting.validThrough).toBe("2026-08-18T12:00:00.000Z");
    expect(jobPosting.employmentType).toBe("FULL_TIME");
    expect(jobPosting.url).toBe(jobs[0].url);
    expect(jobPosting.hiringOrganization.name).toBe("Acme Retail");
    expect(jobPosting.jobLocation.Place.address.addressLocality).toBe("Caracas");
    expect(jobPosting.jobLocationType).toBe("TELECOMMUTE");
    expect(jobPosting.baseSalary.MonetaryAmount.currency).toBe("USD");
  });

  it("builds Talent.com XML according to the public feed tags", () => {
    const doc = parse("talent");
    const job = doc.source.job;

    expect(doc.source.publisher).toBe("TalentOS");
    expect(doc.source.publisherurl).toBe("https://www.example.com");
    expect(job.referencenumber).toBe(jobs[0].id);
    expect(job.title).toBe("Senior Frontend Engineer");
    expect(job.company).toBe("Acme Retail");
    expect(job.city).toBe("Caracas");
    expect(job.country).toBe("VE");
    expect(job.dateposted).toBe("2026-07-18T12:00:00.000Z");
    expect(job.url).toBe(jobs[0].url);
    expect(job.description).toContain("<p>Build marketplace UI");
    expect(job.expirationdate).toBe("2026-08-18T12:00:00.000Z");
    expect(job.jobtype).toBe("Full time");
    expect(job.isremote).toBe("yes");
    expect(job.salary.salary_min).toBe("2000");
    expect(job.salary.salary_max).toBe("3500");
    expect(job.salary.salary_currency).toBe("USD");
  });

  it("builds Jooble XML with required tags and job id attribute", () => {
    const doc = parse("jooble");
    const job = doc.jobs.job;

    expect(job["@_id"]).toBe(jobs[0].id);
    expect(job.link).toBe(jobs[0].url);
    expect(job.name).toBe("Senior Frontend Engineer");
    expect(job.region).toBe("Caracas, VE");
    expect(job.description).toContain("React and TypeScript");
    expect(job.pubdate).toBe("18.07.2026");
    expect(job.updated).toBe("19.07.2026");
    expect(job.salary).toBe("2000-3500 USD");
    expect(job.company).toBe("Acme Retail");
    expect(job.expire).toBe("18.08.2026");
    expect(job.jobtype).toBe("full_time");
    expect(job.company_logo).toBe("https://www.example.com/logo.png");
  });

  it("builds LinkedIn Basic Jobs XML from the public spec", () => {
    const doc = parse("linkedin");
    const job = doc.source.job;

    expect(doc.source.publisher).toBe("TalentOS");
    expect(doc.source.expectedJobCount).toBe("1");
    expect(job.partnerJobId).toHaveLength(40);
    expect(job.company).toBe("Acme Retail");
    expect(job.title).toBe("Senior Frontend Engineer");
    expect(job.description).toContain("React and TypeScript");
    expect(job.applyUrl).toBe(jobs[0].url);
    expect(job.companyId).toBe("12345");
    expect(job.location).toBe("Caracas, VE");
    expect(job.city).toBe("Caracas");
    expect(job.country).toBe("VE");
    expect(job.workplaceTypes).toBe("Remote");
    expect(job.jobtype).toBe("FULL_TIME");
    expect(job.salaries.salary.lowEnd.amount).toBe("2000");
    expect(job.salaries.salary.highEnd.amount).toBe("3500");
    expect(job.listDate).toBe("7/18/2026");
    expect(job.expirationDate).toBe("8/18/2026");
    expect(job.posterEmail).toBe("jobs@example.com");
  });

  it("keeps CDATA safe when descriptions contain a CDATA terminator", () => {
    const xml = buildJobsFeed([{ ...jobs[0], description: "first ]]> second" }], "jooble");

    expect(xml).toContain("first ]]]]><![CDATA[> second");
    expect(parser.parse(xml).jobs.job.description).toBe("first ]]> second");
  });
});
