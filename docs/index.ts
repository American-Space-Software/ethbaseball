import fs from "node:fs/promises"
import path from "node:path"
import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { BskyAgent, RichText } from "@atproto/api"

type Mode = "dev" | "publish" | "delete"

type SourceThread = {
  file: string
  title: string
  source: string
  posts: string[]
}

type PublishedPost = {
  text: string
  url: string
  uri?: string
  cid?: string
  id?: string
}

type PublishedThread = {
  file: string
  title: string
  source: string
  posts: PublishedPost[]
  backlink?: PublishedPost
}

type PlatformState = {
  parentThread?: PublishedThread
  threads: PublishedThread[]
  guide?: { source: string, posts: PublishedPost[] }
}

type PublishedState = {
  publishedAt: string
  platforms: Record<string, PlatformState | undefined>
}

type ReplyTarget = {
  root: PublishedPost
  parent: PublishedPost
}

interface SocialClient {
  name: string
  maxChars: number
  accountName(): string
  previewUrl(file: string): string
  connect(): Promise<void>
  post(text: string, reply?: ReplyTarget): Promise<PublishedPost>
  delete(post: PublishedPost): Promise<void>
}

class BlueskyClient implements SocialClient {
  name = "bluesky"
  maxChars = 300

  private agent?: BskyAgent
  private handle?: string
  private delayMs = 900

  accountName(): string {
    return this.required("BSKY_HANDLE")
  }

  previewUrl(file: string): string {
    return `https://bsky.app/profile/example.bsky.social/post/${file.replace(".md", "")}`
  }

  async connect(): Promise<void> {
    this.handle = this.required("BSKY_HANDLE")
    this.agent = new BskyAgent({ service: process.env.BSKY_SERVICE || "https://bsky.social" })

    await this.agent.login({
      identifier: this.handle,
      password: this.required("BSKY_APP_PASSWORD"),
    })
  }

  async post(text: string, reply?: ReplyTarget): Promise<PublishedPost> {
    if (!this.agent || !this.handle) throw new Error("Bluesky client is not connected.")

    const rt = new RichText({ text })
    await rt.detectFacets(this.agent)

    const res = await this.agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
      ...(reply ? { reply: this.toReply(reply) } : {}),
    })

    await this.wait()

    return {
      text,
      uri: res.uri,
      cid: res.cid,
      url: `https://bsky.app/profile/${this.handle}/post/${this.rkey(res.uri)}`,
    }
  }

  async delete(post: PublishedPost): Promise<void> {
    if (!this.agent) throw new Error("Bluesky client is not connected.")
    if (!post.uri) throw new Error("Cannot delete Bluesky post without uri.")

    console.log(`Deleting ${post.url}`)
    await this.agent.deletePost(post.uri)
    await this.wait()
  }

  private toReply(reply: ReplyTarget) {
    if (!reply.root.uri || !reply.root.cid || !reply.parent.uri || !reply.parent.cid) {
      throw new Error("Bluesky replies require uri and cid.")
    }

    return {
      root: { uri: reply.root.uri, cid: reply.root.cid },
      parent: { uri: reply.parent.uri, cid: reply.parent.cid },
    }
  }

  private rkey(uri: string): string {
    const value = uri.split("/").pop()
    if (!value) throw new Error(`Could not parse Bluesky rkey from ${uri}`)
    return value
  }

  private required(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is required.`)
    return value
  }

  private wait(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.delayMs))
  }
}

class DocsPublisher {
  private mode: Mode = process.argv[2] === "dev" ? "dev" : process.argv[2] === "delete" ? "delete" : "publish"
  private docsDir = path.resolve("docs")
  private threadsDir = path.join(this.docsDir, "social-threads")
  private introPath = path.join(this.docsDir, "intro.md")
  private publishedPath = path.join(this.docsDir, "published.json")
  private clients: SocialClient[] = [new BlueskyClient()]
  private twitterMaxChars = 280

  async run(): Promise<void> {
    if (this.mode === "dev") return this.dev()
    if (this.mode === "delete") return this.deletePublished()
    return this.put()
  }

  private async dev(): Promise<void> {
    const intro = await this.readIntro()
    const sources = await this.readSources()
    const client = this.clients[0]

    console.log("# Bluesky Preview")

    console.log("\n## Intro")
    intro.posts.forEach(post => console.log(`\n${post}`))

    console.log("\n## Generated TOC Reply Chain")
    sources.forEach((source, index) => {
      const post = this.tocPost(index, source.title, client.previewUrl(source.file))
      console.log(`\n--- toc ${index + 1}/${sources.length} (${post.length}) ---`)
      console.log(post)
    })

    for (const source of sources) {
      console.log(`\n## ${source.title}`)
      source.posts.forEach((post, index) => {
        console.log(`\n--- ${index + 1}/${source.posts.length} (${post.length}) ---`)
        console.log(post)
      })
      console.log(`\n${this.backlink(client.previewUrl("intro.md"))}`)
    }

    console.log("\n# Manual Twitter/X Instructions")
    console.log("\n1. Publish each chapter thread first.")
    console.log("2. Copy the URL of the first post from each chapter thread.")
    console.log("3. Publish the intro post.")
    console.log("4. Reply to the intro with the numbered title and URL for chapter 1.")
    console.log("5. Reply to that with chapter 2, then reply to that with chapter 3, and continue through all chapters.")
    console.log("6. Optionally reply to the end of each chapter thread with a backlink to the intro tweet.")
    console.log("\nTwitter/X normal posts are 280 characters. Any warnings below should be fixed before copying there.")

    this.warnTwitterIssues(intro, sources)
  }

  private async put(): Promise<void> {
    const intro = await this.readIntro()
    const sources = await this.readSources()
    const state = await this.readState()

    await this.confirm("PUBLISH", intro, sources, state)

    for (const client of this.clients) {
      await client.connect()
      const oldState = state.platforms[client.name] || { threads: [] }
      state.platforms[client.name] = await this.putPlatform(client, intro, sources, oldState)
    }

    await this.writeState({
      publishedAt: new Date().toISOString(),
      platforms: state.platforms,
    })

    console.log(`Saved ${this.publishedPath}`)
  }

  private async putPlatform(client: SocialClient, intro: SourceThread, sources: SourceThread[], state: PlatformState): Promise<PlatformState> {
    const nextThreads: PublishedThread[] = []
    let changed = false

    for (const oldThread of state.threads) {
      if (!sources.some(source => source.file === oldThread.file)) {
        await this.deleteThread(client, oldThread)
        changed = true
      }
    }

    for (const source of sources) {
      const existing = state.threads.find(thread => thread.file === source.file)

      if (existing && existing.source === source.source) {
        console.log(`${client.name}: keeping ${source.file}`)
        nextThreads.push(existing)
        continue
      }

      if (existing) {
        console.log(`${client.name}: replacing ${source.file}`)
        await this.deleteThread(client, existing)
      } else {
        console.log(`${client.name}: publishing ${source.file}`)
      }

      nextThreads.push(await this.publishThread(client, source))
      changed = true
    }

    const parentSource = this.parentSource(intro, sources)
    const parentChanged = state.parentThread?.source !== parentSource

    if (!changed && !parentChanged && state.parentThread) {
      console.log(`${client.name}: no changes.`)
      return state
    }

    if (state.parentThread) {
      await this.deleteThread(client, state.parentThread)
    }

    for (const thread of nextThreads) {
      if (thread.backlink) {
        await client.delete(thread.backlink)
        delete thread.backlink
      }
    }

    const parentThread = await this.publishThread(client, {
      ...intro,
      source: parentSource,
      posts: [intro.posts[0]],
    })

    for (const [index, thread] of nextThreads.entries()) {
      const post = this.tocPost(index, thread.title, thread.posts[0].url)
      this.validate(client, `toc post ${index + 1}/${nextThreads.length}`, post)
      parentThread.posts.push(await this.reply(client, parentThread, post))
    }

    for (const thread of nextThreads) {
      thread.backlink = await this.reply(client, thread, this.backlink(parentThread.posts[0].url))
    }

    return {
      parentThread,
      threads: nextThreads,
    }
  }

  private async deletePublished(): Promise<void> {
    const state = await this.readState()

    await this.confirmDelete(state)

    for (const client of this.clients) {
      await client.connect()
      await this.deletePlatform(client, state.platforms[client.name] || { threads: [] })
      state.platforms[client.name] = { threads: [] }
    }

    await this.writeState({
      publishedAt: new Date().toISOString(),
      platforms: state.platforms,
    })

    console.log(`Deleted published docs and saved ${this.publishedPath}`)
  }

  private async deletePlatform(client: SocialClient, state: PlatformState): Promise<void> {
    if (state.guide) {
      for (const post of [...state.guide.posts].reverse()) {
        await client.delete(post)
      }
    }

    for (const thread of [...state.threads].reverse()) {
      await this.deleteThread(client, thread)
    }

    if (state.parentThread) {
      await this.deleteThread(client, state.parentThread)
    }
  }

  private async publishThread(client: SocialClient, source: SourceThread): Promise<PublishedThread> {
    const posts: PublishedPost[] = []
    let root: PublishedPost | undefined
    let parent: PublishedPost | undefined

    for (const text of source.posts) {
      const post = await client.post(text, root && parent ? { root, parent } : undefined)
      root ??= post
      parent = post
      posts.push(post)
    }

    return {
      file: source.file,
      title: source.title,
      source: source.source,
      posts,
    }
  }

  private async reply(client: SocialClient, thread: PublishedThread, text: string): Promise<PublishedPost> {
    return client.post(text, {
      root: thread.posts[0],
      parent: thread.posts[thread.posts.length - 1],
    })
  }

  private async deleteThread(client: SocialClient, thread: PublishedThread): Promise<void> {
    const posts = new Map<string, PublishedPost>()

    for (const post of thread.posts) posts.set(this.postKey(post), post)
    if (thread.backlink) posts.set(this.postKey(thread.backlink), thread.backlink)

    for (const post of [...posts.values()].reverse()) {
      await client.delete(post)
    }
  }

  private async readIntro(): Promise<SourceThread> {
    const intro = await this.readSource(this.introPath, false)

    if (intro.posts.length !== 1) {
      throw new Error(`intro.md must produce exactly one post. It currently produces ${intro.posts.length}.`)
    }

    return intro
  }

  private async readSources(): Promise<SourceThread[]> {
    const files = (await fs.readdir(this.threadsDir))
      .filter(file => file.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    return Promise.all(files.map(file => this.readSource(path.join(this.threadsDir, file), true)))
  }

  private async readSource(filePath: string, numbered: boolean): Promise<SourceThread> {
    const file = path.basename(filePath)
    const source = await fs.readFile(filePath, "utf8")
    const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim() || file.replace(".md", "")

    const rawPosts = source
      .replace(/^#\s+.+\n+/, "")
      .trim()
      .split(/\n---\n/g)
      .map(post => this.cleanPost(post))
      .filter(Boolean)

    const posts = numbered
      ? rawPosts.map((post, index) => {
          const body = index === 0 ? `⚾ ${title} ⚾\n\n${post}` : post
          return `${body} ${index + 1}/${rawPosts.length}`
        })
      : rawPosts

    for (const client of this.clients) {
      posts.forEach((post, index) => this.validate(client, `${file} post ${index + 1}/${posts.length}`, post))
    }

    return { file, title, source, posts }
  }

  private cleanPost(post: string): string {
    return post
      .trim()
      .replace(/^---\s*/, "")
      .replace(/\s*---$/, "")
      .replace(/\s+\d+\/\d+\s*$/, "")
      .trim()
  }

  private tocPost(index: number, title: string, url: string): string {
    return `${index + 1}. ${title}\n${url}`
  }

  private backlink(parentUrl: string): string {
    return `📚 Back to the full EBL guide:\n\n${parentUrl}`
  }

  private parentSource(intro: SourceThread, sources: SourceThread[]): string {
    return [
      "toc-chain-v1",
      intro.source,
      ...sources.map(source => source.source),
    ].join("\n\n---SOURCE---\n\n")
  }

  private warnTwitterIssues(intro: SourceThread, sources: SourceThread[]): void {
    const problems: string[] = []

    intro.posts.forEach((post, index) => {
      if (post.length > this.twitterMaxChars) {
        problems.push(`intro post ${index + 1}/${intro.posts.length} is ${post.length} chars`)
      }
    })

    sources.forEach(source => {
      source.posts.forEach((post, index) => {
        if (post.length > this.twitterMaxChars) {
          problems.push(`${source.file} post ${index + 1}/${source.posts.length} is ${post.length} chars`)
        }
      })
    })

    if (problems.length === 0) {
      console.log("\nNo Twitter/X length warnings.")
      return
    }

    console.log("\nTwitter/X length warnings:")
    problems.forEach(problem => console.log(`- ${problem}`))
  }

  private postKey(post: PublishedPost): string {
    return post.uri || post.id || post.url
  }

  private validate(client: SocialClient, label: string, text: string): void {
    if (text.length > client.maxChars) {
      throw new Error(`${client.name} ${label} is ${text.length} chars. Max is ${client.maxChars}.\n\n${text}`)
    }
  }

  private async confirm(action: "PUBLISH", intro: SourceThread, sources: SourceThread[], state: PublishedState): Promise<void> {
    console.log("Publishing docs.")
    console.log(`Intro posts: ${intro.posts.length}`)
    console.log(`Chapters: ${sources.length}`)

    for (const client of this.clients) {
      const platform = state.platforms[client.name] || { threads: [] }
      const hasChanges =
        platform.parentThread?.source !== this.parentSource(intro, sources) ||
        platform.threads.length !== sources.length ||
        sources.some(source => {
          const existing = platform.threads.find(thread => thread.file === source.file)
          return !existing || existing.source !== source.source
        })

      console.log(`\n${client.name}: ${client.accountName()} — ${hasChanges ? "update" : "unchanged"}`)
      sources.forEach((source, index) => console.log(`${index + 1}. ${source.title} (${source.posts.length})`))
    }

    const answer = await this.prompt(`\nType ${action} to continue: `)
    if (answer !== action) throw new Error("Canceled.")
  }

  private async confirmDelete(state: PublishedState): Promise<void> {
    console.log("Deleting published docs.")

    for (const client of this.clients) {
      const platform = state.platforms[client.name] || { threads: [] }
      const count = (platform.parentThread?.posts.length || 0)
        + (platform.guide?.posts.length || 0)
        + platform.threads.reduce((sum, thread) => sum + thread.posts.length + (thread.backlink ? 1 : 0), 0)

      console.log(`${client.name}: ${client.accountName()} — ${count} known posts`)
    }

    const answer = await this.prompt("\nType DELETE to continue: ")
    if (answer !== "DELETE") throw new Error("Canceled.")
  }

  private async prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const answer = await rl.question(question)
    rl.close()
    return answer
  }

  private async readState(): Promise<PublishedState> {
    try {
      const raw = JSON.parse(await fs.readFile(this.publishedPath, "utf8"))

      if (raw.platforms) return raw

      return {
        publishedAt: raw.publishedAt || "",
        platforms: {
          bluesky: {
            parentThread: raw.parentThread,
            threads: raw.threads || [],
          },
        },
      }
    } catch {
      return {
        publishedAt: "",
        platforms: {},
      }
    }
  }

  private async writeState(state: PublishedState): Promise<void> {
    await fs.writeFile(this.publishedPath, JSON.stringify(state, null, 2))
  }
}

await new DocsPublisher().run()