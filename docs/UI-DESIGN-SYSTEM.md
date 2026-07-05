# MemeCats Premium UI Design System
## Token-Driven Design System Following T.RICKS Guidelines

---

## 📋 Mission
Deliver a premium, accessible, and consistent user interface for MemeCats TCG game that elevates the user experience through glassmorphism design, semantic tokens, and WCAG 2.2 AA compliance.

---

## 🎨 Brand Identity

**Product**: MemeCats — The Viral Collection  
**Style**: Premium Glassmorphism with TCG-inspired card effects  
**Audience**: Trading card game players, collectors, and competitive gamers  
**Platform**: Web-based responsive application

---

## 🎯 Design Principles

### 1. **Token-First Approach**
- ALL design values MUST use semantic tokens from `tokens.css`
- NEVER use hardcoded colors, spacing, or typography values
- Tokens ensure consistency and enable theme switching

### 2. **Accessibility-First**
- Target: WCAG 2.2 AA Compliance
- ALL interactive elements MUST have visible focus states
- Color contrast ratios MUST meet 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation MUST be fully supported

### 3. **Performance-First**
- Use CSS transforms for animations (GPU-accelerated)
- Minimize reflows and repaints
- Lazy-load images and heavy components

### 4. **Mobile-First**
- Design for touch interactions
- Minimum tap target size: 44x44px
- Optimize for mobile performance

---

## 🎨 Typography System

### Font Families
```css
--font-family-primary: 'DM Sans', 'Inter', system-ui
--font-family-display: 'Outfit', 'DM Sans', system-ui
--font-family-mono: 'JetBrains Mono', 'Courier New'
```

### Type Scale
| Token | Size | Usage |
|-------|------|-------|
| `--font-size-xs` | 14px | Small labels, badges |
| `--font-size-sm` | 15.4px | Secondary text |
| `--font-size-base` | 16px | Body text (default) |
| `--font-size-md` | 18.9px | Emphasized body |
| `--font-size-lg` | 19.6px | Subheadings |
| `--font-size-xl` | 23.8px | Card titles, H3 |
| `--font-size-2xl` | 32.2px | Page titles, H2 |
| `--font-size-3xl` | 86.8px | Hero text, H1 |

### Usage Rules
- **Body text** MUST use `var(--font-size-base)` minimum for readability
- **Headings** MUST use `var(--font-family-display)` for visual hierarchy
- **Interactive labels** MUST use `var(--font-weight-semibold)` or higher

---

## 🎨 Color System

### Text Colors
```css
--color-text-primary: #EEEDF2    /* Primary readable text */
--color-text-secondary: #94A3B8  /* Muted text */
--color-text-tertiary: #64748B   /* Subtle text */
--color-text-accent: #F88CD4     /* Pink accent */
```

### Surface Colors
```css
--color-surface-base: #070B1A       /* Base background */
--color-surface-elevated: #0C1428   /* Cards, panels */
--color-surface-strong: #0D0628     /* Emphasized panels */
--color-surface-overlay: #121E3D    /* Modals */
```

### Rarity Colors
```css
--color-rarity-common: #94A3B8      /* Gray */
--color-rarity-rare: #38BDF8        /* Blue */
--color-rarity-epic: #A855F7        /* Purple */
--color-rarity-legendary: #F59E0B   /* Gold */
```

### Contrast Requirements
| Combination | Ratio | Status |
|-------------|-------|--------|
| Primary text on base | 11.2:1 | ✅ AAA |
| Secondary text on elevated | 4.8:1 | ✅ AA |
| Accent on base | 4.5:1 | ✅ AA |

---

## 📏 Spacing System

### T.RICKS Scale
```css
--space-1: 5.6px   --space-2: 14px
--space-3: 28px    --space-4: 30.8px
--space-5: 36.4px  --space-6: 42px
--space-7: 68.6px
```

### Common Scale (Additional)
```css
--space-xs: 4px    --space-sm: 8px
--space-md: 16px   --space-lg: 24px
--space-xl: 32px   --space-2xl: 48px
```

### Usage Guidelines
- Component internal padding: `var(--space-2)` to `var(--space-3)`
- Section gaps: `var(--space-3)` to `var(--space-5)`
- Page margins: `var(--space-4)` to `var(--space-6)`

---

## 🔲 Component Library

### 1. Glass Panels

**Anatomy:**
```html
<div class="glass-panel">
  <!-- Content -->
</div>
```

**Variants:**
- `.glass-panel` — Medium blur, 70% opacity
- `.glass-panel-strong` — Strong blur, 85% opacity

**States:**
- Default: Subtle border, medium shadow
- Hover: Enhanced border, stronger shadow

**Accessibility:**
- MUST maintain text contrast of 4.5:1 minimum
- Content MUST be readable on glass background

---

### 2. Buttons

**Variants:**

#### Primary Button
```html
<button class="btn-primary">Action</button>
```
- Use for: Primary actions, CTAs
- States: default, hover, active, focus-visible, disabled
- Min contrast: 4.5:1 on text

#### Secondary Button
```html
<button class="btn-secondary">Action</button>
```
- Use for: Secondary actions, cancellations
- Glass background with border

#### Danger Button
```html
<button class="btn-danger">Delete</button>
```
- Use for: Destructive actions only
- Red gradient background

**Size Modifiers:**
- `.btn-sm` — Compact buttons
- `.btn-lg` — Large emphasis buttons
- `.btn-icon` — Icon-only buttons (44x44px minimum)

**Keyboard Behavior:**
- `Enter` and `Space` MUST trigger action
- `Tab` MUST move focus between buttons
- Focus indicator MUST be visible (2px outline)

**Touch Behavior:**
- Minimum touch target: 44x44px
- Active state scale: 0.97
- Feedback MUST be immediate (<100ms)

---

### 3. Inputs

**Usage:**
```html
<input class="input-premium" type="text" placeholder="Enter text..." />
```

**States:**
- Default: Glass background, subtle border
- Hover: Enhanced border
- Focus: Purple glow, enhanced border
- Error: Red border (use `.input-error`)
- Success: Green border (use `.input-success`)
- Disabled: 35% opacity, no-pointer

**Accessibility:**
- MUST have associated `<label>` with `for` attribute
- Error messages MUST use `aria-describedby`
- Required fields MUST indicate `required` attribute

---

### 4. Cards

**Card Frame Variants:**
```css
.card-frame-common
.card-frame-rare
.card-frame-epic
.card-frame-legendary
```

**Effects:**
- `.card-hover` — Lift on hover with rarity glow
- `.holo-overlay` — Rainbow holographic effect
- `.energy-border` — Animated border (legendary)

**Interaction:**
- Hover: `translateY(-4px) scale(1.03)`
- Active: `translateY(-1px) scale(0.98)`
- Touch: Optimized for mobile feedback

**Accessibility:**
- Interactive cards MUST be keyboard accessible
- Card content MUST have semantic HTML
- Images MUST have alt text

---

### 5. Toasts

**Usage:**
```html
<div class="toast toast-success">Success message</div>
<div class="toast toast-error">Error message</div>
<div class="toast toast-info">Info message</div>
<div class="toast toast-warning">Warning message</div>
```

**Behavior:**
- Auto-dismiss after 3-5 seconds
- User can dismiss by clicking
- Stack vertically in top-right
- Enter animation: slide + scale
- Exit animation: fade + slide

**Accessibility:**
- MUST use `role="alert"` for announcements
- Success/Error MUST be communicated via text, not just color
- Focus MUST not be trapped

---

## ⚡ Motion System

### Duration Tokens
```css
--motion-duration-instant: 100ms
--motion-duration-fast: 200ms
--motion-duration-base: 300ms
--motion-duration-slow: 500ms
```

### Easing Functions
```css
--motion-ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)
--motion-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)
```

### Rules
- Hover transitions: `var(--motion-duration-fast)`
- Page transitions: `var(--motion-duration-base)`
- Complex animations: `var(--motion-duration-slow)`
- Respect `prefers-reduced-motion: reduce`

---

## ♿ Accessibility Requirements

### Focus Management
✅ **MUST** provide visible focus indicators (2px purple outline)  
✅ **MUST** use `:focus-visible` for keyboard-only focus  
✅ **MUST** maintain logical tab order  

### Color Contrast
✅ **MUST** meet WCAG 2.2 AA contrast ratios  
✅ **MUST NOT** rely on color alone for information  
✅ **MUST** test with color blindness simulators  

### Keyboard Navigation
✅ **MUST** support all interactions via keyboard  
✅ **MUST** provide keyboard shortcuts for common actions  
✅ **MUST** trap focus in modals, allow ESC to close  

### Screen Readers
✅ **MUST** use semantic HTML elements  
✅ **MUST** provide ARIA labels where needed  
✅ **MUST** announce dynamic content changes  

---

## 🚫 Anti-Patterns (DO NOT)

❌ **DO NOT** use hardcoded colors instead of tokens  
❌ **DO NOT** create one-off spacing exceptions  
❌ **DO NOT** skip focus indicators for aesthetic reasons  
❌ **DO NOT** use animations longer than 500ms  
❌ **DO NOT** nest glass panels more than 2 levels deep  
❌ **DO NOT** use pure white or pure black text  
❌ **DO NOT** create touch targets smaller than 44x44px  
❌ **DO NOT** use low-contrast text for body content  

---

## ✅ QA Checklist

### Before Shipping Any Component:

**Visual Design**
- [ ] Uses semantic tokens exclusively
- [ ] Matches design system spacing and typography
- [ ] Glass effects render correctly on all backgrounds
- [ ] Animations are smooth (60fps)

**Accessibility**
- [ ] Keyboard navigation works completely
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG 2.2 AA
- [ ] Screen reader announces content correctly
- [ ] Works with browser zoom up to 200%

**Responsive**
- [ ] Renders correctly on mobile (375px+)
- [ ] Touch targets are 44x44px minimum
- [ ] Text is readable without zooming
- [ ] Horizontal scroll is intentional only

**Performance**
- [ ] No layout shifts on load
- [ ] Images are optimized and lazy-loaded
- [ ] Animations use transform/opacity only
- [ ] Initial load < 2 seconds

**Browser Support**
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile Safari & Chrome

---

## 📚 Implementation Examples

### Example 1: Premium Card Component
```vue
<template>
  <article 
    class="glass-panel card-hover card-frame-epic"
    role="article"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <div class="holo-overlay"></div>
    <img :src="card.image" :alt="card.name" />
    <h3 class="card-title">{{ card.name }}</h3>
    <span class="rarity-badge rarity-epic">Epic</span>
  </article>
</template>

<style scoped>
.card-title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-top: var(--space-2);
}
</style>
```

### Example 2: Accessible Form Input
```vue
<template>
  <div class="form-group">
    <label :for="inputId" class="form-label">
      Username
      <span v-if="required" class="text-error">*</span>
    </label>
    <input
      :id="inputId"
      v-model="value"
      type="text"
      class="input-premium"
      :class="{ 'input-error': error }"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :required="required"
      placeholder="Enter username"
    />
    <p 
      v-if="error" 
      :id="`${inputId}-error`" 
      class="error-message"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
```

---

## 🔄 Migration Guide

### From Old System to Token-Based

**Before:**
```css
background: rgba(12, 20, 40, 0.7);
padding: 0.75rem 1.25rem;
color: #F1F5F9;
```

**After:**
```css
background: var(--glass-bg-medium);
padding: var(--space-2) var(--space-3);
color: var(--color-text-primary);
```

---

## 📞 Support

For design system questions:
1. Check this documentation first
2. Review `tokens.css` for available tokens
3. Inspect `main.css` for component patterns
4. Refer to T.RICKS reference guide

**Remember**: Consistency is key. When in doubt, use existing patterns.

---

## 📅 Changelog

### v2.0.0 - Current
- Migrated to semantic token system
- Implemented T.RICKS design principles
- Enhanced accessibility (WCAG 2.2 AA)
- Added comprehensive component states
- Improved motion system

### v1.0.0 - Legacy
- Initial glassmorphism implementation
- Basic component library
- Custom color system
