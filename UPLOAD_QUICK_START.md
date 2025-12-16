# File Upload System - Quick Start Guide

## 🚀 Getting Started

The large file upload system is now integrated into your application and ready to use!

### Access the Upload Page

Navigate to: **`/upload-file`** or **`/uploadFile`**

The page is protected by authentication - users must be logged in to access it.

## 📝 What Was Built

### 1. Core Files Created

```
✅ src/types/upload.ts                     - Type definitions
✅ src/utils/fileParser.ts                  - File parsing with streaming
✅ src/utils/uploadService.ts               - API upload with retry logic
✅ src/components/upload/FileUploadChunked.tsx  - Main upload component
✅ src/apppages/UploadFile/index.tsx        - Upload page
✅ src/app/api/upload/route.ts              - Sample API endpoint
✅ public/workers/excelParser.worker.js     - Web Worker for Excel files
```

### 2. Dependencies Installed

```json
{
  "papaparse": "^5.5.3",        // CSV/TXT parsing
  "xlsx": "^0.18.5",            // Excel parsing
  "@types/papaparse": "^5.3.16" // TypeScript types
}
```

## 🎯 How to Use

### Step 1: Navigate to Upload Page
- Log in to your application
- Go to `/upload-file`

### Step 2: Upload a File
1. **Drag & drop** a file or **click to browse**
2. Supported formats: CSV, TXT, XLS, XLSX
3. Max file size: 100MB
4. Click **"Preview"** to see first 10 rows (optional)
5. Click **"Start Upload"** to begin

### Step 3: Monitor Progress
Watch real-time updates:
- Progress bar (0-100%)
- Records processed count
- Upload speed (records/second)
- Estimated time remaining
- Failed records count

### Step 4: Control Upload
- **Pause**: Temporarily stop the upload
- **Resume**: Continue from where you paused
- **Cancel**: Stop and discard the upload

### Step 5: Review Results
After completion, view summary:
- Total records processed
- Successful uploads
- Failed uploads
- Time taken
- Session ID

### Step 6: Handle Failures (if any)
If some chunks failed:
- Click **"Retry Failed"** to retry failed chunks
- Click **"Download Failed"** to download failed records as CSV

## ⚙️ Configuration

Current settings (can be customized):

```typescript
{
  chunkSize: 5000,           // Records per API request
  maxFileSize: 100MB,        // Maximum file size
  delayBetweenChunks: 100,   // Milliseconds between requests
  maxRetries: 3,             // Retry attempts per chunk
  apiEndpoint: "/api/upload" // API endpoint URL
}
```

### To Customize Settings

Edit [src/apppages/UploadFile/index.tsx](src/apppages/UploadFile/index.tsx):

```typescript
<FileUploadChunked
  apiEndpoint="/api/your-endpoint"  // Change API endpoint
  chunkSize={10000}                 // Increase chunk size
  maxFileSize={200 * 1024 * 1024}   // 200MB max
  delayBetweenChunks={50}           // Faster uploads
  maxRetries={5}                    // More retries
/>
```

## 🔧 Customize API Endpoint

The sample API endpoint is at [src/app/api/upload/route.ts](src/app/api/upload/route.ts).

### Replace with Your API Logic

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, chunkIndex, data } = body;

  // YOUR CUSTOM LOGIC HERE:

  // Option 1: Save to database
  await db.insertMany(data);

  // Option 2: Send to external API
  await fetch('https://your-api.com/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  // Option 3: Write to file
  await fs.appendFile(`uploads/${sessionId}.json`, JSON.stringify(data));

  // Option 4: Queue for background processing
  await queue.add('process-data', { sessionId, chunkIndex, data });

  return NextResponse.json({ success: true });
}
```

## 📊 Testing

### Test with Sample Files

Create test CSV files:

**Small file (1,000 records):**
```bash
node -e "console.log('id,name,email,age'); for(let i=1; i<=1000; i++) console.log(\`\${i},User\${i},user\${i}@test.com,\${20+i%50}\`)" > test_1k.csv
```

**Large file (100,000 records):**
```bash
node -e "console.log('id,name,email,age'); for(let i=1; i<=100000; i++) console.log(\`\${i},User\${i},user\${i}@test.com,\${20+i%50}\`)" > test_100k.csv
```

### Test Checklist

- [ ] Upload CSV file (< 1MB)
- [ ] Upload large CSV file (> 10MB)
- [ ] Upload TXT file (tab-delimited)
- [ ] Upload Excel file (.xlsx)
- [ ] Test file validation (try unsupported format)
- [ ] Test file size limit (try file > 100MB)
- [ ] Test preview feature
- [ ] Test pause/resume functionality
- [ ] Test cancel during upload
- [ ] Check browser memory usage (DevTools → Memory)
- [ ] Test with slow network (DevTools → Network → Throttling)

## 🐛 Troubleshooting

### Upload Not Starting
**Check:**
- Browser console for errors
- Network tab for API calls
- File format is supported
- File size is under limit

### Browser Freezing
**Solutions:**
- Reduce chunk size to 2000-3000 records
- For Excel files, verify Web Worker is loading
- Clear browser cache and retry

### API Errors
**Check:**
- API endpoint is correct
- API is returning proper response format
- Check server logs for errors
- Verify authentication if required

### Web Worker Not Loading
**Check:**
- File exists at `/public/workers/excelParser.worker.js`
- No CORS issues in browser console
- Build was successful

## 📈 Performance Tips

### For Faster Uploads
1. Reduce `delayBetweenChunks` to 50ms
2. Increase `chunkSize` to 10000 records
3. Use faster API endpoint
4. Consider parallel uploads (advanced)

### For Large Files
1. Use streaming for CSV/TXT (already implemented)
2. Ensure Web Worker is used for Excel
3. Monitor memory usage
4. Consider splitting very large files

### For Better User Experience
1. Show preview before upload
2. Allow pause/resume
3. Track failed chunks
4. Provide download of failed records

## 🔐 Security Best Practices

Before deploying to production:

1. **Add Authentication**
   ```typescript
   // In API endpoint
   const token = request.headers.get('Authorization');
   if (!isValidToken(token)) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. **Validate Data**
   ```typescript
   // Validate chunk data
   if (!Array.isArray(data) || data.length === 0) {
     return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
   }
   ```

3. **Add Rate Limiting**
   ```typescript
   // Limit requests per session/user
   const rateLimit = await checkRateLimit(sessionId);
   if (!rateLimit.allowed) {
     return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
   }
   ```

4. **Sanitize Input**
   ```typescript
   // Clean data before database insertion
   const sanitizedData = data.map(row => sanitize(row));
   ```

5. **Use HTTPS**
   - Always use HTTPS in production
   - Never send sensitive data over HTTP

## 📚 Additional Resources

- Full Documentation: [FILE_UPLOAD_SYSTEM_README.md](FILE_UPLOAD_SYSTEM_README.md)
- Type Definitions: [src/types/upload.ts](src/types/upload.ts)
- File Parser Utils: [src/utils/fileParser.ts](src/utils/fileParser.ts)
- Upload Service: [src/utils/uploadService.ts](src/utils/uploadService.ts)

## 🎉 Next Steps

1. Test the upload functionality with sample files
2. Customize the API endpoint for your backend
3. Add authentication/authorization if needed
4. Configure settings based on your requirements
5. Deploy to production

## ❓ Need Help?

- Check browser console for errors
- Review the detailed README
- Test with sample files first
- Monitor network tab during upload
- Check server logs for API errors

---

**Happy uploading! 🚀**
