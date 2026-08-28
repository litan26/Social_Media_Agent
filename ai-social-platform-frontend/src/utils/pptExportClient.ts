import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export class PptExportClient {
  /**
   * Export single slide canvas element as PNG
   */
  static async exportSlideToPng(slideElement: HTMLElement, slideTitle: string = 'slide'): Promise<void> {
    const canvas = await html2canvas(slideElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: null,
    });

    const link = document.createElement('a');
    link.download = `${slideTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Export all slides as multi-page PDF document
   */
  static async exportDeckToPdf(slideElements: HTMLElement[], presentationTitle: string = 'presentation'): Promise<void> {
    if (slideElements.length === 0) return;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [1920, 1080],
    });

    for (let i = 0; i < slideElements.length; i++) {
      const element = slideElements[i];
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage([1920, 1080], 'landscape');
      pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);
    }

    const safeTitle = presentationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`${safeTitle}.pdf`);
  }

  /**
   * Export all slides as ZIP bundle of PNG images
   */
  static async exportAllSlidesToZip(slideElements: HTMLElement[], presentationTitle: string = 'presentation'): Promise<void> {
    if (slideElements.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('slides');

    for (let i = 0; i < slideElements.length; i++) {
      const element = slideElements[i];
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      folder?.file(`slide_${i + 1}.png`, base64Data, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    const safeTitle = presentationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.href = URL.createObjectURL(content);
    link.download = `${safeTitle}_slides.zip`;
    link.click();
  }
}
