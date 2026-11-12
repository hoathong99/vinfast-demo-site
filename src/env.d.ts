interface ImportMetaEnv {
  readonly PUBLIC_API_ENDPOINT?: string;
  readonly PUBLIC_SHEET_ENDPOINT?: string;
  readonly PUBLIC_EVENT_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
