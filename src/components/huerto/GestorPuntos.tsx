"use client";

import { useActionState, useState } from "react";
import { ejecutarCambioPlano } from "@/app/aplicacion/plano-actions";
import { formatearCantidad, formatearFecha, nombrePlantacion, puedeEditar } from "@/lib/huerto/formato";
import type { EstadoCambioPlano } from "@/lib/huerto/validar-plano";
import type { FilaHuerto, HuertoSnapshot, PuntoRiego } from "@/types/aplicacion";

type Operacion = "anadir_punto" | "eliminar_punto" | "asignar_cultivos";
type Modo = "ninguno" | "anadir" | "asignar" | "eliminar";
type AccionesFormulario = {
  alGuardar: (resultado: EstadoCambioPlano) => void;
  alCancelar: () => void;
  alPendiente: (pendiente: boolean) => void;
  bloqueado: boolean;
};
type ContextoFormulario = AccionesFormulario & {
  fila: FilaHuerto;
  versionInicial: number;
};

/** El token pertenece al borrador abierto, no a la última lectura de la página. */
function useCambioPlano(versionInicial: number, acciones: AccionesFormulario) {
  const [version, setVersion] = useState(versionInicial);
  const [estado, accion, pendiente] = useActionState<EstadoCambioPlano, FormData>(
    async (anterior, datos) => {
      acciones.alPendiente(true);
      try {
        const resultado = await ejecutarCambioPlano(anterior, datos);
        if (resultado.estado === "guardado") {
          if (typeof resultado.versionPlano === "number") setVersion(resultado.versionPlano);
          acciones.alGuardar(resultado);
        }
        return resultado;
      } catch {
        return {
          estado: "error",
          mensaje: "No se ha podido confirmar el cambio. Actualiza el plano antes de volver a intentarlo.",
        };
      } finally {
        acciones.alPendiente(false);
      }
    },
    { estado: "inicial", mensaje: "" },
  );
  return { estado, accion, pendiente, version };
}

function CamposContexto({ fila, version, operacion, punto }: {
  fila: FilaHuerto;
  version: number;
  operacion: Operacion;
  punto?: PuntoRiego;
}) {
  return <>
    <input type="hidden" name="huerto_id" value={fila.huerto_id} />
    <input type="hidden" name="fila_id" value={fila.id} />
    <input type="hidden" name="version_plano" value={version} />
    <input type="hidden" name="operacion" value={operacion} />
    {punto && <input type="hidden" name="punto_id" value={punto.id} />}
  </>;
}

function MensajeFormulario({ estado }: { estado: EstadoCambioPlano }) {
  if (!estado.mensaje) return null;
  return <>
    <p className={estado.estado === "guardado" ? "feedback-success" : "feedback-error"}
      role={estado.estado === "guardado" ? "status" : "alert"}>{estado.mensaje}</p>
    {estado.estado === "conflicto" && <p className="form-explanation conflict-help">
      La fila ha cambiado mientras este formulario estaba abierto. Revisa tu selección y ciérralo para cargar la versión actual antes de volver a abrirlo.
    </p>}
  </>;
}

function FormularioAnadir({ fila, versionInicial, cantidadPuntos, ...acciones }: ContextoFormulario & { cantidadPuntos: number }) {
  const [cantidadInicial] = useState(cantidadPuntos);
  const [posicion, setPosicion] = useState(String(cantidadPuntos + 1));
  const { estado, accion, pendiente, version } = useCambioPlano(versionInicial, acciones);
  const ocupado = pendiente || acciones.bloqueado;
  return <form action={accion} onSubmit={() => acciones.alPendiente(true)} className="point-management-form" aria-label={`Añadir gotero a ${fila.codigo}`}>
    <CamposContexto fila={fila} version={version} operacion="anadir_punto" />
    <h3>Añadir un gotero a {fila.codigo}</h3>
    <label className="management-field" htmlFor={`posicion-${fila.id}`}>
      Nueva posición, contando desde el oeste
      <input id={`posicion-${fila.id}`} name="posicion" type="number" inputMode="numeric" min={1}
        max={cantidadInicial + 1} step={1} required value={posicion}
        onChange={(evento) => setPosicion(evento.target.value)} disabled={ocupado}
        aria-describedby={`posicion-ayuda-${fila.id}`} />
    </label>
    <p className="form-explanation" id={`posicion-ayuda-${fila.id}`}>
      {cantidadInicial > 0
        ? `1 es el extremo oeste; ${cantidadInicial + 1} añade el gotero en el extremo este. Una posición intermedia desplaza la numeración de los siguientes goteros.`
        : "Esta será la posición 1 de la fila."}
    </p>
    <MensajeFormulario estado={estado} />
    <div className="action-row">
      <button type="submit" className="primary-button compact-button" disabled={ocupado || estado.estado === "conflicto"}>
        {pendiente ? "Añadiendo…" : "Añadir gotero"}
      </button>
      <button type="button" className="secondary-button compact-button" disabled={ocupado} onClick={acciones.alCancelar}>
        {estado.estado === "conflicto" ? "Cerrar y actualizar" : "Cancelar"}
      </button>
    </div>
  </form>;
}

function FormularioCultivos({ fila, punto, datos, versionInicial, ...acciones }: ContextoFormulario & {
  punto: PuntoRiego;
  datos: HuertoSnapshot;
}) {
  // La lista y su selección describen el mismo momento que versionInicial.
  // Un refresco ajeno no modifica un borrador abierto ni sus checkboxes.
  const [candidatos] = useState(() => datos.plantaciones.filter((lote) => lote.fila_id === fila.id && lote.estado === "presente"));
  const [seleccion, setSeleccion] = useState(() => new Set(datos.asignaciones
    .filter((asignacion) => asignacion.punto_id === punto.id && candidatos.some((lote) => lote.id === asignacion.plantacion_id))
    .map((asignacion) => asignacion.plantacion_id)));
  const [cultivoNuevo, setCultivoNuevo] = useState("");
  const [variedadNueva, setVariedadNueva] = useState("");
  const { estado, accion, pendiente, version } = useCambioPlano(versionInicial, acciones);
  const ocupado = pendiente || acciones.bloqueado;

  function seleccionar(id: string, marcado: boolean) {
    setSeleccion((anterior) => {
      const siguiente = new Set(anterior);
      if (marcado) siguiente.add(id); else siguiente.delete(id);
      return siguiente;
    });
  }

  return <form action={accion} onSubmit={() => acciones.alPendiente(true)} className="point-management-form" aria-label={`Cultivos del gotero ${punto.numero_desde_oeste} de ${fila.codigo}`}>
    <CamposContexto fila={fila} version={version} operacion="asignar_cultivos" punto={punto} />
    <input type="hidden" name="seleccion_completa" value="si" />
    <h3>Cultivos del gotero {punto.numero_desde_oeste}</h3>
    <p className="form-explanation">Selecciona los lotes presentes en {fila.codigo} que corresponden a este punto. Puedes asociar varios.</p>
    <fieldset className="crop-choice-fieldset" disabled={ocupado}>
      <legend>Lotes existentes en esta fila</legend>
      {candidatos.length > 0 ? <div className="crop-choices">
        {candidatos.map((lote) => <label key={lote.id} className={`crop-choice ${seleccion.has(lote.id) ? "crop-choice-checked" : ""}`}>
          <input type="checkbox" name="plantacion_ids" value={lote.id} checked={seleccion.has(lote.id)}
            onChange={(evento) => seleccionar(lote.id, evento.target.checked)} />
          <span><strong>{nombrePlantacion(lote)}</strong><small>{formatearCantidad(lote)} · {formatearFecha(lote.fecha_inicio, lote.precision_fecha_inicio)}</small></span>
        </label>)}
      </div> : <p className="form-explanation">Todavía no hay lotes presentes en esta fila. Puedes añadir uno a continuación.</p>}
    </fieldset>
    <fieldset className="new-crop-fieldset" disabled={ocupado}>
      <legend>Añadir un cultivo nuevo a este punto</legend>
      <p className="form-explanation">Si el lote ya aparece arriba, selecciónalo allí. Estos campos crean un lote nuevo al guardar.</p>
      <label className="management-field" htmlFor={`cultivo-nuevo-${punto.id}`}>Cultivo nuevo <span className="optional-field">(opcional)</span>
        <input id={`cultivo-nuevo-${punto.id}`} name="cultivo_nuevo" type="text" maxLength={100} value={cultivoNuevo}
          onChange={(evento) => setCultivoNuevo(evento.target.value)} autoComplete="off" placeholder="Por ejemplo, tomate" />
      </label>
      <label className="management-field" htmlFor={`variedad-nueva-${punto.id}`}>Variedad <span className="optional-field">(opcional)</span>
        <input id={`variedad-nueva-${punto.id}`} name="variedad_nueva" type="text" maxLength={100} value={variedadNueva}
          onChange={(evento) => setVariedadNueva(evento.target.value)} autoComplete="off" />
      </label>
    </fieldset>
    <p className="form-explanation">Al desmarcar un lote se quita su asociación con este gotero; el lote y sus notas se conservan. Para dejar el punto sin asignaciones, desmarca todos los lotes y deja vacíos los campos de cultivo nuevo.</p>
    <MensajeFormulario estado={estado} />
    <div className="action-row">
      <button type="submit" className="primary-button compact-button" disabled={ocupado || estado.estado === "conflicto"}>
        {pendiente ? "Guardando cultivos…" : "Guardar cultivos del gotero"}
      </button>
      <button type="button" className="secondary-button compact-button" disabled={ocupado} onClick={acciones.alCancelar}>
        {estado.estado === "conflicto" ? "Cerrar y actualizar" : "Cancelar"}
      </button>
    </div>
  </form>;
}

function FormularioEliminar({ fila, punto, asociaciones, versionInicial, ...acciones }: ContextoFormulario & {
  punto: PuntoRiego;
  asociaciones: number;
}) {
  const [confirmado, setConfirmado] = useState(false);
  const [puntoAlAbrir] = useState(punto);
  const [filaAlAbrir] = useState(fila);
  const [asociacionesAlAbrir] = useState(asociaciones);
  const { estado, accion, pendiente, version } = useCambioPlano(versionInicial, acciones);
  const ocupado = pendiente || acciones.bloqueado;
  const haCambiado = fila.version_plano !== version;
  return <form action={accion} onSubmit={() => acciones.alPendiente(true)} className="point-management-form delete-point-form" aria-label={`Eliminar gotero ${puntoAlAbrir.numero_desde_oeste} de ${filaAlAbrir.codigo}`}>
    <CamposContexto fila={filaAlAbrir} version={version} operacion="eliminar_punto" punto={puntoAlAbrir} />
    <h3>Eliminar el gotero {puntoAlAbrir.numero_desde_oeste} de {filaAlAbrir.codigo}</h3>
    <p className="form-explanation">Se eliminará este gotero del plano{asociacionesAlAbrir > 0 ? ` y ${asociacionesAlAbrir === 1 ? "su asociación con un lote" : `sus ${asociacionesAlAbrir} asociaciones con lotes`}` : ""}. Los cultivos y sus notas se conservan. Los goteros restantes se renumerarán desde el oeste.</p>
    {haCambiado && <p className="feedback-error" role="alert">La fila ha cambiado desde que abriste esta confirmación. Ciérrala y vuelve a seleccionar el gotero para revisar su número y sus asociaciones actuales.</p>}
    <label className="delete-confirmation"><input type="checkbox" required checked={confirmado}
      onChange={(evento) => setConfirmado(evento.target.checked)} disabled={ocupado} />
      <span>Confirmo que quiero eliminar este gotero.</span>
    </label>
    <MensajeFormulario estado={estado} />
    <div className="action-row">
      <button type="submit" className="danger-button compact-button" disabled={!confirmado || ocupado || haCambiado || estado.estado === "conflicto"}>
        {pendiente ? "Eliminando…" : "Eliminar gotero"}
      </button>
      <button type="button" className="secondary-button compact-button" disabled={ocupado} onClick={acciones.alCancelar}>
        {estado.estado === "conflicto" || haCambiado ? "Cerrar y actualizar" : "Cancelar"}
      </button>
    </div>
  </form>;
}

export function GestorPuntos({ datos, fila, punto, bloqueado, alConfirmar, alPendiente, alActualizar }: {
  datos: HuertoSnapshot;
  fila: FilaHuerto;
  punto?: PuntoRiego;
  bloqueado: boolean;
  alConfirmar: (operacion: Operacion, resultado: EstadoCambioPlano) => void;
  alPendiente: (pendiente: boolean) => void;
  alActualizar: () => void;
}) {
  const [modo, setModo] = useState<Modo>(punto ? "asignar" : "ninguno");
  if (!puedeEditar(datos.rol)) return null;

  const versionInicial = fila.version_plano;
  if (typeof versionInicial !== "number" || !Number.isSafeInteger(versionInicial)) {
    return <div className="plan-upgrade-notice" role="status">
      <strong>Activa la gestión de goteros</strong>
      <p>{datos.rol === "administrador"
        ? <>Aplica la actualización <code>04_gestion_plano.sql</code> en la base de datos y pulsa Actualizar.</>
        : "El administrador debe aplicar la actualización de la base de datos para activar la gestión del plano."}</p>
    </div>;
  }

  const cantidadPuntos = datos.puntos.filter((item) => item.fila_id === fila.id).length;
  const administrador = datos.rol === "administrador";
  const asociaciones = punto ? datos.asignaciones.filter((item) => item.punto_id === punto.id).length : 0;

  function confirmar(operacion: Operacion, resultado: EstadoCambioPlano) {
    setModo("ninguno");
    alConfirmar(operacion, resultado);
  }
  function cancelar() { setModo("ninguno"); alActualizar(); }

  const comunes = { fila, versionInicial, alCancelar: cancelar, alPendiente, bloqueado };
  return <section className="point-manager" aria-label={`Gestión de goteros de ${fila.codigo}`}>
    <div className="point-manager-toolbar">
      {administrador && <button type="button" className="secondary-button compact-button" disabled={bloqueado || cantidadPuntos >= 1000}
        onClick={() => setModo("anadir")}>+ Añadir gotero a {fila.codigo}</button>}
      {punto && modo !== "asignar" && <button type="button" className="secondary-button compact-button" disabled={bloqueado}
        onClick={() => setModo("asignar")}>Editar cultivos del gotero</button>}
      {punto && administrador && modo !== "eliminar" && <button type="button" className="text-button delete-point-trigger" disabled={bloqueado}
        onClick={() => setModo("eliminar")}>Eliminar este gotero</button>}
    </div>
    {cantidadPuntos >= 1000 && administrador && <p className="form-explanation">Esta fila ha alcanzado el límite de 1000 goteros.</p>}
    {!punto && modo === "ninguno" && <p className="form-explanation">Selecciona un gotero del plano para asignarle cultivos{administrador ? " o eliminarlo" : ""}.</p>}
    {modo === "anadir" && administrador && <FormularioAnadir {...comunes} cantidadPuntos={cantidadPuntos}
      alGuardar={(resultado) => confirmar("anadir_punto", resultado)} />}
    {modo === "asignar" && punto && <FormularioCultivos {...comunes} datos={datos} punto={punto}
      alGuardar={(resultado) => confirmar("asignar_cultivos", resultado)} />}
    {modo === "eliminar" && punto && administrador && <FormularioEliminar {...comunes} punto={punto} asociaciones={asociaciones}
      alGuardar={(resultado) => confirmar("eliminar_punto", resultado)} />}
  </section>;
}
