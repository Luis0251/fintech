import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';

export interface VisionOCRResult {
  amount: number | null;
  rawText: string;
  fallback?: boolean;
  error?: string;
}

@Injectable()
export class OcrService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async processImage(imageDataUrl: string, userId: string): Promise<VisionOCRResult> {
    // Get user's Vision API key
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { visionApiKey: true },
    });

    if (!user?.visionApiKey) {
      throw new HttpException(
        { message: 'Vision API key not configured', code: 'NO_VISION_API_KEY' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Decrypt the API key
    const apiKey = this.encryptionService.decrypt(user.visionApiKey);

    // Remove data URL prefix to get base64
    const base64Image = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = 'Vision API error';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error?.details?.[0]?.reason === 'BILLING_DISABLED') {
          errorMessage = 'Vision API billing not enabled';
          statusCode = HttpStatus.PAYMENT_REQUIRED;
        } else {
          errorMessage = errorJson.error?.message || errorBody;
        }
      } catch {
        errorMessage = errorBody;
      }

      throw new HttpException(
        { message: errorMessage, code: 'VISION_API_ERROR' },
        statusCode
      );
    }

    const data = await response.json();
    const text = data.responses?.[0]?.textAnnotations?.[0]?.description || '';
    
    // Extract amount from text
    const amount = this.extractAmount(text);

    return {
      amount,
      rawText: text,
    };
  }

  private extractAmount(text: string): number | null {
    // First priority: Look for "total" + amount pattern
    const totalPatterns = [
      /(?:total|total\s+general|subtotal|importe|monto|amount|gran\s+total)[:\s]*\$?\s*([\d,.]+)/gi,
      /([\d,.]+)\s*(?:total|total\s+general)/gi,
      /(?:total|valor)[:\s]*\$?\s*([\d,.]+)/gi,
      /total[:\s]*\$?\s*(\d+)/gi,
      /total[:\s]*(\d+)/gi,
    ];

    for (const pattern of totalPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const cleanNumber = match[1] || match[0];
        const numStr = cleanNumber.replace(/[^\d,.]/g, '').replace(/,/g, '.');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 100000000) {
          return num;
        }
      }
    }

    // Second priority: Look for currency symbols and numbers with 2 decimals
    const currencyPatterns = [
      /\$[\d,.]+/g,
      /\$\s*[\d,.]+/g,
      /[\d,]+\.\d{2}/g,
      /\d{4,}/g,
    ];

    const numbers: number[] = [];

    for (const pattern of currencyPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const cleanNumber = match[0]
          .replace(/[^\d,.]/g, '')
          .replace(/,/g, '.');

        const num = parseFloat(cleanNumber);
        if (!isNaN(num) && num > 100 && num < 100000000) {
          numbers.push(num);
        }
      }
    }

    if (numbers.length === 0) return null;

    return Math.max(...numbers);
  }
}