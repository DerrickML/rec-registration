export function sortByDisplayOrder(items = []) {
  return [...items].sort((a, b) => {
    const orderA = Number.isFinite(Number(a?.displayOrder)) ? Number(a.displayOrder) : 9999
    const orderB = Number.isFinite(Number(b?.displayOrder)) ? Number(b.displayOrder) : 9999
    return orderA - orderB || String(a?.name || "").localeCompare(String(b?.name || ""))
  })
}

export function groupSponsorsByCategory(categories = [], sponsors = []) {
  const visibleCategories = sortByDisplayOrder(
    categories.filter((category) => category?.isActive !== false)
  )
  const visibleSponsors = sortByDisplayOrder(
    sponsors.filter((sponsor) => sponsor?.isActive !== false)
  )

  const categoryMap = new Map(
    visibleCategories.map((category) => [
      category.$id,
      {
        category,
        sponsors: [],
      },
    ])
  )

  visibleSponsors.forEach((sponsor) => {
    const group = categoryMap.get(sponsor.categoryId)
    if (group) {
      group.sponsors.push(sponsor)
      return
    }

    if (!categoryMap.has("partners")) {
      categoryMap.set("partners", {
        category: {
          $id: "partners",
          name: "Partners",
          slug: "partners",
          accentColor: "#0B7186",
          displayOrder: 9999,
        },
        sponsors: [],
      })
    }

    categoryMap.get("partners").sponsors.push(sponsor)
  })

  return Array.from(categoryMap.values()).filter((group) => group.sponsors.length > 0)
}

export function flattenSponsorsForShowcase(categories = [], sponsors = []) {
  const grouped = groupSponsorsByCategory(categories, sponsors)
  const categoryById = new Map(
    grouped.map((group) => [group.category.$id, group.category])
  )

  return sortByDisplayOrder(
    sponsors.filter((sponsor) => sponsor?.isActive !== false)
  ).map((sponsor) => ({
    ...sponsor,
    category: categoryById.get(sponsor.categoryId) || null,
  }))
}
