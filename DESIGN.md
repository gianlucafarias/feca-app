# Design System Strategy: feca
 
## 1. Overview & Creative North Star
The Creative North Star for this design system is **"feca"** It is an editorial-first framework that treats digital interfaces like high-end lifestyle journals. Rather than adhering to the rigid, boxy constraints of traditional Material Design, this system prioritizes organic flow, high-contrast typography, and a "layered paper" aesthetic.
 
We break the "template" look through:
*   **Intentional Asymmetry:** Overlapping image cards and off-center text alignments.
*   **Organic Silhouettes:** Replacing sharp corners with hyper-rounded "blobs" and pill shapes (up to `3rem` and `9999px`).
*   **Editorial Scale:** Using high-contrast serif displays against wide-set, functional sans-serif labels.
 
The goal is to make every screen feel like a custom-designed page where content dictates the container, not the other way around.
 
---
 
## 2. Colors & Surface Philosophy
The palette is built on a foundation of "Warm Neutrals" and "Soft Pastels," punctuated by "Deep Accents."
 
### The "No-Line" Rule
**Explicitly prohibit 1px solid borders for sectioning.** Boundaries must be defined solely through background color shifts. 
*   Use `surface-container-low` (#f6f3f0) or `secondary-fixed` (#cfe5ff) sections sitting directly on the `surface` (#fcf9f6) background. 
 
### Surface Hierarchy & Nesting
Treat the UI as physical layers. Use the surface tiers to create depth without shadows:
1.  **Base Layer:** `surface` (#fcf9f6) or `surface-bright`.
2.  **Sectional Layer:** `surface-container` (#f0edea) or `surface-container-low`.
3.  **Floating Elements:** `surface-container-lowest` (#ffffff) for high-impact cards.
 
### Signature Textures & Glass
*   **The Glass Rule:** For floating elements like the bottom navigation, use semi-transparent `surface` colors with a `backdrop-blur` (e.g., 20px). This ensures the UI feels integrated into the content below.
*   **Gradients:** Use subtle tonal transitions from `secondary` (#286393) to `secondary-dim` (#165786) for primary CTAs to add "soul" and depth that prevents a flat, sterile appearance.
 
---
 
## 3. Typography
We employ a "High/Low" typographic strategy: the sophistication of a high-contrast serif paired with the industrial clarity of a wide sans-serif.
 
*   **Display & Headlines (`newsreader`):** These are our "Voice." Use `display-lg` to `headline-sm` for editorial storytelling. The serif should feel bold and authoritative.
*   **Interface & Labels (`plusJakartaSans`):** These are our "Tools." Use `label-md` and `body-sm` for UI actions and metadata. The wide tracking of Jakarta Sans provides a clean, modern counter-balance to the traditional serif.
*   **Hierarchy as Identity:** Large serifs (`3.5rem`) are used not just for titles, but as visual anchors that break across image boundaries, creating an overlapping, "tucked-in" feel.
 
---
 
## 4. Elevation & Depth
In this system, depth is organic and ambient, never structural.
 
*   **Tonal Layering:** Place a `surface-container-lowest` card on a `surface-container-low` section. The subtle shift in hex code provides enough contrast to signify a "lift" without visual clutter.
*   **Ambient Shadows:** If a floating effect is required (e.g., for a modal), use an ultra-diffused shadow.
    *   *Spec:* `0px 20px 40px rgba(50, 51, 48, 0.06)` (using `on-surface` as the tint).
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#b3b2ae) at **15% opacity**. Never use 100% opaque lines.
*   **Organic Masks:** Images should not be simple rectangles. Use `xl` (3rem) or `full` (9999px) corner radii to create "blob" or "pill" silhouettes that overlap each other.
 
---
 
## 5. Components
 
### Navigation: The Floating Pill
The bottom navigation is a semi-transparent, hyper-rounded container.
*   **Active State:** Indicated by a physical circular background (`primary-fixed`) behind the icon, creating a "button within a bar" effect.
*   **Background:** `surface` with 80% opacity and `backdrop-filter: blur(12px)`.
 
### Buttons: High Contrast
*   **Primary:** High-contrast `on-surface` (Deep Navy/Black) background with `surface` text. Shape: `full` (9999px).
*   **Secondary:** `primary-container` (#e2e2e2) with `on-primary-fixed`.
*   **Tertiary/Ghost:** No background, `plusJakartaSans` bold labels.
 
### Cards & Collections
*   **Rule:** Forbid divider lines. Use `1.5rem` to `2rem` vertical white space to separate items.
*   **Overlapping Images:** Use `xl` (3rem) rounding and negative margins to stack images like a physical deck of photos.
 
### Chips & Tags
*   **Style:** Minimalist pill shapes. `surface-container-highest` background with `on-surface-variant` text.
*   **Icons:** Use "Minimalist" line icons (2px stroke) to maintain the airy feel.
 
---
 
## 6. Do's and Don'ts
 
### Do:
*   **Do** use asymmetrical margins. Let an image bleed off one side of the screen while text remains centered.
*   **Do** mix font families within the same block (e.g., a `label-sm` sans-serif tag above a `display-md` serif title).
*   **Do** use the "pill" shape (`full`) for all interactive elements like buttons and search bars.
 
### Don't:
*   **Don't** use 1px solid lines or "dividers." They break the editorial flow.
*   **Don't** use sharp corners. If the radius is less than `1rem`, it is too sharp for this system.
*   **Don't** use pure black (#000000). Always use the `on-surface` (#323330) or `on-secondary-fixed` (#00426c) for high-contrast elements to maintain tonal warmth.
*   **Don't** crowd the layout. If a screen feels "busy," increase the whitespace (use `surface` background) and remove container backgrounds.