"use client";

import { useState } from "react";
import Link from "next/link";
import { huertoInicial as huerto } from "@/data/huerto-inicial";
import type { CultivoInicial, EstadoCultivo } from "@/types/huerto";

const estados: Record<EstadoCultivo, string> = {
  presente: "Presente",
  existente: "Existente",
  plantado: "Plantado",
  sembrado: "Sembrado",
  resembrado: "Resembrado",
  pendiente: "Pendiente de trasplante",
};

function fechaLegible(cultivo: CultivoInicial) {
  if (!cultivo.fecha) return null;
  const fecha = new Date(`${cultivo.fecha}T12:00:00Z`);
  const fechaTexto = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
  return cultivo.precisionFecha === "aproximada"
    ? `Aprox. ${fechaTexto}`
    : fechaTexto;
}

export function PlanoHuerto() {
  const filasVisuales = [...huerto.filas].sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
  const [filaSeleccionada, setFilaSeleccionada] = useState("F6");
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<number | null>(null);

  const fila = huerto.filas.find((elemento) => elemento.id === filaSeleccionada) ?? huerto.filas[0];
  const totalGoteros = huerto.filas.reduce((total, elemento) => total + elemento.puntosRiego, 0);
  const anchoMapa = Math.max(680, Math.max(...huerto.filas.map((elemento) => elemento.puntosRiego)) * 44 + 230);
  const zonaPunto = huerto.zonasConocidas.find(
    (zona) => zona.filaId === fila.id && puntoSeleccionado !== null &&
    puntoSeleccionado >= zona.desdePunto && puntoSeleccionado <= zona.hastaPunto
  );

  function elegirFila(id: string) {
    setFilaSeleccionada(id);
    setPuntoSeleccionado(null);
  }

  function elegirPunto(id: string, numero: number) {
    setFilaSeleccionada(id);
    setPuntoSeleccionado(numero);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>
            <strong>Sistema Monitorización</strong>
            <small>Cuaderno de cultivo</small>
          </span>
        </div>
        <div className="sidebar-inner">
          <p className="nav-section">ESPACIO DE TRABAJO</p>
          <nav aria-label="Navegaci&oacute;n principal" className="menu">
            <Link href="/prototipo" className="menu-item menu-active" aria-current="page">
              <span aria-hidden="true">▦</span> Plano del huerto
            </Link>
            <span className="menu-item menu-disabled"><span aria-hidden="true">☘</span> Inventario <i>despu&eacute;s</i></span>
            <span className="menu-item menu-disabled"><span aria-hidden="true">▤</span> Calendario <i>despu&eacute;s</i></span>
            <span className="menu-item menu-disabled"><span aria-hidden="true">◷</span> Visitas y riego <i>despu&eacute;s</i></span>
            <span className="menu-item menu-disabled"><span aria-hidden="true">⚑</span> Incidencias <i>despu&eacute;s</i></span>
          </nav>
          <p className="nav-section nav-section-second">SISTEMA</p>
          <nav aria-label="Estado de la versi&oacute;n" className="menu">
            <Link className="menu-item" href="/aplicacion"><span aria-hidden="true">⚙</span> Abrir mi huerto <i>etapa 2</i></Link>
          </nav>
          <div className="sidebar-notice">
            <span className="notice-dot" aria-hidden="true" /> PROTOTIPO LOCAL
            <p>Copia inicial de la Etapa 1. Los datos de esta vista son históricos y de solo lectura. La versión actual está en «Abrir mi huerto».</p>
          </div>
        </div>
        <div className="sidebar-footer">ALBORAYA · VALENCIA<br/>TEMPORADA OTO&Ntilde;O / INVIERNO 2026</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">Mi huerto <span aria-hidden="true">/</span> Vista general</span>
          <Link href="/aplicacion" className="topbar-badge">Abrir mi huerto →</Link>
        </header>
        <div className="intro">
          <div>
            <p className="eyebrow">VISTA GENERAL</p>
            <h1>El huerto, de un vistazo<span className="h1-period">.</span></h1>
            <p className="lead">Copia de referencia de la Etapa 1. Los cambios posteriores se consultan en la aplicación real. Haz clic en una fila o un gotero para explorar este prototipo.</p>
          </div>
          <span className="version-stamp">V0.1 · PROTOTIPO</span>
        </div>

        <section className="stats-grid" aria-label="Resumen de la parcela">
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">▧</span><span className="stat-value">7 &times; 7 <small>m</small></span><span className="stat-label">Superficie aproximada</span></div>
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">☰</span><span className="stat-value">6</span><span className="stat-label">Filas de cultivo</span></div>
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">◉</span><span className="stat-value">{totalGoteros}</span><span className="stat-label">Puntos de goteo</span></div>
          <div className="stat-card"><span className="stat-icon" aria-hidden="true">↔</span><span className="stat-value">25 <small>cm</small></span><span className="stat-label">Separaci&oacute;n entre goteros</span></div>
        </section>

        <div className="workspace-grid">
          <section className="surface map-card" aria-labelledby="map-title">
            <div className="surface-header">
              <div><p className="eyebrow">PARCELA · ESQUEMA</p><h2 id="map-title">Plano interactivo</h2></div>
              <span className="light-pill">6 FILAS</span>
            </div>
            <div className="compass"><span>← ESTE</span><span>OESTE →</span></div>
            <p className="map-scroll-hint">Desplaza el plano horizontalmente y pulsa un número para consultar ese gotero. <a href="#detalle-fila">Ir al detalle de la fila</a></p>
            <div className="map-scroll" tabIndex={0} role="region" aria-label="Plano desplazable horizontalmente. Este a la izquierda, oeste a la derecha; F6 arriba y F1 abajo.">
              <div className="map-inner point-layout-map" style={{ minWidth: anchoMapa }}>
                {filasVisuales.map((f) => (
                  <div className={`plot-row ${filaSeleccionada === f.id ? "plot-row-selected" : ""}`} key={f.id}>
                    <div className="row-heading"><button
                      className="row-button" type="button"
                      onClick={() => elegirFila(f.id)} aria-pressed={filaSeleccionada === f.id} aria-controls="detalle-fila"
                    >{f.id}</button><span className="row-count">{f.puntosRiego} p.</span></div>
                    <div className="drip-line" style={{gridTemplateColumns: `repeat(${f.puntosRiego}, minmax(44px, 1fr))`}}>
                      {Array.from({ length: f.puntosRiego }, (_, index) => {
                        const punto = f.puntosRiego - index;
                        const areaConocida = huerto.zonasConocidas.some(
                          (zona) => zona.filaId === f.id && punto >= zona.desdePunto && punto <= zona.hastaPunto
                        );
                        const seleccionado = filaSeleccionada === f.id && puntoSeleccionado === punto;
                        return (
                          <button
                            type="button" key={punto}
                            className={`drip-point ${areaConocida ? "drip-zone" : ""} ${seleccionado ? "drip-selected" : ""}`}
                            onClick={() => elegirPunto(f.id, punto)}
                            aria-label={`${f.id}, gotero ${punto} desde el oeste${areaConocida ? ", guisantes Rondo" : ", sin cultivo asignado; puede estar ocupado"}`}
                            aria-pressed={seleccionado}
                            aria-controls="detalle-fila"
                            title={`${f.id} · gotero ${punto} desde el oeste${areaConocida ? " · guisantes Rondo" : " · sin cultivo asignado"}`}
                          >
                            <span className="point-number" aria-hidden="true">{punto}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="row-exterior-slot">{f.id === "F6" && <div className="row-exterior-marker"><span aria-hidden="true">🍋</span><span>Limonero<small>Fuera de F6 · oeste</small></span></div>}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="map-legend">
              <span><i className="legend-point"/> Gotero</span>
              <span><i className="legend-point legend-green"/> Sector conocido de guisantes</span>
              <span><i className="legend-outline"/> Selecci&oacute;n</span>
            </div>
            <div className="map-caveat">
              Esquema sin escala: este a la izquierda y oeste a la derecha; F6 arriba y F1 abajo. El punto 1 está en el extremo oeste. El orden vertical no indica norte o sur. La ubicación puntual de los demás cultivos no está confirmada.
            </div>
          </section>

          <section className="surface details-card" id="detalle-fila" tabIndex={-1} aria-labelledby="details-title">
            <div className="surface-header details-head">
              <div><p className="eyebrow">DETALLE DE FILA</p><h2 id="details-title">{fila.id} <span className="heading-minor">/ {fila.puntosRiego} goteros</span></h2></div>
              <span className="selected-dot" aria-hidden="true" />
            </div>
            {puntoSeleccionado !== null && (
              <div className="point-detail">
                <strong>{fila.id} · Gotero {String(puntoSeleccionado).padStart(2,"0")}</strong>
                <p>{zonaPunto
                  ? zonaPunto.descripcion + " Esto no implica que cada punto tenga una planta germinada."
                  : "No hay una ubicación de cultivo confirmada para este gotero. No significa que esté vacío."}</p>
              </div>
            )}
            <div className="detail-subheading">CULTIVOS Y PLANTELES REGISTRADOS</div>
            <div className="crop-list">
              {fila.cultivos.map((c) => (
                <article key={c.id} className="crop-item">
                  <div className="crop-item-header">
                    <strong>{c.nombre}</strong>
                    {c.cantidad !== null && <span className="count-pill">{c.cantidad} {c.unidadCantidad}</span>}
                  </div>
                  <div className="crop-meta">
                    <span className={`status status-${c.estado}`}>{estados[c.estado]}</span>
                    {fechaLegible(c) && <span>{fechaLegible(c)}</span>}
                  </div>
                  {c.ubicacionConocida && <p className="crop-note">{c.ubicacionConocida}</p>}
                  {c.notas && <p className="crop-note">{c.notas}</p>}
                </article>
              ))}
            </div>
            <p className="details-footer">Cantidad no indicada = dato sin confirmar. No implica ausencia de plantas.</p>
          </section>
        </div>
        <footer className="main-footer">Primera versi&oacute;n visual · Sin cuenta, sin base de datos y sin guardado · <span>Datos aportados para la temporada 2026</span></footer>
      </main>
    </div>
  );
}
