// i18n.js - Sistema de Internacionalización para SpinDraw
// Sistema simple de traducciones sin dependencias externas

class I18n {
  constructor() {
    this.currentLang = 'es'; // Idioma por defecto
    this.translations = {};
    this.availableLangs = ['es', 'en', 'pt'];
    this.init();
  }

  async init() {
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
  }

  async loadTranslations(lang) {
    try {
      const response = await fetch(`/i18n/${lang}.json`);
      this.translations = await response.json();
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

      // Insertar en el header
      const header = document.querySelector('header') || document.querySelector('.nav') || document.body;
      header.appendChild(selector);

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