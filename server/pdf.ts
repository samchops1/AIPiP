import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import path from 'path';

export async function generateTerminationPdf(employeeName: string, terminationDate: string) {
  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument();
    const filePath = path.join('attached_assets', `termination-${Date.now()}.pdf`);
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('Termination Notice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Dear ${employeeName},`);
    doc.moveDown();
    doc.text(`This letter serves as formal notice that your employment will be terminated effective ${terminationDate}.`);
    doc.moveDown();
    doc.text('Please contact HR if you have any questions.');
    doc.moveDown();
    doc.text('Regards,');
    doc.text('Human Resources');

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
