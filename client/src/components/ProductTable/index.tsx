/**
 * Composant principal pour l'affichage et la gestion du tableau des produits
 * 
 * Ce composant permet de :
 * - Afficher la liste des produits avec leurs variantes et stocks
 * - Filtrer les produits par différents critères
 * - Mettre à jour les quantités en stock
 * - Afficher les produits en faible stock
 */

// Importations des dépendances
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Pour la gestion des requêtes et du cache
import { toast } from 'react-hot-toast'; // Pour les notifications
import type { Product, ProductVariant, ProductImage } from './types'; // Types TypeScript
import './index.css'; // Styles CSS du composant

/**
 * Récupère l'image principale d'un produit
 * @param product - Le produit dont on veut l'image
 * @returns L'image principale ou null si aucune image n'est disponible
 */
const getProductImage = (product: Product): ProductImage | null => {
  if (product.image) return product.image;
  if (product.images && product.images.length > 0) return product.images[0];
  return null;
};

/**
 * Récupère l'image spécifique d'une variante de produit
 * @param product - Le produit parent
 * @param variant - La variante dont on veut l'image
 * @returns L'image de la variante ou null si non trouvée
 */
const getVariantImage = (product: Product, variant: ProductVariant): ProductImage | null => {
  if (!variant.image_id) return null;
  return product.images.find(img => img.id === variant.image_id) || null;
};

// Interface pour les données de mise à jour de stock
interface StockUpdateData {
  variantId: number;       // ID de la variante à mettre à jour
  locationId: number;      // ID de l'emplacement de stockage
  quantity: number;        // Nouvelle quantité en stock
}

// Interface pour l'état d'édition du stock
interface EditingStockState {
  variantId: number | null;  // ID de la variante en cours d'édition
  locationId: number | null; // ID de l'emplacement en cours d'édition
  value: string;             // Valeur temporaire pendant l'édition
}

const ProductTable: React.FC = () => {
  // État pour afficher/masquer la liste des produits en faible stock
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Client de requête pour gérer le cache
  const queryClient = useQueryClient();
  
  // État pour gérer le tri
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'title', direction: 'ascending' });

  // État pour gérer l'édition du stock
  const [editingStock, setEditingStock] = useState<EditingStockState>({
    variantId: null,
    locationId: null,
    value: ''
  });

  // Récupération des produits depuis l'API
  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      console.log('🔄 Récupération des produits depuis le serveur...');
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        console.error('❌ Erreur lors du chargement des produits:', await response.text());
        throw new Error('Erreur lors du chargement des produits');
      }
      const data = await response.json();
      console.log('✅ Produits reçus:', data);
      return data;
    },
  });

  // Stock optimiste pour une mise à jour immédiate de l'UI pendant la requête
  // Clé: 'variantId-locationId', Valeur: quantité temporaire
  const [optimisticStock, setOptimisticStock] = useState<{ [key: string]: number | undefined }>({});

  // Mutation pour mettre à jour le stock d'une variante
  const updateStockMutation = useMutation({
    mutationFn: async ({ variantId, locationId, quantity }: StockUpdateData) => {
      console.log(`🔄 Tentative de mise à jour du stock pour la variante ${variantId} à ${quantity}`);
      const stockKey = `${variantId}-${locationId}`;
      setOptimisticStock((prev) => ({ ...prev, [stockKey]: quantity })); // Optimistic update
      const response = await fetch(`http://localhost:5000/api/products/${variantId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity, locationId }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('❌ Erreur lors de la mise à jour du stock:', error);
        throw new Error(error.error || 'Erreur lors de la mise à jour du stock');
      }
      const data = await response.json().catch(() => ({}));
      console.log('✅ Réponse de la mise à jour du stock:', data);
      return { ...data, variantId, quantity };
    },
    onSuccess: (_, variables) => {
      const stockKey = `${variables.variantId}-${variables.locationId}`;
      setOptimisticStock((prev) => {
        const copy = { ...prev };
        delete copy[stockKey];
        return copy;
      });
      queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'active' });
      toast.success('Stock confirmé sur Shopify !');
      setEditingStock({ variantId: null, locationId: null, value: '' });
    },
    onError: (error: Error, variables) => {
      setOptimisticStock((prev) => {
        const copy = { ...prev };
        delete copy[variables.variantId];
        return copy;
      });

      console.error('❌ Erreur dans la mutation:', error);
      toast.error(error.message);
    },
  });

  /**
   * Gère la mise à jour du stock d'une variante
   * @param variantId - ID de la variante à mettre à jour
   * @param locationId - ID de l'emplacement de stockage
   */
  const handleStockUpdate = (variantId: number, locationId: number) => {
    if (editingStock.value.trim() === '') return;
    const quantity = parseInt(editingStock.value, 10);
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Veuillez entrer une quantité valide');
      return;
    }
    updateStockMutation.mutate({ variantId, locationId, quantity });
  };

  /**
   * Gère les événements clavier pendant l'édition du stock
   * @param e - Événement clavier
   * @param variantId - ID de la variante en cours d'édition
   * @param locationId - ID de l'emplacement en cours d'édition
   */
  const handleKeyPress = (e: React.KeyboardEvent, variantId: number, locationId: number) => {
    if (e.key === 'Enter') {
      handleStockUpdate(variantId, locationId);
    } else if (e.key === 'Escape') {
      setEditingStock({ variantId: null, locationId: null, value: '' });
    }
  };

  /**
   * Vérifie si une cellule de stock est en cours d'édition
   * @param variantId - ID de la variante à vérifier
   * @param locationId - ID de l'emplacement à vérifier
   * @returns true si la cellule est en cours d'édition, false sinon
   */
  const isEditing = (variantId: number, locationId: number) => {
    return editingStock.variantId === variantId && editingStock.locationId === locationId;
  };

  // État pour les filtres de la table
  const [filters, setFilters] = useState({
    name: '',
    vendor: '',
    type: '',
    tag: '',
    minStock: ''
  });

  // Fonction de tri des produits
  const sortProducts = (products: Product[]) => {
    const sortedProducts = [...products];
    if (!sortConfig.key) return sortedProducts;

    sortedProducts.sort((a, b) => {
      // Gestion spéciale pour le tri par stock (nécessite d'accéder aux variantes)
      if (sortConfig.key === 'stock') {
        const aStock = a.variants.reduce((acc, v) => 
          acc + v.inventory_by_location.reduce((sum, loc) => sum + loc.available, 0), 0);
        const bStock = b.variants.reduce((acc, v) => 
          acc + v.inventory_by_location.reduce((sum, loc) => sum + loc.available, 0), 0);
        
        if (aStock < bStock) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aStock > bStock) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      }

      // Tri standard pour les autres propriétés
      const aValue = a[sortConfig.key as keyof Product];
      const bValue = b[sortConfig.key as keyof Product];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sortedProducts;
  };

  // Fonction pour gérer le clic sur un en-tête de colonne
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Fonction pour obtenir la classe de tri
  const getSortDirection = (key: string) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';
  };

  // Filtrage des produits en fonction des critères sélectionnés
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
    if (filters.name && !product.title.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.vendor && !product.vendor?.toLowerCase().includes(filters.vendor.toLowerCase())) return false;
    if (filters.type && !product.product_type?.toLowerCase().includes(filters.type.toLowerCase())) return false;
    if (filters.tag && !(product.tags || '').toLowerCase().includes(filters.tag.toLowerCase())) return false;
    if (filters.minStock) {
      // Vérifie si au moins une variante a un stock >= minStock
      const min = parseInt(filters.minStock, 10);
      const hasStock = product.variants.some(variant =>
        variant.inventory_by_location.some(loc => loc.available >= min)
      );
      if (!hasStock) return false;
    }
      return true;
    });

    return sortProducts(filtered);
  }, [products, filters, sortConfig]);

  // Filtre les produits ayant au moins une variante en stock faible (<= 0)
  const lowStockProducts = products.filter(product =>
    product.variants.some(variant =>
      variant.inventory_by_location.some(location => location.available <= 0)
    )
  );

  // Affichage pendant le chargement
  if (isLoading) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Erreur: {error.message}
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn btn-secondary mb-12"
        onClick={() => setShowLowStock(v => !v)}
      >
        {showLowStock ? 'Masquer la liste des produits en faible stock' : 'Voir les produits en faible stock'}
      </button>
      {/* Panneau des produits en faible stock */}
      <div className={`low-stock-list${showLowStock ? ' open' : ''} mb-18`}>
        {showLowStock && (
          lowStockProducts.length > 0 ? (
            <ul className="low-stock-panel">
              <b>{lowStockProducts.length} produit(s) en faible stock (moins de 10 unités):</b>
              {lowStockProducts.map(product => (
                <li key={product.id}>
                  {product.title}
                  {product.variants.map(variant =>
                    variant.inventory_by_location
                      .filter(location => location.available < 10)
                      .map(location => (
                        <span key={`${variant.id}-${location.location_id}`}>
                          — {variant.title} (Stock: {location.available})
                        </span>
                      ))
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="low-stock-empty">Aucun produit en faible stock.</div>
          )
        )}
      </div>
      {/* Barre de filtres pour la table */}
      <div className="table-filters">
        <input
          type="text"
          placeholder="Filtrer par nom..."
          value={filters.name}
          onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
          className="filter-input"
        />
        <input
          type="text"
          placeholder="Filtrer par vendeur..."
          value={filters.vendor}
          onChange={e => setFilters(f => ({ ...f, vendor: e.target.value }))}
          className="filter-input"
        />
        <input
          type="text"
          placeholder="Filtrer par type..."
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="filter-input"
        />
        <input
          type="text"
          placeholder="Filtrer par tag..."
          value={filters.tag}
          onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}
          className="filter-input"
        />
        <input
          type="number"
          min="0"
          placeholder="Stock min..."
          value={filters.minStock}
          onChange={e => setFilters(f => ({ ...f, minStock: e.target.value }))}
          className="filter-input filter-input-number"
        />
        <button
          className="btn btn-secondary ml-12"
          onClick={() => setFilters({ name: '', vendor: '', type: '', tag: '', minStock: '' })}
        >
          Réinitialiser
        </button>
      </div>
      {/* Conteneur principal du tableau avec défilement horizontal */}
      <div className="overflow-x-auto">
        <table className="product-table">
          <thead>
            <tr>
              <th 
                className={`sortable ${getSortDirection('title')}`} 
                onClick={() => requestSort('title')}
              >
                Produit
                <span className="sort-arrow">{sortConfig.key === 'title' ? (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓') : ''}</span>
              </th>
              <th 
                className={`sortable ${getSortDirection('vendor')}`} 
                onClick={() => requestSort('vendor')}
              >
                Vendeur
                <span className="sort-arrow">{sortConfig.key === 'vendor' ? (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓') : ''}</span>
              </th>
              <th 
                className={`sortable ${getSortDirection('product_type')}`} 
                onClick={() => requestSort('product_type')}
              >
                Type
                <span className="sort-arrow">{sortConfig.key === 'product_type' ? (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓') : ''}</span>
              </th>
              <th 
                className={`sortable ${getSortDirection('tags')}`} 
                onClick={() => requestSort('tags')}
              >
                Tags
                <span className="sort-arrow">{sortConfig.key === 'tags' ? (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓') : ''}</span>
              </th>
              <th>Options</th>
              <th>Variante</th>
              <th>SKU</th>
              <th 
                className={`sortable ${getSortDirection('price')}`} 
                onClick={() => requestSort('price')}
              >
                Prix
                <span className="sort-arrow">{sortConfig.key === 'price' ? (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓') : ''}</span>
              </th>
              <th>Emplacement</th>
              <th 
                className={`sortable ${getSortDirection('stock')}`} 
                onClick={() => requestSort('stock')}
              >
                Stock
                <span className="sort-arrow">{sortConfig.key === 'stock' ? (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓') : ''}</span>
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <React.Fragment key={product.id}>
                <tr>
                  <td>
                    {(() => {
                      const img = getProductImage(product);
                      return img ? (
                        <img src={img.src} alt={img.alt || product.title} className="product-image" />
                      ) : (
                        <div className="product-image empty-image-placeholder">?</div>
                      );
                    })()}
                    <div className="product-title">{product.title}</div>
                  </td>
                  <td>{product.vendor}</td>
                  <td>{product.product_type}</td>
                  <td>
                    {product.tags ? (
                      <span className="badge">{product.tags}</span>
                    ) : (
                      <span className="empty-cell">—</span>
                    )}
                  </td>
                  <td>
                    {product.options?.length ? (
                      <div>
                        {product.options.map(opt => (
                          <div key={opt.id} className="product-option">
                            <b>{opt.name}:</b> {opt.values.join(', ')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="empty-cell">—</span>
                    )}
                  </td>
                  <td colSpan={6}></td>
                </tr>
                {product.variants.map((variant) =>
                  variant.inventory_by_location.length > 0 && variant.inventory_by_location.map((location) => (
                    <tr key={`${variant.id}-${location.location_id}`}>
                      <td colSpan={5}></td>
                      <td>
                        {(() => {
                          const img = getVariantImage(product, variant);
                          return img ? (
                            <img src={img.src} alt={img.alt || variant.title} className="product-image" />
                          ) : null;
                        })()}
                        <span className="ml-8">{variant.title}</span>
                      </td>
                      <td>{variant.sku || <span className="empty-cell">—</span>}</td>
                      <td>{variant.price ? `${parseFloat(variant.price).toFixed(2)} €` : <span className="empty-cell">—</span>}</td>
                      <td>{location.location_name}</td>
                      <td>
                        {isEditing(variant.id, location.location_id) ? (
                          <div className="edit-controls">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={editingStock.value}
                                onChange={e => setEditingStock({ variantId: variant.id, locationId: location.location_id, value: e.target.value })}
                                onKeyDown={e => handleKeyPress(e, variant.id, location.location_id)}
                                className="edit-input"
                                autoFocus
                              />
                              <div className="number-controls number-controls-container">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const newValue = Math.max(0, parseInt(editingStock.value || '0', 10) + 1);
                                    setEditingStock({ 
                                      variantId: variant.id, 
                                      locationId: location.location_id, 
                                      value: newValue.toString() 
                                    });
                                  }}
                                >
                                  ▲
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const newValue = Math.max(0, parseInt(editingStock.value || '0', 10) - 1);
                                    setEditingStock({ 
                                      variantId: variant.id, 
                                      locationId: location.location_id, 
                                      value: newValue.toString() 
                                    });
                                  }}
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <button
                              className="btn btn-primary btn-nowrap"
                              onClick={() => handleStockUpdate(variant.id, location.location_id)}
                              disabled={updateStockMutation.isPending}
                            >
                              {updateStockMutation.isPending ? '...' : 'OK'}
                            </button>
                            <button
                              className="btn btn-secondary btn-nowrap"
                              onClick={() => setEditingStock({ variantId: null, locationId: null, value: '' })}
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <span>{optimisticStock[`${variant.id}-${location.location_id}`] ?? location.available}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          onClick={() => setEditingStock({ variantId: variant.id, locationId: location.location_id, value: location.available.toString() })}
                          disabled={editingStock.variantId !== null}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                <tr className="product-separator"><td colSpan={11}></td></tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default ProductTable;
