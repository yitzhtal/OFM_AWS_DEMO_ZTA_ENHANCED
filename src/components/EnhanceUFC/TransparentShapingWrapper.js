import React, { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import UploadFileCard from '../UploadFileCard/UploadFileCard.js';

async function sanitizeFile(file) {
  // Read file into memory as an ArrayBuffer.
  const fileBuffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    // Load the PDF into a PDFDocument object
    const originalPdfDoc = await PDFDocument.load(fileBuffer);

    // Create a new PDFDocument
    const newPdfDoc = await PDFDocument.create();

    // Get the page indices of the original document
    const pageIndices = Array.from({ length: originalPdfDoc.getPageCount() }, (_, i) => i);

    // Copy the pages to the new document
    const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, pageIndices);
    copiedPages.forEach(page => newPdfDoc.addPage(page));

    // Save the new PDF as a byte array
    const sanitizedPdfBuffer = await newPdfDoc.save();

    // Create a new File object with the sanitized PDF
    const sanitizedFile = new File([sanitizedPdfBuffer], file.name, { type: 'application/pdf' });

    return sanitizedFile;
  }
}

// Function to scan the file using VirusTotal API
async function scanFileWithVirusTotal(file) {
  const apiKey = '083d8d94e48da9a2c1c1214a40befc50f6f1a0f91c1d43cff4648b3735fbce7e';  // Replace with your VirusTotal API key

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: { 'x-apikey': apiKey },
      body: formData,
    });

    const data = await response.json();

    if (!data || !data.data) {
      console.error('Unexpected API response:', data);
      return { isMalicious: false, data: null };
    }

    // Fetch the analysis results using the analysis ID
    const analysisId = data.data.id;
    const analysisResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      method: 'GET',
      headers: { 'x-apikey': apiKey },
    });

    const analysisData = await analysisResponse.json();

    if (
      analysisData &&
      analysisData.data &&
      analysisData.data.attributes &&
      analysisData.data.attributes.stats
    ) {
      if (analysisData.data.attributes.stats.malicious > 0) {
        console.log('File is flagged as malicious!');
        return { isMalicious: true, data: analysisData };
      }

      console.log('File is clean');
      return { isMalicious: false, data: analysisData };
    } else {
      console.error('Invalid analysis response structure:', analysisData);
      return { isMalicious: false, data: null };
    }
  } catch (error) {
    console.error('VirusTotal API error:', error);
    return { isMalicious: false, data: null };
  }
}

const TransparentShapingWrapper = (props) => {
  const inputRef = useRef(null);
  const [filename, setFilename] = useState(null);
  
  const enhancedOnChange = async (e) => {
    console.log('TransparentShapingWrapper log')
    // Pre-processing
    const originalFile = e.target.files[0];

    if (!originalFile) {
      alert('No file selected.');
      console.log('No file selected.');
      return;
    }

    // Check file size (<= 2MB)
    if (originalFile.size > 2 * 1024 * 1024) {
      alert('File size should be less than or equal to 2MB');
      console.log('File size should be less than or equal to 2MB');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    // Check file format (PDF, JPG, PNG)
    const acceptedFormats = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!acceptedFormats.includes(originalFile.type)) {      
      alert('File format should be PDF, JPG or PNG');
      console.log('File format should be PDF, JPG or PNG');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    // Implementation of addition ZTA Validations - Tal Yitzhak

      // Check for empty/corrupted files
    if (originalFile.size === 0) {
      alert('Corrupted/Empty file detected.');
      console.log('Empty file detected.');
      inputRef.current.value = '';
      return;
    }

    // File name validation
    const invalidFileNameChars = /[<>:"/\\|?*]/;
    if (invalidFileNameChars.test(originalFile.name)) {
      alert('Invalid file name detected.');
      console.log('Bad file name detected.');
      inputRef.current.value = '';
      return;
    }

    const lastUploadTime = localStorage.getItem('lastUploadTime');
    const currentTime = Date.now();

    if (lastUploadTime && currentTime - lastUploadTime < 10000) { // 10 sec limit
      alert('You are uploading too frequently. Please wait a few seconds.');
      console.log('Upload rate limit triggered.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    localStorage.setItem('lastUploadTime', currentTime);

    // Virus scan using VirusTotal
    const scanResult = await scanFileWithVirusTotal(originalFile);
    if (scanResult.isMalicious) {
      alert('File is flagged as malicious! Upload blocked.');
      inputRef.current.value = '';
      return;
    }

    // Implementation of addition ZTA Validations - Tal Yitzhak

    // Sanitize the file
    const sanitizedFile = await sanitizeFile(originalFile);
    
    if (sanitizedFile) {
      // Set file name here (assuming you have a function to do so)
      setFilename(sanitizedFile.name);
      // Create a new pseudo-event object with the sanitized file
      const newEvent = {
        ...e, 
        target: { 
          ...e.target, 
          files: [sanitizedFile], 
          value: sanitizedFile.name 
        },
      };

      // Pass the new event to the original onChange handle
      if (props.onChange) {
        await props.onChange(newEvent);
      }
    }
    
  };

  // Pass the enhanced onChange handler to the original component
  return <UploadFileCard {...props} onChange={enhancedOnChange} inputRef={inputRef}/>;
};

export default TransparentShapingWrapper;
