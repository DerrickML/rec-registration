import { beforeEach, expect, it, vi } from "vitest"
const mocks=vi.hoisted(()=>({fetch:vi.fn()}))
vi.mock("@/lib/hr-portal-api",()=>({fetchHrPortalBinary:mocks.fetch}))
import { GET } from "../app/api/badges/[token]/print/route"
const token="a".repeat(43)
const call=(query="",value=token)=>GET(new Request(`http://localhost/api/badges/${value}/print?${query}`),{params:Promise.resolve({token:value})})
beforeEach(()=>vi.clearAllMocks())
it("proxies private badge PDF with optional bleed and no cache",async()=>{
  mocks.fetch.mockResolvedValue(new Response("%PDF-test",{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=badge.pdf"}}))
  const response=await call("format=pdf&bleed=true&download=1&userId=forged")
  expect(response.status).toBe(200)
  expect(response.headers.get("cache-control")).toContain("no-store")
  expect(response.headers.get("content-type")).toBe("application/pdf")
  expect(await response.text()).toBe("%PDF-test")
  expect(mocks.fetch.mock.calls[0][0]).toBe(`/api/v1/rec/badges/${token}/print?format=pdf&bleed=true&download=1`)
})
it("rejects invalid tokens and render options before contacting HR",async()=>{
  expect((await call("format=html")).status).toBe(400)
  expect((await call("bleed=10")).status).toBe(400)
  expect((await call("","invalid")).status).toBe(400)
  expect(mocks.fetch).not.toHaveBeenCalled()
})
it("revocation and upstream failures do not leak service diagnostics",async()=>{
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({error:"internal sensitive details"}),{status:404}))
  const response=await call()
  expect(response.status).toBe(404)
  expect(await response.text()).not.toContain("sensitive")
  mocks.fetch.mockRejectedValue(new Error("server key"))
  expect((await call()).status).toBe(502)
})
it("does not serve unexpected HTML as a downloadable badge",async()=>{
  mocks.fetch.mockResolvedValue(new Response("<html>login</html>",{headers:{"Content-Type":"text/html"}}))
  expect((await call()).status).toBe(502)
})
it("forwards the authoritative digital profile and display revision, not caller detail overrides",async()=>{
  mocks.fetch.mockResolvedValue(new Response("png",{headers:{"Content-Type":"image/png"}}))
  const response=await call("profile=digital&v=0011&showCategory=true")
  expect(response.status).toBe(200)
  expect(mocks.fetch.mock.calls[0][0]).toBe(`/api/v1/rec/badges/${token}/print?format=png&bleed=false&download=0&profile=digital&v=0011`)
})
it("rejects unknown profiles and malformed display revisions",async()=>{
  for (const query of ["profile=admin","profile=","v=11111","v=abcd","v=","v=0011x"]) expect((await call(query)).status).toBe(400)
  expect(mocks.fetch).not.toHaveBeenCalled()
})
