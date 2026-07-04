// Estado global de la aplicación
var App = {};   // Primera definición, sin referencia circular
App.state = {
  db: { songs: [] },
  currentMatch: [],
  editingId: null,
  DEFAULT_IMG: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=400&auto=format&fit=crop'
};