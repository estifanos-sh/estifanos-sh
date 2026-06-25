import { defineSchema } from "convex/server";

// Static hosting is isolated in its component. The application has no data model.
export default defineSchema({}, { schemaValidation: false });
