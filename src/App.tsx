import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/auth/RequireAuth'
import { Layout } from './components/layout/Layout'
import { AuthProvider } from './context/AuthProvider'
import { CompareProvider } from './context/CompareProvider'
import { FavoritesProvider } from './context/FavoritesProvider'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { ENTRADAS } from './config/entradas'

/* Cada pantalla viaja en su propio chunk, que baja cuando alguien entra a la
   ruta. `Home` y `NotFound` quedan afuera a proposito: la primera es la que
   recibe la visita por defecto y la segunda es el 404, asi que diferirlas
   agregaria un viaje de red justo cuando no hay nada pintado todavia.

   El `.then` es porque las paginas son exports nombrados y `lazy` espera un
   default. */
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const Blog = lazy(() => import('./pages/Blog').then((m) => ({ default: m.Blog })))
const BlogPost = lazy(() => import('./pages/BlogPost').then((m) => ({ default: m.BlogPost })))
const Cars = lazy(() => import('./pages/Cars').then((m) => ({ default: m.Cars })))
const Compare = lazy(() => import('./pages/Compare').then((m) => ({ default: m.Compare })))
const Explore = lazy(() => import('./pages/Explore').then((m) => ({ default: m.Explore })))
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })))
const Dealers = lazy(() => import('./pages/Dealers').then((m) => ({ default: m.Dealers })))
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })))
const Garage = lazy(() => import('./pages/Garage').then((m) => ({ default: m.Garage })))
const Help = lazy(() => import('./pages/Help').then((m) => ({ default: m.Help })))
const Levels = lazy(() => import('./pages/Levels').then((m) => ({ default: m.Levels })))
const Following = lazy(() => import('./pages/Following').then((m) => ({ default: m.Following })))
const GarageLanding = lazy(() =>
  import('./pages/GarageLanding').then((m) => ({ default: m.GarageLanding })),
)
const MyGarageRedirect = lazy(() =>
  import('./pages/GarageLanding').then((m) => ({ default: m.MyGarageRedirect })),
)
const Novedades = lazy(() => import('./pages/Novedades').then((m) => ({ default: m.Novedades })))
const People = lazy(() => import('./pages/People').then((m) => ({ default: m.People })))
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })))
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const MyListings = lazy(() => import('./pages/MyListings').then((m) => ({ default: m.MyListings })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Reset = lazy(() => import('./pages/Reset').then((m) => ({ default: m.Reset })))
const Sistema = lazy(() => import('./pages/Sistema').then((m) => ({ default: m.Sistema })))
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
                {ENTRADAS.map((entrada) => (
                  <Route key={entrada} path={entrada} element={<Home />} />
                ))}

                {/* Fase 2 — marketplace */}
                <Route path="explorar" element={<Explore />} />
                <Route path="autos" element={<Cars />} />
                <Route path="autos/:slug" element={<VehicleDetail />} />

                {/* Los favoritos no exigen sesión: sin cuenta viven en el
                    navegador, y pedir registro para ver lo que uno mismo guardó
                    sería un peaje justo donde el visitante está decidiendo. */}
                <Route path="favoritos" element={<Favorites />} />

                {/* Fase 3 — sistema de usuario */}
                {/* La comparación vive en la query: `?ids=slug-a,slug-b`. Así
                    mandarle a alguien "mirá estos dos" es copiar el link. */}
                <Route path="comparar" element={<Compare />} />
                <Route path="entrar" element={<Login />} />

                {/* Explica los niveles y no exige sesión: es la pantalla a la
                    que se manda a alguien que pregunta qué son, y pedirle
                    registro para leer una explicación es la forma más rápida
                    de que no la lea. */}
                <Route path="niveles" element={<Levels />} />

                {/* Donde cae el link de recuperacion. Fuera de `RequireAuth`:
                    la sesion la abre el propio link, y mandarlo a login seria
                    devolverlo al problema que vino a resolver. */}
                <Route path="recuperar" element={<Reset />} />

                {/* Capta concesionarias, asi que no exige sesion: la lee alguien
                    que todavia no decidio abrir cuenta. */}
                <Route path="agencias" element={<Dealers />} />

                {/* Los legales no exigen sesion, y menos que ninguna otra
                    pantalla: el login pide aceptarlos antes de que exista la
                    cuenta. */}
                <Route path="ayuda" element={<Help />} />
                <Route path="contacto" element={<Contact />} />
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogPost />} />
                <Route path="terminos" element={<Terms />} />
                <Route path="privacidad" element={<Privacy />} />
                {/* El catálogo de íconos, obleas y escenas. Para quien diseña:
                    no está en el menú ni en el buscador. */}
                <Route path="sistema" element={<Sistema />} />

                {/* El garage es público y tiene pantalla propia: el link que
                    alguien manda por WhatsApp abre los autos, no el panel. */}
                <Route path="g/:id" element={<Garage />} />

                {/* Qué es el garage, para quien no tiene uno. Es el destino del
                    link de la navbar y de la portada: `/g/:id` necesita saber
                    de quién es, y `/perfil` pide sesión. */}
                <Route path="garage" element={<GarageLanding />} />

                {/* La otra mitad del garage: encontrar a alguien sin que te
                    tenga que pasar el link. No exige sesión — mirar el garage
                    de otro nunca la exigió. */}
                <Route path="gente" element={<People />} />

                {/* Publicar y el perfil propio exigen sesión: mandan a login y
                    después vuelven acá. */}
                <Route element={<RequireAuth />}>
                  <Route path="vender" element={<Sell />} />
                  {/* Mismo formulario que publicar, pero arranca lleno. */}
                  <Route path="vender/:slug/editar" element={<Sell />} />
                  <Route path="mis-avisos" element={<MyListings />} />
                  <Route path="ajustes" element={<Settings />} />
                  {/* El garage propio sin saber el id: sin sesión pasa por el
                      login y vuelve acá. Es lo que usa "Armá el tuyo". */}
                  <Route path="garage/mio" element={<MyGarageRedirect />} />
                  {/* Lo que pasó con lo tuyo: es de cada uno. */}
                  <Route path="novedades" element={<Novedades />} />
                  {/* A quién seguís: es de cada uno, así que exige sesión. */}
                  <Route path="siguiendo" element={<Following />} />
                {/* Quién entra lo decide la base, no esta ruta: las políticas
                    de `reports` sólo devuelven datos a un admin, así que a
                    cualquier otro la pantalla le llega vacía. */}
                <Route path="admin" element={<Admin />} />
                  <Route path="perfil" element={<Profile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CompareProvider>
      </FavoritesProvider>
    </AuthProvider>
  )
}
