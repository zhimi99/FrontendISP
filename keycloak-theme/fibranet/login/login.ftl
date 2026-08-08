<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=(realm.password && realm.registrationAllowed && !registrationDisabled??); section>

  <#-- ============ Título ============ -->
  <#if section = "header">
    ${msg("loginAccountTitle")}

  <#-- ============ Formulario ============ -->
  <#elseif section = "form">
    <#if realm.password>
      <form id="kc-form-login" class="fn-form" onsubmit="login.disabled = true; return true;"
            action="${url.loginAction}" method="post">

        <#-- Usuario / correo -->
        <#if !usernameHidden??>
          <div class="fn-field">
            <label for="username" class="fn-label">
              <#if !realm.loginWithEmailAllowed>${msg("username")}
              <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
              <#else>${msg("email")}</#if>
            </label>
            <div class="fn-input" <#if messagesPerField.existsError('username','password')>data-error="true"</#if>>
              <span class="fn-input-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input tabindex="1" id="username" name="username" type="text"
                     value="${(login.username!'')}" autofocus autocomplete="username"
                     placeholder="Usuario o correo"
                     aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
            </div>
          </div>
        </#if>

        <#-- Contraseña -->
        <div class="fn-field">
          <label for="password" class="fn-label">${msg("password")}</label>
          <div class="fn-input" <#if messagesPerField.existsError('username','password')>data-error="true"</#if>>
            <span class="fn-input-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
            </span>
            <input tabindex="2" id="password" name="password" type="password"
                   autocomplete="current-password" placeholder="••••••••"
                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
            <button class="fn-eye" type="button" tabindex="-1" aria-label="Mostrar u ocultar contraseña" aria-controls="password"
                    onclick="var p=document.getElementById('password');var s=p.type==='password';p.type=s?'text':'password';this.classList.toggle('is-on',s);">
              <svg class="fn-eye-show" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg class="fn-eye-hide" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <#if messagesPerField.existsError('username','password')>
            <span class="fn-field-err" aria-live="polite">
              ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
            </span>
          </#if>
        </div>

        <#-- Recordarme + recuperar -->
        <div class="fn-row">
          <#if realm.rememberMe && !usernameHidden??>
            <label class="fn-check">
              <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>>
              <span>${msg("rememberMe")}</span>
            </label>
          <#else>
            <span></span>
          </#if>
          <#if realm.resetPasswordAllowed>
            <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="fn-link">${msg("doForgotPassword")}</a>
          </#if>
        </div>

        <input type="hidden" id="id-hidden-input" name="credentialId"
               <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>

        <button tabindex="4" class="fn-btn" name="login" id="kc-login" type="submit">
          ${msg("doLogIn")}
        </button>
      </form>
    </#if>

  <#-- ============ Registro ============ -->
  <#elseif section = "info">
    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
      <div class="fn-register">
        ${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a>
      </div>
    </#if>
  </#if>

</@layout.registrationLayout>
