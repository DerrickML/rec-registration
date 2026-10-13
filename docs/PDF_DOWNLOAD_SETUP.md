# Conference Program PDF Download Setup

## Overview

The conference program PDF download feature allows users to download a professionally formatted PDF of the entire conference schedule, including all sessions, speakers, and details.

## Features

- **Professional Design**: Clean, branded PDF with color-coded sections
- **Organization Logo Support**: MEMD and NREP logos in header
- **Complete Session Details**: All sessions with times, speakers, venues, and descriptions
- **Multi-day Support**: Automatically organizes sessions by day
- **Custom Exports**: Select days, halls and time blocks, with optional non-session activities
- **Timezone Display**: Shows times in East Africa Time (EAT)
- **HTML Content Stripping**: Safely converts HTML content from sessions to plain text

## Setup Instructions

### 1. Configure Logo Images

To display the MEMD and NREP logos in the PDF header:

1. Set the NREP logo URL in the public REC application's `.env.local` or deployment environment:
   ```env
   NEXT_PUBLIC_NREP_LOGO_URL=https://appwrite.nrep.ug/v1/storage/buckets/67e0415e002bfc51380a/files/nrep_logo_v2/view?project=66bcc8450005201fa1af
   ```

2. Keep the MEMD logo at `public/MEMD.png`. When the NREP environment variable is missing, blank, or its image cannot be loaded, the PDF uses `public/nrep-logo.png`.

3. Restart the development server after changing the environment value. For production, rebuild and redeploy because `NEXT_PUBLIC_` values are included in the browser bundle at build time.

The configured image must be publicly accessible over HTTPS. The PDF fetches it through the same-origin `/api/program/logo` endpoint, so Appwrite browser CORS settings do not prevent it appearing. The endpoint accepts PNG, JPEG and WebP images up to 2 MB, rejects redirects, and does not accept a source URL from the browser. Both logos are fitted proportionally within the PDF header.

**Note**: If logos are not found, the PDF will display "MEMD | NREP" as text in the header.

### 2. Supported Image Formats

- PNG (recommended for transparency)
- JPG/JPEG
- SVG (may require additional configuration)

### 3. Logo Recommendations

- **Resolution**: Use high-resolution images (300 DPI minimum)
- **Format**: PNG with transparent background works best
- **Size**: Square or landscape orientation works better in the header
- **Colors**: Ensure logos are visible on the teal (#0B7186) header background

## File Structure

```
lib/
├── pdf-generator.js      # Main PDF generation logic
├── logo-utils.js         # Logo loading and configuration
└── program-utils.js      # Utility functions for program data

components/program/
└── download-program-button.jsx  # Download button component

app/program/
├── page.jsx              # Main program page
└── embed/page.jsx        # Embeddable program page
```

## How It Works

1. **User clicks "Download Program" button** and chooses Complete program (default) or Custom selection. The same dialog is available on `/program` and `/program/download`.
2. **Logo loading**: Fetches logo images and converts to base64
3. **PDF creation**: Generates PDF with:
   - Cover page with conference details
   - Separate page for each day
   - Sessions grouped by time slots
   - Professional formatting and branding
4. **Download**: Automatically downloads PDF to user's device

### Export Selection Rules

- Days, halls and time blocks are combined. Time-block choices update as days, halls and activity inclusion change.
- Conference-wide activities remain eligible for selected halls; venue-specific activities are included only when their venue scope overlaps the selected halls.
- Sessions spanning several selected blocks show full details at their first exported occurrence and continuation markers thereafter. Actual session times are not changed.
- Legacy sessions without matching blocks remain available when all eligible blocks are selected, but are excluded from an explicitly restricted time-block export.
- Empty exports are blocked. Custom PDFs show the selected scope, use the original day numbers and dates, and include only exported days in counts, indexes and bookmarks.
- Custom filenames have a `_Selected_Days_` suffix. Neither viewing filters nor export selections modify published conference data.

## Customization

### Colors

The PDF uses the application's brand colors:
- Primary: `#0B7186` (Teal)
- Accent: `#FFB803` (Gold)

To change colors, edit the `setFillColor()` and `setTextColor()` calls in `lib/pdf-generator.js`.

### Layout

Adjust layout constants in `lib/pdf-generator.js`:
- Header height: Line 79
- Page margins: Lines using values like `15, 20, 25`
- Card spacing: Lines with `yPosition` calculations

### Content

To modify what appears in the PDF:
- **Cover page**: Edit `addCoverPage()` function
- **Session cards**: Edit `addDaySessions()` function
- **Header/Footer**: Edit `addHeader()` function

## Troubleshooting

### Logos not appearing
1. Check that image files exist in `public/` folder
2. Verify file paths in `lib/logo-utils.js`
3. Check browser console for errors
4. Ensure image formats are supported (PNG/JPG recommended)

### PDF generation fails
1. Check console for JavaScript errors
2. Verify all session data is properly formatted
3. Ensure HTML content in sessions doesn't break parsing

### Content cutoff or overlapping
1. Adjust `cardHeight` in session card generation
2. Modify page break logic (lines checking `yPosition > height`)
3. Reduce font sizes if needed

## Dependencies

- `jspdf`: Core PDF generation library
- `jspdf-autotable`: Table generation (imported but can be used for future enhancements)
- `html2canvas`: Not currently used but available for screenshots

## Future Enhancements

Potential improvements:
- Add QR codes linking to online program
- Include sponsor logos
- Add table of contents
- Export in different formats (Excel, CSV)
- Print optimization mode
- Multi-language support
