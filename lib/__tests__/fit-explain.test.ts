import { describe, it, expect } from "vitest";
import { computeFitScore } from "@/lib/fit-score";
import { explainFitScore, type ExplainInput } from "@/lib/fit-explain";

const cand = { skills: ["React", "TypeScript"], experience_years: 5, location: "Madrid" };
const job = { skills: ["React", "Vue"], experience_min_years: 3, location: "Madrid" };
const structured: ExplainInput = {
  candidateSkills: [{ id: "s-react", name: "React" }, { id: "s-ts", name: "TypeScript" }],
  jobSkills: [{ id: "s-react", name: "React" }, { id: "s-vue", name: "Vue" }],
  candidateCity: "Madrid", candidateCountry: "ES", jobCity: "Madrid", jobCountry: "ES",
};

describe("explainFitScore — el desglose nunca diverge del score", () => {
  it("nombra matched/missing en modo canónico y el score cruza con computeFitScore", () => {
    const ex = explainFitScore(cand, job, structured);
    expect(ex.score).toBe(
      computeFitScore(cand, job, {
        candidateSkillIds: ["s-react", "s-ts"], jobSkillIds: ["s-react", "s-vue"],
        candidateCity: "Madrid", candidateCountry: "ES", jobCity: "Madrid", jobCountry: "ES",
      }),
    );
    expect(ex.skills.mode).toBe("canonico");
    expect(ex.skills.matched).toEqual(["React"]);
    expect(ex.skills.missing).toEqual(["Vue"]);
    expect(ex.location.verdict).toBe("exacta");
    expect(ex.experience.points).toBe(25); // 5 ≥ 3
  });

  it("fallback a texto cuando falta un lado estructurado (cruza con el score texto)", () => {
    const ex = explainFitScore(cand, job);
    expect(ex.score).toBe(computeFitScore(cand, job));
    expect(ex.skills.mode).toBe("texto");
    expect(ex.skills.matched).toContain("React");
  });

  it("los puntos por factor suman ~score (redondeos aparte, ±2)", () => {
    for (const s of [structured, undefined]) {
      const ex = explainFitScore(cand, job, s);
      const sum = ex.skills.points + ex.experience.points + ex.location.points;
      expect(Math.abs(sum - ex.score)).toBeLessThanOrEqual(2);
    }
  });

  it("país distinto se nombra y penaliza", () => {
    const ex = explainFitScore(cand, job, { ...structured, candidateCountry: "MX", candidateCity: "CDMX" });
    expect(ex.location.verdict).toBe("pais-distinto");
    expect(ex.score).toBeLessThan(explainFitScore(cand, job, structured).score);
  });

  it("oferta sin requisitos → modo sin-requisitos, neutro", () => {
    const ex = explainFitScore(cand, { skills: [], experience_min_years: 0, location: null });
    expect(ex.skills.mode).toBe("sin-requisitos");
    expect(ex.location.verdict).toBe("remota"); // sin ubicación = no restringe
    expect(ex.score).toBe(computeFitScore(cand, { skills: [], experience_min_years: 0, location: null }));
  });
});
