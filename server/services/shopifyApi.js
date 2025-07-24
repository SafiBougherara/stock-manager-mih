import axios from 'axios';
import dotenv from 'dotenv';

// Charger les variables d'environnement
const env = dotenv.config().parsed || process.env;

// Récupérer les variables d'environnement
const SHOPIFY_ACCESS_TOKEN = env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_SHOP_NAME = env.SHOPIFY_SHOP_NAME;

// Vérification des variables d'environnement requises
if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_SHOP_NAME) {
  console.error('Missing required environment variables:');
  console.error(`- SHOPIFY_ACCESS_TOKEN: ${SHOPIFY_ACCESS_TOKEN ? 'Set' : 'Missing'}`);
  console.error(`- SHOPIFY_SHOP_NAME: ${SHOPIFY_SHOP_NAME ? 'Set' : 'Missing'}`);
  throw new Error('Missing required Shopify environment variables');
}

console.log(`Connecting to Shopify store: ${SHOPIFY_SHOP_NAME}`);

const shopifyApi = axios.create({
  baseURL: `https://${SHOPIFY_SHOP_NAME}/admin/api/2024-04`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
});

/**
 * Récupère la liste des produits avec leurs variantes
 * @returns {Promise<Array>} Liste des produits
 */
export async function getProducts() {
  try {
    const res = await shopifyApi.get('/products.json?status=active');
    
    return res.data.products.map(product => ({
      id: product.id,
      title: product.title,
      status: product.status,
      variants: product.variants.map(variant => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        price: variant.price,
        inventory_quantity: variant.inventory_quantity,
        inventory_item_id: variant.inventory_item_id,
      })),
    }));
  } catch (error) {
    console.error('Shopify API Error in getProducts:', error.response?.data || error.message);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
}

/**
 * Met à jour le stock d'une variante de produit
 * @param {string} variantId - ID de la variante à mettre à jour
 * @param {number} quantity - Nouvelle quantité en stock
 * @returns {Promise<Object>} Réponse de l'API Shopify
 */
export async function updateStock(variantId, quantity) {
  try {
    // D'abord, on récupère les informations de la variante pour obtenir l'inventory_item_id
    const variantResponse = await shopifyApi.get(`/variants/${variantId}.json`);
    const inventoryItemId = variantResponse.data.variant.inventory_item_id;
    
    // Ensuite, on récupère les niveaux d'inventaire actuels
    const inventoryLevelsResponse = await shopifyApi.get(
      `/inventory_levels.json?inventory_item_ids=${inventoryItemId}`
    );
    
    const locationId = inventoryLevelsResponse.data.inventory_levels[0]?.location_id;
    
    if (!locationId) {
      throw new Error('No inventory location found for this product');
    }
    
    // Enfin, on met à jour le niveau d'inventaire
    const response = await shopifyApi.post('/inventory_levels/set.json', {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available: parseInt(quantity, 10)
    });
    
    return response.data;
  } catch (error) {
    console.error('Shopify API Error in updateStock:', error.response?.data || error.message);
    throw new Error(`Failed to update stock: ${error.message}`);
  }
}
