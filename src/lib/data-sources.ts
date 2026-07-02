import type { ArchModel } from "./types";
import { importOkfBundle } from "./okf-import";

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
 */
export const DATA_SOURCES: DataSource[] = [
  {
    id: "ecommerce-saga-json",
    label: "E-commerce Saga (JSON)",
    load: () => import("@/data/sample-architecture.json").then((m) => m.default as ArchModel),
  },
  {
    id: "order-system-okf",
    label: "Order System (OKF bundle)",
    load: () => importOkfBundle("/okf-bundles/order-system"),
    okfBasePath: "/okf-bundles/order-system",
  },
];
