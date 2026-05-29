---
name: ai-integration
description: Connect AI vision APIs for voucher verification
version: 1.0.0
---

# AI Integration

## Purpose
Integrate real AI vision capabilities (OpenAI GPT-4o / Google Vision) to extract data from payment vouchers.

## Supported Providers

| Provider | Model | Cost | Best For |
|----------|-------|------|----------|
| OpenAI | gpt-4o-mini | ~$0.003/image | Best accuracy |
| Google | Cloud Vision | ~$1.50/1000 | High volume |
| Anthropic | Claude Vision | ~$0.004/image | Alternative |

## Implementation (OpenAI)

### Step 1: Get API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add to `.env`: `VITE_OPENAI_API_KEY=sk-xxx`

### Step 2: Update verifyVoucher.ts
```typescript
export const verifyVoucher = async (imageUrl: string, expectedAmount: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Extract from this Yape/Plin voucher: amount, operation_number, date, sender_name. Return JSON only.` },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      max_tokens: 300
    })
  });
  
  const data = await response.json();
  const extracted = JSON.parse(data.choices[0].message.content);
  
  return {
    isValid: extracted.amount === expectedAmount,
    extractedData: extracted,
    confidence: 0.95
  };
};
```

### Step 3: Handle Errors
- Rate limits: Implement exponential backoff
- Invalid images: Return `isValid: false` with error message
- API down: Fall back to manual verification

## Prompt Engineering Tips
- Be specific: "Yape/Plin voucher" not just "image"
- Request JSON: Easier to parse
- Include expected format: Guide the model

## Security Warning
⚠️ **API keys in frontend are exposed**. For production:
1. Create Firebase Cloud Function
2. Move API call to backend
3. Only expose function URL to frontend

## Verification
- [ ] Test with real Yape screenshot
- [ ] Test with fake/edited image
- [ ] Verify extracted amount matches
- [ ] Check error handling works
