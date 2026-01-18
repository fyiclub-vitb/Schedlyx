# Theme System Documentation

## Overview

Schedlyx uses a comprehensive dark mode system built on Tailwind CSS with class-based toggling, localStorage persistence, and system preference detection.

## Architecture

### Tailwind Configuration

- **Strategy**: `darkMode: "class"` in `tailwind.config.js`
- The `dark` class is applied to `document.documentElement` to enable dark mode
- Tailwind's dark mode variants are prefixed with `dark:`

### Theme Provider

The theme system is managed through `src/context/ThemeContext.tsx`:

- **Storage Key**: `localStorage.getItem('theme')`
- **Storage Values**: `'light'` or `'dark'`
- **System Preference**: On first load, if no stored preference exists, checks `window.matchMedia('(prefers-color-scheme: dark)')`
- **Class Management**: The `ThemeProvider` adds/removes the `dark` class on `document.documentElement` based on the current theme

### Theme Toggle

- Available in the Header component
- Toggles between light and dark themes
- Persists preference to localStorage
- Updates the `dark` class on the root element immediately

## Color Patterns

### Background Colors

- **Page Background**: `bg-white dark:bg-slate-950`
- **Card/Panel Background**: `bg-white dark:bg-slate-900`
- **Secondary Background**: `bg-slate-50 dark:bg-slate-900` (sections, alternate backgrounds)
- **Elevated Background**: `bg-slate-50 dark:bg-slate-800` (sticky summaries, side panels)

### Text Colors

- **Primary Text**: `text-slate-900 dark:text-slate-100`
- **Secondary Text**: `text-slate-600 dark:text-slate-300` (readable in both modes)
- **Muted Text**: `text-slate-500 dark:text-slate-400` (metadata, timestamps)
- **Avoid**: `text-slate-500` in dark mode (too dim) - use `dark:text-slate-300` or `dark:text-slate-400` instead

### Border Colors

- **Standard Borders**: `border-slate-200 dark:border-slate-800`
- **Divider Lines**: `border-slate-200 dark:border-slate-700`
- **Interactive Borders**: `border-slate-300 dark:border-slate-700` (inputs, selects)

### Interactive States

#### Hover States

- **Links**: `hover:text-primary-600 dark:hover:text-primary-400`
- **Buttons**: Built into Button component variants
- **Cards**: `hover:bg-slate-50 dark:hover:bg-slate-800`

#### Focus States

All interactive elements must include focus-visible rings:

```tsx
focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-blue-500 
dark:focus-visible:ring-blue-400 
focus-visible:ring-offset-2 
dark:focus-visible:ring-offset-slate-950
```

#### Disabled States

- **Opacity**: `disabled:opacity-50`
- **Cursor**: `disabled:cursor-not-allowed`
- Ensure text remains readable in disabled state (test contrast in dark mode)

## Component Patterns

### Buttons

Use the `Button` component from `src/components/ui/Button.tsx`:

```tsx
import { Button } from '../components/ui/Button'

<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
```

- Includes proper focus rings
- Dark mode variants built-in
- Disabled states handled

### Inputs

Use the `Input` component from `src/components/ui/Input.tsx`:

```tsx
import { Input } from '../components/ui/Input'

<Input
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  value={value}
  onChange={handleChange}
/>
```

- Includes label, error handling, and focus rings
- Dark mode styling built-in

### Textareas

Use the `Textarea` component from `src/components/ui/Textarea.tsx`:

```tsx
import { Textarea } from '../components/ui/Textarea'

<Textarea
  label="Description"
  rows={4}
  value={value}
  onChange={handleChange}
/>
```

### Selects

Use the `Select` component from `src/components/ui/Select.tsx`:

```tsx
import { Select } from '../components/ui/Select'

<Select label="Event Type" value={value} onChange={handleChange}>
  <option value="meeting">Meeting</option>
  <option value="workshop">Workshop</option>
</Select>
```

## Alert/Banner Patterns

### Success

```tsx
<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-md">
  <p className="text-green-800 dark:text-green-300">Success message</p>
</div>
```

### Error

```tsx
<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md">
  <p className="text-red-800 dark:text-red-300">Error message</p>
</div>
```

### Info

```tsx
<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
  <p className="text-blue-800 dark:text-blue-300">Info message</p>
</div>
```

## Spacing & Typography

### Section Spacing

- **Between Sections**: `space-y-6`
- **Form Spacing**: `space-y-4` (between form fields)
- **Card Padding**: `p-6` (standard), `px-4 py-2` (compact)

### Typography

- **Page Titles**: `text-3xl font-bold`
- **Section Titles**: `text-xl font-semibold`
- **Card Titles**: `text-lg font-semibold`
- **Labels**: `text-sm font-medium`
- **Body Text**: Default font size

### Border Radius

- **Standard**: `rounded-lg` (cards, inputs, buttons)
- **Full**: `rounded-full` (pills, avatars)

## Modal & Overlay Patterns

### Overlay Background

```tsx
<div className="fixed inset-0 bg-black/50 dark:bg-black/60 z-50">
  {/* Modal content */}
</div>
```

### Modal Panel

```tsx
<div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 p-6">
  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
    Modal Title
  </h2>
  <p className="text-slate-600 dark:text-slate-300">
    Modal content
  </p>
</div>
```

## Migration from Legacy Patterns

### Replacing `gray-*` Classes

**Before:**
```tsx
<div className="bg-gray-50 text-gray-900 border-gray-200">
```

**After:**
```tsx
<div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
```

### Replacing `btn-primary` / `btn-secondary`

**Before:**
```tsx
<button className="btn-primary">Click me</button>
```

**After:**
```tsx
import { Button } from '../components/ui/Button'

<Button variant="primary">Click me</Button>
```

### Replacing `input-field` Class

**Before:**
```tsx
<input className="input-field" />
```

**After:**
```tsx
import { Input } from '../components/ui/Input'

<Input type="text" value={value} onChange={handleChange} />
```

## Guidelines for New Components

When creating new components:

1. **Always include dark mode variants** for all colors
2. **Use slate color palette** instead of gray for consistency
3. **Add focus-visible rings** to all interactive elements
4. **Test disabled states** in both light and dark modes
5. **Ensure contrast** meets accessibility standards (WCAG AA minimum)
6. **Use reusable components** (Button, Input, Textarea, Select) when possible
7. **Follow spacing patterns** (space-y-6 for sections, space-y-4 for forms)

## Testing Dark Mode

1. Toggle theme using the header button
2. Verify all pages have consistent dark mode styling
3. Check modals, dropdowns, and overlays in dark mode
4. Test interactive states (hover, focus, disabled) in both modes
5. Verify text contrast meets accessibility standards
6. Test with browser dev tools to simulate system preferences

## Common Issues

### Text Too Dim in Dark Mode

**Problem**: Secondary text appears too dim
**Solution**: Use `dark:text-slate-300` instead of `dark:text-slate-500`

### Missing Focus Rings

**Problem**: Interactive elements don't show focus indicators
**Solution**: Add focus-visible ring utilities (see Interactive States above)

### Inconsistent Backgrounds

**Problem**: Some pages use `bg-gray-50` instead of `bg-white dark:bg-slate-950`
**Solution**: Use page background pattern: `bg-white dark:bg-slate-950`

### Dropdown/Modal Not Themed

**Problem**: Dropdowns or modals don't have dark mode variants
**Solution**: Ensure all background, text, and border classes include dark variants
