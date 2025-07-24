import express from 'express';
import { getProducts, updateStock } from '../services/shopifyApi.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('🔍 Requête GET /api/products reçue');
    const products = await getProducts();
    console.log(`📦 ${products.length} produits récupérés`);
    res.json(products);
  } catch (err) {
    console.error('❌ Erreur lors de la récupération des produits:', err);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

router.put('/:variantId/stock', async (req, res) => {
  const { quantity, locationId } = req.body;
  const { variantId } = req.params;
  
  console.log(`🔄 Requête PUT /api/products/${variantId}/stock reçue`, { quantity, locationId });
  
  try {
    console.log(`⚙️ Tentative de mise à jour du stock pour la variante ${variantId} à ${quantity} sur l'emplacement ${locationId}`);
    const result = await updateStock(variantId, locationId, quantity);
    console.log(`✅ Stock mis à jour avec succès`, result);
    
    // Renvoyer les données mises à jour
    const updatedProducts = await getProducts();
    res.json({ 
      message: 'Stock updated successfully',
      updatedVariantId: variantId,
      newQuantity: quantity,
      updatedLocationId: locationId,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(`❌ Erreur lors de la mise à jour du stock pour la variante ${variantId}:`, err);
    res.status(500).json({ 
      error: 'Failed to update stock', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
