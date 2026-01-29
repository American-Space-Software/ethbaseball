import { ChatGPTAPI } from "chatgpt";
import { inject, injectable } from "inversify";
import { OpenAI } from "openai";

type TeamRefInsert = { teamref: { id: string; text: string } };
type PlayerRefInsert = { playerref: { id: string; text: string } };

type QuillAttributes = { bold: boolean };

type QuillOp =
  | { insert: string | TeamRefInsert | PlayerRefInsert }
  | { insert: string | TeamRefInsert | PlayerRefInsert; attributes: QuillAttributes };

type QuillDelta = { ops: QuillOp[] };

@injectable()
class ChatGPTService {
  constructor(
    @inject("chatGPTAPI") private chatGPTAPI: ChatGPTAPI,
    @inject("openai") private openai: OpenAI
  ) {}

  async generateGameRecapDelta(
    descriptions: any,
    linescore: any,
    gameDateISO: string, // YYYY-MM-DD
    opts?: { model?: string; temperature?: number }
  ): Promise<QuillDelta> {
    const model = opts?.model ?? process.env.OPENAI_RECAP_MODEL ?? "gpt-4o-mini";
    const temperature = opts?.temperature ?? 0.4;

    const prompt = `
You are writing a formal baseball game recap for a web app.

You will be given:
- "descriptions" (play-by-play descriptions AND metadata)
- "linescore"
- "gameDateISO" (YYYY-MM-DD)

Use metadata to determine what happened. Do not assume missing data.

OUTPUT FORMAT (CRITICAL):
Return ONLY valid JSON with shape:
{ "ops": [ ... ] }

ARTICLE PRESENTATION (CRITICAL, MUST BE FIRST):
Op[0] MUST be a bold title line:
- insert: a string ending with "\\n"
- attributes: { "bold": true }
Op[1] MUST be the exact date line and nothing else:
- insert: exactly gameDateISO + "\\n\\n"
- NO attributes on the date line

After that, normal paragraphs.

Each later op MUST be one of:
- { "insert": "text" }
- { "insert": { "teamref": { "id": "...", "text": "Team Name" } } }
- { "insert": { "playerref": { "id": "...", "text": "Player Name" } } }

Optional formatting:
- You MAY include { "attributes": { "bold": true } } on ops.
- Do NOT use any other attributes besides "bold".

CONTENT RULES:
- Formal tone
- Do NOT gender anyone
- Do NOT mention WPA explicitly
- Describe top 3 highest-impact plays (use any impact metric internally but do not name it)
- Describe lead changes / decisive inning
- Mention HRs only if they occurred
- Mention multi-hit players (summarize if many)
- Finish with brief summaries of both starting pitchers (no invented stats)

LINKING:
- FIRST mention of a team → teamref embed
- FIRST mention of a player → playerref embed
- Subsequent mentions → plain text

STRUCTURE:
- No headers, no bullets (title line only)

gameDateISO:
${JSON.stringify(gameDateISO)}

LINESCORE JSON:
${JSON.stringify(linescore)}

DESCRIPTIONS JSON:
${JSON.stringify(descriptions)}
`.trim();

    const insertSchema = {
      anyOf: [
        { type: "string" },
        {
          type: "object",
          additionalProperties: false,
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["teamref"],
              properties: {
                teamref: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                  },
                },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["playerref"],
              properties: {
                playerref: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                  },
                },
              },
            },
          ],
        },
      ],
    } as const;

    const attributesSchema = {
      type: "object",
      additionalProperties: false,
      required: ["bold"],
      properties: {
        bold: { type: "boolean" },
      },
    } as const;

    // Generic op: either insert-only or insert+attributes(bold)
    const opItemSchema = {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["insert"],
          properties: {
            insert: insertSchema,
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["insert", "attributes"],
          properties: {
            insert: insertSchema,
            attributes: attributesSchema,
          },
        },
      ],
    } as const;

    // Enforced title op (must be bold text ending with \n)
    const titleOpSchema = {
      type: "object",
      additionalProperties: false,
      required: ["insert", "attributes"],
      properties: {
        insert: { type: "string", pattern: ".*\\n$" },
        attributes: {
          type: "object",
          additionalProperties: false,
          required: ["bold"],
          properties: {
            bold: { const: true },
          },
        },
      },
    } as const;

    // Enforced date op (must be exact string; no attributes allowed)
    const dateOpSchema = {
      type: "object",
      additionalProperties: false,
      required: ["insert"],
      properties: {
        insert: { const: `${gameDateISO}\n\n` },
      },
    } as const;

    const deltaJsonSchema = {
      name: "quill_game_recap_delta",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["ops"],
        properties: {
          ops: {
            type: "array",
            minItems: 2,
            prefixItems: [titleOpSchema, dateOpSchema],
            items: opItemSchema,
          },
        },
      },
      strict: true,
    } as const;

    const resp = await this.openai.chat.completions.create({
      model,
      temperature,
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON for a Quill Delta with shape { ops: [...] }. No markdown, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: deltaJsonSchema as any,
      },
    });

    const content = resp.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned from OpenAI.");

    const parsed = JSON.parse(content);

    if (!parsed?.ops || !Array.isArray(parsed.ops)) {
      throw new Error("Invalid Quill Delta: missing ops array.");
    }

    // Optional sanity check (should never fail now because schema enforces it)
    if (parsed.ops[0]?.attributes?.bold !== true || typeof parsed.ops[0]?.insert !== "string") {
      throw new Error("Schema violation: first op is not a bold title string.");
    }
    if (parsed.ops[1]?.insert !== `${gameDateISO}\n\n`) {
      throw new Error("Schema violation: second op is not the exact date line.");
    }

    return parsed as QuillDelta;
  }
}

export { ChatGPTService };
export type { QuillDelta, QuillOp, TeamRefInsert, PlayerRefInsert, QuillAttributes };
