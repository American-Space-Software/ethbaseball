import { QuillDeltaToHtmlConverter } from "quill-delta-to-html"
import { injectable } from "inversify"

@injectable()
class QuillWebService {

  constructor() {}

  async translateContent(content: any, suppressSrc: boolean = false): Promise<string> {
    if (!content?.ops) return ""

    const qdc = new QuillDeltaToHtmlConverter(content.ops, {
      encodeHtml: false
    })

    qdc.renderCustomWith(renderCustom())
    return qdc.convert()
  }

  async translateContentEncodeHtml(content: any, suppressSrc: boolean = false): Promise<string> {
    if (!content?.ops) return ""

    const qdc = new QuillDeltaToHtmlConverter(content.ops, {})
    qdc.renderCustomWith(renderCustom())
    return qdc.convert()
  }
}

const escapeText = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const escapeAttr = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const resolveHref = (scheme: "team" | "player", id: string) => {
  if (!id) return ""
  return scheme === "team"
    ? `/t/index/${id}`
    : `/p/${id}`
}

const renderCustom = () => {
  return function (customOp: any, _contextOp: any) {
    const team = customOp?.insert?.teamref
    const player = customOp?.insert?.playerref
    const payload = team || player
    if (!payload) return ""

    const scheme: "team" | "player" = team ? "team" : "player"
    const href = resolveHref(scheme, String(payload.id ?? ""))

    const safeText = escapeText(payload.text)
    const safeHref = escapeAttr(href)

    return `<a href="${safeHref}">${safeText}</a>`
  }
}


export { QuillWebService }
