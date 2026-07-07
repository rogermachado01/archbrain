import type { ArchModel } from "./types";
import { importOkfBundle } from "./okf-import";
import { validateArchModel } from "./validate-model";

export interface DataSource {
  id: string;
  label: string;
  load: () => Promise<ArchModel>;
  /** base path of the OKF bundle backing this source, if any — enables the "Wiki" view mode */
  okfBasePath?: string;
}

/**
 * Registry of architectures the user can pick from in the UI. Add an entry
 * here to plug in another dataset — a plain JSON file (via dynamic import,
 * so it's only fetched once selected) or an OKF bundle (via importOkfBundle,
 * pointed at a directory under public/okf-bundles/ — set okfBasePath to that
 * same directory so the "Wiki" view mode can browse its raw markdown too).
 * Every load() result is run through validateArchModel so a malformed
 * dataset fails loudly (surfaced via the existing loadFailed UI path) instead
 * of silently rendering an incomplete graph.
 */
export const DATA_SOURCES: DataSource[] = [
  {
    id: "ecommerce-saga-json",
    label: "E-commerce Saga (JSON)",
    load: () =>
      import("@/data/sample-architecture.json").then((m) =>
        validateArchModel(m.default as ArchModel),
      ),
  },
  {
    id: "order-system-okf",
    label: "Order System (OKF bundle)",
    load: () =>
      importOkfBundle("/okf-bundles/order-system").then(validateArchModel),
    okfBasePath: "/okf-bundles/order-system",
  },
  {
    id: "frontend-ecommerce-json",
    label: "Loja Web — Frontend (JSON)",
    load: () =>
      import("@/data/frontend-ecommerce.json").then((m) =>
        validateArchModel(m.default as ArchModel),
      ),
  },
  {
    id: "webapp-frontend-okf",
    label: "Loja Web — Frontend (OKF bundle)",
    load: () => importOkfBundle("/okf-bundles/webapp").then(validateArchModel),
    okfBasePath: "/okf-bundles/webapp",
  },
  {
    id: "blog",
    label: "blog",
    load: () => importOkfBundle("/okf-bundles/blog").then(validateArchModel),
    okfBasePath: "/okf-bundles/blog",
  },
  {
    id: "blog2",
    label: "blog2 (estilo webapp)",
    load: () => importOkfBundle("/okf-bundles/blog2").then(validateArchModel),
    okfBasePath: "/okf-bundles/blog2",
  },
];
