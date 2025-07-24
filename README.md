# Gestion des Stocks Shopify

Application de gestion des stocks pour les boutiques Shopify, offrant une interface pour visualiser et gérer les niveaux de stock en temps réel.

## 📋 Fonctionnalités

- 🔍 Visualisation des produits et de leurs stocks
- ✏️ Édition en ligne des quantités en stock
- ⚡ Mise à jour en temps réel via l'API Shopify
- 🔔 Alertes visuelles pour les stocks faibles (< 10 unités) (Alertes par mail automatisé via Shopify Flow)
- 🔍 Filtrage avancé (par nom, vendeur, type, tag, stock minimum)

## 🛠 Prérequis

- Node.js 16+ et npm 8+
- Compte Shopify avec accès développeur
- Application Shopify personnalisée avec les permissions nécessaires

## 🚀 Installation

### 1. Configuration du backend

1. Copiez le fichier d'environnement :
   ```bash
   cd server
   cp .env.example .env
   ```

2. Configurez les variables dans `.env` :
   ```env
   SHOPIFY_ACCESS_TOKEN=votre_token_shopify
   SHOPIFY_SHOP_NAME=votre-boutique.myshopify.com
   PORT=5000
   NODE_ENV=development
   ```

3. Installez les dépendances et lancez le serveur :
   ```bash
   npm install
   npm run dev
   ```

### 2. Configuration du frontend

1. Accédez au dossier client :
   ```bash
   cd ../client
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez l'application :
   ```bash
   npm run dev
   ```

4. L'application sera disponible sur : [http://localhost:5173](http://localhost:5173)

## 🔐 Configuration de l'application Shopify

1. Créez une application personnalisée dans l'admin Shopify :
   - Allez dans Paramètres > Applications > Développer des applications
   - Cliquez sur "Créer une application"
   - Activez les permissions suivantes :
     - `read_products`
     - `read_inventory`
     - `write_inventory`

2. Générez un token d'accès dans l'onglet "Configuration" de votre application

## 🛠 Structure du projet

```
.
├── client/                  # Application React
│   ├── public/
│   └── src/
│       ├── components/     # Composants React
│       ├── App.tsx         # Point d'entrée de l'application
│       └── main.tsx        # Configuration de React
│
├── server/                 # API Node.js/Express
│   ├── routes/            # Définition des routes API
│   ├── services/          # Logique métier
│   └── index.ts           # Point d'entrée du serveur
│
└── README.md              # Ce fichier
```

## 🚀 Déploiement

### Backend

1. Configurez les variables d'environnement en production :
   ```env
   NODE_ENV=production
   PORT=3000
   ```

2. Utilisez PM2 pour exécuter le serveur en production :
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "stock-manager"
   ```

### Frontend

1. Créez une version de production :
   ```bash
   cd client
   npm run build
   ```

2. Servez les fichiers statiques avec Nginx ou servez-les depuis un CDN.


## ⏱ Temps de développement

- **Backend** : ~2 heures
- **Frontend** : ~3 heures
- **Tests et débogage** : ~1 heure
- **Documentation** : ~1 heure

## 🛠 Améliorations futures

- [ ] Ajouter l'authentification utilisateur
- [ ] Implémenter un système de rôles et permissions
- [ ] Ajouter des graphiques d'analyse des stocks
- [ ] Exporter les données en CSV/Excel
- [ ] Notifications en temps réel avec WebSockets

---

Développé par Bougherara Safi pour MIH
