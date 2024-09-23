import { v3 } from "@google-cloud/translate";
import fs from 'fs';
import mime from 'mime';
import PDFDocument from 'pdfkit';

// Replace 'your-project-id' with your own Google Cloud Project ID
const projectId = 'your-project-id';
const location = 'global';
const inputUri = './inputs/document2.pdf'; // Image input
const tempPdfPath = './temp/temp_image.pdf'; // Temporary PDF file to store the image

const translationServiceClient = new v3.TranslationServiceClient();

// Convert PDF to byte code
const pdfToByteCode = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data); // Byte array
            }
        });
    });
};

// Save byte code as PDF or any file type
const byteCodeToFile = (byteCode, outputPath) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(outputPath, byteCode, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve('File successfully written!');
            }
        });
    });
};

// Determine the file extension from MIME type
const getFileExtensionFromMimeType = (mimeType) => {
    return mime.getExtension(mimeType);
};

// Convert image to PDF using pdfkit
const convertImageToPDF = (imagePath, outputPdfPath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPdfPath);

        doc.pipe(stream);
        doc.image(imagePath, 0, 0, { fit: [612, 792] }); // Fits the image to A4 size
        doc.end();

        stream.on('finish', () => {
            resolve(outputPdfPath);
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
};

// Main function to translate document
const translateDocument = async () => {
    let byteContent;
    let mimeType;

    // Detect MIME type from input file
    const inputMimeType = mime.getType(inputUri);

    // If the input is an image, convert it to a PDF first
    if (inputMimeType && inputMimeType.startsWith('image/')) {
        console.log('Converting image to PDF...');
        await convertImageToPDF(inputUri, tempPdfPath); // Convert image to PDF
        byteContent = await pdfToByteCode(tempPdfPath); // Read the newly created PDF as byte array
        mimeType = 'application/pdf'; // Set MIME type as PDF for the translation
    } else {
        // Otherwise, process the file directly (assuming it's a PDF)
        byteContent = await pdfToByteCode(inputUri);
        mimeType = inputMimeType;
    }

    // Construct translation request
    const request = {
        parent: translationServiceClient.locationPath(projectId, location),
        documentInputConfig: {
            mimeType: mimeType, // Correct MIME type (PDF in case of image conversion)
            content: byteContent,
        },
        targetLanguageCode: 'en-US',
    };

    // Execute translation request
    const [response] = await translationServiceClient.translateDocument(request);

    // Get MIME type from response to determine file type for output
    const outputMimeType = response.documentTranslation.mimeType;
    const extension = getFileExtensionFromMimeType(outputMimeType);
    const outputFilePath = `./outputs/translated_document.${extension}`;

    // Write the translated content to a new file with the correct extension
    await byteCodeToFile(response.documentTranslation.byteStreamOutputs[0], outputFilePath);
    console.log(`File translated and saved as ${outputFilePath}`);
}

translateDocument().catch(console.error);

