/* eslint-disable no-restricted-globals */
// Excel Parser Web Worker
// This runs in a separate thread to avoid blocking the UI

importScripts('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');

self.addEventListener('message', async (e) => {
  const { type, file, chunkSize, sheetName } = e.data;

  if (type === 'parse') {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Parse workbook
      const workbook = XLSX.read(data, { type: 'array' });

      // Get sheet
      const sheet = sheetName
        ? workbook.Sheets[sheetName]
        : workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        self.postMessage({
          type: 'error',
          error: `Sheet ${sheetName || 'first sheet'} not found`,
        });
        return;
      }

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });

      if (jsonData.length === 0) {
        self.postMessage({
          type: 'error',
          error: 'No data found in Excel file',
        });
        return;
      }

      // Extract headers and rows
      const headers = jsonData[0];
      const rows = jsonData.slice(1);

      // Send total info first
      self.postMessage({
        type: 'start',
        totalRows: rows.length,
        headers: headers,
      });

      // Process and send data in chunks
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        // Convert array rows to objects with headers
        const chunkObjects = chunk.map((row) => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined ? row[index] : '';
          });
          return obj;
        });

        const progress = Math.round(((i + chunk.length) / rows.length) * 100);

        // Send chunk to main thread
        self.postMessage({
          type: 'chunk',
          data: chunkObjects,
          chunkIndex: Math.floor(i / chunkSize),
          progress: progress,
        });

        // Small delay to prevent overwhelming main thread
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Send completion message
      self.postMessage({
        type: 'complete',
        totalRows: rows.length,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message || 'Failed to parse Excel file',
      });
    }
  }
});
