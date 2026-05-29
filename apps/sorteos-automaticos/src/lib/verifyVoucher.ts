/**
 * AI Verification Service
 * Uses OpenAI GPT-4o-mini Vision to extract data from Yape/Plin vouchers.
 */

export interface VerificationResult {
    isValid: boolean;
    extractedData?: {
        amount: string;
        date: string;
        operationNumber: string;
        bank?: string;
        senderName?: string;
    };
    confidence: number;
    error?: string;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const verifyVoucher = async (imageUrl: string, expectedAmount: string): Promise<VerificationResult> => {
    console.log(`[🤖 AI Verification] Processing image with OpenAI GPT-4o-mini...`);

    // Check if API key is configured
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-xxx') {
        console.warn('[⚠️ AI Verification] OpenAI API key not configured. Using mock mode.');
        return mockVerification(expectedAmount);
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analiza esta imagen de un voucher de pago Yape o Plin peruano.
Extrae los siguientes datos y devuélvelos SOLO como JSON válido (sin markdown, sin explicaciones):
{
  "amount": "S/ XX.XX",
  "operationNumber": "número de operación",
  "date": "fecha del pago",
  "time": "hora del pago",
  "senderName": "nombre del remitente si visible",
  "bank": "Yape o Plin"
}

Si no puedes leer algún campo, usa null.
Si la imagen NO es un voucher de pago válido, devuelve: {"error": "No es un voucher válido"}`
                        },
                        {
                            type: 'image_url',
                            image_url: { url: imageUrl }
                        }
                    ]
                }],
                max_tokens: 500,
                temperature: 0.1 // Low temperature for consistent extraction
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[❌ AI Verification] OpenAI API Error:', errorData);
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from AI');
        }

        console.log('[📝 AI Raw Response]', content);

        // Parse the JSON response
        let extracted;
        try {
            // Clean potential markdown formatting
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            extracted = JSON.parse(cleanContent);
        } catch {
            console.error('[❌ AI Verification] Failed to parse AI response:', content);
            return {
                isValid: false,
                confidence: 0,
                error: 'No se pudo interpretar la respuesta de la IA'
            };
        }

        // Check if it's an error response
        if (extracted.error) {
            return {
                isValid: false,
                confidence: 0.9,
                error: extracted.error
            };
        }

        // Normalize amounts for comparison
        const normalizeAmount = (amt: string) => {
            if (!amt) return '';
            return amt.replace(/[^\d.,]/g, '').replace(',', '.');
        };

        const extractedNormalized = normalizeAmount(extracted.amount);
        const expectedNormalized = normalizeAmount(expectedAmount);

        // Check if amounts match (allow some flexibility)
        const amountsMatch = extractedNormalized === expectedNormalized ||
            parseFloat(extractedNormalized) === parseFloat(expectedNormalized);

        console.log(`[✅ AI Verification] Extracted: ${extracted.amount}, Expected: ${expectedAmount}, Match: ${amountsMatch}`);

        return {
            isValid: amountsMatch,
            extractedData: {
                amount: extracted.amount || 'No detectado',
                date: extracted.date || 'No detectado',
                operationNumber: extracted.operationNumber || 'No detectado',
                bank: extracted.bank || 'No detectado',
                senderName: extracted.senderName || undefined
            },
            confidence: amountsMatch ? 0.95 : 0.7
        };

    } catch (error) {
        console.error('[❌ AI Verification] Error:', error);
        return {
            isValid: false,
            confidence: 0,
            error: error instanceof Error ? error.message : 'Error desconocido en verificación IA'
        };
    }
};

// Fallback mock for development/testing
const mockVerification = (expectedAmount: string): VerificationResult => {
    return {
        isValid: true,
        extractedData: {
            amount: expectedAmount,
            date: new Date().toLocaleDateString('es-PE'),
            operationNumber: Math.floor(100000 + Math.random() * 900000).toString(),
            bank: 'Yape (Mock)'
        },
        confidence: 0.5
    };
};
