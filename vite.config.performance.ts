// Performance optimization tips for vite.config.ts:

export const performanceConfig = {
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-framer': ['framer-motion'],

          // Page chunks (lazy loaded)
          'page-catalog': ['src/pages/storefront/CatalogPage.tsx'],
          'page-product': ['src/pages/storefront/ProductDetailPage.tsx'],
          'page-auth': ['src/pages/auth/LoginPage.tsx'],
        },
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },

  // Optimizations for development
  server: {
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
};

// Image optimization tips:
// 1. Use webp format with fallback
// 2. Lazy load images with loading="lazy"
// 3. Use responsive images with srcset
// 4. Compress images before upload (target: <200KB per image)
// 5. Use CDN for image delivery

// Database optimization tips:
// 1. Select only needed columns (avoid SELECT *)
// 2. Add .limit(n) to queries
// 3. Use indexes on frequently queried fields
// 4. Implement pagination
// 5. Cache results with React Query or SWR

// Bundle size reduction:
// 1. Tree-shake unused dependencies
// 2. Use dynamic imports for heavy libraries
// 3. Remove unused CSS
// 4. Minify and compress assets
