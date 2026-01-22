declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    vfs?: Record<string, string>;
    createPdf: (docDefinition: any) => {
      download: (fileName?: string) => void;
      open: () => void;
      print: () => void;
    };
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
