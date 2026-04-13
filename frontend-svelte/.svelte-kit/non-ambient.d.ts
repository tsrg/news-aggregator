
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/about" | "/editorial" | "/news" | "/news/[id]" | "/section" | "/section/[slug]" | "/sitemap.xml" | "/[slug]";
		RouteParams(): {
			"/news/[id]": { id: string };
			"/section/[slug]": { slug: string };
			"/[slug]": { slug: string }
		};
		LayoutParams(): {
			"/": { id?: string; slug?: string };
			"/about": Record<string, never>;
			"/editorial": Record<string, never>;
			"/news": { id?: string };
			"/news/[id]": { id: string };
			"/section": { slug?: string };
			"/section/[slug]": { slug: string };
			"/sitemap.xml": Record<string, never>;
			"/[slug]": { slug: string }
		};
		Pathname(): "/" | "/about" | "/editorial" | `/news/${string}` & {} | `/section/${string}` & {} | "/sitemap.xml" | `/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg" | "/fonts/inter-cyrillic-ext.woff2" | "/fonts/inter-cyrillic.woff2" | "/fonts/inter-latin-ext.woff2" | "/fonts/inter-latin.woff2" | "/fonts/inter.css" | "/ivanovo-logo.png" | "/robots.txt" | "/site.webmanifest" | string & {};
	}
}