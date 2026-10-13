"use client"

import { Fragment, useId, useMemo, useState } from "react"
import { AlertCircle, CalendarDays, CheckCheck, Download, Loader2, RotateCcw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateProgramPDF } from "@/lib/pdf-generator"
import { getDayDate } from "@/lib/program-utils"
import { formatBlockTimeRange, getBlockTypeLabel } from "@/lib/schedule-utils"
import { createProgramExportSelection, getEligibleExportBlocks, getExportHallLabel, getProgramExportOptions, selectProgramForExport, updateProgramExportSelection } from "@/lib/program-export"
import { useToast } from "@/hooks/use-toast"

function SelectionSection({ title, choices, selected, onChange, disabled, searchable = false, listClassName = "max-h-48" }) {
  const id = useId()
  const [search, setSearch] = useState("")
  const shown = choices.filter(choice => choice.label.toLowerCase().includes(search.trim().toLowerCase()))
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-3 w-full text-sm font-semibold text-[#182D39]">{title} <span className="ml-1 font-normal text-gray-500">({selected.length}/{choices.length})</span></legend>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={disabled || !choices.length || selected.length === choices.length} onClick={() => onChange(choices.map(choice => choice.value))} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B5E78] disabled:opacity-40">
          <CheckCheck size={14} /> Select all
        </button>
        <button type="button" disabled={disabled || !selected.length} onClick={() => onChange([])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40">
          <X size={14} /> Clear
        </button>
      </div>
      {searchable && (
        <label className="relative mb-3 block">
          <span className="sr-only">Search halls</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-gray-500" />
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={disabled} placeholder="Search halls" className="h-10 w-full min-w-0 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-[#182D39] outline-none focus:border-[#176F91] focus:ring-2 focus:ring-[#176F91]/20" />
        </label>
      )}
      <div className={`${listClassName} overflow-y-auto overscroll-contain pr-1`} tabIndex={0} aria-label={`${title} choices`}>
        {shown.map((choice, index) => {
          const inputId = `${id}-${index}`
          return (
            <Fragment key={choice.value}>
              {choice.group && choice.group !== shown[index - 1]?.group && <h3 className="mb-1 mt-3 text-xs font-semibold text-[#0B5E78] first:mt-0">{choice.group}</h3>}
              <label htmlFor={inputId} className={`flex min-h-11 cursor-pointer items-start gap-3 border-b border-gray-100 px-2 py-2.5 ${selected.includes(choice.value) ? "bg-[#EDF6FA]" : "hover:bg-gray-50"} ${disabled ? "cursor-wait opacity-60" : ""}`}>
                <Checkbox id={inputId} className="mt-0.5" checked={selected.includes(choice.value)} disabled={disabled} onCheckedChange={checked => onChange(checked ? [...new Set([...selected, choice.value])] : selected.filter(value => value !== choice.value))} />
                <span className="min-w-0 break-words text-sm leading-5 text-[#182D39]">
                  <span className="block font-medium">{choice.label}</span>
                  {choice.detail && <span className="block text-xs text-gray-600">{choice.detail}</span>}
                </span>
              </label>
            </Fragment>
          )
        })}
        {!shown.length && <p className="py-3 text-sm text-gray-500">{search ? "No halls match this search." : `No ${title.toLowerCase()} available for this selection.`}</p>}
      </div>
    </fieldset>
  )
}

const counted = (count, noun, plural = `${noun}s`) => `${count} ${count === 1 ? noun : plural}`

export default function DownloadProgramButton({ conference, program, sessions = [], timeBlocks = [] }) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const options = useMemo(() => getProgramExportOptions({ program, sessions, timeBlocks }), [program, sessions, timeBlocks])
  const [selection, setSelection] = useState(() => createProgramExportSelection(options))
  const preview = useMemo(() => selectProgramForExport({ program, sessions, timeBlocks }, selection), [program, sessions, timeBlocks, selection])
  const eligibleBlocks = getEligibleExportBlocks(options, selection)
  const { toast } = useToast()
  const update = updates => setSelection(previous => updateProgramExportSelection(options, previous, updates))
  const summary = [
    counted(preview.summary.dayCount, "day"), counted(preview.summary.hallCount, "hall"),
    counted(preview.summary.sessionCount, "session"), counted(preview.summary.activityCount, "activity", "activities"),
  ].join(" | ")

  const handleDownload = async event => {
    event.preventDefault()
    if (isGenerating || preview.errors.length) return
    try {
      setIsGenerating(true)
      const result = await generateProgramPDF(conference, program, sessions, timeBlocks, selection)
      toast({ title: "Program downloaded", description: result.filename, duration: 3000 })
      setOpen(false)
    } catch (error) {
      console.error("Error downloading program:", error)
      toast({ title: "Download failed", description: error.message || "Failed to generate PDF. Please try again.", variant: "destructive", duration: 5000 })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button onClick={() => { setSelection(createProgramExportSelection(options)); setOpen(true) }} disabled={isGenerating} className="h-11 rounded-lg bg-[#176F91] px-5 font-semibold text-white shadow-sm hover:bg-[#0B5E78]">
        <Download className="mr-2 h-4 w-4" /> Download Program
      </Button>
      <Dialog open={open} onOpenChange={value => { if (!isGenerating) setOpen(value) }}>
        <DialogContent closeDisabled={isGenerating} aria-busy={isGenerating} className="flex max-h-[90dvh] max-w-3xl flex-col gap-0 overflow-hidden bg-white p-0 text-[#182D39]" onEscapeKeyDown={event => { if (isGenerating) event.preventDefault() }} onInteractOutside={event => { if (isGenerating) event.preventDefault() }}>
          <form onSubmit={handleDownload} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogHeader className="shrink-0 border-b border-gray-200 px-5 py-5 pr-14 text-left">
              <DialogTitle className="text-xl">Download program</DialogTitle>
              <DialogDescription className="break-words text-gray-600">{program?.title || conference?.title || "Conference program"}</DialogDescription>
            </DialogHeader>
            <Tabs value={selection.mode} onValueChange={mode => update({ mode })} className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 px-5 pt-4">
                <TabsList className="grid h-11 w-full grid-cols-2 bg-gray-100">
                  <TabsTrigger value="complete" disabled={isGenerating} className="px-1 text-xs data-[state=active]:bg-[#176F91] data-[state=active]:text-white sm:px-3 sm:text-sm">Complete program</TabsTrigger>
                  <TabsTrigger value="custom" disabled={isGenerating} className="px-1 text-xs data-[state=active]:bg-[#176F91] data-[state=active]:text-white sm:px-3 sm:text-sm">Custom selection</TabsTrigger>
                </TabsList>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
                <TabsContent value="complete" className="mt-0">
                  <div className="flex items-start gap-3 py-3">
                    <CalendarDays className="mt-0.5 shrink-0 text-[#176F91]" size={22} />
                    <div><p className="font-semibold">All published days, halls and time blocks</p><p className="mt-1 text-sm text-gray-600">Sessions, speakers and scheduled activities.</p></div>
                  </div>
                </TabsContent>
                <TabsContent value="custom" className="mt-0 space-y-5">
                  <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                    <SelectionSection title="Days" choices={options.days.map(day => ({ value: day, label: `Day ${day}`, detail: getDayDate(conference?.startDate, day) }))} selected={selection.days} onChange={days => update({ days })} disabled={isGenerating} listClassName="max-h-64" />
                    <SelectionSection title="Halls" choices={options.halls.map(hall => ({ value: hall, label: getExportHallLabel(hall) }))} selected={selection.halls} onChange={halls => update({ halls })} disabled={isGenerating} searchable />
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm font-medium">
                      <Checkbox checked={selection.includeActivities} disabled={isGenerating} onCheckedChange={checked => update({ includeActivities: Boolean(checked) })} />
                      Include breaks, lunch and other relevant activities
                    </label>
                    <SelectionSection title="Time blocks" choices={eligibleBlocks.map(block => ({ value: block.exportId, label: block.label || getBlockTypeLabel(block.type), detail: `${formatBlockTimeRange(block)} EAT / ${getBlockTypeLabel(block.type)}`, group: `Day ${block.day} / ${getDayDate(conference?.startDate, Number(block.day))}` }))} selected={selection.blockIds} onChange={blockIds => update({ blockIds })} disabled={isGenerating} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            <div className="shrink-0 border-t border-gray-200 bg-[#EDF6FA] px-5 py-3" aria-live="polite" aria-atomic="true">
              <p className="text-xs font-semibold uppercase text-[#0B5E78]">{selection.mode === "complete" ? "Complete program" : "Selected program"}</p>
              <p className="mt-1 break-words text-sm font-medium">{summary}</p>
              {preview.errors.length > 0 && <div role="alert" className="mt-2 flex items-start gap-2 text-sm text-red-800"><AlertCircle className="mt-0.5 shrink-0" size={16} /><div>{preview.errors.map(error => <p key={error}>{error}</p>)}</div></div>}
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-gray-200 px-5 py-4 sm:items-center sm:space-x-0">
              {selection.mode === "custom" && <Button type="button" variant="ghost" disabled={isGenerating} className="h-11 sm:mr-auto" onClick={() => setSelection({ ...createProgramExportSelection(options), mode: "custom" })}><RotateCcw size={16} className="mr-2" /> Reset filters</Button>}
              <Button type="button" variant="outline" disabled={isGenerating} className="h-11" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isGenerating || preview.errors.length > 0} className="h-11 bg-[#176F91] text-white hover:bg-[#0B5E78]">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isGenerating ? "Generating PDF..." : "Download PDF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
