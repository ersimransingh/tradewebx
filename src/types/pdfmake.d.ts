declare module 'pdfmake/build/pdfmake' {
  interface CreatedPdf {
    download(fileName?: string): void;
    open(): void;
    print(): void;
    getBase64(cb: (base64: string) => void): void;
    getBlob(cb: (blob: Blob) => void): void;
    getBuffer(cb: (buffer: Uint8Array) => void): void;
  }

  const pdfMake: {
    vfs?: Record<string, string>;
    createPdf(docDefinition: any): CreatedPdf;
  };

  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake?: {
      vfs: Record<string, string>;
    };
    vfs?: Record<string, string>;
  };
  export default pdfFonts;
}
