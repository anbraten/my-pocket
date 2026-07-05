<template>
  <div
    class="relative flex items-center justify-center overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 shrink-0 border border-stone-200 dark:border-stone-700"
    :class="sizeClasses"
  >
    <img
      v-if="logoUrl && !hasError"
      :src="logoUrl"
      :alt="name"
      class="h-full w-full object-contain p-1"
      @error="hasError = true"
    />
    <span
      v-else
      class="flex items-center justify-center leading-none select-none"
      :class="textSizeClasses"
    >
      {{ fallback || name?.charAt(0)?.toUpperCase() }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}>();

const hasError = ref(false);
const logoUrl = ref<string | null>(null);

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-8 w-8';
    case 'lg':
      return 'h-12 w-12';
    default:
      return 'h-10 w-10';
  }
});

const textSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm';
    case 'lg':
      return 'text-2xl';
    default:
      return 'text-xl';
  }
});

// Simple memory cache backed by localStorage
const CACHE_KEY = 'my-pocket:logo-cache';
const logoCache = new Map<string, string | null>();

// Initialize cache from localStorage
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(parsed).forEach(([k, v]) => logoCache.set(k, v as string));
  }
} catch (e) {
  // Ignore storage errors
}

function saveCache() {
  try {
    const obj = Object.fromEntries(logoCache.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    // Ignore storage errors
  }
}

watch(
  () => props.name,
  () => {
    hasError.value = false;
    fetchLogo();
  },
  { immediate: true }
);

async function fetchLogo() {
  if (!props.name) {
    logoUrl.value = null;
    return;
  }

  // Clean up name for better search results
  let cleanName = props.name
    .replace(/paypal\s*\*/i, '')
    .replace(/amzn\s*mktp/i, 'amazon')
    .replace(/\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common suffixes that might confuse search
  cleanName = cleanName.replace(/\s(gmbh|inc|ltd|ag|co|corp)\.?$/i, '');

  const cacheKey = cleanName.toLowerCase();
  if (logoCache.has(cacheKey)) {
    logoUrl.value = logoCache.get(cacheKey) || null;
    return;
  }

  // try {
  //   // Using DuckDuckGo Instant Answer API
  //   // This is free, requires no key, and provides images (often from Wikipedia/Infoboxes)
  //   const searchDDG = async (query: string) => {
  //     const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
  //       query
  //     )}&format=json&t=my-pocket&no_redirect=1&no_html=1`;
  //     return fetch(url).then((r) => r.json());
  //   };

  //   let data = await searchDDG(cleanName);

  //   // Fallback: Try first word if no image found
  //   if (!data.Image && cleanName.includes(' ')) {
  //     const firstWord = cleanName.split(' ')[0];
  //     if (firstWord.length > 2) {
  //       data = await searchDDG(firstWord);
  //     }
  //   }

  //   if (data.Image) {
  //     // DDG returns relative paths for images
  //     const imageUrl = `https://duckduckgo.com${data.Image}`;
  //     logoUrl.value = imageUrl;
  //     logoCache.set(cacheKey, imageUrl);
  //     saveCache();
  //   } else {
  //     logoUrl.value = null;
  //     logoCache.set(cacheKey, null);
  //   }
  // } catch (e) {
  //   console.error('Error fetching logo:', e);
  //   logoUrl.value = null;
  // }
}
</script>
