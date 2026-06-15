import { describe, it, expect } from "vitest";
import { renderDSStyles, renderFontPreload, icon } from "./render-ds.js";

describe("renderDSStyles", () => {
  it("returns a <style> block", () => {
    const css = renderDSStyles();
    expect(css).toContain("<style>");
    expect(css).toContain("</style>");
  });

  it("includes CSS custom properties", () => {
    const css = renderDSStyles();
    expect(css).toContain("--cm-bg");
    expect(css).toContain("--cm-accent");
    expect(css).toContain("--cm-text");
    expect(css).toContain("--cm-surface");
    expect(css).toContain("--cm-border");
  });

  it("includes design tokens for spacing and radius", () => {
    const css = renderDSStyles();
    expect(css).toContain("--cm-space-xs");
    expect(css).toContain("--cm-radius-sm");
    expect(css).toContain("--cm-radius-full");
  });

  it("includes utility classes", () => {
    const css = renderDSStyles();
    expect(css).toContain(".cm-surface");
    expect(css).toContain(".cm-glass");
    expect(css).toContain(".cm-btn-primary");
    expect(css).toContain(".cm-btn-ghost");
    expect(css).toContain(".cm-input");
  });

  it("includes animation keyframes", () => {
    const css = renderDSStyles();
    expect(css).toContain("@keyframes cm-fade-in");
    expect(css).toContain("@keyframes cm-scale-in");
    expect(css).toContain("@keyframes cm-slide-up");
    expect(css).toContain("@keyframes cm-spin");
  });

  it("includes typography classes", () => {
    const css = renderDSStyles();
    expect(css).toContain(".cm-heading-1");
    expect(css).toContain(".cm-body");
    expect(css).toContain(".cm-mono");
  });

  it("includes badge classes", () => {
    const css = renderDSStyles();
    expect(css).toContain(".cm-badge-accent");
    expect(css).toContain(".cm-badge-success");
    expect(css).toContain(".cm-badge-warning");
  });

  it("includes skeleton loading classes", () => {
    const css = renderDSStyles();
    expect(css).toContain(".cm-skeleton");
    expect(css).toContain(".cm-skeleton-text");
  });
});

describe("renderFontPreload", () => {
  it("returns link tags for Google Fonts", () => {
    const links = renderFontPreload();
    expect(links).toContain("fonts.googleapis.com");
    expect(links).toContain("fonts.gstatic.com");
    expect(links).toContain("Inter");
    expect(links).toContain("Playfair");
  });

  it("includes preconnect for performance", () => {
    const links = renderFontPreload();
    expect(links).toContain("preconnect");
  });
});

describe("icon", () => {
  it("returns an SVG string for known icons", () => {
    const svg = icon("utensils", 24);
    expect(svg).toContain("<svg");
    expect(svg).toContain("stroke=\"currentColor\"");
    expect(svg).toContain("viewBox=\"0 0 24 24\"");
    // Should NOT be empty string
    expect(svg.length).toBeGreaterThan(50);
  });

  it("returns empty string for unknown icon", () => {
    const result = icon("nonexistent" as any);
    expect(result).toBe("");
  });

  it("applies custom size", () => {
    const svg = icon("check", 32, "custom-class");
    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="32"');
    expect(svg).toContain('class="custom-class"');
  });

  it("produces valid SVGs for common icons", () => {
    const names = ["shopping-cart", "plus", "minus", "send", "check", "user", "x", "bell"] as const;
    for (const name of names) {
      const svg = icon(name);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg.length).toBeGreaterThan(30);
    }
  });

  it("uses default size 20 when not specified", () => {
    const svg = icon("store");
    expect(svg).toContain('width="20"');
    expect(svg).toContain('height="20"');
  });

  it("contains valid path/group elements", () => {
    const svg = icon("plus");
    expect(svg).toContain("<path");
    expect(svg).toContain("</svg>");
  });
});
