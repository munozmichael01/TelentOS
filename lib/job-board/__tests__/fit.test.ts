import { describe, it, expect } from "vitest";
import { computeRecruiterFit, computeCandidateMatch, computeScreeningOutcome } from "@/lib/job-board/fit";

const baseJob = {
  skills: [] as { skillId: string; requirement: "excluyente" | "deseable" }[],
  experienceMinYears: 0,
  educationLevel: null,
  seniorityLevel: null,
  country: null,
  city: null,
  location: null,
};
const baseCand = {
  skillIds: [] as string[],
  experienceYears: 0,
  educationLevel: null,
  seniorityLevel: null,
  country: null,
  city: null,
  location: null,
};

describe("computeRecruiterFit", () => {
  it("match perfecto de skills + exp + edu + seniority + ubicación → alto y cumple requisitos", () => {
    const r = computeRecruiterFit({
      job: { ...baseJob, skills: [{ skillId: "a", requirement: "excluyente" }, { skillId: "b", requirement: "deseable" }], experienceMinYears: 3, educationLevel: "bachelor", seniorityLevel: "senior", country: "ES", city: "Madrid", location: "Madrid" },
      candidate: { ...baseCand, skillIds: ["a", "b"], experienceYears: 5, educationLevel: "master", seniorityLevel: "senior", country: "ES", city: "Madrid", location: "Madrid" },
    });
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.meetsHardRequirements).toBe(true);
    expect(r.breakdown.education.met).toBe(true);
    expect(r.breakdown.seniority.met).toBe(true);
  });

  it("skill EXCLUYENTE ausente → meetsHardRequirements false (aunque el score no sea 0)", () => {
    const r = computeRecruiterFit({
      job: { ...baseJob, skills: [{ skillId: "must", requirement: "excluyente" }, { skillId: "nice", requirement: "deseable" }] },
      candidate: { ...baseCand, skillIds: ["nice"] },
    });
    expect(r.meetsHardRequirements).toBe(false);
    expect(r.breakdown.skills.missingExcluyente).toEqual(["must"]);
  });

  it("educación insuficiente → education.met false", () => {
    const r = computeRecruiterFit({
      job: { ...baseJob, educationLevel: "master" },
      candidate: { ...baseCand, educationLevel: "bachelor" },
    });
    expect(r.breakdown.education.met).toBe(false);
  });

  it("sin skills definidas → neutro, no penaliza", () => {
    const r = computeRecruiterFit({ job: baseJob, candidate: baseCand });
    expect(r.breakdown.skills.pct).toBe(0.5);
    expect(r.meetsHardRequirements).toBe(true);
  });

  it("remoto puntúa ubicación al máximo", () => {
    const r = computeRecruiterFit({
      job: { ...baseJob, location: "Remoto" },
      candidate: { ...baseCand, country: "VE" },
    });
    expect(r.breakdown.location.pct).toBe(1);
  });
});

describe("computeCandidateMatch (match para ti)", () => {
  it("solo cuenta las preferencias que el candidato fijó", () => {
    const r = computeCandidateMatch({
      job: { salaryMax: 60000, salaryCurrency: "EUR", modality: "remoto", country: "ES", city: "Madrid", employmentType: "full_time" },
      prefs: { salaryMin: 50000, currency: "EUR", modality: ["remoto"], locations: [], contract: [] },
    });
    expect(r.total).toBe(2); // salario + modalidad (ubicación/contrato no definidos)
    expect(r.met).toBe(2);
    expect(r.details.location).toBe(null);
  });

  it("salario por debajo de la preferencia → no cumple", () => {
    const r = computeCandidateMatch({
      job: { salaryMax: 30000, salaryCurrency: "EUR", modality: null, country: null, city: null, employmentType: null },
      prefs: { salaryMin: 50000, currency: "EUR", modality: [], locations: [], contract: [] },
    });
    expect(r.details.salary).toBe(false);
    expect(r.met).toBe(0);
  });
});

describe("computeScreeningOutcome", () => {
  it("filtro duro: respuesta que coincide con la regla → descarte automático", () => {
    const r = computeScreeningOutcome(
      [{ id: "q1", mode: "filter", weight: 0, filter_rule: { match: "no" } }],
      { q1: "no" }
    );
    expect(r.autoDiscard).toBe(true);
    expect(r.discardReasons).toEqual(["q1"]);
  });

  it("ponderada: coincide → suma el peso; no coincide → 0", () => {
    const qs = [
      { id: "q1", mode: "weighted" as const, weight: 10, filter_rule: { match: "si" } },
      { id: "q2", mode: "weighted" as const, weight: 5, filter_rule: { match: "si" } },
    ];
    const r = computeScreeningOutcome(qs, { q1: "si", q2: "no" });
    expect(r.weightedDelta).toBe(10);
    expect(r.autoDiscard).toBe(false);
  });
});
