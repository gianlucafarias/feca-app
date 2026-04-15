# Design System Document: FECA

## 1. Overview: FECA"

This design system is built to transform a utility app into a tactile, sensory experience. Our Creative North Star is **"FECA"**—an aesthetic that mirrors the pacing and prestige of a high-end coffee quarterly (like _Drift_ or _Standart_).

We move beyond the "app template" look by rejecting rigid, boxy layouts in favor of intentional asymmetry and rhythmic white space. The interface should feel like it was curated and printed, not programmed. We achieve this through a "Large Format" layout philosophy: oversized headlines, generous margins, and an emphasis on negative space that allows the product photography to breathe.

---

## 2. Colors: Tonal Depth & Organic Warmth

The color palette is grounded in the earth and the craft of coffee. We use a sophisticated interplay of organic greens and toasted terracotta against a warm, paper-like foundation.

### Palette Strategy

- **The "No-Line" Rule:** To maintain an editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit on a `background` surface to create a natural break.
- **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers—like stacked sheets of fine vellum. Use the surface-container tiers (Lowest to Highest) to create "nested" depth. An inner card uses a slightly higher tier than its parent to define importance.
- **The Glass & Gradient Rule:** For floating navigation or modals, utilize **Glassmorphism**. Apply semi-transparent surface colors with a `backdrop-blur` (12px–20px). This ensures the UI feels integrated into the environment rather than "pasted" on top.
- **Signature Textures:** Use subtle linear gradients for CTAs, transitioning from `primary` (#516443) to `primary-container` (#849974). This adds "soul" and depth, mimicking the natural variation of matcha or coffee oils.

### Key Token Mapping

- **Background:** `#fbf9f5` (The "Paper" base)
- **Primary:** `#516443` (Matcha Green - Use for high-action CTAs)
- **Secondary:** `#964733` (Terracotta - Use for highlights/accents)
- **On-Surface:** `#1b1c1a` (Deep Charcoal - All primary text)

---

## 3. Typography: The Editorial Voice

We pair the refined, variable serif **Fraunces** with the functional clarity of **Inter**. This juxtaposition creates an authoritative, magazine-style hierarchy.

- **Display & Headlines (Fraunces):** Use these for "Moment" screens (Onboarding, Hero sections). Utilize large scale jumps (e.g., `display-lg` at 3.5rem) to create a dramatic focal point.
- **Body & Labels (Inter):** Use for technical specs, brewing instructions, and interface metadata. Inter provides the "utility" that balances the "romance" of Fraunces.
- **The "Editorial Lockup":** Often pair a small `label-md` in all-caps (Inter) above a `headline-lg` (Fraunces) to mimic a magazine header.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows and borders create "visual noise." In this system, we use light and tone to define space.

- **The Layering Principle:** Depth is achieved by "stacking." Place a `surface-container-lowest` card (#ffffff) on a `surface-container-low` (#f5f3ef) section. This creates a soft, natural lift without a single line of CSS border.
- **Ambient Shadows:** When a float is required (e.g., a "Buy Now" bottom sheet), use an ultra-diffused shadow: `0px 20px 40px rgba(27, 28, 26, 0.04)`. The shadow must be tinted with the `on-surface` color to feel like natural ambient light.
- **The "Ghost Border" Fallback:** If a border is necessary for accessibility in inputs, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders; they break the editorial flow.

---

## 5. Components: Crafted Primitives

### Buttons

- **Primary:** Rounded-md (12px), background: `primary` gradient, text: `on-primary` (white). No border.
- **Secondary/Tertiary:** No background. Use `label-md` text with a subtle `secondary` underline (2px offset) to mimic a hyperlink in an article.

### Cards & Discovery

- **Rule:** **Forbid the use of divider lines.**
- **Implementation:** Use vertical white space (32px or 48px) to separate content blocks. For product cards, use a `surface-container-low` background with 12px corner radius and no border.

### Inputs & Fields

- **Style:** Minimalist. Only a bottom "Ghost Border" (15% opacity) that transforms into a `primary` (Matcha) 2px line upon focus. Labels should be `label-sm` in all-caps, positioned above the input.

### Specialty Components: The "Brew Card"

- A custom component for coffee specs (Origin, Altitude, Process). This should use an asymmetrical grid—large imagery on the left, overlapping the edge of a `surface-container-highest` card on the right.

---

## 6. Do's and Don'ts

### Do

- **Do** use asymmetrical margins. For example, a 32px left margin and a 16px right margin for a headline to create a "pushed" editorial look.
- **Do** lean into high-quality, desaturated photography. The UI is the frame; the coffee is the art.
- **Do** use `Newsreader` or `Fraunces` for numeric values (like prices or brew times) to make them feel like a premium detail.

### Don't

- **Don't** use "Default" shadows (0, 4, 8). They look like software, not a brand.
- **Don't** use pure black (#000000). Always use `on-surface` (#1b1c1a) to keep the contrast sophisticated and "ink-like."
- **Don't** crowd the screen. If you feel like you need a divider line, you probably just need 16px more of white space.
