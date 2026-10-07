# Banquillo · Ligas de Blood Bowl

Web para organizar ligas y torneos de Blood Bowl entre muchos entrenadores. Cada uno se registra con su email, gestiona sus equipos y mete los resultados de sus partidos. Quien crea una competición la organiza.

## Qué hace

- **Cuentas de entrenador** con email y contraseña.
- **Equipos propios**: raza, tesorería, segundas oportunidades, boticario, hinchas y plantilla (dorsal, posición, PE, valor, estado). El valor de equipo se calcula solo. Los demás pueden ver tu plantilla, pero solo tú la cambias.
- **Competiciones** en dos formatos: liga de todos contra todos (a una vuelta o a ida y vuelta) y torneo con sistema suizo.
- **Inscripción**: la competición nace con la inscripción abierta, cada entrenador apunta su equipo y la organización le da comienzo. Entonces se genera el calendario (la liga entera o la primera ronda del torneo).
- **Actas**: el resultado (touchdowns y lesiones) lo mete cualquiera de los dos entrenadores o la organización. Nadie más puede tocarlo.
- **Clasificación en directo** para todos los que tengan la web abierta. Desempate por puntos, diferencia de TD, diferencia de lesiones y TD a favor.

Sin configurar nada, la app arranca en **modo demo** con datos de ejemplo guardados en el navegador.

## Puesta en marcha (unos 20 minutos, todo gratis)

### 1. Base de datos en Supabase
1. Crea una cuenta en <https://supabase.com> y pulsa **New project**. Elige una región europea y apunta la contraseña de la base de datos.
2. Cuando esté listo, ve a **SQL Editor > New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Debe terminar con "Success".
3. Después, en otra consulta nueva, pega [`supabase/bb2025.sql`](supabase/bb2025.sql) y pulsa **Run**. Añade la experiencia de los jugadores, los avances y los incentivos. Si ya tenías la base de datos creada, basta con ejecutar este archivo.
   Luego haz lo mismo con [`supabase/acta.sql`](supabase/acta.sql): permite que el acta recoja a los dos equipos y las lesiones de cada jugador.
3. En **Project Settings > API** copia la **Project URL** y la clave **anon public**. Estas dos son públicas y es normal que vayan en la web. No copies la clave `service_role`.
4. En **Authentication > URL Configuration** pon en *Site URL* la dirección donde publicarás la web (la del paso 3). Así los emails de confirmación llevan al sitio correcto.

### 2. Código en GitHub
Sube esta carpeta a un repositorio nuevo de GitHub (puede ser privado).

### 3. Publicar en Vercel
1. Crea una cuenta en <https://vercel.com> entrando con GitHub y pulsa **Add New > Project**. Elige el repositorio.
2. Vercel detecta Vite solo. En **Environment Variables** añade:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clave anon public
3. Pulsa **Deploy**. En un minuto tendrás una dirección del tipo `banquillo.vercel.app` para pasar a los entrenadores.

También funciona en Netlify o Cloudflare Pages: el comando de build es `npm run build` y la carpeta de salida `dist`.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena las dos variables o déjalas vacías para el modo demo
npm run dev
```

`npm run build` comprueba los tipos y genera la web en `dist/`.

## Permisos (resumen de `supabase/schema.sql`)

| Acción | Quién |
|---|---|
| Ver competiciones, equipos, plantillas y resultados | Cualquiera, incluso sin cuenta |
| Crear y editar un equipo y su plantilla | Su entrenador |
| Crear una competición | Cualquier entrenador (pasa a organizarla) |
| Cambiar reglas, empezar, emparejar rondas, cerrar o borrar | La organización |
| Inscribir o retirar un equipo | Su entrenador mientras la inscripción está abierta, o la organización |
| Meter o anular un resultado | Los dos entrenadores del partido o la organización |
| Cambiar quién juega contra quién | Solo la organización |

Los permisos se aplican en la base de datos, así que no dependen de la web: aunque alguien manipule el navegador, no puede tocar datos ajenos.
