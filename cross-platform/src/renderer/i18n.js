// WebPDF Studio - i18n.js loader
// Supports 6 languages: English, Türkçe, Español, Deutsch, Русский, ไทย

const I18N_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  th: { name: 'ไทย', flag: '🇹🇭' }
};

let currentLang = localStorage.getItem('webpdf_studio_lang') || 'en';
let translations = {};

// Embedded fallback dictionaries for instantaneous offline zero-latency translation
const embeddedTranslations = {
  en: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.0 VERIFIED",
    "tab_create": "Create PDF",
    "tab_merge": "Merge PDFs",
    "tab_split": "Split PDF",
    "tab_about": "About",
    "about_title": "About WebPDF Studio",
    "about_desc": "High-performance desktop PDF studio for creating, merging, and splitting documents with exact precision.",
    "about_version": "Version 4.0 BASIC - VERIFIED",
    "about_developer": "Developed with ❤️ by mavvi.online",
    "btn_visit_site": "Visit Website",
    "btn_close": "Close",
    "footer_brand": "Made with ❤️ by mavvi.online",
    "Split PDF Document": "Split PDF Document",
    "Extract single pages": "Extract single pages or custom chunks into dedicated, organized PDF files.",
    "Split into Single Pages": "Split into Single Pages (1 page = 1 PDF)",
    "Split by Every X Pages": "Split by Every X Pages (Chunk Mode)",
    "Pages per chunk": "Pages per chunk:",
    "Custom Ranges": "Custom Ranges",
    "Output Folder": "Output Folder:",
    "Change Folder": "Change Folder",
    "Split Plan & Output Preview": "Split Plan & Output Preview",
    "Source Pages": "Source Pages:",
    "Mode": "Mode:",
    "Output Count": "Output Count:",
    "Open Output Folder": "Open Output Folder",
    "PDF Split Completed Successfully!": "PDF Split Completed Successfully!",
    "Made by mavvi.online": "Made with ❤️ by mavvi.online"
  },
  tr: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.0 DOĞRULANDI",
    "tab_create": "PDF Oluştur",
    "tab_merge": "PDF Birleştir",
    "tab_split": "PDF Böl",
    "tab_about": "Hakkında",
    "about_title": "WebPDF Studio Hakkında",
    "about_desc": "Tam hassasiyetle belge oluşturma, birleştirme ve bölme için yüksek performanslı masaüstü PDF stüdyosu.",
    "about_version": "Sürüm 4.0 BASIC - VERIFIED",
    "about_developer": "mavvi.online tarafından ❤️ ile geliştirildi",
    "btn_visit_site": "Web Sitesini Ziyaret Et",
    "btn_close": "Kapat",
    "footer_brand": "❤️ ile mavvi.online tarafından yapıldı",
    "Split PDF Document": "PDF Belgesini Böl",
    "Extract single pages": "Tek sayfaları veya özel parçaları düzenli PDF dosyalarına ayırın.",
    "Split into Single Pages": "Tek Sayfalara Böl (1 sayfa = 1 PDF)",
    "Split by Every X Pages": "Her X Sayfada Bir Böl (Parça Modu)",
    "Pages per chunk": "Her dosyada sayfa sayısı:",
    "Custom Ranges": "Özel Aralıklar",
    "Output Folder": "Çıktı Klasörü:",
    "Change Folder": "Klasör Değiştir",
    "Split Plan & Output Preview": "Bölme Planı ve Önizleme",
    "Source Pages": "Kaynak Sayfa:",
    "Mode": "Mod:",
    "Output Count": "Çıktı Sayısı:",
    "Open Output Folder": "Çıktı Klasörünü Aç",
    "PDF Split Completed Successfully!": "PDF Bölme Başarıyla Tamamlandı!",
    "Made by mavvi.online": "❤️ ile mavvi.online tarafından yapıldı"
  },
  es: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.0 VERIFICADO",
    "tab_create": "Crear PDF",
    "tab_merge": "Combinar PDFs",
    "tab_split": "Dividir PDF",
    "tab_about": "Acerca de",
    "about_title": "Acerca de WebPDF Studio",
    "about_desc": "Estudio de PDF de escritorio de alto rendimiento para crear, combinar y dividir documentos.",
    "about_version": "Versión 4.0 BASIC - VERIFIED",
    "about_developer": "Desarrollado con ❤️ por mavvi.online",
    "btn_visit_site": "Visitar Sitio Web",
    "btn_close": "Cerrar",
    "footer_brand": "Hecho con ❤️ por mavvi.online",
    "Split PDF Document": "Dividir Documento PDF",
    "Extract single pages": "Extrae páginas individuales o fragmentos personalizados en archivos PDF organizados.",
    "Split into Single Pages": "Dividir en Páginas Individuales (1 página = 1 PDF)",
    "Split by Every X Pages": "Dividir Cada X Páginas (Modo Fragmento)",
    "Pages per chunk": "Páginas por fragmento:",
    "Custom Ranges": "Rangos Personalizados",
    "Output Folder": "Carpeta de Salida:",
    "Change Folder": "Cambiar Carpeta",
    "Split Plan & Output Preview": "Plan de División y Vista Previa",
    "Source Pages": "Páginas Fuente:",
    "Mode": "Modo:",
    "Output Count": "Cantidad de Salida:",
    "Open Output Folder": "Abrir Carpeta de Salida",
    "PDF Split Completed Successfully!": "¡División de PDF completada con éxito!",
    "Made by mavvi.online": "Hecho con ❤️ por mavvi.online"
  },
  de: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.0 VERIFIZIERT",
    "tab_create": "PDF Erstellen",
    "tab_merge": "PDFs Zusammenführen",
    "tab_split": "PDF Teilen",
    "tab_about": "Über",
    "about_title": "Über WebPDF Studio",
    "about_desc": "Hochleistungs-Desktop-PDF-Studio zum Erstellen, Zusammenführen und Teilen von Dokumenten.",
    "about_version": "Version 4.0 BASIC - VERIFIED",
    "about_developer": "Entwickelt mit ❤️ von mavvi.online",
    "btn_visit_site": "Website Besuchen",
    "btn_close": "Schließen",
    "footer_brand": "Made with ❤️ by mavvi.online",
    "Split PDF Document": "PDF-Dokument teilen",
    "Extract single pages": "Extrahiere einzelne Seiten oder benutzerdefinierte Teile in organisierte PDF-Dateien.",
    "Split into Single Pages": "In Einzelseiten teilen (1 Seite = 1 PDF)",
    "Split by Every X Pages": "Alle X Seiten teilen (Chunk-Modus)",
    "Pages per chunk": "Seiten pro Teil:",
    "Custom Ranges": "Benutzerdefinierte Bereiche",
    "Output Folder": "Ausgabeordner:",
    "Change Folder": "Ordner ändern",
    "Split Plan & Output Preview": "Teilungsplan & Vorschau",
    "Source Pages": "Quellseiten:",
    "Mode": "Modus:",
    "Output Count": "Anzahl Ausgaben:",
    "Open Output Folder": "Ausgabeordner öffnen",
    "PDF Split Completed Successfully!": "PDF-Teilung erfolgreich abgeschlossen!",
    "Made by mavvi.online": "Made with ❤️ by mavvi.online"
  },
  ru: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.0 ПРОВЕРЕНО",
    "tab_create": "Создать PDF",
    "tab_merge": "Объединить PDF",
    "tab_split": "Разделить PDF",
    "tab_about": "О программе",
    "about_title": "О программе WebPDF Studio",
    "about_desc": "Высокопроизводительная студия для создания, объединения и разделения PDF-документов.",
    "about_version": "Версия 4.0 BASIC - VERIFIED",
    "about_developer": "Создано с ❤️ mavvi.online",
    "btn_visit_site": "Посетить сайт",
    "btn_close": "Закрыть",
    "footer_brand": "Сделано с ❤️ by mavvi.online",
    "Split PDF Document": "Разделить PDF-документ",
    "Extract single pages": "Извлекайте отдельные страницы или пользовательские фрагменты в отдельные PDF-файлы.",
    "Split into Single Pages": "Разделить на отдельные страницы (1 стр = 1 PDF)",
    "Split by Every X Pages": "Разделить каждые X страниц (Режим частей)",
    "Pages per chunk": "Страниц в части:",
    "Custom Ranges": "Пользовательские диапазоны",
    "Output Folder": "Папка вывода:",
    "Change Folder": "Сменить папку",
    "Split Plan & Output Preview": "План разделения и предпросмотр",
    "Source Pages": "Исходные страницы:",
    "Mode": "Режим:",
    "Output Count": "Кол-во файлов:",
    "Open Output Folder": "Открыть папку вывода",
    "PDF Split Completed Successfully!": "Разделение PDF успешно завершено!",
    "Made by mavvi.online": "Сделано с ❤️ by mavvi.online"
  },
  th: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.0 ตรวจสอบแล้ว",
    "tab_create": "สร้าง PDF",
    "tab_merge": "รวมไฟล์ PDF",
    "tab_split": "แยกไฟล์ PDF",
    "tab_about": "เกี่ยวกับ",
    "about_title": "เกี่ยวกับ WebPDF Studio",
    "about_desc": "โปรแกรมจัดการ PDF ประสิทธิภาพสูงสำหรับการสร้าง รวม และแยกเอกสารอย่างแม่นยำ",
    "about_version": "เวอร์ชัน 4.0 BASIC - VERIFIED",
    "about_developer": "พัฒนาด้วย ❤️ โดย mavvi.online",
    "btn_visit_site": "เยี่ยมชมเว็บไซต์",
    "btn_close": "ปิด",
    "footer_brand": "สร้างด้วย ❤️ โดย mavvi.online",
    "Split PDF Document": "แยกเอกสาร PDF",
    "Extract single pages": "แยกหน้าเดี่ยวหรือส่วนที่กำหนดเป็นไฟล์ PDF แยกต่างหาก",
    "Split into Single Pages": "แยกเป็นหน้าเดี่ยว (1 หน้า = 1 PDF)",
    "Split by Every X Pages": "แยกทุกๆ X หน้า (โหมดกลุ่ม)",
    "Pages per chunk": "จำนวนหน้าต่อไฟล์:",
    "Custom Ranges": "ช่วงหน้าที่กำหนดเอง",
    "Output Folder": "โฟลเดอร์ปลายทาง:",
    "Change Folder": "เปลี่ยนโฟลเดอร์",
    "Split Plan & Output Preview": "แผนการแยกและดูตัวอย่าง",
    "Source Pages": "จำนวนหน้าต้นฉบับ:",
    "Mode": "โหมด:",
    "Output Count": "จำนวนไฟล์ผลลัพธ์:",
    "Open Output Folder": "เปิดโฟลเดอร์ปลายทาง",
    "PDF Split Completed Successfully!": "แยกไฟล์ PDF สำเร็จเรียบร้อยแล้ว!",
    "Made by mavvi.online": "สร้างด้วย ❤️ โดย mavvi.online"
  }
};

const i18n = {
  languages: I18N_LANGUAGES,

  getCurrentLanguage() {
    return currentLang;
  },

  async loadLanguage(lang) {
    if (!I18N_LANGUAGES[lang]) lang = 'en';
    currentLang = lang;
    localStorage.setItem('webpdf_studio_lang', lang);

    // Try fetching from locales folder or use embedded
    try {
      const res = await fetch(`../locales/${lang}.json`);
      if (res.ok) {
        translations = await res.json();
      } else {
        translations = embeddedTranslations[lang] || embeddedTranslations.en;
      }
    } catch (e) {
      translations = embeddedTranslations[lang] || embeddedTranslations.en;
    }

    this.apply();
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  },

  t(key, fallback = '') {
    if (translations && translations[key]) return translations[key];
    if (embeddedTranslations[currentLang] && embeddedTranslations[currentLang][key]) {
      return embeddedTranslations[currentLang][key];
    }
    if (embeddedTranslations.en && embeddedTranslations.en[key]) {
      return embeddedTranslations.en[key];
    }
    return fallback || key;
  },

  apply() {
    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key);
      if (val) el.textContent = val;
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = this.t(key);
      if (val) el.placeholder = val;
    });

    // Translate title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = this.t(key);
      if (val) el.title = val;
    });

    // Update active flag in language selector
    const selector = document.getElementById('langSelector');
    if (selector) selector.value = currentLang;
  }
};

window.i18n = i18n;
