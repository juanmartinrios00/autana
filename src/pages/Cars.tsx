import { useEffect, useRef, useState } from "react";
import { FilterPanel } from "../components/search/FilterPanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { Select } from "../components/ui/Select";
import { VehicleGrid } from "../components/vehicle/VehicleGrid";
import { pageTitle } from "../config/brand";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useSlowHint } from "../hooks/useSlowHint";
import { SaveSearch } from "../components/search/SaveSearch";
import { activeChips, useVehicleFilters } from "../hooks/useVehicleFilters";
import { ActiveFilters } from "../components/search/ActiveFilters";
import { listMakes, listModels, listProvinces, listVehicles } from "../lib/api";
import { formatCount, sortLabels, sortValues } from "../lib/format";
import { pageWindow } from "../lib/pagination";
import type { Paginated, Vehicle } from "../types";
import "./Cars.css";

const PAGE_SIZE = 12;

/* El ancho a partir del cual los filtros dejan de ser una hoja y vuelven a ser
   la columna de la izquierda. Está escrito también en el `@media` de Cars.css,
   que es donde manda: acá se repite porque el efecto que bloquea el scroll
   tiene que saber cuándo la hoja dejó de existir. Si uno de los dos cambia, el
   otro tiene que acompañar. */
const SHEET_BREAKPOINT = "(min-width: 900px)";

/* Las opciones del desplegable salen de las mismas etiquetas que usa
   `search-query` para saber qué valores acepta la URL. Escritas por separado,
   agregar un orden acá y no allá hacía que elegirlo cayera en `relevance`: el
   desplegable decía una cosa y los resultados venían ordenados por otra. */
const sortOptions = sortValues.map((value) => ({
  value,
  label: sortLabels[value],
}));

type Status = "loading" | "ready" | "error";

export function Cars() {
  const {
    filters,
    sort,
    page,
    setParam,
    setParams,
    toggleInList,
    clearAll,
    removeChip,
  } = useVehicleFilters();

  /* Reintentar no cambia la búsqueda, así que sin este contador no cambiaría
     nada: la query string queda igual, `requestKey` también, y el botón no
     hace nada. Va adentro de la identidad para que el reintento cuente como
     una búsqueda nueva y la pantalla vuelva a decir «Buscando…». */
  const [attempt, setAttempt] = useState(0);

  /* Identidad de la búsqueda actual. Comparar esto con la búsqueda que ya
     respondió es lo que dice si estamos cargando, sin un setState extra. */
  const requestKey = JSON.stringify({ filters, sort, page, attempt });

  const [answer, setAnswer] = useState<{
    key: string;
    data: Paginated<Vehicle> | null;
    failed: boolean;
  }>({ key: "", data: null, failed: false });

  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [makes, setMakes] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [modelsByMake, setModelsByMake] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    void listMakes().then(setMakes);
    void listProvinces().then(setProvinces);
  }, []);

  /**
   * Lo que la hoja de filtros no tiene por ser el único modal hecho a mano.
   *
   * Los otros dos del sitio son `<dialog>` nativos y de ahí sacan gratis el
   * cierre con Escape, el foco adentro y el bloqueo del scroll de atrás. Este
   * no puede serlo sin rehacerle la forma —es una hoja que sube desde abajo,
   * no una caja centrada— así que las tres van escritas.
   *
   * El scroll es la que más se siente. La hoja tapa la pantalla entera en
   * celular, y sin bloquear el fondo, arrastrar sobre el velo mueve la lista de
   * resultados que está abajo: se cierra la hoja y la búsqueda quedó en otro
   * lado, sin que nadie la haya movido a propósito.
   *
   * El corte de ancho es el tercer caso y el menos obvio: la hoja sólo existe
   * abajo de 900px. Girando el teléfono o agrandando la ventana con la hoja
   * abierta, el CSS la devuelve a columna y el modal desaparece —pero el
   * `overflow: hidden` del body se queda puesto, y la página entera deja de
   * scrollear sin nada en pantalla que lo explique.
   */
  useEffect(() => {
    if (!sheetOpen) return;

    /* Si a este ancho la hoja no existe no hay nada que bloquear, y bloquear
       igual dejaría la página sin scroll con nada en pantalla que lo explique.
       No se cierra desde acá: cerrar sería un `setState` en el montaje del
       efecto, que arranca un render de más para un estado al que no se llega
       —el botón que abre la hoja está en `display: none` a este ancho. El
       cambio de ancho con la hoja ya abierta lo atiende `onWiden`. */
    const wide = window.matchMedia(SHEET_BREAKPOINT);
    if (wide.matches) return;

    const close = () => setSheetOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onWiden = (event: MediaQueryListEvent) => {
      if (event.matches) close();
    };

    /* Se guarda lo que había en vez de asumir que era vacío: el valor sale de
       acá y de ningún otro lado, pero dejarlo en '' sería decidir por el resto
       del sitio. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWiden);

    /* El foco entra a la hoja para que Escape llegue y para que quien navega
       con teclado no siga tabulando por los resultados de atrás, que es lo que
       `aria-modal` promete. Se guarda de dónde venía: es el botón que la abrió,
       que sigue montado atrás mientras la hoja está arriba. */
    const returnTo = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWiden);
      document.body.style.overflow = previousOverflow;
      /* Vuelve al botón que la abrió, no al principio de la página. */
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [sheetOpen]);

  useEffect(() => {
    const make = filters.make;
    if (!make || modelsByMake[make]) return;
    void listModels(make).then((list) => {
      setModelsByMake((prev) => ({ ...prev, [make]: list }));
    });
  }, [filters.make, modelsByMake]);

  useEffect(() => {
    let current = true;

    listVehicles({ filters, sort, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (current) setAnswer({ key: requestKey, data, failed: false });
      })
      .catch(() => {
        if (current) setAnswer({ key: requestKey, data: null, failed: true });
      });

    /* La búsqueda anterior puede resolver después de que cambiaron los filtros:
       sin esta bandera pintaría resultados viejos. */
    return () => {
      current = false;
    };
  }, [requestKey, filters, sort, page, attempt]);

  const status: Status =
    answer.key !== requestKey ? "loading" : answer.failed ? "error" : "ready";
  const result = answer.data;
  const models = filters.make ? (modelsByMake[filters.make] ?? []) : [];

  const tardando = useSlowHint(status === "loading");
  const chips = activeChips(filters);
  const activeCount = chips.length;

  /* Un nombre que se entienda sin abrirla. Si no alcanza con marca, modelo y
     texto libre, cae en la provincia; y si tampoco, el usuario le pone el que
     quiera. */
  const searchLabel =
    [filters.q, filters.make, filters.model].filter(Boolean).join(" ") ||
    filters.province ||
    "Mi búsqueda";
  const total = result?.total ?? 0;

  /* El título sigue a la búsqueda: una pestaña con diez listados abiertos
     tiene que dejar distinguir cuál es cuál. */
  useDocumentMeta({
    title: [filters.q, filters.make, filters.model].filter(Boolean).join(" ")
      ? pageTitle(
          `${[filters.q, filters.make, filters.model].filter(Boolean).join(" ")}`,
        )
      : pageTitle("Autos usados y 0 km"),
    description:
      "Buscá entre los vehículos publicados por particulares y concesionarias. Filtrá por marca, precio, kilometraje y ubicación.",
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const panel = (
    <FilterPanel
      filters={filters}
      setParam={setParam}
      setParams={setParams}
      toggleInList={toggleInList}
      clearAll={clearAll}
      makes={makes}
      models={models}
      provinces={provinces}
      activeCount={activeCount}
    />
  );

  return (
    <div className="page cars">
      <aside
        className={sheetOpen ? "cars__aside is-open" : "cars__aside"}
        aria-label="Filtros"
      >
        {sheetOpen ? (
          <>
            <button
              type="button"
              className="sheet__scrim"
              aria-label="Cerrar filtros"
              onClick={() => setSheetOpen(false)}
            />
            <div
              ref={sheetRef}
              className="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Filtros"
              tabIndex={-1}
            >
              <span className="sheet__grip" aria-hidden="true" />
              <div className="sheet__body">{panel}</div>
              <div className="sheet__foot">
                <Button
                  variant="yellow"
                  size="lg"
                  block
                  onClick={() => setSheetOpen(false)}
                >
                  Ver {formatCount(total)} {total === 1 ? "auto" : "autos"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          panel
        )}
      </aside>

      <main className="cars__results">
        <div className="cars__head">
          <div>
            <h1 className="cars__count">
              {status === "loading"
                ? "Buscando…"
                : `${formatCount(total)} ${total === 1 ? "vehículo" : "vehículos"}`}
            </h1>
            {/* Cuando la espera se estira, la pantalla lo dice: ver
                `useSlowHint`. Sin esto son ocho segundos de esqueletos mudos
                antes de que aparezca el error. */}
            <p className="cars__summary">
              {status === "loading" && tardando
                ? "Está tardando más de lo normal. Puede ser tu conexión."
                : activeCount === 0
                  ? "Todas las publicaciones activas"
                  : `${activeCount} ${activeCount === 1 ? "filtro aplicado" : "filtros aplicados"}`}
            </p>
          </div>

          <div className="cars__tools">
            {/* Con filtros puestos y sesion iniciada. La busqueda que se guarda
                es la query string tal cual, que es donde ya viven los filtros. */}
            <SaveSearch suggested={searchLabel} activeCount={activeCount} />

            <Button
              variant="outline"
              size="sm"
              className="cars__filters-trigger"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
            >
              <Icon name="list" size={15} />
              Filtros
              {activeCount > 0 && <Badge tone="accent">{activeCount}</Badge>}
            </Button>

            <Select
              label="Ordenar por"
              hideLabel
              className="cars__sort"
              options={sortOptions}
              value={sort}
              onChange={(event) => setParam("sort", event.target.value)}
            />

            <div
              className="view-toggle"
              role="group"
              aria-label="Formato de la lista"
            >
              <button
                type="button"
                className={
                  layout === "grid"
                    ? "view-toggle__item is-on"
                    : "view-toggle__item"
                }
                aria-pressed={layout === "grid"}
                aria-label="Ver en grilla"
                onClick={() => setLayout("grid")}
              >
                <Icon name="grid" size={15} />
              </button>
              <button
                type="button"
                className={
                  layout === "list"
                    ? "view-toggle__item is-on"
                    : "view-toggle__item"
                }
                aria-pressed={layout === "list"}
                aria-label="Ver en lista"
                onClick={() => setLayout("list")}
              >
                <Icon name="list" size={15} />
              </button>
            </div>
          </div>
        </div>

        <ActiveFilters chips={chips} onRemove={removeChip} onClear={clearAll} />

        {status === "error" && (
          <EmptyState
            tone="error"
            icon="close"
            title="Algo salió mal"
            description="No pudimos cargar los resultados. Revisá tu conexión e intentá de nuevo."
            action={
              <Button
                variant="outline"
                onClick={() => setAttempt((count) => count + 1)}
              >
                Reintentar
              </Button>
            }
          />
        )}

        {status !== "error" && (status === "loading" || total > 0) && (
          <VehicleGrid
            vehicles={result?.items ?? []}
            layout={layout}
            loading={status === "loading"}
            skeletonCount={PAGE_SIZE}
          />
        )}

        {status === "ready" && total === 0 && (
          <EmptyState
            title="No encontramos autos"
            description="Probá ampliar el rango de precio o quitar alguno de los filtros activos."
            action={
              <Button variant="yellow" onClick={clearAll}>
                Limpiar filtros
              </Button>
            }
          />
        )}

        {status === "ready" && pageCount > 1 && (
          <nav className="pagination" aria-label="Paginación de resultados">
            <span className="pagination__info">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} de {formatCount(total)}
            </span>
            <div className="pagination__pages">
              {pageWindow(page, pageCount).map((slot, index) =>
                slot === "gap" ? (
                  <span
                    key={`gap-${index}`}
                    className="pagination__gap"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={slot}
                    type="button"
                    className={
                      slot === page
                        ? "pagination__page is-on"
                        : "pagination__page"
                    }
                    aria-current={slot === page ? "page" : undefined}
                    aria-label={`Página ${slot}`}
                    onClick={() => setParam("page", slot)}
                  >
                    {slot}
                  </button>
                ),
              )}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
