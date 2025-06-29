import OpenAI from 'openai';

const styleInstructions = {
  concise: 'Summarize each rule briefly.',
  detailed: 'Provide a detailed, step-by-step explanation for each rule.',
  table: 'Present the rules in a markdown table.',
  bullet: 'List each rule as bullet points.',
  human: 'Explain the rules in simple, non-technical language.',
  json: 'Return only a JSON object as specified.'
};

export const analyzeWafRules = async (wafInput, responseStyle = 'concise') => {
  console.log('[AIRequest] analyzeWafRules called with:', {
    responseStyle,
    inputType: typeof wafInput,
    isArray: Array.isArray(wafInput),
    hasNodes: wafInput && typeof wafInput === 'object' && Array.isArray(wafInput.nodes),
    hasEdges: wafInput && typeof wafInput === 'object' && Array.isArray(wafInput.edges),
    nodeCount: wafInput && typeof wafInput === 'object' && Array.isArray(wafInput.nodes) ? wafInput.nodes.length : 'N/A',
    edgeCount: wafInput && typeof wafInput === 'object' && Array.isArray(wafInput.edges) ? wafInput.edges.length : 'N/A'
  });

  const styleInstruction = styleInstructions[responseStyle] || styleInstructions.concise;
  let userPrompt;
  if (wafInput && typeof wafInput === 'object' && Array.isArray(wafInput.nodes) && Array.isArray(wafInput.edges)) {
    console.log('[AIRequest] Using nodes and edges format:', {
      nodeCount: wafInput.nodes.length,
      edgeCount: wafInput.edges.length,
      sampleNode: wafInput.nodes[0] ? Object.keys(wafInput.nodes[0]) : 'N/A',
      sampleEdge: wafInput.edges[0] ? Object.keys(wafInput.edges[0]) : 'N/A'
    });
    userPrompt = `Analyze these AWS WAF rules and their dependencies.\nRules (nodes):\n${JSON.stringify(wafInput.nodes, null, 2)}\nDependencies (edges):\n${JSON.stringify(wafInput.edges, null, 2)}`;
  } else {
    console.log('[AIRequest] Using legacy array format:', {
      arrayLength: Array.isArray(wafInput) ? wafInput.length : 'N/A'
    });
    userPrompt = `Analyze these AWS WAF rules:\n${JSON.stringify(wafInput, null, 2)}`;
  }

  const systemPrompt =
    `Role: You are an expert in AWS WAF rules and AI Engineering. 
You are also a world-winning prize software engineer specializing in LLM models.

Action: Your task is to extract key details from a set of AWS WAF rules.
For each rule, return a JSON object containing:
  - "Type": The type of rule (e.g., ByteMatchStatement, RateBasedStatement, etc.).
  - "Condition": A human-readable explanation of the rule's effect.
  - "Dependencies": (if available) A list of rule IDs this rule depends on, based on the edges provided.

Context: The input is a JSON structure representing AWS WAF rules.
Each rule has a "Statement" key that contains the rule logic.
If edges are provided, they represent dependencies between rules (source -> target means source depends on target).
Analyze the rule and convert it into a concise, meaningful description, including dependencies if present.

Execution: Follow these steps:
  1. Identify the rule type from the "Statement" key.
  2. Generate a brief but informative description of what the rule does.
  3. If edges are provided, list the dependencies for each rule by matching rule IDs.
  4. Always return a JSON response, even if no valid rule is found.
  5. Ensure the JSON output always includes "Type" and "Condition". If dependencies are present, include a "Dependencies" array.

Additional Instruction: ${styleInstruction}

Example Output:
{
  "rules": [
    {
      "Type": "ByteMatchStatement",
      "Condition": "Matches if the request URI path starts with /path1/.",
      "Dependencies": ["rule-2", "rule-3"]
    },
    {
      "Type": "RateBasedStatement",
      "Condition": "Tracks requests by IP with a limit of 100 requests per 60 seconds.",
      "Dependencies": []
    }
  ]
}`;

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(response.choices[0].message.content);
    console.log('[AIRequest] AI response received:', {
      hasRules: !!analysisResult?.rules,
      ruleCount: analysisResult?.rules?.length || 0,
      hasError: !!analysisResult?.error,
      sampleRule: analysisResult?.rules?.[0] ? Object.keys(analysisResult.rules[0]) : 'N/A'
    });
    return analysisResult;
  } catch (error) {
    console.error("Error processing WAF rules:", error);
    return { error: "Failed to analyze WAF rules." };
  }
}