# Guía: crear la base de datos en Supabase (Fase 1)

Hazlo desde un computador si puedes; en el celular también se puede. No cuesta nada.

## 1. Crear la cuenta y el proyecto
1. Entra a **https://supabase.com** → **Start your project** → inicia sesión con tu cuenta de GitHub.
2. **New project**. Si te pide una organización, deja la que te crea por defecto (plan **Free**).
3. Llena:
   - **Name:** `mis-cuentas`
   - **Database password:** pulsa *Generate a password* y **guárdala** en tu gestor de contraseñas (no la necesitas para la app, pero no se puede recuperar).
   - **Region:** `South America (São Paulo)`, la más cercana a Colombia.
4. **Create new project** y espera 1–2 minutos.

## 2. Crear las tablas
1. Menú de la izquierda → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/001_base.sql` de este repositorio, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe decir *Success. No rows returned*.
4. Comprueba en **Table Editor**: deben aparecer `movimientos`, `ajustes` y `perfiles`, cada una con el aviso de RLS activo.

## 3. Activar el inicio de sesión con correo
1. **Authentication** → **Sign In / Providers** → **Email** debe estar activado (viene así por defecto).
2. **Authentication** → **URL Configuration**:
   - **Site URL:** `https://eoviedo13.github.io/miscuentas/`
   - En **Redirect URLs** agrega la misma dirección.

## 3b. Crear tu usuario (una sola vez, sin correos)
La app entra con correo y contraseña. Tú creas el usuario a mano y Supabase no manda ningún correo:
1. **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña que puedas recordar (mínimo 8 caracteres).
3. Marca **Auto Confirm User** y crea el usuario.
4. Luego, en **Authentication → Sign In / Providers**, apaga **Allow new users to sign up**. Así solo existes tú.

## 4. Copiar dos datos para la app
En **Project Settings** (engranaje) → **API** copia:
- **Project URL** (algo como `https://abcdefgh.supabase.co`)
- **anon public key** (clave pública, empieza por `eyJ…`)

Estos dos **sí se pueden compartir conmigo y quedan en el código**: están hechos para ser públicos, y lo que protege tus datos es la seguridad por usuario (RLS) que creaste en el paso 2.

## Lo que NO debes compartir nunca
La clave **service_role** (también aparece en esa pantalla). Esa da acceso total y no se pega en el chat ni en GitHub.
