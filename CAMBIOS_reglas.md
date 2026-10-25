# Revisión de firestore.rules → firestore_corregido.rules

Base de la revisión: el HTML disponible en esta sesión es `mayoristas_paraguay_beta_v1.html` (no existe un archivo llamado `mp_beta_v1.html`; asumo que es el mismo). Colecciones que usa el HTML: `users`, `admins` (solo lectura del propio doc), `businessRequests`, `changeRequests`, `reviews`. Los campos de las reglas coinciden con los que escribe el HTML. No se agregó ninguna colección ni campo nuevo.

## Problemas encontrados y cambios
1. **Req. 6 (incumplido):** cualquier mayorista verificado podía crear `changeRequests`, aunque su negocio no estuviera aprobado. → Ahora `create` exige que `businessRequests/{uid}` exista y tenga `status == 'approved'`. (El HTML ya solo muestra ese formulario con negocio aprobado.)
2. **Req. 5 (incumplido):** los negocios aprobados solo los podía leer su dueño o el admin. → Un usuario con correo verificado puede leer (`get`) y listar negocios con `status == 'approved'`. La consulta debe incluir `where('status','==','approved')`. Los pendientes de otros siguen sin acceso. *El HTML actual no lee negocios aprobados* (el catálogo es fijo); es un permiso preparado, no usado todavía. Efecto: los datos del negocio aprobado (incluido WhatsApp y `ownerUid`) quedan visibles para usuarios verificados.
3. **Req. 4 (endurecido):** el admin podía poner cualquier valor en `status` de opiniones y cambios. → Función `onlyModeration()`: solo `status` ∈ {pending, approved, rejected}, `reviewedBy`, `reviewedAt`.
4. **Req. 2:** el admin podía leer perfiles pero no corregirlos. → Puede actualizar solo `name` (nunca rol, correo ni fecha).
5. **Req. 7 (reforzado):** `providerId` solo exigía 5–20 caracteres, permitiendo ids arbitrarios. → Debe ser numérico de 9 a 15 dígitos (el HTML usa el WhatsApp del proveedor, 12 dígitos). La unicidad sigue garantizada por el id del documento `providerId_uid`: un segundo envío sería una escritura sobre un documento existente y no hay regla `update` para el autor. `authorName` ahora no puede estar vacío.
6. **`admins`:** se listan explícitamente `create/update/delete: false` (antes `write`) para dejar claro que ninguna cuenta puede darse permisos de administrador (Req. 8). Los administradores solo se crean a mano en la consola.

## Lo que se mantiene (revisado y correcto)
- Verificación de correo exigida en crear negocio, crear cambios y crear opiniones (`email_verified` del token; el HTML refresca el token tras verificar).
- `users` se crea sin exigir correo verificado: es inevitable, porque el perfil se crea inmediatamente después del registro, antes de verificar. Con correo sin verificar no se puede hacer nada más.
- El mayorista no puede aprobarse: su `update` exige `status == 'pending'`, solo campos editables y negocio no aprobado; solo el admin cambia el estado.
- Opiniones aprobadas son **públicas** (incluso sin sesión), porque el catálogo las muestra a cualquier visitante. Exponen `authorUid` y el nombre abreviado («Ana P.»). Si prefieres que solo las vean usuarios con sesión, cambia la primera condición de `reviews` por `verified() && resource.data.status == 'approved'`, pero el catálogo público dejaría de mostrar opiniones.
- Nadie lista `users`; todo lo no previsto está denegado.

## Pruebas
**NO ejecutadas.** En esta sesión no hay acceso al emulador de Firebase (descarga bloqueada), así que estas reglas no han sido probadas ni publicadas. Dejé `test_reglas.mjs` (41 pruebas: compradores, mayoristas, administrador, visitantes y colecciones no previstas) para correrlas en tu equipo:

```
npm init -y && npm i -D @firebase/rules-unit-testing firebase firebase-tools
npx firebase emulators:exec --only firestore "node --test test_reglas.mjs"
```
(Requiere Java y los archivos `firebase.json`, `firestore_corregido.rules` y `test_reglas.mjs` en la misma carpeta.) Los usuarios de prueba son simulados (`buyer1`, `prov1`, `adm1`…), no cuentas reales. Después de que pasen, publica las reglas desde la consola y repite una prueba manual con cuentas reales: registrar comprador y mayorista, intentar aprobarse desde la consola del navegador, etc.
