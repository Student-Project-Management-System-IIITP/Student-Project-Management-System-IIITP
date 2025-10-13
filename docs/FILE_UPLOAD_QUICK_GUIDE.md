# 📎 File Upload - Quick Reference Guide

## 🎯 Quick Facts

- **Max Files:** 3 per message
- **Max Size:** 10MB per file
- **Storage:** `/backend/uploads/chat/`
- **Supported Types:** 28 file types (docs, images, videos, code, archives)

---

## 🚀 How to Use

### Sending Files

```
1. Click 📎 button next to message input
2. Select 1-3 files (max 10MB each)
3. Preview appears above input
4. Optional: Type a message
5. Click Send
```

### Downloading Files

```
1. Click on file card in message
2. File opens in new tab
3. Download or view
```

---

## 📁 Supported File Types

### Documents
```
📄 PDF: .pdf
📝 Word: .doc, .docx
📊 Excel: .xls, .xlsx
📊 PowerPoint: .ppt, .pptx
📄 Text: .txt, .csv
```

### Images
```
🖼️ .jpg, .jpeg, .png, .gif, .webp, .svg
```

### Archives
```
🗜️ .zip, .rar, .7z
```

### Code Files
```
💻 .js, .html, .css, .json, .py, .java, .c, .cpp, .h
```

### Videos
```
🎥 .mp4, .mov, .avi
```

---

## ⚠️ Limits & Errors

| Limit | Value | Error Message |
|-------|-------|---------------|
| Max files | 3 | "Maximum 3 files allowed per message" |
| Max size | 10MB | "File size must be less than 10MB" |
| File types | 28 types | "File type not allowed" |

---

## 🎨 UI Elements

### Upload Button
```
[📎] ← Click to attach files
```

### File Preview (Before Send)
```
┌─────────────────────────────┐
│ 📄 report.pdf (2.5 MB) [×] │
│ 🖼️ image.png (1.2 MB) [×]  │
└─────────────────────────────┘
```

### File in Message (After Send)
```
┌─────────────────────────────┐
│ Message text here           │
│ ┌─────────────────────────┐ │
│ │ 📄 report.pdf       ⬇️  │ │
│ │ 2.5 MB                  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 🔧 Technical Details

### API Endpoints

**Upload:**
```
POST /api/projects/:projectId/messages
Content-Type: multipart/form-data
Body: { message, files[] }
```

**Download:**
```
GET /api/projects/:projectId/files/:filename
```

### File Storage

```
Location: /backend/uploads/chat/
Format: originalname_timestamp-random.ext
Example: report_1699876543210-123456789.pdf
```

---

## ✅ Features

- [x] Multiple file upload (max 3)
- [x] File size validation (10MB)
- [x] File type validation (28 types)
- [x] File preview before send
- [x] Remove file before send
- [x] File icons by type
- [x] File size formatting
- [x] Download files
- [x] Real-time updates
- [x] Access control
- [x] Beautiful UI

---

## 🐛 Troubleshooting

### File won't upload?
- Check file size (< 10MB)
- Check file type (28 supported types)
- Check file count (max 3)

### Can't download file?
- Check project access
- Check if file exists
- Check internet connection

### Preview not showing?
- Refresh page
- Check browser console
- Verify file was uploaded

---

## 💡 Tips

1. **Compress large files** before uploading
2. **Use descriptive filenames** for easy identification
3. **Send multiple related files** together (max 3)
4. **Add context** in message text when sending files
5. **Check file type** before selecting

---

## 📊 File Size Reference

```
1 KB = 1,024 bytes
1 MB = 1,024 KB = 1,048,576 bytes
10 MB = 10,485,760 bytes (our limit)
```

**Common File Sizes:**
- Small PDF: 100-500 KB
- Medium PDF: 1-3 MB
- Large PDF: 5-10 MB
- Photo (JPEG): 1-5 MB
- Screenshot (PNG): 500 KB - 2 MB
- Video (short): 5-10 MB

---

## 🎯 Best Practices

### Do's ✅
- Compress images before uploading
- Use appropriate file formats
- Name files descriptively
- Check file before sending
- Remove unwanted files from preview

### Don'ts ❌
- Don't upload files > 10MB
- Don't upload unsupported types
- Don't upload more than 3 files
- Don't upload sensitive data without encryption
- Don't spam with unnecessary files

---

## 🔒 Security

- ✅ Only project members can upload
- ✅ Only project members can download
- ✅ File type whitelist enforced
- ✅ File size limits enforced
- ✅ Unique filenames prevent overwrites
- ✅ Path traversal protection

---

## 📱 Mobile Support

All features work on mobile:
- ✅ File picker opens native selector
- ✅ Touch-friendly buttons
- ✅ Responsive file cards
- ✅ Mobile-optimized preview

---

## 🎉 Quick Start

```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start frontend
cd frontend
npm run dev

# 3. Go to project chat
# 4. Click 📎 button
# 5. Select files
# 6. Send!
```

---

**That's it! Happy file sharing! 📎✨**
