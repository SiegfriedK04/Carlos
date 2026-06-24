import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useSessionAuth } from "../../lib/session-auth";

export function LocalAuthPanel() {
  const queryClient = useQueryClient();
  const { acceptLocalSession } = useSessionAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return mode === "login"
        ? api.loginLocal({ email, password })
        : api.registerLocal({ displayName, email, password });
    },
    onSuccess: async (session) => {
      acceptLocalSession(session);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <div className="auth-method-panel" data-testid="local-auth-panel">
      <div className="auth-method-head">
        <div>
          <p className="eyebrow">Login alterno</p>
          <h3>{mode === "login" ? "Entrar con email" : "Crear cuenta local"}</h3>
        </div>
        <p className="muted-text auth-method-copy">Persistencia propia en MongoDB con hash de contraseñas.</p>
      </div>

      <div className="segmented-row auth-switcher">
        <button type="button" className={mode === "login" ? "cta-link" : "cta-link secondary"} onClick={() => setMode("login")}>
          Login local
        </button>
        <button type="button" className={mode === "register" ? "cta-link" : "cta-link secondary"} onClick={() => setMode("register")}>
          Registro local
        </button>
      </div>

      <form
        className="detail-list auth-local-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        {mode === "register" ? (
          <label>
            Nombre visible
            <input data-testid="auth-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        ) : null}

        <label>
          Correo
          <input data-testid="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label>
          Contrasena
          <input data-testid="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <p className="muted-text auth-hint">Usa 8+ caracteres con mayuscula, minuscula, numero y simbolo.</p>
        {mutation.error ? <p className="error-text">{mutation.error.message}</p> : null}

        <button data-testid="auth-submit" type="submit" className="cta-link auth-submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Procesando..." : mode === "login" ? "Entrar con email" : "Crear cuenta local"}
        </button>
      </form>
    </div>
  );
}
