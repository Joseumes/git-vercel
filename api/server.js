require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500').split(',').map((origin) => origin.trim()).filter(Boolean);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'API de autenticación funcionando' });
});

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.replace('Bearer ', '').trim();
}

async function getAuthenticatedClient(token) {
  if (!token) {
    return null;
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: 'El correo y la contraseña son obligatorios.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres.'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || ''
        },
        emailRedirectTo: process.env.APP_URL || 'http://localhost:3000'
      }
    });

    if (error) {
      return res.status(400).json({
        message: error.message || 'No se pudo crear la cuenta.'
      });
    }

    return res.status(201).json({
      message: data.session
        ? 'Cuenta creada correctamente.'
        : 'Registro recibido. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.',
      user: data.user || null,
      session: data.session || null
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al registrar el usuario.'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: 'El correo y la contraseña son obligatorios.'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        message: error.message || 'Credenciales inválidas.'
      });
    }

    return res.json({
      message: 'Inicio de sesión correcto.',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al iniciar sesión.'
    });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        message: 'Escribe tu correo para recuperar la contraseña.'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.APP_URL || 'http://localhost:3000'
    });

    if (error) {
      return res.status(400).json({
        message: error.message || 'No se pudo solicitar la recuperación.'
      });
    }

    return res.json({
      message: 'Si el correo corresponde a una cuenta, recibirás instrucciones para recuperar el acceso.'
    });
  } catch (error) {
    console.error('Error al recuperar contraseña:', error);
    return res.status(500).json({
      message: 'No se pudo solicitar la recuperación. Inténtalo más tarde.'
    });
  }
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: 'Token de autenticación requerido.'
      });
    }

    const client = await getAuthenticatedClient(token);

    if (!client) {
      return res.status(401).json({
        message: 'Token inválido.'
      });
    }

    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        message: error?.message || 'Sesión no válida.'
      });
    }

    return res.json({
      user: data.user,
      session: {
        access_token: token
      }
    });
  } catch (error) {
    console.error('Error al comprobar la sesión:', error);
    return res.status(500).json({
      message: 'No se pudo comprobar la sesión.'
    });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);

    if (token) {
      const client = await getAuthenticatedClient(token);

      if (client) {
        await client.auth.signOut();
      }
    }

    return res.json({
      message: 'Sesión cerrada correctamente.'
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return res.status(500).json({
      message: 'No se pudo cerrar la sesión.'
    });
  }
});

app.use((error, _req, res, _next) => {
  console.error('Error no controlado:', error);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
