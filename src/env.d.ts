interface ImportMetaEnv {
  readonly PUBLIC_API_ENDPOINT?: string;
  readonly PUBLIC_SHEET_ENDPOINT?: string;
  readonly PUBLIC_EVENT_ENDPOINT?: string;
  readonly PUBLIC_WORKER_NAME?: string;
  readonly PUBLIC_WORKERS_SUBDOMAIN?: string;
  readonly PUBLIC_PRODUCTION_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
