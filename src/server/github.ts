// GitHub REST (spec.md > Tool — create_repo + push_files).
// Fine-grained PAT from env; private by default; the human owns the account.

import { env } from "cloudflare:workers";

const TOKEN = () => {
  const token = env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is missing — repo step skipped. Add a fine-grained PAT (repo create + contents write).");
  return token;
};

const API = "https://api.github.com";

function ghHeaders() {
  return {
    Authorization: `Bearer ${TOKEN()}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "caddie-poc",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export type CreateRepoResult = { full_name: string; url: string; private: boolean };

export async function createRepo(name: string): Promise<CreateRepoResult> {
  const res = await fetch(`${API}/user/repos`, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({ name, private: true, auto_init: false }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub create repo HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { full_name: string; html_url: string; private: boolean };
  return { full_name: data.full_name, url: data.html_url, private: data.private };
}

export async function pushFile(fullName: string, path: string, content: string): Promise<void> {
  // Overwriting an existing file requires its blob sha — fetch or start clean.
  const existing = await fetch(`${API}/repos/${fullName}/contents/${path}`, { headers: ghHeaders() });
  const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;
  const res = await fetch(`${API}/repos/${fullName}/contents/${path}`, {
    method: "PUT",
    headers: ghHeaders(),
    body: JSON.stringify({
      message: `Add ${path} (via Caddie)`,
      content: btoa(unescape(encodeURIComponent(content))),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub push ${path} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
}

export function licenseText(spdx: string): string {
  const year = new Date().getFullYear();
  if (spdx === "apache-2.0") {
    return `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.`;
  }
  // MIT by default
  return `MIT License

Copyright (c) ${year} captjay98

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
}

export async function setRepoVisibility(fullName: string, isPublic: boolean): Promise<void> {
  const res = await fetch(`${API}/repos/${fullName}`, {
    method: "PATCH",
    headers: ghHeaders(),
    body: JSON.stringify({ private: !isPublic }),
  });
  if (!res.ok) throw new Error(`GitHub visibility HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function getRepo(fullName: string): Promise<{ private: boolean; url: string } | null> {
  const res = await fetch(`${API}/repos/${fullName}`, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get repo HTTP ${res.status}`);
  const data = (await res.json()) as { private: boolean; html_url: string };
  return { private: data.private, url: data.html_url };
}

export async function deleteRepo(fullName: string): Promise<void> {
  const res = await fetch(`${API}/repos/${fullName}`, { method: "DELETE", headers: ghHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`GitHub delete HTTP ${res.status}`);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "caddie-project";
}
