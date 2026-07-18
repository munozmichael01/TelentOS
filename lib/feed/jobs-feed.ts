export type JobsFeedFormat = "schemaorg" | "talent" | "jooble" | "linkedin";

export type FeedCompany = {
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  linkedinCompanyId?: string | null;
};

export type FeedJob = {
  id: string;
  title: string;
  description: string;
  company: FeedCompany;
  url: string;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  modality?: string | null;
  employmentType?: string | null;
  category?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  expiresAt?: string | null;
  posterEmail?: string | null;
};

type Adapter = (jobs: FeedJob[]) => string;

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

const EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACT",
  internship: "INTERNSHIP",
  volunteer: "VOLUNTEER",
  temporary: "TEMPORARY",
};

const TALENT_JOB_TYPE: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

const LINKEDIN_JOB_TYPE: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACT",
  internship: "INTERNSHIP",
  volunteer: "VOLUNTEER",
};

const adapters: Record<JobsFeedFormat, Adapter> = {
  schemaorg: buildSchemaOrgFeed,
  talent: buildTalentFeed,
  jooble: buildJoobleFeed,
  linkedin: buildLinkedInFeed,
};

export function buildJobsFeed(jobs: FeedJob[], format: JobsFeedFormat): string {
  return adapters[format](jobs);
}

function tag(name: string, value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return `<${name}>${escapeXml(String(value))}</${name}>`;
}

function cdataTag(name: string, value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return `<${name}><![CDATA[${cdata(String(value))}]]></${name}>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

function compact(lines: Array<string | false | null | undefined>): string {
  return lines.filter(Boolean).join("\n");
}

function description(job: FeedJob): string {
  return job.description?.trim() || job.title;
}

function locationText(job: FeedJob): string {
  return [job.city, job.state, job.countryCode].filter(Boolean).join(", ") || job.location || "Remote";
}

function isRemote(job: FeedJob): boolean {
  return job.modality === "remoto" || /\bremote|remoto\b/i.test(job.location ?? "");
}

function workplaceType(job: FeedJob): "Remote" | "Hybrid" | "On-site" | undefined {
  if (job.modality === "remoto") return "Remote";
  if (job.modality === "hibrido") return "Hybrid";
  if (job.modality === "presencial") return "On-site";
  return undefined;
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function rfcDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

function dottedDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

function slashDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function salaryText(job: FeedJob): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const currency = job.salaryCurrency ?? "";
  if (job.salaryMin != null && job.salaryMax != null) return `${job.salaryMin}-${job.salaryMax} ${currency}`.trim();
  return `${job.salaryMin ?? job.salaryMax} ${currency}`.trim();
}

function buildSchemaOrgFeed(jobs: FeedJob[]): string {
  return compact([
    XML_HEADER,
    '<jobs xmlns:schema="https://schema.org/">',
    ...jobs.map((job) => compact([
      `<job id="${escapeXml(job.id)}">`,
      "<schema:JobPosting>",
      cdataTag("schema:title", job.title),
      cdataTag("schema:description", description(job)),
      tag("schema:datePosted", isoDate(job.createdAt)),
      tag("schema:validThrough", isoDate(job.expiresAt)),
      cdataTag("schema:employmentType", job.employmentType ? (EMPLOYMENT_TYPE[job.employmentType] ?? job.employmentType) : undefined),
      tag("schema:url", job.url),
      "      <schema:hiringOrganization>",
      cdataTag("schema:name", job.company.name),
      tag("schema:logo", job.company.logoUrl),
      "      </schema:hiringOrganization>",
      "      <schema:jobLocation>",
      "        <schema:Place>",
      "          <schema:address>",
      cdataTag("schema:addressLocality", job.city),
      tag("schema:addressCountry", job.countryCode),
      "          </schema:address>",
      "        </schema:Place>",
      "      </schema:jobLocation>",
      isRemote(job) && tag("schema:jobLocationType", "TELECOMMUTE"),
      buildSchemaSalary(job),
      "</schema:JobPosting>",
      "</job>",
    ])),
    "</jobs>",
  ]);
}

function buildSchemaSalary(job: FeedJob): string {
  if (job.salaryMin == null && job.salaryMax == null) return "";
  return compact([
    "      <schema:baseSalary>",
    "        <schema:MonetaryAmount>",
    tag("schema:currency", job.salaryCurrency ?? "USD"),
    "          <schema:value>",
    "            <schema:QuantitativeValue>",
    tag("schema:minValue", job.salaryMin),
    tag("schema:maxValue", job.salaryMax),
    tag("schema:unitText", "MONTH"),
    "            </schema:QuantitativeValue>",
    "          </schema:value>",
    "        </schema:MonetaryAmount>",
    "      </schema:baseSalary>",
  ]);
}

function buildTalentFeed(jobs: FeedJob[]): string {
  return compact([
    XML_HEADER,
    "<source>",
    cdataTag("publisher", "TalentOS"),
    cdataTag("publisherurl", jobs[0]?.url ? new URL(jobs[0].url).origin : undefined),
    tag("lastbuilddate", new Date().toISOString()),
    ...jobs.map((job) => compact([
      "  <job>",
      cdataTag("referencenumber", job.id),
      cdataTag("title", job.title),
      cdataTag("company", job.company.name),
      cdataTag("city", job.city ?? job.location ?? "Remote"),
      cdataTag("state", job.state),
      cdataTag("country", job.countryCode),
      cdataTag("dateposted", isoDate(job.createdAt)),
      cdataTag("url", job.url),
      cdataTag("description", description(job)),
      cdataTag("expirationdate", isoDate(job.expiresAt)),
      cdataTag("jobtype", job.employmentType ? (TALENT_JOB_TYPE[job.employmentType] ?? job.employmentType) : undefined),
      cdataTag("isremote", isRemote(job) ? "yes" : "no"),
      cdataTag("category", job.category),
      cdataTag("logo", job.company.logoUrl),
      buildTalentSalary(job),
      "  </job>",
    ])),
    "</source>",
  ]);
}

function buildTalentSalary(job: FeedJob): string {
  if (job.salaryMin == null && job.salaryMax == null) return "";
  return compact([
    "<salary>",
    cdataTag("salary_max", job.salaryMax),
    cdataTag("salary_min", job.salaryMin),
    cdataTag("salary_currency", job.salaryCurrency ?? "USD"),
    cdataTag("period", "month"),
    cdataTag("type", "BASE_SALARY"),
    "</salary>",
  ]);
}

function buildJoobleFeed(jobs: FeedJob[]): string {
  return compact([
    XML_HEADER,
    "<jobs>",
    ...jobs.map((job) => compact([
      `<job id="${escapeXml(job.id)}">`,
      cdataTag("link", job.url),
      cdataTag("name", job.title),
      cdataTag("region", locationText(job)),
      cdataTag("description", description(job)),
      tag("pubdate", dottedDate(job.createdAt)),
      tag("updated", dottedDate(job.updatedAt ?? job.createdAt)),
      cdataTag("salary", salaryText(job)),
      cdataTag("company", job.company.name),
      tag("expire", dottedDate(job.expiresAt)),
      cdataTag("jobtype", job.employmentType),
      cdataTag("company_logo", job.company.logoUrl),
      "</job>",
    ])),
    "</jobs>",
  ]);
}

function buildLinkedInFeed(jobs: FeedJob[]): string {
  return compact([
    XML_HEADER,
    "<source>",
    tag("lastBuildDate", rfcDate(new Date().toISOString())),
    cdataTag("publisherURL", jobs[0]?.url ? new URL(jobs[0].url).origin : undefined),
    cdataTag("publisher", "TalentOS"),
    tag("expectedJobCount", jobs.length),
    ...jobs.map((job) => compact([
      "  <job>",
      cdataTag("partnerJobId", job.id.slice(0, 40)),
      cdataTag("company", job.company.name),
      cdataTag("title", job.title),
      cdataTag("description", description(job)),
      cdataTag("applyUrl", job.url),
      cdataTag("companyId", job.company.linkedinCompanyId),
      cdataTag("location", locationText(job)),
      cdataTag("city", job.city),
      cdataTag("country", job.countryCode),
      cdataTag("workplaceTypes", workplaceType(job)),
      cdataTag("jobtype", job.employmentType ? (LINKEDIN_JOB_TYPE[job.employmentType] ?? job.employmentType) : undefined),
      buildLinkedInSalary(job),
      tag("listDate", slashDate(job.createdAt)),
      tag("expirationDate", slashDate(job.expiresAt)),
      cdataTag("posterEmail", job.posterEmail),
      "  </job>",
    ])),
    "</source>",
  ]);
}

function buildLinkedInSalary(job: FeedJob): string {
  if (job.salaryMin == null && job.salaryMax == null) return "";
  return compact([
    "<salaries>",
    "  <salary>",
    job.salaryMin != null && compact([
      "    <lowEnd>",
      tag("amount", job.salaryMin),
      tag("currencyCode", job.salaryCurrency ?? "USD"),
      "    </lowEnd>",
    ]),
    job.salaryMax != null && compact([
      "    <highEnd>",
      tag("amount", job.salaryMax),
      tag("currencyCode", job.salaryCurrency ?? "USD"),
      "    </highEnd>",
    ]),
    tag("period", "MONTHLY"),
    tag("type", "BASE_SALARY"),
    "  </salary>",
    "</salaries>",
  ]);
}
