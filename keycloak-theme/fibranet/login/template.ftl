<#--
  FIBRA NET · plantilla base del tema de login (Keycloak)
  Define la macro registrationLayout que envuelve todas las páginas de login.
  Diseño en dos paneles: marca (izquierda, negro/verde) + formulario (derecha).
-->
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${.lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if> class="${properties.kcHtmlClass!}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${msg("loginTitle",(realm.displayName!''))}</title>
  <link rel="icon" href="${url.resourcesPath}/img/favicon.ico">
  <#if properties.styles?has_content>
    <#list properties.styles?split(' ') as style>
      <link href="${url.resourcesPath}/${style}" rel="stylesheet">
    </#list>
  </#if>
  <#if properties.scripts?has_content>
    <#list properties.scripts?split(' ') as script>
      <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
    </#list>
  </#if>
</head>

<body class="${properties.kcBodyClass!}">
  <div class="fn-split">

    <#-- ============ Panel de marca ============ -->
    <aside class="fn-brand" aria-hidden="true">
      <div class="fn-brand-glow"></div>
      <div class="fn-brand-inner">
        <img class="fn-logo" src="${url.resourcesPath}/img/logo.png" alt="FIBRA NET">
        <p class="fn-tagline">La fibra óptica de Chordeleg</p>
        <ul class="fn-points">
          <li><span class="fn-dot"></span> Gestión integral de clientes y contratos</li>
          <li><span class="fn-dot"></span> Facturación electrónica SRI</li>
          <li><span class="fn-dot"></span> Soporte técnico y monitoreo de red</li>
        </ul>
      </div>
      <div class="fn-brand-foot">Sistema Integral de Gestión ISP · Contrato SM-2026-0102</div>
    </aside>

    <#-- ============ Panel del formulario ============ -->
    <main class="fn-panel">
      <div class="fn-card">

        <#-- Marca compacta (visible al colapsar el panel de la izquierda) -->
        <div class="fn-card-brand">
          <img class="fn-card-logo" src="${url.resourcesPath}/img/logo.png" alt="FIBRA NET">
        </div>

        <header class="fn-head">
          <h1><#nested "header"></h1>
          <p class="fn-sub">Sistema Integral de Gestión ISP</p>
        </header>

        <#-- ============ Mensajes globales ============ -->
        <#if displayMessage && message?? && (message.summary?has_content) && (message.type != 'warning' || !isAppInitiatedAction??)>
          <div class="fn-alert fn-alert-${message.type}" role="alert">
            <span class="fn-alert-ico" aria-hidden="true">
              <#if message.type = 'success'>✓<#elseif message.type = 'warning'>!<#elseif message.type = 'error'>!<#else>i</#if>
            </span>
            <span class="fn-alert-text">${kcSanitize(message.summary)?no_esc}</span>
          </div>
        </#if>

        <div class="fn-body-content">
          <#nested "form">
        </div>

        <#if displayInfo>
          <div class="fn-info">
            <#nested "info">
          </div>
        </#if>
      </div>

      <footer class="fn-foot">
        <span>© ${.now?string('yyyy')} FIBRA NET · Chordeleg, Azuay</span>
        <#if realm.internationalizationEnabled && locale?? && locale.supported?size gt 1>
          <span class="fn-foot-sep">·</span>
          <div class="fn-locale">
            <#list locale.supported as l>
              <a href="${l.url}"<#if l.languageTag == locale.currentLanguageTag> class="active"</#if>>${l.label}</a>
            </#list>
          </div>
        </#if>
      </footer>
    </main>
  </div>
</body>
</html>
</#macro>
