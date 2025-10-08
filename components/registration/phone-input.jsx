"use client"

import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { Label } from "@/components/ui/label"
import { Phone, ChevronDown } from "lucide-react"

export function CustomPhoneInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  label,
  required = false,
  id,
  className = "",
}) {
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-gray-700 font-medium">
          {label} {required && "*"}
        </Label>
      )}
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
        <PhoneInput
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          defaultCountry="UG" // Default to Uganda since it's a Ugandan conference
          international
          countryCallingCodeEditable={false}
          className={`
            phone-input-custom
            ${className}
          `}
        />
        {/* Custom dropdown arrow */}
        <ChevronDown className="absolute left-16 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
      </div>

      <style jsx global>{`
        .phone-input-custom {
          position: relative;
        }
        
        .phone-input-custom .PhoneInputInput {
          height: 48px;
          padding-left: 5rem;
          padding-right: 0.75rem;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          color: #1f2937;
          font-size: 0.875rem;
          width: 100%;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        
        .phone-input-custom .PhoneInputInput:focus {
          outline: none;
          border-color: #0B7186;
          box-shadow: 0 0 0 3px rgba(11, 113, 134, 0.1);
        }
        
        .phone-input-custom .PhoneInputInput::placeholder {
          color: #6b7280;
        }
        
        .phone-input-custom .PhoneInputCountrySelect {
          position: absolute;
          left: 2.5rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.25rem;
          padding: 0.25rem 1.5rem 0.25rem 0.5rem;
          margin: 0;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          min-width: 3rem;
          height: 2rem;
          display: flex;
          align-items: center;
        }
        
        .phone-input-custom .PhoneInputCountrySelect:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
        }
        
        .phone-input-custom .PhoneInputCountrySelect:focus {
          outline: none;
          border-color: #0B7186;
          box-shadow: 0 0 0 2px rgba(11, 113, 134, 0.1);
        }
        
        .phone-input-custom .PhoneInputCountrySelectArrow {
          display: none !important;
        }
        
        .phone-input-custom .PhoneInputCountryIcon {
          width: 1.25rem;
          height: 1rem;
          margin-right: 0.25rem;
          flex-shrink: 0;
        }
        
        .phone-input-custom .PhoneInputCountryIcon--square {
          border-radius: 0.125rem;
        }
        
        /* Style the country dropdown options */
        .phone-input-custom .PhoneInputCountrySelect option {
          padding: 0.5rem;
          background-color: white;
          color: #1f2937;
          border: none;
        }
        
        .phone-input-custom .PhoneInputCountrySelect option:hover {
          background-color: #f3f4f6;
        }
        
        /* Ensure proper layering */
        .phone-input-custom .PhoneInputCountrySelect {
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .phone-input-custom .PhoneInputInput {
            padding-left: 4.5rem;
          }
          
          .phone-input-custom .PhoneInputCountryIcon {
            width: 1rem;
            height: 0.875rem;
          }
          
          .phone-input-custom .PhoneInputCountrySelect {
            min-width: 2.5rem;
            padding: 0.25rem 1.25rem 0.25rem 0.25rem;
          }
        }
        
        /* Fix for dropdown in different browsers */
        .phone-input-custom .PhoneInputCountrySelect::-ms-expand {
          display: none;
        }
        
        /* Ensure the custom arrow is visible */
        .phone-input-custom .PhoneInputCountrySelect + .lucide-chevron-down {
          pointer-events: none;
          position: absolute;
          right: 0.25rem;
          top: 50%;
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  )
}
