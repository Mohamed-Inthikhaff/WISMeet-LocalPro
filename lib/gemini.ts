/**
 * Gemini AI Integration for Mortgage Meeting Assistant Bot
 * Handles mortgage-specific transcript summarization
 */

export interface GeminiSummaryRequest {
  transcript: string;
  meetingType?: 'mortgage_consultation' | 'loan_application' | 'refinance' | 'general';
  clientName?: string;
  advisorName?: string;
}

export interface GeminiSummaryResponse {
  success: boolean;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  nextSteps?: string[];
  error?: string;
}

/**
 * Sends transcript to Gemini AI for mortgage-specific summarization
 */
export const summarizeTranscript = async (
  request: GeminiSummaryRequest
): Promise<GeminiSummaryResponse> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    console.log('🤖 Generating AI summary with Gemini...');

    const prompt = createMortgagePrompt(request);
    const meetingTypeContext = getMeetingTypeContext(request.meetingType || 'general');

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${meetingTypeContext}\n\n${prompt}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Gemini API error:', response.status, '-', JSON.stringify(errorData, null, 2));
      
      // Check if it's a quota exceeded error (429)
      if (response.status === 429) {
        console.warn('⚠️ Gemini API quota exceeded, using fallback summary');
        return generateFallbackSummary(request);
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    const content = data.candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const responseText = content.parts[0].text;
    console.log('📝 Raw Gemini response:', responseText.substring(0, 200) + '...');

    const result = parseGeminiResponse(responseText);
    console.log('✅ Summary parsed successfully');

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
      actionItems: result.actionItems,
      nextSteps: result.nextSteps
    };

  } catch (error) {
    console.error('❌ Error in Gemini summarization:', error);
    
    // If it's a quota error or any other error, use fallback
    if (error instanceof Error && error.message.includes('429')) {
      console.warn('⚠️ Using fallback summary due to API quota');
      return generateFallbackSummary(request);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Generate a fallback summary when Gemini API is unavailable
 */
const generateFallbackSummary = (request: GeminiSummaryRequest): GeminiSummaryResponse => {
  console.log('🔄 Generating fallback summary...');
  
  const transcript = request.transcript;
  const clientName = request.clientName || 'Client';
  const advisorName = request.advisorName || 'Mortgage Advisor';
  
  // Simple fallback summary based on transcript length and content
  const wordCount = transcript.split(' ').length;
  const hasMortgageTerms = /mortgage|loan|rate|payment|down payment|credit/i.test(transcript);
  
  let summary = '';
  let keyPoints: string[] = [];
  let actionItems: string[] = [];
  let nextSteps: string[] = [];
  
  if (wordCount < 50) {
    summary = `Brief meeting conducted between ${advisorName} and ${clientName}. The conversation was short and may require follow-up for detailed discussion.`;
    keyPoints = ['Meeting was brief', 'Follow-up may be needed'];
    actionItems = ['Schedule follow-up meeting', 'Prepare detailed documentation'];
    nextSteps = ['Contact client for additional discussion', 'Review meeting notes'];
  } else if (hasMortgageTerms) {
    summary = `Mortgage consultation meeting between ${advisorName} and ${clientName}. The discussion covered mortgage-related topics and client requirements.`;
    keyPoints = ['Mortgage consultation conducted', 'Client requirements discussed'];
    actionItems = ['Review mortgage options', 'Prepare loan application'];
    nextSteps = ['Follow up with mortgage options', 'Schedule application review'];
  } else {
    summary = `Meeting conducted between ${advisorName} and ${clientName}. The conversation covered various topics and client needs.`;
    keyPoints = ['Meeting completed', 'Client needs discussed'];
    actionItems = ['Review meeting notes', 'Prepare follow-up materials'];
    nextSteps = ['Schedule follow-up meeting', 'Send meeting summary'];
  }
  
  return {
    success: true,
    summary,
    keyPoints,
    actionItems,
    nextSteps
  };
};

/**
 * Creates a mortgage-specific prompt for Gemini AI
 */
const createMortgagePrompt = (request: GeminiSummaryRequest): string => {
  const { transcript, meetingType = 'mortgage_consultation', clientName, advisorName } = request;
  
  const meetingContext = getMeetingTypeContext(meetingType);
  
  return `You are a professional mortgage advisor assistant. Please analyze the following mortgage meeting transcript and provide a comprehensive summary focused on mortgage-specific details.

Meeting Context: ${meetingContext}
${clientName ? `Client: ${clientName}` : ''}
${advisorName ? `Advisor: ${advisorName}` : ''}

Transcript:
${transcript}

Please provide a structured response in the following JSON format:

{
  "summary": "A concise 2-3 sentence summary of the meeting",
  "keyPoints": [
    "Key mortgage details discussed",
    "Loan terms mentioned",
    "Financial figures discussed",
    "Important decisions made"
  ],
  "actionItems": [
    "Specific tasks that need to be completed",
    "Documents required",
    "Follow-up actions needed"
  ],
  "nextSteps": [
    "Immediate next steps for the client",
    "Timeline for follow-up",
    "Important deadlines"
  ]
}

Focus on:
- Mortgage rates and terms discussed
- Loan amounts and types
- Financial qualifications and requirements
- Documentation needed
- Timeline and deadlines
- Any concerns or questions raised
- Decisions made during the meeting

Ensure all financial information is accurately captured and any specific mortgage products or rates mentioned are clearly noted.`;
};

/**
 * Gets context based on meeting type
 */
const getMeetingTypeContext = (meetingType: string): string => {
  switch (meetingType) {
    case 'mortgage_consultation':
      return 'Initial mortgage consultation meeting to discuss loan options and requirements';
    case 'loan_application':
      return 'Loan application meeting to process mortgage application and collect documentation';
    case 'refinance':
      return 'Mortgage refinance consultation to discuss refinancing options and benefits';
    default:
      return 'General mortgage-related meeting';
  }
};

/**
 * Parses the structured response from Gemini AI
 */
const parseGeminiResponse = (responseText: string): {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps: string[];
} => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Summary not available',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []
      };
    }
  } catch (error) {
    console.warn('Failed to parse structured response, using fallback parsing');
  }

  // Fallback parsing if JSON parsing fails
  const lines = responseText.split('\n').filter(line => line.trim());
  
  return {
    summary: lines[0] || 'Summary not available',
    keyPoints: extractListItems(responseText, 'keyPoints', 'Key Points'),
    actionItems: extractListItems(responseText, 'actionItems', 'Action Items'),
    nextSteps: extractListItems(responseText, 'nextSteps', 'Next Steps')
  };
};

/**
 * Extracts list items from text based on section headers
 */
const extractListItems = (text: string, sectionKey: string, sectionHeader: string): string[] => {
  const items: string[] = [];
  
  // Look for the section header
  const sectionIndex = text.toLowerCase().indexOf(sectionHeader.toLowerCase());
  if (sectionIndex === -1) return items;

  // Extract text after the header
  const sectionText = text.substring(sectionIndex + sectionHeader.length);
  
  // Split by lines and look for bullet points or numbered items
  const lines = sectionText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
      items.push(trimmed.replace(/^[-•*\d\.\s]+/, '').trim());
    }
  }

  return items;
};

/**
 * Test function to verify Gemini AI integration
 */
export const testGeminiIntegration = async (): Promise<GeminiSummaryResponse> => {
  const testTranscript = `
  Advisor: Good morning, Mr. Johnson. Thank you for coming in today to discuss your mortgage options.
  
  Client: Good morning. I'm looking to buy a house for around $350,000 and I have about $70,000 for a down payment.
  
  Advisor: That's great. With a $70,000 down payment on a $350,000 home, you'd be putting down about 20%, which is excellent. This will help you avoid PMI. What's your current credit score?
  
  Client: My credit score is 720. I've been working on improving it over the past year.
  
  Advisor: That's a good score. Based on your situation, I can offer you a 30-year fixed-rate mortgage at 6.5% APR. With your 20% down payment, your monthly payment would be approximately $1,770 for principal and interest.
  
  Client: That sounds reasonable. What documents will I need to provide?
  
  Advisor: You'll need your W-2s from the past two years, recent pay stubs, bank statements for the last three months, and any additional income documentation. We'll also need to verify your employment and run a credit check.
  
  Client: I can provide all of those. How long does the approval process typically take?
  
  Advisor: With all documents in order, we can typically close within 30-45 days. I'll need you to complete the loan application today, and then we can start processing everything.
  `;

  return await summarizeTranscript({
    transcript: testTranscript,
    meetingType: 'mortgage_consultation',
    clientName: 'Mr. Johnson',
    advisorName: 'Mortgage Advisor'
  });
}; 