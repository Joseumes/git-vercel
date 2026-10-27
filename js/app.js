
const authForm = document.getElementById("auth-form");
const formTitle = document.getElementById("form-title");
const formDescription = document.getElementById("form-description");
const nameField = document.getElementById("name-field");
const fullNameInput = document.getElementById("full-name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit-button");
const togglePassword = document.getElementById("toggle-password");
const forgotWrapper = document.getElementById("forgot-wrapper");
const forgotPassword = document.getElementById("forgot-password");
const switchWrapper = document.getElementById("switch-wrapper");
const switchModeButton = document.getElementById("switch-mode");
const message = document.getElementById("message");
const dashboard = document.getElementById("dashboard");
const userEmail = document.getElementById("user-email");
const userName = document.getElementById("user-name");
const logoutButton = document.getElementById("logout-button");

let isRegisterMode = false;
let isBusy = false;

function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function clearMessage() {
  message.textContent = "";
  message.className = "message";
}

function setBusy(busy) {
  isBusy = busy;
  submitButton.disabled = busy;
  logoutButton.disabled = busy;
  submitButton.textContent = busy
    ? "Procesando..."
    : isRegisterMode
      ? "Crear cuenta"
      : "Iniciar sesión";
}

function setMode(registerMode) {
  isRegisterMode = registerMode;

  formTitle.textContent = registerMode ? "Crear cuenta" : "Bienvenido";
  formDescription.textContent = registerMode
    ? "Completa tus datos para registrarte."
    : "Ingresa tus datos para continuar.";

  nameField.hidden = !registerMode;
  fullNameInput.required = registerMode;
  passwordInput.autocomplete = registerMode
    ? "new-password"
    : "current-password";

  forgotWrapper.hidden = registerMode;

  switchWrapper.firstChild.textContent = registerMode
    ? "¿Ya tienes una cuenta? "
    : "¿No tienes una cuenta? ";

  switchModeButton.textContent = registerMode
    ? "Inicia sesión"
    : "Regístrate";

  clearMessage();
  setBusy(false);
}

function renderSession(session) {
  const user = session?.user;

  authForm.hidden = Boolean(user);
  dashboard.hidden = !user;
  switchWrapper.hidden = Boolean(user);
  message.hidden = Boolean(user);

  if (user) {
    userEmail.textContent = user.email || "";
    userName.textContent =
      user.user_metadata?.full_name || "Usuario registrado";

    clearMessage();
  } else {
    message.hidden = false;
  }

  setBusy(false);
}

togglePassword.addEventListener("click", () => {
  const showing = passwordInput.type === "text";

  passwordInput.type = showing ? "password" : "text";
  togglePassword.textContent = showing ? "Mostrar" : "Ocultar";
  togglePassword.setAttribute(
    "aria-label",
    showing ? "Mostrar contraseña" : "Ocultar contraseña"
  );
});

switchModeButton.addEventListener("click", () => {
  if (isBusy) return;
  setMode(!isRegisterMode);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isBusy) return;

  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const fullName = fullNameInput.value.trim();

  if (!email || !password) {
    showMessage("Completa el correo y la contraseña.", "error");
    return;
  }

  if (password.length < 8) {
    showMessage(
      "La contraseña debe tener al menos 8 caracteres.",
      "error"
    );
    return;
  }

  if (isRegisterMode && !fullName) {
    showMessage("Escribe tu nombre completo.", "error");
    return;
  }

  setBusy(true);

  try {
    if (isRegisterMode) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.session) {
        renderSession(data.session);
        showMessage("Cuenta creada correctamente.", "success");
      } else {
        showMessage(
          "Registro recibido. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.",
          "success"
        );

        authForm.reset();
        passwordInput.type = "password";
        togglePassword.textContent = "Mostrar";
      }
    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      renderSession(data.session);
      showMessage("Inicio de sesión correcto.", "success");
    }
  } catch (error) {
    console.error("Error de autenticación:", error);

    showMessage(
      isRegisterMode
        ? "No se pudo crear la cuenta. Verifica los datos e inténtalo de nuevo."
        : "No se pudo iniciar sesión. Verifica el correo y la contraseña.",
      "error"
    );
  } finally {
    setBusy(false);
  }
});

forgotPassword.addEventListener("click", async () => {
  if (isBusy) return;

  const email = emailInput.value.trim();

  if (!email) {
    showMessage(
      "Escribe tu correo para solicitar la recuperación.",
      "info"
    );
    emailInput.focus();
    return;
  }

  setBusy(true);

  try {
    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

    if (error) throw error;

    showMessage(
      "Si el correo corresponde a una cuenta, recibirás instrucciones para recuperar el acceso.",
      "success"
    );
  } catch (error) {
    console.error("Error de recuperación:", error);
    showMessage(
      "No se pudo solicitar la recuperación. Inténtalo más tarde.",
      "error"
    );
  } finally {
    setBusy(false);
  }
});

logoutButton.addEventListener("click", async () => {
  if (isBusy) return;

  setBusy(true);

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    renderSession(null);
    authForm.reset();
    setMode(false);
    showMessage("Sesión cerrada correctamente.", "success");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    showMessage("No se pudo cerrar la sesión.", "error");
  } finally {
    setBusy(false);
  }
});

// Recuperar la sesión cuando se abre o recarga la página.
(async function initializeAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    renderSession(data.session);
  } catch (error) {
    console.error("Error al comprobar la sesión:", error);
    showMessage(
      "No se pudo conectar con Supabase. Revisa la configuración.",
      "error"
    );
  }
})();

// Actualizar la interfaz cuando cambia la sesión.
supabaseClient.auth.onAuthStateChange((event, session) => {
  renderSession(session);
});
