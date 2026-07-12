import { describe, it, expect } from "vitest";
import { computeFitScore } from "@/lib/fit-score";

const cand = { skills: ["React", "TypeScript"], experience_years: 5, location: "Madrid" };
const job = { skills: ["React", "Vue"], experience_min_years: 3, location: "Madrid" };

describe("computeFitScore — solape canónico (catálogo 0027/0029)", () => {
  it("con ids en ambos lados usa intersección exacta, no substrings", () => {
    // texto legado daría matching parcial; canónico: 1 de 2 requeridas
    const score = computeFitScore(cand, job, {
      candidateSkillIds: ["s-react", "s-ts"],
      jobSkillIds: ["s-react", "s-vue"],
      candidateCity: "Madrid", candidateCountry: "ES", jobCity: "Madrid", jobCountry: "ES",
    });
    // skills 0.5*60 + exp 1*25 + loc 1*15 = 70
    expect(score).toBe(70);
  });

  it("solape canónico completo → 100", () => {
    const score = computeFitScore(cand, job, {
      candidateSkillIds: ["a", "b", "c"],
      jobSkillIds: ["a", "b"],
      candidateCity: "Madrid", candidateCountry: "ES", jobCity: "Madrid", jobCountry: "ES",
    });
    expect(score).toBe(100);
  });

  it("ids canónicos evitan el falso positivo del matching por substring", () => {
    // legado: "Java" ⊂ "JavaScript" matchea mal; canónico: ids distintos, 0 solape
    const c = { skills: ["JavaScript"], experience_years: 5, location: "Madrid" };
    const j = { skills: ["Java"], experience_min_years: 0, location: "Madrid" };
    const legacy = computeFitScore(c, j);
    const canonical = computeFitScore(c, j, { candidateSkillIds: ["s-js"], jobSkillIds: ["s-java"] });
    expect(legacy).toBeGreaterThan(canonical); // el legado infla; el canónico no
    expect(canonical).toBe(0 * 60 + 25 + Math.round(0.15 * 100)); // 0 skills + exp 1 + loc texto 1 → 40
  });

  it("un solo lado estructurado → fallback a texto (nunca penalizar datos sin migrar)", () => {
    const withOnlyCand = computeFitScore(cand, job, { candidateSkillIds: ["x"], jobSkillIds: [] });
    const pureText = computeFitScore(cand, job);
    expect(withOnlyCand).toBe(pureText);
  });

  it("ubicación estructurada: país distinto penaliza aunque el texto coincida", () => {
    const j = { skills: [], experience_min_years: 0, location: "Madrid" };
    const c = { skills: [], experience_years: 1, location: "Madrid" };
    const sameCountry = computeFitScore(c, j, { candidateCountry: "ES", jobCountry: "ES", jobCity: "Madrid", candidateCity: "Madrid" });
    const diffCountry = computeFitScore(c, j, { candidateCountry: "MX", jobCountry: "ES", jobCity: "Madrid", candidateCity: "Madrid" });
    expect(sameCountry).toBeGreaterThan(diffCountry);
  });

  it("remoto puntúa ubicación completa siempre", () => {
    const j = { skills: [], experience_min_years: 0, location: "Remote" };
    expect(computeFitScore(cand, j)).toBe(Math.round(0.5 * 60 + 25 + 15));
  });
});
