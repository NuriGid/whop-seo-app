import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Whop API Key (use WHOP_CLIENT_SECRET from .env as API key)
const WHOP_API_KEY = process.env.WHOP_CLIENT_SECRET || process.env.WHOP_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// OAuth Configuration
const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID || '';
const WHOP_REDIRECT_URI = process.env.WHOP_REDIRECT_URI || '';

if (!WHOP_API_KEY) {
  console.warn('⚠️  WHOP_API_KEY is not set in .env file!');
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is not set in .env file!');
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// OAuth Endpoints

// GET /auth - Start Whop OAuth connection
app.get('/auth', (req: Request, res: Response) => {
  console.log('🔑 Starting OAuth flow...');
  
  // MANUAL SCOPE - Fixed string without dashboard selection
  const scope = 'openid profile email company.products.read company.products.write';
  
  const authUrl = `https://whop.com/oauth?client_id=${WHOP_CLIENT_ID}&redirect_uri=${encodeURIComponent(WHOP_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  
  console.log('🔗 Redirect URL:', authUrl);
  res.redirect(authUrl);
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// GET /api/auth/callback - OAuth callback from Whop
app.get('/api/auth/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing!' });
  console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
  
  console.log('✅ Authorization code received:', code);
  
  // Redirect to frontend (with code)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}?code=${code}`);
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// GET /api/products endpoint - Fetch products using API Key
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    if (!WHOP_API_KEY) {
      return res.status(500).json({ 
        error: 'WHOP_API_KEY is not configured on server' 
      console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    console.log('📚 Fetching products from Whop API...');

    // Send request to Whop API - use company/products endpoint
    const response = await fetch('https://api.whop.com/api/v5/company/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    console.log('Whop API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Whop API error:', errorText);
      return res.status(response.status).json({
        error: `Whop API error: ${response.statusText}`,
        details: errorText
      console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    // Return product list from Whop API as JSON
    const productsResponse = await response.json();
    console.log('📦 Full API Response:', JSON.stringify(productsResponse, null, 2));
    
    // Fetch detailed info for each product (for description)
    if (productsResponse.data && Array.isArray(productsResponse.data)) {
      console.log('🔍 Fetching detailed info for each product...');
      const detailedProducts = await Promise.all(
        productsResponse.data.map(async (product: any) => {
          try {
            const detailResponse = await fetch(`https://api.whop.com/api/v5/company/products/${product.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Content-Type': 'application/json'
              console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
            console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
            
            if (detailResponse.ok) {
              const detailedProduct = await detailResponse.json();
              console.log(`✅ Detailed info for ${product.name}:`, detailedProduct);
              return detailedProduct;
            console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
            return product;
          } catch (err) {
            console.error(`❌ Error fetching details for ${product.name}:`, err);
            return product;
          console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
        console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
      );
      
      productsResponse.data = detailedProducts;
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
    
    console.log('✅ Products fetched successfully:', productsResponse.data?.length || 0, 'items');
    res.json(productsResponse);

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching products' 
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
  console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// POST /api/update-product - X-RAY MODE (VIEW ALL FIELD NAMES)
app.post('/api/update-product', async (req: Request, res: Response) => {
  console.log("🕵️‍♂️ X-RAY MODE: Fetching ALL product data...");

  try {
    const { productId } = req.body;
    const API_KEY = "apik_BiNzpVl7PWsOi_C3742126_C_3b290d66a02a38575f53712e85ae9a5aae707f193a611a1f9f5fcb5f6238f7"; 

    // GET ONLY - View all product fields
    const url = `https://api.whop.com/v5/company/products/${productId}`;

    console.log("🔗 Request URL:", url);

    const response = await fetch(url, {
      method: 'GET', // Read only
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    console.log("📡 HTTP Status Code:", response.status);

    const responseText = await response.text();
    console.log("\n\u274c\u274c\u274c RÖNTGEN SONUCU - TÜM ALAN ADLARI \u274c\u274c\u274c");
    console.log(responseText);
    console.log("\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\u274c\n");

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    // Parse JSON and display
    const productData = JSON.parse(responseText);
    
    res.json({ 
      success: true, 
      message: "X-ray completed! Check terminal.",
      allFields: Object.keys(productData),
      fullData: productData
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    res.status(500).json({ error: error.message });
  console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// POST /api/analyze endpoint - WITH HARDCODED KEY
app.post('/api/analyze', async (req: Request, res: Response) => {
  console.log("⚡️ Analysis request: Trying Gemini models...");
  
  try {
    const { prompt } = req.body;
    // HARDCODED KEY - Direct here (3rd ATTEMPT)
    const apiKey = "AIzaSyBYyK5KdEYc7aRkQSc_ePdnNwtxZ-QzgII";

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key missing!' });
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    // FALLBACK STRATEGY: Try in order (UPDATED MODEL NAMES)
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-pro-preview-03-25',
      'gemini-1.5-flash',
      'gemini-pro'
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`🔍 Trying ${modelName}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert in marketing and SEO for online courses on Whop.com.

Analyze this course description and return ONLY valid JSON in this exact format:
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "categories": ["Category 1", "Category 2", "Category 3"]
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

Choose categories from: Trading & Investing, E-commerce, Software & Tools, Fitness & Health, Education, Gaming, Crypto & NFTs, Social Media Marketing, Cooking, Music Production

Course Description:
${prompt}` 
              console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
            console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
          console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
        console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

        if (!response.ok) {
          const errData = await response.json();
          
          // 404 = Model not found, try next
          if (response.status === 404) {
            console.log(`❌ ${modelName} not found, trying next...`);
            lastError = `${modelName} not found`;
            continue;
          console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
          
          // 429 = Rate limit
          if (response.status === 429) {
            throw new Error("Google: 'Slow down!' (wait 1 minute)");
          console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
          
          throw new Error(errData.error?.message || "Unknown API Error");
        console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

        // SUCCESS!
        const data = await response.json();
        const textAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textAnswer) {
          throw new Error("Google returned empty response.");
        console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

        const cleanedText = textAnswer.replace(/```json\n?|```\n?/g, '').trim();
        console.log(`✅ SUCCESS with ${modelName}!`);
        console.log("🟢 RESULT:", cleanedText);
        
        return res.json(JSON.parse(cleanedText));

      } catch (error: any) {
        // If not 404 (i.e., another error), throw it out
        if (!error.message?.includes('not found')) {
          throw error;
        console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
        lastError = error.message;
      console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    // None worked
    throw new Error(`No model worked. Last error: ${lastError}. Please get a new API Key.`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: error.message });
  console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Whop API Key configured: ${WHOP_API_KEY ? '✅ Yes' : '❌ No'}`);
  console.log(`🤖 Gemini API Key configured: ${GEMINI_API_KEY ? '✅ Yes' : '❌ No'}`);
console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

// --- DIAGNOSTIC TEST ---
// This code runs automatically when server starts
(async () => {
  console.log("\n🕵️‍♂️ AUTOMATIC DIAGNOSTIC TEST STARTING...");
  
  // Write your key here again to be sure
  const TEST_KEY = "apik_BiNzpVl7PWsOi_C3742126_C_3b290d66a02a38575f53712e85ae9a5aae707f193a611a1f9f5fcb5f6238f7";

  try {
    // 1. LIST PRODUCTS
    console.log("1️⃣ Listing products...");
    const listResp = await fetch('https://api.whop.com/v5/company/products', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${TEST_KEY}`, 'Content-Type': 'application/json' }
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    if (!listResp.ok) throw new Error(`List Error: ${listResp.status}`);
    const listData = await listResp.json();
    const products = listData.data || listData;

    console.log(`📦 Found Products: ${products.length}`);
    products.forEach((p: any) => console.log(`   🔸 Product: ${p.name} | ID: ${p.id}`));

    if (products.length === 0) {
        console.log("❌ Store EMPTY! Nothing to update.");
        return;
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    // 2. TRY TO UPDATE FIRST PRODUCT
    const targetProduct = products[0];
    console.log(`\n2️⃣ Test Update: '${targetProduct.name}' (${targetProduct.id})`);
    
    // Use V2 API (V5 doesn't support product updates!)
    const updateUrl = `https://api.whop.com/api/v2/products/${targetProduct.id}`;
    const updateResp = await fetch(updateUrl, {
        method: 'POST', // Try POST (sometimes requires POST instead of PUT)
        headers: { 'Authorization': `Bearer ${TEST_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: "This is an automatic test update." })
    console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");

    const updateText = await updateResp.text();
    console.log(`📩 Update Result (${updateResp.status}):`, updateText);

    if (updateResp.ok) console.log("✅ TEST SUCCESSFUL! Product updated.");
    else console.log("❌ TEST FAILED! Problem with address or authorization.");

  } catch (e: any) {
    console.error("💥 CRITICAL ERROR:", e.message);
  console.log("\n❌❌❌ X-RAY RESULT - ALL FIELD NAMES ❌❌❌");
  console.log("----------------------------------------\n");
})();