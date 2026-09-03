import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { Layout } from './components/layout/Layout'
import { AuthProvider } from './context/AuthProvider'
import { FavoritesProvider } from './context/FavoritesProvider'
import { Cars } from './pages/Cars'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Sell } from './pages/Sell'
import { Placeholder } from './pages/Placeholder'
import { Profile } from './pages/Profile'
import { VehicleDetail } from './pages/VehicleDetail'

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />

              {/* Fase 2 — marketplace */}
              <Route path="cars" element={<Cars />} />
              <Route path="cars/:slug" element={<VehicleDetail />} />

              {/* Fase 3 — sistema de usuario */}
              <Route path="favorites" element={<Placeholder title="Favoritos" phase="Fase 3" />} />
              <Route path="compare" element={<Placeholder title="Comparador" phase="Fase 3" />} />
              <Route path="dashboard/*" element={<Placeholder title="Dashboard" phase="Fase 3" />} />
              <Route path="login" element={<Login />} />

              {/* El garage es público: se comparte por link. */}
              <Route path="g/:id" element={<Profile />} />

              {/* Publicar y el perfil propio exigen sesión: mandan a login y
                  después vuelven acá. */}
              <Route element={<RequireAuth />}>
                <Route path="sell" element={<Sell />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              <Route path="*" element={<Placeholder title="Página no encontrada" phase="Fase 5" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  )
}
