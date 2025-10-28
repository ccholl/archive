# Image111 Project

This is an independent project folder for image content.

## File Structure:
```
image111/
├── image111.png        ← The full-size image
├── thumbnail.png       ← Thumbnail for menu (optional, can use same image)
├── index.html          ← Optional: dedicated page for this image
└── README.md           ← This file
```

## Usage in menu-data.json:
```json
{
  "name": "image111",
  "type": "image",
  "src": "content/shell/image111/image111.png",
  "thumbnail": "content/shell/image111/thumbnail.png"  // optional
}
```

## Notes:
- If no thumbnail specified, uses `src` as thumbnail
- Clicking thumbnail shows full image in lightbox overlay
- Optionally create index.html for a dedicated gallery page
