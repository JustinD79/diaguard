import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

interface NutritionData {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugars: number;
  sodium: number;
  servingSize: string;
  servingWeight: number;
}

interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  nutrition: NutritionData;
  verified: boolean;
  source: string;
  imageUrl?: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // API Key validation
    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey || !await validateApiKey(apiKey)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route handling
    if (path === '/scan' && req.method === 'POST') {
      return await handleScan(req);
    } else if (path === '/portion' && req.method === 'POST') {
      return await handlePortion(req);
    } else if (path.startsWith('/product/') && req.method === 'GET') {
      const productId = path.split('/')[2];
      return await handleGetProduct(productId);
    } else if (path === '/search' && req.method === 'GET') {
      const query = url.searchParams.get('q');
      return await handleSearch(query);
    } else {
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, is_active, rate_limit, last_used_at')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    // Update last_used_at timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return true;
  } catch {
    return false;
  }
}


async function handleScan(req: Request): Promise<Response> {
  const { barcode, image } = await req.json();

  if (barcode) {
    return await scanBarcode(barcode);
  } else if (image) {
    return await recognizeFood(image);
  } else {
    return new Response(
      JSON.stringify({ error: 'Either barcode or image is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function scanBarcode(barcode: string): Promise<Response> {
  try {
    // First check our local database
    const { data: localProduct } = await supabase
      .from('food_products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (localProduct) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          product: formatProduct(localProduct),
          source: 'local_database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Open Food Facts API
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const offData = await offResponse.json();

    if (offData.status === 1 && offData.product) {
      const product = await processOpenFoodFactsProduct(offData.product, barcode);
      
      // Store in our database for future use
      await supabase.from('food_products').insert(product);

      return new Response(
        JSON.stringify({ 
          success: true, 
          product: formatProduct(product),
          source: 'open_food_facts'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try USDA FoodData Central as fallback
    const usdaProduct = await queryUSDADatabase(barcode);
    if (usdaProduct) {
      await supabase.from('food_products').insert(usdaProduct);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          product: formatProduct(usdaProduct),
          source: 'usda_fooddata'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Product not found in any database' 
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Barcode scan error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to scan barcode' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function recognizeFood(imageBase64: string): Promise<Response> {
  try {
    // Simulate AI food recognition (in production, use TensorFlow.js or external ML API)
    const recognitionResult = await simulateFoodRecognition(imageBase64);
    
    if (recognitionResult.confidence > 0.7) {
      // Search for the recognized food in our database
      const { data: products } = await supabase
        .from('food_products')
        .select('*')
        .ilike('name', `%${recognitionResult.foodName}%`)
        .limit(5);

      if (products && products.length > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            recognition: recognitionResult,
            products: products.map(formatProduct),
            source: 'ai_recognition'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Could not recognize food with sufficient confidence',
        recognition: recognitionResult
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Food recognition error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to recognize food' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handlePortion(req: Request): Promise<Response> {
  const { productId, portionSize, portionUnit } = await req.json();

  if (!productId || !portionSize) {
    return new Response(
      JSON.stringify({ error: 'Product ID and portion size are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: product, error } = await supabase
      .from('food_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adjustedNutrition = calculatePortionNutrition(
      product.nutrition,
      product.serving_weight || 100,
      portionSize,
      portionUnit || 'g'
    );

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          ...formatProduct(product),
          adjustedNutrition,
          requestedPortion: { size: portionSize, unit: portionUnit || 'g' }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Portion calculation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate portion nutrition' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetProduct(productId: string): Promise<Response> {
  try {
    const { data: product, error } = await supabase
      .from('food_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, product: formatProduct(product) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get product error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve product' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSearch(query: string | null): Promise<Response> {
  if (!query || query.length < 2) {
    return new Response(
      JSON.stringify({ error: 'Search query must be at least 2 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: products, error } = await supabase
      .from('food_products')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(20);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: products?.map(formatProduct) || [],
        count: products?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processOpenFoodFactsProduct(offProduct: any, barcode: string): Promise<any> {
  const nutrition = offProduct.nutriments || {};
  
  return {
    id: crypto.randomUUID(),
    barcode,
    name: offProduct.product_name || 'Unknown Product',
    brand: offProduct.brands || 'Unknown Brand',
    nutrition: {
      calories: parseFloat(nutrition.energy_kcal_100g) || 0,
      carbs: parseFloat(nutrition.carbohydrates_100g) || 0,
      protein: parseFloat(nutrition.proteins_100g) || 0,
      fat: parseFloat(nutrition.fat_100g) || 0,
      fiber: parseFloat(nutrition.fiber_100g) || 0,
      sugars: parseFloat(nutrition.sugars_100g) || 0,
      sodium: parseFloat(nutrition.sodium_100g) || 0,
    },
    serving_size: offProduct.serving_size || '100g',
    serving_weight: 100,
    image_url: offProduct.image_url,
    verified: true,
    source: 'open_food_facts',
    created_at: new Date().toISOString()
  };
}

async function queryUSDADatabase(barcode: string): Promise<any | null> {
  // Simulate USDA API query (would need actual API key in production)
  // This is a placeholder for the actual USDA FoodData Central API integration
  return null;
}

async function simulateFoodRecognition(imageBase64: string): Promise<any> {
  // Simulate AI food recognition
  // In production, this would use TensorFlow.js, Google Vision API, or similar
  const foods = [
    'apple', 'banana', 'chicken breast', 'salmon', 'broccoli', 
    'rice', 'pasta', 'bread', 'cheese', 'yogurt'
  ];
  
  const randomFood = foods[Math.floor(Math.random() * foods.length)];
  const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence
  
  return {
    foodName: randomFood,
    confidence,
    boundingBox: { x: 10, y: 10, width: 200, height: 200 },
    alternatives: foods.slice(0, 3).map(food => ({
      name: food,
      confidence: confidence - 0.1 - Math.random() * 0.2
    }))
  };
}

function calculatePortionNutrition(
  baseNutrition: any, 
  baseWeight: number, 
  portionSize: number, 
  portionUnit: string
): any {
  // Convert portion to grams if needed
  let portionInGrams = portionSize;
  if (portionUnit === 'oz') {
    portionInGrams = portionSize * 28.35;
  } else if (portionUnit === 'lb') {
    portionInGrams = portionSize * 453.592;
  }
  
  const ratio = portionInGrams / baseWeight;
  
  return {
    calories: Math.round(baseNutrition.calories * ratio),
    carbs: Math.round(baseNutrition.carbs * ratio * 10) / 10,
    protein: Math.round(baseNutrition.protein * ratio * 10) / 10,
    fat: Math.round(baseNutrition.fat * ratio * 10) / 10,
    fiber: Math.round(baseNutrition.fiber * ratio * 10) / 10,
    sugars: Math.round(baseNutrition.sugars * ratio * 10) / 10,
    sodium: Math.round(baseNutrition.sodium * ratio * 10) / 10,
  };
}

function formatProduct(product: any): Product {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    nutrition: product.nutrition,
    verified: product.verified || false,
    source: product.source || 'unknown',
    imageUrl: product.image_url
  };
}