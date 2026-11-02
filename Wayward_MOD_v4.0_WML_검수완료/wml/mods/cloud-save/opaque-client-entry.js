import * as opaque from "@serenity-kit/opaque";

// Export client APIs only; server methods and OPAQUE server setup stay on the Worker.
globalThis.WMLCloudOpaque = Object.freeze({ client: opaque.client, ready: opaque.ready });
