const STORAGE_KEY = "RIFTPROBE_API_URL";

/** Resolve API base URL: ?api= query param → sessionStorage → env → localhost default */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("api");
    if (fromQuery) {
      sessionStorage.setItem(STORAGE_KEY, fromQuery.replace(/\/$/, ""));
    }
    const fromStorage = sessionStorage.getItem(STORAGE_KEY);
    if (fromStorage) return fromStorage;
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
}

export async function fetchJson(path: string, options?: RequestInit) {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }
  return res.json();
}

export async function createRun(versionLabel: string = "v1.0", mode: string = "baseline") {
  return fetchJson("/v1/runs", {
    method: "POST",
    body: JSON.stringify({ version_label: versionLabel, mode }),
  });
}

export async function listRuns() {
  return fetchJson("/v1/runs");
}

export async function getRunDetails(runId: string) {
  return fetchJson(`/v1/runs/${runId}`);
}

export async function getRunFailures(runId: string) {
  return fetchJson(`/v1/runs/${runId}/failures`);
}

export async function listAllFailures() {
  return fetchJson("/v1/failures");
}

export async function mutateFailure(failureId: string, count: number = 6, versionLabel: string = "v1.0") {
  return fetchJson(`/v1/failures/${failureId}/mutate`, {
    method: "POST",
    body: JSON.stringify({ count, version_label: versionLabel }),
  });
}

export async function replayFailure(failureId: string, versionLabel: string = "v1.0") {
  return fetchJson(`/v1/failures/${failureId}/replay`, {
    method: "POST",
    body: JSON.stringify({ version_label: versionLabel }),
  });
}

export async function createRegression(failureId: string, threshold: number = 1.0) {
  return fetchJson("/v1/regressions", {
    method: "POST",
    body: JSON.stringify({ failure_id: failureId, threshold }),
  });
}

export async function listRegressions(versionLabel: string = "v1.1") {
  return fetchJson(`/v1/regressions?version_label=${versionLabel}`);
}

export async function replayRegression(regressionId: string, versionLabel: string = "v1.1") {
  return fetchJson(`/v1/regressions/${regressionId}/replay`, {
    method: "POST",
    body: JSON.stringify({ version_label: versionLabel }),
  });
}

export async function checkReleaseGate(versionLabel: string = "v1.0") {
  return fetchJson("/v1/regressions/release-check", {
    method: "POST",
    body: JSON.stringify({ version_label: versionLabel }),
  });
}
