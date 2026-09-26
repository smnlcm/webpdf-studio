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

let currentLang = 'en';
try {
  currentLang = localStorage.getItem('webpdf_studio_lang') || localStorage.getItem('language') || 'en';
} catch (_) {}
let translations = {};

// Embedded fallback dictionaries for instantaneous offline zero-latency translation
const embeddedTranslations = {
  en: {
    "app_name": "WebPDF Studio",
    "badge_verified": "v4.2 Free Version",
    "tab_dashboard": "Dashboard",
    "tab_create": "Create PDF",
    "tab_merge": "Merge PDFs",
    "tab_split": "Split PDF",
    "tab_compress": "Compress",
    "tab_ocr": "OCR",
    "tab_about": "About",
    "ready_status": "● Ready",
    "about_title": "About WebPDF Studio",
    "about_desc": "High-performance desktop PDF studio for creating, merging, and splitting documents with exact precision.",
    "about_version": "WebPDF Studio v4.2 Free Version",
    "about_developer": "Developed with ❤️ by mavvi.online",
    "btn_visit_site": "Visit Website",
    "btn_close": "Close",
    "footer_brand": "Made with ❤️ by mavvi.online",
    "dashboard_title": "WebPDF Studio v4.2 Free Version — Engine Verified",
    "dashboard_subtitle": "Fully optimized for Windows, large 300+ page documents, and Turkish characters.",
    "dash_card1_title": "✅ Verified Direct File Saving",
    "dash_card1_desc": "Save locations are prompted directly via native Windows dialogs. Files are written directly to disk and verified (size > 0), resolving the Adobe Acrobat \"File cannot be found\" issue.",
    "dash_card2_title": "⭐ Single-Page Mode for Split",
    "dash_card2_desc": "Extract every single page into an individual 1-page PDF file (e.g. 50 pages → 50 separate PDFs) automatically organized into a dedicated output folder.",
    "dash_card3_title": "⚡ 300+ Page & Large File Performance",
    "dash_card3_desc": "Heavy files (like 330-page lecture notes) are processed using worker threads and streamed directly to disk, preventing memory crashes and IPC bottlenecks.",
    "dash_card4_title": "🇹🇷 Turkish Character & Path Support",
    "dash_card4_desc": "Full support for Turkish characters (ı, ş, ğ, ç, ö, ü) and Windows paths without path corruption or broken backslashes.",
    "btn_create_html": "Create PDF from HTML →",
    "btn_merge_pdfs": "Merge PDFs →",
    "btn_split_single": "Split PDF (Single Mode) →",
    "btn_choose_html": "📁 Choose HTML File",
    "btn_refresh_preview": "Refresh Preview",
    "btn_create_pdf": "Create PDF",
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
    "badge_verified": "v4.2 Free Version",
    "tab_dashboard": "Gösterge Paneli",
    "tab_create": "PDF Oluştur",
    "tab_merge": "PDF Birleştir",
    "tab_split": "PDF Böl",
    "tab_compress": "Sıkıştır",
    "tab_ocr": "OCR",
    "tab_about": "Hakkında",
    "ready_status": "● Hazır",
    "about_title": "WebPDF Studio Hakkında",
    "about_desc": "Tam hassasiyetle belge oluşturma, birleştirme ve bölme için yüksek performanslı masaüstü PDF stüdyosu.",
    "about_version": "WebPDF Studio v4.2 Free Version",
    "about_developer": "mavvi.online tarafından ❤️ ile geliştirildi",
    "btn_visit_site": "Web Sitesini Ziyaret Et",
    "btn_close": "Kapat",
    "footer_brand": "❤️ ile mavvi.online tarafından yapıldı",
    "dashboard_title": "WebPDF Studio v4.2 Free Version — Motor Doğrulandı",
    "dashboard_subtitle": "Windows, 300+ sayfalık büyük belgeler ve Türkçe karakterler için tam optimize edilmiştir.",
    "dash_card1_title": "✅ Doğrulanmış Doğrudan Dosya Kaydetme",
    "dash_card1_desc": "Kayıt konumları doğrudan yerel Windows iletişim kutularıyla sorulur. Dosyalar doğrudan diske yazılır ve doğrulanır (boyut > 0), Adobe Acrobat \"Dosya bulunamadı\" sorununu çözer.",
    "dash_card2_title": "⭐ Bölme İçin Tek Sayfa Modu",
    "dash_card2_desc": "Her sayfayı tek tek 1 sayfalık PDF dosyası olarak (ör. 50 sayfa → 50 ayrı PDF) otomatik olarak ayrılmış bir çıktı klasörüne çıkarın.",
    "dash_card3_title": "⚡ 300+ Sayfa ve Büyük Dosya Performansı",
    "dash_card3_desc": "Ağır dosyalar (330 sayfalık ders notları gibi) çalışan iş parçacıkları ile işlenir ve diske aktarılır, bellek çökmelerini ve IPC tıkanmalarını önler.",
    "dash_card4_title": "🇹🇷 Türkçe Karakter ve Yol Desteği",
    "dash_card4_desc": "Türkçe karakterler (ı, ş, ğ, ç, ö, ü) ve Windows yolları için bozulma olmadan tam destek.",
    "btn_create_html": "HTML'den PDF Oluştur →",
    "btn_merge_pdfs": "PDF Birleştir →",
    "btn_split_single": "PDF Böl (Tekli Mod) →",
    "btn_choose_html": "📁 HTML Dosyası Seç",
    "btn_refresh_preview": "Önizlemeyi Yenile",
    "btn_create_pdf": "PDF Oluştur",
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
    "badge_verified": "v4.2 Free Version",
    "tab_dashboard": "Panel de Control",
    "tab_create": "Crear PDF",
    "tab_merge": "Combinar PDFs",
    "tab_split": "Dividir PDF",
    "tab_compress": "Comprimir",
    "tab_ocr": "OCR",
    "tab_about": "Acerca de",
    "ready_status": "● Listo",
    "about_title": "Acerca de WebPDF Studio",
    "about_desc": "Estudio de PDF de escritorio de alto rendimiento para crear, combinar y dividir documentos con precisión exacta.",
    "about_version": "WebPDF Studio v4.2 Free Version",
    "about_developer": "Desarrollado con ❤️ por mavvi.online",
    "btn_visit_site": "Visitar Sitio Web",
    "btn_close": "Cerrar",
    "footer_brand": "Hecho con ❤️ por mavvi.online",
    "dashboard_title": "WebPDF Studio v4.2 Free Version — Motor Verificado",
    "dashboard_subtitle": "Totalmente optimizado para Windows, documentos de más de 300 páginas y caracteres especiales.",
    "dash_card1_title": "✅ Guardado Directo de Archivos Verificado",
    "dash_card1_desc": "Las ubicaciones de guardado se solicitan a través de cuadros de diálogo nativos. Los archivos se escriben directamente en el disco y se verifican (tamaño > 0).",
    "dash_card2_title": "⭐ Modo de Página Única para División",
    "dash_card2_desc": "Extraiga cada página en un archivo PDF individual de 1 página organizado automáticamente en una carpeta de salida dedicada.",
    "dash_card3_title": "⚡ Rendimiento de Archivos Grandes y 300+ Páginas",
    "dash_card3_desc": "Los archivos pesados se procesan usando hilos de trabajo y se transmiten directamente al disco, evitando caídas de memoria.",
    "dash_card4_title": "🇹🇷 Compatibilidad con Rutas y Caracteres",
    "dash_card4_desc": "Soporte completo para caracteres internacionales y rutas de Windows sin corrupción.",
    "btn_create_html": "Crear PDF desde HTML →",
    "btn_merge_pdfs": "Combinar PDFs →",
    "btn_split_single": "Dividir PDF (Modo Individual) →",
    "btn_choose_html": "📁 Elegir Archivo HTML",
    "btn_refresh_preview": "Actualizar Vista Previa",
    "btn_create_pdf": "Crear PDF",
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
    "badge_verified": "v4.2 Free Version",
    "tab_dashboard": "Dashboard",
    "tab_create": "PDF Erstellen",
    "tab_merge": "PDFs Zusammenführen",
    "tab_split": "PDF Teilen",
    "tab_compress": "Komprimieren",
    "tab_ocr": "OCR",
    "tab_about": "Über",
    "ready_status": "● Bereit",
    "about_title": "Über WebPDF Studio",
    "about_desc": "Hochleistungs-Desktop-PDF-Studio zum Erstellen, Zusammenführen und Teilen von Dokumenten mit exakter Präzision.",
    "about_version": "WebPDF Studio v4.2 Free Version",
    "about_developer": "Entwickelt mit ❤️ von mavvi.online",
    "btn_visit_site": "Website Besuchen",
    "btn_close": "Schließen",
    "footer_brand": "Made with ❤️ by mavvi.online",
    "dashboard_title": "WebPDF Studio v4.2 Free Version — Engine Verifiziert",
    "dashboard_subtitle": "Vollständig optimiert für Windows, große Dokumente mit über 300 Seiten und Sonderzeichen.",
    "dash_card1_title": "✅ Verifiziertes direktes Speichern",
    "dash_card1_desc": "Speicherorte werden direkt über native Dialoge abgefragt. Dateien werden direkt auf Datenträger geschrieben und geprüft (Größe > 0).",
    "dash_card2_title": "⭐ Einzelseitenmodus zum Teilen",
    "dash_card2_desc": "Extrahieren Sie jede Seite in eine separate 1-seitige PDF-Datei in einen eigenen Ausgabeordner.",
    "dash_card3_title": "⚡ 300+ Seiten & Hochleistung",
    "dash_card3_desc": "Große Dateien werden über Worker-Threads verarbeitet und direkt gestreamt, um Speicherabstürze zu vermeiden.",
    "dash_card4_title": "🇹🇷 Sonderzeichen & Pfadunterstützung",
    "dash_card4_desc": "Volle Unterstützung für Sonderzeichen und Windows-Pfade ohne Pfadbeschädigung.",
    "btn_create_html": "PDF aus HTML erstellen →",
    "btn_merge_pdfs": "PDFs zusammenführen →",
    "btn_split_single": "PDF teilen (Einzelmodus) →",
    "btn_choose_html": "📁 HTML-Datei auswählen",
    "btn_refresh_preview": "Vorschau aktualisieren",
    "btn_create_pdf": "PDF erstellen",
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
    "badge_verified": "v4.2 Free Version",
    "tab_dashboard": "Панель",
    "tab_create": "Создать PDF",
    "tab_merge": "Объединить PDF",
    "tab_split": "Разделить PDF",
    "tab_compress": "Сжать",
    "tab_ocr": "OCR",
    "tab_about": "О программе",
    "ready_status": "● Готов",
    "about_title": "О программе WebPDF Studio",
    "about_desc": "Высокопроизводительная студия для создания, объединения и разделения PDF-документов с максимальной точностью.",
    "about_version": "WebPDF Studio v4.2 Free Version",
    "about_developer": "Создано с ❤️ mavvi.online",
    "btn_visit_site": "Посетить сайт",
    "btn_close": "Закрыть",
    "footer_brand": "Сделано с ❤️ by mavvi.online",
    "dashboard_title": "WebPDF Studio v4.2 Free Version — Движок проверен",
    "dashboard_subtitle": "Полностью оптимизировано для Windows, документов на 300+ страниц и специальных символов.",
    "dash_card1_title": "✅ Проверенное прямое сохранение файлов",
    "dash_card1_desc": "Диалоги сохранения открываются напрямую через систему. Файлы записываются на диск с проверкой размера (размер > 0).",
    "dash_card2_title": "⭐ Постраничный режим разделения",
    "dash_card2_desc": "Извлекайте каждую страницу в отдельный 1-страничный PDF файл в специальную папку вывода.",
    "dash_card3_title": "⚡ Производительность для 300+ страниц",
    "dash_card3_desc": "Тяжелые файлы обрабатываются рабочими потоками с прямой потоковой записью на диск без сбоев памяти.",
    "dash_card4_title": "🇹🇷 Поддержка спецсимволов и путей",
    "dash_card4_desc": "Полная поддержка символов и путей Windows без повреждений слешей и кодировок.",
    "btn_create_html": "Создать PDF из HTML →",
    "btn_merge_pdfs": "Объединить PDF →",
    "btn_split_single": "Разделить PDF (Постранично) →",
    "btn_choose_html": "📁 Выбрать HTML-файл",
    "btn_refresh_preview": "Обновить предпросмотр",
    "btn_create_pdf": "Создать PDF",
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
    "badge_verified": "v4.2 Free Version",
    "tab_dashboard": "แดชบอร์ด",
    "tab_create": "สร้าง PDF",
    "tab_merge": "รวมไฟล์ PDF",
    "tab_split": "แยกไฟล์ PDF",
    "tab_compress": "บีบอัด",
    "tab_ocr": "OCR",
    "tab_about": "เกี่ยวกับ",
    "ready_status": "● พร้อม",
    "about_title": "เกี่ยวกับ WebPDF Studio",
    "about_desc": "โปรแกรมจัดการ PDF ประสิทธิภาพสูงสำหรับการสร้าง รวม และแยกเอกสารอย่างแม่นยำ",
    "about_version": "WebPDF Studio v4.2 Free Version",
    "about_developer": "พัฒนาด้วย ❤️ โดย mavvi.online",
    "btn_visit_site": "เยี่ยมชมเว็บไซต์",
    "btn_close": "ปิด",
    "footer_brand": "สร้างด้วย ❤️ โดย mavvi.online",
    "dashboard_title": "WebPDF Studio v4.2 Free Version — ตรวจสอบระบบแล้ว",
    "dashboard_subtitle": "เพิ่มประสิทธิภาพอย่างเต็มที่สำหรับ Windows เอกสารขนาดใหญ่กว่า 300 หน้า และตัวอักษรพิเศษ",
    "dash_card1_title": "✅ บันทึกไฟล์โดยตรงและตรวจสอบความถูกต้อง",
    "dash_card1_desc": "เลือกตำแหน่งบันทึกผ่านหน้าต่างระบบโดยตรง ไฟล์จะถูกเขียนลงดิสก์และตรวจสอบความถูกต้อง (ขนาด > 0)",
    "dash_card2_title": "⭐ โหมดแยกหน้าเดี่ยว",
    "dash_card2_desc": "แยกทุกหน้าเป็นไฟล์ PDF หน้าเดี่ยวแยกต่างหากโดยอัตโนมัติลงในโฟลเดอร์ผลลัพธ์",
    "dash_card3_title": "⚡ ประสิทธิภาพสำหรับ 300+ หน้าและไฟล์ขนาดใหญ่",
    "dash_card3_desc": "ประมวลผลไฟล์ขนาดใหญ่ด้วยเวิร์กเกอร์เธรดและสตรีมลงดิสก์โดยตรง ป้องกันข้อผิดพลาดของหน่วยความจำ",
    "dash_card4_title": "🇹🇷 รองรับเส้นทางและอักขระพิเศษ",
    "dash_card4_desc": "รองรับอักขระพิเศษและเส้นทางไฟล์ของ Windows อย่างสมบูรณ์",
    "btn_create_html": "สร้าง PDF จาก HTML →",
    "btn_merge_pdfs": "รวมไฟล์ PDF →",
    "btn_split_single": "แยก PDF (โหมดหน้าเดี่ยว) →",
    "btn_choose_html": "📁 เลือกไฟล์ HTML",
    "btn_refresh_preview": "รีเฟรชตัวอย่าง",
    "btn_create_pdf": "สร้าง PDF",
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
    try {
      localStorage.setItem('webpdf_studio_lang', lang);
      localStorage.setItem('language', lang);
    } catch (_) {}

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

  changeLanguage(lang) {
    return this.loadLanguage(lang);
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
