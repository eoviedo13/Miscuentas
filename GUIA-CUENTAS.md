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
1. **Authentication** → **Providers** → **Email** debe estar activado (viene así por defecto).
2. **Authentication** → **URL Configuration**:
   - **Site URL:** `https://eoviedo13.github.io/miscuentas/`
   - En **Redirect URLs** agrega la misma dirección.

## 3b. Que el correo traiga el código de 6 números
La app entra con un código que llega al correo, no con un enlace. Por defecto Supabase manda un enlace, así que hay que cambiar la plantilla:
1. **Authentication** → **Emails** → plantilla **Magic link** (en algunas versiones: *Email Templates*).
2. Cambia el **asunto** a `Tu código de Mis Cuentas`.
3. En el **cuerpo**, reemplaza todo por:
   ```html
   <p>Tu código para entrar a Mis Cuentas es:</p>
   <h2>{{ .Token }}</h2>
   <p>Si no lo pediste tú, ignora este correo.</p>
   ```
4. Guarda. Ojo: el correo gratis de Supabase tiene un tope bajo de envíos por hora; como la sesión se mantiene abierta, casi no lo notarás.
5. **Cuando ya hayas entrado una vez:** **Authentication → Sign In / Providers** y apaga **Allow new users to sign up**, para que nadie más pueda crear cuentas en tu proyecto.

## 3c. Tiempo real (opcional pero recomendado)
En **SQL Editor**, pega y corre `supabase/migrations/002_tiempo_real.sql`. Así lo que anote el bot de WhatsApp aparece al instante en la app.

## 4. Copiar dos datos para la app
En **Project Settings** (engranaje) → **API** copia:
- **Project URL** (algo como `https://abcdefgh.supabase.co`)
- **anon public key** (clave pública, empieza por `eyJ…`)

Estos dos **sí se pueden compartir conmigo y quedan en el código**: están hechos para ser públicos, y lo que protege tus datos es la seguridad por usuario (RLS) que creaste en el paso 2.

## Lo que NO debes compartir nunca
La clave **service_role** (también aparece en esa pantalla). Esa da acceso total y no se pega en el chat ni en GitHub.
