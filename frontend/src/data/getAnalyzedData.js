import { analyzeWafRules } from "./AIRequest";

export default async function getAnalyzedData(data, responseStyle = 'concise') {
    // Accept either an array (legacy) or an object with nodes and edges
    let hashKey;
    if (Array.isArray(data)) {
        hashKey = btoa(JSON.stringify(data)).slice(0, 16);
    } else if (data && typeof data === 'object' && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        hashKey = btoa(JSON.stringify({ nodes: data.nodes, edges: data.edges })).slice(0, 16);
    } else {
        throw new Error('Invalid input: must be an array or an object with nodes and edges');
    }

    const cachedData = localStorage.getItem(hashKey);

    try {
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        // Pass both nodes and edges to analyzeWafRules
        const response = await analyzeWafRules(data, responseStyle);
        if (response.error) {
            return { rules: [] };
        }

        localStorage.setItem(hashKey, JSON.stringify(response));
        return response;
    } catch (error) {
        console.error('Error in getAnalyzedData:', error);
        return { rules: [] };
    }
}