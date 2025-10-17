# Conference Program PDF Download Setup

## Overview

The conference program PDF download feature allows users to download a professionally formatted PDF of the entire conference schedule, including all sessions, speakers, and details.

## Features

- **Professional Design**: Clean, branded PDF with color-coded sections
- **Organization Logo Support**: MEMD and NREP logos in header
- **Complete Session Details**: All sessions with times, speakers, venues, and descriptions
- **Multi-day Support**: Automatically organizes sessions by day
- **Timezone Display**: Shows times in East Africa Time (EAT)
- **HTML Content Stripping**: Safely converts HTML content from sessions to plain text

## Setup Instructions

### 1. Add Logo Images

To display the MEMD and NREP logos in the PDF header:

1. Save your logo images to the `public` folder:
   - MEMD logo: `public/memd-logo.png`
   - NREP logo: `public/nrep-logo.png`

2. Update the logo configuration in `lib/logo-utils.js`:
   ```javascript
   export const LOGO_CONFIG = {
     memd: {
       path: "/memd-logo.png",
       width: 20,  // Adjust width in mm
       height: 20, // Adjust height in mm
     },
     nrep: {
       path: "/nrep-logo.png",
       width: 20,  // Adjust width in mm
       height: 20, // Adjust height in mm
     },
   }
   ```

3. Adjust the `width` and `height` values to match your logo dimensions (in millimeters)

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

1. **User clicks "Download Program" button**
2. **Logo loading**: Fetches logo images and converts to base64
3. **PDF creation**: Generates PDF with:
   - Cover page with conference details
   - Separate page for each day
   - Sessions grouped by time slots
   - Professional formatting and branding
4. **Download**: Automatically downloads PDF to user's device

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
