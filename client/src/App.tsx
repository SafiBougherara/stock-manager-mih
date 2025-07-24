// Importations des dépendances principales
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Gestion des requêtes et du cache
import { Toaster } from 'react-hot-toast'; // Notifications toast
import { useEffect, useState } from 'react'; // Hooks React
import ProductTable from './components/ProductTable'; // Composant principal de la table des produits

/**
 * Configuration du client React Query
 * - refetchOnWindowFocus: Désactive le rechargement des données lors du retour sur l'onglet
 * - retry: Nombre de tentatives en cas d'échec d'une requête
 * - staleTime: Durée pendant laquelle les données sont considérées comme fraîches (5 minutes)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Évite les rechargements inutiles
      retry: 1, // Une seule tentative en cas d'échec
      staleTime: 5 * 60 * 1000, // 5 minutes avant de considérer les données comme obsolètes
    },
  },
});

/**
 * Composant racine de l'application
 * Gère le thème sombre/clair et fournit le contexte de requête à toute l'application
 */
function App() {
  // État pour gérer le mode sombre
  const [darkMode, setDarkMode] = useState(false);

  // Effet pour gérer le thème de l'application
  useEffect(() => {
    // Vérifie les préférences de thème du système au chargement
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark'); // Active les styles en mode sombre
    } else {
      document.documentElement.classList.remove('dark'); // Désactive les styles en mode sombre
    }

    // Écouter les changements de préférence de thème
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    // Fournit le client React Query à toute l'application
    <QueryClientProvider client={queryClient}>
      {/* Conteneur principal avec des styles conditionnels pour le mode sombre */}
      <div className={`min-h-screen p-6 transition-colors duration-200 ${
        darkMode 
          ? 'bg-gray-900 text-gray-100' // Styles pour le mode sombre
          : 'bg-gray-50 text-gray-900'  // Styles pour le mode clair
      }`}>
        <header className="mb-8">
          <br />
        </header>

        {/* Contenu principal de l'application */}
        <main className="space-y-6">
          {/* Conteneur de la table avec styles conditionnels pour le mode sombre */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg transition-colors duration-200">
            <ProductTable />
          </div>
        </main>
        
        {/* Bouton de basculement du mode sombre en bas à droite */}
        <button
          onClick={() => {
            const newDarkMode = !darkMode;
            setDarkMode(newDarkMode);
            if (newDarkMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '12px',
            borderRadius: '50%',
            backgroundColor: darkMode ? '#4B5563' : '#E5E7EB',
            color: darkMode ? '#F3F4F6' : '#1F2937',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            width: '3rem',
            height: '3rem',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = darkMode ? '#6B7280' : '#D1D5DB';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = darkMode ? '#4B5563' : '#E5E7EB';
          }}
          aria-label={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
        >
          {darkMode ? (
            <span style={{ fontSize: '18px' }}>☀️</span>
          ) : (
            <span style={{ fontSize: '18px' }}>🌙</span>
          )}
        </button>
      </div>
      {/* Composant de notification toast positionné en bas à droite */}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}

export default App;
