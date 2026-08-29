# SayCle visual system

This document records shipped UI in the public pages, not a future design direction. Sources reviewed: `PRODUCT.md`, `resources/css/app.css`, the public React pages (`welcome`, `report`, `report-success`, `tracking`), shared UI components, and review screenshots in `.impeccable/review/`.

## Product and visual character

SayCle presents a public, lightweight supplier flow for Indonesian circular-dispatch operations. Public UI uses plain Bahasa Indonesia copy, direct actions, soft off-white surfaces, dark compost green, and a scarce orange action color. Tone: operational, calm, legible, and human. It avoids dashboard density on supplier-facing pages.

No logo asset, photography, testimonials, customer proof, pilot baseline, or verified numeric impact claim is present. The visible mark is text plus a Lucide leaf inside a dark green circle.

## Palette

### Public-page colors

These values are used directly in the public page classes and screenshots:

| Role | Value | Use |
| --- | --- | --- |
| Canvas / warm off-white | `#f4f3ed` | Page backgrounds, hero text, form controls |
| Ink / deep green | `#18352a` | Body text, logo mark, headings |
| Field green | `#2f6848` | Welcome hero |
| Action orange | `#e88c12` | Primary buttons, active eyebrow labels, logo dot |
| Logo orange | `#f6a51d` | Leaf mark foreground |
| Pale green | `#d7e6c9` | Waves line color and light supporting surfaces |
| Muted sage | `#e7e8dc` | Report-success credential panel |
| White | `#ffffff` | Cards and forms |
| Error surface | `#fef2f2` (`red-50`) | Validation summary |
| Error text / border | `red-700` / `red-300` | Validation summary |

Opacity variants of ink supply secondary text, borders, and shadows: `text-[#18352a]/65`, `text-[#18352a]/60`, `border-[#18352a]/15`, `border-[#18352a]/10`, and `shadow-[#18352a]/10`.

### Shared CSS token system

`resources/css/app.css` also ships shadcn-style neutral CSS variables. Light values:

```text
--background: hsl(0, 0%, 100%)
--foreground: hsl(0, 0%, 3.9%)
--card: hsl(0, 0%, 100%)
--card-foreground: hsl(0, 0%, 3.9%)
--popover: hsl(0, 0%, 100%)
--popover-foreground: hsl(0, 0%, 3.9%)
--primary: hsl(0, 0%, 9%)
--primary-foreground: hsl(0, 0%, 98%)
--secondary: hsl(0, 0%, 96.1%)
--secondary-foreground: hsl(0, 0%, 9%)
--muted: hsl(0, 0%, 96.1%)
--muted-foreground: hsl(0, 0%, 45.1%)
--accent: hsl(0, 0%, 96.1%)
--accent-foreground: hsl(0, 0%, 9%)
--destructive: hsl(0, 84.2%, 60.2%)
--destructive-foreground: hsl(0, 0%, 98%)
--border: hsl(0, 0%, 92.8%)
--input: hsl(0, 0%, 89.8%)
--ring: hsl(0, 0%, 3.9%)
--radius: 0.5rem
```

Dark variables exist for the shared system, but reviewed public pages explicitly use the light public palette and do not present a public dark-mode treatment.

## Typography

- Font family token: `Instrument Sans`, falling back to `ui-sans-serif`, `system-ui`, then platform emoji/UI fonts.
- Headings use the same family at heavy display sizes, generally `text-4xl` to `text-5xl`, with tight negative tracking (`tracking-[-.04em]` to `tracking-[-.05em]`).
- Welcome hero uses oversized white display text with an orange italic second line in the rendered review composition.
- Eyebrow labels use small bold uppercase text, orange, with wide tracking around `.2em`.
- Body copy uses regular weight, generous line height (`leading-7` in public explanatory copy), and ink opacity for hierarchy.
- Controls and navigation use compact semibold or bold labels.

No separate display font, type scale token, or custom font file is verified in reviewed source.

## Layout and surface rules

- Public pages use mobile-first Tailwind classes.
- Main landing canvas is `#f4f3ed`; content is centered inside `max-w-7xl` with compact mobile side padding and larger desktop padding.
- Welcome hero is a green, rounded rectangle with `rounded-[2rem]`, internal responsive padding, and substantial minimum height on desktop.
- Landing sections alternate quiet off-white and muted sage backgrounds. The final CTA is a dark green rounded panel.
- Content blocks use deliberate whitespace, short section headings, and simple grids rather than dense cards.
- Public forms and status views use white cards with `rounded-[2rem]` and a soft deep-green shadow.
- Inputs are at least `min-h-12`, rounded (`rounded-xl`), warm off-white, and outlined with low-opacity green. Focus uses orange border plus orange-tinted ring where implemented.
- Primary actions are orange, pill-shaped, and at least `min-h-12`; arrows use Lucide icons.
- IDs and PINs are shown in a distinct muted-sage credential panel. IDs can wrap; PINs use increased letter spacing.
- Borders stay thin and quiet. Rounded corners are a strong recurring motif; do not mix in sharp, heavily bordered public cards without reason.

## Motion and decorative treatment

- `Waves` is the ReactBits-style canvas treatment used inside the welcome hero. It draws animated organic vertical lines.
- Waves is decorative only: it has `pointer-events-none`, sits behind hero content, has reduced opacity, and carries no meaning, controls, or required information. Do not use it as a status display, navigation, or form affordance.
- Reviewed public pages show no orchestrated page-load animation, scroll reveal, or broad hover-motion system. Keep motion limited to meaningful control feedback and existing canvas decoration.
- Processing states use text changes and, in shared/auth contexts, a spinning loader icon. Preserve clear non-motion status text.
- Any new motion must not hide content or block task completion. Honor reduced-motion preferences when adding motion beyond current behavior.

## Accessibility rules observed

- Use semantic `main`, `nav`, `section`, headings, labels, links, buttons, lists, and definition lists as shown in public pages.
- Every public form field has a visible label. Keep file inputs associated with their visible upload control.
- Mobile menu trigger has an accessible label (`Buka menu`); the Sheet has a title for dialog context.
- Error summary uses `role="alert"`, is focusable, and receives focus after failed report submission. Keep errors adjacent to fields as well as summarized when adding fields.
- Preserve keyboard-visible focus. Existing report inputs use orange focus border/ring; do not remove focus indicators.
- Keep controls touch-sized: existing public navigation and controls commonly use `min-h-11` or `min-h-12`.
- Do not rely on Waves, color alone, opacity alone, or icon alone to communicate task state.
- Preserve the location fallback: GPS requires explicit consent; manual address, landmark, or map-pin text remains available when permission is denied or unavailable.
- Keep Sale ID plus PIN required for tracking. Never expose tracking through ID alone.
- These are implementation rules, not a formal WCAG certification or compliance claim.

## Component usage

### shadcn-style components

The repository uses Tailwind CSS 4 with CSS variables, neutral shadcn configuration, Radix primitives, CVA, `clsx`, and `tailwind-merge`. `components.json` sets `style: default`, `baseColor: neutral`, CSS variables, and Lucide as icon library.

Public welcome navigation uses the existing `Sheet`, `SheetTrigger`, `SheetContent`, `SheetTitle`, and `SheetClose` components for the mobile menu. Shared `ui` components remain the default for dashboard and authenticated work; public pages may use direct Tailwind markup where current implementation does.

### Icons

Use Lucide React icons at small, quiet sizes. Current public examples include `Leaf`, `ArrowRight`, `ArrowLeft`, `Menu`, `Upload`, `LocateFixed`, `KeyRound`, `Search`, `CheckCircle2`, and status icons. Icons support labels; they do not replace labels.

### ReactBits

ReactBits Waves is decorative only, limited to the welcome hero. Do not add ReactBits effects to report, report-success, or tracking tasks, and do not make Waves carry operational information.

## Public flow patterns

### Welcome `/`

- Header: SayCle mark at left; desktop anchor navigation (`Alur`, `Tujuan`, `Operasi`), `Lacak laporan`, `Masuk`, and orange report CTA.
- Mobile header collapses navigation into a round bordered menu trigger and Sheet.
- Hero: green rounded field, Waves backdrop, eyebrow, two-line headline, short explanation, grade-routing note, and orange source CTA.
- Following sections explain three steps (`Sumber`, `Penjemputan`, `Grade`), fixed grade destinations (`pakan ternak`, `maggot`, `kompos`), partner allocation facts, and visible operational records (`Officer review`, `Rute pickup`, `Catatan grade`).
- Final CTA repeats reporting action, then a sparse footer keeps brand, flow summary, and `Masuk`.

### Report `/lapor`

- Single-column, centered form flow, max width `max-w-2xl`.
- Back link first, orange uppercase eyebrow, large task heading, short officer-review explanation.
- White rounded form card contains photo upload, estimated kilograms, contact, optional consent-based location, and manual location fallback.
- Upload area is dashed and centered. Helper text states accepted image types and 10 MB limit.
- Submit is full-width orange pill on mobile.
- Validation summary appears at form top and focuses after submission failure.

### Report success

- Full viewport centered success card, max width `max-w-lg`.
- Green check icon, orange eyebrow, direct instruction to save pickup access.
- Sale ID and one-time PIN sit in a muted-sage panel with wrapping and tracking suited to credentials.
- Orange `Lacak laporan` link continues the flow.

### Tracking

- Full viewport centered narrow flow, max width `max-w-md`.
- Orange security eyebrow and large `Lacak laporanmu.` heading establish purpose before inputs.
- Empty state asks for Sale ID and PIN in a white rounded card; PIN input uses numeric input mode and letter spacing.
- Result state replaces form with a status card showing status explanation, Sale ID, and estimated weight.
- Status copy maps operational states to plain-language explanations. Keep secure access messaging explicit.

## Responsive behavior

- Mobile is the baseline: stacked sections, one-column cards, full-width controls, narrow gutters, and vertically stacked grade/partner cards.
- Welcome hero shrinks to a shorter rounded panel with smaller headline and compact padding; desktop expands into a large composition with content and note distributed across the field.
- Welcome process cards are three columns on larger screens and become a vertical bordered stack on mobile.
- Grade and partner cards are three columns on desktop and one column on mobile.
- Desktop navigation is hidden below the medium breakpoint; Sheet navigation replaces it.
- Form cards reduce padding from `p-10` to `p-6` on small screens. Status cards remain centered and readable within viewport gutters.
- Long Sale IDs must wrap rather than force horizontal scrolling.
- Preserve readable text, visible labels, and usable touch targets at narrow widths. No reviewed source verifies a tablet-specific layout beyond Tailwind breakpoint behavior.

## Explicit anti-patterns

- Do not invent logos, photos, partner marks, testimonials, customer names, pilot metrics, carbon numbers, or impact proof.
- Do not frame SayCle as an SDG 7 product. Product framing is SDG 11, with SDG 8 as supporting impact.
- Do not turn public supplier flow into a login-gated flow. Supplier reporting is account-free.
- Do not expose tracking with Sale ID alone; require secure token/PIN behavior.
- Do not remove manual location fallback or imply GPS is required.
- Do not mix grade, stock, allocation, payment, and audit concepts into one visual status or generic card.
- Do not use orange as a broad background or distribute accent colors evenly. Reserve it for action and small emphasis.
- Do not replace deep green/off-white public palette with generic dashboard neutral styling.
- Do not add gradients, stock imagery, noisy illustrations, or decorative effects without evidence in shipped UI.
- Do not use Waves as content, navigation, loading state, map, route, or operational signal.
- Do not add hover-only meaning, motion-only feedback, tiny tap targets, unlabeled icon buttons, or removed focus rings.
- Do not claim formal WCAG conformance based on these rules or screenshots.
