// i18n.js - Sistema de Internacionalización para SpinDraw
// Sistema simple de traducciones sin dependencias externas

class I18n {
  constructor() {
    this.currentLang = 'es'; // Idioma por defecto
    this.translations = {};
    this.availableLangs = ['es', 'en', 'pt'];
    this.initialized = false;
  }

  async initialize(callback) {
    if (this.initialized) {
      if (callback && typeof callback === 'function') {
        callback();
      }
      return;
    }

    // Cargar idioma guardado o detectar del navegador
    const savedLang = localStorage.getItem('spindraw_lang');
    if (savedLang && this.availableLangs.includes(savedLang)) {
      this.currentLang = savedLang;
    } else {
      // Detectar idioma del navegador
      const browserLang = navigator.language.split('-')[0];
      if (this.availableLangs.includes(browserLang)) {
        this.currentLang = browserLang;
      }
    }

    await this.loadTranslations(this.currentLang);
    this.updateUI();
    this.setupLanguageSelector();
    this.initialized = true;

    // Ejecutar callback si se proporciona
    if (callback && typeof callback === 'function') {
      callback();
    }
  }

  async init(callback) {
    return this.initialize(callback);
  }

  async loadTranslations(lang) {
    try {
      console.log('Loading translations for lang:', lang);
      const response = await fetch(`/i18n/${lang}.json`);
      console.log('Response status:', response.status);
      this.translations = await response.json();
      console.log('Translations loaded:', this.translations);
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback a español si falla la carga
      if (lang !== 'es') {
        await this.loadTranslations('es');
      }
    }
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Reemplazar parámetros
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (match, param) => params[param] || match);
    }

    return value;
  }

  async changeLanguage(lang) {
    if (!this.availableLangs.includes(lang)) return;

    this.currentLang = lang;
    localStorage.setItem('spindraw_lang', lang);
    await this.loadTranslations(lang);
    this.updateUI();

    // Actualizar meta tags según el idioma
    this.updateMetaTags();

    // Mostrar notificación
    this.showLanguageChangeNotification();
  }

  updateUI() {
    // Actualizar elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);

      if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Actualizar elementos con data-i18n-html (para HTML interno)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      element.innerHTML = this.t(key);
    });

    // Actualizar atributos específicos
    document.querySelectorAll('[data-i18n-attr]').forEach(element => {
      const attrData = element.getAttribute('data-i18n-attr');
      const [attr, key] = attrData.split(':');
      element.setAttribute(attr, this.t(key));
    });

    // Actualizar enlaces de páginas legales según el idioma
    this.updateLegalLinks();
  }

  updateLegalLinks() {
    const langSuffix = this.currentLang === 'es' ? '' : `-${this.currentLang}`;

    // Actualizar enlaces del footer
    const privacyLink = document.querySelector('a[href*="privacidad.html"]');
    if (privacyLink) {
      privacyLink.href = `privacidad${langSuffix}.html`;
    }

    const termsLink = document.querySelector('a[href*="terminos.html"]');
    if (termsLink) {
      termsLink.href = `terminos${langSuffix}.html`;
    }

    const cookiesLink = document.querySelector('a[href*="cookies.html"]');
    if (cookiesLink) {
      cookiesLink.href = `cookies${langSuffix}.html`;
    }

    const contactLink = document.querySelector('a[href*="contacto.html"]');
    if (contactLink) {
      contactLink.href = `contacto${langSuffix}.html`;
    }
  }

  updateMetaTags() {
    // Actualizar title
    document.title = this.t('app.name') + ' - ' + this.t('app.description');

    // Actualizar meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', this.t('app.description'));
    }

    // Actualizar Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', this.t('app.name') + ' - ' + this.t('app.description'));
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', this.t('app.description'));
    }

    // Actualizar manifest dinámicamente
    this.updateManifest();
  }

  updateManifest() {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestFile = this.currentLang === 'es' ? 'manifest.json' :
                          this.currentLang === 'en' ? 'manifest-en.json' :
                          this.currentLang === 'pt' ? 'manifest-pt.json' : 'manifest.json';
      manifestLink.setAttribute('href', manifestFile);
    }
  }

  setupLanguageSelector() {
    // Crear selector de idioma si no existe
    if (!document.getElementById('language-selector')) {
      const selector = document.createElement('div');
      selector.id = 'language-selector';
      selector.className = 'language-selector';
      selector.innerHTML = `
        <select id="lang-select" class="lang-select">
          <option value="es" ${this.currentLang === 'es' ? 'selected' : ''}>🇪🇸 Español</option>
          <option value="en" ${this.currentLang === 'en' ? 'selected' : ''}>🇺🇸 English</option>
          <option value="pt" ${this.currentLang === 'pt' ? 'selected' : ''}>🇧🇷 Português</option>
        </select>
      `;

      // Insertar en el body (esquina inferior derecha)
      document.body.appendChild(selector);

      // Event listener
      document.getElementById('lang-select').addEventListener('change', (e) => {
        this.changeLanguage(e.target.value);
      });
    }
  }

  showLanguageChangeNotification() {
    showToast(`🌐 ${this.t('app.name')} - ${this.t('messages.loading')}`, 'info');
    setTimeout(() => {
      showToast(`✅ ${this.t('messages.success')}`, 'success');
    }, 500);
  }

  getCurrentLang() {
    return this.currentLang;
  }

  getAvailableLangs() {
    return this.availableLangs;
  }
}

// Instancia global
const i18n = new I18n();

// Función global para traducciones (para compatibilidad)
function __(key, params = {}) {
  return i18n.t(key, params);
}

// Hacer disponible globalmente
window.i18n = i18n;
window.__ = __;