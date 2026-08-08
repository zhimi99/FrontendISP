# Tema de login FIBRA NET para Keycloak

Login branded del **Sistema Integral de Gestión ISP** (Chordeleg, Azuay). Es la
pantalla de login **real** del sistema: la sirve Keycloak, no la app Angular
(`onLoad: 'login-required'`). Colores tomados del logotipo: negro, verde fibra y blanco.

## Estructura

```
keycloak-theme/
├── fibranet/
│   └── login/
│       ├── theme.properties        # parent=base + enlaza login.css
│       ├── template.ftl            # skeleton: split marca / formulario
│       ├── login.ftl               # formulario (usuario, clave, recordarme, social…)
│       └── resources/
│           ├── css/login.css       # todo el diseño
│           └── img/
│               ├── logo.jpeg
│               └── favicon.ico
├── preview.html                    # vista estática para revisar el diseño sin servidor
└── README.md
```

`preview.html` reproduce el markup y el CSS del tema con datos de ejemplo. Ábrelo en
el navegador para ver el diseño sin desplegar Keycloak. **No** forma parte del tema.

## Estado en este proyecto (ya integrado)

El tema **ya está aplicado** al Keycloak de desarrollo (`isp-keycloak`, realm `smartuz`):

- `BackendISP/docker-compose.yml` monta este tema en el contenedor
  (`../FrontendISP/keycloak-theme/fibranet:/opt/keycloak/themes/fibranet:ro`).
- `BackendISP/infra/keycloak/realm-smartuz.json` fija `loginTheme: fibranet` e idioma
  español por defecto (`internationalizationEnabled`, `defaultLocale: es`).

Así, tras `docker compose up` el login sale branded y en español sin tocar nada. En el
contenedor **ya en marcha** se aplicó en caliente (`docker cp` + `kcadm`), por lo que
también se ve ahora mismo. Al estar en modo `start-dev`, Keycloak no cachea temas: si
editas `login.css`/`.ftl`, recarga la página y listo (si editaste en caliente vía
`docker cp`, vuelve a copiar; con el montaje del compose, recrea el contenedor).

## Despliegue

### Opción A — Keycloak clásico (carpeta `themes/`)

1. Copia la carpeta `fibranet/` a `<KEYCLOAK_HOME>/themes/`:
   ```
   <KEYCLOAK_HOME>/themes/fibranet/login/...
   ```
2. Arranca (o reinicia) Keycloak. En desarrollo conviene desactivar la caché de temas:
   ```bash
   bin/kc.sh start-dev --spi-theme-cache-themes=false --spi-theme-static-max-age=-1
   ```
3. En la **consola de administración** → tu *realm* → **Realm settings** → pestaña
   **Themes** → **Login theme** = `fibranet` → **Save**.

### Opción B — Docker

Monta el tema como volumen dentro de la imagen oficial:

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
    volumes:
      - ./keycloak-theme/fibranet:/opt/keycloak/themes/fibranet:ro
    ports:
      - "8080:8080"
```

Luego selecciona `fibranet` como **Login theme** del realm (mismo paso 3 de arriba).

## Notas de diseño

- **Dos paneles**: marca a la izquierda (negro con trazos de fibra en verde y el logo)
  y formulario a la derecha (tarjeta clara). En móvil el panel oscuro se colapsa y
  aparece el logo compacto sobre el formulario.
- **Componentes reales de Keycloak**: usuario/correo, contraseña con mostrar/ocultar,
  “Recordarme”, “¿Olvidaste tu contraseña?”, proveedores sociales y registro — cada uno
  se muestra solo si el realm lo tiene habilitado.
- **Mensajes y errores** de Keycloak (`${message}`, `messagesPerField`) se estilizan con
  las alertas del tema.
- `template.ftl` fija `parent=base`, por lo que el resto de páginas (recuperar clave,
  registro, OTP…) siguen con el tema base de Keycloak hasta que se diseñen. La petición
  actual cubre **login**; el resto se puede añadir sobre esta misma base.

## Personalización rápida

- **Color de marca**: variables `--fn-green*` al inicio de `resources/css/login.css`.
- **Lema y viñetas**: bloque `.fn-brand-inner` en `template.ftl`.
- **Logo**: reemplaza `resources/img/logo.png` (mismo nombre). El original venía como
  JPEG con la cuadrícula de transparencia horneada; se aplanó a blanco y se recortó a la
  caja del wordmark para que luzca limpio en el chip blanco sobre el panel oscuro.
