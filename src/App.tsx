import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { Layout } from './components/layout/Layout'
import { AuthProvider } from './context/AuthProvider'
import { CompareProvider } from './context/CompareProvider'
import { FavoritesProvider } from './context/FavoritesProvider'
import { Home } from './pages/Home'
import { Placeholder } from './pages/Placeholder'

/* Cada pantalla viaja en su propio chunk, que baja cuando alguien entra a la
   ruta. `Home` y `Placeholder` quedan afuera a proposito: la primera es la que
   recibe la visita por defecto y la segunda es el 404, asi que diferirlas
   agregaria un viaje de red justo cuando no hay nada pintado todavia.

   El `.then` es porque las paginas son exports nombrados y `lazy` espera un
   default. */
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const Cars = lazy(() => import('./pages/Cars').then((m) => ({ default: m.Cars })))
const Compare = lazy(() => import('./pages/Compare').then((m) => ({ default: m.Compare })))
const Dealers = lazy(() => import('./pages/Dealers').then((m) => ({ default: m.Dealers })))
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })))
const Garage = lazy(() => import('./pages/Garage').then((m) => ({ default: m.Garage })))
const Help = lazy(() => import('./pages/Help').then((m) => ({ default: m.Help })))
const Levels = lazy(() => import('./pages/Levels').then((m) => ({ default: m.Levels })))
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })))
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const MyListings = lazy(() => import('./pages/MyListings').then((m) => ({ default: m.MyListings })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Reset = lazy(() => import('./pages/Reset').then((m) => ({ default: m.Reset })))
const Sell = lazy(() => import('./pages/Sell').then((m) => ({ default: m.Sell })))
const VehicleDetail = lazy(() =>
  import('./pages/VehicleDetail').then((m) => ({ default: m.VehicleDetail })),
)

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CompareProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />

                {/* Fase 2 — marketplace */}
                <Route path="cars" element={<Cars />} />
                <Route path="cars/:slug" element={<VehicleDetail />} />

                {/* Los favoritos no exigen sesión: sin cuenta viven en el
                    navegador, y pedir registro para ver lo que uno mismo guardó
                    sería un peaje justo donde el visitante está decidiendo. */}
                <Route path="favorites" element={<Favorites />} />

                {/* Fase 3 — sistema de usuario */}
                {/* La comparación vive en la query: `?ids=slug-a,slug-b`. Así
                    mandarle a alguien "mirá estos dos" es copiar el link. */}
                <Route path="compare" element={<Compare />} />
                <Route path="login" element={<Login />} />

                {/* Explica los niveles y no exige sesión: es la pantalla a la
                    que se manda a alguien que pregunta qué son, y pedirle
                    registro para leer una explicación es la forma más rápida
                    de que no la lea. */}
                <Route path="levels" element={<Levels />} />

                {/* Donde cae el link de recuperacion. Fuera de `RequireAuth`:
                    la sesion la abre el propio link, y mandarlo a login seria
                    devolverlo al problema que vino a resolver. */}
                <Route path="reset" element={<Reset />} />

                {/* Capta concesionarias, asi que no exige sesion: la lee alguien
                    que todavia no decidio abrir cuenta. */}
                <Route path="dealers" element={<Dealers />} />

                {/* Los legales no exigen sesion, y menos que ninguna otra
                    pantalla: el login pide aceptarlos antes de que exista la
                    cuenta. */}
                <Route path="help" element={<Help />} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />

                {/* El garage es público y tiene pantalla propia: el link que
                    alguien manda por WhatsApp abre los autos, no el panel. */}
                <Route path="g/:id" element={<Garage />} />

                {/* Publicar y el perfil propio exigen sesión: mandan a login y
                    después vuelven acá. */}
                <Route element={<RequireAuth />}>
                  <Route path="sell" element={<Sell />} />
                  {/* Mismo formulario que publicar, pero arranca lleno. */}
                  <Route path="sell/:slug/edit" element={<Sell />} />
                  <Route path="my-listings" element={<MyListings />} />
                  <Route path="settings" element={<Settings />} />
                {/* Quién entra lo decide la base, no esta ruta: las políticas
                    de `reports` sólo devuelven datos a un admin, así que a
                    cualquier otro la pantalla le llega vacía. */}
                <Route path="admin" element={<Admin />} />
                  <Route path="profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<Placeholder title="Página no encontrada" phase="Fase 5" />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CompareProvider>
      </FavoritesProvider>
    </AuthProvider>
  )
}
