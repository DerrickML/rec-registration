import { test } from "vitest"
import assert from "node:assert/strict"
import {
  conferenceRegistrationNotice, registrationNoticeSettings, resetOpeningNotice,
  DEFAULT_CLOSED_MESSAGE, DEFAULT_NOT_OPEN_MESSAGE,
} from "../lib/registration-notice.mjs"

const conference = (changes = {}) => ({
  registrationOpen: false, startDate: "2099-10-19", endDate: "2099-10-22", ...changes,
})

test("disabled registration defaults to closed even for a future conference", () => {
  assert.deepEqual(conferenceRegistrationNotice(conference()), {
    state: "closed", title: "Registration closed", message: DEFAULT_CLOSED_MESSAGE,
  })
})

test("legacy opening-soon placeholders cannot override the closed state", () => {
  for (const regClosedMessage of ["Registration opening soon", " Registration is opening soon. ",
    "REGISTRATION WILL OPEN SOON!", "Registration not yet open", "Registration not open yet."]) {
    assert.equal(conferenceRegistrationNotice(conference({ regClosedMessage })).message, DEFAULT_CLOSED_MESSAGE)
  }
})

test("informative custom closed messages are trimmed and preserved", () => {
  assert.equal(conferenceRegistrationNotice(conference({ regClosedMessage: " Registration has closed because capacity was reached. " })).message,
    "Registration has closed because capacity was reached.")
})

test("not-yet-open requires an explicit setting and has its own message", () => {
  for (const serialize of [value => value, JSON.stringify]) {
    const socialsJson = serialize({ registrationNotice: { state: "not_yet_open", openingMessage: " Registration opens on 1 October. " } })
    assert.deepEqual(conferenceRegistrationNotice(conference({ socialsJson, regClosedMessage: "We have closed." })), {
      state: "not_yet_open", title: "Registration not yet open", message: "Registration opens on 1 October.",
    })
  }
})

test("pending notices use a safe default or a compatible legacy opening placeholder", () => {
  const socialsJson = { registrationNotice: { state: "not_yet_open" } }
  assert.equal(conferenceRegistrationNotice(conference({ socialsJson })).message, DEFAULT_NOT_OPEN_MESSAGE)
  assert.equal(conferenceRegistrationNotice(conference({ socialsJson, regClosedMessage: "Registration opening soon" })).message, "Registration opening soon")
  assert.equal(conferenceRegistrationNotice(conference({ socialsJson, regClosedMessage: "Registration ended." })).message, DEFAULT_NOT_OPEN_MESSAGE)
})

test("an open flag takes precedence over pending notices and obsolete registrationStatus", () => {
  for (const couponRequired of [true, false]) {
    const notice = conferenceRegistrationNotice(conference({
      registrationOpen: true, couponRequired, registrationStatus: "closed",
      socialsJson: { registrationNotice: { state: "not_yet_open" } },
    }))
    assert.equal(notice.state, "open")
    assert.match(notice.message, couponRequired ? /required/ : /optional/)
  }
})

test("invalid or unknown notice configuration fails to closed without throwing", () => {
  for (const socialsJson of [undefined, null, "invalid", "null", "[]", "false", 17,
    { registrationNotice: { state: "open", openingMessage: 123 } }]) {
    assert.deepEqual(registrationNoticeSettings(socialsJson), { state: "closed", openingMessage: "" })
    assert.equal(conferenceRegistrationNotice(conference({ socialsJson })).state, "closed")
  }
})

test("only a boolean true is considered open", () => {
  for (const registrationOpen of [undefined, null, "true", 1, false]) {
    assert.equal(conferenceRegistrationNotice(conference({ registrationOpen })).state, "closed")
  }
})

test("missing conferences report unavailable, not an invented opening or closing date", () => {
  assert.equal(conferenceRegistrationNotice(null).state, "unavailable")
  assert.equal(conferenceRegistrationNotice(undefined).title, "Registration unavailable")
})

test("opening clears the pending state without mutating or discarding website settings", () => {
  const website = { socials: { facebook: "https://example.org" }, reports: { pageTitle: "Reports" },
    registrationNotice: { state: "not_yet_open", openingMessage: "Opening in October.", extra: "preserved" } }
  const original = structuredClone(website)
  const opened = resetOpeningNotice(website)
  assert.deepEqual(opened, { ...website, registrationNotice: { ...website.registrationNotice, state: "closed" } })
  assert.deepEqual(website, original)
  assert.deepEqual(JSON.parse(resetOpeningNotice(JSON.stringify(website))), opened)
  assert.equal(conferenceRegistrationNotice(conference({ socialsJson: opened })).state, "closed")
})

test("opening does not create metadata or repair unrelated malformed website configuration", () => {
  for (const value of [null, undefined, "invalid", "[]", "{}", { reports: { pageTitle: "Reports" } }]) {
    assert.equal(resetOpeningNotice(value), value)
  }
})
