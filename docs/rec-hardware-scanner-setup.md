# REC External Scanner Setup

This guide covers Tera HW0009 QR scanners used with the REC operator website at **https://rec.nrep.ug/scanner**. Other scanners that transmit QR text as keyboard input may also work, but must be tested separately.

## What You Need

After sign-in, `/scanner` opens your assigned-event dashboard. Use **Open now**, **Upcoming**, **Ended**, search and the day/date/venue/type filters to find the correct scan point. Click **Scan** to enter `/scanner/events/[eventId]`, then choose the appropriate input mode. **My activity** at `/scanner/activity` shows only your own saved records, not every attempted or duplicate scan. Upcoming and ended event details can be opened but do not permit scanning. Times use Africa/Kampala (EAT, UTC+3).

Do not leave a scan that is awaiting confirmation. Retry the original request or resolve it with an administrator; do not switch events or scan the badge again as a new request. Page navigation pauses capture, and an unresolved request remains in memory while navigating within the scanner workspace. Reloading/closing the browser loses that in-memory retry state.

- A HW0009 scanner, charged battery and its USB cable or charging cradle.
- A computer, phone or tablet with an up-to-date browser and internet access.
- An active scanner-operator assignment for the conference and permitted scan events, configured by an administrator in the HR portal.
- Access to the assigned operator email for the sign-in code.

The scanner reads the badge; the connected device and REC server decide whether the scan is accepted. The scanner is not a standalone REC terminal. Its screen, beep and scan counter do not prove attendance or admission.

## Choose A Connection

| Station | Recommended Connection |
| --- | --- |
| Entrance, lunch or fixed hall desk | Computer with USB cable or the 2.4 GHz charging cradle |
| Mobile operator | Phone or tablet paired using Bluetooth HID |
| Dedicated USB serial desk | Computer with USB cable, Web Serial browser and explicit port settings |

For the first deployment, test one fixed station and one Bluetooth station before configuring all scanners.

## Configure The Scanner

Use the programming barcodes in the **official manual matching your scanner's firmware/revision**. The manual linked from Tera's product page is version 01.1.02. Its printed page numbers differ from PDF viewer page numbers.

| Setting | Required Value | Why |
| --- | --- | --- |
| Connection | Keyboard/HID | Sends the QR text to the browser's scanner input |
| Operation mode | Real Time Mode | Delivers each scan immediately |
| Scan mode | Manual Trigger Mode | Reduces accidental repeated reads |
| Termination suffix | Carriage Return / Enter | Submits the completed QR text |
| Case conversion | Conversion Off | Preserves case-sensitive badge credentials |
| Timestamp | Clear Timestamp | Prevents dates being added to the badge value |
| Custom prefix/suffix | None, except the Enter terminator | Prevents extra characters corrupting the value |
| Character removal | Disabled / no trimming | Sends the complete QR value |
| Keyboard country layout | Same as the host device | Prevents punctuation changing in QR payloads and URLs |

For **External Scanner** keyboard input, use HID rather than USB-COM, SPP or BLE serial modes. **USB Serial** is a separate supported mode described below. Do not configure uppercase/lowercase conversion even if printed badge numbers look uppercase.

If the scanner has previously been customised, record any required existing settings before changing them. A factory reset is optional, not a required first step; it may erase pairing and unrelated settings.

**Manual reference:**
- Keyboard layout and Real Time Mode: printed page 3 (PDF page 9).
- Cradle pairing: printed page 4 (PDF page 10).
- Bluetooth HID and Conversion Off: printed page 5 (PDF page 11).
- Carriage Return and Clear Timestamp: printed page 6 (PDF page 12).
- Manual Trigger Mode: printed page 8 (PDF page 14).

## Connect To A Computer

### USB Cable

1. Connect the scanner to the computer with its USB cable.
2. Ensure it is in keyboard mode, not USB-COM.
3. Open a temporary plain-text editor, click into the document and scan a non-sensitive test QR code.
4. Confirm the exact text appears once, with unchanged letter case and punctuation, followed by a new line.

### Wireless Charging Cradle

1. Connect the cradle to the computer's USB port.
2. Test with a non-sensitive QR code in a temporary text document.
3. If it does not connect, follow the manual: unplug the cradle, scan **2.4GHz Mode**, scan **Pairing**, then reconnect the cradle.
4. Confirm one complete text value and one Enter per trigger pull.

The manual describes the computer recognising the scanner as a keyboard. No custom REC driver or browser Bluetooth permission is needed for keyboard input.

## Connect To Android, iPhone Or iPad

1. Scan the manual's **Bluetooth HID Mode** barcode.
2. Scan its **Pairing** barcode.
3. Open Bluetooth settings on the phone/tablet and select the scanner name that appears.
4. Verify the scanner is connected as a keyboard/input device.
5. Test a non-sensitive QR in a notes application. Check case, punctuation and Enter behaviour.
6. Open the REC scanner website in the browser and follow the workflow below.

The Bluetooth keyboard may hide the phone's on-screen keyboard. Use the device's keyboard controls or the keyboard-toggle feature documented for your scanner revision when entering an email, OTP or manual badge number. Do not switch to a serial connection just to restore the software keyboard.

## Operator Workflow

1. Open **https://rec.nrep.ug/scanner**.
2. Sign in using the assigned email and emailed access code. Hardware scanning does not bypass sign-in.
3. Confirm the conference and select the correct **Scan Event**.
4. Select **External Scanner**. The page focuses the scanner input when the event is open and the connection is online.
5. Wait for **Ready for scanner input**. If paused, select **Ready to Scan**.
6. Pull the scanner trigger over a printed badge QR or the QR displayed on the attendee's phone.
7. The Enter suffix submits the value. Wait for the result popup.
8. Read the server result and attendee details. A hardware beep alone is not approval.
9. Select **Scan Another Badge** to focus the scanner field again, or **Close** to pause.

The input pauses when its field loses focus, the browser window loses focus, the page is hidden, the device goes offline, the event closes, or a result is open. Partial input is cleared when pausing. After interruptions, check the selected event and explicitly select **Ready to Scan**. The site does not automatically claim that Bluetooth hardware is connected: HID does not provide reliable browser connection telemetry.

Camera and Manual Entry remain separate modes. Camera mode retains the phone camera fallback. Manual Entry accepts the printed badge number, a supported badge link or QR text. Neither alternative bypasses server checks.

## USB-COM / Virtual Serial Port

USB Serial reads the scanner's data directly rather than typing into a text field. This is an optional alternative for fixed desks, not a replacement for HID on all devices. Changing the scanner to USB-COM does not work with the **External Scanner** keyboard mode.

### Browser And Connection Requirements

- Use the scanner website as a top-level page over HTTPS (or localhost during development).
- Start with a current desktop Chrome or Edge browser. Current compatibility data also lists desktop Firefox 151+ and Chrome for Android 148+; Android USB-host support, adapters and the scanner's USB driver still require physical testing.
- Safari and iOS WebViews do not currently expose Web Serial. Use Bluetooth HID, camera or manual entry on those devices.
- The operating system must recognise the scanner as a virtual serial port. On Windows, check **Device Manager > Ports (COM & LPT)**. Record which port appears when connecting the scanner, so the operator can choose the right device.
- Close terminal programs, configuration utilities and other tabs using the port before connecting REC.

The browser's port chooser is separate from REC sign-in. Grant access only to the intended scanner, not unrelated serial devices. No local bridge application, browser extension, automatic port probing or installation is required by REC. If the OS does not expose the port, check the scanner revision's official driver/support instructions first.

### Configure And Connect

1. Scan the manual's **USB-COM Mode** programming barcode (version 01.1.02: printed page 5 / PDF page 11), and connect the scanner using its USB cable.
2. Keep **Real Time Mode**, **Conversion Off**, no timestamp/prefix/character removal and **Manual Trigger Mode**. Configure a **CR, LF or CRLF** termination suffix. Do not upload stored scans.
3. Confirm the scanner's baud rate, data bits, parity, stop bits and flow control from its current configuration, revision-specific documentation or manufacturer support. REC does **not** assume a HW0009 baud rate.
4. Sign in to REC, confirm the conference/event, and select **USB Serial**.
5. Choose the confirmed **Baud rate**. Under **Advanced port settings**, match the other settings. The UI starts with 8 data bits, no parity, 1 stop bit and no flow control; these are software defaults, not a claim about your scanner's configuration.
6. Select **Connect Scanner**, choose the scanner's port in the browser prompt, and grant that device access. Cancelling the chooser leaves REC signed in and disconnected.
7. REC connects in a paused state. Select **Ready to Scan**, wait until **Ready for serial scans** is displayed, then pull the trigger.
8. Read the server result. **Scan Another Badge** rearms the serial connection without opening the camera. **Close** leaves the connection paused. **Pause Scanner** pauses live input, while **Disconnect Scanner** releases the port.

Selecting a baud rate is mandatory. Settings are locked while the port is connecting or connected. Disconnect before changing them. Settings and ports are not auto-restored after a page reload; reconnection requires an explicit action.

### Buffering And Safety

- QR values may arrive in several serial chunks. REC preserves their case and waits for a CR/LF ending before submitting a complete frame. It never submits a partial value merely because time passed.
- Only one frame is accepted per Ready action. Further frames in the same packet, during submission or while a result is open are discarded, not queued for later admission.
- The connected reader drains input while paused. Rearming waits for a short quiet period (200 ms) to discard queued input first. Continuous incoming data cancels rearming after 2.5 seconds and displays an error.
- A frame started before pausing remains discarded until its terminator arrives. If input was interrupted mid-badge, the next trigger pull may be discarded to restore that boundary. Rearm and rescan the full badge when this happens.
- A three-second gap inside an unfinished frame pauses input and reports an incomplete scan. Check the terminator rather than repeatedly scanning into an unfinished frame.
- Frames over 4096 characters, oversized binary chunks, malformed UTF-8 and unsupported control characters are rejected locally without logging the QR value.
- Text-field focus is not required for serial input. However, changing events, leaving the browser window, hiding the page, going offline, closing an event or opening a result pauses capture. Returning does not silently rearm it.
- A disconnect or read failure stops scanning. REC does not automatically select or reopen a port. Reconnect explicitly, check the event and select Ready again.
- Switching to another input mode, signing out, session expiry or leaving the page releases the serial connection. The app only reads scanner data; it does not send configuration commands or control the scanner's display/beeper.

An uncertain HTTP result must still be retried with **Retry this scan**, even if the USB device has since disconnected. The original request is retained in page memory and is independent of the port. Disconnecting the device does not cancel a request already sent to the server. Reconnect the scanner only when ready to scan another badge.

### Serial Troubleshooting

| Symptom | Check |
| --- | --- |
| USB Serial is unavailable | Browser support, HTTPS/localhost and site permissions policy; use HID/camera fallback if necessary |
| No scanner appears in the chooser | Scanner in USB-COM mode, working data cable, OS virtual-port detection and official driver requirements |
| Port cannot open | Other programs/tabs using it, browser device permission and matching port settings |
| Connected, but no submission | Ready state, CR/LF ending and exact baud/format/flow-control settings |
| Incomplete or undecodable input | Correct serial settings and UTF-8/plain QR output; disable timestamp, prefixes and character removal |
| Scanner is still sending data | Stop scanning, disable Storage Mode/uploads, wait, then explicitly rearm |
| USB unplugged during a scan | Resolve any pending HTTP confirmation first; reconnect the port, check the event and rearm |
| USB Serial blocked after deployment | Check reverse-proxy/CDN headers for a restrictive `Permissions-Policy` |

The application serves `Permissions-Policy: serial=(self)` on `/scanner`. This does not override a more restrictive policy imposed by a proxy or embedding parent. Keep device access restricted to the scanner page's own origin; do not use `serial=*` to work around a configuration problem.

## Results And Network Failures

- **Scan Accepted:** the REC server confirmed the scan under the event's rules.
- **Already Scanned:** read the prior scan information. Do not assume a second admission is allowed.
- **Scan Rejected:** read the reason, such as invalid/revoked badge, wrong conference, attendance-day restrictions or a closed event.
- **Scan not confirmed:** a timeout, network problem or server failure left the result uncertain. Admission has not been confirmed.

For an unconfirmed scan, restore connectivity and select **Retry this scan**. REC reuses the original credential, event, device and idempotency key. Do not scan the next person yet. Closing the popup leaves a **Review pending scan** button and keeps new scans and event/mode changes paused.

Pending retries are held only in the current page's memory, not in browser storage. Do not refresh, close the tab, navigate away or sign out while confirmation is pending. If the page is lost, ask an administrator to check attendance before scanning the badge again. Signing out with a pending request displays a warning.

Do not use the scanner's Storage Mode or upload previously stored scans into the live input. The server validates the event using its current time; a delayed upload cannot establish admission eligibility at an earlier time.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Scanner beeps, but nothing appears | Host pairing/receiver, HID mode, Real Time Mode, browser focus and **Ready for scanner input** |
| Text appears but is not submitted | Configure one Carriage Return/Enter suffix, not Tab or None |
| Badge rejected despite a readable QR | Confirm Conversion Off, no timestamp/prefix/removal, matching keyboard layouts; then check badge status/conference with an administrator |
| QR text has wrong punctuation | Match the scanner and host keyboard country layouts; compare exact output using a non-sensitive test QR |
| Input is paused after a popup | Select **Scan Another Badge**, or **Ready to Scan** after closing it |
| Camera opens instead of hardware input | Select **External Scanner** before scanning |
| No events, or event closed | Administrator must check operator assignment, event status, event dates and Africa/Kampala times |
| iPhone/iPad keyboard is hidden | Use host keyboard controls or the scanner revision's documented keyboard-toggle feature |
| Unconfirmed scan | Restore the network and retry the same pending scan; do not start another one |
| Scanner disconnects after idle time | Check battery and sleep-time settings, reconnect, then rearm the page |

Do not use real badge QR credentials in screenshots, support tickets, public text editors, analytics or logs. Use a non-sensitive test QR for connection diagnostics and clear the temporary document afterwards.

## Deployment And Acceptance Checklist

Deploy the updated public REC application. This feature requires **no additional environment variables, Appwrite attributes, permissions or badge regeneration**. It uses the existing `/api/scanner/scans` proxy and authenticated HR `/api/v1/rec/scanner/scans` API. All server-side rules remain authoritative.

Test these on the actual devices before conference use:

- USB/cradle scanning on a computer and Bluetooth HID on Android and iPhone/iPad.
- A printed QR and a QR displayed on a phone, including an original mixed-case credential.
- Accepted, duplicate, revoked, wrong-conference and attendance-day-restricted badges.
- Events before opening and after closing.
- Two quick trigger pulls, held Enter, an open result dialog and focus loss.
- Bluetooth disconnect/reconnect, idle wakeup, tab switching and a temporary internet interruption.
- Retry after an uncertain response, ensuring the same request is not recorded twice.
- Camera and manual fallback without changing the selected event.
- USB Serial port selection/cancellation, correct baud/format, fragmented input and CR/LF/CRLF endings.
- Serial burst input, partial input before a pause, event changes and explicit rearming without a focused text field.
- USB unplug/replug, a busy port and a server retry after the USB device has disconnected.

Automated tests simulate HID keyboard input and mocked server responses; they do not certify a physical scanner, Bluetooth pairing or iOS hardware behaviour.

## Manufacturer References

- [Tera HW0009 product and download page](https://tera-digital.com/products/hw0009-wireless-barcode-scanner)
- [Official English HW0009 manual, version 01.1.02](https://cdn.shopify.com/s/files/1/0144/3482/8374/files/HW0009_ENG.pdf?v=1732002269)
- [Web Serial connection and stream handling](https://developer.chrome.com/docs/capabilities/serial)
- [Serial port settings](https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/open)
- [Current browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Serial.json)
