---
name: Ignacio & Brenda — Nuestra Historia
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#46483b'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#767869'
  outline-variant: '#c6c8b6'
  surface-tint: '#54651e'
  primary: '#52621c'
  on-primary: '#ffffff'
  primary-container: '#6a7c32'
  on-primary-container: '#fbffe4'
  inverse-primary: '#bbcf7c'
  secondary: '#785900'
  on-secondary: '#ffffff'
  secondary-container: '#fdc003'
  on-secondary-container: '#6c5000'
  tertiary: '#5b5c59'
  on-tertiary: '#ffffff'
  tertiary-container: '#747572'
  on-tertiary-container: '#fdfcf8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7ec95'
  primary-fixed-dim: '#bbcf7c'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3d4c05'
  secondary-fixed: '#ffdf9e'
  secondary-fixed-dim: '#fabd00'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#e3e2df'
  tertiary-fixed-dim: '#c7c7c3'
  on-tertiary-fixed: '#1b1c1a'
  on-tertiary-fixed-variant: '#464744'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  quote-it:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.5'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 64px
  stack-xl: 128px
---

## Brand & Style

The brand personality is emotional, adventurous, and timeless. It captures the essence of a high-end travel journal mixed with a cinematic digital narrative. The interface serves as a frame for photography and storytelling, prioritizing large imagery and deliberate white space.

The design style is **Editorial Minimalism**. It combines the structured clarity of modern SaaS tools with the high-contrast elegance of fashion editorial layouts. The UI should evoke a sense of "digital heirloom"—something that feels both contemporary and classic. Key visual drivers include:
- **Cinematic Pacing:** Using generous vertical spacing to allow the narrative to breathe.
- **Natural Textures:** A focus on organic color transitions and soft surfaces.
- **Intentional Contrast:** Balancing delicate serif typography with functional, geometric utility elements.

## Colors

The palette is rooted in natural, earthy tones that reflect adventure and photography. 

- **Primary (Olive Green):** Represents the grounding nature of travel and the outdoors. Used for key call-to-actions and structural accents.
- **Secondary (Sunflower Yellow):** A delicate accent representing Brenda. Used sparingly for highlights, small icons, or emotional emphasis.
- **Surface (Cream/Warm White):** The primary canvas. Unlike pure white, this provides a warmer, more "paper-like" feel for long-form reading.
- **Dark Mode:** Transitions to Charcoal Black and Dark Forest Green, maintaining the Cream and Warm Gold for text and borders to preserve the premium, evening-journal aesthetic.

## Typography

The typographic system relies on the tension between a high-contrast Serif and a functional Neo-Grotesque Sans-Serif.

- **Playfair Display:** Used for display headlines and romantic quotes. The italic variant is particularly important for storytelling beats and emotional pull-quotes.
- **Inter:** Used for all functional UI, body copy, and metadata. It provides the "modern minimalist" feel and ensures high legibility for long-form journal entries.
- **Hierarchy Rule:** Use `label-caps` for location tags, dates, and category headers to provide a structured, "catalogued" feel to the travel notes.

## Layout & Spacing

The layout follows a **Fluid Grid** with fixed maximum widths for content readability.

- **Grid Model:** 12-column grid for desktop, 4-column for mobile.
- **Narrative Flow:** Use `stack-xl` (128px) to separate major life chapters or travel destinations. This drastic vertical spacing reinforces the editorial "magazine" feel.
- **Photography Alignment:** Photos should alternate between full-bleed width and inset grid positions (spanning 8 or 10 columns) to create a dynamic, non-repetitive visual rhythm.
- **Safe Zones:** Maintain a minimum margin of 20px on mobile to ensure content doesn't touch the edge of the device, preserving the "framed" aesthetic.

## Elevation & Depth

This design system uses **Tonal Layers** and **Ambient Shadows** to create a soft, tactile feel.

- **Surfaces:** Use subtle shifts in background color (e.g., Cream to Soft Beige) to define content areas rather than hard borders.
- **Shadows:** Shadows should be extremely diffused and low-opacity (alpha 0.04 to 0.08) with a slight "warm" tint to match the beige/cream palette. Avoid cold grey shadows.
- **Image Treatment:** Large photography should have a very slight `1px` inner stroke of 5% black to define edges against the warm white background, mimicking a physical print.

## Shapes

The shape language is sophisticated and approachable.

- **Standard Radius:** 16px (`rounded-lg`) is the baseline for all cards and image containers to create a soft, modern feel.
- **Buttons:** Use higher roundedness (up to pill-shaped) for primary actions to distinguish them from content containers.
- **Interactive Elements:** Checkboxes and inputs follow a soft 8px radius to balance the more organic curves of the larger layout elements.

## Components

- **Buttons:** Primary buttons use the Olive Green fill with white text. Ghost buttons use a 1px Olive Green border with Inter Medium text. No harsh shadows; use a slight "press" indentation on hover.
- **Photography Placeholders:** Always include a caption area below or overlayed at the bottom-left using `label-caps`. Use a 16:9 or 4:3 aspect ratio as defaults.
- **Cards:** Minimalist containers with a `#FDFCF8` fill on top of a slightly darker `#F5F3EB` background. Include a subtle `24px` blur shadow for elevation.
- **Story Timeline:** A vertical 1px line in Olive Green, using small Sunflower Yellow circles as " Brenda" milestones and Olive circles for "Ignacio" or "Together" milestones.
- **Navigation:** A floating, translucent (Glassmorphism) header with 15% opacity blur, allowing the photography to scroll underneath gracefully.
- **Inputs:** Underline-only or very soft-filled inputs to maintain the "journal" aesthetic, avoiding heavy boxy outlines.