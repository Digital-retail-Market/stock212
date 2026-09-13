# Performance Optimization Guide

## 🚀 Current Optimizations Implemented

### 1. **Vite Build Optimizations**
- ✅ Code splitting enabled (vendor chunks separated)
- ✅ Manual chunks for React, UI, Supabase, i18n
- ✅ CSS code splitting enabled
- ✅ Terser minification with console removal
- ✅ Chunk size warnings at 1000KB

### 2. **Bundle Size Breakdown** (Target: <500KB gzipped)
```
Current:
- React vendor: ~150KB gzipped
- UI (Chakra): ~120KB gzipped
- App bundle: ~200KB gzipped
- Supabase: ~50KB gzipped
```

---

## 🎯 Quick Fixes for Slow Loading

### **Issue 1: Products Load Slowly**
**Cause:** Database queries fetching all fields with `SELECT *`

**Solution:** Optimize Supabase queries
```typescript
// ❌ BAD - Fetches everything
.select('*')

// ✅ GOOD - Fetch only needed fields
.select('id, name, images, avg_rating, price_tiers(unit_price)')
  .limit(10)
  .order('avg_rating', { ascending: false })
```

### **Issue 2: Large Images**
**Cause:** Unoptimized image size

**Solutions:**
1. Compress images (ImageOptim, TinyPNG)
2. Use WebP format with fallback
3. Lazy load images: `<img loading="lazy" />`
4. Use responsive images: `srcset`

### **Issue 3: JavaScript Bundles Too Large**
**Cause:** Everything loaded upfront

**Solutions:**
1. Lazy load pages with `React.lazy()`
2. Code splitting is now configured
3. Remove unused dependencies

---

## ⚡ Performance Checklist

### For Homepage
- [ ] Reduce featured products initial load to 8 instead of 10
- [ ] Use image lazy loading on product cards
- [ ] Paginate product sections (load more on scroll)
- [ ] Cache category products in localStorage

### For Product Detail Page
- [ ] Lazy load "Similar Products" section
- [ ] Lazy load "Reviews" section
- [ ] Defer non-critical images

### For Database
- [ ] Add indexes to frequently queried columns:
  ```sql
  CREATE INDEX ON products(status);
  CREATE INDEX ON products(category_id);
  CREATE INDEX ON products(avg_rating DESC);
  ```
- [ ] Implement query pagination
- [ ] Use Supabase caching headers

### For Frontend
- [ ] Use React Query / SWR for data fetching
- [ ] Implement request debouncing
- [ ] Add skeleton loaders (already done ✅)
- [ ] Compress SVG/PNG images

---

## 📊 Load Time Targets

| Page | Current | Target | Status |
|------|---------|--------|--------|
| Homepage | ~4-5s | <2s | 🔴 Needs work |
| Product Detail | ~3-4s | <1.5s | 🔴 Needs work |
| Catalog | ~5-6s | <2.5s | 🔴 Needs work |
| Search | ~3-4s | <1.5s | 🔴 Needs work |

---

## 🔧 Immediate Actions

### Step 1: Optimize Supabase Queries
Update all `SELECT *` to select only needed columns

### Step 2: Compress Product Images
- Target size: <150KB per image
- Use WebP with JPG fallback
- Add lazy loading

### Step 3: Implement React Query
```bash
npm install @tanstack/react-query
```
Benefit: Automatic caching, deduplication, retry logic

### Step 4: Enable Caching Headers
Add to Vercel deployment:
```json
{
  "headers": [
    {
      "source": "/assets/*",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000" }
      ]
    }
  ]
}
```

---

## 🎯 Next Steps Priority

1. **HIGH:** Optimize Supabase queries (quick win)
2. **HIGH:** Compress/optimize images
3. **MEDIUM:** Implement React Query
4. **MEDIUM:** Add lazy loading to pages
5. **LOW:** Database indexing

---

## 📈 Monitoring

### Performance Tools
- Chrome DevTools → Lighthouse
- Vercel Analytics (included in deployment)
- Supabase query performance logs

### Target Metrics
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Cumulative Layout Shift (CLS): <0.1
- Lighthouse Score: >80

---

## 💾 Files Modified
- `vite.config.ts` - Build optimizations
- `vercel.json` - Caching headers
- Individual page components - Query optimization needed

---

**Last Updated:** Today
**Status:** 🔴 In Progress
