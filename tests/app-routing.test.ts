import { describe, expect, it } from "vitest";
import { createBranches, getRouteMatches } from "../node_modules/@solidjs/router/dist/routing.js";

import { appRoutePaths } from "@/app-routes";
import { joinAppPath, normalizeAppBasePath } from "@/lib/app-base-path";

describe("GitHub Pages subpath routing", () => {
  const githubPagesBasePath = "/top-revenue-per-employee/";

  it("joins the repository base path for data fetches", () => {
    expect(normalizeAppBasePath(githubPagesBasePath)).toBe("/top-revenue-per-employee");
    expect(joinAppPath(githubPagesBasePath, "data/companies-data.json")).toBe(
      "/top-revenue-per-employee/data/companies-data.json",
    );
    expect(joinAppPath(githubPagesBasePath, "/playground")).toBe(
      "/top-revenue-per-employee/playground",
    );
  });

  it("matches dashboard and playground routes beneath the repository base path", () => {
    const branches = createBranches(
      [
        { path: appRoutePaths.dashboard },
        { path: appRoutePaths.playground },
      ],
      normalizeAppBasePath(githubPagesBasePath),
    );

    expect(
      getRouteMatches(branches, githubPagesBasePath).map((match) => match.route.pattern),
    ).toEqual(["/top-revenue-per-employee"]);
    expect(
      getRouteMatches(branches, joinAppPath(githubPagesBasePath, "playground")).map(
        (match) => match.route.pattern,
      ),
    ).toEqual(["/top-revenue-per-employee/playground"]);
  });
});
