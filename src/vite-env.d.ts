/// <reference types="vite/client" />

declare module 'html2canvas' {
  export interface Html2CanvasOptions {
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string | null;
    scale?: number;
    logging?: boolean;
    [key: string]: unknown;
  }
  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions
  ): Promise<HTMLCanvasElement>;
}

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}