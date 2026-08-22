import { createRouter } from "@tanstack/solid-router";
import { mountPath } from "./config/project";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({ basepath: mountPath, routeTree, scrollRestoration: true });
}
