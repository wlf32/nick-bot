import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface FileCitation {
  index: number;
  filename: string;
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: message,
      tools: [{
        type: "file_search",
        vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID as string],
        max_num_results: 5 // Limit results to reduce token usage
      }],
      include: ["file_search_call.results"]
    });

    // Find the message output in the response
    const messageOutput = response.output.find(item => item.type === 'message');
    let content = "I couldn't generate a response.";
    
    // Extract citations if present
    const citations: FileCitation[] = [];
    
    if (messageOutput?.type === 'message' && messageOutput.content) {
      const textContent = messageOutput.content.find(c => c.type === 'output_text');
      if (textContent && 'text' in textContent) {
        content = textContent.text as string;
        
        if ('annotations' in textContent && Array.isArray(textContent.annotations)) {
          textContent.annotations.forEach(annotation => {
            if (annotation.type === 'file_citation' && 'index' in annotation && 'filename' in annotation) {
              citations.push({
                index: annotation.index as number,
                filename: annotation.filename as string
              });
            }
          });
        }
      }
    }

    return NextResponse.json({
      content,
      citations
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 