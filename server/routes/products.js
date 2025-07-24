import express from 'express';
import { getProducts, updateStock } from '../services/shopifyApi.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

router.put('/:variantId/stock', async (req, res) => {
  const { quantity } = req.body;
  try {
    await updateStock(req.params.variantId, quantity);
    res.json({ message: 'Stock updated successfully' });
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(500).json({ 
      error: 'Failed to update stock', 
      details: err.message 
    });
  }
});

export default router;
