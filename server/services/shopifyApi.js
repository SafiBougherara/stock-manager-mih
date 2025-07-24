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
// Fonction utilitaire pour récupérer les niveaux de stock par emplacement
async function getInventoryLevels(inventoryItemId) {
  try {
    const response = await shopifyApi.get(`/inventory_levels.json?inventory_item_ids=${inventoryItemId}`);
    return response.data.inventory_levels.map(level => ({
      location_id: level.location_id,
      location_name: level.location_name || `Location ${level.location_id}`,
      available: level.available
    }));
  } catch (error) {
    console.error('Error fetching inventory levels:', error);
    return [];
  }
}

export async function getProducts() {
  try {
    const res = await shopifyApi.get('/products.json?status=active');
    
    // Récupérer tous les inventory_item_id uniques
    const allInventoryItemIds = [...new Set(
      res.data.products.flatMap(p => 
        p.variants.map(v => v.inventory_item_id)
      )
    )];

    // Récupérer les niveaux de stock pour tous les items en une seule requête
    const inventoryLevelsMap = new Map();
    if (allInventoryItemIds.length > 0) {
      const inventoryResponse = await shopifyApi.get(
        `/inventory_levels.json?inventory_item_ids=${allInventoryItemIds.join(',')}`
      );
      
      // Créer une map pour un accès rapide par inventory_item_id
      inventoryResponse.data.inventory_levels.forEach(level => {
        if (!inventoryLevelsMap.has(level.inventory_item_id)) {
          inventoryLevelsMap.set(level.inventory_item_id, []);
        }
        inventoryLevelsMap.get(level.inventory_item_id).push({
          location_id: level.location_id,
          location_name: level.location_name || `Location ${level.location_id}`,
          available: level.available
        });
      });
    }

    // Construire la réponse enrichie avec tous les champs natifs Shopify + stock par emplacement
    return res.data.products.map(product => ({
      ...product, // tous les champs natifs Shopify (id, title, vendor, images, etc)
      variants: product.variants.map(variant => ({
        ...variant, // tous les champs natifs de la variante
        inventory_by_location: inventoryLevelsMap.get(variant.inventory_item_id) || []
      }))
    }));
  } catch (error) {
    console.error('Shopify API Error in getProducts:', error.response?.data || error.message);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
}

/**
 * Met à jour le stock d'une variante de produit pour un emplacement spécifique
 * @param {string} variantId - ID de la variante à mettre à jour
 * @param {string} locationId - ID de l'emplacement à mettre à jour
 * @param {number} quantity - Nouvelle quantité en stock
 * @returns {Promise<Object>} Réponse de l'API Shopify
 */
export async function updateStock(variantId, locationId, quantity) {
  try {
    // D'abord, on récupère les informations de la variante pour obtenir l'inventory_item_id
    const variantResponse = await shopifyApi.get(`/variants/${variantId}.json`);
    const inventoryItemId = variantResponse.data.variant.inventory_item_id;
    
    // Si aucun locationId n'est fourni, on récupère le premier disponible
    let targetLocationId = locationId;
    if (!targetLocationId) {
      const levels = await getInventoryLevels(inventoryItemId);
      if (levels.length === 0) {
        throw new Error('No inventory location found for this product');
      }
      targetLocationId = levels[0].location_id;
    }
    
    // Mise à jour du niveau d'inventaire
    const response = await shopifyApi.post('/inventory_levels/set.json', {
      location_id: targetLocationId,
      inventory_item_id: inventoryItemId,
      available: parseInt(quantity, 10)
    });
    
    return response.data;
  } catch (error) {
    console.error('Shopify API Error in updateStock:', error.response?.data || error.message);
    throw new Error(`Failed to update stock: ${error.message}`);
  }
}
