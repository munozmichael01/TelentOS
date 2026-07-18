import { describe, it, expect } from "vitest";
import { computeProfileCompleteness, type ProfileForCompleteness } from "../completeness";

const full: ProfileForCompleteness = {
  full_name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+58 412 1234567",
  about: "Ingeniera con 5 años de experiencia.",
  hasCv: false,
  city: "Caracas",
  country_code: "VE",
  experience_years: 5,
  education: [{ degree: "Ing. Informática" }],
  languages: [{ language: "Español", level: "native" }],
  pref_salary_min: 1000,
  pref_modality: ["remoto"],
  pref_locations: [],
  pref_contract: [],
  skillCount: 5,
};

describe("computeProfileCompleteness", () => {
  it("perfil completo → complete y 100%", () => {
    const r = computeProfileCompleteness(full);
    expect(r.complete).toBe(true);
    expect(r.pct).toBe(100);
    expect(r.missing).toEqual([]);
    expect(r.hasProfile).toBe(true);
  });

  it("CV subido cuenta como perfil generado aunque no haya 'about'", () => {
    const r = computeProfileCompleteness({ ...full, about: null, hasCv: true });
    expect(r.complete).toBe(true);
  });

  it("menos de 3 skills → incompleto, marca 'skills'", () => {
    const r = computeProfileCompleteness({ ...full, skillCount: 2 });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("skills");
  });

  it("experiencia o formación: basta una de las dos", () => {
    const soloExp = computeProfileCompleteness({ ...full, education: [], experience_years: 3 });
    expect(soloExp.missing).not.toContain("background");
    const ninguna = computeProfileCompleteness({ ...full, education: [], experience_years: 0 });
    expect(ninguna.missing).toContain("background");
  });

  it("sin preferencias → incompleto", () => {
    const r = computeProfileCompleteness({ ...full, pref_salary_min: null, pref_modality: [], pref_locations: [], pref_contract: [] });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("preferences");
  });

  it("solo nombre+email → hasProfile true pero no completo", () => {
    const r = computeProfileCompleteness({
      full_name: "Ana", email: "ana@example.com", phone: null, about: null, hasCv: false,
      city: null, country_code: null, experience_years: null, education: [], languages: [],
      pref_salary_min: null, pref_modality: [], pref_locations: [], pref_contract: [], skillCount: 0,
    });
    expect(r.hasProfile).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.pct).toBe(Math.round((1 / 8) * 100));
  });

  it("perfil vacío → hasProfile false", () => {
    const r = computeProfileCompleteness({
      full_name: null, email: null, phone: null, about: null, hasCv: false,
      city: null, country_code: null, experience_years: null, education: [], languages: [],
      pref_salary_min: null, pref_modality: [], pref_locations: [], pref_contract: [], skillCount: 0,
    });
    expect(r.hasProfile).toBe(false);
    expect(r.pct).toBe(0);
  });
});
