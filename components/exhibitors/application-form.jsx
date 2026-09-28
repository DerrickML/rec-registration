"use client"
import { useState } from "react"
import {
  Plus,
  Trash2,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Save
} from "lucide-react"

export const emptyExhibitorApplication = () => ({
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  sector: "",
  category: "",
  proposal: "",
  country: "",
  city: "",
  stateRegion: "",
  website: "",
  requirements: "",
  associationMember: false,
  association: "",
  consentAccepted: false,
  representatives: [
    {
      id: crypto.randomUUID(),
      fullName: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      days: [],
      visaSupport: false
    }
  ]
})
const steps = ["Company", "Exhibition", "Representatives", "Declaration"]
function Field({
  name,
  label,
  value,
  onChange,
  errors,
  options,
  multiline = false,
  type = "text",
  required = false,
  maxLength
}) {
  const props = {
    id: `exh-${name}`,
    name,
    value: value ?? "",
    onChange: (event) => onChange(event.target.value),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `exh-error-${name}` : undefined,
    maxLength
  }
  return (
    <div className={`exh-field ${multiline ? "exh-wide" : ""}`}>
      <label htmlFor={props.id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {options ? (
        <select {...props}>
          <option value="">Select an option</option>
          {[
            ...new Set([
              ...(value && !options.includes(value) ? [value] : []),
              ...options
            ])
          ].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea {...props} rows={5} />
      ) : (
        <input {...props} type={type} />
      )}
      {errors[name] && (
        <small id={`exh-error-${name}`} className="exh-error">
          {errors[name]}
        </small>
      )}
    </div>
  )
}
export default function ExhibitorApplicationForm({
  initialData,
  settings,
  days = [],
  onSave,
  submitLabel = "Submit application",
  allowDraft = false,
  representativesOnly = false,
  onCancel,
  imported = false
}) {
  const [data, setData] = useState(() => {
    const value = initialData ? { ...structuredClone(initialData), ...(!imported && !representativesOnly ? { consentAccepted: false } : {}) } : emptyExhibitorApplication()
    if (!initialData || imported) value.representatives = value.representatives.map(rep => ({ ...rep, days: rep.days?.length ? rep.days : days.map(day => day.label) }))
    return value
  })
  const [step, setStep] = useState(representativesOnly ? 2 : 0),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState({}),
    [error, setError] = useState("")
  const update = (key, value) => {
    setData((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }
  const field = (name, label, extra = {}) => (
    <Field
      key={name}
      name={name}
      label={label}
      value={data[name]}
      onChange={(value) => update(name, value)}
      errors={errors}
      {...extra}
    />
  )
  const save = async (submit) => {
    setBusy(true)
    setError("")
    setErrors({})
    try {
      await onSave(data, submit)
    } catch (e) {
      setError(e.message)
      setErrors(e.fields || {})
      const first = Object.keys(e.fields || {})[0]
      if (!representativesOnly)
        setStep(
          first?.startsWith("representatives")
            ? 2
            : first === "consentAccepted"
              ? 3
              : ["proposal", "category", "requirements"].includes(first)
                ? 1
                : 0
        )
    } finally {
      setBusy(false)
    }
  }
  const updateRep = (index, key, value) =>
    update(
      "representatives",
      data.representatives.map((r, i) =>
        i === index ? { ...r, [key]: value } : r
      )
    )
  return (
    <form
      className="exh-form"
      noValidate
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault()
        if (!representativesOnly && step < 3) setStep(step + 1)
        else save(true)
      }}
    >
      {!representativesOnly && (
        <nav className="exh-steps" aria-label="Application steps">
          {steps.map((title, index) => (
            <button
              type="button"
              key={title}
              disabled={busy}
              aria-current={step === index ? "step" : undefined}
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span>
              {title}
            </button>
          ))}
        </nav>
      )}
      {error && (
        <div className="exh-alert exh-error" role="alert">
          {error}
        </div>
      )}
      <fieldset disabled={busy}>
        {step === 0 && (
          <>
            <h2>Company details</h2>
            <div className="exh-fields">
              {field("companyName", "Company / organization name", {
                required: true,
                maxLength: 250
              })}
              {field("companyEmail", "Company email", {
                type: "email",
                required: true
              })}
              {field("companyPhone", "Company phone", {
                type: "tel",
                required: true
              })}
              {field("sector", "Organization sector", {
                options: settings.sectors,
                required: true
              })}
              {field("country", "Country")}
              {field("stateRegion", "State / region")}
              {field("city", "City")}
              {field("website", "Website", { type: "url" })}
            </div>
            <label className="exh-check">
              <input
                type="checkbox"
                checked={!!data.associationMember}
                onChange={(e) => update("associationMember", e.target.checked)}
              />{" "}
              Member of an umbrella organization or association
            </label>
            {data.associationMember &&
              field("association", "Association name", { required: true })}
          </>
        )}
        {step === 1 && (
          <>
            <h2>Exhibition proposal</h2>
            <div className="exh-fields">
              {field("category", "Exhibit category", {
                options: settings.categories,
                required: true
              })}
              {field("proposal", "What do you intend to exhibit?", {
                multiline: true,
                required: true,
                maxLength: 10000
              })}
              {field(
                "requirements",
                "Space, electricity, equipment and accessibility requirements",
                { multiline: true, maxLength: 4000 }
              )}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Company representatives</h2>
            {representativesOnly && (
              <div className="exh-fields">
                {field("country", "Country", { required: true })}
                {field("stateRegion", "State / region", { required: true })}
                {field("city", "City", { required: true })}
              </div>
            )}
            {errors.representatives && (
              <p className="exh-error">{errors.representatives}</p>
            )}
            {data.representatives.map((rep, index) => (
              <section key={rep.id} className="exh-representative">
                <div className="exh-toolbar">
                  <h3>Representative {index + 1}</h3>
                  <button
                    type="button"
                    className="exh-icon"
                    aria-label={`Remove representative ${index + 1}`}
                    title="Remove representative"
                    onClick={() =>
                      update(
                        "representatives",
                        data.representatives.filter((_, i) => index !== i)
                      )
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="exh-fields">
                  {[
                    ["fullName", "Full name"],
                    ["email", "Email", "email"],
                    ["phone", "Phone", "tel"],
                    ["firstName", "Given / first name"],
                    ["lastName", "Family / last name"]
                  ].map(([key, label, type]) => (
                    <Field
                      key={key}
                      name={`representatives.${index}.${key}`}
                      label={label}
                      type={type}
                      value={rep[key]}
                      required={["fullName", "email", "phone"].includes(key)}
                      errors={errors}
                      onChange={(value) => updateRep(index, key, value)}
                    />
                  ))}
                </div>
                <fieldset className="exh-days">
                  <legend>Attendance days</legend>
                  {days.map((day) => (
                    <label className="exh-check" key={day.label}>
                      <input
                        type="checkbox"
                        checked={(rep.days || []).includes(day.label)}
                        onChange={(e) =>
                          updateRep(
                            index,
                            "days",
                            e.target.checked
                              ? [...(rep.days || []), day.label]
                              : rep.days.filter((d) => d !== day.label)
                          )
                        }
                      />
                      {day.label}
                    </label>
                  ))}
                </fieldset>
                <label className="exh-check">
                  <input
                    type="checkbox"
                    checked={!!rep.visaSupport}
                    onChange={(e) =>
                      updateRep(index, "visaSupport", e.target.checked)
                    }
                  />{" "}
                  Visa-support assistance requested
                </label>
                {rep.visaSupport && <Field name={`representatives.${index}.passportNumber`} label="Passport number" value={rep.passportNumber || ""} maxLength={15} required={!imported} errors={errors} onChange={value => updateRep(index, "passportNumber", value)} />}
              </section>
            ))}
            <button
              type="button"
              className="exh-button"
              disabled={
                data.representatives.length >= settings.maxRepresentatives
              }
              onClick={() =>
                update("representatives", [
                  ...data.representatives,
                  { ...emptyExhibitorApplication().representatives[0], days: days.map(day => day.label) }
                ])
              }
            >
              <Plus size={18} /> Add representative
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Declaration</h2>
            <div className="exh-consent">{settings.consentText}</div>
            <label className="exh-check">
              <input
                type="checkbox"
                checked={!!data.consentAccepted}
                onChange={(e) => update("consentAccepted", e.target.checked)}
              />
              {imported
                ? "The applicant's consent has been recorded."
                : "I agree to this declaration."}
            </label>
            {errors.consentAccepted && (
              <p className="exh-error">{errors.consentAccepted}</p>
            )}
            <p className="exh-muted">
              An application is not approval. Exhibition space and individual
              conference badges are confirmed separately.
            </p>
          </>
        )}
      </fieldset>
      <div className="exh-form-actions">
        {onCancel && (
          <button
            type="button"
            className="exh-button"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        {!representativesOnly && step > 0 && (
          <button
            type="button"
            className="exh-button"
            disabled={busy}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}
        {allowDraft && (
          <button
            type="button"
            className="exh-button"
            disabled={busy}
            onClick={() => save(false)}
          >
            <Save size={18} />
            Save draft
          </button>
        )}
        <button
          type="submit"
          className="exh-button exh-primary"
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle size={18} className="exh-spin" />
          ) : !representativesOnly && step < 3 ? (
            <ChevronRight size={18} />
          ) : (
            <Save size={18} />
          )}
          {busy
            ? "Saving..."
            : !representativesOnly && step < 3
              ? "Continue"
              : submitLabel}
        </button>
      </div>
    </form>
  )
}
