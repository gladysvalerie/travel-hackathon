# Icon Replacement Guide

## Current Implementation

Icons are currently implemented as inline SVG elements in `src/popup.html`. Each icon is wrapped in a `<span class="btn-icon">` element.

## How to Replace Icons

### Option 1: Replace SVG Paths (Recommended)

1. Open `src/popup.html`
2. Find the icon you want to replace (search for the icon name below)
3. Replace the `<svg>` content with your own SVG code
4. Keep the `xmlns`, `viewBox`, `fill`, and `stroke` attributes

### Option 2: Use Icon Fonts (e.g., Font Awesome, Material Icons)

1. Add the icon font library to `popup.html`:
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   ```

2. Replace SVG with icon font:
   ```html
   <span class="btn-icon">
     <i class="fas fa-camera"></i>
   </span>
   ```

### Option 3: Use Image Files

1. Place your icon images in `assets/icons/`
2. Replace SVG with:
   ```html
   <span class="btn-icon">
     <img src="../assets/icons/camera.svg" alt="Camera" style="width: 16px; height: 16px;">
   </span>
   ```

## Icon Locations in HTML

| Icon | Location | Current SVG ID |
|------|----------|----------------|
| Camera (Screenshot) | `#btn-screenshot` | Camera icon |
| Camera (Full page) | `#btn-screenshot-full` | Camera icon variant |
| Select area | `#btn-screenshot-region` | Crop/select icon |
| Upload | `#btn-upload` | Upload icon |
| Pencil (Manual) | `#btn-manual` | Pencil/edit icon |
| Check (Use) | `#btn-use-screenshot` | Check icon |
| Refresh (Retake) | `#btn-retake-screenshot` | Refresh icon |
| Close (Cancel) | `#btn-screenshot-cancel`, `#btn-cancel-booking` | Close/X icon |
| Arrow Right (Login) | `#login-btn` | Arrow right icon |
| Plus (Signup) | `#signup-btn` | Plus icon |
| AI/Robot | `#btn-ai-fill` | AI icon |
| Arrow Between | Origin/Destination row | Arrow between icon |
| Check (Save) | `#btn-save-booking` | Check icon |

## SVG Icon Specifications

- **Size**: 16x16px (viewBox="0 0 24 24" scaled down)
- **Color**: `currentColor` (inherits button text color)
- **Stroke width**: 2px for outline icons
- **Fill**: `none` for outline icons, `currentColor` for filled icons

## Example: Replacing Camera Icon

**Current:**
```html
<span class="btn-icon">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
</span>
```

**Replace with your icon:**
```html
<span class="btn-icon">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Your SVG path here -->
  </svg>
</span>
```

## Recommended Icon Sources

- **Heroicons**: https://heroicons.com/ (Free, MIT License)
- **Feather Icons**: https://feathericons.com/ (Free, MIT License)
- **Material Icons**: https://fonts.google.com/icons (Free, Apache 2.0)
- **Font Awesome**: https://fontawesome.com/ (Free tier available)
- **Lucide**: https://lucide.dev/ (Free, ISC License)

## Tips

1. **Consistency**: Use icons from the same icon set for visual consistency
2. **Size**: Keep all icons at 16x16px for consistency
3. **Style**: Choose either outline or filled style and stick with it
4. **Color**: Use `currentColor` so icons inherit button text color
5. **Accessibility**: Add `aria-label` if icon is decorative only

