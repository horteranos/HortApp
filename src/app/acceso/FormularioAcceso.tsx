"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoAcceso } from "./actions";

const initialState: EstadoAcceso = { error: null, email: "" };

export default function FormularioAcceso() {
  const [state, formAction, pending] = useActionState(iniciarSesion, initialState);

  return (
    <form action={formAction} aria-busy={pending} className="auth-form">
      <div className="form-field">
        <label htmlFor="login-email">Correo electrónico</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          defaultValue={state.email}
          aria-describedby={state.error ? "login-error" : undefined}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={4096}
          aria-describedby={state.error ? "login-error" : undefined}
          required
        />
      </div>
      {state.error && (
        <p id="login-error" className="feedback-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar al huerto"}
      </button>
    </form>
  );
}
