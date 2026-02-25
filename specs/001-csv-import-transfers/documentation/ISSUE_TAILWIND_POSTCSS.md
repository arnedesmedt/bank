# Tailwind CSS v4 PostCSS Configuration Fix

## Issue: Tailwind CSS PostCSS Plugin Error

### Problem
When opening the frontend in the browser, the following error appeared:

```
[plugin:vite:css] [postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. 
The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS 
you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
```

### Root Cause
Tailwind CSS v4.x introduced breaking changes:
1. The PostCSS plugin is now in a separate package: `@tailwindcss/postcss`
2. The CSS import syntax has changed from `@tailwind` directives to `@import "tailwindcss"`
3. The old configuration was using Tailwind CSS v3 syntax with v4 package

### Resolution

#### 1. Install the New PostCSS Plugin
```bash
npm install -D @tailwindcss/postcss
```

#### 2. Update PostCSS Configuration
**File**: `/frontend/postcss.config.js`

**Before:**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**After:**
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

#### 3. Update CSS Import Syntax
**File**: `/frontend/src/index.css`

**Before (Tailwind v3):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**After (Tailwind v4):**
```css
@import "tailwindcss";
```

#### 4. Clear Vite Cache
```bash
docker compose exec frontend rm -rf node_modules/.vite
docker compose restart frontend
```

### Verification

After applying the fixes:

1. ✅ Frontend starts without errors
2. ✅ Vite dev server accessible at http://localhost:3000
3. ✅ No PostCSS plugin errors in logs
4. ✅ Tailwind CSS classes work correctly

### Files Modified

1. **`/frontend/package.json`**
   - Added: `"@tailwindcss/postcss": "^4.2.1"` to devDependencies

2. **`/frontend/postcss.config.js`**
   - Changed plugin name from `tailwindcss` to `@tailwindcss/postcss`

3. **`/frontend/src/index.css`**
   - Changed from `@tailwind` directives to `@import "tailwindcss"`

### Tailwind CSS v4 Changes

Tailwind CSS v4 brings several important changes:

#### New Features
- **CSS-first configuration**: Configuration is now done in CSS using `@theme` and custom properties
- **Faster builds**: Improved performance with Rust-based engine
- **Better IDE support**: Improved IntelliSense and autocomplete
- **Simplified PostCSS integration**: Separate package for PostCSS plugin

#### Migration Notes
- The `tailwind.config.js` file is still supported but optional in v4
- For advanced configuration, you can use CSS variables and `@theme` directive
- The `content` configuration in `tailwind.config.js` is still used for JIT compilation

### Current Configuration

#### PostCSS Configuration
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

#### Tailwind Configuration (Optional)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### CSS Entry Point
```css
@import "tailwindcss";
```

### Testing Tailwind CSS

You can verify Tailwind CSS is working by adding classes to your components:

```tsx
function App() {
  return (
    <div className="bg-blue-500 text-white p-4 rounded-lg">
      <h1 className="text-2xl font-bold">Tailwind CSS v4 Works!</h1>
    </div>
  );
}
```

### Troubleshooting

#### If you still see PostCSS errors:
```bash
# Clear all caches
docker compose exec frontend rm -rf node_modules/.vite
docker compose exec frontend npm cache clean --force
docker compose restart frontend
```

#### If Tailwind classes aren't working:
1. Check that `index.css` is imported in `main.tsx`
2. Verify the `content` paths in `tailwind.config.js`
3. Check browser console for CSS loading errors

#### If rebuilding is needed:
```bash
# Rebuild frontend container
docker compose build frontend
docker compose up -d frontend
```

### References

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS PostCSS Plugin](https://github.com/tailwindlabs/tailwindcss-postcss)
- [Vite + Tailwind CSS Guide](https://tailwindcss.com/docs/guides/vite)

---

**Date**: February 25, 2026  
**Status**: ✅ RESOLVED  
**Tailwind CSS Version**: 4.2.1  
**PostCSS Plugin Version**: 4.2.1

