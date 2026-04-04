import Tesseract from 'tesseract.js';

export interface OCRResult {
  amount: number | null;
  confidence: number;
  rawText: string;
}

export async function extractAmountFromImage(imageDataUrl: string): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageDataUrl, 'spa+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    console.log('=== OCR DEBUG ===');
    console.log('Confidence:', confidence);
    console.log('Raw text:', text);
    console.log('=================');

    const amount = extractMoneyAmount(text);

    console.log('Extracted amount:', amount);

    return {
      amount,
      confidence,
      rawText: text,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      amount: null,
      confidence: 0,
      rawText: '',
    };
  }
}

function extractMoneyAmount(text: string): number | null {
  // Clean up common OCR misreadings
  let cleanedText = text
    .replace(/ssw/gi, '5')  // Common misread of $ symbol
    .replace(/S/g, '$')
    .replace(/sw/gi, '')
    .replace(/\$/g, '$')
    .replace(/\.\s+/g, '.')  // Fix space between digits: "14. 537" -> "14.537"
    // Handle Colombian/Mexican peso format: $14 537 -> $14537 (BEFORE removing all spaces!)
    .replace(/\$(\d+)\s+(\d{3})/g, '$$$1$2')
    .replace(/\s+/g, '');    // Remove ALL remaining spaces

  // First priority: Look for "total" + amount pattern
  const totalPatterns = [
    /(?:total|total\s+general|subtotal|importe|monto|amount|gran\s+total)[:\s]*\$?\s*([\d,.]+)/gi,
    /([\d,.]+)\s*(?:total|total\s+general)/gi,
    /(?:total|valor)[:\s]*\$?\s*([\d,.]+)/gi,
    /total[:\s]*\$?\s*(\d+)/gi,
    /total[:\s]*(\d+)/gi,
  ];

  for (const pattern of totalPatterns) {
    const matches = Array.from(cleanedText.matchAll(pattern));
    for (const match of matches) {
      const cleanNumber = match[1] || match[0];
      const numStr = cleanNumber.replace(/[^\d,.]/g, '').replace(/,/g, '.');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 100000000) {
        return num;
      }
    }
  }

  // Second priority: Look for currency symbols near numbers
  const currencyPatterns = [
    /\$[\d,.]+/g,
    /\$\s*[\d,.]+/g,
    /[\d,]+\.\d{2}/g,  // Numbers with 2 decimal places (typical prices)
    /\d{4,}/g,  // Large numbers like 9157 (common in Colombian receipts)
  ];

  const numbers: number[] = [];

  for (const pattern of currencyPatterns) {
    const matches = Array.from(cleanedText.matchAll(pattern));
    for (const match of matches) {
      const cleanNumber = match[0]
        .replace(/[^\d,.]/g, '')
        .replace(/,/g, '.');

      const num = parseFloat(cleanNumber);
      if (!isNaN(num) && num > 100 && num < 100000000) {  // Minimum 100 to filter out small numbers
        numbers.push(num);
      }
    }
  }

  if (numbers.length === 0) return null;

  // Return the highest number (usually the total in receipts)
  return Math.max(...numbers);
}