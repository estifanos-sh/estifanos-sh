import { exposeUploadApi, exposeDeploymentQuery } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } = exposeUploadApi(
  components.selfHosting,
);

export const { getCurrentDeployment } = exposeDeploymentQuery(components.selfHosting);
