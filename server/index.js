import dotenv from 'dotenv';
// Charger les variables d'environnement en premier
dotenv.config();

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Importer les routes après avoir chargé dotenv
import productRoutes from './routes/products.js';
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Shop URL:', process.env.SHOPIFY_SHOP_NAME);
});