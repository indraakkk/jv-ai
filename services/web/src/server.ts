const API_URL = process.env.API_URL ?? "http://localhost:3000"

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(new URL("./index.html", import.meta.url).pathname), {
        headers: { "Content-Type": "text/html" },
      })
    }

    if (url.pathname === "/styles.css") {
      return new Response(Bun.file(new URL("./styles.css", import.meta.url).pathname), {
        headers: { "Content-Type": "text/css" },
      })
    }

    // Proxy API requests
    if (url.pathname.startsWith("/api/")) {
      const apiPath = url.pathname.replace("/api", "")
      const apiUrl = `${API_URL}${apiPath}${url.search}`
      const res = await fetch(apiUrl, {
        method: req.method,
        headers: req.headers,
        body: req.method !== "GET" ? await req.text() : undefined,
      })
      return new Response(res.body, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response("Not found", { status: 404 })
  },
})

console.log("Web UI running on http://localhost:3001")
