/**
 * Fixed region for the site. Set via NUXT_PUBLIC_REGION or runtimeConfig.public.region.
 * No user selection — one region for the entire site.
 */
export function useRegion(): string {
  const config = useRuntimeConfig();
  return (config.public.region as string) || '';
}
