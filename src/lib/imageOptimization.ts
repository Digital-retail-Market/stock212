/**
 * Image Optimization Utilities
 * Provides helpers for lazy loading, responsive images, and compression
 */

/**
 * Generate optimized image URL with compression
 * @param imageUrl - Original image URL
 * @param width - Target width (optional)
 * @param quality - Quality 1-100 (default: 80)
 * @returns Optimized image URL
 */
export function optimizeImageUrl(
  imageUrl: string,
  width?: number,
  quality: number = 80
): string {
  if (!imageUrl) return '';

  // If using Supabase storage
  if (imageUrl.includes('supabase')) {
    const params = new URLSearchParams();
    if (width) params.append('width', String(width));
    params.append('quality', String(quality));
    return `${imageUrl}?${params.toString()}`;
  }

  // For external URLs, return as-is (consider using image CDN in production)
  return imageUrl;
}

/**
 * Generate responsive image srcset for different screen sizes
 * @param imageUrl - Original image URL
 * @returns Srcset string for responsive images
 */
export function getResponsiveImageSrcSet(imageUrl: string): string {
  if (!imageUrl) return '';

  return [
    `${optimizeImageUrl(imageUrl, 160, 85)} 160w`,
    `${optimizeImageUrl(imageUrl, 320, 85)} 320w`,
    `${optimizeImageUrl(imageUrl, 480, 85)} 480w`,
    `${optimizeImageUrl(imageUrl, 640, 85)} 640w`,
  ].join(', ');
}

/**
 * Get image sizes attribute for responsive loading
 * @returns Sizes string for img srcset
 */
export function getImageSizes(): string {
  return '(max-width: 320px) 160px, (max-width: 640px) 320px, (max-width: 1024px) 480px, 640px';
}

/**
 * Image loading options
 */
export const IMAGE_CONFIG = {
  // Lazy load threshold (pixels before coming into view)
  lazyLoadThreshold: 100,

  // Image quality settings
  quality: {
    thumbnail: 70,  // Small images
    preview: 80,    // Product cards
    full: 90,       // Full page images
  },

  // Responsive sizes
  sizes: {
    thumbnail: 160,
    card: 320,
    preview: 480,
    full: 640,
  },

  // Loading strategy
  loadingStrategy: 'lazy' as const,

  // Placeholder strategy: 'blur' | 'empty' | 'color'
  placeholderStrategy: 'empty' as const,

  // Blur placeholder color (CSS color)
  placeholderColor: '#f3f4f6',
};

/**
 * Preload critical images (hero images, above-the-fold products)
 * @param imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls: string[]): void {
  if (typeof document === 'undefined') return;

  imageUrls.forEach(url => {
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Setup Intersection Observer for lazy loading images
 * Works with native HTML5 loading="lazy" as fallback
 */
export function setupImageLazyLoading(): void {
  if (typeof document === 'undefined' || !('IntersectionObserver' in window)) {
    return; // Fallback to native lazy loading
  }

  const images = document.querySelectorAll('img[loading="lazy"]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: `${IMAGE_CONFIG.lazyLoadThreshold}px`,
  });

  images.forEach(img => observer.observe(img));
}

/**
 * Image compression guidelines for the team
 */
export const IMAGE_GUIDELINES = `
# Image Optimization Guidelines

## File Size Targets
- Thumbnails (160px): < 20KB
- Product cards (320px): < 50KB
- Preview images (480px): < 100KB
- Full images (640px): < 150KB

## Recommended Formats
1. WebP (modern browsers) - Best compression
2. JPEG (fallback) - Good compression ratio
3. PNG (icons/logos) - Lossless

## Compression Tools
- ImageOptim (Mac)
- TinyPNG / TinyJPG (online)
- ImageMagick (command-line)
- Squoosh (online, supports WebP)

## Steps to Optimize
1. Resize image to target width
2. Export as WebP with quality 80%
3. As fallback, export JPEG with quality 85%
4. Verify file size < target
5. Upload to Supabase storage

## Example Command (ImageMagick)
\`\`\`bash
convert input.jpg -resize 320x -quality 85 output.jpg
convert input.jpg -resize 320x -quality 80 output.webp
\`\`\`

## Next Steps
- Compress all existing product images
- Set up image CDN for automatic optimization
- Implement WebP with JPEG fallback
- Add image upload validation to enforce size limits
`;

export default {
  optimizeImageUrl,
  getResponsiveImageSrcSet,
  getImageSizes,
  IMAGE_CONFIG,
  preloadImages,
  setupImageLazyLoading,
};
