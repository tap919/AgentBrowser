'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText, Upload } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PDFViewer({ url: propUrl }: { url?: string }) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>(propUrl || '');
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const loadPDF = useCallback(async (pdfUrl: string) => {
    if (!pdfUrl) return;
    setLoading(true);
    setError(null);
    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to load PDF');
    } finally {
      setLoading(false);
    }
  }, []);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
    } catch (err) {
      console.error('Render error:', err);
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  useEffect(() => {
    if (pdfDoc) renderPage();
  }, [pdfDoc, renderPage]);

  useEffect(() => {
    if (propUrl) loadPDF(propUrl);
  }, [propUrl, loadPDF]);

  useEffect(() => {
    if (pdfUrl) loadPDF(pdfUrl);
  }, [pdfUrl, loadPDF]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(file);
        objectUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-background/30 rounded-lg border border-border/20">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border/20 flex-wrap">
        <button onClick={handleOpenFile} className="p-1.5 rounded hover:bg-muted/30 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Upload className="w-3 h-3" /> Open
        </button>
        <div className="w-px h-4 bg-border/30" />
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 rounded hover:bg-muted/30 disabled:opacity-30">
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-[10px] text-muted-foreground min-w-[40px] text-center">{currentPage}/{totalPages || '-'}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-muted/30 disabled:opacity-30">
          <ChevronRight className="w-3 h-3" />
        </button>
        <div className="w-px h-4 bg-border/30" />
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 rounded hover:bg-muted/30">
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-[10px] text-muted-foreground min-w-[35px] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 rounded hover:bg-muted/30">
          <ZoomIn className="w-3 h-3" />
        </button>
        <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1 rounded hover:bg-muted/30">
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-background/50">
        {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && !error && !pdfDoc && (
          <div className="text-center p-4">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground mb-2">No PDF loaded</p>
            <button onClick={handleOpenFile} className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px]">
              Select PDF
            </button>
          </div>
        )}
        {pdfDoc && <canvas ref={canvasRef} className="shadow-sm" />}
      </div>
    </div>
  );
}
