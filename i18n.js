// i18n.js - Sistema de Internacionalización para SpinDraw
// Sistema simple de traducciones sin dependencias externas
class I18n {
  constructor() {
    this.currentLang = 'es'; // Idioma por defecto
    this.translations = {};
    this.availableLangs = ['es', 'en', 'pt'];
    this.initialized = false;
    // Inicializar traducciones básicas por defecto
    this.translations = {
      es: {
        wheel: { defaultName: 'Ruleta 1' },
        sidebar: {
          menu: 'Menú',
          participants: 'Participantes',
          settings: 'Ajustes',
          theme: 'Tema',
          logo: 'Logo',
          sound: 'Sonido',
          fullscreen: 'Pantalla Completa',
          admin: 'Admin'
        },
        sidebarSettings: {
          participantsTitle: 'Participantes',
          total: 'Total:',
          unlimited: 'Ilimitados con Pro ↑'
        },
        paywallModal: {
          title: '¡Actualiza a Pro!',
          subtitle: 'Desbloquea todas las funciones premium',
          monthly: 'Plan Mensual',
          perMonth: '/mes',
          bestValue: 'Mejor Valor',
          lifetime: 'Plan Vitalicio',
          oneTime: 'Pago único',
          unlimited: 'Ruletas ilimitadas',
          multiple: 'Múltiples ruletas',
          customLogo: 'Logo personalizado',
          themes: 'Temas premium',
          sounds: 'Sonidos premium',
          stream: 'Modo Stream',
          import: 'Importar participantes',
          noAds: 'Sin anuncios',
          upgrade: 'Actualizar Ahora',
          cancel: 'Cancelar'
        }
      },
      en: {
        wheel: { defaultName: 'Wheel 1' },
        sidebar: {
          menu: 'Menu',
          participants: 'Participants',
          settings: 'Settings',
          theme: 'Theme',
          logo: 'Logo',
          sound: 'Sound',
          fullscreen: 'Fullscreen',
          admin: 'Admin'
        },
        sidebarSettings: {
          participantsTitle: 'Participants',
          total: 'Total:',
          unlimited: 'Unlimited with Pro ↑'
        },
        paywallModal: {
          title: 'Upgrade to Pro!',
          subtitle: 'Unlock all premium features',
          monthly: 'Monthly Plan',
          perMonth: '/month',
          bestValue: 'Best Value',
          lifetime: 'Lifetime Plan',
          oneTime: 'One-time payment',
          unlimited: 'Unlimited wheels',
          multiple: 'Multiple wheels',
          customLogo: 'Custom logo',
          themes: 'Premium themes',
          sounds: 'Premium sounds',
          stream: 'Stream mode',
          import: 'Import participants',
          noAds: 'No ads',
          upgrade: 'Upgrade Now',
          cancel: 'Cancel'
        }
      },
      pt: {
        wheel: { defaultName: 'Roleta 1' },
        sidebar: {
          menu: 'Menu',
          participants: 'Participantes',
          settings: 'Configurações',
          theme: 'Tema',
          logo: 'Logo',
          sound: 'Som',
          fullscreen: 'Tela Cheia',
          admin: 'Admin'
        },
        sidebarSettings: {
          participantsTitle: 'Participantes',
          total: 'Total:',
          unlimited: 'Ilimitados com Pro ↑'
        },
        paywallModal: {
          title: 'Atualize para Pro!',
          subtitle: 'Desbloqueie todos os recursos premium',
          monthly: 'Plano Mensal',
          perMonth: '/mês',
          bestValue: 'Melhor Valor',
          lifetime: 'Plano Vitalício',
          oneTime: 'Pagamento único',
          unlimited: 'Roleta ilimitadas',
          multiple: 'Múltiplas roletas',
          customLogo: 'Logo personalizado',
          themes: 'Temas premium',
          sounds: 'Sons premium',
          stream: 'Modo Stream',
          import: 'Importar participantes',
          noAds: 'Sem anúncios',
          upgrade: 'Atualizar Agora',
          cancel: 'Cancelar'
        }
      }
    };
    // Esperar a que el DOM esté listo antes de cargar traducciones
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.loadTranslationsAsync();
      });
    } else {
      this.loadTranslationsAsync();
    }
  }

  async loadTranslationsAsync() {
    try {
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

      const response = await fetch(`/i18n/${this.currentLang}.json`);
      if (response.ok) {
        const loadedTranslations = await response.json();
        // Fusionar las traducciones cargadas con las básicas
        this.translations[this.currentLang] = { ...this.translations[this.currentLang], ...loadedTranslations };
        this.initialized = true;
        this.updateUI();
        this.setupLanguageSelector();
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      // Mantener valores por defecto
    }
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
    // Valores por defecto hardcodeados para casos críticos
    const defaults = {
      'wheel.defaultName': this.currentLang === 'es' ? 'Ruleta 1' : this.currentLang === 'en' ? 'Wheel 1' : 'Roleta 1'
    };

    if (defaults[key]) {
      return defaults[key];
    }

    // Buscar en las traducciones del idioma actual
    const keys = key.split('.');
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      value = value?.[k];
    }

    if (value !== undefined) {
      // Reemplazar parámetros
      if (typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (match, param) => params[param] || match);
      }
      return value;
    }

    console.warn(`Translation missing for key: ${key}`);
    return key;
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