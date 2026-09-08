import { describe, expect, it } from "vitest"
import { getNextSponsorScrollPosition } from "../lib/sponsor-utils"

describe("sponsor carousel movement", () => {
  const carousel = {
    maxScroll: 602,
    positions: [0, 244, 488, 732],
  }

  it("advances one sponsor and clamps the final position to the rail", () => {
    expect(getNextSponsorScrollPosition({ ...carousel, scrollLeft: 0 })).toBe(
      244
    )
    expect(getNextSponsorScrollPosition({ ...carousel, scrollLeft: 488 })).toBe(
      602
    )
  })

  it("loops forward and backward without cloning sponsors", () => {
    expect(getNextSponsorScrollPosition({ ...carousel, scrollLeft: 602 })).toBe(
      0
    )
    expect(
      getNextSponsorScrollPosition({
        ...carousel,
        scrollLeft: 0,
        direction: -1,
      })
    ).toBe(602)
    expect(
      getNextSponsorScrollPosition({
        ...carousel,
        scrollLeft: 602,
        direction: -1,
      })
    ).toBe(488)
  })

  it("does not move a rail without overflow", () => {
    expect(
      getNextSponsorScrollPosition({
        scrollLeft: 20,
        maxScroll: 0,
        positions: [0],
      })
    ).toBe(0)
  })
})
