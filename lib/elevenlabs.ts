const ELEVEN_BASE = "https://api.elevenlabs.io";

export function getElevenLabsApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key?.trim()) {
    throw new Error("Missing ELEVENLABS_API_KEY");
  }
  return key.trim();
}

export async function elevenlabsFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("xi-api-key", getElevenLabsApiKey());
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${ELEVEN_BASE}${path}`, { ...init, headers });
}

export async function getConvaiAgent(agentId: string): Promise<unknown> {
  const res = await elevenlabsFetch(
    `/v1/convai/agents/${encodeURIComponent(agentId)}`,
    { method: "GET" }
  );
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : `${res.status} ${res.statusText}`;
    throw new Error(`ElevenLabs GET agent failed: ${msg}`);
  }
  return data;
}

export async function patchConvaiAgent(
  agentId: string,
  body: unknown
): Promise<unknown> {
  const res = await elevenlabsFetch(
    `/v1/convai/agents/${encodeURIComponent(agentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : `${res.status} ${res.statusText}`;
    throw new Error(`ElevenLabs PATCH agent failed: ${msg}`);
  }
  return data;
}

export type ConvaiToolListItem = {
  id: string;
  tool_config?: { type?: string; name?: string };
};

export type KnowledgeBaseDocumentRow = {
  id: string;
  name?: string;
};

type ConvaiToolsListPage = {
  tools?: ConvaiToolListItem[];
  has_more?: boolean;
  next_cursor?: string | null;
};

async function parseJsonOrThrow(
  res: Response,
  label: string
): Promise<unknown> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : `${res.status} ${res.statusText}`;
    throw new Error(`ElevenLabs ${label} failed: ${msg}`);
  }
  return data;
}

/** Paginates GET /v1/convai/tools (optional `search` = name prefix). */
export async function listAllConvaiTools(options?: {
  search?: string;
}): Promise<ConvaiToolListItem[]> {
  const out: ConvaiToolListItem[] = [];
  let cursor: string | undefined;
  for (;;) {
    const q = new URLSearchParams();
    q.set("page_size", "100");
    if (options?.search) q.set("search", options.search);
    if (cursor) q.set("cursor", cursor);
    const res = await elevenlabsFetch(`/v1/convai/tools?${q}`, {
      method: "GET",
    });
    const data = (await parseJsonOrThrow(res, "list tools")) as ConvaiToolsListPage;
    const batch = data.tools ?? [];
    out.push(...batch);
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return out;
}

export async function createConvaiTool(body: unknown): Promise<unknown> {
  const res = await elevenlabsFetch("/v1/convai/tools", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow(res, "create tool");
}

export async function patchConvaiTool(
  toolId: string,
  body: unknown
): Promise<unknown> {
  const res = await elevenlabsFetch(
    `/v1/convai/tools/${encodeURIComponent(toolId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
  return parseJsonOrThrow(res, "patch tool");
}

type KnowledgeBaseListPage = {
  documents?: KnowledgeBaseDocumentRow[];
  has_more?: boolean;
  next_cursor?: string | null;
};

export async function listAllKnowledgeBaseDocuments(options?: {
  search?: string;
}): Promise<KnowledgeBaseDocumentRow[]> {
  const out: KnowledgeBaseDocumentRow[] = [];
  let cursor: string | undefined;
  for (;;) {
    const q = new URLSearchParams();
    q.set("page_size", "100");
    if (options?.search) q.set("search", options.search);
    if (cursor) q.set("cursor", cursor);
    const res = await elevenlabsFetch(`/v1/convai/knowledge-base?${q}`, {
      method: "GET",
    });
    const data = (await parseJsonOrThrow(
      res,
      "list knowledge base"
    )) as KnowledgeBaseListPage;
    out.push(...(data.documents ?? []));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor ?? undefined;
  }
  return out;
}

export async function createKnowledgeBaseTextDocument(
  text: string,
  name: string
): Promise<KnowledgeBaseDocumentRow> {
  const res = await elevenlabsFetch("/v1/convai/knowledge-base/text", {
    method: "POST",
    body: JSON.stringify({ text, name }),
  });
  const data = (await parseJsonOrThrow(
    res,
    "create knowledge base text"
  )) as KnowledgeBaseDocumentRow;
  if (!data.id) throw new Error("create knowledge base text: missing id");
  return data;
}
