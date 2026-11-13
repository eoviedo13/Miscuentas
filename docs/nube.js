// Conexión de Mis Cuentas con Supabase: inicio de sesión por correo y almacenes de datos.
// La URL y la clave "publishable" son públicas por diseño; lo que protege los datos es la
// seguridad por usuario (RLS) de las tablas. Nunca pongas aquí la clave "secret" ni "service_role".
(function () {
  const URL = "https://qsagawoczconnoezscrf.supabase.co";
  const KEY = "sb_publishable_-ahla1dCYBt_i85PZV0hvw_jVyULNiQ";
  if (!window.supabase) return; // sin la librería la app sigue funcionando solo en el dispositivo
  const sb = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  // Las filas de la base y los movimientos de la app se llaman distinto en "desc"/"descr".
  const aMov = (r) => ({
    id: r.id, tipo: r.tipo, monto: Number(r.monto), cat: r.cat, desc: r.descr || "", fecha: r.fecha,
    t: Number(r.t), msg: r.msg || "", texto: r.texto || "", ...(r.cuenta ? { cuenta: r.cuenta } : {}),
  });
  const aFila = (uid, id, m) => ({
    user_id: uid, id, tipo: m.tipo, monto: Math.round(Number(m.monto)), cat: m.cat, descr: m.desc || "",
    fecha: m.fecha, t: Math.round(Number(m.t)), msg: m.msg || "", texto: m.texto || "", cuenta: m.cuenta || null,
  });

  // Lee todas las filas de una tabla (el servidor entrega máximo 1000 por consulta).
  async function leerTodo(tabla, orden) {
    const out = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await sb.from(tabla).select("*").order(orden).range(desde, desde + 999);
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }

  // Un "almacén" con la misma forma que usa la app: doc(id).set / delete y onSnapshot.
  function almacen(tabla, uid, { clave, orden, leer, escribir }) {
    return {
      doc: (id) => ({
        async set(datos) {
          const { error } = await sb.from(tabla).upsert(escribir(uid, id, datos), { onConflict: "user_id," + clave });
          if (error) throw error;
        },
        async delete() {
          const { error } = await sb.from(tabla).delete().eq("user_id", uid).eq(clave, id);
          if (error) throw error;
        },
      }),
      onSnapshot(ok, fallo) {
        let pidiendo = false, otra = false;
        const traer = async () => {
          if (pidiendo) { otra = true; return; }
          pidiendo = true;
          try {
            const filas = await leerTodo(tabla, orden);
            ok({ docs: filas.map((r) => ({ id: r[clave], data: () => leer(r) })) });
          } catch (e) { fallo && fallo(e); }
          pidiendo = false;
          if (otra) { otra = false; traer(); }
        };
        traer();
        // si el bot de WhatsApp (u otro dispositivo) anota algo, se refleja aquí
        sb.channel(tabla + "-" + uid).on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => traer()).subscribe();
        document.addEventListener("visibilitychange", () => { if (!document.hidden) traer(); });
        window.addEventListener("online", traer);
      },
    };
  }

  window.Nube = {
    async sesion() { return (await sb.auth.getSession()).data.session; },
    enviarCodigo: (email) => sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }),
    verificar: (email, token) => sb.auth.verifyOtp({ email, token, type: "email" }),
    salir: () => sb.auth.signOut(),
    alCerrarSesion: (fn) => sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") fn(); }),
    almacenes(uid) {
      return {
        store: almacen("movimientos", uid, { clave: "id", orden: "t", leer: aMov, escribir: aFila }),
        cfgStore: almacen("ajustes", uid, {
          clave: "clave", orden: "clave", leer: (r) => r.datos || {},
          escribir: (u, id, datos) => ({ user_id: u, clave: id, datos }),
        }),
      };
    },
  };
})();
